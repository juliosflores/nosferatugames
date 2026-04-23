
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cep_destino } = req.body;
  const token = process.env.SUPERFRETE_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzY5MTY3MDEsInN1YiI6IjRpZ3hCS0prRE5aSEZpdnM4YnFXUEZ5VkFJYTIifQ.H3PmzB0KUOs-Ng_GhaxHRSlPfNKmeu3YZos5ED9djd8';

  try {
    const response = await fetch('https://api.superfrete.com/api/v0/calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NosferatuGames/1.0'
      },
      body: JSON.stringify({
        "from": {
          "postal_code": "90430100"
        },
        "to": {
          "postal_code": cep_destino.replace(/\D/g, '')
        },
        "services": "1,2,17",
        "options": {
          "own_hand": false,
          "receipt": false,
          "insurance_value": 0,
          "use_insurance_value": false
        },
        "package": {
          "height": 2,
          "width": 11,
          "length": 16,
          "weight": 0.3
        }
      })
    });

    const data = await response.json();
    
    if (!Array.isArray(data)) {
       return res.status(400).json({ error: 'Erro na API do SuperFrete', details: data });
    }

    const opcoes = data.map(servico => ({
      name: servico.name,
      price: servico.price,
      deadline: servico.deadline,
      error: servico.error
    })).filter(s => !s.error);

    return res.status(200).json(opcoes);
  } catch (error) {
    console.error('Erro interno na API de frete:', error);
    return res.status(500).json({ error: 'Erro interno ao calcular frete' });
  }
}
