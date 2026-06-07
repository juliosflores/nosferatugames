// api/webhook-pedido.js
// Notifica o dono (WhatsApp) quando um pedido novo é criado no site (status pendente),
// ANTES da confirmação de pagamento. Reaproveita a ponte VPS notify do mp-webhook.
export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const VPS_NOTIFY_URL    = process.env.VPS_NOTIFY_URL;
  const VPS_NOTIFY_SECRET = process.env.VPS_NOTIFY_SECRET;

  try {
    const pedido = req.body?.pedido || req.body || {};
    if (!pedido || (!pedido.id && !pedido.nome)) {
      return res.status(400).json({ ok: false, error: 'Pedido inválido' });
    }

    const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itens = Array.isArray(pedido.itens) && pedido.itens.length
      ? pedido.itens.map(i => `• ${i.nome} — ${fmt(i.preco)}`).join('\n')
      : '• (itens não informados)';

    const mensagem =
      `🛒 *NOVO PEDIDO NO SITE!*\n\n` +
      `${itens}\n\n` +
      `📦 Entrega: ${pedido.metodo_envio || '—'}\n` +
      `📍 Endereço: ${pedido.endereco || '—'}${pedido.numero ? ', ' + pedido.numero : ''}\n` +
      `👤 Nome: ${pedido.nome || '—'}\n` +
      `📱 WhatsApp: ${pedido.whatsapp || '—'}\n` +
      (pedido.cupon_codigo ? `🏷 Cupom: ${pedido.cupon_codigo} (-${fmt(pedido.desconto_aplicado)})\n` : '') +
      `\n💰 *Total: ${fmt(pedido.total)}*\n` +
      `🆔 Pedido: ${pedido.id || '—'}\n` +
      `⏳ Status: ${pedido.status || 'pendente'} (aguardando pagamento)`;

    // Sem VPS configurado: não falha o checkout, só registra.
    if (!VPS_NOTIFY_URL || !VPS_NOTIFY_SECRET) {
      console.warn('[webhook-pedido] VPS_NOTIFY_URL/SECRET não configurado — notificação ignorada.');
      return res.status(200).json({ ok: true, notificado: false, motivo: 'vps_nao_configurado' });
    }

    const r = await fetch(VPS_NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Secret': VPS_NOTIFY_SECRET },
      body: JSON.stringify({ mensagem }),
    });

    if (!r.ok) {
      console.error('[webhook-pedido] VPS notify retornou', r.status, await r.text().catch(() => ''));
      return res.status(200).json({ ok: false, notificado: false, status: r.status });
    }

    return res.status(200).json({ ok: true, notificado: true });
  } catch (err) {
    console.error('[webhook-pedido] Erro:', err.message);
    // Nunca quebra o fluxo de checkout do cliente.
    return res.status(200).json({ ok: false, error: err.message });
  }
}
