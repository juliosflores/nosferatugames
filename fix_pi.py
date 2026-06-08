import subprocess

script = """
echo 96979032 | sudo -S mkdir -p /opt/nosferatu
echo 96979032 | sudo -S bash -c "cat << 'EOF' > /opt/nosferatu/.env
SUPA_URL=https://jcnncmfbodglvoyytgok.supabase.co
SUPA_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjbm5jbWZib2RnbHZveXl0Z29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MTg0NDgsImV4cCI6MjA5MTE5NDQ0OH0.YpStoaxT86MQY06KiKVhUXdlcF-CVsu4DOFuUTLv4u0
EOF"
echo 96979032 | sudo -S systemctl restart pi-monitor
echo 96979032 | sudo -S journalctl -u pi-monitor -n 5 --no-pager
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "bash", "-s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode())
print("STDERR:", result.stderr.decode())
