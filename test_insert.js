const SUPA_URL = 'https://jcnncmfbodglvoyytgok.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjbm5jbWZib2RnbHZveXl0Z29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTg0NDgsImV4cCI6MjA5MTE5NDQ0OH0.YpStoaxT86MQY06KiKVhUXdlcF-CVsu4DOFuUTLv4u0';

async function run() {
  const pedidoPayload = {
    nome: "Teste Antigravity",
    whatsapp: "51999999999",
    cpf: "00000000000",
    cep: "90000000",
    endereco: "Rua de Teste",
    numero: "123",
    metodo_envio: "PAC",
    frete: 0,
    subtotal: 10,
    total: 10,
    itens: [{"id": "1", "nome": "Produto Teste", "preco": 10, "qtd": 1}],
    status: "pendente"
  };

  const r = await fetch(`${SUPA_URL}/rest/v1/pedidos`, {
    method: 'POST',
    headers: { apikey: SUPA_ANON, Authorization: `Bearer ${SUPA_ANON}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(pedidoPayload)
  });
  const data = await r.json();
  console.log("Pedido Criado:", data[0]?.id);
}
run();
