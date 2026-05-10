// ============================================================
// background.js — Nosferatu Token Sync
// Captura token do ChatGPT e envia para VPS automaticamente.
// Roda em background, sem interação do usuário.
// ============================================================

const VPS_URL  = 'https://hermes.nosferatugames.com.br/atualizar-token';
const ADMIN_KEY = 'nosferatu_chat2api_key';
const CHATGPT_SESSION_URL = 'https://chatgpt.com/api/auth/session';

// ── Busca token via /api/auth/session ────────────────────────
async function fetchToken() {
  try {
    const resp = await fetch(CHATGPT_SESSION_URL, {
      credentials: 'include', // envia cookies do chatgpt.com (extensão tem permissão)
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.accessToken || null;
  } catch (e) {
    console.error('[NosferatuSync] Erro ao buscar token:', e.message);
    return null;
  }
}

// ── Envia token para a VPS ────────────────────────────────────
async function sendToVPS(token) {
  try {
    const resp = await fetch(VPS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY,
      },
      body: JSON.stringify({ token }),
    });
    return resp.ok;
  } catch (e) {
    console.error('[NosferatuSync] Erro ao enviar para VPS:', e.message);
    return false;
  }
}

// ── Sincronização principal ───────────────────────────────────
async function sincronizar() {
  console.log('[NosferatuSync] Verificando token...');

  const token = await fetchToken();

  if (!token) {
    console.log('[NosferatuSync] Token não encontrado (ChatGPT não logado?)');
    await chrome.storage.local.set({
      last_status: 'not_logged',
      last_check: new Date().toISOString(),
    });
    return;
  }

  // Verifica se token mudou desde a última sincronização
  const { last_token } = await chrome.storage.local.get('last_token');
  if (last_token === token) {
    console.log('[NosferatuSync] Token igual ao anterior, pulando envio.');
    await chrome.storage.local.set({ last_check: new Date().toISOString() });
    return;
  }

  // Token novo — envia para VPS
  console.log('[NosferatuSync] Token novo detectado, enviando para VPS...');
  const ok = await sendToVPS(token);

  await chrome.storage.local.set({
    last_token:  token,
    last_status: ok ? 'ok' : 'error',
    last_sync:   new Date().toISOString(),
    last_check:  new Date().toISOString(),
  });

  console.log(`[NosferatuSync] Envio: ${ok ? '✅ OK' : '❌ Falhou'}`);
}

// ── Alarme: roda a cada 6 horas ──────────────────────────────
chrome.alarms.create('sincronizar', {
  delayInMinutes: 1,        // primeira vez: 1 min após instalar
  periodInMinutes: 360,     // depois: a cada 6 horas
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sincronizar') sincronizar();
});

// ── Dispara ao iniciar o browser ─────────────────────────────
chrome.runtime.onStartup.addListener(() => {
  sincronizar();
});

// ── Dispara quando extensão é instalada/atualizada ───────────
chrome.runtime.onInstalled.addListener(() => {
  sincronizar();
});

// ── Listener de mensagens do popup ───────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'sincronizar') {
    sincronizar().then(() => sendResponse({ ok: true }));
    return true; // mantém canal aberto para resposta async
  }
});
