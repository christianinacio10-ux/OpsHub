function rotinaDiaria() {
  var resultadoImport = { linhas: 0, avisos: [] };
  try {
    resultadoImport = importarTodasAsFontes();
  } catch (e) {
    Repo.registrarLog('rotinaDiaria', 'ERRO', 'importacao: ' + (e && e.message ? e.message : e));
  }
  var envio = enviarFollowUps();
  return { importacao: resultadoImport, followup: envio };
}

function enviarFollowUps() {
  instalarSistema();
  var hoje = hojeLocal_();
  var planos = Cadastros.planos();
  var temasHabilitados = Logica.parseTemasFollowUp(Cadastros.config().texto('followup_temas', ''));
  var enviados = 0;
  var pulados = 0;
  var erros = 0;

  planos.forEach(function (plano) {
    var dec = Logica.elegivelFollowUp(plano, hoje, temasHabilitados);
    if (!dec.ok) {
      pulados++;
      return;
    }
    try {
      enviarEmailAcao_(plano, dec, hoje);
      var n = Number(plano.emails_enviados || 0) + 1;
      Repo.atualizarRegistro(ABAS.planos, plano._linha, {
        ultimo_email_em: new Date(),
        emails_enviados: n,
      });
      Repo.acrescentar(ABAS.emails, [{
        quando: new Date(),
        acao_id: plano.id || plano.chave_origem,
        email: dec.email,
        assunto: assuntoFollowUp_(plano),
        status: 'OK',
        detalhe: 'atraso ' + dec.diasAtraso + 'd',
      }]);
      enviados++;
    } catch (e) {
      erros++;
      Repo.acrescentar(ABAS.emails, [{
        quando: new Date(),
        acao_id: plano.id || plano.chave_origem,
        email: dec.email,
        assunto: assuntoFollowUp_(plano),
        status: 'ERRO',
        detalhe: e && e.message ? e.message : String(e),
      }]);
      Repo.registrarLog('followup', 'ERRO', (plano.id || '') + ' ' + (e && e.message ? e.message : e));
    }
  });

  Repo.registrarLog('followup', erros ? 'ERRO' : 'OK', 'enviados=' + enviados + ' pulados=' + pulados + ' erros=' + erros);
  return { enviados: enviados, pulados: pulados, erros: erros };
}

function assuntoFollowUp_(plano) {
  var prazo = Logica.formatarDataBr(Logica.paraData(plano.prazo));
  var oque = Logica.texto(plano.oque) || 'Ação sem título';
  return '[OpsHub] Ação atrasada — ' + oque.slice(0, 80) + (prazo ? ' (prazo ' + prazo + ')' : '');
}

function enviarEmailAcao_(plano, dec, hoje) {
  var prazo = Logica.formatarDataBr(Logica.paraData(plano.prazo));
  var blobLogo = blobLogoAvery_();
  var html = Logica.htmlFollowUp({
    plano: plano,
    dec: dec,
    hoje: hoje,
    prazo: prazo,
    email: dec.email,
    logoSrc: blobLogo ? 'cid:logoAvery' : '',
  });

  var nome = Cadastros.config().texto('remetente_nome', APP.nome);
  var opcoes = { htmlBody: html, name: nome };
  if (blobLogo) opcoes.inlineImages = { logoAvery: blobLogo };
  GmailApp.sendEmail(dec.email, assuntoFollowUp_(plano),
    'Ação atrasada: ' + Logica.texto(plano.oque) + '. Prazo: ' + prazo + '.',
    opcoes);
}

function blobLogoAvery_() {
  if (typeof LOGO_AVERY_B64 === 'undefined' || !LOGO_AVERY_B64) return null;
  try {
    return Utilities.newBlob(Utilities.base64Decode(LOGO_AVERY_B64), 'image/png', 'avery.png');
  } catch (e) {
    return null;
  }
}

function criarGatilhoDiario() {
  removerGatilhos();
  var hora = Cadastros.config().numero('hora_gatilho', 8);
  ScriptApp.newTrigger('rotinaDiaria')
    .timeBased()
    .atHour(Math.max(0, Math.min(23, hora)))
    .everyDays(1)
    .create();
  Repo.registrarLog('gatilho', 'OK', 'rotinaDiaria diaria as ' + hora + 'h');
  return 'Gatilho diario criado para a rotina das ' + hora + 'h (importa planos e envia follow-ups).';
}

function removerGatilhos() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var h = t.getHandlerFunction();
    if (h === 'rotinaDiaria' || h === 'enviarFollowUps' || h === 'importarTodasAsFontes') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function estadoGatilho_() {
  var lista = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'rotinaDiaria';
  });
  return {
    ativo: lista.length > 0,
    quantidade: lista.length,
    hora: Cadastros.config().numero('hora_gatilho', 8),
  };
}
