function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP.nome)
    .addItem('Instalar / atualizar estrutura', 'instalarSistema')
    .addItem('Abrir painel', 'abrirPainel')
    .addSeparator()
    .addItem('Importar planos de ação agora', 'importarTodasAsFontes')
    .addItem('Enviar follow-ups agora', 'enviarFollowUps')
    .addSeparator()
    .addItem('Ativar gatilho', 'criarGatilhoDiario')
    .addItem('Inativar gatilhos', 'removerGatilhos')
    .addToUi();
}

function abrirPainel() {
  var url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert(
      'Publique o projeto como app da web (Implantar > Nova implantação > App da web) e rode de novo.'
    );
    return;
  }
  var html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Abrindo o OpsHub…</p>' +
    '<script>window.open(' + JSON.stringify(url) + ');google.script.host.close();</script>'
  ).setWidth(320).setHeight(80);
  SpreadsheetApp.getUi().showModalDialog(html, APP.nome);
}

function instalarSistema() {
  var ss = Repo.planilha();
  var criadas = [];

  Object.keys(ESQUEMA).forEach(function (nome) {
    var existia = !!ss.getSheetByName(nome);
    var aba = Repo.aba(nome, true);
    aplicarCabecalho_(aba, ESQUEMA[nome]);
    if (!existia) criadas.push(nome);
  });

  formatarAbas_();
  semearCadastros_(criadas);
  esconderAbasTecnicas_();
  garantirConfig_();
  Repo.limparMemoria();

  var mensagem = criadas.length
    ? 'Abas criadas: ' + criadas.join(', ')
    : 'Estrutura ja existia; cabecalhos revalidados.';
  Repo.registrarLog('instalarSistema', 'OK', mensagem);
  return mensagem;
}

function aplicarCabecalho_(aba, colunas) {
  aba.getRange(1, 1, 1, colunas.length).setValues([colunas]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, colunas.length)
    .setFontWeight('bold')
    .setBackground('#1A1F2B')
    .setFontColor('#F4F6FA');
}

function formatarAbas_() {
  var ss = Repo.planilha();
  try { ss.setFrozenRows && null; } catch (e) {}
  var planos = ss.getSheetByName(ABAS.planos);
  if (planos) {
    var idxPrazo = ESQUEMA[ABAS.planos].indexOf('prazo') + 1;
    var idxEmail = ESQUEMA[ABAS.planos].indexOf('ultimo_email_em') + 1;
    if (idxPrazo > 0) planos.getRange(2, idxPrazo, Math.max(planos.getMaxRows() - 1, 1), 1).setNumberFormat('dd/mm/yyyy');
    if (idxEmail > 0) planos.getRange(2, idxEmail, Math.max(planos.getMaxRows() - 1, 1), 1).setNumberFormat('dd/mm/yyyy hh:mm');
  }
}

function garantirConfig_() {
  var existentes = {};
  Repo.ler(ABAS.config).forEach(function (l) { existentes[String(l.chave)] = true; });
  var novos = [];
  CONFIG_PADRAO.forEach(function (linha) {
    if (!existentes[linha[0]]) {
      novos.push({ chave: linha[0], valor: linha[1], descricao: linha[2] });
    }
  });
  if (novos.length) Repo.acrescentar(ABAS.config, novos);

  var versaoLinha = Repo.ler(ABAS.config).filter(function (l) { return l.chave === 'versao_instalada'; })[0];
  if (versaoLinha) {
    Repo.atualizarRegistro(ABAS.config, versaoLinha._linha, { valor: APP.versao });
  }
}

function semearCadastros_(criadas) {
  criadas = criadas || [];
  function abaNovaEVazia(nome) {
    var nova = false;
    for (var i = 0; i < criadas.length; i++) {
      if (criadas[i] === nome) { nova = true; break; }
    }
    return nova && !Repo.ler(nome).length;
  }
  if (abaNovaEVazia(ABAS.departamentos)) {
    Repo.acrescentar(ABAS.departamentos, SEMENTES.departamentos.map(function (l) {
      return {
        id: l[0], nome: l[1], descricao: l[2], icone: l[3],
        cor: l[4], ordem: l[5], ativo: l[6], bandeira: l[7],
      };
    }));
  }
  if (abaNovaEVazia(ABAS.controles)) {
    Repo.acrescentar(ABAS.controles, SEMENTES.controles.map(function (l) {
      return {
        id: l[0], departamento_id: l[1], nome: l[2], descricao: l[3],
        url: l[4], ordem: l[5], ativo: l[6], negocio: l[7], pasta: l[8],
      };
    }));
  }
  if (abaNovaEVazia(ABAS.planos)) {
    Repo.acrescentar(ABAS.planos, sementesPlanosDemo_());
  }
}

