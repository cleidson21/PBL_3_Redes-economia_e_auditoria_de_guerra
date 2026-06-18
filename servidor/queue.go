package main

import (
	"encoding/json"
	"fmt"
	"time"
)



// ExecutarDespacho escolhe um drone livre local e encaminha o comando de despacho.
func ExecutarDespacho(gs *GlobalState, requisicaoID string, coordenada string, prioridade int) {
	var droneEscolhido string

	gs.FrotaMu.Lock()
	for id, estado := range gs.FrotaGlobal {
		if estado.Status == "LIVRE" && estado.Setor == gs.MeuSetor {
			droneEscolhido = id
			estado.Status = "EM_MISSAO"
			estado.MissionId = requisicaoID
			estado.SeenAt = time.Now().UnixNano()
			gs.FrotaGlobal[id] = estado
			break
		}
	}
	gs.FrotaMu.Unlock()

	if droneEscolhido == "" {
		if ok := gs.AlertQueue.EnqueueAlert(gs, coordenada, prioridade, requisicaoID); !ok {
			fmt.Printf("⚠️ [RACE CONDITION] Falha ao re-enfileirar alerta %s após perder o drone.\n", coordenada)
		}
		fmt.Printf("⚠️ [RACE CONDITION] Sem drones livres locais. Re-enfileirando alerta (%s).\n", coordenada)
		return
	}

	gs.DronesMu.RLock()
	connDrone, ok := gs.DronesLocais[droneEscolhido]
	gs.DronesMu.RUnlock()

	if ok {
		cmdMsg := Mensagem{
			Tipo:    "CMD",
			Acao:    "DESPACHAR",
			Posicao: coordenada,
		}
		payload, err := json.Marshal(cmdMsg)
		if err == nil {
			_, err = fmt.Fprintf(connDrone, "%s\n", payload)
		}
		if err != nil {
			fmt.Printf("❌ Erro ao enviar comando ao drone local %s: %v\n", droneEscolhido, err)
			gs.FrotaMu.Lock()
			if estado, existe := gs.FrotaGlobal[droneEscolhido]; existe {
				estado.Status = "LIVRE"
				estado.SeenAt = time.Now().UnixNano()
				gs.FrotaGlobal[droneEscolhido] = estado
			}
			gs.FrotaMu.Unlock()
		} else {
			fmt.Printf("🎯 [DESPACHO LOCAL] Alvo: %s | Drone: %s (P:%d)\n", coordenada, droneEscolhido, prioridade)
		}
	} else {
		fmt.Printf("⚠️ Drone local %s não está conectado em DronesLocais!\n", droneEscolhido)
		gs.FrotaMu.Lock()
		if estado, existe := gs.FrotaGlobal[droneEscolhido]; existe {
			estado.Status = "LIVRE"
			estado.SeenAt = time.Now().UnixNano()
			gs.FrotaGlobal[droneEscolhido] = estado
		}
		gs.FrotaMu.Unlock()
	}
}

