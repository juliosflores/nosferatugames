// api/create-preference.js — SDK Mercado Pago v2 (ESM)
import { MercadoPagoConfig, Preference } from 'mercadopago';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items, shipping_cost, shipping_name } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    // Inicializa cliente MP v2
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preference = new Preference(client);

    // Converte itens do carrinho
    const mp_items = items.map(item => ({
      id: String(item.id),
      title: item.nome,
      description: item.descricao || `${item.console || ''} · Nosferatu Games`,
      picture_url: (item.imagens && item.imagens[0]) || item.imagem_url || '',
      category_id: 'games',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(item.preco),
    }));

    // Adiciona frete como item se houver
    if (shipping_cost > 0) {
      mp_items.push({
        id: 'shipping',
        title: `Frete: ${shipping_name || 'Entrega'}`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(shipping_cost),
      });
    }

    const siteUrl = process.env.SITE_URL || 'https://nosferatugames.com.br';

    const result = await preference.create({
      body: {
        items: mp_items,
        back_urls: {
          success: `${siteUrl}/?pagamento=sucesso`,
          failure: `${siteUrl}/?pagamento=erro`,
          pending: `${siteUrl}/?pagamento=pendente`,
        },
        auto_return: 'approved',
        statement_descriptor: 'NOSFERATU GAMES',
        notification_url: `${siteUrl}/api/mp-webhook`,
      },
    });

    return res.status(200).json({
      id: result.id,
      init_point: result.init_point,
    });

  } catch (error) {
    console.error('[create-preference] Erro:', error);
    return res.status(500).json({ error: 'Erro ao criar preferência de pagamento' });
  }
}