function sementesPlanosDemo_() {
  var hoje = Logica.paraData(new Date());
  function d(n) { return Logica.adicionarDias(hoje, n); }
  return [
    {
      id: 'SEED#1', fonte_id: 'SEED', fonte_nome: 'Demonstração', chave_origem: 'SEED#1',
      tema: 'Segurança', divisao: 'Operations', area: 'EHS',
      oque: 'Eliminar desvio de bloqueio LOTO na DDA2',
      como: 'Padronizar checklist de LOTO e treinar turno 1 e 2',
      responsavel: 'Ana Souza', email: 'ana.souza@example.com',
      prazo: d(5), status: 'Em andamento', comentarios: 'Treinamento agendado',
      ultimo_email_em: '', emails_enviados: 0, atualizado_em: new Date(),
    },
    {
      id: 'SEED#2', fonte_id: 'SEED', fonte_nome: 'Demonstração', chave_origem: 'SEED#2',
      tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade',
      oque: 'Reduzir NC de epóxi irregular',
      como: 'Ajustar janela de viscosidade e inspeção visual a cada 2h',
      responsavel: 'Bruno Lima', email: '',
      prazo: d(-3), status: 'Aberto', comentarios: 'Aguardando e-mail do responsável',
      ultimo_email_em: '', emails_enviados: 0, atualizado_em: new Date(),
    },
    {
      id: 'SEED#3', fonte_id: 'SEED', fonte_nome: 'Demonstração', chave_origem: 'SEED#3',
      tema: 'OEE', divisao: 'Operations', area: 'Produção',
      oque: 'Recuperar uptime da DDA1 abaixo da meta',
      como: 'A3 de paradas não justificadas + padrão de apontamento',
      responsavel: 'Carla Mendes', email: 'carla.mendes@example.com',
      prazo: d(-2), status: 'Aberto', comentarios: '',
      ultimo_email_em: '', emails_enviados: 0, atualizado_em: new Date(),
    },
    {
      id: 'SEED#4', fonte_id: 'SEED', fonte_nome: 'Demonstração', chave_origem: 'SEED#4',
      tema: 'Entrega', divisao: 'Supply Chain', area: 'Logística',
      oque: 'Estabilizar FIFO do armazém de acabados',
      como: 'Sinalizar endereços e auditar 2x por semana',
      responsavel: 'Diego Alves', email: 'diego.alves@example.com',
      prazo: d(12), status: 'Aberto', comentarios: '',
      ultimo_email_em: '', emails_enviados: 0, atualizado_em: new Date(),
    },
    {
      id: 'SEED#5', fonte_id: 'SEED', fonte_nome: 'Demonstração', chave_origem: 'SEED#5',
      tema: 'Manutenção', divisao: 'Operations', area: 'Manutenção',
      oque: 'Zerar backlog de preventiva atrasada > 7 dias',
      como: 'Janela semanal congelada na sexta para PCM',
      responsavel: 'Elisa Rocha', email: 'elisa.rocha@example.com',
      prazo: d(-10), status: 'Concluído', comentarios: 'Backlog zerado na semana 32',
      ultimo_email_em: '', emails_enviados: 0, atualizado_em: new Date(),
    },
  ];
}

function esconderAbasTecnicas_() {
  [ABAS.config, ABAS.emails, ABAS.log].forEach(function (nome) {
    var aba = Repo.planilha().getSheetByName(nome);
    if (aba) aba.hideSheet();
  });
}

function hojeLocal_() {
  var tz = Cadastros.config().texto('timezone', 'America/Sao_Paulo');
  var iso = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return Logica.paraData(iso);
}
