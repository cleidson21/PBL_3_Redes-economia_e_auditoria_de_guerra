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

// InitBlockchain conecta ao RPC da blockchain e instancia o contrato Web3. (Fase 3)
func InitBlockchain(gs *GlobalState) error {
	client, err := ethclient.Dial(gs.ConfigData.BlockchainRPC)
	if err != nil {
		return fmt.Errorf("falha ao conectar no BlockchainRPC (%s): %v", gs.ConfigData.BlockchainRPC, err)
	}

	chainID, err := client.ChainID(context.Background())
	if err != nil {
		return fmt.Errorf("falha ao obter ChainID: %v", err)
	}

	log.Printf("[Web3] 🌐 Conectado! RPC: %s | ChainID: %d", gs.ConfigData.BlockchainRPC, chainID)

	addr := common.HexToAddress(gs.ConfigData.ContractAddress)
	c, err := contract.NewOrmuzConsortium(addr, client)
	if err != nil {
		return fmt.Errorf("falha ao instanciar contrato inteligente: %v", err)
	}

	gs.EthClient = client
	gs.Contract = c
	gs.ContractAddress = addr

	log.Printf("[Web3] 📜 Contrato carregado no endereço: %s", addr.Hex())
	return nil
}

// ListenToBlockchainEvents assina e escuta o evento WatchEscortPaid em tempo real. (Fase 4)
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

					missao := Missao{
						MissionId:   event.MissionId.String(),
						Prioridade:  prio,
						Coordenadas: "0,0",
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

// RegistrarLaudoBlockchain submete uma transação atestando a conclusão da missão pelo drone. (Fase 5)
func RegistrarLaudoBlockchain(gs *GlobalState, missionId string, droneId string, coords string, status string) error {
	pkHex := gs.ConfigData.PrivateKey
	if envPk := os.Getenv("PRIVATE_KEY"); envPk != "" {
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
