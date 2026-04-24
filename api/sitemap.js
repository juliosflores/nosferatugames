// api/sitemap.js — Sitemap dinâmico com produtos do Supabase
export default async function handler(req, res) {
  const SUPA_URL  = process.env.SUPABASE_URL  || 'https://jcnncmfbodglvoyytgok.supabase.co';
  const SUPA_KEY  = process.env.SUPABASE_KEY;
  const SITE_URL  = process.env.SITE_URL || 'https://nosferatugames.com.br';

  const hoje = new Date().toISOString().split('T')[0];

  // Páginas estáticas
  let urls = `
  <url><loc>${SITE_URL}/</loc><lastmod>${hoje}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;

  // Tentar buscar produtos no Supabase
  try {
    if (SUPA_KEY) {
      const r = await fetch(
        `${SUPA_URL}/rest/v1/produtos?select=id,nome,console,updated_at&ativo=eq.true&vendido=eq.false&order=updated_at.desc&limit=500`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      );
      if (r.ok) {
        const produtos = await r.json();
        for (const p of produtos) {
          const slug = encodeURIComponent((p.nome||'produto').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,''));
          const lastmod = p.updated_at ? p.updated_at.split('T')[0] : hoje;
          urls += `\n  <url><loc>${SITE_URL}/?produto=${p.id}&slug=${slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
        }
      }
    }
  } catch { /* silencioso */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(xml);
}
