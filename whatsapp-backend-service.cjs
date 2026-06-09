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

const app = express();
app.use(cors());
app.use(express.json());

// Root route for service discovery
app.get('/', (req, res) => {
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
async function getClient(gymId) {
  if (sessions[gymId]) {
    return sessions[gymId];
  }

  console.log(`[Gymix WA] Initializing new Baileys session for Gym ID: ${gymId}`);

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrCodeUrl: '',
    connectedNumber: '',
    expiryTimer: null,
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

      // QR Code received
      if (qr) {
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

        if (shouldReconnect && sessions[gymId] === sessionData) {
          // Auto-reconnect: clear this session and re-initialize
          delete sessions[gymId];
          console.log(`[Gymix WA] Auto-reconnecting for Gym ID: ${gymId}...`);
          setTimeout(() => getClient(gymId), 3000);
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
app.get('/api/whatsapp/status', (req, res) => {
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
      return res.json({ status: 'connecting', qrCodeUrl: '', connectedNumber: '' });
    }
    return res.json({ status: 'disconnected', connectedNumber: '' });
  }

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber
  });
});

/**
 * Debug endpoint
 */
app.get('/api/whatsapp/debug', (req, res) => {
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
app.post('/api/whatsapp/connect', async (req, res) => {
  const { gymId } = req.body;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  const session = await getClient(gymId);

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber
  });
});

// Daily message limit tracker (in-memory)
const dailyLimitTracker = {};
const DAILY_LIMIT_MAX = 50;

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
  return true;
}

/**
 * 3. POST /api/whatsapp/send
 */
app.post('/api/whatsapp/send', async (req, res) => {
  const { gymId, phone, message } = req.body;
  if (!gymId || !phone || !message) {
    return res.status(400).json({ error: 'Missing parameters (gymId, phone, message)' });
  }

  const session = sessions[gymId];
  if (!session || session.status !== 'connected' || !session.sock) {
    // If it's not connected, see if we can restore it from credentials first
    const authDir = path.join(__dirname, '.baileys_auth', `session_${gymId}`);
    const credsFile = path.join(authDir, 'creds.json');
    if (fs.existsSync(credsFile)) {
      getClient(gymId).catch(() => {});
      return res.status(400).json({ error: 'WhatsApp is reconnecting. Please wait 10 seconds and try again.' });
    }
    return res.status(400).json({ error: 'WhatsApp session is not linked or connected for this gym' });
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

  // 2. Queue the message sending in the background
  session.messageQueue = session.messageQueue.then(async () => {
    // Double check daily limit just in case
    if (!checkAndIncrementDailyLimit(gymId)) {
      throw new Error(`Daily safety limit of ${DAILY_LIMIT_MAX} messages reached.`);
    }

    // Sanitize phone
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    console.log(`[Gymix WA] Queue processing: Sending message to ${jid}`);
    
    await session.sock.sendMessage(jid, { text: message });
    console.log(`[Gymix WA] Queue processing: Message dispatched successfully to ${jid}`);

    // Anti-ban random delay: 5 to 10 seconds (5000 - 10000ms)
    const delay = 5000 + Math.floor(Math.random() * 5000);
    console.log(`[Gymix WA] Queue processing: waiting ${delay}ms before next message...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }).catch(err => {
    console.error('[Gymix WA] Error in queued message send:', err.message);
  });

  // Return success immediately (fire-and-forget for the queue)
  res.json({ success: true, status: 'queued' });
});

/**
 * 4. POST /api/whatsapp/disconnect
 */
app.post('/api/whatsapp/disconnect', async (req, res) => {
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
    console.error('[Gymix WA] Disconnect failed:', err);
    res.status(500).json({ error: 'Failed to destroy session', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Gymix WhatsApp Gateway v2.0 (Baileys) running on Port: ${PORT}`);
  console.log(`===============================================`);
});
