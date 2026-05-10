export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    const GROQ_KEY       = process.env.GROQ_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

    const PROMPT = `Você é um especialista em games e retrogaming brasileiro. Analise esta foto de produto e responda APENAS um JSON válido, sem markdown, sem explicações:
{"nome":"nome completo do produto","console":"um de: PS5, PS4, Nintendo Switch, Nintendo 3DS, Retrô, Pokémon TCG, Acessórios","condicao":"um de: Novo, Seminovo, Usado","preco":número inteiro sugerido em reais,"descricao":"descrição de venda atrativa em português, máx 150 chars","hashtags":"10 hashtags relevantes separadas por espaço, ex: #ps4 #games"}
Se não reconhecer, chute o mais próximo possível.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    const PROVIDERS = [
      // 1. Groq — mais rápido, gratuito
      ...(GROQ_KEY ? [{
        name: 'Groq Llama4',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}` },
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      }] : []),
      // 2. OpenRouter Gemma 4 31B — melhor qualidade free com visão
      ...(OPENROUTER_KEY ? [{
        name: 'OR Gemma4-31B',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://nosferatugames.vercel.app', 'X-Title': 'Nosferatu Games' },
        model: 'google/gemma-4-31b-it:free',
      }] : []),
      // 3. OpenRouter Gemma 4 26B MoE
      ...(OPENROUTER_KEY ? [{
        name: 'OR Gemma4-26B',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://nosferatugames.vercel.app', 'X-Title': 'Nosferatu Games' },
        model: 'google/gemma-4-26b-a4b-it:free',
      }] : []),
      // 4. OpenRouter NVIDIA visão
      ...(OPENROUTER_KEY ? [{
        name: 'OR NVIDIA-VL',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://nosferatugames.vercel.app', 'X-Title': 'Nosferatu Games' },
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
      }] : []),
    ];

    if (!PROVIDERS.length) {
      return res.status(500).json({ error: 'Nenhuma API key configurada (GROQ_API_KEY ou OPENROUTER_API_KEY)' });
    }

    let lastError = '';
    for (const p of PROVIDERS) {
      try {
        console.log(`Trying ${p.name}...`);
        const resp = await fetch(p.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...p.headers },
          body: JSON.stringify({
            model: p.model,
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: PROMPT },
              ],
            }],
          }),
        });

        const data = await resp.json();
        if (data.error) {
          lastError = `${p.name}: ${data.error.message || JSON.stringify(data.error)}`;
          console.log(lastError);
          continue;
        }

        const text = data.choices?.[0]?.message?.content || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log(`Success via ${p.name}`);
        return res.status(200).json(parsed);

      } catch (e) {
        lastError = `${p.name}: ${e.message}`;
        console.log(lastError);
      }
    }

    return res.status(500).json({ error: `Todos os provedores falharam. Último: ${lastError}` });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
