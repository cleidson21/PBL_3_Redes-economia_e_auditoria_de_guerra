import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { mintTokens } from "../services/web3";

interface BalanceCardProps {
  balance: string;
  onUpdate: () => void;
}

export function BalanceCard({ balance, onUpdate }: BalanceCardProps) {
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    setLoading(true);
    try {
      await mintTokens(50);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Mint de 50 OPC concluído!", type: "success" }}));
      onUpdate();
    } catch (err) {
      console.error(err);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Erro ao mintar tokens.", type: "error" }}));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-400 mb-1">Cofre Logístico</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-100">{balance}</span>
            <span className="text-emerald-500 font-semibold tracking-wide">OPC</span>
          </div>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Coins className="w-6 h-6 text-emerald-400" />
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800">
        <button
          onClick={handleMint}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-lg text-sm font-medium transition-colors border border-slate-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
          Mintar 50 OPC (Teste)
        </button>
      </div>
    </div>
  );
}
