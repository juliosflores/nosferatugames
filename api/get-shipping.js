// api/get-shipping.js
const rateLimitMap = new Map();

function rateLimit(ip, max = 20, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > max;
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (rateLimit(ip)) return res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });

  const { cep_destino } = req.body || {};

  // Validar CEP
  const cepLimpo = String(cep_destino || '').replace(/\D/g, '');
  if (cepLimpo.length !== 8) return res.status(400).json({ error: 'CEP inválido.' });

  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) return res.status(500).json({ error: 'Serviço não configurado.' });

  try {
    const response = await fetch('https://api.superfrete.com/api/v0/calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NosferatuGames/1.0'
      },
      body: JSON.stringify({
        from: { postal_code: '90430100' },
        to:   { postal_code: cepLimpo },
        services: '1,2,17',
        options: { own_hand: false, receipt: false, insurance_value: 0, use_insurance_value: false },
        package: { height: 2, width: 11, length: 16, weight: 0.3 }
      })
    });

    if (!response.ok) {
      console.error('[get-shipping] Superfrete HTTP', response.status, await response.text());
      return res.status(200).json([]); // Retorna vazio ao invés de erro - permite retirada
    }

    const data = await response.json();
    console.log('[get-shipping] Superfrete response:', JSON.stringify(data).slice(0,200));
    
    if (!Array.isArray(data)) {
      console.error('[get-shipping] Resposta não é array:', typeof data);
      return res.status(200).json([]);
    }

    const opcoes = data
      .filter(s => !s.error && s.price > 0)
      .map(s => ({ name: s.name, price: s.price, deadline: s.delivery_time }));

    console.log('[get-shipping] Opcoes filtradas:', opcoes.length);
    return res.status(200).json(opcoes);
  } catch (error) {
    console.error('[get-shipping] Erro:', error.message);
    return res.status(200).json([]); // Retorna vazio - permite retirada
  }
}
