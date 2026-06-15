# Roteiros de Avaliação (Simulador Web3)

A interface do Cliente CLI possui um módulo automatizado (`npm run simulate`) para que a banca avaliadora consiga observar em tempo real o giro da máquina de estados do Escrow sem a necessidade de intervenção humana contínua. 

Esta documentação serve de guia para os três cenários executados no roteiro da apresentação final.

---

## Cenário 1 — Caminho Feliz (Escolta Concluída)

**Objetivo:** Demonstrar o fluxo ponta-a-ponta ideal onde a Empresa paga, o Servidor atua e o pagamento é repassado ao Consórcio (Escrow cumprido).

**Passos:**
1. O Cliente CLI invoca a função pagante `solicitarEscolta()`.
2. A Blockchain cobra o valor e dispara o evento Web3.
3. O Servidor Oracle Go escuta o evento e repassa o despacho físico ao Drone.
4. Após 20 segundos de simulação, o Drone retorna `ACK` positivo.
5. O Oracle transmite a transação `registrarLaudo` para o Hardhat.

**Resultado Esperado & Evidências:**
* **Hashes:** Serão impressos 2 Hashes Tx independentes (um do cliente pagando, um do servidor escrevendo o laudo).
* **Mudança de Saldo:** O Cliente perde o saldo de OPCs referentes à tarifa. Ao final do laudo, a conta "Tesouraria" (Deployer) recebe o valor correspondente no balanço ERC-20 (comprovando que o Escrow desamarrou o dinheiro).
* **Eventos Emitidos:** `EscoltaSolicitada` e `LaudoRegistrado`.

---

## Cenário 2 — Falha Bizantina (Timeout & Reembolso)

**Objetivo:** Demonstrar a tolerância do projeto à quedas massivas. Validar que uma pane elétrica generalizada (ou a derrubada intencional do Oracle e Drones) não prejudica o Cliente, e que o Escrow estorna o dinheiro.

**Passos:**
1. O Cliente CLI pede e paga pela Escolta 2.
2. É orientado ao avaliador **derrubar artificialmente a janela do Servidor Go** (CTRL+C) durante o processo.
3. O Smart Contract não recebe o laudo e, devido ao block mining da EVM (avançado pelo script `hardhat_mine`), ultrapassa o bloco limite de *Timeout*.
4. O Cliente CLI chama proativamente `reclamarReembolso()`.

**Resultado Esperado & Evidências:**
* **Hashes:** Hash Tx da Solicitação + Hash Tx do Reembolso. O Hash do Oracle jamais existirá nesta rota.
* **Mudança de Saldo:** O valor é debitado no começo. Mas na última fase o saldo total da Empresa de Navegação retorna integralmente ao valor inicial.
* **Eventos Emitidos:** `EscoltaSolicitada` e `ReembolsoEmitido`.

---

## Cenário 3 — Fraude Econômica (Double-Spending / Oracle Hackeado)

**Objetivo:** Demonstrar que o Servidor IoT não pode ser subornado para injetar laudos inventados e extrair dinheiro de escoltas fantasmas. A autoridade financeira reside na Blockchain.

**Passos:**
1. O Simulador tenta chamar maliciosamente `registrarLaudo()` em uma missão inexistente (ID inventado) ou numa missão que já foi estornada.

**Resultado Esperado & Evidências:**
* **Hashes:** A transação do Oracle falha violentamente e sofre `Revert` da EVM, não consumindo o bloco.
* **Mudança de Saldo:** O Consórcio e o Cliente continuam com seus balanços financeiros rigorosamente inalterados. Nenhuma moeda OPC é movimentada.
* **Eventos Emitidos:** O console do TypeScript exibirá um Traceback de `execution reverted` atestando o bloqueio matemático de segurança pela EVM.
