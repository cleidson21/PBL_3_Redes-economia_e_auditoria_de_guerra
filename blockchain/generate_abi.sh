#!/bin/bash

# generate_abi.sh
# Script para extrair ABI e Bytecode a partir dos artefatos JSON do Hardhat
# Utiliza jq para evitar incompatibilidades de leitura JSON no ambiente Node ESM

ARTIFACT_FILE="artifacts/contracts/OrmuzConsortium.sol/OrmuzConsortium.json"
ABI_FILE="OrmuzConsortium.abi"
BIN_FILE="OrmuzConsortium.bin"

echo "[*] Iniciando extração do contrato OrmuzConsortium..."

# Validar existência do arquivo
if [ ! -f "$ARTIFACT_FILE" ]; then
    echo "[!] ERRO: Artefato $ARTIFACT_FILE não encontrado."
    echo "[!] Execute 'npx hardhat compile' antes de gerar os bindings."
    exit 1
fi

# Extrair ABI
jq '.abi' "$ARTIFACT_FILE" > "$ABI_FILE"
if [ ! -s "$ABI_FILE" ]; then
    echo "[!] ERRO: Falha ao extrair ABI ou o arquivo resultou vazio."
    exit 1
fi
echo "[+] ABI extraído com sucesso para $ABI_FILE"

# Extrair Bytecode (usar -r para raw string, removendo as aspas)
jq -r '.bytecode' "$ARTIFACT_FILE" > "$BIN_FILE"
if [ ! -s "$BIN_FILE" ]; then
    echo "[!] ERRO: Falha ao extrair Bytecode ou o arquivo resultou vazio."
    exit 1
fi
echo "[+] Bytecode extraído com sucesso para $BIN_FILE"

echo "[*] Extração concluída com sucesso."
