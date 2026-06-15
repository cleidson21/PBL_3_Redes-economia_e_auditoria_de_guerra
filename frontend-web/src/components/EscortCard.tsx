import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { solicitarEscolta } from "../services/web3";

interface EscortCardProps {
  prioridade: number; // 1 for Normal, 2 for Critical
  custo: number;
  onUpdate: () => void;
}

export function EscortCard({ prioridade, custo, onUpdate }: EscortCardProps) {
  const [loading, setLoading] = useState(false);
  const isCritical = prioridade === 2;

  const handleRequest = async () => {
    setLoading(true);
    try {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Transação enviada... Aguarde confirmação na Blockchain.", type: "info" }}));
      await solicitarEscolta(prioridade);
      onUpdate();
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("InsufficientBalance")) {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Saldo OPC insuficiente para o despacho.", type: "error" }}));
      } else {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: "Transação de Escolta rejeitada.", type: "error" }}));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-slate-900 border rounded-xl p-6 flex flex-col justify-between ${isCritical ? 'border-amber-500/30' : 'border-slate-800'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            {isCritical ? "Escolta Crítica" : "Escolta Normal"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Custo da operação: <span className="text-slate-200 font-medium">{custo} OPC</span></p>
        </div>
        <div className={`p-3 rounded-lg border ${isCritical ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
          <Shield className={`w-6 h-6 ${isCritical ? 'text-amber-400' : 'text-blue-400'}`} />
        </div>
      </div>
      
      <button
        onClick={handleRequest}
        disabled={loading}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors border disabled:opacity-50 flex items-center justify-center gap-2
          ${isCritical 
            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border-amber-500/50' 
            : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/50'}`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Processando Tx..." : "Solicitar Despacho"}
      </button>
    </div>
  );
}
