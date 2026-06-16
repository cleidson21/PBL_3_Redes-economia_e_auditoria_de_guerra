#!/bin/bash
set -e

DOCKER_USER="${DOCKER_USER:-cleidsonramos}"
IMG_RADAR="${IMG_RADAR:-$DOCKER_USER/radar_naval:latest}"
IMG_SENSOR="${IMG_SENSOR:-$DOCKER_USER/sensor_telemetria:latest}"

echo -e "\e[1;34m===========================================\e[0m"
echo -e "\e[1;32m📡 Cadastro Automático de Sensores\e[0m"
echo -e "\e[1;34m===========================================\e[0m"

read -p "IP do Oracle: " IP_ORACLE

if [ -z "$IP_ORACLE" ]; then
    echo -e "\e[1;31m❌ O IP do Oracle é obrigatório.\e[0m"
    exit 1
fi

generate_mac() {
    printf '02:%02X:%02X:%02X:%02X:%02X' $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256)) $((RANDOM%256))
}

MAC_RADAR=$(generate_mac)
MAC_SENSOR=$(generate_mac)

docker pull "$IMG_RADAR" >/dev/null 2>&1 || true
docker pull "$IMG_SENSOR" >/dev/null 2>&1 || true

docker run -d --restart unless-stopped --name "radar_${MAC_RADAR//:/}" \
    -e SERVER_ADDR="${IP_ORACLE}:48081" \
    -e DEVICE_MAC="$MAC_RADAR" \
    -e SENSOR_TIPO="RADAR" \
    "$IMG_RADAR" > /dev/null
echo -e "\e[1;32m-> Radar Naval iniciado (MAC: $MAC_RADAR)\e[0m"

docker run -d --restart unless-stopped --name "sensor_${MAC_SENSOR//:/}" \
    -e SERVER_ADDR="${IP_ORACLE}:48080" \
    -e DEVICE_MAC="$MAC_SENSOR" \
    "$IMG_SENSOR" > /dev/null
echo -e "\e[1;32m-> Sensor de Telemetria iniciado (MAC: $MAC_SENSOR)\e[0m"

echo -e "\e[1;32m✅ Sensores do Oráculo Conectados!\e[0m"
