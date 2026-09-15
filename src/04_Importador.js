function importarTodasAsFontes() {
  instalarSistema();
  var planta = importarListaFontes_(
    Cadastros.fontes().filter(function (f) { return Logica.fonteAtiva(f); }),
    ABAS.planos,
    ABAS.fontes,
    null
  );
  var area = importarFontesArea_();
  var fontes = (planta.fontes || 0) + (area.fontes || 0);
  var linhas = (planta.linhas || 0) + (area.linhas || 0);
  var avisos = (planta.avisos || []).concat(area.avisos || []);
  if (!fontes) {
    Repo.registrarLog('importar', 'OK', 'Nenhuma fonte ativa.');
    return {
      fontes: 0,
      linhas: 0,
      avisos: avisos.length ? avisos : [I18n.t(I18n.atual(), 'aviso_sem_fonte_ativa')],
    };
  }
  Repo.registrarLog('importar', avisos.length ? 'AVISO' : 'OK', linhas + ' linhas de ' + fontes + ' fontes');
  return { fontes: fontes, linhas: linhas, avisos: avisos };
}

function importarFontesArea_(soDeptId) {
  var deptId = Logica.texto(soDeptId);
  var fontes = Cadastros.fontesArea().filter(function (f) {
    if (!Logica.fonteAtiva(f)) return false;
    if (deptId && Logica.texto(f.departamento_id) !== deptId) return false;
    return true;
  });
  if (!fontes.length) return { fontes: 0, linhas: 0, avisos: [] };
  var depts = {};
  Repo.ler(ABAS.departamentos).forEach(function (d) {
    depts[Logica.texto(d.id)] = d;
  });
  return importarListaFontes_(fontes, ABAS.planosArea, ABAS.fontesArea, function (novos, fonte) {
    var dept = depts[Logica.texto(fonte.departamento_id)] || { id: fonte.departamento_id };
    return (novos || []).map(function (p) {
      return Logica.marcarPlanoDaArea(p, dept);
    });
  });
}

function importarListaFontes_(fontes, abaDestino, abaCadastroFontes, preparar) {
  if (!fontes || !fontes.length) return { fontes: 0, linhas: 0, avisos: [] };

  var avisos = [];
  var importadosPorFonte = {};
  var total = 0;

  fontes.forEach(function (fonte) {
    try {
      var novos = lerFonte_(fonte);
      if (preparar) novos = preparar(novos, fonte) || novos;
      importadosPorFonte[fonte.id] = novos;
      total += novos.length;
      Repo.atualizarRegistro(abaCadastroFontes, fonte._linha, {
        ultima_execucao: new Date(),
        ultimo_status: novos.length ? 'OK' : 'VAZIO',
        ultimo_detalhe: novos.length + ' linhas',
      });
      if (!novos.length) {
        avisos.push(I18n.t(I18n.atual(), 'aviso_fonte_vazia', { nome: fonte.nome || fonte.id }));
      }
    } catch (e) {
      var msg = e && e.message ? e.message : String(e);
      avisos.push((fonte.nome || fonte.id) + ': ' + msg);
      Repo.atualizarRegistro(abaCadastroFontes, fonte._linha, {
        ultima_execucao: new Date(),
        ultimo_status: 'ERRO',
        ultimo_detalhe: msg,
      });
      Repo.registrarLog('importar', 'ERRO', fonte.id + ' ' + msg);
    }
  });

  var atuais = Repo.ler(abaDestino);
  var manter = atuais.filter(function (p) {
    return !importadosPorFonte.hasOwnProperty(p.fonte_id);
  });
  var mesclados = [];
  Object.keys(importadosPorFonte).forEach(function (fid) {
    var anteriores = atuais.filter(function (p) { return p.fonte_id === fid; });
    mesclados = mesclados.concat(Logica.mesclarImportacao(anteriores, importadosPorFonte[fid]));
  });

  var final = manter.concat(mesclados).map(function (p) {
    p.atualizado_em = new Date();
    if (p.prazo && typeof p.prazo !== 'object') p.prazo = Logica.paraData(p.prazo);
    p.emails_enviados = Number(p.emails_enviados || 0);
    return p;
  });

  Repo.substituirAba(abaDestino, final);
  Repo.limparMemoria();
  return { fontes: fontes.length, linhas: total, avisos: avisos };
}

function abrirPlanilhaOrigem_(ref) {
  var s = Logica.texto(ref);
  if (!s) throw new Error(I18n.t(I18n.atual(), 'erro_url_fonte'));
  if (/\/spreadsheets\/d\/e\//.test(s)) {
    throw new Error(I18n.t(I18n.atual(), 'erro_link_publicacao'));
  }
  var id = Logica.extrairIdPlanilha(s);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (eId) {}
  }
  if (/^https?:\/\//i.test(s)) {
    try { return SpreadsheetApp.openByUrl(s); } catch (e1) {
      throw new Error(I18n.t(I18n.atual(), 'erro_sem_acesso'));
    }
  }
  if (!id) throw new Error(I18n.t(I18n.atual(), 'erro_ref_invalida'));
  throw new Error(I18n.t(I18n.atual(), 'erro_sem_acesso_curto'));
}

function abaOrigem_(ss, fonte) {
  var nomeAba = Logica.texto(fonte.aba);
  if (nomeAba) {
    var porNome = ss.getSheetByName(nomeAba);
    if (porNome) return porNome;
    throw new Error(I18n.t(I18n.atual(), 'erro_aba', { nome: nomeAba, planilha: ss.getName() }));
  }
  var gid = Logica.extrairGid(fonte.referencia);
  if (gid !== null && !isNaN(gid)) {
    var folhas = ss.getSheets();
    for (var i = 0; i < folhas.length; i++) {
      if (folhas[i].getSheetId() === gid) return folhas[i];
    }
  }
  return ss.getSheets()[0];
}

function lerFonte_(fonte) {
  var ss = abrirPlanilhaOrigem_(fonte.referencia);
  var aba = abaOrigem_(ss, fonte);
  var cabLinhaPref = Math.max(1, Number(fonte.linha_cabecalho || 1) || 1);
  var ultima = aba.getLastRow();
  var ultimaCol = aba.getLastColumn();
  if (ultima < 2 || ultimaCol < 1) return [];

  var scan = Math.min(8, ultima);
  var topo = aba.getRange(1, 1, scan, ultimaCol).getValues();
  var escolhido = Logica.escolherLinhaCabecalho(topo, cabLinhaPref);
  if (escolhido.score < 2 && escolhido.mapa.oque === undefined && escolhido.mapa.tema === undefined) {
    throw new Error(I18n.t(I18n.atual(), 'erro_colunas', { nome: aba.getName() }));
  }

  var cabLinha = escolhido.linha;
  var mapa = escolhido.mapa;
  if (ultima < cabLinha + 1) return [];

  var qtd = ultima - cabLinha;
  var valores = aba.getRange(cabLinha + 1, 1, qtd, ultimaCol).getValues();
  var out = [];
  for (var i = 0; i < valores.length; i++) {
    var plano = Logica.linhaFonteParaPlano(valores[i], mapa, {
      fonteId: fonte.id,
      fonteNome: fonte.nome,
      linhaFonte: cabLinha + 1 + i,
    });
    if (!plano.oque && !plano.tema && !plano.responsavel) continue;
    out.push(plano);
  }
  return out;
}
