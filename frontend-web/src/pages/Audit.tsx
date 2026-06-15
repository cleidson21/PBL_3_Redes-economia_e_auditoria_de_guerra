import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { buscarMissao } from "../services/web3";
import { Mission } from "../types/mission";
import { ArrowLeft, Loader2, ShieldCheck, User, Clock, AlertTriangle, FileText } from "lucide-react";

export function Audit() {
  const { id } = useParams();
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchIt = async () => {
      try {
        const data = await buscarMissao(Number(id));
        setMission(data);
      } catch (err) {
        setError("Não foi possível rastrear a Ordem na Blockchain.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchIt();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (error || !mission) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <Link to="/" className="text-blue-500 hover:text-blue-400 flex items-center gap-2 mb-8"><ArrowLeft className="w-4 h-4"/> Voltar</Link>
        <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="text-slate-400 hover:text-slate-200 flex items-center gap-2 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4"/> Voltar para Central
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <ShieldCheck className="w-7 h-7 text-emerald-500" />
                Auditoria de Missão #{mission.id}
              </h1>
              <p className="text-slate-400 mt-1">Leitura On-Chain via Smart Contract Ormuz</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full border text-sm font-bold tracking-wide
              ${mission.status === 'CONCLUIDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                mission.status === 'FALHOU' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
              STATUS: {mission.status}
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1"><User className="w-3 h-3"/> Cliente Solicitante</label>
                <div className="text-sm font-mono text-slate-200 bg-slate-950 p-3 rounded border border-slate-800 break-all">{mission.cliente}</div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1"><AlertTriangle className="w-3 h-3"/> Grau de Prioridade</label>
                <div className="text-sm text-slate-200 bg-slate-950 p-3 rounded border border-slate-800">
                  {mission.prioridade === 1 ? 'Nível 1 (Normal) - 5 OPC' : 'Nível 2 (Crítica) - 10 OPC'}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1"><Clock className="w-3 h-3"/> Criação e Timestamp EVM</label>
                <div className="text-sm text-slate-300 bg-slate-950 p-3 rounded border border-slate-800">
                  {new Date(mission.createdAt * 1000).toLocaleString()} (Unix: {mission.createdAt})
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1"><FileText className="w-3 h-3"/> Laudo Técnico (Report Data)</label>
                <div className="text-sm font-mono text-slate-300 bg-slate-950 p-3 rounded border border-slate-800 h-24 overflow-y-auto break-all">
                  {mission.reportData || "Nenhum laudo anexado."}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1"><ShieldCheck className="w-3 h-3"/> Assinatura do Oracle (Reporter)</label>
                <div className="text-sm font-mono text-slate-400 bg-slate-950 p-3 rounded border border-slate-800 break-all">
                  {mission.reporter !== "0x0000000000000000000000000000000000000000" ? mission.reporter : "Aguardando conclusão..."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
