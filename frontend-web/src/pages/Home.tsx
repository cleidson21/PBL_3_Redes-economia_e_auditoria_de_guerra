import { Header } from "../components/Header";
import { BalanceCard } from "../components/BalanceCard";
import { EscortCard } from "../components/EscortCard";
import { MissionTable } from "../components/MissionTable";
import { useBalance } from "../hooks/useBalance";
import { useMissions } from "../hooks/useMissions";
import { useBlockchainEvents } from "../hooks/useBlockchainEvents";
import { ToastContainer } from "../components/ToastContainer";

export function Home() {
  const { balance, address, refetchBalance } = useBalance();
  const { missions, refetchMissions } = useMissions();
  
  const handleUpdate = () => {
    refetchBalance();
    refetchMissions();
  };

  const { isOnline } = useBlockchainEvents(handleUpdate);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header address={address} isOnline={isOnline} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BalanceCard balance={balance} onUpdate={handleUpdate} />
          <EscortCard prioridade={1} custo={5} onUpdate={handleUpdate} />
          <EscortCard prioridade={2} custo={10} onUpdate={handleUpdate} />
        </div>

        <div>
          <MissionTable missions={missions} onUpdate={handleUpdate} />
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}
