# Ormuz Consortium – Redes Distribuídas (PBL 3)
> **Escolta Naval Autônoma Orquestrada por Blockchain**

Este repositório contém a consolidação técnica da arquitetura Web3 aplicada a sistemas distribuídos navais (Problema 3). O projeto resolve o desafio do despacho de drones físicos conectando as solicitações financeiras diretamente a uma Blockchain (Ethereum Virtual Machine) em ambiente fechado, eliminando pontos únicos de falha e impedindo atuações bizantinas através da custódia do Smart Contract.

---

## Visão Geral
A infraestrutura simula um Consórcio de empresas navais que necessitam contratar Drones de Segurança para patrulhar suas cargas. O sistema processa o pagamento digital (OPC Token), bloqueia o pagamento em *Escrow* (Garantia), dispara Drones no mundo real através do Servidor Borda (Oracle em Go) e, mediante auditoria de conclusão técnica, credita a Companhia prestadora.

## Mudança de Paradigma: PBL 2 → PBL 3
Durante o PBL 2, a coordenação da frota dependia estritamente de topologias distribuídas via TCP. Esse modelo incluía:
- **PBL 2 (Obsoleto):** Sincronização de nós via Relógios Lógicos de Lamport, Exclusão Mútua Distribuída (Ricart-Agrawala), repasse de malhas via algoritmo Gossip e complexo mecanismo de *Failover* entre Servidores Vizinhos. O modelo sofria de sobrecarga na rede e não oferecia garantias de blindagem contra servidores maliciosos que reportavam missões inventadas para gerar receita ilícita.

- **PBL 3 (Arquitetura Atual Web3):** Os algoritmos de consenso acadêmico foram completamente substituídos pela imutabilidade dos Smart Contracts em Solidity. A **Blockchain assumiu como Fonte Única de Verdade**. O servidor back-end em Go teve seu papel enxugado para ser apenas um *Oracle*, ou seja, um escutador operacional que move o hardware local. A segurança contra operantes maliciosos mudou do software para a **geometria financeira (Escrow e Reembolso Automático por Timeout)**.

---

## Arquitetura
A plataforma abandonou a malha densa para agir em uma topologia linear vertical imutável:

```text
       Cliente CLI (TypeScript)
                 │
                 ▼
     Blockchain (Hardhat / Solidity)
                 │
                 ▼
       Companhia Oracle (Go)
                 │
                 ▼
         Drones Físicos (TCP)
```

---

## Modelo de Segurança
A governança da arquitetura é puramente matemática e executada na EVM:
- **Escrow**: O operador naval não paga ao Consórcio Go. Ele envia os tokens ao *Smart Contract* onde eles ficam congelados enquanto a frota estiver em operação.
- **Proteção contra Operador Malicioso**: Se o Servidor Borda inventar laudos e tentar cobrar o Cliente sem que uma solicitação tenha sido empenhada de antemão, a Blockchain aborta (`Revert`) a requisição por tentar sacar fundos inexistentes.
- **Proteção contra Dupla Cobrança**: É fisicamente impossível enviar dois pagamentos para o mesmo *nonce* de missão e acionar Drones duplicados simultaneamente.
- **Timeout e Reembolso (Falha do Servidor)**: Se a Companhia Oracle falhar (Queda de Energia ou Rede), o Smart Contract aguardará um limite predeterminado de blocos (Timeout). Ultrapassado o limite, a missão é taxada como Falha Crítica e o Cliente ativa a função Reembolso, resgatando 100% dos seus OPCs do *Escrow*.

---

## Guia de Execução Local (Básica)
Para rodar os serviços localmente sem orquestrador Docker, abra janelas de terminal separadas e execute em ordem:

1. **Hardhat Node:**
   ```bash
   cd blockchain
   npm install
   npx hardhat node
   ```
2. **Deploy do Contrato e Geração do Abigen:**
   ```bash
   cd blockchain
   npx hardhat ignition deploy ignition/modules/OrmuzConsortium.ts --network localhost
   # O script automático na raiz "generate_abi.sh" cria os bindings para a pasta servidor/contract
   ```
3. **Servidor Go (Oracle):**
   ```bash
   cd servidor
   go build ./...
   go run main.go types.go queue.go listeners.go
   ```
4. **Drones (Opcional):** `cd drone && go run main.go`
5. **Client CLI / Simulador:**
   ```bash
   cd client_cli
   npm install
   npm run start     # Para operar manualmente o dashboard da Empresa
   npm run simulate  # Para iniciar a Bateria Automatizada de Testes de Escrow e Fallback Bizantino
   ```

---

## Guia de Execução Docker (Produção)
O projeto conta com scripts DevOPS de integração ponta-a-ponta para subir as três camadas (Node Blockchain, Go Oracle e 2 Drones) autonomamente:

1. Inicializar os containers em Background:
   ```bash
   docker compose up -d
   ```
2. Disparar a Demonstração (Validará a integridade do nó e rodará os fluxos):
   ```bash
   ./arquivos_sh/start_demo.sh
   ```

*(Para empacotar novas imagens para o Hub, o repositório disponibiliza o `arquivos_sh/build_and_push.sh`).*

---

## Guia de Execução Distribuída
O sistema suporta topologia fragmentada em redes reais na Faculdade. Se as camadas rodam em laboratórios separados, as portas são customizáveis via variáveis de ambiente:

- **Na Máquina do Cliente:** Apontar o IP fixo de onde a rede Ethereum Subiu.
  ```bash
  export BLOCKCHAIN_RPC="ws://[IP_MAQUINA_A]:8545"
  export CONTRACT_ADDRESS="0x5FbDB..."
  ```
- **Na Máquina dos Drones:** Apontar a porta de escuta do Servidor Oracle:
  ```bash
  export SERVER_ADDR="[IP_MAQUINA_B]:48082"
  ```
- *As Chaves Privadas do deployer (Companhia) e do Operador (Empresa)* são gerenciáveis via carteiras Ethereum padrão fornecidas pelo Hardhat durante os testes de estresse.

> Para detalhes em UML/Mermaid sobre as lógicas da Economia, visite a [Documentação de Arquitetura e Testes](docs/README.md).
