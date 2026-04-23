// api/admin-login.js
// Valida a senha do admin no servidor
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '96979032';

  if (password === ADMIN_PASSWORD) {
    // Em um sistema real usaríamos JWT, aqui vamos gerar um token simples baseado na data
    // mas que é validado apenas por esta API.
    const token = Buffer.from(`auth_${ADMIN_PASSWORD}_${new Date().getDate()}`).toString('base64');
    
    return res.status(200).json({ 
      success: true, 
      token: token,
      message: 'Acesso concedido' 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: 'Senha incorreta' 
    });
  }
}
