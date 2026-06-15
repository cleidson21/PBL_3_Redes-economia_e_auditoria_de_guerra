# Ormuz Consortium – Redes Distribuídas (PBL 3)
> **Blockchain-based Coordination for Autonomous Drone Fleets**

Este repositório contém a infraestrutura completa do PBL 3 (Problema 3) da disciplina de Redes de Computadores. Ele orquestra o despacho autônomo de escoltas navais operadas por drones através de contratos inteligentes (Smart Contracts) com compensação financeira nativa, proteção contra falhas bizantinas e auditoria imutável.

---

## 1. Introdução

No modelo arquitetural anterior (PBL 2), o despacho de drones era gerido via comunicação P2P com algoritmos acadêmicos clássicos (Ricart-Agrawala, Relógios de Lamport, Eleição de Líder). 

Embora descentralizado na comunicação, esse modelo dependia de **confiança estrita** nos nós (Servidores). Caso um servidor caísse após assumir o despacho de uma escolta, ocorriam impasses; se um operador fraudasse laudos locais, a rede validava sem auditoria criptográfica.

A migração para a **Arquitetura Web3 (Blockchain)** substituiu o modelo distribuído de confiança acadêmica pelo paradigma "Don't Trust, Verify". O consenso distribuído agora é fornecido nativamente pela Ethereum Virtual Machine (EVM), que implementa as regras financeiras em Escrow, previne ataques bizantinos e serve como única fonte de verdade.

---

## 2. Arquitetura

O ecossistema é fracionado em três camadas isoladas, interagindo unicamente pelo registro imutável da Blockchain:

```text
  [ CLIENTE (Empresa TS) ]        [ HARDWARE (Drone) ]
         |                                  ^
  1. Compra Escolta                         | 4. Comando Físico
  2. Paga OPC                               |
         |                                  |
         v                                  |
 [ BLOCKCHAIN (Smart Contract) ] --\        |
         |                         |        |
         | (Evento Emitido)        | 3. Detecta evento Web3
         v                         |
 [ ORACLE GO (Servidor Borda) ] ---/
         |
  5. Conclui Escolta
  6. Emite Laudo On-chain
```

- **Camada 1 - Blockchain (Hardhat + Solidity)**: Gerencia saldos de tokens (OPC), retém fundos durante missões e cobra reembolsos por timeout.
- **Camada 2 - Servidor Oracle (Go)**: Uma ponte entre Web3 e o Mundo Real (IoT). Escuta a rede EVM, comanda os drones locais fisicamente e atesta conclusões enviando laudos assinados para a Blockchain.
- **Camada 3 - Cliente CLI (TypeScript)**: Painel tático das empresas de navegação. Permite requisitar serviços, monitorar auditoria real-time e exigir reembolsos caso o consórcio falhe.

---

## 3. Modelo de Segurança

A solidez do sistema é mantida por cinco pilares integrados no contrato inteligente `OrmuzConsortium.sol`:

- **Escrow (Custódia Automática)**: Os tokens (pagamento da escolta) não vão diretamente para o consórcio. Eles ficam retidos em garantia (Escrow) dentro do contrato assim que a missão é iniciada.
- **Auditoria Imutável**: O servidor Go não altera o estado da missão manipulando variáveis, mas sim executando a transação `registrarLaudo` registrada eternamente na Blockchain com hashes únicos.
- **Timeout**: Missões recebem uma contagem regressiva em blocos. O consórcio precisa entregar o laudo antes que a janela de tempo se esgote.
- **Reembolso**: Caso o Drone caia no mar, ou o Servidor perca energia, a missão não será concluída a tempo. O Cliente CLI tem o direito irrevogável de chamar `reclamarReembolso` para recuperar 100% dos fundos de missões expiradas.
- **Tolerância a Falhas Bizantinas**: Ao unir *Escrow* e *Timeout*, a Blockchain elimina a necessidade de confiar no consórcio. Se o servidor agir de forma bizantina (pegar o laudo falso ou reter fundos e não mandar o drone), a matemática do *Timeout* sempre garante o dinheiro de volta ao cliente. Não é possível faturar missões não concluídas.

---

## 4. Pré-Requisitos

Para execução local, recomenda-se:
* **Node.js 22.x+**
* **Go 1.21+**
* **Docker & Docker Compose**

---

## 5. Execução Manual (Demonstração da Banca)

Para rodar todos os painéis e o Simulador Interativo, abra 4 janelas do terminal.

**Terminal 1 — Sobe a Blockchain**
```bash
cd blockchain
npm install
npx hardhat node
```

**Terminal 2 — Instancia os Contratos**
```bash
cd blockchain
npx hardhat ignition deploy ignition/modules/OrmuzConsortium.ts --network localhost
```

**Terminal 3 — Servidor Oracle Go (O "Cérebro" IoT)**
```bash
cd servidor
go build ./...
go run main.go types.go queue.go listeners.go
```
*(Opcional: Subir um drone simulado manual executando `cd drone && go run main.go` em outra janela)*

**Terminal 4 — Cliente CLI Web3 (Console Empresa)**
```bash
cd client_cli
npm install
# Para operar manualmente o menu (Caminho Feliz)
npm run start
# Para demonstração automática com Cenários Bizantinos e Falhas
npm run simulate
```

---

## 6. Execução Docker (Avaliação Rápida)

Para subir o cluster backend inteiro (`Hardhat Node` + `Oracle Go` + `2 Drones`) com apenas um comando:

```bash
docker compose up -d
```
Verificar status e logs:
```bash
docker compose ps
docker compose logs -f
```

*O Client CLI (`client_cli/simulador.ts`) deve ser executado no terminal da sua máquina (fora do Docker) apontando para o `localhost:8545` normalmente, validando a integração entre mundo exterior e cluster Docker.*

---

## 7. Execução Distribuída

Na Faculdade, caso queira rodar em máquinas reais distintas (Ex: Aluno A roda Servidor e Blockchain; Aluno B roda o Cliente CLI pedindo as escoltas):

No **Aluno A** (Servidor):
- Suba a blockchain e libere as portas na rede.

No **Aluno B** (Cliente CLI):
- Modifique a variável de conexão no Node:
```bash
export BLOCKCHAIN_RPC="ws://[IP_DO_ALUNO_A]:8545"
npm run start
```
O contrato inteligente `OrmuzConsortium` garante que ambos observarão a mesma transação no mesmo hash instantaneamente.
