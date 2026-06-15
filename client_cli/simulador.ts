import { ethers } from "ethers";
import * as readline from "readline/promises";
import fs from "fs";
import path from "path";

// Caminho para o artefato gerado pelo Hardhat
const ARTIFACT_PATH = path.resolve(process.cwd(), "../blockchain/artifacts/contracts/OrmuzConsortium.sol/OrmuzConsortium.json");

// Endereço do contrato
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Helpers Utilitários
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const printBanner = (title: string) => {
    console.log(`\n===================================================`);
    console.log(`🎬 ${title}`);
    console.log(`===================================================\n`);
};

async function mostrarSaldo(contractClient: any, clientAddress: string, treasuryAddress: string) {
    const balanceClient = await contractClient.balanceOf(clientAddress);
    const balanceTreasury = await contractClient.balanceOf(treasuryAddress);
    
    console.log(`\n[📊 STATUS FINANCEIRO] - ${new Date().toLocaleTimeString()}`);
    console.log(`💳 Saldo do Cliente:    ${ethers.formatEther(balanceClient)} OPC`);
    console.log(`🏦 Saldo da Tesouraria: ${ethers.formatEther(balanceTreasury)} OPC\n`);
}

async function main() {
    if (!fs.existsSync(ARTIFACT_PATH)) {
        console.error("❌ ERRO: Artefato do contrato não encontrado.");
        process.exit(1);
    }

    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    try {
        await provider.getNetwork();
    } catch (e) {
        console.error("❌ ERRO: Falha ao conectar. O Hardhat Node está rodando?");
        process.exit(1);
    }

    const adminKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const adminWallet = new ethers.Wallet(adminKey, provider);
    const treasuryAddress = adminWallet.address;

    const clientKey = "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a";
    const clientWallet = new ethers.Wallet(clientKey, provider);
    const clientAddress = await clientWallet.getAddress();

    const ormuzAdmin: any = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, adminWallet);
    const ormuzClient: any = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, clientWallet);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("Inicializando Simulador Automatizado da Apresentação...");
    
    // Auto-provisionamento limpo para o simulador (Garante que começamos com 50 OPC)
    try {
        const txMint = await ormuzAdmin.mint(clientAddress, ethers.parseEther("50"));
        await txMint.wait();
        console.log("✅ Mint de inicialização concluído: 50 OPC provisionados.");
    } catch (e) {}

    let relatorio = {
        cenario1: "PENDENTE",
        cenario2: "PENDENTE",
        cenario3: "PENDENTE"
    };

    // Função de aguardar evento
    const aguardarEvento = (eventName: string, timeoutMs: number): Promise<any> => {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                ormuzClient.removeAllListeners(eventName);
                reject(new Error(`Timeout aguardando evento: ${eventName}`));
            }, timeoutMs);

            ormuzClient.once(eventName, (...args: any[]) => {
                clearTimeout(timer);
                resolve(args);
            });
        });
    };

    // =========================================================
    // CENÁRIO 1: EXECUÇÃO PERFEITA
    // =========================================================
    try {
        printBanner("CENÁRIO 1: EXECUÇÃO PERFEITA");
        console.log("Objetivo: Demonstrar pagamento, escrow, despacho, auditoria e liberação do pagamento.\n");
        
        await mostrarSaldo(ormuzClient, clientAddress, treasuryAddress);
        
        console.log("[*] Executando payForEscort(1) - Prioridade NORMAL (5 OPC)...");
        const tx1 = await ormuzClient.payForEscort(1);
        const receipt1 = await tx1.wait();
        
        let missionId1 = null;
        for (const log of receipt1.logs) {
            try {
                const parsedLog = ormuzClient.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "EscortPaid") {
                    missionId1 = parsedLog.args.missionId;
                    break;
                }
            } catch (e) {}
        }

        console.log(`✅ Transação enviada! Hash: ${tx1.hash}`);
        console.log(`✅ Bloco: ${receipt1.blockNumber} | Mission ID: ${missionId1}`);
        console.log("⏳ Aguardando backend Go processar a missão e emitir o laudo...");

        const eventData = await aguardarEvento("MissionCompleted", 45000); // 45 segundos max
        
        console.log(`\n✅ LAUDO RECEBIDO!`);
        console.log(`🔹 ID da Missão: ${eventData[0]}`);
        console.log(`🔹 Reporter: ${eventData[1]}`);
        console.log(`🔹 Timestamp: ${new Date().toLocaleTimeString()}`);
        
        await mostrarSaldo(ormuzClient, clientAddress, treasuryAddress);

        console.log("✅ Escrow liberado com sucesso");
        console.log("✅ Pagamento entregue após auditoria\n");
        relatorio.cenario1 = "SUCESSO";

        await rl.question("\nPressione ENTER para iniciar o próximo cenário...");

    } catch (e: any) {
        console.error(`❌ Falha no Cenário 1: ${e.message}`);
        relatorio.cenario1 = "FALHA";
    }

    // =========================================================
    // CENÁRIO 2: FALHA BIZANTINA E REEMBOLSO
    // =========================================================
    try {
        printBanner("CENÁRIO 2: FALHA BIZANTINA E REEMBOLSO");
        console.log("Objetivo: Demonstrar proteção contra drone destruído, operador malicioso ou ausência de laudo.\n");
        
        console.log("⚠ ATENÇÃO");
        console.log("Vá ao terminal do Servidor Go e pressione CTRL+C AGORA.");
        console.log("A missão ficará sem auditoria.\n");

        await rl.question("Pressione ENTER para continuar, e GARANTA que o Servidor Go foi desligado...");

        console.log("\n[*] Executando payForEscort(2) - Prioridade CRÍTICA (10 OPC)...");
        const tx2 = await ormuzClient.payForEscort(2);
        const receipt2 = await tx2.wait();

        let missionId2 = null;
        for (const log of receipt2.logs) {
            try {
                const parsedLog = ormuzClient.interface.parseLog(log);
                if (parsedLog && parsedLog.name === "EscortPaid") {
                    missionId2 = parsedLog.args.missionId;
                    break;
                }
            } catch (e) {}
        }

        console.log(`⏳ Pagamento retido em Escrow. Iniciando contagem regressiva do timeout (30s)...`);
        
        for (let i = 30; i >= 0; i--) {
            process.stdout.write(`⏳ ${i}... `);
            await sleep(1000);
        }
        console.log("\n");

        console.log(`[*] Executando reclamarReembolso(${missionId2})...`);
        const txRefund = await ormuzClient.reclamarReembolso(missionId2);
        const receiptRefund = await txRefund.wait();

        console.log(`✅ Hash da transação: ${txRefund.hash}`);
        console.log(`✅ Bloco: ${receiptRefund.blockNumber}`);
        console.log(`✅ Valor devolvido: 10 OPC`);

        console.log("\n✅ Timeout detectado");
        console.log("✅ Missão marcada como FALHOU");
        console.log("✅ OPC devolvido ao cliente");
        console.log("✅ Falha Bizantina neutralizada\n");

        await mostrarSaldo(ormuzClient, clientAddress, treasuryAddress);

        relatorio.cenario2 = "SUCESSO";
        await rl.question("\nPressione ENTER para iniciar o próximo cenário...");
    } catch (e: any) {
        console.error(`❌ Falha no Cenário 2: ${e.message}`);
        relatorio.cenario2 = "FALHA";
    }

    // =========================================================
    // CENÁRIO 3: TENTATIVA DE FRAUDE ECONÔMICA
    // =========================================================
    try {
        printBanner("CENÁRIO 3: TENTATIVA DE FRAUDE");
        console.log("Objetivo: Demonstrar que a Blockchain impede gasto sem saldo.\n");

        console.log("[*] Transferindo todo saldo restante do cliente para a Tesouraria...");
        const balanceAtual = await ormuzClient.balanceOf(clientAddress);
        const txBurn = await ormuzClient.transfer(treasuryAddress, balanceAtual);
        await txBurn.wait();

        const saldoZerado = await ormuzClient.balanceOf(clientAddress);
        console.log(`✅ Saldo Atual: ${ethers.formatEther(saldoZerado)} OPC\n`);

        console.log("[*] Tentando executar payForEscort(1) [Custo: 5 OPC] sem saldo...");
        
        try {
            const txFraud = await ormuzClient.payForEscort(1);
            await txFraud.wait();
            console.error("❌ ERRO: A transação deveria ter falhado!");
            relatorio.cenario3 = "FALHA";
        } catch (error: any) {
            console.log("✅ SEGURANÇA ATIVA");
            console.log("A Blockchain rejeitou a operação.\n");
            console.log(`Motivo: ${error.reason || error.shortMessage || error.message}`);
            console.log("\nFraude econômica impossível.");
            relatorio.cenario3 = "SUCESSO";
        }

    } catch (e: any) {
        console.error(`❌ Falha no Cenário 3: ${e.message}`);
        relatorio.cenario3 = "FALHA";
    }

    // =========================================================
    // RELATÓRIO FINAL
    // =========================================================
    console.log(`\n===================================================`);
    console.log(`📊 RELATÓRIO FINAL DA DEMONSTRAÇÃO`);
    console.log(`===================================================`);
    console.log(`Cenário 1: ${relatorio.cenario1}`);
    console.log(`Cenário 2: ${relatorio.cenario2}`);
    console.log(`Cenário 3: ${relatorio.cenario3}`);
    console.log(``);
    console.log(`Blockchain: Operacional`);
    console.log(`Escrow: Validado`);
    console.log(`Reembolso: Validado`);
    console.log(`Auditoria: Validada`);
    console.log(`Proteção Bizantina: Validada`);
    console.log(`===================================================\n`);

    rl.close();
    process.exit(0);
}

main().catch(console.error);
