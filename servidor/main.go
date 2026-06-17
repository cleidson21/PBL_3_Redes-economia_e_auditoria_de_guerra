package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

var uptimeStart = time.Now()

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

	if envPort := os.Getenv("SERVER_PORT"); envPort != "" {
		if port, err := strconv.Atoi(envPort); err == nil {
			cfg.ServerPort = port
		}
	}
	if envRPC := os.Getenv("BLOCKCHAIN_RPC"); envRPC != "" {
		cfg.BlockchainRPC = envRPC
	}
	if envContract := os.Getenv("CONTRACT_ADDRESS"); envContract != "" {
		cfg.ContractAddress = envContract
	}

	envKey := os.Getenv("ORACLE_PRIVATE_KEY")
	if envKey == "" {
		log.Fatalf("FATAL: ORACLE_PRIVATE_KEY não configurada.")
	}
	cfg.PrivateKey = envKey

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
	go ProcessarFilaDrones(gs)
	go initHTTPServer(gs)

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

func initHTTPServer(gs *GlobalState) {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/drones", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		gs.FrotaMu.RLock()
		defer gs.FrotaMu.RUnlock()
		json.NewEncoder(w).Encode(gs.FrotaGlobal)
	})

	mux.HandleFunc("/api/alerts", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		alerts := gs.AlertQueue.GetPendingAlerts()
		json.NewEncoder(w).Encode(alerts)
	})

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		gs.FrotaMu.RLock()
		qtdDronesVivos := 0
		for _, estado := range gs.FrotaGlobal {
			if estado.Status != "DESCONECTADO" {
				qtdDronesVivos++
			}
		}
		gs.FrotaMu.RUnlock()

		crit, norm := gs.AlertQueue.QueueStats()

		status := HealthStatus{
			Status:          "ok",
			OracleWallet:    gs.OracleWallet,
			ConnectedDrones: qtdDronesVivos,
			PendingAlerts:   crit + norm,
			UptimeSeconds:   int64(time.Since(uptimeStart).Seconds()),
		}

		json.NewEncoder(w).Encode(status)
	})

	port := fmt.Sprintf(":%d", gs.ServerPort+3)
	fmt.Printf("🌐 Servidor HTTP Iniciado em %s\n", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Erro no servidor HTTP: %v", err)
	}
}

