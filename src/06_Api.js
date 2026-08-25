function doGet(e) {
  var parametros = (e && e.parameter) || {};
  var pagina = HtmlService.createTemplate(PACOTE_HTML.index);
  pagina.parametros = parametros;
  return pagina.evaluate()
    .setTitle(APP.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setFaviconUrl('https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(nome) {
  if (nome === 'ui/Estilos') return PACOTE_HTML.estilos;
  if (nome === 'ui/App') return PACOTE_HTML.app;
  throw new Error('Arquivo HTML nao empacotado: ' + nome);
}

function identificarUsuario_() {
  var email = '';
  var nome = '';
  try { email = Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || ''; } catch (e) {}
  nome = email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Visitante';
  var partes = nome.split(' ').filter(Boolean);
  var iniciais = partes.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '--';
  return { email: email, nome: nome, iniciais: iniciais };
}

function apiContexto() {
  instalarSistema();
  var u = identificarUsuario_();
  return {
    app: { nome: APP.nome, versao: APP.versao },
    usuario: u,
    gatilho: estadoGatilho_(),
  };
}

function apiHub() {
  var hoje = hojeLocal_();
  var departamentos = Cadastros.departamentos().map(function (d) {
    return {
      id: d.id,
      nome: Logica.texto(d.nome),
      descricao: Logica.texto(d.descricao),
      icone: Logica.texto(d.icone) || 'geral',
      cor: Logica.texto(d.cor) || '#E4002B',
      ordem: Number(d.ordem || 0),
    };
  });
  var controles = Cadastros.controles().map(function (c) {
    return {
      id: c.id,
      departamento_id: c.departamento_id,
      nome: Logica.texto(c.nome),
      descricao: Logica.texto(c.descricao),
      url: Logica.texto(c.url),
      ordem: Number(c.ordem || 0),
    };
  });
  var planos = Cadastros.planos().map(function (p) {
    return Logica.prepararAcaoParaUi(p, hoje);
  });
  var kpis = Logica.kpis(Cadastros.planos(), hoje);
  var fontes = Cadastros.fontes().map(function (f) {
    return {
      id: f.id,
      nome: Logica.texto(f.nome),
      referencia: Logica.texto(f.referencia),
      aba: Logica.texto(f.aba),
      linha_cabecalho: f.linha_cabecalho || 1,
      ativo: Logica.sim(f.ativo),
      ultima_execucao: f.ultima_execucao ? String(f.ultima_execucao) : '',
      ultimo_status: Logica.texto(f.ultimo_status),
      ultimo_detalhe: Logica.texto(f.ultimo_detalhe),
    };
  });
  return {
    hoje: Logica.ymd(hoje),
    departamentos: departamentos,
    controles: controles,
    planos: planos,
    kpis: kpis,
    fontes: fontes,
    departamentosAdmin: Repo.ler(ABAS.departamentos),
    controlesAdmin: Repo.ler(ABAS.controles),
    gatilho: estadoGatilho_(),
  };
}

function apiSalvarDepartamento(reg) {
  return salvarEntidade_(ABAS.departamentos, reg, ['id', 'nome', 'descricao', 'icone', 'cor', 'ordem', 'ativo'], 'D');
}

function apiExcluirDepartamento(id) {
  return excluirPorId_(ABAS.departamentos, id);
}

function apiSalvarControle(reg) {
  return salvarEntidade_(ABAS.controles, reg, ['id', 'departamento_id', 'nome', 'descricao', 'url', 'ordem', 'ativo'], 'C');
}

function apiExcluirControle(id) {
  return excluirPorId_(ABAS.controles, id);
}

function apiSalvarFonte(reg) {
  if (reg && reg.referencia && !Logica.extrairIdPlanilha(reg.referencia)) {
    throw new Error('Cole a URL completa ou o ID da Google Sheet.');
  }
  return salvarEntidade_(ABAS.fontes, reg, ['id', 'nome', 'referencia', 'aba', 'linha_cabecalho', 'ativo'], 'F');
}

function apiExcluirFonte(id) {
  return excluirPorId_(ABAS.fontes, id);
}

function apiImportarAgora() {
  return importarTodasAsFontes();
}

function apiEnviarFollowUpsAgora() {
  return enviarFollowUps();
}

function apiCriarGatilho() {
  return { mensagem: criarGatilhoDiario(), gatilho: estadoGatilho_() };
}

function apiRemoverGatilhos() {
  removerGatilhos();
  return { mensagem: 'Gatilhos removidos.', gatilho: estadoGatilho_() };
}

function salvarEntidade_(abaNome, reg, campos, prefixo) {
  if (!reg) throw new Error('Registro vazio.');
  var id = Logica.texto(reg.id) || Logica.idNovo(prefixo);
  var registro = {};
  campos.forEach(function (c) {
    if (c === 'id') registro.id = id;
    else if (reg[c] !== undefined) registro[c] = reg[c];
  });
  if (registro.ativo === true || registro.ativo === 'SIM') registro.ativo = 'SIM';
  if (registro.ativo === false || registro.ativo === 'NAO' || registro.ativo === 'NÃO') registro.ativo = 'NAO';

  var lista = Repo.ler(abaNome);
  var atual = lista.filter(function (r) { return String(r.id) === String(id); })[0];
  if (atual) Repo.atualizarRegistro(abaNome, atual._linha, registro);
  else Repo.acrescentar(abaNome, [registro]);
  Repo.limparMemoria();
  return apiHub();
}

function excluirPorId_(abaNome, id) {
  var lista = Repo.ler(abaNome);
  var atual = lista.filter(function (r) { return String(r.id) === String(id); })[0];
  if (atual) Repo.excluirLinha(abaNome, atual._linha);
  Repo.limparMemoria();
  return apiHub();
}
