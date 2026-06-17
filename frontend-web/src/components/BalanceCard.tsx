import { Coins } from "lucide-react";

interface BalanceCardProps {
  balance: string;
}

export function BalanceCard({ balance }: BalanceCardProps) {

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

    </div>
  );
}
