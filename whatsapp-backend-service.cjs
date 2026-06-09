/**
 * Gymix Central WhatsApp Session Gateway (CommonJS Version)
 * --------------------------------------
 * Hosted once by the SaaS developer (on VPS, Render, or local machine).
 * Handles multiple concurrent gym sessions cleanly.
 *
 * Run command:
 *   npm run wa-server
 */

const express = require('express');
const { execSync } = require('child_process');

// Force Puppeteer to use the Render persistent cache directory at runtime
if (process.env.RENDER) {
  process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
  console.log(`[Gymix WA] Running on Render. Set PUPPETEER_CACHE_DIR to: ${process.env.PUPPETEER_CACHE_DIR}`);
  
  try {
    console.log('[Gymix WA] Verifying Chrome installation programmatically...');
    execSync('npx puppeteer@24.38.0 browsers install chrome', { stdio: 'inherit' });
    console.log('[Gymix WA] Chrome verification completed successfully.');
  } catch (err) {
    console.error('[Gymix WA] Failed to download Chrome programmatically:', err.message);
  }
}

const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Root route for friendly service discovery on Render (resolves 'Cannot GET /')
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Gymix WhatsApp Central Gateway',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Active clients cache keyed by gymId
const sessions = {};

// Get or initialize a WhatsApp client for a gym
function getClient(gymId) {
  if (sessions[gymId]) {
    return sessions[gymId];
  }

  console.log(`[Gymix WA] Initializing new WhatsApp session for Gym ID: ${gymId}`);

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: `gymix_session_${gymId}` }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote'
      ]
    }
  });

  const sessionData = {
    client: client,
    status: 'disconnected', // 'disconnected' | 'connecting' | 'qr_ready' | 'connected'
    qrCodeUrl: '',
    connectedNumber: '',
    expiryTimer: null,
    lastError: null,
    lastErrorStack: null
  };

  // Set a 60-second guard timeout for initialization
  sessionData.expiryTimer = setTimeout(async () => {
    if (sessionData.status === 'connecting') {
      console.warn(`[Gymix WA] Session initialization timed out (60s limit reached) for Gym ID: ${gymId}. Cleaning up...`);
      sessionData.status = 'disconnected';
      sessionData.lastError = 'Session initialization timed out. Please try linking again.';
      try {
        await client.destroy();
      } catch (destroyErr) {
        console.error(`[Gymix WA] Failed to destroy client after timeout:`, destroyErr.message);
      }
      if (sessions[gymId] === sessionData) {
        delete sessions[gymId];
      }
    }
  }, 60000);

  client.on('qr', async (qr) => {
    console.log(`[Gymix WA] QR Code generated for Gym ID: ${gymId}`);
    sessionData.status = 'qr_ready';
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
    try {
      // Convert raw authentication token to printable Base64 Data URL QR Code
      sessionData.qrCodeUrl = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('[Gymix WA] Failed to generate QR Base64 image:', err);
    }
  });

  client.on('ready', () => {
    console.log(`[Gymix WA] WhatsApp Client is ready & linked for Gym ID: ${gymId}!`);
    sessionData.status = 'connected';
    sessionData.qrCodeUrl = '';
    sessionData.connectedNumber = client.info.wid.user;
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
  });

  client.on('authenticated', () => {
    console.log(`[Gymix WA] Session authenticated for Gym ID: ${gymId}`);
  });

  client.on('auth_failure', (msg) => {
    console.error(`[Gymix WA] Authentication failure for Gym ID: ${gymId}:`, msg);
    sessionData.status = 'disconnected';
    sessionData.qrCodeUrl = '';
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`[Gymix WA] Client disconnected for Gym ID: ${gymId}. Reason: ${reason}`);
    sessionData.status = 'disconnected';
    sessionData.qrCodeUrl = '';
    sessionData.connectedNumber = '';
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
  });

  client.initialize().catch(err => {
    console.error(`[Gymix WA] Initialization failed for Gym ID: ${gymId}:`, err);
    sessionData.status = 'disconnected';
    sessionData.lastError = err.message || String(err);
    sessionData.lastErrorStack = err.stack || '';
    if (sessionData.expiryTimer) {
      clearTimeout(sessionData.expiryTimer);
      sessionData.expiryTimer = null;
    }
  });

  sessionData.status = 'connecting';
  sessions[gymId] = sessionData;
  return sessionData;
}

