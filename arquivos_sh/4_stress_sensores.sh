#!/bin/bash

echo "==========================================="
echo "🌪️  Simulador de Sensores e Radares"
echo "==========================================="

IP_ORACLE="127.0.0.1"
read -p "🎯 Digite o IP do Servidor Oracle (Padrão 127.0.0.1): " input_ip
if [ ! -z "$input_ip" ]; then
    IP_ORACLE=$input_ip
fi

echo "-------------------------------------------"
echo "Selecione o tipo de evento a disparar:"
echo "1) Vento Forte (> 70km/h) -> UDP Porta 48080 (Prioridade Normal)"
echo "2) Invasão/Anomalia       -> TCP Porta 48081 (Prioridade Crítica)"
read -p "Opção (1 ou 2): " OPTION

echo "-------------------------------------------"

if [ "$OPTION" == "1" ]; then
    echo "Enviando telemetria de vento forte (85 km/h) via UDP..."
    echo '{"tipo":"TLM","remetente":"SENSOR_CLIMA_1","valor":"85.5","posicao":"-12.0,-38.0"}' > /dev/udp/$IP_ORACLE/48080
    echo "✅ Pacote UDP enviado! O Servidor Oracle deve registrar um Alerta Climático."
elif [ "$OPTION" == "2" ]; then
    echo "Enviando alerta de invasão via TCP..."
    echo '{"tipo":"EVT","remetente":"RADAR_COSTEIRO_1","acao":"ALERTA","posicao":"-10.5,-35.2"}' > /dev/tcp/$IP_ORACLE/48081
    echo "✅ Pacote TCP enviado! O Servidor Oracle deve registrar um Alerta Crítico."
else
    echo "❌ Opção inválida!"
fi
