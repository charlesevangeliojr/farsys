const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

try {
  admin.initializeApp();
} catch (e) {}

// Configure transporter using runtime config to avoid hardcoding secrets
const getTransporter = () => {
  const user = functions.config().gmail && functions.config().gmail.user;
  const pass = functions.config().gmail && functions.config().gmail.pass;
  if (!user || !pass) {
    throw new Error('Gmail credentials not set. Use: firebase functions:config:set gmail.user="you@gmail.com" gmail.pass="app-password"');
  }
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
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


