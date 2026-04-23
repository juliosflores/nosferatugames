
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cep_destino } = req.body;
  const ORS_KEY = process.env.ORS_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5YjhiOTk0NzNlMDRkMGU5ZmRkNTAzNTljNWI0MWUyIiwiaCI6Im11cm11cjY0In0=';
  
  const ORIGEM = [-51.217743, -30.034608]; 

  try {
    const geoRes = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${cep_destino}&boundary.country=BR&size=1`);
    const geoData = await geoRes.json();

    if (!geoData.features || geoData.features.length === 0) {
      return res.status(400).json({ error: 'CEP não localizado para rota.' });
    }

    const DESTINO = geoData.features[0].geometry.coordinates;

    const routeRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { 'Authorization': ORS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates: [ORIGEM, DESTINO] })
    });

    const routeData = await routeRes.json();
    
    if (!routeData.routes || routeData.routes.length === 0) {
      throw new Error('Não foi possível calcular a rota.');
    }

    const distanciaMetros = routeData.routes[0].summary.distance;
    const distanciaKM = distanciaMetros / 1000;

    // FÓRMULA ATUALIZADA: Mínimo de R$ 18 ou (10 + km * 1.90)
    let precoFrete = Math.max(18, 10 + (distanciaKM * 1.90));
    
    precoFrete = Math.ceil(precoFrete);

    return res.status(200).json({
      distancia: distanciaKM.toFixed(2),
      preco: precoFrete
    });

  } catch (error) {
    console.error('Erro no cálculo de motoboy:', error);
    return res.status(500).json({ error: 'Erro ao calcular rota de motoboy.' });
  }
}
