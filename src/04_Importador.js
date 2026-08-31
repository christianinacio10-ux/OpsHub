function importarTodasAsFontes() {
  instalarSistema();
  var fontes = Cadastros.fontes().filter(function (f) { return Logica.fonteAtiva(f); });
  if (!fontes.length) {
    Repo.registrarLog('importar', 'OK', 'Nenhuma fonte ativa.');
    return { fontes: 0, linhas: 0, avisos: [I18n.t(I18n.atual(), 'aviso_sem_fonte_ativa')] };
  }

  var avisos = [];
  var importadosPorFonte = {};
  var total = 0;

  fontes.forEach(function (fonte) {
    try {
      var novos = lerFonte_(fonte);
      importadosPorFonte[fonte.id] = novos;
      total += novos.length;
      Repo.atualizarRegistro(ABAS.fontes, fonte._linha, {
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
      Repo.atualizarRegistro(ABAS.fontes, fonte._linha, {
        ultima_execucao: new Date(),
        ultimo_status: 'ERRO',
        ultimo_detalhe: msg,
      });
      Repo.registrarLog('importar', 'ERRO', fonte.id + ' ' + msg);
    }
  });

  var atuais = Cadastros.planos();
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

  Repo.substituirAba(ABAS.planos, final);
  Repo.limparMemoria();
  Repo.registrarLog('importar', avisos.length ? 'AVISO' : 'OK', total + ' linhas de ' + fontes.length + ' fontes');
  return { fontes: fontes.length, linhas: total, avisos: avisos };
}

function abrirPlanilhaOrigem_(ref) {
  var s = Logica.texto(ref);
  if (!s) throw new Error(I18n.t(I18n.atual(), 'erro_url_fonte'));
  if (/\/spreadsheets\/d\/e\//.test(s)) {
    throw new Error(I18n.t(I18n.atual(), 'erro_link_publicacao'));
  }
  if (/^https?:\/\//i.test(s)) {
    try { return SpreadsheetApp.openByUrl(s); } catch (e1) {
      var idUrl = Logica.extrairIdPlanilha(s);
      if (idUrl) {
        try { return SpreadsheetApp.openById(idUrl); } catch (e2) {}
      }
      throw new Error(I18n.t(I18n.atual(), 'erro_sem_acesso'));
    }
  }
  var id = Logica.extrairIdPlanilha(s);
  if (!id) throw new Error(I18n.t(I18n.atual(), 'erro_ref_invalida'));
  try {
    return SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error(I18n.t(I18n.atual(), 'erro_sem_acesso_curto'));
  }
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
