import subprocess

script = """
echo 96979032 | sudo -S grep -R "@cron" /root/.hermes/skills/nosferatu/
echo "=== Dirs ==="
echo 96979032 | sudo -S ls -la /root/.hermes/skills/nosferatu/
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode())
print("STDERR:", result.stderr.decode())
