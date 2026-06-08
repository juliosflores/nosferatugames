import subprocess

script = """
echo 96979032 | sudo -S curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer Xi9f0bXa13x5FnqUAV3k7tDiLxdSyNA8MLbxXRbSB3Y" -d '{"name": "Relatório Diário", "prompt": "Execute a skill nosferatu-relatorio-diario para enviar o relatorio de vendas pro dono.", "schedule": "0 8 * * *"}' http://localhost:9119/api/cron/jobs
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
with open("C:\\Users\\Jrjul\\nosferatu-inspect\\post_result.txt", "wb") as f:
    f.write(result.stdout)
