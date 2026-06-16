export type MissionStatus =
  | "PENDENTE"
  | "CONCLUIDO"
  | "FALHOU";

export interface Mission {
  id: number;
  prioridade: number;
  cliente: string;
  createdAt: number;
  deadline: number;
  status: MissionStatus;
  escrowAmount: string;
  reporter?: string;
  reportData?: string;
}
