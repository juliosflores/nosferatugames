export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image_base64, media_type } = req.body;
    if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });

    const AURORA_URL = 'https://hermes.nosferatugames.com.br/aurora/v1/chat/completions';
    const SESSION_TOKEN = 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..aJMIGbTpdgzbk8xM.HLkc48qgkhLG1TmpnPK0-FO07Q9Ovv2JA6bkIFQHM1bHjZXesOQwQw9koSuh1Yymjvo6SzMb5QpfDLdgJtHH9Q-KtIDzvHkJ6C0mDbBb1znnBgTUqYFqtkLW8iXoVV6VYrPn78pgDgoY0m1byYtTQpAfjo9eRACb0fYXfKxQ8NRa-sfqmRyn2fEAvid5Z2IsD2hElA5iWuk-xx4kdkDgPyKO57BrjXqzZKpVGEJ8-Rg3LvHz6Mr_NEbql0oL3wHX-Ej1L_4rfbsX77vGFc_eBjUibubiMmdwO_AC_4stbGK5JXyt7fK_j-JtNmKb2v0M4ZeSeQ-bIjXRCsUlDayW3cF1Cvu4-lHz-DszyqXlh8DVqWs_b6yR5pbMagMVBOhSEA3UQRI6ivX_mA-_-vuHqMcznwODOj8TvqNdKLXErOzsxjpo5ywPfu45ejd8SN4dGZgxjB2TSG8UD2_rWTNeZFQDfW6Q3Xb3otbuYzCRLOmiPX058tiugXx-64Gm40lyF7etQMuH-2I9o1LZEz0m8263vC_AsqU5yV916PCrAn33HFUgKX4eioz3X2LiRLFgHg5ni2hKUcjoILQ2iNL4IjbdNcy-cll_bl8eUeDxNGPj_7cYVFPWdKrGVEha5MjyPWYamKd3pbTM2HIMxj5YujpRVWr591sM9c5e4E66GoAagHmSZ2nhY-YVpQbQwqo4LXvQHfvhKorhXpw7N6gV4Vuj5QTidJefQLJ3f6spWEYKm1h8QXeDHkMnxNAuIBYEh9PnKpjgI_9Ej2xCshbHvorITEdPiAHWS_HshSo6SFeoSV_j5uCnhiMjLzD2SvR3eqGzJ-xrWuZrpI6hut89OK2LhZbT-a1_xQobxhZizvpRlDoXf8U9pdQW8bcMe8Hvi-X-lygI8VPBjlsiPFDMQp2EmPU8j9ZT1IwJwbFK9_6Og9bIB25mVSXxJAsPNEbsCvaFym_3axNZAsJX48HWtYmKbWn7fLV9gwBlXmGpsHrTFod6MJvXgaBYlxQQuzDt4hc7jGAt2a44yosVOmQDTzp444e6GBEgvkvOV_vySQ8yKB2k0nN7qGGUcf0GDTPYJ0G44FXMCsyCB4HMhqAYfviFVBIqCuMcRM_qLVlN6m9CO6N_w4bCKu3beetssGAxJAhddW2OeiTAWkI7LE6eqJsg9np4vZF5OUROCAHIOZ-f8fIbpbbgCb3KUWucUtUZWDhhvYrdp0HFisd0Kc1Msu4hUg-8PDm9Xe4liSQ09HSrbsLSKw5oRbsX7S0F9wxNKeSzaf7LoYzgTRWoxL0fStB142qflUmBt2tH38u5TgP7alQ2FHow15iie3DYa20MdawqeY27I8bu1cLbA7GM-EeKQPdMRZ8FXLLpI1UdLrr1WeP4BlOGjr9kIfNksyUbgODt6Y6uVkGnelohP44D1EhWiWxAc5ola7-exPe3pDffR4UL2b1MAODNBDtm_rcPuZFwHwKtK2QJpN6Dyk-Jzr5gf_7aTueafBYfbELRR93JVaFNcEHi1K6pmTtx7YxZ__Mbo0XvagUwk0RecFEHwwvXlXUffnget-R6iwC9a2sllCMuxy6jNuQPdWtc9nHLFWc1Z-AaXbchmVIWJTTeQZiBQ7Zhuk_Odde9Ee_3Lp3C0VGYDaEH3hi5usLvle1AXgJSwbcWle71D6imOrMPOvS84307JDEUYnaPU9fbi54Oe78BgeQVYCQFCfVArUQEXJCJCdBnPkOX7JCpnx9Tcl176jaBuyDKL_ONTWA61F0wEjhCSyH0brNBLL1QLOcqXL5Qk4s0m1pi-ndcJSSt929PDuHfzoih538EV0-Zc9DqxgJpwOacDk9Li23vWrGyVne23eXSzCGptxVfNvCLCQ0wkhv8-5ialLpLlpVHBWtrykrfFB43StHNbiwt1FMKmpyibkOqC-OYkDy8hd9McWfX5XuPECf1tLR0I-ZiHVlijcyjaHMg8X1EwMrTGe6fV8djExamedaIX3QLHyM7zNxXFzpMMxKveWxG2sOyQ_OhE8ucbC09LybgbfEz0kobXWk4DVASuAI5oyQKkfkc5ERV-DDSWWEAyMU2Bh_VrzWyFQHH1eVkEi7Hit7ncGFCPzyLcmAdbWOGbhLT6qFmqx-59t6Nkjjaty5HrjOf44vurqNcJbDdfhogHuLWZK3XWFvuL42Zuh-sb5yRL0weXF44WfFf06kJo-MGCG7io5puSvraGQNfX5nVnfGeQ85BZjiA191GD4LchiViN9-8oinD2dj4SJ-sMfUrf-QEDrdbLrQWooMk5eSkA4mfd9VOq7jGY-voVj5Ae142sMbldXymqo8e46RQDKpz5K-Qwjx3MBeJu21ScoSp7QbX9gYSLFAZUOMyPWiC2ii7Ptk030uqDPCI54z4o8bTCMMR94fkRVxJl1FnfKXxescLBlZwbE6VHvbWLsBHdLkLMHF8WHugfF108gDgxqSQn707j126bSLYaKURdMnzX2nq8esm8PrfJkjKcAog0Kild5_Goen8Zpjumkhbw_PN112xdSepLlMyEKd-T3tifPnXsTY9n51HYX4BAqxUK8mDTsjrv0k_vigFK9iXvaQkUN_lousl0j4vRV-t81esmPeyLEn3uxHhpB8qktkHghpHWpqGi4aKPHi7C4bark3lvrr7ouIDlMCVxOZcMj310iy7HJrmOwwVuHeWtQrtPXZbT mndnNcQ4KIg_xKAXGaqY2D3NdFgkEP_435q6Zh7Kx8VhKeILdX0XBvMmBGTUBmP8LCoXZrbMvS24D6gjTX1oD-ih4gQWdlmzKnyh8ymmbTWjBzYpBfPdwKEWvgf8Z6iSSqKuRVZxKgW9FhY9d7ywBIUqq61JdbDobouqQJMMLvS8zQhajlrNBRG3q3V8bjad7AK08saI0zug3c5wRY7Ce5VtDy4vO912xGYyXviRkaEqvhTvezVdWkdFf_ysCT-3FfiZQUkQEml2MjMOE_R4V0BrH8TEkjw2ByvHsN1mxBX1U9qprLvEj0ajgx3SX7ccqkaqXrfIn3sNn-AWk9LMoqSxHC5wiDu1F13HfEd4KbGkxHWetSXw_-gT6yfFxQChF-S7ejBmaUGoB25YCI-yqUpRrsyioKUx1nZ45IwizWY0ZQpZsFhxnQAqGV9d010-N6a92oBfsfGzmjc9BrMxzwneqxG6kVkPecpjz0eqDk5e9Wxx42weUvc03f_dL0voFalfzak5VttPsrRmd8ng0W9T4OFHuVVPy9xm6wLWlZ2URBVrzwnH1XRBRwJxxP1qMYJVq1N35NTv4DS3RY3E7ncG5w_OEQ-nBLU15KE7TNNkEGNElciRFmzTYhYPuoF-jyvoZ84fTdEFx3WKY8zXEKaZNbNGB9eDeYfth61av5t-v7tjHxoykBgHeZqjeR2QnjvXJJjISalWiLnZaomiv8Zee6IzVAVR_HESD94V0QRbdt-Jp7BtFOslqSVZFgVvd5Gd4f0AiWMKihy1k0IkYY0OwGy3SrYAbk-fmDLFao9P8FfMh3A9SAPUrtdtpCJXablGurd8iA1FEhGZmvKXRe3AiaYYl2i87pztlAAMOBxOz8tegf55eQ5Ti_l_bBiBVvGwC59pbizoTiT_ja50CJ4MP_nj6ijFbEm63z2ItHk0_-rAgqQGIpR_VAKvZ3kn7bcBm_7nuC0cyyPc9Wig0QuQtqREtXlz4uBsyy95SS_j4CYfvltnIVyyWpJ-ht2J7jp71oCQpmtFpYnZf2qNJNLNzzkMvTnEJ9Ldu-McqMoMG7d18smsCQxf_5XKFG7drIPQNna02kzjlYtQykdFCQ7SQoQqFM7AFpijgKMSwp1HQ5_ZLJvMCCFxU_dVZM6eQnbuw2OtsdclL2MGsej0wtat1Lub7-aDoKhq5dusxsuNa-rgiRVyV-UN7CCIQbd7TZcvHw-ICGrc43GawqLZo-Dl8u2TVo21lx5dgqsi94LheLqutnsuQvcW2Vol7TD2q0F1cDheeoOJXCfjDzzu4D-1Q2WQXFEx_toz3iY8hcoG0aS2clE0LBXJS2lLSIWkruIxFM_EAEzdqgzYCU3lm_YjzxAde7aKppGk-6f6rSYJ6z1WqQI8pg_eWqRJHptDzRgL6pv4O2B4PjqPtfLvjBpm7vsrMyx6I7xg.o4-3t84Cfh-V-Nk0KxahGA';

    const PROMPT = `Você é um vendedor expert em games usados do Brasil. Analise a foto e responda APENAS JSON válido, sem markdown:
{"nome":"nome exato e completo do jogo/produto (ex: The Legend of Zelda: Breath of the Wild)","console":"PS5|PS4|Nintendo Switch|Nintendo 3DS|Retrô|Pokémon TCG|Acessórios","condicao":"Novo|Seminovo|Usado","preco":preço inteiro em reais baseado no mercado brasileiro atual,"descricao":"descrição ESPECÍFICA e persuasiva: mencione o nome do jogo, gênero exato, destaques únicos do título e estado de conservação. Máx 150 chars. NUNCA use frases genéricas como 'ideal para fãs' ou 'aventuras e desafios'.","hashtags":"10 hashtags específicos do jogo+console separados por espaço"}
Regras: identifique o título exato pela capa. Se seminovo/usado mencione conservação. Preço justo de mercado BR.`;

    const imageUrl = `data:${media_type || 'image/jpeg'};base64,${image_base64}`;

    // ── 1. Tentar via Aurora (ChatGPT Plus) ──
    try {
      console.log('Tentando Aurora...');
      const payload = {
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }],
        stream: false // Forçar sem stream para evitar 400
      };

      const resp = await fetch(AURORA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SESSION_TOKEN}`
        },
        body: JSON.stringify(payload),
      });

      const respData = await resp.json();
      
      if (resp.ok && respData.choices) {
        const text = respData.choices[0].message.content;
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return res.status(200).json(parsed);
      } else {
        console.log('Erro Aurora Detalhado:', JSON.stringify(respData));
      }
    } catch (e) {
      console.log('Erro Conexão Aurora:', e.message);
    }

    // ── 2. Fallback Gemini Flash (Grátis) ──
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
        console.log('Gemini failed:', e.message);
      }
    }

    return res.status(500).json({ error: 'Todos os provedores falharam.' });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
