// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MercadoDeDrones
 * @dev Contrato inteligente para o gerenciamento de missões de escolta naval,
 * utilizando o token Operational Credits (OPC) com reserva em Escrow imutável.
 */
contract MercadoDeDrones is ERC20, AccessControl, ReentrancyGuard, Pausable {
    
    // Definição dos papéis de acesso
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    // Constantes de precificação e tempo de acordo com a especificação
    uint256 public constant PRECO_ESCOLTA_NORMAL = 5 ether; // 5 OPC
    uint256 public constant PRECO_ESCOLTA_CRITICA = 10 ether; // 10 OPC
    uint256 public constant DEADLINE_MISSAO = 30 seconds;

    // Custom Errors para redução de consumo de gas e melhor auditoria
    error MissaoNaoExiste();
    error MissaoJaFinalizada();
    error PrazoExpirado();
    error PrazoAindaNaoExpirou();
    error NaoEhClienteDaMissao();
    error PrioridadeInvalida();
    error SaldoInsuficiente();
    error EnderecoInvalido();

    // Enum para controle de estado da missão
    enum StatusMissao {
        PENDENTE,
        CONCLUIDO,
        FALHOU
    }

    // Estrutura de dados detalhada da missão
    struct Missao {
        uint256 id;
        address cliente;
        uint8 prioridade;
        uint256 valorEscrow;
        uint256 criadaEm;
        uint256 deadline;
        StatusMissao status;
        string laudo;
        address reporter;
    }

    // Estado global de armazenamento do contrato
    address public treasury;
    uint256 public totalEscrowBloqueado;
    
    // Contadores métricos de auditoria operacional
    uint256 public totalMissoes;
    uint256 public totalConcluidas;
    uint256 public totalFalhas;

    // Contador sequencial interno
    uint256 private _proximoIdMissao = 1;

    // Mapeamento de missões e indexação por cliente
    mapping(uint256 => Missao) private _missoes;
    mapping(address => uint256[]) private _missoesDoCliente;

    // Eventos obrigatórios
    event EscortPaid(
        uint256 indexed idMissao,
        address indexed cliente,
        uint256 valor,
        uint8 prioridade,
        uint256 deadline
    );

    event MissionCreated(
        uint256 indexed idMissao,
        address indexed cliente,
        uint8 prioridade,
        uint256 valorEscrow,
        uint256 deadline
    );

    event MissionCompleted(
        uint256 indexed idMissao,
        address indexed cliente,
        address indexed reporter,
        uint256 valorPago
    );

    event RefundIssued(
        uint256 indexed idMissao,
        address indexed cliente,
        uint256 valor
    );

    event TreasuryUpdated(
        address indexed oldTreasury,
        address indexed newTreasury
    );

    /**
     * @dev Construtor inicializa o token OPC, cunha o suprimento inicial e concede papéis básicos.
     * @param initialSupply Quantidade inicial de tokens OPC (em Wei/ether).
     * @param treasuryAddress Carteira da Tesouraria que receberá o suprimento inicial.
     */
    constructor(uint256 initialSupply, address treasuryAddress) ERC20("Operational Credits", "OPC") {
        if (treasuryAddress == address(0)) revert EnderecoInvalido();
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_ROLE, treasuryAddress);

        treasury = treasuryAddress;
        _mint(treasuryAddress, initialSupply);
    }

    /**
     * @dev Solicita uma escolta naval bloqueando fundos no contrato.
     * @param tipoPrioridade 0 para Normal (5 OPC), 1 para Crítica (10 OPC).
     */
    function solicitarEscolta(uint8 tipoPrioridade) external whenNotPaused nonReentrant returns (uint256) {
        uint256 custo;
        if (tipoPrioridade == 0) {
            custo = PRECO_ESCOLTA_NORMAL;
        } else if (tipoPrioridade == 1) {
            custo = PRECO_ESCOLTA_CRITICA;
        } else {
            revert PrioridadeInvalida();
        }

        if (balanceOf(msg.sender) < custo) revert SaldoInsuficiente();

        // Bloqueio financeiro do cliente para o contrato inteligente (Escrow)
        // Requer aprovação (approve) prévia por parte do cliente.
        _transfer(msg.sender, address(this), custo);

        uint256 idMissao = _proximoIdMissao;
        _proximoIdMissao++;

        uint256 deadline = block.timestamp + DEADLINE_MISSAO;

        // Armazenamento estruturado da missão
        _missoes[idMissao] = Missao({
            id: idMissao,
            cliente: msg.sender,
            prioridade: tipoPrioridade,
            valorEscrow: custo,
            criadaEm: block.timestamp,
            deadline: deadline,
            status: StatusMissao.PENDENTE,
            laudo: "",
            reporter: address(0)
        });

        _missoesDoCliente[msg.sender].push(idMissao);

        // Atualização de métricas e auditorias
        totalEscrowBloqueado += custo;
        totalMissoes++;

        // Emissão dos eventos obrigatórios para monitoramento via Go Backend
        emit MissionCreated(idMissao, msg.sender, tipoPrioridade, custo, deadline);
        emit EscortPaid(idMissao, msg.sender, custo, tipoPrioridade, deadline);

        return idMissao;
    }

    /**
     * @dev Registra o laudo da escolta concluída e libera o Escrow para a Tesouraria.
     * @param idMissao ID da missão a ser finalizada.
     * @param dados Laudo operacional ou resultado de monitoramento da missão.
     */
    function registrarLaudo(uint256 idMissao, string calldata dados) external onlyRole(REPORTER_ROLE) whenNotPaused nonReentrant {
        Missao storage missao = _missoes[idMissao];
        if (missao.cliente == address(0)) revert MissaoNaoExiste();
        if (missao.status != StatusMissao.PENDENTE) revert MissaoJaFinalizada();
        if (block.timestamp > missao.deadline) revert PrazoExpirado();

        missao.status = StatusMissao.CONCLUIDO;
        missao.laudo = dados;
        missao.reporter = msg.sender;

        uint256 valor = missao.valorEscrow;
        totalEscrowBloqueado -= valor;
        totalConcluidas++;

        // Liberação de fundos para a Tesouraria
        _transfer(address(this), treasury, valor);

        emit MissionCompleted(idMissao, missao.cliente, msg.sender, valor);
    }

    /**
     * @dev Permite ao cliente solicitar reembolso automático caso o prazo tenha expirado sem registro de laudo.
     * @param idMissao ID da missão a ser reembolsada.
     */
    function reclamarReembolso(uint256 idMissao) external whenNotPaused nonReentrant {
        Missao storage missao = _missoes[idMissao];
        if (missao.cliente == address(0)) revert MissaoNaoExiste();
        if (msg.sender != missao.cliente) revert NaoEhClienteDaMissao();
        if (missao.status != StatusMissao.PENDENTE) revert MissaoJaFinalizada();
        if (block.timestamp <= missao.deadline) revert PrazoAindaNaoExpirou();

        missao.status = StatusMissao.FALHOU;

        uint256 valor = missao.valorEscrow;
        totalEscrowBloqueado -= valor;
        totalFalhas++;

        // Devolução dos créditos bloqueados ao cliente
        _transfer(address(this), missao.cliente, valor);

        emit RefundIssued(idMissao, missao.cliente, valor);
    }

    /**
     * @dev Emissão (mint) controlada de OPC realizada pela Tesouraria para fomento de empresas do consórcio.
     */
    function distributeOPC(address to, uint256 amount) external onlyRole(TREASURY_ROLE) whenNotPaused {
        if (to == address(0)) revert EnderecoInvalido();
        _mint(to, amount);
    }

    /**
     * @dev Atualiza o endereço da carteira da Tesouraria.
     */
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newTreasury == address(0)) revert EnderecoInvalido();
        
        address oldTreasury = treasury;
        treasury = newTreasury;

        // Atualização de papéis
        _revokeRole(TREASURY_ROLE, oldTreasury);
        _grantRole(TREASURY_ROLE, newTreasury);

        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Pausa todas as operações financeiras e de laudo no contrato.
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Despausa todas as operações.
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Retorna os detalhes completos de uma missão específica.
     */
    function getMissao(uint256 id) external view returns (
        uint256 idMissao,
        address cliente,
        uint8 prioridade,
        uint256 valorEscrow,
        uint256 criadaEm,
        uint256 deadline,
        StatusMissao status,
        string memory laudo,
        address reporter
    ) {
        Missao memory m = _missoes[id];
        if (m.cliente == address(0)) revert MissaoNaoExiste();
        return (
            m.id,
            m.cliente,
            m.prioridade,
            m.valorEscrow,
            m.criadaEm,
            m.deadline,
            m.status,
            m.laudo,
            m.reporter
        );
    }

    /**
     * @dev Retorna o status atual da missão.
     */
    function getStatusMissao(uint256 id) external view returns (StatusMissao) {
        if (_missoes[id].cliente == address(0)) revert MissaoNaoExiste();
        return _missoes[id].status;
    }

    /**
     * @dev Retorna a lista de IDs de missões solicitadas por um determinado cliente.
     */
    function getMissoesDoCliente(address cliente) external view returns (uint256[] memory) {
        return _missoesDoCliente[cliente];
    }

    /**
     * @dev Retorna o próximo ID incremental disponível.
     */
    function proximoIdMissao() external view returns (uint256) {
        return _proximoIdMissao;
    }
}
