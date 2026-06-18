import { useState, useEffect } from "react";
import { ORACLE_URL, solicitarEscolta } from "../services/web3";
import { AlertCircle, Zap, ShieldAlert, Loader2 } from "lucide-react";

interface Alert {
  Coordenada: string;
  Prioridade: number;
  Timestamp: number;
  ID: string;
}

interface Props {
  onUpdate: () => void;
}

export function AlertQueue({ onUpdate }: Props) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${ORACLE_URL}/api/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data || []);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDispatch = async (alertId: string, prioridade: number) => {
    setLoadingId(alertId);
    try {
      // O Oracle não cria missões localmente. O despacho submete a mesma transação
      // do Smart Contract usada pelo CLI, preservando validações e escrow na Blockchain.
      await solicitarEscolta(prioridade);
      setDispatchedIds(prev => new Set(prev).add(alertId));
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Despacho autorizado via Blockchain!", type: "success" }}));
      onUpdate();
      fetchAlerts();
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: err.message || "Erro no despacho Blockchain", type: "error" }}));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold text-slate-100">Fila de Alertas (Sugestão Operacional)</h2>
      </div>

      {alerts.filter(al => !dispatchedIds.has(al.ID)).length === 0 ? (
        <div className="text-center py-6 text-slate-500">Nenhum alerta pendente.</div>
      ) : (
        <div className="space-y-3">
          {alerts.filter(al => !dispatchedIds.has(al.ID)).map((al) => (
            <div key={al.ID} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className={al.Prioridade === 2 ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>
                    {al.Prioridade === 2 ? "CRÍTICO" : "NORMAL"}
                  </span>
                  <span className="text-slate-300 text-sm">Alvo: {al.Coordenada}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">ID Local: {al.ID}</div>
              </div>
              <div className="mt-3 md:mt-0">
                <button
                  onClick={() => handleDispatch(al.ID, al.Prioridade)}
                  disabled={loadingId !== null}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    al.Prioridade === 2 
                      ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30" 
                      : "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
                  } disabled:opacity-50`}
                >
                  {loadingId === al.ID ? <Loader2 className="w-4 h-4 animate-spin" /> : (al.Prioridade === 2 ? <ShieldAlert className="w-4 h-4" /> : <Zap className="w-4 h-4" />)}
                  Submeter Web3 ({al.Prioridade === 2 ? "10 OPC" : "5 OPC"})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
