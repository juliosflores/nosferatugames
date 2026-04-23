
const mercadopago = require('mercadopago');

mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN || 'APP_USR-8415715568393521-120516-724838634e2c842103565f3f0196236b-12345678' 
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, shipping_cost, shipping_name } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    // Converter itens do carrinho para formato MP
    const mp_items = items.map(item => ({
      id: item.id,
      title: item.nome,
      description: item.descricao || `${item.console || ''} · Nosferatu Games`,
      picture_url: (item.imagens && item.imagens[0]) || item.imagem_url || '',
      category_id: 'games',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(item.preco)
    }));

    // Adicionar frete como um item se existir
    if (shipping_cost > 0) {
      mp_items.push({
        id: 'shipping',
        title: `🚚 Frete: ${shipping_name || 'Entrega'}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(shipping_cost)
      });
    }

    const preference = {
      items: mp_items,
      back_urls: {
        success: 'https://nosferatugames.com.br/?pagamento=sucesso',
        failure: 'https://nosferatugames.com.br/?pagamento=erro',
        pending: 'https://nosferatugames.com.br/?pagamento=pendente'
      },
      auto_return: 'approved',
      statement_descriptor: 'NOSFERATU GAMES',
      notification_url: 'https://nosferatugames.com.br/api/mp-webhook'
    };

    const response = await mercadopago.preferences.create(preference);
    
    res.status(200).json({
      id: response.body.id,
      init_point: response.body.init_point
    });

  } catch (error) {
    console.error('Erro MP:', error);
    res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
}
