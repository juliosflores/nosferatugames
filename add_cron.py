import subprocess

script = """
echo 96979032 | sudo -S sed -i 's/^always_loaded: false$/always_loaded: false\\ncron: "0 8 * * *"/g' /root/.hermes/skills/nosferatu/nosferatu-relatorio-diario/SKILL.md
echo 96979032 | sudo -S systemctl restart hermes-gateway
echo "Restarted Hermes."
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode("utf-8", "ignore"))
print("STDERR:", result.stderr.decode("utf-8", "ignore"))
