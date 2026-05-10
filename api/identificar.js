export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    const GEMINI_KEY     = process.env.GEMINI_API_KEY;
    const GROQ_KEY       = process.env.GROQ_API_KEY;
    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"nome exato e completo do jogo/produto (ex: The Legend of Zelda: Breath of the Wild)","console":"PS5|PS4|Nintendo Switch|Nintendo 3DS|Retrô|Pokémon TCG|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço inteiro em reais baseado no mercado brasileiro atual,"descricao":"descrição ESPECÍFICA e persuasiva: mencione o nome do jogo, gênero exato, destaques únicos do título e estado de conservação. Máx 150 chars. NUNCA use frases genéricas como 'ideal para fãs' ou 'aventuras e desafios'.","hashtags":"10 hashtags específicos do jogo+console separados por espaço"}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    // ── 1. Gemini (primário — melhor pra reconhecer capas) ──
    if (GEMINI_KEY) {
      try {
        console.log('Trying Gemini Flash...');
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
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
              generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
            }),
          }
        );
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        console.log('Success via Gemini');
        return res.status(200).json(parsed);
      } catch (e) {
        console.log('Gemini failed:', e.message);
      }
    }

    // ── 2. Groq Llama 4 Scout ──
    if (GROQ_KEY) {
      try {
        console.log('Trying Groq...');
        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            max_tokens: 512,
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: PROMPT },
            ]}],
          }),
        });
        const data = await resp.json();
        if (data.error) throw new Error(data.error.message);
        const text = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        console.log('Success via Groq');
        return res.status(200).json(parsed);
      } catch (e) {
        console.log('Groq failed:', e.message);
      }
    }

    // ── 3. OpenRouter fallbacks ──
    if (OPENROUTER_KEY) {
      const OR_MODELS = [
        'google/gemma-4-31b-it:free',
        'google/gemma-4-26b-a4b-it:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
      ];
      for (const model of OR_MODELS) {
        try {
          console.log(`Trying OpenRouter ${model}...`);
          const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENROUTER_KEY}`, 'HTTP-Referer': 'https://nosferatugames.vercel.app', 'X-Title': 'Nosferatu Games' },
            body: JSON.stringify({
              model, max_tokens: 512,
              messages: [{ role: 'user', content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: PROMPT },
              ]}],
            }),
          });
          const data = await resp.json();
          if (data.error) throw new Error(data.error.message);
          const text = data.choices?.[0]?.message?.content || '';
          const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
          console.log(`Success via OpenRouter ${model}`);
          return res.status(200).json(parsed);
        } catch (e) {
          console.log(`OpenRouter ${model} failed:`, e.message);
        }
      }
    }

    return res.status(500).json({ error: 'Todos os provedores falharam. Configure GEMINI_API_KEY, GROQ_API_KEY ou OPENROUTER_API_KEY no Vercel.' });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
