#!/bin/bash
set -e

# Detectar qual usuário docker hub está em uso ou fallback
DOCKER_USER="${DOCKER_USER:-cleidsonramos}"
IMG_DRONE="${IMG_DRONE:-$DOCKER_USER/drone_patrulha:latest}"

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m🚁 Cadastro Automático de Drones\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

read -p "IP do Oracle: " IP_ORACLE
read -p "Quantidade de drones: " QTD

if [ -z "$IP_ORACLE" ] || [ -z "$QTD" ]; then
    echo -e "\e[1;31m❌ Todos os campos são obrigatórios.\e[0m"
    exit 1
fi

docker pull "$IMG_DRONE" >/dev/null 2>&1 || true

for i in $(seq 1 "$QTD"); do
    HEX_I=$(printf '%02X' $i)
    MAC_ADDR=$(printf '02:%02X:%02X:%02X:%02X:%s' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) "$HEX_I")
    MAC_TAG=${MAC_ADDR//:/}
    
    echo -e "\e[1;32m-> Subindo Drone $i com MAC: $MAC_ADDR\e[0m"
    docker run -d --restart unless-stopped --name "drone_${MAC_TAG}" \
        -e SERVER_ADDR="${IP_ORACLE}:48082" \
        -e DRONE_MAC="$MAC_ADDR" \
        "$IMG_DRONE" > /dev/null
done

echo -e "\e[1;32m✅ $QTD drones conectados e registrados!\e[0m"
