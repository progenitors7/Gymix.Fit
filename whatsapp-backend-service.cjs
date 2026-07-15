/**
 * Gymix Central WhatsApp Session Gateway (Baileys Edition)
 * --------------------------------------------------------
 * Uses @whiskeysockets/baileys (WebSocket-based, NO browser needed).
 * Runs comfortably on Render free tier (512MB RAM).
 *
 * Run command:
 *   npm run wa-server
 */

const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

// ─── ENVIRONMENT VARIABLE LOADER ────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    }
  }
}
loadEnv();

// ─── SUPABASE CLIENT INITIALIZATION ─────────────────────────────────────────
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Gymix WA] WARNING: Supabase URL or Anon Key is missing. Auth routes may fail.');
}
const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// ─── RATE LIMIT CONFIGURATION (Configurable via Environment Variables) ──────
const AUTH_IP_THRESHOLD = parseInt(process.env.RATE_LIMIT_AUTH_IP_THRESHOLD || '5', 10);
const AUTH_ACCOUNT_THRESHOLD = parseInt(process.env.RATE_LIMIT_AUTH_ACCOUNT_THRESHOLD || '3', 10);
const AUTH_BASE_BACKOFF_MS = parseInt(process.env.RATE_LIMIT_AUTH_BASE_BACKOFF_MS || '1000', 10);
const AUTH_BACKOFF_FACTOR = parseFloat(process.env.RATE_LIMIT_AUTH_BACKOFF_FACTOR || '2');
const AUTH_MAX_BACKOFF_MS = parseInt(process.env.RATE_LIMIT_AUTH_MAX_BACKOFF_MS || '3600000', 10); // 1 hour
const AUTH_WINDOW_RESET_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_RESET_MS || '900000', 10); // 15 mins

const PUBLIC_WINDOW_MS = parseInt(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS || '60000', 10); // 1 minute
const PUBLIC_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_PUBLIC_MAX || '30', 10);

const AUTH_USER_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS || '60000', 10); // 1 minute
const AUTH_USER_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX || '100', 10);

// ─── PERSISTENT RATE LIMITER STORE ──────────────────────────────────────────
const AUTH_FAILURES_FILE = path.join(__dirname, 'auth_failures.json');

