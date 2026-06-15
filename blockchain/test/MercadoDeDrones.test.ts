import { expect } from "chai";
import hre from "hardhat";

describe("MercadoDeDrones", function () {
  let mercado: any;
  let admin: any;
  let treasury: any;
  let reporter: any;
  let client: any;
  let other: any;

  beforeEach(async function () {
    [admin, treasury, reporter, client, other] = await hre.ethers.getSigners();

    const initialSupply = hre.ethers.parseEther("1000"); // 1000 OPC
    const MercadoDeDrones = await hre.ethers.getContractFactory("MercadoDeDrones");
    mercado = await MercadoDeDrones.deploy(initialSupply, treasury.address);

    // Conceder permissão de REPORTER
    const REPORTER_ROLE = await mercado.REPORTER_ROLE();
    await mercado.grantRole(REPORTER_ROLE, reporter.address);

    // Distribuir tokens da tesouraria para o cliente de testes
    await mercado.connect(treasury).distributeOPC(client.address, hre.ethers.parseEther("100"));
  });

  describe("Token Details", function () {
    it("should deploy with correct name, symbol and decimals", async function () {
      expect(await mercado.name()).to.equal("Operational Credits");
      expect(await mercado.symbol()).to.equal("OPC");
      expect(await mercado.decimals()).to.equal(18);
    });

    it("should mint initial supply to treasury", async function () {
      const expectedSupply = hre.ethers.parseEther("1000");
      expect(await mercado.totalSupply()).to.equal(expectedSupply);
      expect(await mercado.balanceOf(treasury.address)).to.equal(hre.ethers.parseEther("900"));
      expect(await mercado.balanceOf(client.address)).to.equal(hre.ethers.parseEther("100"));
    });
  });

  describe("solicitarEscolta", function () {
    it("should allow a client to request a normal priority escort", async function () {
      const price = await mercado.PRECO_ESCOLTA_NORMAL(); // 5 OPC
      
      const balanceBefore = await mercado.balanceOf(client.address);
      const contractBalanceBefore = await mercado.balanceOf(await mercado.getAddress());

      const tx = await mercado.connect(client).solicitarEscolta(0);
      await tx.wait();

      const balanceAfter = await mercado.balanceOf(client.address);
      const contractBalanceAfter = await mercado.balanceOf(await mercado.getAddress());

      expect(balanceBefore - balanceAfter).to.equal(price);
      expect(contractBalanceAfter - contractBalanceBefore).to.equal(price);

      expect(await mercado.totalEscrowBloqueado()).to.equal(price);
      expect(await mercado.totalMissoes()).to.equal(1);

      const nextId = await mercado.proximoIdMissao();
      const missionId = nextId - 1n;
      const mission = await mercado.getMissao(missionId);
      expect(mission.idMissao).to.equal(missionId);
      expect(mission.cliente).to.equal(client.address);
      expect(mission.prioridade).to.equal(0);
      expect(mission.valorEscrow).to.equal(price);
      expect(mission.status).to.equal(0); // PENDENTE
    });

    it("should fail with PrioridadeInvalida if priority is not 0 or 1", async function () {
      await expect(mercado.connect(client).solicitarEscolta(2))
        .to.be.revertedWithCustomError(mercado, "PrioridadeInvalida");
    });

    it("should fail with SaldoInsuficiente if client does not have enough balance", async function () {
      await expect(mercado.connect(other).solicitarEscolta(0))
        .to.be.revertedWithCustomError(mercado, "SaldoInsuficiente");
    });
  });

  describe("registrarLaudo", function () {
    let missionId: bigint;

    beforeEach(async function () {
      const tx = await mercado.connect(client).solicitarEscolta(1); // crítica: 10 OPC
      await tx.wait();
      const nextId = await mercado.proximoIdMissao();
      missionId = nextId - 1n;
    });

    it("should allow a reporter to file a report and release funds to treasury", async function () {
      const price = await mercado.PRECO_ESCOLTA_CRITICA();
      const treasuryBalanceBefore = await mercado.balanceOf(treasury.address);

      const tx = await mercado.connect(reporter).registrarLaudo(missionId, "VAZAMENTO_DETECTADO");
      await tx.wait();

      const treasuryBalanceAfter = await mercado.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(price);

      const mission = await mercado.getMissao(missionId);
      expect(mission.status).to.equal(1); // CONCLUIDO
      expect(mission.laudo).to.equal("VAZAMENTO_DETECTADO");
      expect(mission.reporter).to.equal(reporter.address);

      expect(await mercado.totalEscrowBloqueado()).to.equal(0);
      expect(await mercado.totalConcluidas()).to.equal(1);
    });

    it("should reject non-reporters", async function () {
      const REPORTER_ROLE = await mercado.REPORTER_ROLE();
      // Em AccessControl do OpenZeppelin v5, a mensagem de revert do role tem um padrão específico
      await expect(mercado.connect(client).registrarLaudo(missionId, "VAZAMENTO_DETECTADO"))
        .to.be.revertedWithCustomError(mercado, "AccessControlUnauthorizedAccount");
    });

    it("should fail with MissaoJaFinalizada if report is already registered", async function () {
      await mercado.connect(reporter).registrarLaudo(missionId, "VAZAMENTO_DETECTADO");
      await expect(mercado.connect(reporter).registrarLaudo(missionId, "NOVO_ESTADO"))
        .to.be.revertedWithCustomError(mercado, "MissaoJaFinalizada");
    });
  });

  describe("reclamarReembolso", function () {
    let missionId: bigint;

    beforeEach(async function () {
      const tx = await mercado.connect(client).solicitarEscolta(0); // normal: 5 OPC
      await tx.wait();
      const nextId = await mercado.proximoIdMissao();
      missionId = nextId - 1n;
    });

    it("should fail before deadline expires", async function () {
      await expect(mercado.connect(client).reclamarReembolso(missionId))
        .to.be.revertedWithCustomError(mercado, "PrazoAindaNaoExpirou");
    });

    it("should allow client refund after deadline expires", async function () {
      const price = await mercado.PRECO_ESCOLTA_NORMAL();
      const clientBalanceBefore = await mercado.balanceOf(client.address);

      // Avançar tempo na blockchain simulada
      await hre.network.provider.send("evm_increaseTime", [31]);
      await hre.network.provider.send("evm_mine");

      const tx = await mercado.connect(client).reclamarReembolso(missionId);
      await tx.wait();

      const clientBalanceAfter = await mercado.balanceOf(client.address);
      expect(clientBalanceAfter - clientBalanceBefore).to.equal(price);

      const mission = await mercado.getMissao(missionId);
      expect(mission.status).to.equal(2); // FALHOU

      expect(await mercado.totalEscrowBloqueado()).to.equal(0);
      expect(await mercado.totalFalhas()).to.equal(1);
    });

    it("should reject refund requests from non-clients", async function () {
      await hre.network.provider.send("evm_increaseTime", [31]);
      await hre.network.provider.send("evm_mine");

      await expect(mercado.connect(other).reclamarReembolso(missionId))
        .to.be.revertedWithCustomError(mercado, "NaoEhClienteDaMissao");
    });
  });
});