/**
 * 1. GET /api/whatsapp/status
 * Check current socket connection state and active details
 */
app.get('/api/whatsapp/status', (req, res) => {
  const { gymId } = req.query;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  const session = sessions[gymId];
  if (!session) {
    return res.json({ status: 'disconnected', connectedNumber: '' });
  }

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber
  });
});

/**
 * Diagnostic debug endpoint to read initialization errors from the server
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
    arch: process.arch
  });
});

/**
 * 2. POST /api/whatsapp/connect
 * Trigger active linking loop, returns QR code if ready
 */
app.post('/api/whatsapp/connect', (req, res) => {
  const { gymId } = req.body;
  if (!gymId) return res.status(400).json({ error: 'Missing gymId parameter' });

  const session = getClient(gymId);

  res.json({
    status: session.status,
    qrCodeUrl: session.qrCodeUrl,
    connectedNumber: session.connectedNumber
  });
});

/**
 * 3. POST /api/whatsapp/send
 * Dispatches automated messages via active socket
 */
app.post('/api/whatsapp/send', async (req, res) => {
  const { gymId, phone, message } = req.body;
  if (!gymId || !phone || !message) {
    return res.status(400).json({ error: 'Missing parameters (gymId, phone, message)' });
  }

  const session = sessions[gymId];
  if (!session || session.status !== 'connected') {
    return res.status(400).json({ error: 'WhatsApp session is not linked or connected for this gym' });
  }

  try {
    // 1. Sanitize phone number (strip leading 0 and prepend 91 for Indian 10-digit formats)
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    // 2. Fetch official registered JID from WhatsApp servers
    console.log(`[Gymix WA] Formatting target JID for number: ${cleanPhone}`);
    let targetJid = `${cleanPhone}@c.us`;
    try {
      const numberId = await session.client.getNumberId(cleanPhone);
      if (numberId && numberId._serialized) {
        targetJid = numberId._serialized;
        console.log(`[Gymix WA] Registered JID retrieved: ${targetJid}`);
      } else {
        console.log(`[Gymix WA] No direct registered JID found for ${cleanPhone}, falling back to ${targetJid}`);
      }
    } catch (e) {
      console.warn('[Gymix WA] Failed to query getNumberId, using standard format fallback:', e.message);
    }

    // 3. Send message via WhatsApp API
    await session.client.sendMessage(targetJid, message);
    console.log(`[Gymix WA] Message dispatched successfully to ${targetJid}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Gymix WA] Message sending failed:', err);
    res.status(500).json({ error: 'Failed to send message via WhatsApp gateway API', details: err.message });
  }
});

/**
 * 4. POST /api/whatsapp/disconnect
 * Closes socket connections and deletes saved keys
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
      if (session.client) {
        console.log(`[Gymix WA] Unlinking and destroying active WhatsApp session for Gym ID: ${gymId}`);
        try {
          // Attempt clean logout (de-authorizes session with WhatsApp servers)
          await session.client.logout();
          console.log(`[Gymix WA] Successfully logged out session from WhatsApp for Gym: ${gymId}`);
        } catch (logoutErr) {
          console.warn(`[Gymix WA] client.logout() failed (device may be already offline). Destroying client...:`, logoutErr.message);
          try {
            await session.client.destroy();
          } catch (destroyErr) {
            console.error(`[Gymix WA] Failed to destroy client:`, destroyErr.message);
          }
        }
      }
      delete sessions[gymId];
    }

    // Forcefully delete session auth credentials directory from disk to prevent automatic reconnects
    const sessionDir = path.join(__dirname, '.wwebjs_auth', `session-gymix_session_${gymId}`);
    if (fs.existsSync(sessionDir)) {
      console.log(`[Gymix WA] Wiping session credentials directory from disk: ${sessionDir}`);
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    console.log(`[Gymix WA] Cleaned up and disconnected session for Gym ID: ${gymId}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[Gymix WA] Logout / Disconnect failed:', err);
    res.status(500).json({ error: 'Failed to destroy session', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Gymix WhatsApp Gateway is running on Port: ${PORT}`);
  console.log(`===============================================`);
});
