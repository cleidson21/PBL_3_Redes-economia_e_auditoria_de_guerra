package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"
)

// LoadConfig carrega as configurações locais a partir de config.json
func LoadConfig(path string) (*Config, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var cfg Config
	decoder := json.NewDecoder(file)
	if err := decoder.Decode(&cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}


func main() {
	meuSetor := os.Getenv("MEU_SETOR")
	if meuSetor == "" {
		meuSetor = "DESCONHECIDO"
	}

	cfg, err := LoadConfig("config.json")
	if err != nil {
		fmt.Printf("⚠️ Erro ao carregar config.json: %v. Usando valores padrao.\n", err)
		cfg = &Config{
			ServerPort:    48080,
			BlockchainRPC: "http://127.0.0.1:8545",
		}
	}

	if envRPC := os.Getenv("BLOCKCHAIN_RPC"); envRPC != "" {
		cfg.BlockchainRPC = envRPC
	}
	if envContract := os.Getenv("CONTRACT_ADDRESS"); envContract != "" {
		cfg.ContractAddress = envContract
	}

	gs := NewGlobalState(meuSetor, cfg, 100, 3)

	if err := InitBlockchain(gs); err != nil {
		log.Fatalf("❌ Erro fatal na inicialização da Blockchain: %v", err)
	}
	go ListenToBlockchainEvents(gs)

	fmt.Printf("🚀 Servidor de Setor Iniciado: [%s]\n", gs.MeuNamespace)
	fmt.Printf("📥 Buffer de fila: 100 alertas | Starvation threshold: 3 ciclos críticos\n")
	fmt.Printf("🔗 Blockchain RPC: %s\n", gs.ConfigData.BlockchainRPC)
	fmt.Println("==================================================")

	go ListenSensoresTLM(gs)
	go ListenRadarTCP(gs)
	go ListenDrones(gs)

	gs.AlertQueue.StartConsumer(gs)

	go func() {
		for {
			time.Sleep(10 * time.Second)
			LimparFrotaExpirada(gs, 45*time.Second)
			critCount, normCount := gs.AlertQueue.QueueStats()

			gs.FrotaMu.RLock()
			qtdDronesLivres := 0
			qtdDronesEmMissao := 0
			qtdDronesDesconectados := 0
			for _, estado := range gs.FrotaGlobal {
				switch estado.Status {
				case "LIVRE":
					qtdDronesLivres++
				case "EM_MISSAO":
					qtdDronesEmMissao++
				case "DESCONECTADO":
					qtdDronesDesconectados++
				}
			}
			gs.FrotaMu.RUnlock()

			fmt.Printf("📊 [QUEUE STATUS] Críticos: %d | Normais: %d | Drones: ✅%d | 🚁%d | ❌%d\n",
				critCount, normCount, qtdDronesLivres, qtdDronesEmMissao, qtdDronesDesconectados)
		}
	}()

	select {}
}

