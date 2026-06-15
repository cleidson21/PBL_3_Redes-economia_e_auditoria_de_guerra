import { useState, useEffect, useCallback } from "react";
import { getSaldo, getWalletAddress } from "../services/web3";

export function useBalance() {
  const [balance, setBalance] = useState<string>("0.0");
  const [address, setAddress] = useState<string>("");

  const fetchBalance = useCallback(async () => {
    try {
      const addr = await getWalletAddress();
      const bal = await getSaldo();
      setAddress(addr);
      setBalance(bal);
    } catch (err) {
      console.error("Erro ao buscar saldo", err);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, address, refetchBalance: fetchBalance };
}