function loadAuthFailures() {
  try {
    if (fs.existsSync(AUTH_FAILURES_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FAILURES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[Gymix RateLimiter] Could not load auth failures file:', e.message);
  }
  return { ip: {}, account: {} };
}

function saveAuthFailures(store) {
  try {
    fs.writeFileSync(AUTH_FAILURES_FILE, JSON.stringify(store), 'utf-8');
  } catch (e) {
    console.warn('[Gymix RateLimiter] Could not save auth failures file:', e.message);
  }
}

const authFailuresStore = loadAuthFailures();
if (!authFailuresStore.ip) authFailuresStore.ip = {};
if (!authFailuresStore.account) authFailuresStore.account = {};

function cleanStaleFailures() {
  const now = Date.now();
  let modified = false;
  for (const type of ['ip', 'account']) {
    for (const [key, record] of Object.entries(authFailuresStore[type])) {
      if (now - record.lastAttempt > AUTH_WINDOW_RESET_MS) {
        delete authFailuresStore[type][key];
        modified = true;
      }
    }
  }
  if (modified) {
    saveAuthFailures(authFailuresStore);
  }
}
setInterval(cleanStaleFailures, 5 * 60 * 1000);

// ─── IN-MEMORY RATE LIMITER FOR PUBLIC/AUTHENTICATED USER ENDPOINTS ─────────
const inMemoryStore = {
  public: {},
  authUser: {}
};

function getIpAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
}

// ─── ERROR SANITIZATION HELPER ──────────────────────────────────────────────
function sanitizeError(err, defaultMessage) {
  // Log full error details server-side (including stack trace if present) for debugging
  if (err && err.stack) {
    console.error('[Error Details Stack]', err.stack);
  } else {
    console.error('[Error Details]', err);
  }

  // Filter out raw database details, path disclosures, and stack traces.
  // Only return message if it is a known client-safe authentication or validation message.
  if (err && err.message) {
    const msg = err.message.toLowerCase();
    const isSafeMessage =
      msg.includes('invalid login credentials') ||
      msg.includes('user already registered') ||
      msg.includes('email') ||
      msg.includes('password') ||
      msg.includes('weak') ||
      msg.includes('verification') ||
      msg.includes('expired') ||
      msg.includes('not found') ||
      msg.includes('invalid') ||
      msg.includes('missing') ||
      msg.includes('limit');

    if (isSafeMessage) {
      return err.message;
    }
  }

  return defaultMessage;
}

// ─── RATE LIMITER HELPERS ───────────────────────────────────────────────────
function getAuthBackoff(failures, threshold) {
  if (failures <= threshold) return 0;
  const backoff = AUTH_BASE_BACKOFF_MS * Math.pow(AUTH_BACKOFF_FACTOR, failures - threshold);
  return Math.min(backoff, AUTH_MAX_BACKOFF_MS);
}

function recordAuthSuccess(ip, email) {
  let modified = false;
  if (authFailuresStore.ip[ip]) {
    delete authFailuresStore.ip[ip];
    modified = true;
  }
  if (email && authFailuresStore.account[email]) {
    delete authFailuresStore.account[email];
    modified = true;
  }
  if (modified) {
    saveAuthFailures(authFailuresStore);
  }
}

function recordAuthFailure(ip, email) {
  const now = Date.now();
  
  // Record IP failure
  if (!authFailuresStore.ip[ip] || (now - authFailuresStore.ip[ip].lastAttempt > AUTH_WINDOW_RESET_MS)) {
    authFailuresStore.ip[ip] = { failures: 1, lastAttempt: now };
  } else {
    authFailuresStore.ip[ip].failures++;
    authFailuresStore.ip[ip].lastAttempt = now;
  }

  // Record Email failure
  if (email) {
    const cleanEmail = String(email).toLowerCase().trim();
    if (!authFailuresStore.account[cleanEmail] || (now - authFailuresStore.account[cleanEmail].lastAttempt > AUTH_WINDOW_RESET_MS)) {
      authFailuresStore.account[cleanEmail] = { failures: 1, lastAttempt: now };
    } else {
      authFailuresStore.account[cleanEmail].failures++;
      authFailuresStore.account[cleanEmail].lastAttempt = now;
    }
  }

  saveAuthFailures(authFailuresStore);
}

// ─── RATE LIMIT MIDDLEWARES ──────────────────────────────────────────────────

// 1. Auth Rate Limiter Middleware (per-IP & per-account + exponential backoff)
function authRateLimiter(req, res, next) {
  const ip = getIpAddress(req);
  const email = req.body && req.body.email ? String(req.body.email).toLowerCase().trim() : null;

  const now = Date.now();
  let maxBackoff = 0;
  let reason = '';

  // Check IP backoff
  const ipRecord = authFailuresStore.ip[ip];
  if (ipRecord && (now - ipRecord.lastAttempt < AUTH_WINDOW_RESET_MS)) {
    const ipBackoff = getAuthBackoff(ipRecord.failures, AUTH_IP_THRESHOLD);
    if (ipBackoff > maxBackoff) {
      maxBackoff = ipBackoff;
      reason = 'IP';
    }
  }

  // Check Account backoff
  if (email) {
    const emailRecord = authFailuresStore.account[email];
    if (emailRecord && (now - emailRecord.lastAttempt < AUTH_WINDOW_RESET_MS)) {
      const emailBackoff = getAuthBackoff(emailRecord.failures, AUTH_ACCOUNT_THRESHOLD);
      if (emailBackoff > maxBackoff) {
        maxBackoff = emailBackoff;
        reason = 'account';
      }
    }
  }

  if (maxBackoff > 0) {
    const lastAttempt = reason === 'IP' ? ipRecord.lastAttempt : authFailuresStore.account[email].lastAttempt;
    const elapsed = now - lastAttempt;
    if (elapsed < maxBackoff) {
      const retryAfterMs = maxBackoff - elapsed;
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Too many failed attempts. Please try again in ${retryAfterSec} seconds.`,
        retryAfter: retryAfterSec,
        reason: `Rate limited due to repeated failures on this ${reason}.`
      });
    }
  }

  next();
}

// 2. Public Endpoints Rate Limiter Middleware (In-memory, moderate)
function publicRateLimiter(req, res, next) {
  const ip = getIpAddress(req);
  const now = Date.now();

  if (!inMemoryStore.public[ip]) {
    inMemoryStore.public[ip] = { count: 1, windowStart: now };
  } else {
    const record = inMemoryStore.public[ip];
    if (now - record.windowStart > PUBLIC_WINDOW_MS) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count++;
      if (record.count > PUBLIC_MAX_REQUESTS) {
        const retryAfterMs = PUBLIC_WINDOW_MS - (now - record.windowStart);
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          error: `Too many requests. Please try again in ${retryAfterSec} seconds.`
        });
      }
    }
  }

  next();
}

// 3. Authenticated User Actions Rate Limiter Middleware (In-memory, loose)
function authUserActionRateLimiter(req, res, next) {
  const ip = getIpAddress(req);
  const apiKey = req.headers['x-api-key'] || '';
  const key = apiKey ? `key:${apiKey}` : `ip:${ip}`;
  const now = Date.now();

  if (!inMemoryStore.authUser[key]) {
    inMemoryStore.authUser[key] = { count: 1, windowStart: now };
  } else {
    const record = inMemoryStore.authUser[key];
    if (now - record.windowStart > AUTH_USER_WINDOW_MS) {
      record.count = 1;
      record.windowStart = now;
    } else {
      record.count++;
      if (record.count > AUTH_USER_MAX_REQUESTS) {
        const retryAfterMs = AUTH_USER_WINDOW_MS - (now - record.windowStart);
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({
          error: `Rate limit exceeded. Please try again in ${retryAfterSec} seconds.`
        });
      }
    }
  }

  next();
}

// ─── INPUT VALIDATION SCHEMAS ───────────────────────────────────────────────
const validationSchemas = {
  login: {
    email: { type: 'string', required: true, format: 'email', maxLength: 255 },
    password: { type: 'string', required: true, minLength: 6, maxLength: 100 }
  },
  signup: {
    email: { type: 'string', required: true, format: 'email', maxLength: 255 },
    password: { type: 'string', required: true, minLength: 6, maxLength: 100 },
    role: { type: 'string', required: false, enum: ['member', 'owner', 'trainer', 'admin'] },
    fullName: { type: 'string', required: false, maxLength: 100, regex: /^[a-zA-Z\s.-]*$/ },
    gymName: { type: 'string', required: false, maxLength: 100 }
  },
  resetPassword: {
    email: { type: 'string', required: true, format: 'email', maxLength: 255 },
    redirectTo: { type: 'string', required: false, format: 'url', maxLength: 500 }
  },
  connect: {
    gymId: { type: 'string', required: true, format: 'uuid', maxLength: 36 },
    phone: { type: 'string', required: false, format: 'phone', maxLength: 20 }
  },
  send: {
    gymId: { type: 'string', required: true, format: 'uuid', maxLength: 36 },
    phone: { type: 'string', required: true, format: 'phone', maxLength: 20 },
    message: { type: 'string', required: true, minLength: 1, maxLength: 2000 }
  },
  disconnect: {
    gymId: { type: 'string', required: true, format: 'uuid', maxLength: 36 }
  },
  status: {
    gymId: { type: 'string', required: true, format: 'uuid', maxLength: 36, source: 'query' }
  }
};

// ─── VALIDATION MIDDLEWARE ──────────────────────────────────────────────────
function validateSchema(schemaKey) {
  return (req, res, next) => {
    const rules = validationSchemas[schemaKey];
    if (!rules) return next();

    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
      const source = rule.source === 'query' ? req.query : req.body;
      const value = source[field];

      // 1. Check Required
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`Field '${field}' is required.`);
        continue;
      }

      if (value !== undefined && value !== null && value !== '') {
        // 2. Check Type
        if (typeof value !== rule.type) {
          errors.push(`Field '${field}' must be of type '${rule.type}'.`);
          continue;
        }

        // 3. String validation rules
        if (rule.type === 'string') {
          if (rule.minLength && value.length < rule.minLength) {
            errors.push(`Field '${field}' must be at least ${rule.minLength} characters.`);
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            errors.push(`Field '${field}' cannot exceed ${rule.maxLength} characters.`);
          }
        }

        // 4. Enum validation
        if (rule.enum && !rule.enum.includes(value)) {
          errors.push(`Field '${field}' must be one of: ${rule.enum.join(', ')}.`);
        }

        // 5. Custom Regex format validation
        if (rule.regex && !rule.regex.test(value)) {
          errors.push(`Field '${field}' contains invalid characters.`);
        }

        // 6. Predefined formats
        if (rule.format) {
          if (rule.format === 'email') {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(value)) {
              errors.push(`Field '${field}' must be a valid email address.`);
            }
          } else if (rule.format === 'uuid') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
              errors.push(`Field '${field}' must be a valid UUID.`);
            }
          } else if (rule.format === 'phone') {
            const phoneRegex = /^\+?[0-9\s-]{10,20}$/;
            if (!phoneRegex.test(value)) {
              errors.push(`Field '${field}' must be a valid phone number (10-20 digits).`);
            }
          } else if (rule.format === 'url') {
            try {
              new URL(value);
            } catch (e) {
              errors.push(`Field '${field}' must be a valid absolute URL.`);
            }
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Input validation failed', details: errors });
    }

    next();
  };
}

const app = express();
app.use(cors());
app.use(express.json());

// ─── AUTHENTICATION MIDDLEWARE ──────────────────────────────────────────────
// Supports both API keys (X-API-KEY header) and Supabase JWTs (Authorization Bearer token).
const WA_API_SECRET = process.env.WA_API_SECRET;

async function requireAuth(req, res, next) {
  // 1. Check for API key (X-API-KEY header) - used for server-to-server calls
  const apiKey = req.headers['x-api-key'];
  if (apiKey && WA_API_SECRET && apiKey === WA_API_SECRET) {
    return next();
  }

  // 2. Check for Supabase JWT (Authorization Bearer token) - used for frontend client calls
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = user; // Attach verified user to request
        return next();
      }
    } catch (err) {
      console.warn('[Gymix WA] Failed to verify Supabase JWT token:', err.message);
    }
  }

  // Fallback warning if secret is not configured
  if (!WA_API_SECRET) {
    console.warn('[Gymix WA] WARNING: WA_API_SECRET is not set, but request lacked authentication headers.');
  }

  return res.status(401).json({ error: 'Unauthorized: Invalid or missing authentication credentials.' });
}

// ─── AUTHENTICATION PROXY ROUTES (Stricter limits + IP & Account backoff) ───
app.post('/api/auth/login', validateSchema('login'), authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const ip = getIpAddress(req);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Reset failures on success
    recordAuthSuccess(ip, email);
    res.json(data);
  } catch (err) {
    // Record failure to increment backoff counter
    recordAuthFailure(ip, email);
    res.status(400).json({ error: sanitizeError(err, 'Invalid credentials') });
  }
});

app.post('/api/auth/signup', validateSchema('signup'), authRateLimiter, async (req, res) => {
  const { email, password, role, fullName, gymName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const ip = getIpAddress(req);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: role || 'member',
          full_name: fullName || '',
          gym_name: gymName || ''
        }
      }
    });
    if (error) throw error;

    recordAuthSuccess(ip, email);
    res.json(data);
  } catch (err) {
    recordAuthFailure(ip, email);
    res.status(400).json({ error: sanitizeError(err, 'Signup failed') });
  }
});

app.post('/api/auth/reset-password', validateSchema('resetPassword'), authRateLimiter, async (req, res) => {
  const { email, redirectTo } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const ip = getIpAddress(req);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined
    });
    if (error) throw error;

    recordAuthSuccess(ip, email);
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    recordAuthFailure(ip, email);
    res.status(400).json({ error: sanitizeError(err, 'Failed to request password reset') });
  }
});

// Root route for service discovery (public — no auth needed)
app.get('/', publicRateLimiter, (req, res) => {
  res.json({
    status: 'online',
    service: 'Gymix WhatsApp Central Gateway',
    version: '2.0.0',
    engine: 'baileys',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Active sessions keyed by gymId
const sessions = {};

/**
 * Dynamically import Baileys (ESM module from CommonJS)
 */
let baileysMod = null;
async function getBaileys() {
  if (!baileysMod) {
    baileysMod = await import('@whiskeysockets/baileys');
  }
  return baileysMod;
}

/**
 * Get or initialize a WhatsApp session for a gym
 */
async function getClient(gymId, pairingPhone = null) {
  if (sessions[gymId]) {
    return sessions[gymId];
  }

  console.log(`[Gymix WA] Initializing new Baileys session for Gym ID: ${gymId} (Pairing Phone: ${pairingPhone || 'None'})`);

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrCodeUrl: '',
    connectedNumber: '',
    pairingCode: '',
    expiryTimer: null,
    healthPinger: null,
    reconnectAttempts: 0,
    lastError: null,
    lastErrorStack: null
  };

  sessions[gymId] = sessionData;

  try {
    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = await getBaileys();
    const { Boom } = require('@hapi/boom');

    // Auth state persistence directory
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    console.log(`[Gymix WA] Using WA version: ${version.join('.')}`);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Gymix', 'Chrome', '125.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
      generateHighQualityLinkPreview: false,
    });

    sessionData.sock = sock;

    // Request pairing code if phone number is provided
    if (pairingPhone && !sock.authState.creds.registered) {
      setTimeout(async () => {
        try {
          const cleanPhone = pairingPhone.replace(/\D/g, '');
          console.log(`[Gymix WA] Requesting pairing code for phone: ${cleanPhone}`);
          const code = await sock.requestPairingCode(cleanPhone);
          sessionData.status = 'pairing_code_ready';
          sessionData.pairingCode = code;
          console.log(`[Gymix WA] Pairing code generated successfully: ${code}`);
        } catch (err) {
          console.error(`[Gymix WA] Error requesting pairing code:`, err);
          sessionData.lastError = 'Failed to generate pairing code. ' + err.message;
          sessionData.status = 'disconnected';
        }
      }, 3000);
    }

    // 60-second guard timeout for initialization
    sessionData.expiryTimer = setTimeout(() => {
      if (sessionData.status === 'connecting') {
        console.warn(`[Gymix WA] Session initialization timed out (60s) for Gym ID: ${gymId}. Cleaning up...`);
        sessionData.status = 'disconnected';
        sessionData.lastError = 'Session initialization timed out. Please try linking again.';
        try {
          sock.end(new Error('Initialization timeout'));
        } catch (e) { /* ignore */ }
        if (sessions[gymId] === sessionData) {
          delete sessions[gymId];
        }
      }
    }, 60000);

    // Handle connection updates (QR code, open, close)
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // QR Code received (only if not using pairing code)
      if (qr && !pairingPhone) {
        console.log(`[Gymix WA] QR Code generated for Gym ID: ${gymId}`);
        sessionData.status = 'qr_ready';
        if (sessionData.expiryTimer) {
          clearTimeout(sessionData.expiryTimer);
          sessionData.expiryTimer = null;
        }
        try {
          sessionData.qrCodeUrl = await qrcode.toDataURL(qr);
        } catch (err) {
          console.error('[Gymix WA] Failed to generate QR Base64 image:', err);
        }
      }

      // Connection opened successfully
      if (connection === 'open') {
        console.log(`[Gymix WA] WhatsApp connected for Gym ID: ${gymId}!`);
        sessionData.status = 'connected';
        sessionData.qrCodeUrl = '';
        sessionData.reconnectAttempts = 0; // Reset on successful connection
        if (sessionData.expiryTimer) {
          clearTimeout(sessionData.expiryTimer);
          sessionData.expiryTimer = null;
        }
        // Extract connected phone number
        try {
          const jid = sock.user?.id || '';
          sessionData.connectedNumber = jid.split(':')[0] || jid.split('@')[0] || 'Linked Device';
        } catch (e) {
          sessionData.connectedNumber = 'Linked Device';
        }

        // Tell WhatsApp servers we are online (important for Baileys)
        try { await sock.sendPresenceUpdate('available'); } catch(e) { /* ignore */ }

        // Start periodic health pinger to keep WA WebSocket alive
        if (sessionData.healthPinger) clearInterval(sessionData.healthPinger);
        sessionData.healthPinger = setInterval(async () => {
          try {
            if (sessionData.sock && sessionData.status === 'connected') {
              const isOpen = sessionData.sock?.ws?.readyState === 1; // WebSocket.OPEN
              if (!isOpen) {
                console.warn(`[Gymix WA] Health pinger: WebSocket not open for Gym ${gymId}. State: ${sessionData.sock?.ws?.readyState}. Will rely on auto-reconnect.`);
              } else {
                // Send a presence update as a lightweight keepalive ping to WA servers
                try { await sessionData.sock.sendPresenceUpdate('available'); } catch(e) { /* ignore */ }
                console.log(`[Gymix WA] Health pinger: Presence ping sent for Gym ${gymId}`);
              }
            }
          } catch (e) {
            console.warn(`[Gymix WA] Health pinger error for Gym ${gymId}:`, e.message);
          }
        }, 4 * 60 * 1000); // Every 4 minutes (WhatsApp times out ~5 min idle)
      }

      // Connection closed
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[Gymix WA] Connection closed for Gym ID: ${gymId}. Status: ${statusCode}. Reconnect: ${shouldReconnect}`);

        if (sessionData.expiryTimer) {
          clearTimeout(sessionData.expiryTimer);
          sessionData.expiryTimer = null;
        }
        if (sessionData.healthPinger) {
          clearInterval(sessionData.healthPinger);
          sessionData.healthPinger = null;
        }

        if (shouldReconnect && sessions[gymId] === sessionData) {
          const MAX_RECONNECT_ATTEMPTS = 5;
          sessionData.reconnectAttempts = (sessionData.reconnectAttempts || 0) + 1;

          if (sessionData.reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            // Exponential backoff: 3s, 6s, 12s, 24s, 48s
            const backoffMs = 3000 * Math.pow(2, sessionData.reconnectAttempts - 1);
            console.log(`[Gymix WA] Auto-reconnecting for Gym ID: ${gymId} (attempt ${sessionData.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${backoffMs / 1000}s...`);
            
            // Keep the session entry alive during reconnection so status endpoint returns 'connecting'
            sessionData.status = 'connecting';
            sessionData.qrCodeUrl = '';
            
            setTimeout(async () => {
              try {
                // Don't delete the session entry - just reinitialize the socket
                delete sessions[gymId];
                await getClient(gymId);
              } catch (err) {
                console.error(`[Gymix WA] Reconnection attempt failed for Gym ${gymId}:`, err.message);
              }
            }, backoffMs);
          } else {
            console.error(`[Gymix WA] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached for Gym ID: ${gymId}. Giving up.`);
            sessionData.status = 'disconnected';
            sessionData.qrCodeUrl = '';
            sessionData.connectedNumber = '';
            // Don't delete session so status endpoint can report 'disconnected'
          }
        } else {
          // Logged out or manually disconnected
          sessionData.status = 'disconnected';
          sessionData.qrCodeUrl = '';
          sessionData.connectedNumber = '';
          if (sessions[gymId] === sessionData) {
            delete sessions[gymId];
          }
        }
      }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

  } catch (err) {
    console.error(`[Gymix WA] Initialization failed for Gym ID: ${gymId}:`, err);
    sessionData.status = 'disconnected';
    sessionData.lastError = err.message || String(err);
    sessionData.lastErrorStack = err.stack || '';
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
  }

  return sessionData;
}

