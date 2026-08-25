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
  var enviados = 0;
  var pulados = 0;
  var erros = 0;

  planos.forEach(function (plano) {
    var dec = Logica.elegivelFollowUp(plano, hoje);
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
  var html = [
    '<div style="font-family:Segoe UI,Arial,sans-serif;background:#07080C;color:#F4F6FA;padding:24px">',
    '<div style="max-width:640px;margin:0 auto;background:#10141C;border:1px solid #2A3142;border-radius:16px;overflow:hidden">',
    '<div style="background:#E4002B;height:6px"></div>',
    '<div style="padding:28px">',
    '<div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#E4002B;font-weight:700">OpsHub · Avery Dennison</div>',
    '<h1 style="font-size:22px;margin:12px 0 8px">Ação com prazo vencido</h1>',
    '<p style="color:#A8B2C5;margin:0 0 20px">Este follow-up é enviado a partir de 1 dia de atraso, uma vez por dia, até o prazo ser reprogramado.</p>',
    '<table style="width:100%;border-collapse:collapse;font-size:14px">',
    linhaEmail_('Tema', plano.tema),
    linhaEmail_('Divisão', plano.divisao),
    linhaEmail_('Área', plano.area),
    linhaEmail_('O quê?', plano.oque),
    linhaEmail_('Como', plano.como),
    linhaEmail_('Responsável', plano.responsavel),
    linhaEmail_('Prazo', prazo),
    linhaEmail_('Atraso', dec.diasAtraso + ' dia(s) em ' + Logica.formatarDataBr(hoje)),
    linhaEmail_('Status', plano.status),
    linhaEmail_('Comentários', plano.comentarios),
    '</table>',
    '<p style="color:#6E7890;font-size:12px;margin:24px 0 0">Reprograme a data na planilha de origem para interromper estes e-mails.</p>',
    '</div></div></div>',
  ].join('');

  var nome = Cadastros.config().texto('remetente_nome', APP.nome);
  GmailApp.sendEmail(dec.email, assuntoFollowUp_(plano),
    'Ação atrasada: ' + Logica.texto(plano.oque) + '. Prazo: ' + prazo + '.',
    { htmlBody: html, name: nome });
}

function linhaEmail_(rotulo, valor) {
  var v = Logica.texto(valor) || '—';
  return '<tr><td style="padding:8px 0;color:#6E7890;width:140px;vertical-align:top">' +
    escaparHtml_(rotulo) + '</td><td style="padding:8px 0;color:#F4F6FA">' +
    escaparHtml_(v) + '</td></tr>';
}

function escaparHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
