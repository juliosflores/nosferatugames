import subprocess

script = """
echo 96979032 | sudo -S sed -i 's|/home/juliosflores/nosferatu-docker/.env|/opt/nosferatu/.env|g' /opt/nosferatu/pi_monitor.py
echo 96979032 | sudo -S systemctl restart pi-monitor
echo 96979032 | sudo -S journalctl -u pi-monitor -n 10 --no-pager
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "bash", "-s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode())
print("STDERR:", result.stderr.decode())