/**
 * 1. GET /api/whatsapp/status
 */
app.get('/api/whatsapp/status', validateSchema('status'), authUserActionRateLimiter, requireAuth, (req, res) => {
  const { gymId } = req.query;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  const session = sessions[gymId];
  if (!session) {
    // Check if saved session credentials folder exists
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    const credsFile = path.join(authDir, 'creds.json');
    if (fs.existsSync(credsFile)) {
      console.log(`[Gymix WA] Saved session found for Gym ID: ${gymId}. Auto-restoring connection...`);
      // Initialize in the background
      getClient(gymId).catch(err => {
        console.error(`[Gymix WA] Auto-restore connection failed for Gym ID: ${gymId}:`, err);
      });
      return res.json({ status: 'connecting', qrCodeUrl: '', connectedNumber: '', pairingCode: '' });
    }
    return res.json({ status: 'disconnected', connectedNumber: '', pairingCode: '' });
  }

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber,
    pairingCode: session.pairingCode || ''
  });
});

/**
 * Debug endpoint (protected)
 */
app.get('/api/whatsapp/debug', authUserActionRateLimiter, requireAuth, (req, res) => {
  const info = {};
  Object.keys(sessions).forEach(gymId => {
    info[gymId] = {
      status: sessions[gymId].status,
      connectedNumber: sessions[gymId].connectedNumber,
      lastError: sessions[gymId].lastError,
      lastErrorStack: sessions[gymId].lastErrorStack
    };
  });
  res.json({
    sessions: info,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT
    },
    platform: process.platform,
    arch: process.arch,
    engine: 'baileys',
    memoryUsage: process.memoryUsage()
  });
});

