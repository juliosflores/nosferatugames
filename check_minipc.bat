@echo off
ssh juliosflores@100.118.113.32 "sshpass -p 96979032 ssh -o StrictHostKeyChecking=accept-new julio-flores@192.168.1.9 'echo 96979032 | sudo -S mkdir -p /opt/nosferatu/marketing/public && echo 96979032 | sudo -S bash -c \"echo {\\\"test\\\":true} > /opt/nosferatu/marketing/public/sysinfo.json\"'"
