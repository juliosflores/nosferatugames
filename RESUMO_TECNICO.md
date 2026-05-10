# Relatório de Integração v2: Nosferatu Games AI 🎮🚀

## O que mudou nesta versão

### Problema resolvido: token manual
O sistema anterior dependia de atualizar `token.txt` manualmente a cada ~7 dias.
Agora o token é gerenciado automaticamente em 3 camadas:

1. **Chat2API com RefreshToken** — você faz login uma vez via `chatgpt_login.py`,
   o RefreshToken fica salvo no Chat2API e ele renova o AccessToken sozinho a cada 4 dias.
2. **token_watcher.py** — monitora a cada 6h. Se o token cair, tenta renovar via restart
   do container. Se falhar, manda alerta no seu WhatsApp.
3. **Gemini Flash** — fallback gratuito sempre ativo. Se o ChatGPT falhar por qualquer
   motivo, o Gemini assume sem o usuário perceber.

---

## 📂 Arquivos

| Arquivo | Onde vai | O que faz |
|---|---|---|
| `identificar.js` | Vercel `/api/` | Endpoint de identificação de produtos |
| `docker-compose.yml` | VPS `/opt/nosferatu/chat2api/` | Sobe o Chat2API |
| `nginx_config.conf` | VPS `/etc/nginx/sites-available/nosferatu` | Proxy reverso |
| `chatgpt_login.py` | VPS `/opt/nosferatu/` | Faz login e registra RefreshToken |
| `token_watcher.py` | VPS `/opt/nosferatu/` | Monitora token e avisa no WhatsApp |

---

## 🚀 Como instalar (ordem correta)

### 1. VPS — Subir o Chat2API
```bash
mkdir -p /opt/nosferatu/chat2api
cd /opt/nosferatu/chat2api
# Copie o docker-compose.yml para esta pasta
docker-compose up -d
docker ps | grep chat2api  # deve aparecer "Up"
```

### 2. VPS — Certificado SSL do hermes (se ainda não tiver)
```bash
certbot --nginx -d hermes.nosferatugames.com.br
```

### 3. VPS — Atualizar Nginx
```bash
cp nginx_config.conf /etc/nginx/sites-available/nosferatu
nginx -t && systemctl reload nginx
```

### 4. VPS — Fazer login e registrar RefreshToken (UMA VEZ SÓ)
```bash
pip3 install requests --break-system-packages
python3 /opt/nosferatu/chatgpt_login.py
# Digite e-mail e senha do ChatGPT quando pedir
```

### 5. VPS — Instalar monitor via cron
```bash
crontab -e
# Adicione esta linha:
0 */6 * * * python3 /opt/nosferatu/token_watcher.py --once >> /var/log/token_watcher.log 2>&1
```

### 6. Vercel — Configurar variáveis de ambiente
Em Settings > Environment Variables, adicione:
```
CHAT2API_AUTHORIZATION = nosferatu_chat2api_key
GEMINI_API_KEY         = sua_chave_gemini
```

### 7. Vercel — Fazer deploy do identificar.js
Substitua `/api/identificar.js` pelo novo arquivo e faça push no GitHub.

---

## 🔄 Fluxo automático de token

```
A cada 6h: token_watcher verifica Chat2API
  ├── OK → não faz nada
  └── FALHOU
       ├── Reinicia container (SCHEDULED_REFRESH renova o token)
       │    ├── OK → WhatsApp: "Token renovado automaticamente"
       │    └── FALHOU → WhatsApp: "Execute chatgpt_login.py na VPS"
       └── (enquanto isso, Gemini assume o fallback)
```

---

## 🔄 Quando precisar renovar manualmente

Só vai acontecer se você trocar a senha do ChatGPT ou fazer logout em todos os dispositivos:

```bash
python3 /opt/nosferatu/chatgpt_login.py
```

---

## ⚙️ Variáveis de ambiente

### Vercel
| Variável | Valor |
|---|---|
| `CHAT2API_AUTHORIZATION` | `nosferatu_chat2api_key` |
| `GEMINI_API_KEY` | sua chave em aistudio.google.com |

### Docker (docker-compose.yml)
| Variável | Valor | Descrição |
|---|---|---|
| `AUTHORIZATION` | `nosferatu_chat2api_key` | Mesma chave do Vercel |
| `SCHEDULED_REFRESH` | `true` | Renova token automaticamente |
| `RETRY_TIMES` | `3` | Tentativas antes de desistir |
| `ENABLE_LIMIT` | `true` | Evita ban por uso excessivo |
| `HISTORY_DISABLED` | `true` | Não salva histórico no ChatGPT |

---

## 🐛 Erros comuns

| Erro | Causa | Solução |
|---|---|---|
| `401` no Chat2API | Token expirado ou inválido | `python3 chatgpt_login.py` |
| `413` no Nginx | `client_max_body_size` não configurado | Verificar nginx_config.conf |
| `502` no Nginx | Container parado | `docker start chat2api` |
| SSL error no hermes | Certificado errado | `certbot --nginx -d hermes.nosferatugames.com.br` |
