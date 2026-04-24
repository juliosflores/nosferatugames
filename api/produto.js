// api/produto.js — Retorna dados de um produto pelo ID para deep link / OG tags
export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ erro: 'ID inválido' });

  const SUPA_URL = process.env.SUPABASE_URL || 'https://jcnncmfbodglvoyytgok.supabase.co';
  const SUPA_KEY = process.env.SUPABASE_KEY;
  const SITE_URL = process.env.SITE_URL || 'https://nosferatugames.com.br';

  try {
    const r = await fetch(
      `${SUPA_URL}/rest/v1/produtos?id=eq.${encodeURIComponent(id)}&select=id,nome,console,preco,condicao,descricao,imagens,imagem_url`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
    );
    const dados = await r.json();
    const p = dados?.[0];
    if (!p) return res.status(404).send('Produto não encontrado');

    const img   = (p.imagens?.[0] || p.imagem_url || `${SITE_URL}/banner.png`);
    const preco = p.preco ? `R$ ${Number(p.preco).toLocaleString('pt-BR')}` : '';
    const desc  = p.descricao || `${p.condicao || ''} · ${p.console || ''} · Nosferatu Games POA`.trim();
    const slug  = (p.nome || 'produto').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'');
    const url   = `${SITE_URL}/?produto=${p.id}&slug=${slug}`;

    // HTML mínimo com OG tags para preview correto no WhatsApp/Instagram
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${p.nome} — Nosferatu Games</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="${p.nome} — ${preco}">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Nosferatu Games">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${p.nome} — ${preco}">
<meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0; url=${url}">
</head>
<body>
<script>window.location.replace('${url}');</script>
</body>
</html>`);
  } catch (e) {
    return res.status(500).json({ erro: 'Erro interno' });
  }
}