// EnqueueAlert insere um alerta na fila correta respeitando o limite de capacidade de cada prioridade.
func (aq *AlertQueue) EnqueueAlert(gs *GlobalState, coordenada string, prioridade int, idRequisicao string) bool {
	aq.mu.Lock()
	defer aq.mu.Unlock()

	alert := Alert{
		Coordenada:    coordenada,
		Prioridade:    prioridade,
		Timestamp:     time.Now().UnixNano(),
		ID:            idRequisicao,
		StarveCounter: 0,
	}
	if alert.ID == "" {
		alert.ID = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	if prioridade == 2 {
		if len(aq.critical) >= aq.maxSize {
			fmt.Printf("⚠️ Fila crítica CHEIA! Alerta crítico rejeitado para: %s\n", coordenada)
			return false
		}
		aq.critical = append(aq.critical, alert)
		fmt.Printf("📥 Alerta CRÍTICO enfileirado para: %s | Fila crítica: %d\n", coordenada, len(aq.critical))
	} else {
		if len(aq.normal) >= aq.maxSize {
			fmt.Printf("⚠️ Fila normal CHEIA! Alerta normal rejeitado para: %s\n", coordenada)
			return false
		}
		aq.normal = append(aq.normal, alert)
		fmt.Printf("📥 Alerta NORMAL enfileirado para: %s | Fila normal: %d\n", coordenada, len(aq.normal))
	}

	aq.notEmpty.Signal()
	return true
}

// DequeueAlert bloqueia até existir trabalho e aplica a política de starvation prevention.
func (aq *AlertQueue) DequeueAlert() Alert {
	aq.mu.Lock()
	defer aq.mu.Unlock()

	for len(aq.critical) == 0 && len(aq.normal) == 0 {
		aq.notEmpty.Wait()
	}

	if len(aq.normal) > 0 && aq.processedCount >= aq.starveThreshold {
		alert := aq.normal[0]
		aq.normal = aq.normal[1:]
		alert.Prioridade = 2
		aq.processedCount = 0
		fmt.Printf("🚀 Starvation Prevention: alerta normal foi PROMOVIDO para CRÍTICO!\n")
		return alert
	}

	if len(aq.critical) > 0 {
		alert := aq.critical[0]
		aq.critical = aq.critical[1:]
		aq.processedCount++
		return alert
	}

	alert := aq.normal[0]
	aq.normal = aq.normal[1:]
	return alert
}

func (aq *AlertQueue) QueueStats() (criticalCount, normalCount int) {
	aq.mu.Lock()
	defer aq.mu.Unlock()
	return len(aq.critical), len(aq.normal)
}

// GetPendingAlerts retorna uma copia das listas de alertas pendentes.
func (aq *AlertQueue) GetPendingAlerts() []Alert {
	aq.mu.Lock()
	defer aq.mu.Unlock()
	alerts := make([]Alert, 0, len(aq.critical)+len(aq.normal))
	alerts = append(alerts, aq.critical...)
	alerts = append(alerts, aq.normal...)
	return alerts
}

// TryDequeueAlert tenta consumir um alerta da fila sem bloquear, para ser associado a uma missão Web3.
func (aq *AlertQueue) TryDequeueAlert() (Alert, bool) {
	aq.mu.Lock()
	defer aq.mu.Unlock()

	if len(aq.normal) > 0 && aq.processedCount >= aq.starveThreshold {
		alert := aq.normal[0]
		aq.normal = aq.normal[1:]
		alert.Prioridade = 2
		aq.processedCount = 0
		fmt.Printf("🚀 Starvation Prevention: alerta normal foi PROMOVIDO para CRÍTICO no Web3!\n")
		return alert, true
	}

	if len(aq.critical) > 0 {
		alert := aq.critical[0]
		aq.critical = aq.critical[1:]
		aq.processedCount++
		return alert, true
	}

	if len(aq.normal) > 0 {
		alert := aq.normal[0]
		aq.normal = aq.normal[1:]
		return alert, true
	}

	return Alert{}, false
}

// ProcessarFilaDrones é o worker que consome a FilaDeMissoes e gerencia o estado de ocupação do Drone
func ProcessarFilaDrones(gs *GlobalState) {
	for {
		var missao Missao
		var droneEscolhido string

		gs.FilaMissoes.Mu.Lock()
		for len(gs.FilaMissoes.Missoes) == 0 {
			gs.FilaMissoes.Cond.Wait()
		}

		// Encontrar um drone livre
		for {
			gs.FrotaMu.RLock()
			for id, estado := range gs.FrotaGlobal {
				if !estado.Ocupado && estado.Status == "LIVRE" && estado.Setor == gs.MeuSetor {
					droneEscolhido = id
					break
				}
			}
			gs.FrotaMu.RUnlock()

			if droneEscolhido != "" {
				break
			}
			// Libera o lock da fila enquanto dorme para não bloquear o produtor
			gs.FilaMissoes.Mu.Unlock()
			time.Sleep(1 * time.Second)
			gs.FilaMissoes.Mu.Lock()
			
			if len(gs.FilaMissoes.Missoes) == 0 {
				break
			}
		}

		if len(gs.FilaMissoes.Missoes) == 0 {
			// Pode ter esvaziado durante o sleep
			if droneEscolhido == "" {
				gs.FilaMissoes.Mu.Unlock()
			}
			continue
		}

		// Pop da missão
		missao = gs.FilaMissoes.Missoes[0]
		gs.FilaMissoes.Missoes = gs.FilaMissoes.Missoes[1:]
		gs.FilaMissoes.Mu.Unlock()

		// Marcar como Ocupado
		gs.FrotaMu.Lock()
		if estado, ok := gs.FrotaGlobal[droneEscolhido]; ok {
			estado.Ocupado = true
			estado.Status = "EM_MISSAO"
			estado.MissionId = missao.MissionId
			estado.SeenAt = time.Now().UnixNano()
			gs.FrotaGlobal[droneEscolhido] = estado
		}
		gs.FrotaMu.Unlock()

		// Despachar para o drone físico
		gs.DronesMu.RLock()
		connDrone, ok := gs.DronesLocais[droneEscolhido]
		gs.DronesMu.RUnlock()

		if ok {
			cmdMsg := Mensagem{
				Tipo:    "CMD",
				Acao:    "DESPACHAR",
				Posicao: missao.Coordenadas,
			}
			payload, err := json.Marshal(cmdMsg)
			if err == nil {
				_, err = fmt.Fprintf(connDrone, "%s\n", payload)
			}
			if err != nil {
				fmt.Printf("❌ Erro ao enviar comando da Fila ao drone %s: %v\n", droneEscolhido, err)
				gs.FrotaMu.Lock()
				if estado, existe := gs.FrotaGlobal[droneEscolhido]; existe {
					estado.Ocupado = false
					estado.Status = "LIVRE"
					estado.SeenAt = time.Now().UnixNano()
					gs.FrotaGlobal[droneEscolhido] = estado
				}
				gs.FrotaMu.Unlock()
			} else {
				fmt.Printf("🎯 [FILA DESPACHO] Missão: %s | Drone: %s\n", missao.MissionId, droneEscolhido)
			}
		} else {
			fmt.Printf("⚠️ Drone %s não conectado ao tentar despachar da Fila!\n", droneEscolhido)
			gs.FrotaMu.Lock()
			if estado, existe := gs.FrotaGlobal[droneEscolhido]; existe {
				estado.Ocupado = false
				estado.Status = "LIVRE"
				estado.SeenAt = time.Now().UnixNano()
				gs.FrotaGlobal[droneEscolhido] = estado
			}
			gs.FrotaMu.Unlock()
		}
	}
}
