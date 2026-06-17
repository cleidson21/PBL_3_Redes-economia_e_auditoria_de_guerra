import { useState, useEffect } from "react";
import { CONSORTIUM_WALLETS, contract } from "../services/web3";
import { ethers } from "ethers";
import { Users } from "lucide-react";

interface ConsortiumBalance {
  address: string;
  balance: string;
}

export function ConsortiumView() {
  const [balances, setBalances] = useState<ConsortiumBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBalances = async () => {
    if (!CONSORTIUM_WALLETS) {
      setLoading(false);
      return;
    }

    try {
      const addresses = CONSORTIUM_WALLETS.split(",").map(a => a.trim()).filter(a => a.length > 0);
      const newBalances: ConsortiumBalance[] = [];
      for (const addr of addresses) {
        const balWei = await contract.balanceOf(addr);
        newBalances.push({ address: addr, balance: ethers.formatEther(balWei) });
      }
      
      // Sort desc
      newBalances.sort((a, b) => Number(b.balance) - Number(a.balance));
      setBalances(newBalances);
    } catch (err) {
      console.error("Failed to fetch consortium balances:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="animate-pulse bg-slate-900 h-40 rounded-xl border border-slate-800"></div>;
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-fuchsia-400" />
        <h2 className="text-lg font-bold text-slate-100">Consórcio (Leaderboard Local)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.length === 0 ? (
          <div className="text-slate-500 text-sm">Nenhuma carteira configurada no CONSORTIUM_WALLETS.</div>
        ) : (
          balances.map((b, idx) => (
            <div key={b.address} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-mono">{b.address.substring(0, 6)}...{b.address.substring(38)}</div>
                  <div className="text-sm font-semibold text-emerald-400">{b.balance} OPC</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
