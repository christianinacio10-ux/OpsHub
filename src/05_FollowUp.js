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

function identificarEmailSessao_() {
  try {
    var u = identificarUsuario_();
    return Logica.texto(u && u.email).toLowerCase();
  } catch (e) {
    return '';
  }
}

function decisaoFollowUp_(plano, hoje, ctx) {
  ctx = ctx || {};
  var extra = {
    ignorarJaEnviadoHoje: !!ctx.ignorarJaEnviadoHoje,
    ignorarPrazo: !!ctx.ignorarPrazo,
    ignorarTemas: !!ctx.ignorarTemas,
  };
  var temas = ctx.temasPlanta;
  var regra = null;
  if (plano._folha === 'area') {
    regra = Logica.regraFollowUpArea(ctx.depts && ctx.depts[String(plano.departamento_id)]);
    if (regra.soEu && !regra.gestorEmail) regra.gestorEmail = Logica.texto(ctx.emailSessao);
    temas = regra.temas;
    if (regra.soEu) extra.emailOpcional = true;
  }
  var dec = Logica.elegivelFollowUp(plano, hoje, temas, extra);
  if (!dec.ok) return dec;
  if (regra) {
    var destino = Logica.emailDestinoFollowUp(plano, regra);
    if (!destino) return { ok: false, motivo: regra.soEu ? 'sem_email' : 'email_desligado' };
    dec.email = destino;
  }
  return dec;
}

function decisaoLembrete_(plano, hoje, ctx) {
  ctx = ctx || {};
  var fonte;
  var temas;
  if (plano._folha === 'area') {
    var dept = ctx.depts && ctx.depts[String(plano.departamento_id)];
    fonte = dept || {};
    temas = Logica.regraFollowUpArea(dept).temas;
  } else {
    fonte = {
      lembrete_modo: ctx.lembreteModo,
      lembrete_dias: ctx.lembreteDias,
      lembrete_email: ctx.lembreteEmail,
    };
    temas = ctx.temasPlanta;
  }
  var regra = Logica.regraLembrete(fonte);
  if (regra.modo === 'eu' && !regra.email) regra.email = Logica.texto(ctx.emailSessao);
  return Logica.elegivelLembrete(plano, hoje, regra, temas, {
    ignorarJaEnviadoHoje: !!ctx.ignorarJaEnviadoHoje,
  });
}

