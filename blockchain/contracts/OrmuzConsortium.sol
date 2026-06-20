// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title OrmuzConsortium
 * @dev Contrato inteligente responsável pela orquestração financeira e logística 
 * das missões de escolta naval. Implementa o padrão de Escrow (custódia) onde 
 * os fundos ficam retidos até que a frota reporte o cumprimento da patrulha.
 */

// Custom Errors
error MissionNotFound();
error MissionAlreadyFinalized();
error MissionNotPending();
error DeadlineExpired();
error DeadlineNotExpired();
error UnauthorizedClient();
error InvalidPriority();
error InsufficientBalance();
error EscrowTransferFailed();

contract OrmuzConsortium is ERC20, AccessControl, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE"); // Papel destinado à Companhia Oracle para reportar laudos

    // Custos fixos das operações logísticas em wei
    uint256 public constant ESCOLTA_NORMAL = 5 ether;
    uint256 public constant ESCOLTA_CRITICA = 10 ether;
    
    // Tempo máximo permitido para um Drone confirmar a conclusão da missão.
    // Após este prazo, o cliente ganha o direito de solicitar reembolso integral.
    uint256 public constant MISSION_TIMEOUT = 30 seconds;

    uint256 public totalEscrowLocked;
    uint256 private _missionCounter;
    address public treasury;

    enum MissionStatus { PENDENTE, CONCLUIDO, FALHOU }

    struct Mission {
        uint256 id;
        address client;
        uint8 prioridade;
        uint256 escrowAmount;
        uint256 createdAt;
        uint256 deadline;
        MissionStatus status;
        address reporter;
        string reportData;
    }

    mapping(uint256 => Mission) public missions;

    event EscortPaid(
        uint256 indexed missionId,
        address indexed client,
        uint256 amount,
        uint8 prioridade,
        uint256 deadline
    );

    event MissionCompleted(
        uint256 indexed missionId,
        address indexed reporter,
        uint256 amount
    );

    event RefundIssued(
        uint256 indexed missionId,
        address indexed client,
        uint256 amount
    );

    constructor() ERC20("Credito Operacional", "OPC") {
        treasury = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, msg.sender);
        _missionCounter = 1;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Função acionada pelo Cliente (Empresa Naval) para solicitar uma nova escolta.
     * Retém (Escrow) a taxa em OPC no contrato e define a Deadline da missão.
     * @param prioridade 1 (Normal) ou 2 (Crítica).
     * @return missionId O identificador sequencial gerado para a missão.
     */
    function payForEscort(uint8 prioridade) external nonReentrant returns (uint256 missionId) {
        if (prioridade != 1 && prioridade != 2) revert InvalidPriority();
        
        uint256 cost = (prioridade == 1) ? ESCOLTA_NORMAL : ESCOLTA_CRITICA;
        if (balanceOf(msg.sender) < cost) revert InsufficientBalance();

        totalEscrowLocked += cost;

        missionId = _missionCounter++;
        
        Mission storage m = missions[missionId];
        m.id = missionId;
        m.client = msg.sender;
        m.prioridade = prioridade;
        m.escrowAmount = cost;
        m.createdAt = block.timestamp;
        m.deadline = block.timestamp + MISSION_TIMEOUT;
        m.status = MissionStatus.PENDENTE;

        // Trava os fundos do cliente no contrato (Escrow)
        _transfer(msg.sender, address(this), cost);

        emit EscortPaid(missionId, msg.sender, cost, prioridade, m.deadline);
        return missionId;
    }

    function registerMissionReport(
        uint256 missionId,
        string calldata droneId,
        string calldata coordinates,
        string calldata incidentStatus
    ) external onlyRole(REPORTER_ROLE) nonReentrant {
        Mission storage m = missions[missionId];
        if (m.id == 0) revert MissionNotFound();
        if (m.status != MissionStatus.PENDENTE) revert MissionNotPending();
        if (block.timestamp > m.deadline) revert DeadlineExpired();

        m.status = MissionStatus.CONCLUIDO;
        m.reporter = msg.sender;
        m.reportData = string(abi.encodePacked(droneId, "|", coordinates, "|", incidentStatus));

        totalEscrowLocked -= m.escrowAmount;
        
        // Pagamento efetuado somente após o laudo válido
        _transfer(address(this), treasury, m.escrowAmount);

        emit MissionCompleted(missionId, msg.sender, m.escrowAmount);
    }

    /**
     * @dev Função executada pelo Cliente quando a Oracle falha em entregar o laudo a tempo.
     * Retira os fundos do Escrow e os devolve imediatamente ao solicitante.
     * @param missionId O ID da missão que expirou o SLA.
     */
    function reclamarReembolso(uint256 missionId) external nonReentrant {
        Mission storage m = missions[missionId];
        if (m.id == 0) revert MissionNotFound();
        if (m.status != MissionStatus.PENDENTE) revert MissionNotPending();
        if (block.timestamp <= m.deadline) revert DeadlineNotExpired();
        if (msg.sender != m.client) revert UnauthorizedClient();

        m.status = MissionStatus.FALHOU;
        totalEscrowLocked -= m.escrowAmount;

        // Devolução segura e garantida dos OPCs (Escrow reverso)
        _transfer(address(this), m.client, m.escrowAmount);

        emit RefundIssued(missionId, m.client, m.escrowAmount);
    }
}
