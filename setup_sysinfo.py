import subprocess

script = """
cat << 'EOF' > /tmp/sysinfo.sh
#!/bin/bash
export LC_ALL=C
CPU=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk '{print 100 - $1}')
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
MEM_PCT=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100.0}')
DISK_TOTAL=$(df -BG / | awk 'NR==2 {print $2}' | tr -d 'G')
DISK_USED=$(df -BG / | awk 'NR==2 {print $3}' | tr -d 'G')
DISK_PCT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

cat << JSON > /opt/nosferatu/marketing/public/sysinfo.json
{
  "cpu_percent": ${CPU:-0},
  "memory_total_mb": ${MEM_TOTAL:-0},
  "memory_mb": ${MEM_USED:-0},
  "memory_percent": ${MEM_PCT:-0},
  "disk_total_gb": ${DISK_TOTAL:-0},
  "disk_used_gb": ${DISK_USED:-0},
  "disk_percent": ${DISK_PCT:-0},
  "updated_at": "$(date --utc +%Y-%m-%dT%H:%M:%SZ)"
}
JSON
EOF

echo 96979032 | sudo -S mv /tmp/sysinfo.sh /opt/nosferatu/sysinfo.sh
echo 96979032 | sudo -S chmod +x /opt/nosferatu/sysinfo.sh
echo 96979032 | sudo -S bash /opt/nosferatu/sysinfo.sh
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode())
print("STDERR:", result.stderr.decode())
