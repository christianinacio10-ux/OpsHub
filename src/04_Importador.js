function importarTodasAsFontes() {
  instalarSistema();
  var fontes = Cadastros.fontes().filter(function (f) { return Logica.sim(f.ativo); });
  if (!fontes.length) {
    Repo.registrarLog('importar', 'OK', 'Nenhuma fonte ativa.');
    return { fontes: 0, linhas: 0, avisos: ['Nenhuma fonte ativa em FONTES_PLANOS.'] };
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
        ultimo_status: 'OK',
        ultimo_detalhe: novos.length + ' linhas',
      });
    } catch (e) {
      var msg = e && e.message ? e.message : String(e);
      avisos.push(fonte.nome + ': ' + msg);
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
  Repo.registrarLog('importar', 'OK', total + ' linhas de ' + fontes.length + ' fontes');
  return { fontes: fontes.length, linhas: total, avisos: avisos };
}

function lerFonte_(fonte) {
  var id = Logica.extrairIdPlanilha(fonte.referencia);
  if (!id) throw new Error('Referencia invalida. Cole a URL ou o ID da planilha.');

  var ss;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (e) {
    throw new Error('Sem acesso a planilha. Compartilhe com a conta que autorizou o OpsHub.');
  }

  var nomeAba = Logica.texto(fonte.aba);
  var aba = nomeAba ? ss.getSheetByName(nomeAba) : ss.getSheets()[0];
  if (!aba) throw new Error('Aba "' + nomeAba + '" nao encontrada.');

  var cabLinha = Math.max(1, Number(fonte.linha_cabecalho || 1) || 1);
  var ultima = aba.getLastRow();
  var ultimaCol = aba.getLastColumn();
  if (ultima < cabLinha + 1) return [];

  var cabecalhos = aba.getRange(cabLinha, 1, 1, ultimaCol).getValues()[0];
  var mapa = Logica.mapearColunas(cabecalhos);
  if (mapa.oque === undefined && mapa.tema === undefined) {
    throw new Error('Nao achei as colunas Tema / O quê?. Confira o cabecalho da aba origem.');
  }

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
