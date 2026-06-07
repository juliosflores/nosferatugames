// api/create-preference.js — SDK Mercado Pago v2 (ESM)
import { MercadoPagoConfig, Preference } from 'mercadopago';

const rateLimitMap = new Map();
function rateLimit(ip, max = 10, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > max;
}

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = process.env.SITE_URL || 'https://nosferatugames.com.br';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  if (rateLimit(ip)) return res.status(429).json({ error: 'Muitas requisicoes.' });

  try {
    const { items, shipping_cost, shipping_name } = req.body || {};
    if (!items?.length) return res.status(400).json({ error: 'Carrinho vazio' });
    for (const item of items) {
      if (!item.id) return res.status(400).json({ error: 'Item sem id no carrinho.' });
    }

    // === Validação server-side: NUNCA confiar no preço do cliente ===
    // Busca preço/nome/estado real no Supabase pelo id e ignora o `preco` enviado.
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const uniqueIds = [...new Set(items.map(i => String(i.id)))];

    let produtosDB = [];
    try {
      const url = `${SUPABASE_URL}/rest/v1/produtos?id=in.(${uniqueIds.join(',')})&select=id,nome,preco,vendido`;
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
      produtosDB = await r.json();
    } catch (e) {
      console.error('[create-preference] Falha ao validar produtos:', e);
      return res.status(502).json({ error: 'Não foi possível validar os produtos. Tente novamente.' });
    }
    const byId = new Map(produtosDB.map(p => [String(p.id), p]));

    // Inicializa cliente MP v2
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN,
    });

    const preference = new Preference(client);

    // Converte itens do carrinho usando SEMPRE os dados do banco
    const mp_items = [];
    for (const item of items) {
      const db = byId.get(String(item.id));
      if (!db) return res.status(409).json({ error: `Produto indisponível: ${item.nome || item.id}` });
      if (db.vendido) return res.status(409).json({ error: `Produto já vendido: ${db.nome}` });
      if (isNaN(Number(db.preco)) || Number(db.preco) <= 0)
        return res.status(409).json({ error: `Preço inválido: ${db.nome}` });
      mp_items.push({
        id: String(db.id),
        title: db.nome,
        description: item.descricao || `${item.console || ''} · Nosferatu Games`,
        picture_url: (item.imagens && item.imagens[0]) || item.imagem_url || '',
        category_id: 'games',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(db.preco),
      });
    }

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
        // Liga o pagamento aos produtos pro mp-webhook marcar como vendido
        external_reference: uniqueIds.join(','),
        metadata: { produto_ids: uniqueIds, produto_nome: mp_items[0]?.title },
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
