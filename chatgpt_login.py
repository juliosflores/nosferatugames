#!/usr/bin/env python3
"""
chatgpt_login.py — Nosferatu Games
========================================
Faz login no ChatGPT via OAuth, extrai o RefreshToken
e registra automaticamente no Chat2API.

O RefreshToken NÃO expira (só muda se trocar senha ou
fazer logout em todos os dispositivos).
Com ele no Chat2API + SCHEDULED_REFRESH=true, o sistema
funciona indefinidamente sem intervenção.

USO:
  python3 chatgpt_login.py

INSTALAR DEPENDÊNCIAS:
  pip3 install requests --break-system-packages
"""

import requests
import json
import os
import sys
import re
from urllib.parse import urlparse, parse_qs

# ── Configuração ──────────────────────────────────────────────
CHAT2API_BASE     = 'http://localhost:5007'
CHAT2API_AUTH_KEY = os.environ.get('CHAT2API_AUTH_KEY', 'nosferatu_chat2api_key')
TOKEN_FILE        = '/opt/nosferatu/token.txt'

# ─────────────────────────────────────────────────────────────

def print_step(msg):
    print(f"\n{'─'*50}\n▶ {msg}\n{'─'*50}")

def get_credentials():
    print("\n🎮 Nosferatu Games — Login ChatGPT\n")
    email = input("📧 E-mail do ChatGPT Plus: ").strip()
    password = input("🔑 Senha: ").strip()
    if not email or not password:
        print("❌ E-mail e senha são obrigatórios.")
        sys.exit(1)
    return email, password

def login_chatgpt(email, password):
    """
    Fluxo OAuth do ChatGPT para obter RefreshToken.
    Baseado no fluxo auth0 que o ChatGPT usa.
    """
    print_step("Iniciando login no ChatGPT...")

    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })

    # Passo 1: Obter URL de autorização
    print("  [1/5] Obtendo URL de autorização...")
    try:
        r = session.get(
            'https://auth0.openai.com/authorize',
            params={
                'client_id': 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
                'audience': 'https://api.openai.com/v1',
                'redirect_uri': 'com.openai.chat://auth0.openai.com/ios/com.openai.chat/callback',
                'scope': 'openid email profile offline_access model.request model.read organization.read organization.write',
                'response_type': 'code',
                'code_challenge_method': 'S256',
                'code_challenge': 'w6n3Ix420Xhhu-Q5-mOOEyuPZmAsJHUbBpO8Ub7xBCY',
                'prompt': 'login',
            },
            allow_redirects=True,
            timeout=15,
        )
    except Exception as e:
        print(f"  ❌ Erro ao conectar com auth0: {e}")
        return None

    # Passo 2: Enviar e-mail
    print("  [2/5] Enviando e-mail...")
    state_match = re.search(r'state=([^&"]+)', r.text)
    if not state_match:
        # Tenta extrair do URL final após redirect
        state_match = re.search(r'state=([^&"]+)', r.url)
    
    if not state_match:
        print("  ❌ Não foi possível extrair o state. O IP pode estar bloqueado.")
        print("  💡 Tente usar uma VPN ou acesse manualmente.")
        return None

    state = state_match.group(1)

    try:
        r = session.post(
            f'https://auth0.openai.com/u/login/identifier?state={state}',
            data={
                'state': state,
                'username': email,
                'js-available': 'true',
                'webauthn-available': 'true',
                'is-brave': 'false',
                'webauthn-platform-available': 'false',
                'action': 'default',
            },
            allow_redirects=True,
            timeout=15,
        )
    except Exception as e:
        print(f"  ❌ Erro ao enviar e-mail: {e}")
        return None

    # Passo 3: Enviar senha
    print("  [3/5] Enviando senha...")
    state_match = re.search(r'state=([^&"]+)', r.url)
    if state_match:
        state = state_match.group(1)

    try:
        r = session.post(
            f'https://auth0.openai.com/u/login/password?state={state}',
            data={
                'state': state,
                'username': email,
                'password': password,
                'action': 'default',
            },
            allow_redirects=False,
            timeout=15,
        )
    except Exception as e:
        print(f"  ❌ Erro ao enviar senha: {e}")
        return None

    # Passo 4: Capturar código de autorização no redirect
    print("  [4/5] Capturando código de autorização...")
    redirect_url = r.headers.get('Location', '')
    
    if not redirect_url:
        # Segue redirect manualmente
        for _ in range(5):
            if r.status_code in (301, 302, 303):
                redirect_url = r.headers.get('Location', '')
                if 'callback' in redirect_url and 'code=' in redirect_url:
                    break
                r = session.get(redirect_url, allow_redirects=False, timeout=15)
            else:
                break

    code_match = re.search(r'code=([^&]+)', redirect_url)
    if not code_match:
        print("  ❌ Login falhou. Verifique e-mail e senha.")
        print(f"  URL: {redirect_url[:200]}")
        return None

    code = code_match.group(1)

    # Passo 5: Trocar código por RefreshToken
    print("  [5/5] Obtendo RefreshToken...")
    try:
        r = session.post(
            'https://auth0.openai.com/oauth/token',
            json={
                'redirect_uri': 'com.openai.chat://auth0.openai.com/ios/com.openai.chat/callback',
                'grant_type': 'authorization_code',
                'client_id': 'pdlLIX2Y72MIl2rhLhTE9VV9bN905kBh',
                'code': code,
                'code_verifier': 'yGrXROHx_VazA0uovsxKfE263LMFcrSrdm4SlC-rob8',
            },
            timeout=15,
        )
        data = r.json()
    except Exception as e:
        print(f"  ❌ Erro ao obter token: {e}")
        return None

    refresh_token = data.get('refresh_token')
    access_token  = data.get('access_token')

    if not refresh_token:
        print(f"  ❌ RefreshToken não retornado. Resposta: {json.dumps(data, indent=2)[:300]}")
        return None

    print(f"\n  ✅ Login bem-sucedido!")
    print(f"  RefreshToken: {refresh_token[:30]}...{refresh_token[-10:]}")

    return {
        'refresh_token': refresh_token,
        'access_token': access_token,
    }

