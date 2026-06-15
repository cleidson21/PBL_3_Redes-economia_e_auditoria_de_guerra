package main

import (
	"net"
	"sync"

	"github.com/cleidson21/servidor/contract"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
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
}

// EstadoDrone descreve o estado atual conhecido de um drone na frota local.
type EstadoDrone struct {
	Status    string `json:"status"`
	Setor     string `json:"setor"`
	SeenAt    int64  `json:"seen_at,omitempty"`
	MissionId string `json:"missionId,omitempty"`
	Ocupado   bool   `json:"ocupado,omitempty"`
}

// Missao representa uma tarefa originada da Blockchain
type Missao struct {
	MissionId   string
	Prioridade  int
	Coordenadas string
}

// FilaDeMissoes gerencia de forma segura as missões a serem executadas
type FilaDeMissoes struct {
	Missoes []Missao
	Mu      sync.Mutex
	Cond    *sync.Cond
}

// Alert representa um item de trabalho da fila com prioridade e controle de starvation.
type Alert struct {
	Coordenada    string
	Prioridade    int
	Timestamp     int64
	ID            string
	StarveCounter int
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
	ServerPort      int    `json:"server_port"`
	BlockchainRPC   string `json:"blockchain_rpc"`
	ContractAddress string `json:"contract_address"`
	PrivateKey      string `json:"private_key"`
}

// GlobalState reúne o estado compartilhado do servidor.
type GlobalState struct {
	MeuSetor     string
	MeuNamespace string
	ServerPort   int
	ConfigData   *Config

	EthClient       *ethclient.Client
	Contract        *contract.OrmuzConsortium
	ContractAddress common.Address

	RadaresMu    sync.RWMutex
	Radares      map[string]net.Conn
	SensoresMu   sync.RWMutex
	Sensores     map[string]*net.UDPAddr
	DronesMu     sync.RWMutex
	DronesLocais map[string]net.Conn

	FrotaMu     sync.RWMutex
	FrotaGlobal map[string]EstadoDrone

	AlertQueue  *AlertQueue
	FilaMissoes *FilaDeMissoes
}

// NewGlobalState cria o estado global inicializado com as estruturas de fila e mapas vazios.
func NewGlobalState(meuSetor string, cfg *Config, maxQueueSize, starveThreshold int) *GlobalState {
	gs := &GlobalState{
		MeuSetor:      meuSetor,
		MeuNamespace:  "ORMUZ/" + meuSetor,
		ServerPort:    cfg.ServerPort,
		ConfigData:    cfg,
		Radares:       make(map[string]net.Conn),
		Sensores:      make(map[string]*net.UDPAddr),
		DronesLocais:  make(map[string]net.Conn),
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

	fm := &FilaDeMissoes{
		Missoes: make([]Missao, 0),
	}
	fm.Cond = sync.NewCond(&fm.Mu)
	gs.FilaMissoes = fm

	return gs
}

