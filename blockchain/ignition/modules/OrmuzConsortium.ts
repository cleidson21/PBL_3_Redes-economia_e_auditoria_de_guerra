import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OrmuzConsortiumModule = buildModule("OrmuzConsortiumModule", (m) => {
  // A Conta #0 do nó local do Hardhat será usada como deployer
  const deployer = m.getAccount(0);

  // Fazemos o deploy do contrato
  const ormuzConsortium = m.contract("OrmuzConsortium", [], {
    from: deployer,
  });

  // Quantidade inicial em tokens definida via variável de ambiente (padrão 50 OPC)
  const initialAmountStr = process.env.INITIAL_OPC_PER_ACCOUNT || "50";
  const mintAmount = m.getParameter("mintAmount", BigInt(initialAmountStr) * 10n ** 18n);

  // Distribuir o saldo inicial para as 10 primeiras contas de teste do Hardhat
  for (let i = 0; i < 10; i++) {
    const account = m.getAccount(i);
    m.call(ormuzConsortium, "mint", [account, mintAmount], {
      from: deployer,
      id: `mint_initial_opc_${i}`,
    });
  }

  return { ormuzConsortium };
});

export default OrmuzConsortiumModule;
