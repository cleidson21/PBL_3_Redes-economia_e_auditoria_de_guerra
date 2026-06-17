import { useState, useEffect } from "react";
import { ORACLE_URL } from "../services/web3";
import { Crosshair } from "lucide-react";

interface DroneState {
  status: string;
  setor: string;
  seen_at: number;
  missionId?: string;
}

export function FleetDashboard() {
  const [fleet, setFleet] = useState<Record<string, DroneState>>({});

  const fetchFleet = async () => {
    try {
      const res = await fetch(`${ORACLE_URL}/api/drones`);
      if (res.ok) {
        const data = await res.json();
        setFleet(data || {});
      }
    } catch (err) {
      console.error("Failed to fetch drones:", err);
    }
  };

  useEffect(() => {
    fetchFleet();
    const interval = setInterval(fetchFleet, 3000);
    return () => clearInterval(interval);
  }, []);

  const entries = Object.entries(fleet);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crosshair className="w-5 h-5 text-sky-400" />
        <h2 className="text-lg font-bold text-slate-100">Frota de Drones</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">Drone ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Missão Associada</th>
              <th className="px-4 py-3 rounded-tr-lg">Último Sinal</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Nenhum drone conectado.
                </td>
              </tr>
            ) : (
              entries.map(([id, drone]) => (
                <tr key={id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
                  <td className="px-4 py-3 font-mono text-xs text-sky-300">{id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      drone.status === 'LIVRE' ? 'bg-emerald-500/10 text-emerald-400' :
                      drone.status === 'EM_MISSAO' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>
                      {drone.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {drone.missionId || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(drone.seen_at / 1000000).toLocaleTimeString()}
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
