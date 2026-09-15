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
  nome = Logica.tituloNome(email ? email.split('@')[0].replace(/[._]/g, ' ') : 'Visitante');
  var partes = nome.split(' ').filter(Boolean);
  var iniciais = partes.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); }).join('') || '--';
  return { email: email, nome: nome, iniciais: iniciais };
}

function apiSalvarIdioma(codigo) {
  return { idioma: I18n.salvar(codigo) };
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
      bandeira: Logica.normalizarBandeira(d.bandeira),
      tem_senha_planos: Logica.temSenhaPlanos(d),
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
      negocio: Logica.normalizarBandeira(c.negocio),
      pasta: Logica.texto(c.pasta),
    };
  });
  var planos = Cadastros.planos().map(function (p) {
    return Logica.prepararAcaoParaUi(p, hoje);
  });
  var kpis = Logica.kpis(Cadastros.planos(), hoje);
  var temasDistintos = Logica.unicos(planos, 'tema');
  var temasFollowUp = Logica.parseTemasFollowUp(Cadastros.config().texto('followup_temas', ''));
  var fontes = Cadastros.fontes().map(function (f) {
    return {
      id: f.id,
      nome: Logica.texto(f.nome),
      referencia: Logica.texto(f.referencia),
      aba: Logica.texto(f.aba),
      linha_cabecalho: f.linha_cabecalho || 1,
      ativo: Logica.fonteAtiva(f),
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
    temasDistintos: temasDistintos,
    temasFollowUp: temasFollowUp,
    fontes: fontes,
    departamentosAdmin: Repo.ler(ABAS.departamentos).map(function (d) {
      var copia = {};
      Object.keys(d).forEach(function (k) {
        if (k !== 'senha_planos') copia[k] = d[k];
      });
      return copia;
    }),
    controlesAdmin: Repo.ler(ABAS.controles),
    gatilho: estadoGatilho_(),
  };
}

function apiSalvarDepartamento(reg) {
  if (reg) reg.bandeira = Logica.normalizarBandeira(reg.bandeira);
  return salvarEntidade_(ABAS.departamentos, reg, ['id', 'nome', 'descricao', 'icone', 'cor', 'ordem', 'ativo', 'bandeira'], 'D');
}

function apiExcluirDepartamento(id) {
  return excluirPorId_(ABAS.departamentos, id);
}

function apiSalvarControle(reg) {
  if (reg) reg.negocio = Logica.normalizarBandeira(reg.negocio);
  return salvarEntidade_(ABAS.controles, reg, ['id', 'departamento_id', 'nome', 'descricao', 'url', 'ordem', 'ativo', 'negocio', 'pasta'], 'C');
}

function apiReordenarDepartamentos(ids) {
  ids = ids || [];
  ids.forEach(function (id, i) {
    var lista = Repo.ler(ABAS.departamentos);
    var atual = lista.filter(function (r) { return String(r.id) === String(id); })[0];
    if (atual) Repo.atualizarRegistro(ABAS.departamentos, atual._linha, { ordem: i + 1 });
  });
  Repo.limparMemoria();
  return apiHub();
}

function gravarTemasFollowUp_(valor) {
  var linhas = Repo.ler(ABAS.config);
  var atual = linhas.filter(function (l) { return String(l.chave) === 'followup_temas'; })[0];
  if (atual) {
    Repo.atualizarRegistro(ABAS.config, atual._linha, { valor: valor });
  } else {
    Repo.acrescentar(ABAS.config, [{
      chave: 'followup_temas',
      valor: valor,
      descricao: 'Temas que recebem e-mail de follow-up (vazio = todos, NONE = nenhum)',
    }]);
  }
  Repo.limparMemoria();
}

function apiSalvarTemasFollowUp(temas) {
  var lista = Logica.parseTemasFollowUp(temas);
  var valor = lista.length ? JSON.stringify(lista) : '';
  if (lista.length === 1 && Logica.texto(lista[0]) === '__NONE__') valor = 'NONE';
  gravarTemasFollowUp_(valor);
  return apiHub();
}

function apiAlternarTemaFollowUp(nome) {
  nome = Logica.texto(nome);
  if (!nome) throw new Error(I18n.t(I18n.atual(), 'erro_tema_vazio'));
  var todos = Logica.unicos(Cadastros.planos(), 'tema');
  var atuais = Logica.parseTemasFollowUp(Cadastros.config().texto('followup_temas', ''));
  var proximo = Logica.alternarTemaFollowUp(nome, atuais, todos);
  gravarTemasFollowUp_(Logica.persistirTemasFollowUp(proximo, todos));
  return apiHub();
}

function apiExcluirControle(id) {
  return excluirPorId_(ABAS.controles, id);
}

function apiSalvarFonte(reg) {
  if (reg && reg.referencia && !Logica.extrairIdPlanilha(reg.referencia) && !/^https?:\/\//i.test(String(reg.referencia || ''))) {
    throw new Error(I18n.t(I18n.atual(), 'erro_url'));
  }
  salvarEntidade_(ABAS.fontes, reg, ['id', 'nome', 'referencia', 'aba', 'linha_cabecalho', 'ativo'], 'F');
  return apiAtualizar();
}

function apiExcluirFonte(id) {
  return excluirPorId_(ABAS.fontes, id);
}

function apiImportarAgora() {
  return importarTodasAsFontes();
}

function apiAtualizar() {
  var imp = importarTodasAsFontes();
  var hub = apiHub();
  hub.importacao = imp;
  return hub;
}

function apiPreverFollowUps() {
  instalarSistema();
  var hoje = hojeLocal_();
  var temasHabilitados = Logica.parseTemasFollowUp(Cadastros.config().texto('followup_temas', ''));
  var total = 0;
  var temasJa = [];
  var vistos = {};
  Cadastros.planosFollowUp().forEach(function (plano) {
    var area = plano._folha === 'area';
    var forcado = Logica.elegivelFollowUp(plano, hoje, temasHabilitados, {
      ignorarJaEnviadoHoje: true,
      ignorarTemas: area,
    });
    if (!forcado.ok) return;
    total++;
    var normal = Logica.elegivelFollowUp(plano, hoje, temasHabilitados, { ignorarTemas: area });
    var tema = Logica.texto(plano.tema);
    if (!normal.ok && normal.motivo === 'ja_enviado_hoje' && tema && !vistos[tema]) {
      vistos[tema] = 1;
      temasJa.push(tema);
    }
  });
  return { total: total, temasJaEnviadosHoje: temasJa };
}

function apiEnviarFollowUpsAgora(forcar) {
  return enviarFollowUps({ forcar: !!forcar });
}

function apiCriarGatilho() {
  return { mensagem: criarGatilhoDiario(), gatilho: estadoGatilho_() };
}

function apiRemoverGatilhos() {
  removerGatilhos();
  return { mensagem: I18n.t(I18n.atual(), 'toast_gatilhos_removidos'), gatilho: estadoGatilho_() };
}

function salvarEntidade_(abaNome, reg, campos, prefixo) {
  if (!reg) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  var id = Logica.texto(reg.id) || Logica.idNovo(prefixo);
  var registro = {};
  campos.forEach(function (c) {
    if (c === 'id') registro.id = id;
    else if (reg[c] !== undefined) registro[c] = reg[c];
  });
  if (registro.ativo === true || registro.ativo === 'SIM' || registro.ativo === undefined || registro.ativo === '') registro.ativo = 'SIM';
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

function hashSenhaPlanos_(deptId, senha) {
  var s = 'opshub|' + String(deptId || '') + '|' + String(senha || '');
  if (typeof Utilities === 'undefined') return s;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  var out = [];
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    out.push(('0' + b.toString(16)).slice(-2));
  }
  return out.join('');
}

function cacheUsuario_() {
  try { return CacheService.getUserCache(); } catch (e) { return null; }
}

function areaDesbloqueada_(deptId) {
  var c = cacheUsuario_();
  return !!(c && c.get('area_ok_' + deptId));
}

function desbloquearArea_(deptId) {
  var c = cacheUsuario_();
  if (c) c.put('area_ok_' + deptId, '1', 8 * 3600);
}

function deptPorId_(id) {
  return Repo.ler(ABAS.departamentos).filter(function (d) { return String(d.id) === String(id); })[0];
}

function payloadPlanosArea_(dept) {
  var hoje = hojeLocal_();
  var lista = Logica.planosDoDepartamento(Cadastros.planosArea(), dept.id).map(function (p) {
    return Logica.prepararAcaoParaUi(p, hoje);
  });
  return {
    ok: true,
    precisaSenha: false,
    departamento_id: dept.id,
    tem_senha_planos: Logica.temSenhaPlanos(dept),
    planos: lista,
    kpis: Logica.kpis(Logica.planosDoDepartamento(Cadastros.planosArea(), dept.id), hoje),
  };
}

function apiPlanosArea(deptId) {
  instalarSistema();
  var dept = deptPorId_(deptId);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept) && !areaDesbloqueada_(dept.id)) {
    return { ok: false, precisaSenha: true, departamento_id: dept.id, tem_senha_planos: true, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
  }
  return payloadPlanosArea_(dept);
}

