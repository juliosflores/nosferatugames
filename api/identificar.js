// ============================================================
// api/identificar.js — Nosferatu Games
// Identifica produtos por foto via GPT-4o + Gemini (fallback)
//
// VARIÁVEIS NO VERCEL (Settings > Environment Variables):
//   CHAT2API_AUTHORIZATION = nosferatu_chat2api_key
//   GEMINI_API_KEY         = sua_chave_gemini
// ============================================================

const CHAT2API_URL = 'https://hermes.nosferatugames.com.br/chat2api/v1/chat/completions';
const CHAT2API_KEY = process.env.CHAT2API_AUTHORIZATION || '';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || '';
const TIMEOUT_MS   = 25000;

const PROMPT = `Você é um avaliador expert de games usados para a loja Nosferatu Games, Porto Alegre/RS.
Analise a foto e responda APENAS com JSON válido, sem markdown, sem explicações.

Formato exato:
{"nome":"título exato","console":"PS5|PS4|Switch|3DS|Retrô|Pokémon|Acessórios","condicao":"Novo|Seminovo|Usado","preco":0,"descricao":"...","hashtags":"#tag1 #tag2"}

Regras:
- nome: título exato do jogo ou modelo do acessório/console.
- console: APENAS um dos valores do enum acima.
- condicao: Novo=lacrado, Seminovo=conservado sem arranhões, Usado=marcas visíveis.
- preco: valor de VENDA em reais, mercado BR 2025. Referência: PS5 R$3000-3100, PS4 Slim R$1100-1200, Switch OLED R$1700-1800, Switch R$1350-1400, Switch Lite R$900-1000.
- descricao: 1-2 frases para anúncio. Mencione conservação se Seminovo/Usado.
- hashtags: 6-8 hashtags separadas por espaço.`;

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('JSON não encontrado na resposta');
  const parsed = JSON.parse(match[0]);
  if (!parsed.nome || !parsed.console || parsed.preco === undefined)
    throw new Error('Campos obrigatórios ausentes');
  return parsed;
}

async function tryChat2API(image_base64, media_type) {
  if (!CHAT2API_KEY) throw new Error('CHAT2API_AUTHORIZATION não configurado no Vercel');
  const resp = await fetchWithTimeout(CHAT2API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CHAT2API_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: `data:${media_type || 'image/jpeg'};base64,${image_base64}` } },
      ]}],
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text().catch(()=>'')).slice(0,150)}`);
  const data = await resp.json();
  return extractJSON(data.choices?.[0]?.message?.content || '');
}

async function tryGemini(image_base64, media_type) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY não configurado');
  const resp = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: media_type || 'image/jpeg', data: image_base64 } },
          { text: PROMPT },
        ]}],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${(await resp.text().catch(()=>'')).slice(0,150)}`);
  const data = await resp.json();
  return extractJSON(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const { image_base64, media_type } = req.body || {};
  if (!image_base64) return res.status(400).json({ error: 'image_base64 required' });
  if (image_base64.length > 50_000_000) return res.status(413).json({ error: 'Imagem muito grande.' });

  const errors = [];

  try {
    const result = await tryChat2API(image_base64, media_type);
    console.log('[identificar] ✅ GPT-4o');
    return res.status(200).json({ ...result, _engine: 'gpt4o' });
  } catch (e) {
    console.error('[identificar] ❌ Chat2API:', e.message);
    errors.push(`Chat2API: ${e.message}`);
  }

  try {
    const result = await tryGemini(image_base64, media_type);
    console.log('[identificar] ✅ Gemini (fallback)');
    return res.status(200).json({ ...result, _engine: 'gemini' });
  } catch (e) {
    console.error('[identificar] ❌ Gemini:', e.message);
    errors.push(`Gemini: ${e.message}`);
  }

  return res.status(500).json({ error: 'Falha na identificação. Tente novamente.', details: errors });
}
