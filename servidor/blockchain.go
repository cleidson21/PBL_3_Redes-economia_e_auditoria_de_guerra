package main

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/cleidson21/servidor/contract"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
)

// InitBlockchain conecta ao nó RPC da Ethereum/Hardhat (Fase 3 da arquitetura).
// Cria o bind com a interface Go (abigen) gerada a partir do ABI do Smart Contract.
func InitBlockchain(gs *GlobalState) error {
	client, err := ethclient.Dial(gs.ConfigData.BlockchainRPC)
	if err != nil {
		return fmt.Errorf("falha ao conectar no BlockchainRPC (%s): %v", gs.ConfigData.BlockchainRPC, err)
	}

	block, err := client.BlockNumber(context.Background())
	if err != nil {
		return fmt.Errorf("falha ao obter eth_blockNumber: %v", err)
	}

	addr := common.HexToAddress(gs.ConfigData.ContractAddress)
	c, err := contract.NewOrmuzConsortium(addr, client)
	if err != nil {
		return fmt.Errorf("falha ao instanciar contrato inteligente: %v", err)
	}

	gs.EthClient = client
	gs.Contract = c
	gs.ContractAddress = addr

	pkHex := strings.TrimPrefix(gs.ConfigData.PrivateKey, "0x")
	privateKey, err := crypto.HexToECDSA(pkHex)
	var oracleWallet string
	if err == nil {
		publicKey := privateKey.Public()
		if publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey); ok {
			fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)
			oracleWallet = fromAddress.Hex()
		}
	} else {
		return fmt.Errorf("falha ao converter ORACLE_PRIVATE_KEY: %v", err)
	}

	fmt.Println("==================================================")
	fmt.Printf("Blockchain RPC: %s\n", gs.ConfigData.BlockchainRPC)
	fmt.Printf("Oracle Wallet: %s\n", oracleWallet)
	fmt.Printf("Latest Block: %d\n", block)
	fmt.Printf("Contract Bound: OK\n")
	fmt.Println("==================================================")

	gs.OracleWallet = oracleWallet

	return nil
}

// ListenToBlockchainEvents assina o evento WatchEscortPaid do Smart Contract. (Fase 4)
// Opera em loop infinito utilizando WebSockets para recepção em tempo real. Sempre
// que o evento é capturado, ele cruza com as coordenadas do próximo radar/sensor 
// e empurra a missão consolidada para a FilaMissoes.
func ListenToBlockchainEvents(gs *GlobalState) {
	for {
		log.Printf("[Web3] 🎧 Iniciando Listener do contrato (WatchEscortPaid)...")
		sink := make(chan *contract.OrmuzConsortiumEscortPaid)
		
		// Utilizamos WebSockets no RPC para que o Watch não trave
		sub, err := gs.Contract.WatchEscortPaid(&bind.WatchOpts{Context: context.Background()}, sink, nil, nil)

		if err != nil {
			log.Printf("⚠️ [Web3] Erro ao assinar WatchEscortPaid: %v. Tentando reconectar em 5s...", err)
			time.Sleep(5 * time.Second)
			continue
		}

		func() {
			defer sub.Unsubscribe()
			for {
				select {
				case err := <-sub.Err():
					log.Printf("⚠️ [Web3] Assinatura do websocket interrompida: %v", err)
					return // Sai da closure, reiniciando o loop infinito com auto-reconexão
				case event := <-sink:
					log.Printf("[Web3 Event] 🚀 Solicitação de Missão (Escolta Paga)! MissionID: %s, Client: %s, Amount: %s", event.MissionId.String(), event.Client.Hex(), event.Amount.String())
					
					prio := int(event.Prioridade)
					
					alert, ok := gs.AlertQueue.TryDequeueAlert()
					coords := "0,0"
					if ok {
						coords = alert.Coordenada
						log.Printf("[Web3] ✅ Alerta local consumido para Missão %s. Coordenada: %s", event.MissionId.String(), coords)
					} else {
						log.Printf("[Web3] ⚠️ Nenhum alerta na fila. Missão %s despachada para coordenada padrao (0,0)", event.MissionId.String())
					}

					missao := Missao{
						MissionId:   event.MissionId.String(),
						Prioridade:  prio,
						Coordenadas: coords,
					}

					gs.FilaMissoes.Mu.Lock()
					gs.FilaMissoes.Missoes = append(gs.FilaMissoes.Missoes, missao)
					posicao := len(gs.FilaMissoes.Missoes)
					gs.FilaMissoes.Mu.Unlock()

					gs.FilaMissoes.Cond.Signal()

					log.Printf("[Fila] Missão %s adicionada à fila. Posição atual: %d", missao.MissionId, posicao)
				}
			}
		}()

		// Previne flood caso o loop continue muito rapidamente
		time.Sleep(3 * time.Second)
	}
}

// RegistrarLaudoBlockchain (Fase 5) é responsável por efetuar uma Transação (Write)
// na rede Blockchain atestando a conclusão física da patrulha.
// Monta, assina localmente (ECDSA) e despacha a transação contendo os dados auditados pelo drone.
func RegistrarLaudoBlockchain(gs *GlobalState, missionId string, droneId string, coords string, status string) error {
	pkHex := gs.ConfigData.PrivateKey
	if envPk := os.Getenv("ORACLE_PRIVATE_KEY"); envPk != "" {
		pkHex = envPk
	}
	pkHex = strings.TrimPrefix(pkHex, "0x")

	privateKey, err := crypto.HexToECDSA(pkHex)
	if err != nil {
		return fmt.Errorf("falha ao converter private key: %v", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return fmt.Errorf("falha ao derivar public key ECDSA")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	nonce, err := gs.EthClient.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		return fmt.Errorf("falha ao obter nonce: %v", err)
	}

	gasPrice, err := gs.EthClient.SuggestGasPrice(context.Background())
	if err != nil {
		return fmt.Errorf("falha ao obter suggest gas price: %v", err)
	}

	chainID, err := gs.EthClient.ChainID(context.Background())
	if err != nil {
		return fmt.Errorf("falha ao obter chain id: %v", err)
	}

	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("falha ao criar transactor: %v", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)     // Transação não envia Ether (gas fee paga o custo)
	auth.GasLimit = uint64(500000) // Limite seguro para o contrato
	auth.GasPrice = gasPrice

	log.Printf("[Web3 TX] ✍️ Assinando laudo (Missão: %s) Conta: %s (Nonce: %d, GasPrice: %s)", missionId, fromAddress.Hex(), nonce, gasPrice.String())

	mId, ok := new(big.Int).SetString(missionId, 10)
	if !ok {
		return fmt.Errorf("falha ao converter missionId para big.Int: %s", missionId)
	}

	// Utilizando o transactor real mapeado na auditoria do abigen:
	tx, err := gs.Contract.RegisterMissionReport(auth, mId, droneId, coords, status)
	if err != nil {
		return fmt.Errorf("falha ao registrar laudo: %v", err)
	}

	log.Printf("[Web3 TX] ✅ Transação enviada! Hash: %s", tx.Hash().Hex())
	return nil
}
