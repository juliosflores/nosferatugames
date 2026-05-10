export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://nosferatugames.vercel.app',
        'X-Title': 'Nosferatu Games Admin',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${media_type || 'image/jpeg'};base64,${image_base64}` },
            },
            {
              type: 'text',
              text: `Você é um especialista em games e retrogaming brasileiro. Analise esta foto de produto e responda APENAS um JSON válido, sem markdown, sem explicações:
{"nome":"nome completo do produto","console":"um de: PS5, PS4, Nintendo Switch, Nintendo 3DS, Retrô, Pokémon TCG, Acessórios","condicao":"um de: Novo, Seminovo, Usado","preco":número inteiro sugerido em reais,"descricao":"descrição de venda atrativa em português, máx 150 chars","hashtags":"10 hashtags relevantes separadas por espaço, ex: #ps4 #games"}
Se não reconhecer, chute o mais próximo possível.`,
            },
          ],
        }],
      }),
    });

    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
