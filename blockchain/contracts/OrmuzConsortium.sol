// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title OrmuzConsortium
 * @dev Contrato inteligente para o consórcio de segurança e logística marítima no Estreito de Ormuz.
 * Gerencia o token utilitário Credito Operacional (OPC) e audita de forma imutável as missões dos drones.
 */
contract OrmuzConsortium is ERC20, AccessControl {
    // Definição das roles (papéis de acesso) usando hash keccak256
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REPORTER_ROLE = keccak256("REPORTER_ROLE");

    // Estrutura para auditar o laudo da missão
    struct MissionReport {
        string missionId;        // ID único da missão/escorta
        string droneId;          // ID do drone marítimo despachado
        string coordinates;      // Coordenadas geográficas (Ex: "26.5682,56.2643")
        string incidentStatus;   // Status (Ex: "ROTA_SEGURA", "VAZAMENTO_DETECTADO")
        uint256 timestamp;       // Timestamp do registro
        address reporter;        // Endereço (do operador/drone) que registrou o laudo
    }

    // Mapeamento para armazenar os laudos por ID da missão (Imutabilidade)
    mapping(string => MissionReport) private _missionReports;
    
    // Lista de IDs de missões registradas para fins de indexação/iteração
    string[] private _missionIds;

    // Eventos para escuta do Servidor Go (go-ethereum)
    event EscortPaid(
        address indexed customer,
        address indexed operator,
        uint256 amount,
        string missionId,
        uint256 timestamp
    );

    event MissionReportRegistered(
        string indexed missionId,
        string droneId,
        string incidentStatus,
        uint256 timestamp,
        address indexed reporter
    );

    // Construtor inicializa o token OPC e define o administrador do consórcio.
    constructor() ERC20("Credito Operacional", "OPC") {
        // O endereço que faz o deploy é o administrador inicial
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Concede as permissões de Minter e Reporter também ao admin para facilitar testes/inicialização
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(REPORTER_ROLE, msg.sender);
    }

    /**
     * @dev Permite a emissão de novos tokens OPC para empresas do consórcio.
     * Apenas contas com MINTER_ROLE (ex: Banco do consórcio ou Admin) podem cunhar tokens.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "OrmuzConsortium: nao e possivel emitir para o endereco zero");
        require(amount > 0, "OrmuzConsortium: quantidade deve ser maior que zero");
        _mint(to, amount);
    }

    /**
     * @dev Realiza o pagamento de uma escorta marítima utilizando o token OPC.
     * Evita duplo gasto pois a transferência de tokens é atômica e validada pela EVM.
     * @param operator Endereço da empresa/operador do drone que receberá o pagamento.
     * @param amount Quantidade de tokens OPC a transferir (considerando 18 decimais).
     * @param missionId ID identificador da missão associada ao pagamento.
     */
    function payForEscort(
        address operator,
        uint256 amount,
        string calldata missionId
    ) external {
        require(operator != address(0), "OrmuzConsortium: operador invalido");
        require(amount > 0, "OrmuzConsortium: valor de pagamento deve ser maior que zero");
        require(bytes(missionId).length > 0, "OrmuzConsortium: ID da missao nao pode ser vazio");
        
        // Transfere os tokens OPC diretamente do pagador (msg.sender) para o operador
        _transfer(msg.sender, operator, amount);

        emit EscortPaid(msg.sender, operator, amount, missionId, block.timestamp);
    }

    /**
     * @dev Registra de forma imutável o laudo de uma missão de drone.
     * Apenas contas com REPORTER_ROLE (ex: servidores Go autorizados, Drones autenticados) podem registrar.
     * @param missionId ID único da missão. Não pode ter sido registrado previamente (Garante imutabilidade).
     * @param droneId Identificador do drone.
     * @param coordinates Coordenadas GPS da ocorrência/inspeção.
     * @param incidentStatus Situação identificada (ex: ROTA_SEGURA, VAZAMENTO_DETECTADO).
     */
    function registerMissionReport(
        string calldata missionId,
        string calldata droneId,
        string calldata coordinates,
        string calldata incidentStatus
    ) external onlyRole(REPORTER_ROLE) {
        require(bytes(missionId).length > 0, "OrmuzConsortium: ID da missao nao pode ser vazio");
        require(bytes(droneId).length > 0, "OrmuzConsortium: ID do drone nao pode ser vazio");
        require(bytes(coordinates).length > 0, "OrmuzConsortium: coordenadas nao podem ser vazias");
        require(bytes(incidentStatus).length > 0, "OrmuzConsortium: status do incidente nao pode ser vazio");
        
        // Garantia de imutabilidade: impede sobrescrever laudos já existentes
        require(_missionReports[missionId].timestamp == 0, "OrmuzConsortium: laudo ja registrado para esta missao");

        // Armazena o laudo estruturado na blockchain
        _missionReports[missionId] = MissionReport({
            missionId: missionId,
            droneId: droneId,
            coordinates: coordinates,
            incidentStatus: incidentStatus,
            timestamp: block.timestamp,
            reporter: msg.sender
        });

        // Adiciona à lista de controle de IDs para indexação
        _missionIds.push(missionId);

        // Emite o evento para que o Go Backend escute as atualizações de auditoria
        emit MissionReportRegistered(
            missionId,
            droneId,
            incidentStatus,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @dev Consulta os detalhes de um laudo de missão.
     * @param missionId ID da missão a ser consultada.
     */
    function getMissionReport(string calldata missionId)
        external
        view
        returns (
            string memory droneId,
            string memory coordinates,
            string memory incidentStatus,
            uint256 timestamp,
            address reporter
        )
    {
        MissionReport memory report = _missionReports[missionId];
        require(report.timestamp > 0, "OrmuzConsortium: laudo nao encontrado para esta missao");
        return (
            report.droneId,
            report.coordinates,
            report.incidentStatus,
            report.timestamp,
            report.reporter
        );
    }

    /**
     * @dev Retorna a quantidade total de laudos de missão registrados.
     */
    function getMissionReportsCount() external view returns (uint256) {
        return _missionIds.length;
    }

    /**
     * @dev Retorna o ID de uma missão pelo índice. Auxilia na listagem/iteração.
     */
    function getMissionIdAtIndex(uint256 index) external view returns (string memory) {
        require(index < _missionIds.length, "OrmuzConsortium: indice fora de alcance");
        return _missionIds[index];
    }
}
