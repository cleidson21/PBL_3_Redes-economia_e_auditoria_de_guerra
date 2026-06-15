export type MissionStatus =
  | "PENDENTE"
  | "CONCLUIDO"
  | "FALHOU";

export interface Mission {
  id: number;
  prioridade: number;
  cliente: string;
  deadline: number;
  status: MissionStatus;
  escrowAmount: string;
  reporter?: string;
  reportData?: string;
}
