package main

import (
	"net"
	"sync"
)

// Mensagem representa o envelope JSON usado entre sensores, drones, dashboards e vizinhos.
type Mensagem struct {
	Tipo       string                 `json:"tipo"`
	Remetente  string                 `json:"remetente,omitempty"`
	Destino    string                 `json:"destino,omitempty"`
	Prioridade int                    `json:"prioridade,omitempty"`
	Acao       string                 `json:"acao,omitempty"`
	Valor      string                 `json:"valor,omitempty"`
	Posicao    string                 `json:"posicao,omitempty"`
	Frota      map[string]EstadoDrone `json:"frota,omitempty"`
	// Relogio int `json:"relogio,omitempty"` // Removido do modelo PBL 2
}

// EstadoDrone descreve o estado atual conhecido de um drone na frota local.
type EstadoDrone struct {
	Status string `json:"status"`
	Setor  string `json:"setor"`
	SeenAt int64  `json:"seen_at,omitempty"`
}

// Alert representa um item de trabalho da fila com prioridade e controle de starvation.
type Alert struct {
	Coordenada    string
	Prioridade    int
	Timestamp     int64
	ID            string
	StarveCounter int
	// Lamport int // Removido do modelo PBL 2
}

// AlertQueue gerencia filas separadas de prioridade com prevenção de starvation.
type AlertQueue struct {
	critical        []Alert
	normal          []Alert
	mu              sync.Mutex
	notEmpty        *sync.Cond
	maxSize         int
	starveThreshold int
	processedCount  int
}

// Config representa a estrutura de configuração carregada de config.json
type Config struct {
	ServerPort    int    `json:"server_port"`
	BlockchainRPC string `json:"blockchain_rpc"`
}

// GlobalState reúne o estado compartilhado do servidor.
type GlobalState struct {
	MeuSetor     string
	MeuNamespace string
	ServerPort   int
	BlockchainRPC string

	RadaresMu    sync.RWMutex
	Radares      map[string]net.Conn
	SensoresMu   sync.RWMutex
	Sensores     map[string]*net.UDPAddr
	DronesMu     sync.RWMutex
	DronesLocais map[string]net.Conn
	DashboardsMu sync.RWMutex
	Dashboards   map[net.Conn]bool

	FrotaMu     sync.RWMutex
	FrotaGlobal map[string]EstadoDrone

	AlertQueue *AlertQueue
}

// NewGlobalState cria o estado global inicializado com as estruturas de fila e mapas vazios.
func NewGlobalState(meuSetor string, serverPort int, blockchainRPC string, maxQueueSize, starveThreshold int) *GlobalState {
	gs := &GlobalState{
		MeuSetor:      meuSetor,
		MeuNamespace:  "ORMUZ/" + meuSetor,
		ServerPort:    serverPort,
		BlockchainRPC: blockchainRPC,
		Radares:       make(map[string]net.Conn),
		Sensores:      make(map[string]*net.UDPAddr),
		DronesLocais:  make(map[string]net.Conn),
		Dashboards:    make(map[net.Conn]bool),
		FrotaGlobal:   make(map[string]EstadoDrone),
	}

	aq := &AlertQueue{
		critical:        make([]Alert, 0, maxQueueSize),
		normal:          make([]Alert, 0, maxQueueSize),
		maxSize:         maxQueueSize,
		starveThreshold: starveThreshold,
	}
	aq.notEmpty = sync.NewCond(&aq.mu)
	gs.AlertQueue = aq

	return gs
}

