// api/reservar-produto.js
// Lock de checkout: reserva o produto por 15 min para a sessão atual.
// Persistido na tabela reservas_checkout (o Map em memória NÃO sobrevive entre
// invocações serverless). Separado de produtos.reservado* (reserva manual do admin).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const TTL_MS = 15 * 60 * 1000;

function sb(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://nosferatugames.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { produtoId, sessionId, acao } = req.body || {};
  if (!produtoId || !sessionId) return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });

  const agora = Date.now();
  const nowISO = new Date(agora).toISOString();

  try {
    // Limpeza best-effort das reservas expiradas (não bloqueia o fluxo se falhar)
    await sb(`reservas_checkout?expira=lt.${nowISO}`, { method: 'DELETE' }).catch(() => {});

    // Liberar reserva (cliente fechou checkout)
    if (acao === 'liberar') {
      await sb(`reservas_checkout?produto_id=eq.${produtoId}&session_id=eq.${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    }

    // Verificar reserva ativa de OUTRA sessão
    const r = await sb(`reservas_checkout?produto_id=eq.${produtoId}&expira=gt.${nowISO}&select=session_id,expira`);
    if (r.ok) {
      const linhas = await r.json();
      const existente = linhas[0];
      if (existente && existente.session_id !== sessionId) {
        const minutosRestantes = Math.max(1, Math.ceil((new Date(existente.expira).getTime() - agora) / 60000));
        return res.status(409).json({
          ok: false,
          reservado: true,
          mensagem: `Este produto está reservado por outro cliente. Tente em ${minutosRestantes} min.`,
        });
      }
    }

    // Criar/renovar reserva por 15 min (upsert na PK produto_id)
    const expira = new Date(agora + TTL_MS).toISOString();
    const up = await sb('reservas_checkout', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ produto_id: produtoId, session_id: sessionId, expira }),
    });
    if (!up.ok) {
      console.error('[reservar-produto] Falha ao gravar reserva:', up.status, await up.text().catch(() => ''));
      // Não trava o checkout do cliente se a reserva falhar
      return res.status(200).json({ ok: true, persistido: false });
    }

    return res.status(200).json({ ok: true, expira: agora + TTL_MS });
  } catch (e) {
    console.error('[reservar-produto] Erro:', e.message);
    return res.status(200).json({ ok: true, persistido: false });
  }
}
