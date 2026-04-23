
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cep_destino, endereco } = req.body;
  const ORS_KEY = process.env.ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5YjhiOTk0NzNlMDRkMGU5ZmRkNTAzNTljNWI0MWUyIiwiaCI6Im11cm11cjY0In0=';
  
  const ORIGEM = [-51.217743, -30.034608]; 

  try {
    const searchText = endereco || cep_destino;
    const geoRes = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(searchText)}&boundary.country=BR&size=1`);
    const geoData = await geoRes.json();

    if (!geoData.features || geoData.features.length === 0) {
      return res.status(400).json({ error: 'Local não localizado.' });
    }

    const DESTINO = geoData.features[0].geometry.coordinates;

    const routeRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [ORIGEM, DESTINO] })
    });

    const routeData = await routeRes.json();
    
    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('Sem rota.');
    }

    const distanciaKM = routeData.routes[0].summary.distance / 1000;

    // FÓRMULA DE REVENDA: Mínimo R$ 18 ou (Base R$ 10 + KM * 1.70)
    let precoFrete = Math.max(18, 10 + (distanciaKM * 1.70));
    precoFrete = Math.ceil(precoFrete);

    return res.status(200).json({
      distancia: distanciaKM.toFixed(2),
      preco: precoFrete
    });

  } catch (error) {
    return res.status(500).json({ error: 'Erro de rota.' });
  }
}