function enviarFollowUps(opcoes) {
  instalarSistema();
  if (typeof soltarEmailDoGestor_ === 'function') soltarEmailDoGestor_();
  opcoes = opcoes || {};
  var forcar = !!opcoes.forcar;
  var hoje = hojeLocal_();
  var planos = planosFollowUpFiltrados_(opcoes);
  var ctx = {
    temasPlanta: temasPlantaFollowUp_(),
    depts: mapaDepartamentos_(),
    ignorarJaEnviadoHoje: forcar,
    emailSessao: identificarEmailSessao_(),
    ignorarPrazo: !!opcoes.ignorarPrazo,
    ignorarTemas: !!opcoes.ignorarTemas,
    emailsHierarquia: Cadastros.config().texto('emails_hierarquia', ''),
    lembreteModo: Cadastros.config().texto('lembrete_modo', 'off'),
    lembreteDias: Cadastros.config().texto('lembrete_dias', '3'),
    lembreteEmail: Cadastros.config().texto('lembrete_email', ''),
  };
  var enviados = 0;
  var pulados = 0;
  var erros = 0;

  planos.forEach(function (plano) {
    if (!forcar) {
      var lem = decisaoLembrete_(plano, hoje, ctx);
      if (lem.ok) {
        try {
          enviarEmailAcao_(plano, lem, hoje, { lembrete: true });
          var abaLembrete = plano._folha === 'area' ? ABAS.planosArea : ABAS.planos;
          Repo.atualizarRegistro(abaLembrete, plano._linha, { ultimo_lembrete_em: new Date() });
          Repo.acrescentar(ABAS.emails, [{
            quando: new Date(),
            acao_id: plano.id || plano.chave_origem,
            email: lem.email,
            assunto: assuntoFollowUp_(plano, { lembrete: true, diasParaPrazo: lem.diasParaPrazo }),
            status: 'OK',
            detalhe: detalheEnvio_('lembrete ' + lem.diasParaPrazo + 'd', lem.email),
          }]);
          enviados++;
        } catch (lemErr) {
          erros++;
          Repo.acrescentar(ABAS.emails, [{
            quando: new Date(),
            acao_id: plano.id || plano.chave_origem,
            email: lem.email,
            assunto: assuntoFollowUp_(plano, { lembrete: true, diasParaPrazo: lem.diasParaPrazo }),
            status: 'ERRO',
            detalhe: lemErr && lemErr.message ? lemErr.message : String(lemErr),
          }]);
          Repo.registrarLog('followup', 'ERRO', (plano.id || '') + ' lembrete ' + (lemErr && lemErr.message ? lemErr.message : lemErr));
        }
        return;
      }
    }
    var dec = decisaoFollowUp_(plano, hoje, ctx);
    if (!dec.ok) {
      pulados++;
      return;
    }
    try {
      var jaEnviados = Number(plano.emails_enviados || 0);
      enviarEmailAcao_(plano, dec, hoje);
      var hier = emailHierarquiaDo_(plano, ctx);
      if (Logica.deveEscalarFollowUp(jaEnviados, hier, dec.email)) {
        try {
          enviarEmailAcao_(plano, dec, hoje, { escalacao: true, email: hier });
          Repo.acrescentar(ABAS.emails, [{
            quando: new Date(),
            acao_id: plano.id || plano.chave_origem,
            email: hier,
            assunto: assuntoFollowUp_(plano, true),
            status: 'OK',
            detalhe: detalheEnvio_('escalacao atraso ' + dec.diasAtraso + 'd', hier),
          }]);
        } catch (escalaErr) {
          erros++;
          Repo.acrescentar(ABAS.emails, [{
            quando: new Date(),
            acao_id: plano.id || plano.chave_origem,
            email: hier,
            assunto: assuntoFollowUp_(plano, true),
            status: 'ERRO',
            detalhe: escalaErr && escalaErr.message ? escalaErr.message : String(escalaErr),
          }]);
          Repo.registrarLog('followup', 'ERRO', (plano.id || '') + ' escalacao ' + (escalaErr && escalaErr.message ? escalaErr.message : escalaErr));
        }
      }
      var n = jaEnviados + 1;
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
        detalhe: detalheEnvio_('atraso ' + dec.diasAtraso + 'd', dec.email),
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

function detalheEnvio_(base, destino) {
  var cc = Logica.copiaOwnerHub(destino, Cadastros.config().texto('owner_hub_email', ''));
  return cc ? base + ' cc ' + cc : base;
}

function emailHierarquiaDo_(plano, ctx) {
  ctx = ctx || {};
  var pessoa = plano && plano.email;
  if (plano && plano._folha === 'area') {
    var dept = ctx.depts && ctx.depts[String(plano.departamento_id)];
    return Logica.emailChefeDe(dept && dept.emails_hierarquia, pessoa);
  }
  return Logica.emailChefeDe(ctx.emailsHierarquia, pessoa);
}

function assuntoFollowUp_(plano, flags) {
  var escalacao = flags === true || !!(flags && flags.escalacao);
  var lembrete = !!(flags && flags !== true && flags.lembrete);
  var prazo = Logica.formatarDataBr(Logica.paraData(plano.prazo));
  var idioma = I18n.atual();
  var oque = Logica.texto(plano.oque) || I18n.t(idioma, 'mail_oque_vazio');
  var curto = oque.slice(0, 80);
  var vars = { oque: curto, prazo: prazo, n: flags && flags.diasParaPrazo };
  if (lembrete) {
    if (flags.diasParaPrazo === 0) return comQuem_(I18n.t(idioma, 'mail_assunto_lembrete_hoje', vars), plano);
    return comQuem_(I18n.t(idioma, 'mail_assunto_lembrete', vars), plano);
  }
  if (escalacao) {
    if (prazo) return comQuem_(I18n.t(idioma, 'mail_assunto_hierarquia_prazo', vars), plano);
    return comQuem_(I18n.t(idioma, 'mail_assunto_hierarquia', vars), plano);
  }
  if (prazo) return comQuem_(I18n.t(idioma, 'mail_assunto_prazo', vars), plano);
  return comQuem_(I18n.t(idioma, 'mail_assunto', vars), plano);
}

function comQuem_(assunto, plano) {
  var quem = Logica.texto(plano && plano.responsavel);
  return quem ? assunto + ' — ' + quem : assunto;
}

function textoDestinatarios_(idioma, plano, para, copia) {
  var nome = Logica.texto(plano && plano.responsavel) || para;
  var linhas = [I18n.t(idioma, 'mail_para') + ': ' + nome + ' <' + para + '>'];
  if (copia) linhas.push(I18n.t(idioma, 'mail_copia') + ': ' + copia);
  return linhas.join('\n');
}

function tirarDaCaixaDeEntrada_(assunto) {
  try {
    var busca = 'in:inbox newer_than:2d "' + String(assunto || '').replace(/"/g, '') + '"';
    var threads = GmailApp.search(busca, 0, 8);
    for (var i = 0; i < threads.length; i++) threads[i].moveToArchive();
  } catch (e) {}
}

function enviarEmailAcao_(plano, dec, hoje, extra) {
  extra = extra || {};
  var destino = Logica.texto(extra.email || dec.email).toLowerCase();
  var escalacao = !!extra.escalacao;
  var lembrete = !!extra.lembrete;
  var prazo = Logica.formatarDataBr(Logica.paraData(plano.prazo));
  var idioma = I18n.atual();
  var blobLogo = blobLogoAvery_();
  var copia = Logica.copiaOwnerHub(destino, Cadastros.config().texto('owner_hub_email', ''));
  var conta = identificarEmailSessao_();
  var html = Logica.htmlFollowUp({
    plano: plano,
    dec: dec,
    hoje: hoje,
    prazo: prazo,
    email: destino,
    copia: copia,
    logoSrc: blobLogo ? 'cid:logoAvery' : '',
    idioma: idioma,
    nomeApp: APP.nome,
    escalacao: escalacao,
    lembrete: lembrete,
  });

  var nome = Cadastros.config().texto('remetente_nome', APP.nome);
  var assunto = assuntoFollowUp_(plano, {
    escalacao: escalacao,
    lembrete: lembrete,
    diasParaPrazo: dec && dec.diasParaPrazo,
  });
  var opcoes = { htmlBody: html, name: nome };
  if (copia) opcoes.cc = Logica.enderecoComNome('', copia);
  if (blobLogo) opcoes.inlineImages = { logoAvery: blobLogo };
  var textoChave = lembrete ? 'mail_texto_lembrete' : (escalacao ? 'mail_texto_hierarquia' : 'mail_texto');
  var texto = textoDestinatarios_(idioma, plano, destino, copia) + '\n' + I18n.t(idioma, textoChave, {
    oque: Logica.texto(plano.oque),
    prazo: prazo,
    n: dec && dec.diasParaPrazo,
  });
  GmailApp.sendEmail(Logica.enderecoComNome(plano.responsavel, destino), assunto, texto, opcoes);
  if (conta && conta !== destino && conta !== copia) {
    try { Utilities.sleep(300); } catch (e) {}
    tirarDaCaixaDeEntrada_(assunto);
  }
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
