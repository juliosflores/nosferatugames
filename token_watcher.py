#!/usr/bin/env python3
"""
token_watcher.py — Nosferatu Games
========================================
Monitora o Chat2API a cada 6h.
Se o token cair: tenta renovar automaticamente (restart container).
Se não conseguir renovar: avisa no WhatsApp do Julio.

INSTALAR VIA CRON (mais simples):
  crontab -e
  0 */6 * * * python3 /opt/nosferatu/token_watcher.py --once >> /var/log/token_watcher.log 2>&1
"""

import requests
import subprocess
import sys
import os
import time
import logging

CHAT2API_URL      = 'http://localhost:5007/v1/chat/completions'
CHAT2API_AUTH_KEY = os.environ.get('CHAT2API_AUTH_KEY', 'nosferatu_chat2api_key')
WHATSAPP_URL      = 'http://localhost:3000/message/sendText/nosferatu'
OWNER_JID         = '555196979032@s.whatsapp.net'
CHECK_INTERVAL_S  = 6 * 60 * 60
LOG_FILE          = '/var/log/nosferatu_token.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler(LOG_FILE), logging.StreamHandler()],
)
log = logging.getLogger(__name__)

def test_token():
    try:
        r = requests.post(
            CHAT2API_URL,
            headers={'Authorization': f'Bearer {CHAT2API_AUTH_KEY}', 'Content-Type': 'application/json'},
            json={'model': 'gpt-4o', 'messages': [{'role': 'user', 'content': 'Say OK'}]},
            timeout=20,
        )
        return (True, 'OK') if r.status_code == 200 else (False, f'HTTP {r.status_code}: {r.text[:100]}')
    except Exception as e:
        return False, str(e)

def notify_whatsapp(message):
    try:
        r = requests.post(
            WHATSAPP_URL,
            headers={'Content-Type': 'application/json'},
            json={'number': OWNER_JID, 'text': message},
            timeout=10,
        )
        return r.status_code in (200, 201)
    except Exception as e:
        log.error(f"Erro WhatsApp: {e}")
        return False

def try_auto_renew():
    """Reinicia o container — SCHEDULED_REFRESH=true faz ele renovar na inicialização."""
    log.info("Tentando renovação via restart do container...")
    try:
        result = subprocess.run(['docker', 'restart', 'chat2api'], capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            log.info("Container reiniciado. Aguardando 20s...")
            time.sleep(20)
            ok, _ = test_token()
            if ok:
                log.info("✅ Token renovado com sucesso!")
                return True
    except Exception as e:
        log.error(f"Erro ao reiniciar container: {e}")
    return False

def run_check():
    log.info("Verificando token...")
    ok, msg = test_token()

    if ok:
        log.info("✅ Token OK.")
        return True

    log.warning(f"⚠️  Token inválido: {msg}")

    if try_auto_renew():
        notify_whatsapp("✅ *Julio Flores* — Token renovado automaticamente! Sistema OK.")
        return True

    log.error("❌ Falha na renovação automática. Notificando...")
    notify_whatsapp(
        "🔴 *Julio Flores — Token Expirado*\n\n"
        "Não consegui renovar automaticamente.\n\n"
        "Execute na VPS:\n"
        "`python3 /opt/nosferatu/chatgpt_login.py`\n\n"
        "_(Gemini está ativo como fallback)_"
    )
    return False

def main():
    if '--once' in sys.argv:
        run_check()
    else:
        log.info("🚀 Token Watcher iniciado.")
        notify_whatsapp("🟢 *Julio Flores* — Monitor de token iniciado.")
        while True:
            run_check()
            time.sleep(CHECK_INTERVAL_S)

if __name__ == '__main__':
    main()
