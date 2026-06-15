# Documentação Técnica do Projeto (PBL 3)

Bem-vindo ao índice central da documentação técnica do sistema de escolta naval governado por Blockchain. Toda a estrutura obsoleta do PBL 2 (baseada em coordenação distribuída P2P) foi expurgada deste repositório para evitar dívida técnica.

Abaixo, encontram-se os guias da nova arquitetura:

## 1. [Arquitetura](arquitetura.md)
Detalha o núcleo conceitual e os fluxos da plataforma.

A nova solução é composta por uma topologia em três camadas:
- **Blockchain (Hardhat/Solidity):** Atua como fonte única e imutável de verdade, custódia e tempo (Escrow/Timeout). Garante matematicamente a mitigação de falhas bizantinas.
- **Oracle (Servidor Go):** Intermediário técnico que enxerga as ordens financeiras da Blockchain e comanda drones de patrulha no mundo real, enviando de volta laudos técnicos.
- **Drone (Cliente IoT):** Atuadores operacionais que apenas efetuam missões físicas.

Neste guia também estão incluídos os **Diagramas Mermaid** para os Fluxos de Escolta e Falha/Reembolso.

## 2. [Testes e Demonstração](testes.md)
Guia de validação da infraestrutura DevOps e dos fluxos do contrato inteligente.

O ambiente possui um Client TS provido de um *Simulador Automatizado* que percorre três caminhos avaliativos cruciais:
- **Cenário 1:** A execução de uma escolta ponta-a-ponta com liberação do pagamento para a Tesouraria.
- **Cenário 2:** A interrupção de um Servidor e/ou Drone durante a escolta (Falha Bizantina), resultando no esgotamento da janela de tempo da missão e no reembolso do Cliente.
- **Cenário 3:** A tentativa fracassada de forjar laudos e invadir o Contrato Inteligente para roubo de criptomoedas, bloqueada pelas *Reverts* da EVM.
