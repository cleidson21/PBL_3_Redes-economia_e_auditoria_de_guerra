import { Header } from "../components/Header";
import { BalanceCard } from "../components/BalanceCard";
import { EscortCard } from "../components/EscortCard";
import { MissionTable } from "../components/MissionTable";
import { CompanyIdentity } from "../components/CompanyIdentity";
import { SystemHealth } from "../components/SystemHealth";
import { AlertQueue } from "../components/AlertQueue";
import { FleetDashboard } from "../components/FleetDashboard";
import { OnChainAudit } from "../components/OnChainAudit";
import { ConsortiumView } from "../components/ConsortiumView";
import { useBalance } from "../hooks/useBalance";
import { useMissions } from "../hooks/useMissions";
import { ToastContainer } from "../components/ToastContainer";

export function Home() {
  const { balance, address, refetchBalance } = useBalance();
  const { missions, refetchMissions } = useMissions();
  
  const handleUpdate = () => {
    refetchBalance();
    refetchMissions();
  };

  return (
    <div className="min-h-screen bg-slate-950 pb-12">
      <Header address={address} isOnline={true} />
      
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <CompanyIdentity address={address} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SystemHealth />
          <AlertQueue onUpdate={handleUpdate} />
        </div>

        <FleetDashboard />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BalanceCard balance={balance} />
          <EscortCard prioridade={1} custo={5} onUpdate={handleUpdate} />
          <EscortCard prioridade={2} custo={10} onUpdate={handleUpdate} />
        </div>

        <div>
          <MissionTable missions={missions} onUpdate={handleUpdate} />
        </div>

        <OnChainAudit />
        <ConsortiumView />
      </main>

      <ToastContainer />
    </div>
  );
}
