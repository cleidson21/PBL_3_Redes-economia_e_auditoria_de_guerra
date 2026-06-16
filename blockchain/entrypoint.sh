#!/bin/sh

# Falha rápido se algum comando quebrar
set -e

echo "📦 Iniciando Hardhat Node em background..."
npx hardhat node --hostname 0.0.0.0 &
NODE_PID=$!

echo "⏳ Aguardando a inicialização da rede RPC..."
# Aguarda até que a porta 8545 responda
while ! nc -z localhost 8545; do   
  sleep 1 # wait for 1 second before check again
done

echo "✅ Rede RPC disponível! Executando deploy automático do Smart Contract..."
npx hardhat ignition deploy ignition/modules/OrmuzConsortium.ts --network localhost

echo "✅ Deploy concluído. Blockchain Pronta!"

# Traz o processo do node de volta para o foreground para manter o container vivo
wait $NODE_PID
