// api/admin-login.js
import crypto from 'crypto';

const ALLOWED_ORIGINS = [
  'https://julioflores.com.br',
  'https://www.julioflores.com.br',
  'https://nosferatugames.com.br',
  'https://www.nosferatugames.com.br',
  'https://nosferatugames.vercel.app'
];

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : (process.env.SITE_URL || 'https://julioflores.com.br');

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body || {};

  // Senha OBRIGATORIAMENTE via env — sem fallback hardcoded
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ success: false, message: 'Servidor não configurado.' });
  }

  // Comparação em tempo constante (evita timing attacks)
  const senhaOk = password && crypto.timingSafeEqual(
    Buffer.from(password.padEnd(64)),
    Buffer.from(ADMIN_PASSWORD.padEnd(64))
  );

  if (senhaOk) {
    // Token com data + hora — renova a cada hora
    const hora = Math.floor(Date.now() / 3600000);
    const secret = process.env.ADMIN_SECRET || ADMIN_PASSWORD;
    const token = crypto
      .createHmac('sha256', secret)
      .update(`nosferatu_${hora}`)
      .digest('hex');

    return res.status(200).json({ success: true, token });
  }

  // Delay para dificultar brute force
  await new Promise(r => setTimeout(r, 500));
  return res.status(401).json({ success: false, message: 'Senha incorreta.' });
}
