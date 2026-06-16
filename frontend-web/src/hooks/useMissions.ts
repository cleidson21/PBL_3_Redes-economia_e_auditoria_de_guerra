import { useState, useEffect, useCallback } from "react";
import type { Mission } from "../types/mission";
import { listarMissoes } from "../services/web3";

export function useMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissions = useCallback(async () => {
    try {
      const data = await listarMissoes();
      setMissions(data);
    } catch (err) {
      console.error("Erro ao buscar missões", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return { missions, loading, refetchMissions: fetchMissions };
}
