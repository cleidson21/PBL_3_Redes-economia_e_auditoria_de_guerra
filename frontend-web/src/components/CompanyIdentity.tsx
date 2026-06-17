import { COMPANY_NAME, ACCOUNT_ID, RPC_URL, ORACLE_URL } from "../services/web3";

interface Props {
  address: string;
}

export function CompanyIdentity({ address }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
        🏢 Companhia: {COMPANY_NAME}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
        <div>
          <span className="font-semibold text-slate-400">Conta:</span> Hardhat #{ACCOUNT_ID}
        </div>
        <div>
          <span className="font-semibold text-slate-400">Carteira Cliente:</span> {address || "Carregando..."}
        </div>
        <div>
          <span className="font-semibold text-slate-400">Oracle API:</span> {ORACLE_URL}
        </div>
        <div>
          <span className="font-semibold text-slate-400">RPC Blockchain:</span> {RPC_URL}
        </div>
      </div>
    </div>
  );
}
