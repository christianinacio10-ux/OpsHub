/**
 * Configuracao central. Nomes de abas, esquema e sementes so da primeira
 * criacao das abas. Cadastros reais (links, fontes, planos) vivem na planilha.
 */
var APP = {
  nome: 'OpsHub',
  versao: '1.4.0',
};

var ABAS = {
  config: '_CONFIG',
  departamentos: 'DEPARTAMENTOS',
  controles: 'CONTROLES',
  fontes: 'FONTES_PLANOS',
  planos: 'PLANOS_ACAO',
  emails: 'EMAILS_ENVIADOS',
  log: '_LOG',
};

var ESQUEMA = {};
ESQUEMA[ABAS.config] = ['chave', 'valor', 'descricao'];
ESQUEMA[ABAS.departamentos] = ['id', 'nome', 'descricao', 'icone', 'cor', 'ordem', 'ativo', 'bandeira'];
ESQUEMA[ABAS.controles] = ['id', 'departamento_id', 'nome', 'descricao', 'url', 'ordem', 'ativo', 'negocio', 'pasta'];
ESQUEMA[ABAS.fontes] = [
  'id', 'nome', 'referencia', 'aba', 'linha_cabecalho',
  'ativo', 'ultima_execucao', 'ultimo_status', 'ultimo_detalhe',
];
ESQUEMA[ABAS.planos] = [
  'id', 'fonte_id', 'fonte_nome', 'chave_origem',
  'tema', 'divisao', 'area', 'oque', 'como',
  'responsavel', 'email', 'prazo', 'status', 'comentarios',
  'ultimo_email_em', 'emails_enviados', 'atualizado_em',
];
ESQUEMA[ABAS.emails] = [
  'quando', 'acao_id', 'email', 'assunto', 'status', 'detalhe',
];
ESQUEMA[ABAS.log] = ['quando', 'rotina', 'status', 'detalhe'];

var CONFIG_PADRAO = [
  ['timezone', 'America/Sao_Paulo', 'Fuso usado no prazo e no gatilho diario'],
  ['remetente_nome', 'OpsHub Avery Dennison', 'Nome que aparece no follow-up'],
  ['atraso_dias_followup', '1', 'Dias apos o prazo para o primeiro e-mail'],
  ['hora_gatilho', '08', 'Hora local do disparo diario (0-23)'],
  ['followup_temas', '', 'Temas que recebem e-mail de follow-up (vazio = todos)'],
  ['versao_instalada', APP.versao, 'Versao aplicada na ultima instalacao'],
];

var SEMENTES = {
  departamentos: [
    ['D-PROD', 'Produção', 'Controles de chão de fábrica e desempenho da linha', 'producao', '#B42336', 1, 'SIM', 'Solutions'],
    ['D-QUAL', 'Qualidade', 'NC, auditorias e controle de processo', 'qualidade', '#7A8BA3', 2, 'SIM', 'Apparel'],
    ['D-MAN', 'Manutenção', 'PCM, CMMS e confiabilidade', 'manutencao', '#C4B5A0', 3, 'SIM', 'Smartrac'],
    ['D-EHS', 'EHS', 'Segurança, meio ambiente e saúde ocupacional', 'ehs', '#8FA393', 4, 'SIM', 'Solutions'],
    ['D-LOG', 'Logística', 'Armazém, expedição e materiais', 'logistica', '#8B8499', 5, 'SIM', 'Apparel'],
    ['D-ENG', 'Engenharia', 'Processo, industrialização e projetos', 'engenharia', '#7E9AAB', 6, 'SIM', 'Smartrac'],
    ['D-PCP', 'PCP', 'Planejamento, programação e controle da produção', 'pcp', '#C4A484', 7, 'SIM', 'Solutions'],
    ['D-CI', 'Melhoria Contínua', 'Kaizen, A3 e planos de ação corporativos', 'melhoria', '#B0899A', 8, 'SIM', 'Solutions'],
  ],
  controles: [
    ['C1', 'D-PROD', 'Controle Hora por Hora', 'Painel de produção por máquina e turno', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', 'Linha / Hora a hora'],
    ['C2', 'D-PROD', 'Plano de produção', 'Programa congelado da semana', 'https://docs.google.com/spreadsheets', 2, 'SIM', 'Smartrac', 'Linha / Programa'],
    ['C3', 'D-QUAL', 'Gestão de não conformidades', 'Registro e tratamento de NCs', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', 'NC'],
    ['C4', 'D-QUAL', 'Controle de processo', 'Cartas e limites de qualidade', 'https://docs.google.com/spreadsheets', 2, 'SIM', 'Apparel', 'Processo'],
    ['C5', 'D-MAN', 'CMMS / Ordens de serviço', 'Backlog e preventiva', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Smartrac', 'PCM'],
    ['C6', 'D-EHS', 'Observações de segurança', 'Desvios e near miss', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', 'Campo'],
    ['C11', 'D-EHS', 'Inspeção Smartrac', 'Roteiro de inspeção da linha Smartrac', 'https://docs.google.com/spreadsheets', 2, 'SIM', 'Smartrac', 'Campo'],
    ['C7', 'D-LOG', 'Inventário e FIFO', 'Posição de estoque e giro', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', ''],
    ['C8', 'D-ENG', 'PCP de projetos', 'Pipeline de industrialização', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Smartrac', 'Projetos'],
    ['C9', 'D-PCP', 'Plano mestre Apparel', 'MPS da linha Apparel', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', 'MPS'],
    ['C12', 'D-PCP', 'Plano mestre Smartrac', 'MPS da linha Smartrac', 'https://docs.google.com/spreadsheets', 2, 'SIM', 'Smartrac', 'MPS'],
    ['C10', 'D-CI', 'A3 consolidado', 'Planos de ação por tema da planta', 'https://docs.google.com/spreadsheets', 1, 'SIM', 'Apparel', 'A3'],
    ['C13', 'D-CI', 'A3 Smartrac', 'Planos de ação da operação Smartrac', 'https://docs.google.com/spreadsheets', 2, 'SIM', 'Smartrac', 'A3'],
    ['C14', 'D-PROD', 'KPI da planta', 'Indicadores consolidados Solutions', 'https://docs.google.com/spreadsheets', 3, 'SIM', 'Solutions', 'Planta'],
    ['C15', 'D-EHS', 'DDS da planta', 'Diálogo diário de segurança da planta', 'https://docs.google.com/spreadsheets', 3, 'SIM', '', 'Campo'],
  ],
};
