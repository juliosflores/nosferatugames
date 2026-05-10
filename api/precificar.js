export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    const LLM7_KEY        = 'Rc6MuE7et9Jag0NJikxewuUQFNyZGDNkeNgVvtqF/5HbGxvPXr8GVUzL1dugt8pSCNxqWn8nFtut9sXatf8PKRraUzlyXK1uPLoWvpHmST9QmDOs3UPMgx6OfHeSK23jwA==';
    const SILICONFLOW_KEY = 'sk-sztmuozixqhxpkmwcvufotslcqrvdzupjtkjdrzbjtitblii';

    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"nome exato e completo do jogo/produto (ex: The Legend of Zelda: Breath of the Wild)","console":"PS5|PS4|Nintendo Switch|Nintendo 3DS|Retrô|Pokémon TCG|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço inteiro em reais baseado no mercado brasileiro atual,"descricao":"descrição ESPECÍFICA e persuasiva: mencione o nome do jogo, gênero exato, destaques únicos do título e estado de conservação. Máx 150 chars. NUNCA use frases genéricas como 'ideal para fãs' ou 'aventuras e desafios'.","hashtags":"10 hashtags específicos do jogo+console separados por espaço"}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    // ── 1. LLM7.io ──
    if (LLM7_KEY) {
      try {
        console.log('Trying LLM7.io...');

        const resp = await fetch('https://api.llm7.io/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LLM7_KEY}`
          },
          body: JSON.stringify({
            model: 'gemini-2.5-flash-lite',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: PROMPT },
              ]
            }],
          }),
        });

        const data = await resp.json();

        if (data.error) throw new Error(JSON.stringify(data.error));

        const text = data.choices?.[0]?.message?.content || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        console.log('Success via LLM7.io');
        return res.status(200).json(parsed);

      } catch (e) {
        console.log('LLM7.io failed:', e.message);
      }
    }

    // ── 2. SiliconFlow ──
    if (SILICONFLOW_KEY) {
      try {
        console.log('Trying SiliconFlow...');

        const resp = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SILICONFLOW_KEY}`
          },
          body: JSON.stringify({
            model: 'Qwen/Qwen2.5-VL-72B-Instruct',
            max_tokens: 512,
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: imageUrl } },
                { type: 'text', text: PROMPT },
              ]
            }],
          }),
        });

        const data = await resp.json();

        if (data.error) throw new Error(JSON.stringify(data.error));

        const text = data.choices?.[0]?.message?.content || '';
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);

        console.log('Success via SiliconFlow');
        return res.status(200).json(parsed);

      } catch (e) {
        console.log('SiliconFlow failed:', e.message);
      }
    }

    return res.status(500).json({
      error: 'Todos os provedores falharam.'
    });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
