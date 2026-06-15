import { useEffect, useState } from "react";
import { contract, provider } from "../services/web3";

export function useBlockchainEvents(onEvent?: () => void) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const emitToast = (message: string, type: 'success' | 'error' | 'info') => {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
    };

    const onEscortPaid = (missionId: bigint) => {
      emitToast(`Escolta #${missionId} paga e registrada em Escrow.`, 'success');
      if (onEvent) onEvent();
    };

    const onMissionCompleted = (missionId: bigint) => {
      emitToast(`Laudo finalizado para missão #${missionId}.`, 'success');
      if (onEvent) onEvent();
    };

    const onRefundIssued = (missionId: bigint) => {
      emitToast(`Reembolso da missão #${missionId} concluído com sucesso.`, 'info');
      if (onEvent) onEvent();
    };

    contract.on("EscortPaid", onEscortPaid);
    contract.on("MissionCompleted", onMissionCompleted);
    contract.on("RefundIssued", onRefundIssued);

    // Pragmatismo: Health Check básico periodicamente
    const interval = setInterval(async () => {
      try {
        await provider.getBlockNumber();
        setIsOnline(true);
      } catch (err) {
        setIsOnline(false);
      }
    }, 5000);

    return () => {
      contract.off("EscortPaid", onEscortPaid);
      contract.off("MissionCompleted", onMissionCompleted);
      contract.off("RefundIssued", onRefundIssued);
      clearInterval(interval);
    };
  }, [onEvent]);

  return { isOnline };
}
