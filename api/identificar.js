export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    let accessToken = '';
    try {
      const tokenResp = await fetch('https://hermes.nosferatugames.com.br/token.txt?t=' + Date.now());
      if (tokenResp.ok) {
        accessToken = (await tokenResp.text()).trim();
      }
    } catch (e) {}

    if (!accessToken) accessToken = process.env.CHATGPT_ACCESS_TOKEN || '';

    const CHAT2API_URL = 'https://hermes.nosferatugames.com.br/chat2api/v1/chat/completions';
    
    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"...","console":"PS5|PS4|Switch|3DS|Retrô|Pokémon|Acessórios","condicao":"Novo|Seminovo|Usado","preco":0,"descricao":"...","hashtags":"..."}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    try {
      const resp = await fetch(CHAT2API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
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
        const text = data.choices?.[0]?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        }
      }
    } catch (e) {
      console.error('Chat2API error:', e.message);
    }

    // FALLBACK: GEMINI FLASH (Se o Plus falhar)
    if (process.env.GEMINI_API_KEY) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        }
      } catch (e) {}
    }

    return res.status(500).json({ error: 'Falha na identificação.' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
