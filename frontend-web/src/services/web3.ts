import { ethers } from "ethers";
import OrmuzConsortiumArtifact from "../abi/OrmuzConsortium.json";
import type { Mission, MissionStatus } from "../types/mission";

const RPC_URL = import.meta.env.VITE_RPC_URL;
const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY;
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !CONTRACT_ADDRESS) {
  throw new Error("Variáveis Web3 não configuradas.");
}

export const provider = new ethers.JsonRpcProvider(RPC_URL);
export const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

export const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  OrmuzConsortiumArtifact.abi,
  wallet
);

export const getWalletAddress = async (): Promise<string> => {
  return await wallet.getAddress();
};

export const getSaldo = async (): Promise<string> => {
  const address = await getWalletAddress();
  const saldoWei = await contract.balanceOf(address);
  return ethers.formatEther(saldoWei);
};

export const mintTokens = async (amount: number): Promise<ethers.TransactionReceipt> => {
  const address = await getWalletAddress();
  const amountWei = ethers.parseEther(amount.toString());
  const tx = await contract.mint(address, amountWei);
  return await tx.wait();
};

export const solicitarEscolta = async (prioridade: number): Promise<ethers.TransactionReceipt> => {
  const tx = await contract.payForEscort(prioridade);
  return await tx.wait();
};

export const reclamarReembolso = async (missionId: number): Promise<ethers.TransactionReceipt> => {
  const tx = await contract.reclamarReembolso(missionId);
  return await tx.wait();
};

const mapStatus = (status: bigint): MissionStatus => {
  if (status === 0n) return "PENDENTE";
  if (status === 1n) return "CONCLUIDO";
  return "FALHOU";
};

export const buscarMissao = async (id: number): Promise<Mission> => {
  const data = await contract.missions(id);
  if (data.id === 0n) {
    throw new Error("MissionNotFound");
  }
  return {
    id: Number(data.id),
    cliente: data.client,
    prioridade: Number(data.prioridade),
    escrowAmount: ethers.formatEther(data.escrowAmount),
    createdAt: Number(data.createdAt),
    deadline: Number(data.deadline),
    status: mapStatus(data.status),
    reporter: data.reporter,
    reportData: data.reportData
  };
};

export const listarMissoes = async (): Promise<Mission[]> => {
  const address = await getWalletAddress();
  const missionsList: Mission[] = [];
  
  // Como o contador é privado no contrato, varremos até encontrar um ID 0 (vazio)
  let id = 1;
  while (true) {
    const data = await contract.missions(id);
    if (data.id === 0n) {
      break;
    }
    // Filtrar apenas as missões desta empresa (Carteira conectada)
    if (data.client === address) {
      missionsList.push({
        id: Number(data.id),
        cliente: data.client,
        prioridade: Number(data.prioridade),
        escrowAmount: ethers.formatEther(data.escrowAmount),
        createdAt: Number(data.createdAt),
        deadline: Number(data.deadline),
        status: mapStatus(data.status),
        reporter: data.reporter,
        reportData: data.reportData
      });
    }
    id++;
  }
  
  // Retorna as mais recentes primeiro
  return missionsList.reverse();
};
