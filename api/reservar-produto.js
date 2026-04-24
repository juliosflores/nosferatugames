// api/reservar-produto.js
// Marca produto como reservado por 15 minutos
// Se outro cliente tentar, recebe aviso

const reservas = new Map(); // produtoId -> { expira, sessionId }

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_URL || 'https://nosferatugames.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { produtoId, sessionId, acao } = req.body || {};
  if (!produtoId || !sessionId) return res.status(400).json({ ok: false, erro: 'Dados inválidos.' });

  const agora = Date.now();

  // Limpar reservas expiradas
  for (const [id, r] of reservas.entries()) {
    if (r.expira < agora) reservas.delete(id);
  }

  // Liberar reserva (cliente fechou checkout)
  if (acao === 'liberar') {
    const r = reservas.get(produtoId);
    if (r && r.sessionId === sessionId) reservas.delete(produtoId);
    return res.status(200).json({ ok: true });
  }

  // Verificar/criar reserva
  const reservaExistente = reservas.get(produtoId);
  if (reservaExistente && reservaExistente.sessionId !== sessionId) {
    const minutosRestantes = Math.ceil((reservaExistente.expira - agora) / 60000);
    return res.status(409).json({
      ok: false,
      reservado: true,
      mensagem: `Este produto está reservado por outro cliente. Tente em ${minutosRestantes} min.`
    });
  }

  // Criar/renovar reserva por 15 minutos
  reservas.set(produtoId, {
    sessionId,
    expira: agora + 15 * 60 * 1000
  });

  return res.status(200).json({ ok: true, expira: agora + 15 * 60 * 1000 });
}
