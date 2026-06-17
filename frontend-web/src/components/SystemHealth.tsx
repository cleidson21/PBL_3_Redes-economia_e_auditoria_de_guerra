import { useState, useEffect } from "react";
import { ORACLE_URL, provider, CONTRACT_ADDRESS } from "../services/web3";
import { Activity } from "lucide-react";

interface HealthStatus {
  status: string;
  oracleWallet: string;
  connectedDrones: number;
  pendingAlerts: number;
  uptimeSeconds: number;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [rpcOnline, setRpcOnline] = useState(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch(`${ORACLE_URL}/api/health`);
        if (res.ok) {
          const data = await res.json();
          setHealth(data);
        } else {
          setHealth(null);
        }
      } catch (err) {
        setHealth(null);
      }
    };

    const fetchBlock = async () => {
      try {
        const block = await provider.getBlockNumber();
        setLatestBlock(block);
        setRpcOnline(true);
      } catch (err) {
        setRpcOnline(false);
      }
    };

    fetchHealth();
    fetchBlock();

    const interval = setInterval(() => {
      fetchHealth();
      fetchBlock();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-400" />
        <h2 className="text-lg font-bold text-slate-100">System Health</h2>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="text-slate-400">Blockchain RPC</span>
          <span className={rpcOnline ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
            {rpcOnline ? `Online (Bloco: ${latestBlock})` : "Offline"}
          </span>
        </div>
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="text-slate-400">Smart Contract</span>
          <span className="text-emerald-400 font-mono text-xs">{CONTRACT_ADDRESS.substring(0, 8)}...</span>
        </div>

        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
          <span className="text-slate-400">Oracle Backend</span>
          <span className={health ? "text-emerald-400 font-medium" : "text-rose-400 font-medium"}>
            {health ? "Online" : "Offline"}
          </span>
        </div>

        {health && (
          <>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">Oracle Wallet</span>
              <span className="text-indigo-300 font-mono text-xs">{health.oracleWallet || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">Drones Conectados</span>
              <span className="text-slate-200">{health.connectedDrones}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-slate-400">Alertas Pendentes</span>
              <span className={health.pendingAlerts > 0 ? "text-amber-400" : "text-slate-200"}>
                {health.pendingAlerts}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
