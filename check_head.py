import subprocess

script = """
echo 96979032 | sudo -S head -n 10 /root/.hermes/skills/nosferatu/nosferatu-relatorio-diario/SKILL.md
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
with open("C:\\Users\\Jrjul\\nosferatu-inspect\\skill_head.txt", "wb") as f:
    f.write(result.stdout)
