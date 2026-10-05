const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

try {
  admin.initializeApp();
} catch (e) {}

// Reuse a single SMTP transport across invocations (avoids reconnect per request)
let cachedTransporter = null;
let cachedUser = null;

const getTransporter = () => {
  const config = functions.config().gmail || {};
  const user = config.user;
  const pass = config.pass;
  if (!user || !pass) {
    throw new Error('Gmail credentials not set. Use: firebase functions:config:set gmail.user="you@gmail.com" gmail.pass="app-password"');
  }
  if (cachedTransporter && cachedUser === user) {
    return cachedTransporter;
  }
  cachedUser = user;
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    pool: true,
    maxConnections: 2,
    maxMessages: 50,
  });
  return cachedTransporter;
};

// Simple in-memory rate limit: max 3 OTP emails per address per 10 minutes
const otpAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

const isRateLimited = (email) => {
  const now = Date.now();
  const attempts = otpAttempts.get(email) || [];
  const recent = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    otpAttempts.set(email, recent);
    return true;
  }
  recent.push(now);
  otpAttempts.set(email, recent);
  // Periodically prune old entries to keep memory bounded
  if (otpAttempts.size > 5000) {
    for (const [key, times] of otpAttempts) {
      const kept = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (kept.length === 0) otpAttempts.delete(key);
      else otpAttempts.set(key, kept);
    }
  }
  return false;
};

exports.sendOtpEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(204).send('');
    }
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const { to, otp, expiresMinutes = 10 } = req.body || {};
    if (!to || !otp) {
      return res.status(400).json({ error: 'Missing to or otp' });
    }

    if (isRateLimited(String(to).toLowerCase())) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
      const transporter = getTransporter();
      const user = functions.config().gmail.user;
      const info = await transporter.sendMail({
        from: `Schedule App <${user}>`,
        to,
        subject: 'Your One-Time Password (OTP)',
        text: `Your OTP is ${otp}. It will expire in ${expiresMinutes} minutes.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:16px">
            <h2>Schedule App OTP</h2>
            <p>Use the code below to continue:</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:16px 0">${otp}</div>
            <p>This code expires in <b>${expiresMinutes} minutes</b>.</p>
          </div>
        `,
      });
      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (err) {
      console.error('sendOtpEmail error:', err);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  });
});
