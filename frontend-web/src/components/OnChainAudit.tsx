import { useState, useEffect } from "react";
import type { Mission } from "../types/mission";
import { listarTodasMissoes, provider } from "../services/web3";
import { Database, Link2 } from "lucide-react";

export function OnChainAudit() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [blockTime, setBlockTime] = useState<number>(0);

  const fetchAudit = async () => {
    try {
      const allMissions = await listarTodasMissoes();
      setMissions(allMissions);
      const block = await provider.getBlock("latest");
      if (block) {
        setBlockTime(block.timestamp);
      }
    } catch (err) {
      console.error("Failed to fetch on-chain audit:", err);
    }
  };

  useEffect(() => {
    fetchAudit();
    const interval = setInterval(fetchAudit, 10000); // 10s sync
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-8">
      <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" /> Auditoria On-Chain (Ledger Imutável)
          </h3>
          <p className="text-sm text-slate-400">Leitura direta do Smart Contract</p>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
          Último Sync: {blockTime > 0 ? new Date(blockTime * 1000).toLocaleTimeString() : "Carregando..."}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
            <tr>
              <th className="px-5 py-3">ID</th>
              <th className="px-5 py-3">Payer (Client)</th>
              <th className="px-5 py-3">Value</th>
              <th className="px-5 py-3">Timestamp (Criado)</th>
              <th className="px-5 py-3">Oracle (Reporter)</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {missions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  Nenhuma operação registrada na blockchain.
                </td>
              </tr>
            ) : (
              missions.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-4 font-mono text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3 h-3 text-slate-500" /> #{m.id}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">
                    {m.cliente.substring(0, 8)}...{m.cliente.substring(38)}
                  </td>
                  <td className="px-5 py-4 font-medium text-emerald-400">{m.escrowAmount} OPC</td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(m.createdAt * 1000).toLocaleString()}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-400">
                    {m.reporter !== "0x0000000000000000000000000000000000000000" 
                      ? `${m.reporter.substring(0, 8)}...${m.reporter.substring(38)}` 
                      : "Pendente"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold tracking-wide rounded-md border 
                      ${m.status === 'CONCLUIDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        m.status === 'FALHOU' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                      {m.status}
                    </span>
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
