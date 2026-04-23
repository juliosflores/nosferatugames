
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cep_destino } = req.body;
  const token = process.env.SUPERFRETE_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzY5MTY3MDEsInN1YiI6IjRpZ3hCS0prRE5aSEZpdnM4YnFXUEZ5VkFJYTIifQ.H3PmzB0KUOs-Ng_GhaxHRSlPfNKmeu3YZos5ED9djd8';

  try {
    const response = await fetch('https://api.superfrete.com/v1/calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NosferatuGames/1.0'
      },
      body: JSON.stringify({
        "from": "90430100",
        "to": cep_destino.replace(/\D/g, ''),
        "services": "1,2,17", // PAC, SEDEX, Mini Envios
        "options": {
          "width": 15,
          "height": 4,
          "length": 21,
          "weight": 0.3,
          "insurance": 0,
          "own_hand": false,
          "receipt": false
        }
      })
    });

    const data = await response.json();
    
    // Filtrar apenas o que nos interessa
    const opcoes = data.map(servico => ({
      name: servico.name,
      price: servico.price,
      deadline: servico.deadline,
      error: servico.error
    })).filter(s => !s.error);

    return res.status(200).json(opcoes);
  } catch (error) {
    console.error('Erro SuperFrete:', error);
    return res.status(500).json({ error: 'Erro ao calcular frete' });
  }
}
