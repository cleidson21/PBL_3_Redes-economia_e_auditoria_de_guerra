import { ShieldAlert, Activity } from "lucide-react";

interface HeaderProps {
  address: string;
  isOnline: boolean;
}

export function Header({ address, isOnline }: HeaderProps) {
  const formatAddress = (addr: string) => {
    if (!addr) return "Desconectado";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <ShieldAlert className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Ormuz Consortium
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              CENTRAL TÁTICA DE ESCOLTA NAVAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
            <Activity className={`w-4 h-4 ${isOnline ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className="text-sm font-medium text-slate-300">
              {isOnline ? 'Blockchain Online' : 'Blockchain Offline'}
            </span>
          </div>

          <div className="bg-slate-950 px-4 py-1.5 rounded-md border border-slate-800 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-mono text-slate-300">
              {formatAddress(address)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
