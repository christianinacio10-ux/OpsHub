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

function mapaDepartamentos_() {
  var mapa = {};
  Repo.ler(ABAS.departamentos).forEach(function (d) {
    mapa[String(d.id)] = d;
  });
  return mapa;
}

function temasPlantaFollowUp_() {
  return Logica.parseTemasFollowUp(Cadastros.config().texto('followup_temas', ''));
}

function planosFollowUpFiltrados_(opcoes) {
  var planos = Cadastros.planosFollowUp();
  var soDept = Logica.texto(opcoes && opcoes.departamento_id);
  if (!soDept) return planos;
  return planos.filter(function (p) {
    return p._folha === 'area' && Logica.texto(p.departamento_id) === soDept;
  });
}

function decisaoFollowUp_(plano, hoje, ctx) {
  ctx = ctx || {};
  var extra = { ignorarJaEnviadoHoje: !!ctx.ignorarJaEnviadoHoje };
  var temas = ctx.temasPlanta;
  var regra = null;
  if (plano._folha === 'area') {
    regra = Logica.regraFollowUpArea(ctx.depts && ctx.depts[String(plano.departamento_id)]);
    temas = regra.temas;
  }
  var dec = Logica.elegivelFollowUp(plano, hoje, temas, extra);
  if (!dec.ok) return dec;
  if (regra && !Logica.emailFollowUpPermitido(dec.email, regra)) {
    return { ok: false, motivo: 'email_desligado' };
  }
  return dec;
}

function enviarFollowUps(opcoes) {
  instalarSistema();
  opcoes = opcoes || {};
  var forcar = !!opcoes.forcar;
  var hoje = hojeLocal_();
  var planos = planosFollowUpFiltrados_(opcoes);
  var ctx = {
    temasPlanta: temasPlantaFollowUp_(),
    depts: mapaDepartamentos_(),
    ignorarJaEnviadoHoje: forcar,
  };
  var enviados = 0;
  var pulados = 0;
  var erros = 0;

  planos.forEach(function (plano) {
    var dec = decisaoFollowUp_(plano, hoje, ctx);
    if (!dec.ok) {
      pulados++;
      return;
    }
    try {
      enviarEmailAcao_(plano, dec, hoje);
      var n = Number(plano.emails_enviados || 0) + 1;
      var abaPlano = plano._folha === 'area' ? ABAS.planosArea : ABAS.planos;
      Repo.atualizarRegistro(abaPlano, plano._linha, {
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
  var idioma = I18n.atual();
  var oque = Logica.texto(plano.oque) || I18n.t(idioma, 'mail_oque_vazio');
  var curto = oque.slice(0, 80);
  if (prazo) return I18n.t(idioma, 'mail_assunto_prazo', { oque: curto, prazo: prazo });
  return I18n.t(idioma, 'mail_assunto', { oque: curto });
}

function enviarEmailAcao_(plano, dec, hoje) {
  var prazo = Logica.formatarDataBr(Logica.paraData(plano.prazo));
  var idioma = I18n.atual();
  var blobLogo = blobLogoAvery_();
  var html = Logica.htmlFollowUp({
    plano: plano,
    dec: dec,
    hoje: hoje,
    prazo: prazo,
    email: dec.email,
    logoSrc: blobLogo ? 'cid:logoAvery' : '',
    idioma: idioma,
  });

  var nome = Cadastros.config().texto('remetente_nome', APP.nome);
  var opcoes = { htmlBody: html, name: nome };
  if (blobLogo) opcoes.inlineImages = { logoAvery: blobLogo };
  GmailApp.sendEmail(dec.email, assuntoFollowUp_(plano),
    I18n.t(idioma, 'mail_texto', { oque: Logica.texto(plano.oque), prazo: prazo }),
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
  return I18n.t(I18n.atual(), 'toast_gatilho', { hora: hora });
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
