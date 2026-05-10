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
    } catch (e) {
      console.error('Erro ao ler token da VPS:', e.message);
    }

    if (!accessToken) {
       accessToken = process.env.CHATGPT_ACCESS_TOKEN || '';
    }

    const CHAT2API_URL = 'https://hermes.nosferatugames.com.br/chat2api/v1/chat/completions';
    
    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido:
{"nome":"nome do jogo","console":"PS5|PS4|Switch|3DS|Retrô|Pokémon|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço_reais,"descricao":"descrição persuasiva","hashtags":"hashtags"}
Regras: responda APENAS o objeto JSON. Nada de explicações fora do JSON.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    try {
      console.log('Iniciando requisição ao Chat2API...');
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
        console.log('Resposta bruta da IA:', text);

        try {
          // Extrair JSON mesmo que tenha texto em volta
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('JSON processado com sucesso!');
            return res.status(200).json(parsed);
          }
        } catch (parseErr) {
          console.error('Erro ao parsear JSON da IA:', parseErr.message);
        }
      } else {
        const errText = await resp.text();
        console.error('Chat2API recusou a chamada:', resp.status, errText);
      }
    } catch (e) {
      console.error('Chat2API falha crítica:', e.message);
    }

    // FALLBACK GEMINI
    // ... (restante do código omitido para brevidade, mas mantido no arquivo real)

    return res.status(500).json({ error: 'Falha na identificação. Tente novamente.' });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