/**
 * 2. POST /api/whatsapp/connect
 */
app.post('/api/whatsapp/connect', validateSchema('connect'), authUserActionRateLimiter, requireAuth, async (req, res) => {
  const { gymId, phone } = req.body;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  // If phone pairing is requested, clean up existing session first
  if (phone && sessions[gymId]) {
    try {
      const existing = sessions[gymId];
      if (existing.sock) existing.sock.end();
      if (existing.healthPinger) clearInterval(existing.healthPinger);
      if (existing.expiryTimer) clearTimeout(existing.expiryTimer);
    } catch(e) {}
    delete sessions[gymId];
    
    // Clear credentials folder to allow clean re-pairing
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    try {
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        console.log(`[Gymix WA] Cleared auth credentials at ${authDir} for new phone pairing`);
      }
    } catch (e) {
      console.warn(`[Gymix WA] Failed to clear auth directory:`, e);
    }
  }

  const session = await getClient(gymId, phone);

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber,
    pairingCode: session.pairingCode || ''
  });
});

// ─── BUG #17 FIX: PERSISTENT DAILY LIMIT TRACKER ───────────────────────────
// In-memory tracker is reset on every server restart (Render free tier restarts often).
// Now persisted to a JSON file so the limit survives restarts.
const DAILY_LIMITS_FILE = path.join(__dirname, 'daily_limits.json');
const DAILY_LIMIT_MAX = 50;

