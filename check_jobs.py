import subprocess

script = """
echo 96979032 | sudo -S curl -s -H "Authorization: Bearer Xi9f0bXa13x5FnqUAV3k7tDiLxdSyNA8MLbxXRbSB3Y" http://localhost:9119/api/cron/jobs
"""

ssh_cmd = [
    "ssh", "juliosflores@100.118.113.32",
    "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 bash -s"
]

result = subprocess.run(ssh_cmd, input=script.encode(), capture_output=True)
print("STDOUT:", result.stdout.decode("utf-8", "ignore"))
print("STDERR:", result.stderr.decode("utf-8", "ignore"))
