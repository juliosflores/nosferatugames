#!/usr/bin/env python3
"""
token_receiver.py — Nosferatu Games
========================================
Servidor HTTP leve que recebe o AccessToken do ChatGPT
enviado pelo admin.html e registra no Chat2API.

O admin.html faz isso automaticamente toda vez que é aberto.

INSTALAR:
  pip3 install flask requests --break-system-packages
  cp token_receiver.py /opt/nosferatu/
  
RODAR COMO SERVIÇO (systemd):
  sudo tee /etc/systemd/system/nosferatu-token.service > /dev/null << EOF
  [Unit]
  Description=Nosferatu Token Receiver
  After=network.target

  [Service]
  ExecStart=/usr/bin/python3 /opt/nosferatu/token_receiver.py
  Restart=always
  RestartSec=5

  [Install]
  WantedBy=multi-user.target
  EOF

  sudo systemctl enable nosferatu-token
  sudo systemctl start nosferatu-token

O Nginx já expõe este serviço em:
  POST https://hermes.nosferatugames.com.br/atualizar-token
"""

from flask import Flask, request, jsonify
import requests
import os
import logging
from datetime import datetime

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

ADMIN_KEY        = os.environ.get('CHAT2API_AUTH_KEY', 'nosferatu_chat2api_key')
CHAT2API_URL     = 'http://localhost:5007'
TOKEN_FILE       = '/opt/nosferatu/token.txt'
WHATSAPP_URL     = 'http://localhost:3000/message/sendText/nosferatu'
OWNER_JID        = '555196979032@s.whatsapp.net'

def registrar_token_chat2api(token):
    """Registra o token no Chat2API via endpoint /tokens."""
    try:
        r = requests.post(
            f'{CHAT2API_URL}/tokens',
            headers={
                'Authorization': f'Bearer {ADMIN_KEY}',
                'Content-Type': 'application/json',
            },
            json={'token_list': [token]},
            timeout=10,
        )
        return r.status_code in (200, 201)
    except Exception as e:
        log.error(f'Erro ao registrar no Chat2API: {e}')
        return False

def salvar_arquivo(token):
    """Salva token no arquivo de backup."""
    try:
        os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
        with open(TOKEN_FILE, 'w') as f:
            f.write(token)
        return True
    except Exception as e:
        log.error(f'Erro ao salvar arquivo: {e}')
        return False

def notificar_whatsapp(msg):
    try:
        requests.post(
            WHATSAPP_URL,
            json={'number': OWNER_JID, 'text': msg},
            timeout=5,
        )
    except:
        pass

@app.route('/atualizar-token', methods=['POST', 'OPTIONS'])
def atualizar_token():
    # OPTIONS agora é tratado pelo Nginx ou de forma simples aqui sem headers duplicados
    if request.method == 'OPTIONS':
        return '', 204

    # Autenticação
    key = request.headers.get('X-Admin-Key', '')
    if key != ADMIN_KEY:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json(silent=True) or {}
    token = data.get('token', '').strip()

    if not token or len(token) < 50:
        return jsonify({'error': 'Token inválido'}), 400

    log.info(f'Token recebido do admin: {token[:20]}...')

    ok_chat2api = registrar_token_chat2api(token)
    ok_arquivo  = salvar_arquivo(token)

    log.info(f'Chat2API: {"✅" if ok_chat2api else "❌"} | Arquivo: {"✅" if ok_arquivo else "❌"}')

    return jsonify({
        'ok': True,
        'chat2api': ok_chat2api,
        'arquivo': ok_arquivo,
        'timestamp': datetime.now().isoformat(),
    })

@app.route('/status-token', methods=['GET'])
def status_token():
    """Verifica se o token atual está funcionando."""
    try:
        r = requests.post(
            f'{CHAT2API_URL}/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {ADMIN_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o',
                'messages': [{'role': 'user', 'content': 'OK?'}],
            },
            timeout=20,
        )
        ok = r.status_code == 200
        resp = jsonify({'ok': ok, 'status': r.status_code})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp
    except Exception as e:
        resp = jsonify({'ok': False, 'error': str(e)})
        resp.headers['Access-Control-Allow-Origin'] = '*'
        return resp

if __name__ == '__main__':
    log.info('🚀 Token Receiver iniciado na porta 5009')
    app.run(host='127.0.0.1', port=5009, debug=False)
