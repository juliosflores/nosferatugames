export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nome, preco, descricao, console: consoleName, id, imagem } = req.body;

  if (!nome || !preco) {
    return res.status(400).json({ error: 'nome e preco são obrigatórios' });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  }

  const baseUrl = process.env.SITE_URL || 'https://nosferatugames.com.br';

  const preference = {
    items: [
      {
        id: id || String(Date.now()),
        title: nome,
        description: descricao || `${consoleName ? consoleName + ' · ' : ''}Nosferatu Games`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(preco),
        ...(imagem ? { picture_url: imagem } : {}),
      },
    ],
    back_urls: {
      success: `${baseUrl}/?pagamento=sucesso&produto=${encodeURIComponent(nome)}`,
      failure: `${baseUrl}/?pagamento=erro`,
      pending: `${baseUrl}/?pagamento=pendente`,
    },
    auto_return: 'approved',
    statement_descriptor: 'NOSFERATU GAMES',
    metadata: {
      produto_id: id,
      produto_nome: nome,
    },
  };

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();

    if (!mpRes.ok) {
      console.error('MP error:', data);
      return res.status(mpRes.status).json({ error: data.message || 'Erro no Mercado Pago' });
    }

    return res.status(200).json({
      init_point: data.init_point,           // produção
      sandbox_init_point: data.sandbox_init_point, // testes
      id: data.id,
    });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Erro interno ao criar preferência' });
  }
}
