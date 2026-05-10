export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    // AURORA (VPS) - HTTPS Seguro
    const AURORA_URL = 'https://hermes.nosferatugames.com.br/aurora/v1/chat/completions';
    
    // GEMINI - Fallback Grátis
    const GEMINI_KEY = process.env.GEMINI_API_KEY;

    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"nome exato e completo do jogo/produto (ex: The Legend of Zelda: Breath of the Wild)","console":"PS5|PS4|Nintendo Switch|Nintendo 3DS|Retrô|Pokémon TCG|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço inteiro em reais baseado no mercado brasileiro atual,"descricao":"descrição ESPECÍFICA e persuasiva: mencione o nome do jogo, gênero exato, destaques únicos do título e estado de conservação. Máx 150 chars. NUNCA use frases genéricas como 'ideal para fãs' ou 'aventuras e desafios'.","hashtags":"10 hashtags específicos do jogo+console separados por espaço"}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    // ── 1. Tentar via Aurora (ChatGPT Plus do dono) ──
    try {
      console.log('Trying Aurora HTTPS (ChatGPT Plus)...');
      const resp = await fetch(AURORA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
          // Token já está configurado no ambiente da VPS (Aurora)
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.choices && data.choices[0]) {
          const text = data.choices[0].message.content;
          const clean = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          console.log('Success via Aurora HTTPS');
          return res.status(200).json(parsed);
        }
      }
      console.log('Aurora HTTPS returned error status:', resp.status);
    } catch (e) {
      console.log('Aurora HTTPS failed:', e.message);
    }

    // ── 2. Fallback Gemini Flash (Grátis) ──
    if (GEMINI_KEY) {
      try {
        console.log('Trying Gemini Fallback...');
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: media_type || 'image/jpeg', data: image_base64 } },
                  { text: PROMPT },
                ],
              }],
            }),
          }
        );

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log('Success via Gemini');
        return res.status(200).json(parsed);
      } catch (e) {
        console.log('Gemini failed:', e.message);
      }
    }

    return res.status(500).json({ error: 'Todos os provedores falharam.' });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