function loadDailyLimits() {
  try {
    if (fs.existsSync(DAILY_LIMITS_FILE)) {
      return JSON.parse(fs.readFileSync(DAILY_LIMITS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('[Gymix WA] Could not load daily limits file:', e.message);
  }
  return {};
}

function saveDailyLimits(tracker) {
  try {
    fs.writeFileSync(DAILY_LIMITS_FILE, JSON.stringify(tracker), 'utf-8');
  } catch (e) {
    console.warn('[Gymix WA] Could not save daily limits file:', e.message);
  }
}

const dailyLimitTracker = loadDailyLimits();

function checkAndIncrementDailyLimit(gymId) {
  const today = new Date().toISOString().split('T')[0];
  if (!dailyLimitTracker[gymId]) {
    dailyLimitTracker[gymId] = { date: today, count: 0 };
  }
  const tracker = dailyLimitTracker[gymId];
  if (tracker.date !== today) {
    tracker.date = today;
    tracker.count = 0;
  }
  if (tracker.count >= DAILY_LIMIT_MAX) {
    return false;
  }
  tracker.count++;
  saveDailyLimits(dailyLimitTracker); // Persist after each increment
  return true;
}

/**
 * 3. POST /api/whatsapp/send
 */
app.post('/api/whatsapp/send', validateSchema('send'), authUserActionRateLimiter, requireAuth, async (req, res) => {
  const { gymId, phone, message } = req.body;
  if (!gymId || !phone || !message) {
    return res.status(400).json({ error: 'Missing parameters (gymId, phone, message)' });
  }

  let session = sessions[gymId];
  if (!session || session.status !== 'connected' || !session.sock) {
    // If it's not connected, see if we can restore it from credentials first
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    const credsFile = path.join(authDir, 'creds.json');
    if (fs.existsSync(credsFile)) {
      console.log(`[Gymix WA] Send request received but session not active. Triggering reconnect and waiting...`);
      getClient(gymId).catch(() => {});
      
      // Wait for up to 15 seconds for status to become 'connected'
      let retries = 15;
      while (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const currentSession = sessions[gymId];
        if (currentSession && currentSession.status === 'connected' && currentSession.sock) {
          console.log(`[Gymix WA] Reconnection successful during send wait! Proceeding to queue.`);
          session = currentSession;
          break;
        }
        retries--;
      }
      
      // Recheck after waiting
      if (!session || session.status !== 'connected' || !session.sock) {
        return res.status(400).json({ error: 'WhatsApp is reconnecting. Please try again in a moment.' });
      }
    } else {
      return res.status(400).json({ error: 'WhatsApp session is not linked or connected for this gym' });
    }
  }

  // 1. Fast check of the limit before queuing
  const today = new Date().toISOString().split('T')[0];
  const tracker = dailyLimitTracker[gymId];
  if (tracker && tracker.date === today && tracker.count >= DAILY_LIMIT_MAX) {
    return res.status(429).json({ error: `Daily safety limit of ${DAILY_LIMIT_MAX} messages reached to protect your account.` });
  }

  // Ensure queue is initialized
  if (!session.messageQueue) {
    session.messageQueue = Promise.resolve();
  }

  // BUG #11 FIX: Track delivery success/failure on the session.
  // The queue is async, so we can't await it here. Instead, we store the error
  // on the session object so it can be surfaced via the /status endpoint.
  // Callers should treat 'queued' as "accepted for delivery", not "delivered".
  session.messageQueue = session.messageQueue.then(async () => {
    // Double check daily limit just in case
    if (!checkAndIncrementDailyLimit(gymId)) {
      const err = new Error(`Daily safety limit of ${DAILY_LIMIT_MAX} messages reached.`);
      session.lastMessageError = { time: new Date().toISOString(), error: err.message, phone };
      throw err;
    }

    // Sanitize phone
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    console.log(`[Gymix WA] Queue processing: Sending message to ${jid}`);
    
    try {
      await session.sock.sendMessage(jid, { text: message });
      console.log(`[Gymix WA] Queue processing: Message dispatched successfully to ${jid}`);
      // Clear any previous error on success
      session.lastMessageError = null;
    } catch (sendErr) {
      // BUG #11 FIX: Track the error so it's visible via /status
      console.error(`[Gymix WA] Message delivery FAILED to ${jid}:`, sendErr.message);
      session.lastMessageError = { time: new Date().toISOString(), error: sendErr.message, phone };
      throw sendErr;
    }

    // Anti-ban random delay: 5 to 10 seconds (5000 - 10000ms)
    const delay = 5000 + Math.floor(Math.random() * 5000);
    console.log(`[Gymix WA] Queue processing: waiting ${delay}ms before next message...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }).catch(err => {
    // Errors are already logged above; this prevents unhandled rejection
    console.error('[Gymix WA] Queue error caught (delivery may have failed):', err.message);
  });

  // Response: 'queued' means accepted for delivery (async), not guaranteed delivered.
  // Check session.lastMessageError via /status for delivery failures.
  res.json({ success: true, status: 'queued', note: 'Message queued for delivery. Check status endpoint for delivery errors.' });
});

/**
 * 4. POST /api/whatsapp/disconnect
 */
app.post('/api/whatsapp/disconnect', validateSchema('disconnect'), authUserActionRateLimiter, requireAuth, async (req, res) => {
  const { gymId } = req.body;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  const session = sessions[gymId];

  try {
    if (session) {
      if (session.expiryTimer) {
        clearTimeout(session.expiryTimer);
        session.expiryTimer = null;
      }
      if (session.sock) {
        console.log(`[Gymix WA] Logging out WhatsApp session for Gym ID: ${gymId}`);
        try {
          await session.sock.logout();
          console.log(`[Gymix WA] Successfully logged out for Gym: ${gymId}`);
        } catch (logoutErr) {
          console.warn(`[Gymix WA] logout() failed. Ending socket...:`, logoutErr.message);
          try {
            session.sock.end(new Error('Manual disconnect'));
          } catch (e) { /* ignore */ }
        }
      }
      delete sessions[gymId];
    }

    // Delete session auth directory
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    if (fs.existsSync(authDir)) {
      console.log(`[Gymix WA] Wiping session auth directory: ${authDir}`);
      fs.rmSync(authDir, { recursive: true, force: true });
    }

    console.log(`[Gymix WA] Cleaned up session for Gym ID: ${gymId}`);
    res.json({ success: true });
  } catch (err) {
    const errorMsg = sanitizeError(err, 'Failed to destroy session');
    res.status(500).json({ error: errorMsg });
  }
});

// Health check endpoint for UptimeRobot / external monitor
app.get('/healthz', publicRateLimiter, (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), activeSessions: Object.keys(sessions).length });
});

// ─── GLOBAL ERROR HANDLING MIDDLEWARE ───────────────────────────────────────
app.use((err, req, res, next) => {
  // Log full error stack details server-side for developer debugging
  console.error('[Uncaught Server Exception]', err.stack || err);

  // Return a generic error payload to prevent path/information disclosures
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred on the server. Please try again later.'
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Gymix WhatsApp Gateway v2.0 (Baileys) running on Port: ${PORT}`);
  console.log(`===============================================`);

  // ─── SELF-PING KEEPALIVE ─────────────────────────────────────────────
  // Render Free Tier sleeps after 15 min of inactivity.
  // We ping our own /healthz every 10 min to stay awake.
  // Also works as a watchdog - if the process is healthy, it responds.
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
  if (SELF_URL) {
    const http = require('https'); // render uses https
    setInterval(() => {
      const pingUrl = `${SELF_URL}/healthz`;
      try {
        const protocol = pingUrl.startsWith('https') ? require('https') : require('http');
        const req = protocol.get(pingUrl, (res) => {
          console.log(`[Gymix WA] Self-ping OK → ${pingUrl} (status: ${res.statusCode})`);
        });
        req.on('error', (e) => {
          console.warn(`[Gymix WA] Self-ping failed: ${e.message}`);
        });
        req.setTimeout(10000, () => {
          req.destroy();
          console.warn('[Gymix WA] Self-ping timed out.');
        });
      } catch (e) {
        console.warn('[Gymix WA] Self-ping error:', e.message);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
    console.log(`[Gymix WA] Self-ping keepalive enabled → ${SELF_URL}/healthz`);
  } else {
    console.warn('[Gymix WA] RENDER_EXTERNAL_URL not set — self-ping disabled. Set it in Render env vars to prevent sleep.');
  }
});

// ─── GRACEFUL SHUTDOWN ─────────────────────────────────────────────────
// When Render restarts the container (SIGTERM), cleanly close all WA sockets
// so WhatsApp servers know the device is going offline (not hard-killed)
async function gracefulShutdown(signal) {
  console.log(`[Gymix WA] Received ${signal}. Gracefully closing ${Object.keys(sessions).length} session(s)...`);
  const closePromises = Object.entries(sessions).map(async ([gymId, session]) => {
    try {
      if (session.healthPinger) clearInterval(session.healthPinger);
      if (session.expiryTimer) clearTimeout(session.expiryTimer);
      if (session.sock) {
        session.sock.end(new Error('Server shutting down'));
        console.log(`[Gymix WA] Closed socket for Gym ID: ${gymId}`);
      }
    } catch (e) {
      console.warn(`[Gymix WA] Error closing session ${gymId}:`, e.message);
    }
  });
  await Promise.allSettled(closePromises);
  console.log('[Gymix WA] All sessions closed. Exiting.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
