import type { Mission } from "../types/mission";
import { Countdown } from "./Countdown";
import { reclamarReembolso } from "../services/web3";
import { useState, useEffect } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function MissionTable({ missions, onUpdate }: { missions: Mission[], onUpdate: () => void }) {
  const [refunding, setRefunding] = useState<number | null>(null);
  
  // Forçar re-render leve a cada segundo apenas para recalcular a visibilidade do botão de Reembolso na tabela sem afetar o RPC
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefund = async (id: number) => {
    setRefunding(id);
    try {
      await reclamarReembolso(id);
      onUpdate();
    } catch (err: any) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Falha ao processar reembolso.", type: "error" }}));
    } finally {
      setRefunding(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      <div className="p-5 border-b border-slate-800 bg-slate-900/50">
        <h3 className="text-base font-semibold text-slate-100">Auditoria Operacional</h3>
        <p className="text-sm text-slate-400">Laudos e Contratos em Escrow vinculados à sua carteira</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Prioridade</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Escrow</th>
              <th className="px-5 py-3">Tempo Restante</th>
              <th className="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {missions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  Nenhuma ordem de serviço rastreada.
                </td>
              </tr>
            ) : (
              missions.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-mono text-slate-200">#{m.id}</td>
                  <td className="px-5 py-4">
                    {m.prioridade === 1 ? (
                      <span className="text-blue-400">Normal</span>
                    ) : (
                      <span className="text-amber-400 font-medium">Crítica</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold tracking-wide rounded-md border 
                      ${m.status === 'CONCLUIDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        m.status === 'FALHOU' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-200">{m.escrowAmount} OPC</td>
                  <td className="px-5 py-4">
                    <Countdown 
                      deadline={m.deadline} 
                      status={m.status} 
                      onZero={() => {}} 
                    />
                  </td>
                  <td className="px-5 py-4 flex items-center justify-end gap-2">
                    {m.status === 'PENDENTE' && now >= m.deadline && (
                      <button 
                        onClick={() => handleRefund(m.id)}
                        disabled={refunding === m.id}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 rounded text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {refunding === m.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        Invocar Timeout
                      </button>
                    )}
                    <Link to={`/missao/${m.id}`} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors border border-slate-700 hover:border-slate-600" title="Auditoria Completa">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