function apiAbrirPlanosArea(deptId, senha) {
  instalarSistema();
  var dept = deptPorId_(deptId);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept)) {
    if (hashSenhaPlanos_(dept.id, senha) !== Logica.texto(dept.senha_planos)) {
      return { ok: false, precisaSenha: true, senhaErrada: true, departamento_id: dept.id, tem_senha_planos: true, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
    }
  }
  desbloquearArea_(dept.id);
  return payloadPlanosArea_(dept);
}

function apiSalvarPlanoArea(reg) {
  instalarSistema();
  if (!reg || !reg.departamento_id) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  var dept = deptPorId_(reg.departamento_id);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept) && !areaDesbloqueada_(dept.id)) {
    return { ok: false, precisaSenha: true, departamento_id: dept.id, tem_senha_planos: true, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
  }
  if (!Logica.texto(reg.oque)) throw new Error(I18n.t(I18n.atual(), 'erro_oque'));
  var id = Logica.texto(reg.id) || Logica.idNovo('A');
  var atual = Repo.ler(ABAS.planosArea).filter(function (p) { return String(p.id) === String(id); })[0];
  var montado = Logica.montarPlanoArea(reg, dept, id);
  if (atual) {
    montado.ultimo_email_em = atual.ultimo_email_em;
    montado.emails_enviados = atual.emails_enviados;
    Repo.atualizarRegistro(ABAS.planosArea, atual._linha, montado);
  } else {
    Repo.acrescentar(ABAS.planosArea, [montado]);
  }
  Repo.limparMemoria();
  return payloadPlanosArea_(deptPorId_(dept.id));
}

