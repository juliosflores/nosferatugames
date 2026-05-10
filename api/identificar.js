export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    // ── BUSCA O TOKEN DINAMICAMENTE ──
    let accessToken = '';
    try {
      const tokenResp = await fetch('https://hermes.nosferatugames.com.br/token.txt?t=' + Date.now());
      if (tokenResp.ok) {
        accessToken = (await tokenResp.text()).trim();
      }
    } catch (e) {}

    if (!accessToken) accessToken = process.env.CHATGPT_ACCESS_TOKEN || '';

    const CHAT2API_URL = 'https://hermes.nosferatugames.com.br/chat2api/v1/chat/completions';
    
    const PROMPT = `Você é um vendedor expert em games. Analise a foto e responda EXATAMENTE neste formato JSON:
{"nome":"...","console":"...","condicao":"...","preco":0,"descricao":"...","hashtags":"..."}
Responda APENAS o JSON, sem mais nada.`;

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
              { type: 'image_url', image_url: { url: `data:${media_type || 'image/jpeg'};base64,${image_base64}` } }
            ]
          }],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        // Tenta limpar e parsear
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.status(200).json(parsed);
          }
        } catch (e) {
          // Se falhar o parse, retorna o texto bruto para debug
          return res.status(200).json({ debug: true, raw: text });
        }
      } else {
         const err = await resp.text();
         return res.status(500).json({ error: 'Erro Chat2API: ' + resp.status, detail: err });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Falha conexão: ' + e.message });
    }

    return res.status(500).json({ error: 'Falha geral.' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
