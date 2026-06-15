import { expect } from "chai";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

describe("OrmuzConsortium - Refatoração Escrow & Refund", function () {
    let ormuz: any;
    let provider: any;
    let admin: any, client: any, reporter: any, other: any;

    const ESCOLTA_NORMAL = ethers.parseEther("5");

    before(async function () {
        provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        
        admin = new ethers.NonceManager(new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider));
        client = new ethers.NonceManager(new ethers.Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider));
        reporter = new ethers.NonceManager(new ethers.Wallet("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", provider));
        other = new ethers.NonceManager(new ethers.Wallet("0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", provider));
    });

    beforeEach(async function () {
        admin.reset();
        client.reset();
        reporter.reset();
        other.reset();

        const artifactPath = path.resolve(process.cwd(), "artifacts/contracts/OrmuzConsortium.sol/OrmuzConsortium.json");
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
        
        const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, admin);
        ormuz = await factory.deploy();
        await ormuz.waitForDeployment();

        const REPORTER_ROLE = await ormuz.REPORTER_ROLE();
        await (await ormuz.grantRole(REPORTER_ROLE, await reporter.getAddress())).wait();
        await (await ormuz.mint(await client.getAddress(), ethers.parseEther("100"))).wait();
    });

    it("Cenário 1: Pagamento -> Laudo -> Tesouraria recebe OPC", async function () {
        const treasuryBalanceBefore = await ormuz.balanceOf(await admin.getAddress());

        const tx = await ormuz.connect(client).payForEscort(1);
        await tx.wait();

        const mission = await ormuz.missions(1);
        expect(mission.status).to.equal(0n); // PENDENTE
        expect(await ormuz.totalEscrowLocked()).to.equal(ESCOLTA_NORMAL);

        const tx2 = await ormuz.connect(reporter).registerMissionReport(1, "DRONE-01", "0,0", "OK");
        await tx2.wait();

        const missionAfter = await ormuz.missions(1);
        expect(missionAfter.status).to.equal(1n); // CONCLUIDO
        expect(await ormuz.totalEscrowLocked()).to.equal(0n);

        const treasuryBalanceAfter = await ormuz.balanceOf(await admin.getAddress());
        expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(ESCOLTA_NORMAL);
    });

    it("Cenário 2: Pagamento -> Timeout -> Cliente recebe reembolso", async function () {
        const clientBalanceBefore = await ormuz.balanceOf(await client.getAddress());
        
        await (await ormuz.connect(client).payForEscort(1)).wait();

        expect(await ormuz.balanceOf(await client.getAddress())).to.equal(clientBalanceBefore - ESCOLTA_NORMAL);

        await provider.send("evm_increaseTime", [31]);
        await provider.send("evm_mine", []);

        await (await ormuz.connect(client).reclamarReembolso(1)).wait();

        expect(await ormuz.balanceOf(await client.getAddress())).to.equal(clientBalanceBefore);
        const mission = await ormuz.missions(1);
        expect(mission.status).to.equal(2n); // FALHOU
    });

    it("Cenário 3: Tentativa de laudo após timeout deve falhar", async function () {
        await (await ormuz.connect(client).payForEscort(1)).wait();

        await provider.send("evm_increaseTime", [31]);
        await provider.send("evm_mine", []);

        try {
            await (await ormuz.connect(reporter).registerMissionReport(1, "DRONE", "0", "OK")).wait();
            expect.fail("Should have reverted");
        } catch (error: any) {
            expect(error.message).to.include("revert");
        }
    });

    it("Cenário 4: Tentativa de reembolso antes do prazo deve falhar", async function () {
        await (await ormuz.connect(client).payForEscort(1)).wait();

        try {
            await (await ormuz.connect(client).reclamarReembolso(1)).wait();
            expect.fail("Should have reverted");
        } catch (error: any) {
            expect(error.message).to.include("revert");
        }
    });

    it("Cenário 5: Tentativa de reembolso por terceiro deve falhar", async function () {
        await (await ormuz.connect(client).payForEscort(1)).wait();

        await provider.send("evm_increaseTime", [31]);
        await provider.send("evm_mine", []);

        try {
            await (await ormuz.connect(other).reclamarReembolso(1)).wait();
            expect.fail("Should have reverted");
        } catch (error: any) {
            expect(error.message).to.include("revert");
        }
    });

    it("Cenário 6: Double Refund deve falhar", async function () {
        await (await ormuz.connect(client).payForEscort(1)).wait();

        await provider.send("evm_increaseTime", [31]);
        await provider.send("evm_mine", []);

        await (await ormuz.connect(client).reclamarReembolso(1)).wait();

        try {
            await (await ormuz.connect(client).reclamarReembolso(1)).wait();
            expect.fail("Should have reverted");
        } catch (error: any) {
            expect(error.message).to.include("revert");
        }
    });

    it("Cenário 7: Double Report deve falhar", async function () {
        await (await ormuz.connect(client).payForEscort(1)).wait();

        await (await ormuz.connect(reporter).registerMissionReport(1, "DRONE", "0", "OK")).wait();

        try {
            await (await ormuz.connect(reporter).registerMissionReport(1, "DRONE", "0", "OK")).wait();
            expect.fail("Should have reverted");
        } catch (error: any) {
            expect(error.message).to.include("revert");
        }
    });
});