def register_token_in_chat2api(refresh_token):
    """
    Registra o RefreshToken no painel de tokens do Chat2API.
    O Chat2API vai gerenciar a renovação do AccessToken automaticamente.
    """
    print_step("Registrando token no Chat2API...")

    try:
        # Limpa tokens antigos
        r = requests.post(
            f'{CHAT2API_BASE}/tokens',
            headers={
                'Authorization': f'Bearer {CHAT2API_AUTH_KEY}',
                'Content-Type': 'application/json',
            },
            json={'token_list': [refresh_token]},
            timeout=10,
        )
        if r.status_code in (200, 201):
            print("  ✅ Token registrado no Chat2API com sucesso!")
            return True
        else:
            print(f"  ⚠️  Status {r.status_code}: {r.text[:200]}")
            # Tenta endpoint alternativo
            r2 = requests.post(
                f'{CHAT2API_BASE}/v1/tokens/upload',
                headers={'Authorization': f'Bearer {CHAT2API_AUTH_KEY}'},
                json={'tokens': [refresh_token]},
                timeout=10,
            )
            if r2.status_code in (200, 201):
                print("  ✅ Token registrado (endpoint alternativo)!")
                return True
    except Exception as e:
        print(f"  ❌ Erro ao conectar com Chat2API: {e}")
        print(f"  💡 Verifique se o Chat2API está rodando: docker ps | grep chat2api")

    return False

def save_token_file(tokens):
    """Salva AccessToken no token.txt como backup."""
    os.makedirs(os.path.dirname(TOKEN_FILE), exist_ok=True)
    with open(TOKEN_FILE, 'w') as f:
        f.write(tokens['access_token'])
    print(f"  ✅ AccessToken salvo em {TOKEN_FILE}")

def test_chat2api():
    """Testa se o Chat2API está funcionando com o token registrado."""
    print_step("Testando Chat2API...")
    try:
        r = requests.post(
            f'{CHAT2API_BASE}/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {CHAT2API_AUTH_KEY}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'gpt-4o',
                'messages': [{'role': 'user', 'content': 'Say "OK" only.'}],
            },
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            reply = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            print(f"  ✅ Chat2API funcionando! Resposta: {reply}")
            return True
        else:
            print(f"  ⚠️  Status {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"  ❌ Erro no teste: {e}")
    return False

def main():
    email, password = get_credentials()

    tokens = login_chatgpt(email, password)
    if not tokens:
        print("\n❌ Login falhou. Não foi possível obter o RefreshToken.")
        print("\n📋 Alternativa manual:")
        print("  1. Acesse: https://chatgpt.com/api/auth/session")
        print("  2. Copie o valor de 'accessToken'")
        print(f"  3. Cole em: {TOKEN_FILE}")
        sys.exit(1)

    # Registra no Chat2API
    ok = register_token_in_chat2api(tokens['refresh_token'])

    # Salva AccessToken como backup
    if tokens.get('access_token'):
        save_token_file(tokens)

    # Testa
    test_chat2api()

    print("\n" + "="*50)
    if ok:
        print("🎮 PRONTO! Sistema configurado com sucesso.")
        print("   O Chat2API vai renovar o token automaticamente.")
        print("   Você não precisa fazer isso de novo (a menos que")
        print("   troque a senha do ChatGPT).")
    else:
        print("⚠️  Token salvo mas registro no Chat2API falhou.")
        print(f"   Acesse manualmente: {CHAT2API_BASE}/tokens")
        print(f"   Cole o RefreshToken: {tokens['refresh_token'][:40]}...")
    print("="*50 + "\n")

if __name__ == '__main__':
    main()
