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

// RotinaGossip replica periodicamente o estado da frota local para os dashboards conectados.
func RotinaGossip(gs *GlobalState) {
	for {
		time.Sleep(5 * time.Second)

		gs.FrotaMu.RLock()
		if len(gs.FrotaGlobal) == 0 {
			gs.FrotaMu.RUnlock()
			continue
		}
		copiaFrota := make(map[string]EstadoDrone)
		for k, v := range gs.FrotaGlobal {
			copiaFrota[k] = v
		}
		gs.FrotaMu.RUnlock()

		msgGossip := Mensagem{
			Tipo:      "GOSSIP",
			Remetente: gs.MeuSetor,
			Frota:     copiaFrota,
		}
		payload, _ := json.Marshal(msgGossip)

		gs.DashboardsMu.RLock()
		for conn := range gs.Dashboards {
			fmt.Fprintf(conn, "%s\n", payload)
		}
		gs.DashboardsMu.RUnlock()
	}
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
	go ListenDashboardTCP(gs)

	go RotinaGossip(gs)

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

