// api/get-motoboy.js
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
  if (rateLimit(ip)) return res.status(429).json({ error: 'Muitas requisições.' });

  const { cep_destino, endereco } = req.body || {};

  // Validar CEP
  const cepLimpo = String(cep_destino || '').replace(/\D/g, '');
  if (cepLimpo.length !== 8) return res.status(400).json({ error: 'CEP inválido.' });

  // Validar endereço — só letras, números, vírgulas, espaços e traços
  const enderecoLimpo = String(endereco || cep_destino || '').slice(0, 200);
  if (!/^[\w\sÀ-ÿ,.\-/]+$/.test(enderecoLimpo)) return res.status(400).json({ error: 'Endereço inválido.' });

  const ORS_KEY = process.env.ORS_KEY;
  if (!ORS_KEY) return res.status(500).json({ error: 'Serviço não configurado.' });

  const ORIGEM = [-51.217743, -30.034608];

  try {
    const geoRes = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(enderecoLimpo)}&boundary.country=BR&size=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.features?.length) return res.status(400).json({ error: 'Local não localizado.' });

    const DESTINO = geoData.features[0].geometry.coordinates;

    const routeRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [ORIGEM, DESTINO] })
    });
    const routeData = await routeRes.json();
    if (!routeData.routes?.length) throw new Error('Sem rota.');

    const distanciaKM = routeData.routes[0].summary.distance / 1000;
    const precoFrete  = Math.ceil(Math.max(18, 7 + distanciaKM * 1.70));

    return res.status(200).json({ distancia: distanciaKM.toFixed(2), preco: precoFrete });
  } catch {
    return res.status(500).json({ error: 'Erro de rota.' });
  }
}
