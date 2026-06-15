import { ethers } from "ethers";
import * as readline from "readline/promises";
import fs from "fs";
import path from "path";

// Caminho para o artefato gerado pelo Hardhat
const ARTIFACT_PATH = path.resolve(process.cwd(), "../blockchain/artifacts/contracts/OrmuzConsortium.sol/OrmuzConsortium.json");

// Endereço do contrato implantado localmente (Padrão inicial do Hardhat - você pode alterar se necessário)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

async function main() {
    console.log("==================================================");
    console.log("⚓ Consórcio Ormuz - CLI da Empresa de Navegação");
    console.log("==================================================\n");

    if (!fs.existsSync(ARTIFACT_PATH)) {
        console.error("❌ ERRO: Artefato do contrato não encontrado.");
        console.error(`Certifique-se de compilar no Hardhat. Procurado em: ${ARTIFACT_PATH}`);
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));

    // Conectando ao Hardhat Node Local
    console.log("[*] Conectando à Blockchain Local (http://127.0.0.1:8545)...");
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    try {
        await provider.getNetwork();
    } catch (e) {
        console.error("❌ ERRO: Falha ao conectar. O npx hardhat node está rodando?");
        process.exit(1);
    }

    // Carteira da Tesouraria (Hardhat Account #0)
    const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const adminWallet = new ethers.Wallet(adminKey, provider);

    // Carteira do Cliente / Empresa de Navegação (Hardhat Account #4)
    const clientKey = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
    const clientWallet = new ethers.Wallet(clientKey, provider);

    const clientAddress = await clientWallet.getAddress();
    console.log(`[+] Identidade da Empresa de Navegação: ${clientAddress}`);

    const ormuzAdmin: any = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, adminWallet);
    const ormuzClient: any = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, clientWallet);

    // ==== Pré-Provisionamento de OPC ====
    console.log("\n[*] (Auto-Provisionamento) Solicitando Mint de 50 OPCs para a sessão atual...");
    try {
        const txMint = await ormuzAdmin.mint(clientAddress, ethers.parseEther("50"));
        await txMint.wait();
        console.log("✅ Mint concluído! Os 50 OPCs foram creditados.");
    } catch (error: any) {
        if (error.message.includes("could not coalesce error")) {
            console.error("⚠️ Mint falhou: certifique-se que o contrato já foi feito o deploy na rede!");
        } else {
            console.error("⚠️ Aviso: Falha no mint inicial.", error.message);
        }
    }

    // ==== Listeners ====
    // Captura eventos direcionados à nossa carteira sem travar a interface!
    ormuzClient.on("MissionCompleted", (missionId: any, reporter: any, amount: any, event: any) => {
        // Formatar para terminal (Pula linha do readline e mostra alerta)
        process.stdout.write("\n\n🔔 [ALERTA DA BLOCKCHAIN] ==========================\n");
        process.stdout.write(`🚁 Laudo Registrado pelo Drone (Reporter: ${reporter})\n`);
        process.stdout.write(`✅ Missão ${missionId} CONCLUÍDA com sucesso!\n`);
        process.stdout.write(`💰 Tesouraria recebeu ${ethers.formatEther(amount)} OPC.\n`);
        process.stdout.write("=====================================================\n> ");
    });

    ormuzClient.on("RefundIssued", (missionId: any, client: any, amount: any, event: any) => {
        if (client.toLowerCase() === clientAddress.toLowerCase()) {
            process.stdout.write("\n\n🔔 [ALERTA DA BLOCKCHAIN] ==========================\n");
            process.stdout.write(`❌ Timeout Bizantino Detectado para a Missão ${missionId}!\n`);
            process.stdout.write(`💸 REEMBOLSO EMITIDO: ${ethers.formatEther(amount)} OPC retornou à carteira.\n`);
            process.stdout.write("=====================================================\n> ");
        }
    });

    // ==== Menu CLI ====
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\nBem-vindo ao Painel de Navegação Web3.");

    while (true) {
        console.log("\n--------------------------------");
        console.log("1. Consultar Saldo de Combustível (OPC)");
        console.log("2. Contratar Nova Escolta Armada");
        console.log("3. Reclamar Reembolso Bizantino (Timeout)");
        console.log("4. Sair");
        
        const option = await rl.question("> Escolha uma opção: ");

        if (option === "1") {
            const balance = await ormuzClient.balanceOf(clientAddress);
            console.log(`\n💳 Saldo Disponível: ${ethers.formatEther(balance)} OPC`);
            
        } else if (option === "2") {
            try {
                console.log("\n[*] Bloqueando fundos no contrato (Escrow) e solicitando frota...");
                const tx = await ormuzClient.payForEscort(1); // 1 = Prioridade Alta
                console.log(`⏳ Transação enviada. Aguardando mineração (Hash: ${tx.hash})...`);
                const receipt = await tx.wait();
                
                // Procurar pelo evento EscortPaid para extrair o Mission ID gerado
                let foundMissionId = null;
                for (const log of receipt.logs) {
                    try {
                        const parsedLog = ormuzClient.interface.parseLog(log);
                        if (parsedLog && parsedLog.name === "EscortPaid") {
                            foundMissionId = parsedLog.args.missionId;
                            break;
                        }
                    } catch (e) { /* log de outro contrato */ }
                }

                console.log(`✅ Escolta paga com sucesso e despachada (Missão #${foundMissionId}).`);
                console.log("📡 Fique atento aos Alertas da Blockchain de forma assíncrona...");
            } catch (error: any) {
                console.log(`❌ Erro ao solicitar escolta: ${error.reason || error.message}`);
            }

        } else if (option === "3") {
            const idInput = await rl.question("> Informe o ID da Missão para reembolso: ");
            const missionId = idInput.trim();
            if (!missionId) continue;

            console.log(`\n[*] Auditoria Ativa: Verificando prazo expirado para a Missão #${missionId}...`);
            try {
                const tx = await ormuzClient.reclamarReembolso(missionId);
                console.log(`⏳ Emitindo transação de Reembolso (Hash: ${tx.hash})...`);
                await tx.wait();
                console.log(`✅ Reembolso autorizado com sucesso! Seus tokens voltaram da custódia.`);
            } catch (error: any) {
                console.log(`❌ Auditoria Rejeitada: ${error.reason || error.message}`);
            }
            
        } else if (option === "4") {
            console.log("Saindo...");
            rl.close();
            process.exit(0);
        } else {
            console.log("Opção inválida.");
        }
    }
}

main().catch(console.error);
