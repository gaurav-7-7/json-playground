#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🚀 Installing Docker & Piston on Cloud VM"
echo "=========================================================="

# 1. Update & Install Prerequisites
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg lsb-release iptables-persistent

# 2. Install Docker
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker Engine..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker $USER
fi

# 3. Open OS Firewall Ports
echo "🛡️ Configuring Firewall Ports..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 2000 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT || true
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT || true
sudo netfilter-persistent save || true

# 4. Create Piston Compose Directory
mkdir -p ~/piston && cd ~/piston

cat << 'EOF' > docker-compose.yml
services:
  piston:
    image: ghcr.io/engineer-man/piston:latest
    container_name: piston
    restart: always
    privileged: true
    ports:
      - "2000:2000"
    volumes:
      - piston-packages:/piston/packages
    tmpfs:
      - /tmp:exec

volumes:
  piston-packages:
EOF

echo "📦 Starting Piston Container..."
sudo docker compose down 2>/dev/null || true
sudo docker compose up -d

echo "⏳ Waiting for Piston API to start..."
while ! curl -s "http://localhost:2000/api/v2/runtimes" >/dev/null 2>&1; do
    echo "Waiting for Piston..."
    sleep 2
done

echo "✅ Piston is online! Installing Languages..."
LANGUAGES=(
  '{"language":"python","version":"3.12.0"}'
  '{"language":"node","version":"20.11.1"}'
  '{"language":"typescript","version":"5.0.3"}'
  '{"language":"gcc","version":"10.2.0"}'
  '{"language":"java","version":"15.0.2"}'
  '{"language":"go","version":"1.16.2"}'
)

for pkg in "${LANGUAGES[@]}"; do
  echo "Installing $pkg..."
  curl -s -X POST http://localhost:2000/api/v2/packages \
    -H "Content-Type: application/json" \
    -d "$pkg" >/dev/null 2>&1 || true
done

echo ""
echo "🎉 SUCCESS! All runtimes installed on your Cloud VM:"
curl -s http://localhost:2000/api/v2/runtimes
echo ""
echo "=========================================================="
echo "Your cloud compiler is live at: http://$(curl -s ifconfig.me):2000"
echo "=========================================================="
