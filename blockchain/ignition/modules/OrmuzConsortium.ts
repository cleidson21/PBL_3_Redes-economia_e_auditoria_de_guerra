import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OrmuzConsortiumModule = buildModule("OrmuzConsortiumModule", (m) => {
  // A Conta #0 do nó local do Hardhat será usada como deployer
  const deployer = m.getAccount(0);

  // Fazemos o deploy do contrato
  // Não há argumentos no construtor do OrmuzConsortium
  const ormuzConsortium = m.contract("OrmuzConsortium", [], {
    from: deployer,
  });

  // O deployer já recebe as roles MINTER_ROLE e DEFAULT_ADMIN_ROLE pelo construtor.
  // Conforme o requisito e a dica, faremos a emissão de 10.000 OPC (usando 18 casas decimais).
  const mintAmount = m.getParameter("mintAmount", 10000n * 10n ** 18n);

  // A função mint é chamada diretamente após a publicação
  m.call(ormuzConsortium, "mint", [deployer, mintAmount], {
    from: deployer,
  });

  return { ormuzConsortium };
});

export default OrmuzConsortiumModule;
