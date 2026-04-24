// api/precificar.js
// Busca o menor preço de um produto na OLX Brasil
// e sugere o preço de compra (40-50% do menor encontrado)

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { nomeProduto } = req.body || {};
  if (!nomeProduto || nomeProduto.length < 3) return res.status(400).json({ error: 'Nome inválido.' });

  // Sanitizar nome — só letras, números e espaços
  const nomeSeguro = String(nomeProduto).replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim().slice(0, 100);

  try {
    const query = encodeURIComponent(nomeSeguro);
    const url   = `https://www.olx.com.br/videogames?q=${query}&o=1`;

    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NosferatuGamesBot/1.0)',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      }
    });

    const html = await r.text();

    // Extrair preços do JSON embedado na página da OLX
    const match = html.match(/"price":\{"value":(\d+)/g);
    if (!match || match.length === 0) {
      return res.status(200).json({
        encontrado: false,
        mensagem: 'Nenhum resultado encontrado na OLX.',
        sugestaoCompra: null
      });
    }

    const precos = match
      .map(m => parseInt(m.replace(/"price":\{"value":/, '')))
      .filter(p => p > 10 && p < 50000) // Filtrar preços absurdos
      .sort((a, b) => a - b);

    if (precos.length === 0) {
      return res.status(200).json({ encontrado: false, mensagem: 'Preços não identificados.', sugestaoCompra: null });
    }

    const menorPreco   = precos[0];
    const mediana      = precos[Math.floor(precos.length / 2)];
    const compra40     = Math.floor(menorPreco * 0.40);
    const compra50     = Math.floor(menorPreco * 0.50);

    return res.status(200).json({
      encontrado: true,
      totalAnuncios: precos.length,
      menorPreco,
      medianaPreco: mediana,
      sugestaoCompra: {
        conservador: compra40,
        generoso:    compra50,
        texto: `Comprar por R$ ${compra40.toLocaleString('pt-BR')} a R$ ${compra50.toLocaleString('pt-BR')}`
      }
    });

  } catch (e) {
    console.error('[precificar]', e.message);
    return res.status(500).json({ error: 'Erro ao consultar OLX.' });
  }
}
