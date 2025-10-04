import Constants from 'expo-constants';

// Deployed default (update if different)
const DEFAULT_URL = 'https://us-central1-schedule-app-54891.cloudfunctions.net/sendOtpEmail';
// For local emulator use: http://localhost:5001/schedule-app-54891/us-central1/sendOtpEmail
const SEND_OTP_URL = (Constants?.expoConfig?.extra?.sendOtpUrl) || DEFAULT_URL;

export async function sendOtpEmail(to, otp, expiresMinutes = 10) {
  if (!SEND_OTP_URL) {
    throw new Error('sendOtpUrl not configured. Add expo.extra.sendOtpUrl');
  }
  const res = await fetch(SEND_OTP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, otp, expiresMinutes }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${text}`);
  }
  return res.json();
}

export default { sendOtpEmail };