function apiExcluirPlanoArea(id) {
  instalarSistema();
  var lista = Repo.ler(ABAS.planosArea);
  var atual = lista.filter(function (p) { return String(p.id) === String(id); })[0];
  if (!atual) {
    return { ok: true, precisaSenha: false, departamento_id: '', tem_senha_planos: false, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
  }
  var dept = deptPorId_(atual.departamento_id);
  if (dept && Logica.temSenhaPlanos(dept) && !areaDesbloqueada_(dept.id)) {
    return { ok: false, precisaSenha: true, departamento_id: dept.id, tem_senha_planos: true, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
  }
  Repo.excluirLinha(ABAS.planosArea, atual._linha);
  Repo.limparMemoria();
  return dept ? payloadPlanosArea_(deptPorId_(dept.id)) : { ok: true, planos: [], kpis: Logica.kpis([], hojeLocal_()) };
}

function apiDefinirSenhaPlanosArea(deptId, senhaAtual, senhaNova) {
  instalarSistema();
  var dept = deptPorId_(deptId);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept)) {
    if (hashSenhaPlanos_(dept.id, senhaAtual) !== Logica.texto(dept.senha_planos)) {
      throw new Error(I18n.t(I18n.atual(), 'erro_senha_atual'));
    }
  }
  var hash = Logica.texto(senhaNova) ? hashSenhaPlanos_(dept.id, senhaNova) : '';
  if (!hash && !Logica.temSenhaPlanos(dept)) {
    var hubVazio = apiHub();
    hubVazio.planosArea = payloadPlanosArea_(deptPorId_(dept.id));
    return hubVazio;
  }
  Repo.atualizarRegistro(ABAS.departamentos, dept._linha, { senha_planos: hash });
  Repo.limparMemoria();
  if (hash) desbloquearArea_(dept.id);
  var hub = apiHub();
  hub.planosArea = payloadPlanosArea_(deptPorId_(dept.id));
  return hub;
}
