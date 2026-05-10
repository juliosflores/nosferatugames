export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    // ── CONFIGURAÇÃO DO NOVO SISTEMA (CHAT2API) ──
    const CHAT2API_URL = 'https://hermes.nosferatugames.com.br/chat2api/v1/chat/completions';
    
    // O Access Token capturado (Validade de aprox. 1 hora, deve ser renovado se parar de funcionar)
    const ACCESS_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjE5MzQ0ZTY1LWJiYzktNDRkMS1hOWQwLWY5NTdiMDc5YmQwZSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS92MSJdLCJjbGllbnRfaWQiOiJhcHBfWDh6WTZ2VzJwUTl0UjNkRTduSzFqTDVnSCIsImV4cCI6MTc3OTI0OTYyMiwiaHR0cHM6Ly9hcGkub3BlbmFpLmNvbS9hdXRoIjp7ImNoYXRncHRfYWNjb3VudF9pZCI6IjkxN2ZmMzgxLTk3YWYtNDgwMS04MDQ1LTg1NDBkZWU2YjM5MCIsImNoYXRncHRfYWNjb3VudF91c2VyX2lkIjoidXNlci1sQW1WQTVlN01RdExXWkZWQTV3THpHRjFfXzkxN2ZmMzgxLTk3YWYtNDgwMS04MDQ1LTg1NDBkZWU2YjM5MCIsImNoYXRncHRfY29tcHV0ZV9yZXNpZGVuY3kiOiJub19jb25zdHJhaW50IiwiY2hhdGdwdF9wbGFuX3R5cGUiOiJnbyIsImNoYXRncHRfdXNlcl9pZCI6InVzZXItbEFtVkE1ZTdNUXRMV1pGVkE1d0x6R0YxIiwidXNlcl9pZCI6InVzZXItbEFtVkE1ZTdNUXRMV1pGVkE1d0x6R0YxIn0sImh0dHBzOi8vYXBpLm9wZW5haS5jb20vcHJvZmlsZSI6eyJlbWFpbCI6ImpyanVsaW8yQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfSwiaWF0IjoxNzc4Mzg1NjIxLCJpc3MiOiJodHRwczovL2F1dGgub3BlbmFpLmNvbSIsImp0aSI6IjMxMjFkZmY3LTMwZWYtNGM1NS04N2FjLTkwY2I0Y2U4NGUxZSIsIm5iZiI6MTc3ODM4NTYyMSwicHdkX2F1dGhfdGltZSI6MTc3ODM4NTYyMDY0Nywic2NwIjpbIm9wZW5pZCIsImVtYWlsIiwicHJvZmlsZSIsIm9mZmxpbmVfYWNjZXNzIiwibW9kZWwucmVxdWVzdCIsIm1vZGVsLnJlYWQiLCJvcmdhbml6YXRpb24ucmVhZCIsIm9yZ2FuaXphdGlvbi53cml0ZSJdLCJzZXNzaW9uX2lkIjoiYXV0aHNlc3NfM0JKNXpSa25HMVYyVUozam9UQmVpeEdxIiwic2wiOnRydWUsInN1YiI6Imdvb2dsZS1vYXV0aDJ8MTA5OTk5NDcxNjI2MzU2MDkyODc4In0.Ef66CXkM6HJ2FRPrPda7DVyvbKuXITO5ZPqIodA_itpVRzF-0Q-Z5Vs_hG6F4cIz2ABuFWwBoero4afsEU9ncU_YcFbbAKAk2cB2YN-UgrJo1hxcIsgy1UJj0oefKlCBJegaPun8ItjKTE4Titctn4yCZ0OW_Impb255R_EYvmZEoRO42Q2gRH4htQ84PPP-z-GSg5KHwuH7wFZltNewo5_iX8OiYDxIhnRuPQJUNvV8JXFxImoJSnfdcNzwWMj6TCeb0-oprPssUTqS7vV15CKSj-ZRf4m-C3eAqvoHd0dHOp6Yx_0w8oTHTtqSFz5Bf76DQRxYze0eq_R5Da1cOrSkA2ZxgFyLkJUIcTTCvkhfvmvyAbl8KM5pvh4Iixv7D9soAlPPwEGyUCppkdyrcPlBC-er0tZc0oeh1FpWAUUjJR7but6pngXYj_vLfto1u247AW8sT0vw2UU855UtIPLDCzashwwyKoCbjH40D279dt_hE4m0J8qE-SdKtmyqJBKKq3t-A5h86GfF75xwIpLtgTv_i4vI3FUxOADND_6x9c8M38aNSX7-f28RGvus7vvR4E-lhbdiC4sVRijCV8xpxulxsmoZ955yTbQp0aN2BBGBuPC2O4j-gIRGO1RBbob8AXRiSlMr9wNKPS7HQqAjt4ATAaD9Ka_cjnt5MXE';

    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"nome exato e completo do jogo/produto (ex: The Legend of Zelda: Breath of the Wild)","console":"PS5|PS4|Nintendo Switch|Nintendo 3DS|Retrô|Pokémon TCG|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço inteiro em reais baseado no mercado brasileiro atual,"descricao":"descrição ESPECÍFICA e persuasiva: mencione o nome do jogo, gênero exato, destaques únicos do título e estado de conservação. Máx 150 chars. NUNCA use frases genéricas como 'ideal para fãs' ou 'aventuras e desafios'.","hashtags":"10 hashtags específicos do jogo+console separados por espaço"}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    try {
      console.log('Tentando Chat2API (ChatGPT Plus)...');
      const resp = await fetch(CHAT2API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`
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
          console.log('Sucesso via Chat2API!');
          return res.status(200).json(parsed);
        }
      } else {
        const errText = await resp.text();
        console.error('Chat2API Erro:', resp.status, errText);
      }
    } catch (e) {
      console.error('Chat2API falha na conexão:', e.message);
    }

    // ── FALLBACK: GEMINI FLASH (Grátis) ──
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log('Tentando Gemini Fallback...');
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
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return res.status(200).json(parsed);
      } catch (e) {
        console.error('Gemini falhou:', e.message);
      }
    }

    return res.status(500).json({ error: 'Todos os provedores de IA falharam.' });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
