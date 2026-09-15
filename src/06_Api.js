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

function payloadAreaTrancada_(dept, extra) {
  extra = extra || {};
  return {
    ok: false,
    precisaSenha: true,
    senhaErrada: !!extra.senhaErrada,
    departamento_id: dept.id,
    tem_senha_planos: true,
    planos: [],
    fontes: [],
    kpis: Logica.kpis([], hojeLocal_()),
  };
}

function fontesAreaDoDept_(deptId) {
  return Cadastros.fontesArea().filter(function (f) {
    return Logica.texto(f.departamento_id) === Logica.texto(deptId);
  }).map(function (f) {
    return {
      id: f.id,
      departamento_id: f.departamento_id,
      nome: f.nome,
      referencia: f.referencia,
      aba: f.aba,
      linha_cabecalho: f.linha_cabecalho,
      ativo: f.ativo,
      ultima_execucao: f.ultima_execucao,
      ultimo_status: f.ultimo_status,
      ultimo_detalhe: f.ultimo_detalhe,
    };
  });
}

function payloadPlanosArea_(dept) {
  var hoje = hojeLocal_();
  var brutos = Logica.planosDoDepartamento(Cadastros.planosArea(), dept.id);
  var lista = brutos.map(function (p) {
    return Logica.prepararAcaoParaUi(p, hoje);
  });
  return {
    ok: true,
    precisaSenha: false,
    departamento_id: dept.id,
    tem_senha_planos: Logica.temSenhaPlanos(dept),
    planos: lista,
    fontes: fontesAreaDoDept_(dept.id),
    kpis: Logica.kpis(brutos, hoje),
  };
}

function exigirAreaAberta_(deptId) {
  instalarSistema();
  var dept = deptPorId_(deptId);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept) && !areaDesbloqueada_(dept.id)) {
    return { bloqueado: payloadAreaTrancada_(dept) };
  }
  return { dept: dept };
}

function apiPlanosArea(deptId) {
  var gate = exigirAreaAberta_(deptId);
  if (gate.bloqueado) return gate.bloqueado;
  return payloadPlanosArea_(gate.dept);
}

function apiAbrirPlanosArea(deptId, senha) {
  instalarSistema();
  var dept = deptPorId_(deptId);
  if (!dept) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  if (Logica.temSenhaPlanos(dept)) {
    if (hashSenhaPlanos_(dept.id, senha) !== Logica.texto(dept.senha_planos)) {
      return payloadAreaTrancada_(dept, { senhaErrada: true });
    }
  }
  desbloquearArea_(dept.id);
  return payloadPlanosArea_(dept);
}

function apiSalvarFonteArea(reg) {
  if (!reg || !reg.departamento_id) throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
  var gate = exigirAreaAberta_(reg.departamento_id);
  if (gate.bloqueado) return gate.bloqueado;
  if (!Logica.texto(reg.referencia) || (!Logica.extrairIdPlanilha(reg.referencia) && !/^https?:\/\//i.test(String(reg.referencia || '')))) {
    throw new Error(I18n.t(I18n.atual(), 'erro_url'));
  }
  var id = Logica.texto(reg.id) || Logica.idNovo('FA');
  var registro = {
    id: id,
    departamento_id: gate.dept.id,
    nome: Logica.texto(reg.nome) || Logica.texto(gate.dept.nome),
    referencia: Logica.texto(reg.referencia),
    aba: Logica.texto(reg.aba),
    linha_cabecalho: Number(reg.linha_cabecalho || 1) || 1,
    ativo: (reg.ativo === false || reg.ativo === 'NAO' || reg.ativo === 'NÃO') ? 'NAO' : 'SIM',
  };
  var lista = Repo.ler(ABAS.fontesArea);
  var atual = lista.filter(function (r) { return String(r.id) === String(id); })[0];
  if (atual) {
    if (Logica.texto(atual.departamento_id) !== Logica.texto(gate.dept.id)) {
      throw new Error(I18n.t(I18n.atual(), 'erro_registro'));
    }
    Repo.atualizarRegistro(ABAS.fontesArea, atual._linha, registro);
  } else {
    Repo.acrescentar(ABAS.fontesArea, [registro]);
  }
  Repo.limparMemoria();
  var imp = importarFontesArea_(gate.dept.id);
  var payload = payloadPlanosArea_(deptPorId_(gate.dept.id));
  payload.importacao = imp;
  return payload;
}

function apiExcluirFonteArea(id) {
  instalarSistema();
  var lista = Repo.ler(ABAS.fontesArea);
  var atual = lista.filter(function (r) { return String(r.id) === String(id); })[0];
  if (!atual) {
    return { ok: true, precisaSenha: false, departamento_id: '', tem_senha_planos: false, planos: [], fontes: [], kpis: Logica.kpis([], hojeLocal_()) };
  }
  var gate = exigirAreaAberta_(atual.departamento_id);
  if (gate.bloqueado) return gate.bloqueado;
  Repo.excluirLinha(ABAS.fontesArea, atual._linha);
  Repo.limparMemoria();
  var planos = Repo.ler(ABAS.planosArea).filter(function (p) {
    return Logica.texto(p.fonte_id) !== Logica.texto(id);
  });
  Repo.substituirAba(ABAS.planosArea, planos);
  Repo.limparMemoria();
  return payloadPlanosArea_(deptPorId_(gate.dept.id));
}

function apiImportarPlanosArea(deptId) {
  var gate = exigirAreaAberta_(deptId);
  if (gate.bloqueado) return gate.bloqueado;
  var imp = importarFontesArea_(gate.dept.id);
  var payload = payloadPlanosArea_(deptPorId_(gate.dept.id));
  payload.importacao = imp;
  return payload;
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
