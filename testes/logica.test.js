'use strict';

var assert = require('assert');
var Logica = require('../src/00_Logica.js');

function d(y, m, day) { return new Date(y, m - 1, day); }

var hoje = d(2026, 8, 25);

assert.strictEqual(Logica.emailValido('ana@avery.com'), true);
assert.strictEqual(Logica.emailValido(''), false);
assert.strictEqual(Logica.emailValido('sem-arroba'), false);

var mapa = Logica.mapearColunas([
  'Tema', 'Divisão', 'Área', 'O quê?', 'Como', 'Responsável', 'E-mail', 'Prazo', 'Status', 'Comentários',
]);
assert.deepStrictEqual(
  ['tema', 'divisao', 'area', 'oque', 'como', 'responsavel', 'email', 'prazo', 'status', 'comentarios'].map(function (c) {
    return mapa[c];
  }),
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
);

assert.strictEqual(Logica.ymd(Logica.paraData('25/08/2026')), '2026-08-25');
assert.strictEqual(Logica.ymd(Logica.paraData('2026-08-25')), '2026-08-25');
assert.ok(Logica.paraData(new Date(2026, 7, 25)));

assert.strictEqual(Logica.extrairIdPlanilha('https://docs.google.com/spreadsheets/d/abcDEF123_-/edit#gid=0'), 'abcDEF123_-');
assert.strictEqual(Logica.extrairIdPlanilha('abcDEF123_-xyzxyzxyzxyzxyz'), 'abcDEF123_-xyzxyzxyzxyzxyz');
assert.strictEqual(Logica.extrairIdPlanilha('nao e planilha'), '');

var acao = {
  email: 'carla@avery.com',
  status: 'Aberto',
  prazo: d(2026, 8, 24),
};
assert.strictEqual(Logica.elegivelFollowUp(acao, hoje).ok, true, 'ontem + atraso 1 dia = envia');
assert.strictEqual(Logica.elegivelFollowUp(acao, d(2026, 8, 24)).ok, false, 'no dia do prazo nao envia');
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { email: '' }), hoje).motivo, 'sem_email');
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { status: 'Concluído' }), hoje).ok, false);
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { prazo: d(2026, 9, 1) }), hoje).motivo, 'ainda_no_prazo');
assert.strictEqual(Logica.followUpAcaoLigada({}), true, 'planta vazia continua ligada');
assert.strictEqual(Logica.followUpAcaoLigada({ followup: '' }), true);
assert.strictEqual(Logica.followUpAcaoLigada({ followup: 'SIM' }), true);
assert.strictEqual(Logica.followUpAcaoLigada({ followup: 'NAO' }), false);
assert.strictEqual(Logica.followUpAcaoLigada({ departamento_id: 'D-EHS' }), false, 'área vazia começa pausada');
assert.strictEqual(Logica.followUpAcaoLigada({ departamento_id: 'D-EHS', followup: '' }), false);
assert.strictEqual(Logica.followUpAcaoLigada({ departamento_id: 'D-EHS', followup: 'SIM' }), true);
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { followup: 'NAO' }), hoje).motivo, 'acao_desligada');
assert.strictEqual(
  Logica.elegivelFollowUp(Object.assign({}, acao, { departamento_id: 'D-EHS' }), hoje).motivo,
  'acao_desligada'
);
var mesclado = Logica.mesclarImportacao(
  [{ chave_origem: 'k1', ultimo_email_em: hoje, emails_enviados: 2, followup: 'NAO' }],
  [{ chave_origem: 'k1', oque: 'novo' }]
);
assert.strictEqual(mesclado[0].followup, 'NAO');
assert.strictEqual(mesclado[0].emails_enviados, 2);

var temasChip = ['TIER_3', 'UEE/Scrap_Apparel', 'UEE/SCRAP_APPAREL'];
assert.deepStrictEqual(
  Logica.proximoFiltroTema(temasChip, temasChip, true, 'UEE/Scrap_Apparel'),
  { todosTemas: false, temas: ['UEE/Scrap_Apparel'] },
  'clicar um tema com Todos ligado isola só aquele tema'
);
assert.deepStrictEqual(
  Logica.proximoFiltroTema(temasChip, ['UEE/Scrap_Apparel'], false, 'UEE/Scrap_Apparel'),
  { todosTemas: true, temas: temasChip },
  'clicar de novo o tema isolado volta para Todos'
);
assert.deepStrictEqual(
  Logica.proximoFiltroTema(temasChip, ['UEE/Scrap_Apparel'], false, 'TIER_3'),
  { todosTemas: false, temas: ['UEE/Scrap_Apparel', 'TIER_3'] },
  'clicar outro tema soma ao filtro'
);
assert.deepStrictEqual(
  Logica.proximoFiltroTema(temasChip, ['UEE/Scrap_Apparel', 'TIER_3'], false, 'TIER_3'),
  { todosTemas: false, temas: ['UEE/Scrap_Apparel'] }
);
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { ultimo_email_em: hoje }), hoje).motivo,
  'ja_enviado_hoje'
);
assert.strictEqual(Logica.tituloNome('christian inacio'), 'Christian Inacio');
assert.strictEqual(Logica.tituloNome('PLANT MANAGER'), 'Plant Manager');
assert.deepStrictEqual(Logica.parseTemasFollowUp(''), []);
assert.deepStrictEqual(Logica.parseTemasFollowUp('[]'), []);
assert.deepStrictEqual(Logica.parseTemasFollowUp('["OEE","EHS"]'), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp('OEE, EHS'), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp({ json: '["OEE","EHS"]' }), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp({ json: '[]' }), []);
assert.deepStrictEqual(Logica.parseTemasFollowUp({ 0: 'OEE', 1: 'EHS', length: 2 }), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp({ 0: 'OEE', 1: 'EHS' }), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp('OPSHUB_TEMAS:["OEE"]'), ['OEE']);
assert.deepStrictEqual(Logica.parseTemasFollowUp({ json: ['OEE', 'EHS'] }), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp('TEMAS\nOEE\nEHS'), ['OEE', 'EHS']);
assert.deepStrictEqual(Logica.parseTemasFollowUp('TEMAS\n'), []);
assert.deepStrictEqual(Logica.parseTemasFollowUp(Logica.serializarTemasFollowUp(['OEE', ' Qualidade '])), ['OEE', 'Qualidade']);
assert.deepStrictEqual(Logica.parseTemasFollowUp(Logica.serializarTemasFollowUp([])), []);
assert.deepStrictEqual(Logica.parseTemasFollowUp('NONE'), ['__NONE__']);
assert.deepStrictEqual(Logica.alternarTemaFollowUp('OEE', [], ['OEE', 'EHS']), ['EHS']);
assert.deepStrictEqual(Logica.alternarTemaFollowUp('OEE', ['EHS'], ['OEE', 'EHS']), ['EHS', 'OEE']);
assert.deepStrictEqual(Logica.alternarTemaFollowUp('OEE', ['OEE'], ['OEE']), ['__NONE__']);
assert.deepStrictEqual(Logica.alternarTemaFollowUp('OEE', ['__NONE__'], ['OEE', 'EHS']), ['OEE']);
assert.strictEqual(Logica.persistirTemasFollowUp(['__NONE__'], ['OEE']), 'NONE');
assert.strictEqual(Logica.persistirTemasFollowUp(['OEE', 'EHS'], ['OEE', 'EHS']), '');
assert.strictEqual(Logica.persistirTemasFollowUp(['OEE'], ['OEE', 'EHS']), '["OEE"]');
assert.strictEqual(Logica.temaFollowUpHabilitado('OEE', ['__NONE__']), false);
assert.strictEqual(Logica.deveAplicarSemente(['DEPARTAMENTOS'], 'DEPARTAMENTOS', 0), true);
assert.strictEqual(Logica.deveAplicarSemente([], 'DEPARTAMENTOS', 0), false);
assert.strictEqual(Logica.deveAplicarSemente(['DEPARTAMENTOS'], 'DEPARTAMENTOS', 1), false);
assert.strictEqual(Logica.temaFollowUpHabilitado('OEE', []), true);
assert.strictEqual(Logica.temaFollowUpHabilitado('OEE', ['EHS']), false);
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { tema: 'OEE' }), hoje, ['EHS']).motivo, 'tema_desligado');
assert.strictEqual(Logica.elegivelFollowUp(Object.assign({}, acao, { tema: 'EHS' }), hoje, ['EHS']).ok, true);
assert.strictEqual(
  Logica.elegivelFollowUp(Object.assign({}, acao, { ultimo_email_em: hoje }), hoje, [], { ignorarJaEnviadoHoje: true }).ok,
  true,
  'envio manual pode repetir no mesmo dia'
);
assert.strictEqual(
  Logica.elegivelFollowUp(Object.assign({}, acao, { tema: 'OEE' }), hoje, ['EHS'], { ignorarTemas: true }).ok,
  true,
  'opcao ignorarTemas permanece disponivel'
);

var regraTodos = Logica.regraFollowUpArea({});
assert.deepStrictEqual(regraTodos.temas, ['__NONE__'], 'área sem temas começa com nenhum ligado');
assert.strictEqual(Logica.temaFollowUpHabilitado('TIER_3', regraTodos.temas), false);
assert.strictEqual(regraTodos.soEu, true, 'área começa em cobrar só meu e-mail');
assert.strictEqual(Logica.emailDestinoFollowUp({ email: 'carla@avery.com' }, regraTodos), '');
assert.strictEqual(
  Logica.emailDestinoFollowUp({ email: 'carla@avery.com' }, Object.assign({}, regraTodos, { gestorEmail: 'gestor@avery.com' })),
  'gestor@avery.com',
  'so eu redireciona para o gestor'
);

var regraSoEu = Logica.regraFollowUpArea({
  followup_so_eu: 'SIM',
  followup_gestor_email: 'gestor@avery.com',
  followup_emails_off: '[]',
});
assert.strictEqual(Logica.emailDestinoFollowUp({ email: 'carla@avery.com' }, regraSoEu), 'gestor@avery.com');
assert.strictEqual(Logica.emailFollowUpPermitido('gestor@avery.com', regraSoEu), true);

var regraTodosResp = Logica.regraFollowUpArea({ followup_so_eu: 'NAO' });
assert.strictEqual(regraTodosResp.soEu, false);
assert.strictEqual(Logica.emailDestinoFollowUp({ email: 'carla@avery.com' }, regraTodosResp), 'carla@avery.com');
assert.strictEqual(Logica.emailFollowUpPermitido('carla@avery.com', regraTodosResp), true);

var regraOff = Logica.regraFollowUpArea({
  followup_so_eu: 'NAO',
  followup_emails_off: '["carla@avery.com"]',
});
assert.strictEqual(Logica.emailFollowUpPermitido('carla@avery.com', regraOff), false);
assert.strictEqual(Logica.emailFollowUpPermitido('ana@avery.com', regraOff), true);
assert.deepStrictEqual(Logica.alternarEmailOff('carla@avery.com', []), ['carla@avery.com']);
assert.deepStrictEqual(Logica.alternarEmailOff('carla@avery.com', ['carla@avery.com']), []);
assert.strictEqual(Logica.persistirEmailsOff(['Ana@x.com', 'ana@x.com']), '["ana@x.com"]');
assert.deepStrictEqual(Logica.parseEmailsOff('["a@x.com"]'), ['a@x.com']);
assert.strictEqual(Logica.temaFollowUpHabilitado('TIER_3', Logica.regraFollowUpArea({ followup_temas: 'NONE' }).temas), false);
assert.strictEqual(Logica.persistirTemasFollowUpArea(['__NONE__']), 'NONE');
assert.strictEqual(Logica.persistirTemasFollowUpArea([]), 'NONE');
assert.strictEqual(Logica.persistirTemasFollowUpArea(['TIER_3', 'OEE']), '["TIER_3","OEE"]');
assert.strictEqual(
  Logica.persistirTemasFollowUpArea(['TIER_3']),
  '["TIER_3"]',
  'área não colapsa um tema ligado para vazio'
);
assert.deepStrictEqual(Logica.temasFollowUpArea(''), ['__NONE__']);
assert.deepStrictEqual(Logica.temasFollowUpArea('["TIER_3"]'), ['TIER_3']);
assert.deepStrictEqual(
  Logica.alternarTemaFollowUp('TIER_3', ['__NONE__'], ['TIER_3', 'OEE']),
  ['TIER_3'],
  'clicar um tema com nenhum ligado liga só ele'
);
assert.deepStrictEqual(
  Logica.alternarTemaFollowUp('TIER_3', ['TIER_3'], ['TIER_3', 'OEE']),
  ['__NONE__'],
  'clicar de novo o único tema ligado volta para nenhum'
);
var futuraArea = Object.assign({}, acao, {
  departamento_id: 'D-EHS',
  followup: 'SIM',
  prazo: d(2026, 9, 21),
  tema: 'TIER_3',
});
assert.strictEqual(Logica.elegivelFollowUp(futuraArea, hoje, ['TIER_3']).motivo, 'ainda_no_prazo');
assert.strictEqual(
  Logica.elegivelFollowUp(futuraArea, hoje, ['TIER_3'], { ignorarPrazo: true }).ok,
  true,
  'envio manual da área ignora prazo'
);
assert.strictEqual(
  Logica.elegivelFollowUp(futuraArea, hoje, ['__NONE__'], { ignorarPrazo: true, ignorarTemas: true }).ok,
  true,
  'envio manual da área com Cobrar na linha ignora tema desligado'
);
assert.strictEqual(Logica.temSenhaPlanos({ senha_planos: 'abc' }), true);
assert.strictEqual(Logica.temSenhaPlanos({ senha_planos: '' }), false);
assert.strictEqual(Logica.temSenhaPlanos({}), false);
assert.strictEqual(
  Logica.planosDoDepartamento(
    [{ departamento_id: 'D-PROD', oque: 'a' }, { departamento_id: 'D-QUAL', oque: 'b' }],
    'D-PROD'
  ).length,
  1
);
var montArea = Logica.marcarPlanoDaArea(
  { oque: 'SMED interno', area: '', divisao: '' },
  { id: 'D-PROD', nome: 'Produção', bandeira: 'Solutions' }
);
assert.strictEqual(montArea.departamento_id, 'D-PROD');
assert.strictEqual(montArea.divisao, 'Solutions');
assert.strictEqual(montArea.area, 'Produção');
assert.strictEqual(montArea.oque, 'SMED interno');
var areaJaPreenchida = Logica.marcarPlanoDaArea(
  { area: 'Linha DDA', divisao: 'Apparel', oque: 'Setup' },
  { id: 'D-PROD', nome: 'Produção', bandeira: 'Solutions' }
);
assert.strictEqual(areaJaPreenchida.area, 'Linha DDA');
assert.strictEqual(areaJaPreenchida.divisao, 'Apparel');
assert.strictEqual(Logica.prepararAcaoParaUi(montArea, hoje).departamento_id, 'D-PROD');

assert.strictEqual(Logica.statusEfetivo({ status: 'Aberto', prazo: d(2026, 8, 20) }, hoje), 'Atrasado');
assert.strictEqual(Logica.statusEfetivo({ status: 'Concluído', prazo: d(2026, 8, 20) }, hoje), 'Concluído');
assert.strictEqual(Logica.encerrada('Cancelada'), true);
assert.strictEqual(Logica.encerrada('Canceladas'), true);
assert.strictEqual(Logica.encerrada('cancelado'), true);
assert.strictEqual(Logica.encerrada('Concluída'), true);
assert.strictEqual(Logica.encerrada('Concluídas'), true);
assert.strictEqual(Logica.encerrada('cancelled'), true);
assert.strictEqual(Logica.encerrada('Em andamento'), false);
assert.strictEqual(Logica.tituloStatus('Cancelada'), 'Cancelado');
assert.strictEqual(Logica.tituloStatus('Concluídas'), 'Concluído');
assert.strictEqual(Logica.classeStatus('Canceladas'), 'neutro');

var linha = Logica.linhaFonteParaPlano(
  ['Segurança', 'Ops', 'EHS', 'LOTO', 'Treinar', 'Ana', 'ana@x.com', '20/08/2026', 'Aberto', 'ok'],
  mapa,
  { fonteId: 'F1', fonteNome: 'Qualidade', linhaFonte: 2 }
);
assert.strictEqual(linha.oque, 'LOTO');
assert.strictEqual(linha.chave_origem, 'F1#L2');

var mesclado = Logica.mesclarImportacao(
  [{ chave_origem: 'F1#L2', ultimo_email_em: hoje, emails_enviados: 3 }],
  [linha]
);
assert.strictEqual(mesclado[0].emails_enviados, 3);

var planos = [
  { tema: 'OEE', area: 'Produção', oque: 'Uptime', status: 'Aberto', prazo: d(2026, 8, 20), email: '', responsavel: 'A' },
  { tema: 'EHS', area: 'EHS', oque: 'LOTO', status: 'Aberto', prazo: d(2026, 9, 1), email: 'a@x.com', responsavel: 'B' },
];
var filtrado = Logica.filtrarPlanos(planos, { texto: 'uptime', hoje: hoje });
assert.strictEqual(filtrado.length, 1);

assert.strictEqual(Logica.filtrarPlanos(planos, { temaObrigatorio: true, hoje: hoje }).length, 0, 'sem tema selecionado a tabela fica vazia');
assert.strictEqual(Logica.filtrarPlanos(planos, { temas: ['OEE'], temaObrigatorio: true, hoje: hoje }).length, 1);
assert.strictEqual(Logica.filtrarPlanos(planos, { temas: ['OEE', 'EHS'], temaObrigatorio: true, hoje: hoje }).length, 2);
assert.strictEqual(Logica.filtrarPlanos(planos, { todosTemas: true, temaObrigatorio: true, hoje: hoje }).length, 2);
assert.strictEqual(
  Logica.filtrarPlanos(planos, { todosTemas: true, areas: ['Produção'], temaObrigatorio: true, hoje: hoje }).length,
  1
);
assert.strictEqual(
  Logica.filtrarPlanos(planos, { todosTemas: true, areas: [], temaObrigatorio: true, hoje: hoje }).length,
  0,
  'eixo Excel sem nenhum valor marcado esconde as linhas'
);
var planosComEncerradas = planos.concat([
  { tema: 'OEE', area: 'Produção', oque: 'Fechar', status: 'Concluído', prazo: d(2026, 8, 1), email: 'a@x.com', responsavel: 'A' },
  { tema: 'EHS', area: 'EHS', oque: 'Cancelar', status: 'Cancelado', prazo: d(2026, 8, 1), email: 'a@x.com', responsavel: 'B' },
]);
assert.strictEqual(
  Logica.filtrarPlanos(planosComEncerradas, { todosTemas: true, omitirEncerradas: true, hoje: hoje }).length,
  2,
  'filtro padrao esconde concluido e cancelado'
);
assert.strictEqual(
  Logica.filtrarPlanos(planosComEncerradas, { todosTemas: true, omitirEncerradas: false, hoje: hoje }).length,
  4,
  'sem omitir encerradas mostra todas'
);
assert.strictEqual(
  Logica.filtrarPlanos(planosComEncerradas, {
    todosTemas: true, omitirEncerradas: true, statuses: ['Concluído'], hoje: hoje,
  }).length,
  1,
  'lista explicita de status prevalece sobre o padrao'
);
var planosGrafias = planos.concat([
  { tema: 'OEE', area: 'Produção', oque: 'Fechar', status: 'Concluída', prazo: d(2026, 8, 1), email: 'a@x.com', responsavel: 'A' },
  { tema: 'EHS', area: 'EHS', oque: 'Cancelar', status: 'Cancelada', prazo: d(2026, 8, 1), email: 'a@x.com', responsavel: 'B' },
  { tema: 'OEE', area: 'Produção', oque: 'Várias', status: 'Canceladas', prazo: d(2026, 8, 1), email: 'a@x.com', responsavel: 'A' },
]);
assert.strictEqual(
  Logica.filtrarPlanos(planosGrafias, { todosTemas: true, omitirEncerradas: true, hoje: hoje }).length,
  2,
  'grafias femininas/plurais de cancelada e concluida tambem saem do padrao'
);
assert.strictEqual(Logica.passaEixo(null, 'x'), true);
assert.strictEqual(Logica.passaEixo([], 'x'), false);
assert.strictEqual(Logica.passaEixo(['OEE'], 'OEE'), true);
assert.deepStrictEqual(Logica.eixoDe({ tema: 'OEE' }, 'temas', 'tema'), ['OEE']);
assert.strictEqual(Logica.eixoDe({ temas: null }, 'temas', 'tema'), null);
var k = Logica.kpis(planos, hoje);
assert.strictEqual(k.atrasados, 1);
assert.strictEqual(k.semEmail, 1);

var ui = Logica.prepararAcaoParaUi(planos[0], hoje);
assert.strictEqual(ui.tem_email, false);
assert.ok(ui.tooltip_email.indexOf('não há e-mail') !== -1 || ui.tooltip_email.indexOf('nao ha e-mail') !== -1 || ui.tooltip_email.indexOf('e-mail cadastrado') !== -1);

assert.strictEqual(Logica.fonteAtiva({ ativo: '' }), true);
assert.strictEqual(Logica.fonteAtiva({ ativo: 'NAO' }), false);
assert.strictEqual(Logica.fonteAtiva({ ativo: 'SIM' }), true);
assert.strictEqual(Logica.extrairGid('https://docs.google.com/spreadsheets/d/abcDEF123_-xyzxyzxyzxyz/edit#gid=42'), 42);
assert.strictEqual(Logica.extrairIdPlanilha('https://docs.google.com/spreadsheets/d/e/2PACX-xxx/pubhtml'), '');

assert.strictEqual(Logica.normalizarBandeira('solutions'), 'Solutions');
assert.strictEqual(Logica.negocioDoControle({}, 'Apparel'), 'Apparel');
assert.strictEqual(Logica.negocioDoControle({ negocio: 'Smartrac' }, 'Solutions'), 'Smartrac');
assert.strictEqual(Logica.negocioDoControle({}, 'Solutions'), 'Solutions');
assert.strictEqual(Logica.negocioDoControle({ negocio: 'Solutions' }, 'Solutions'), 'Solutions');
var arvore = Logica.montarArvore([
  { nome: 'Hora a hora', pasta: 'Linha / Hora a hora', ordem: 1 },
  { nome: 'Programa', pasta: 'Linha / Programa', ordem: 2 },
  { nome: 'Raiz', pasta: '', ordem: 3 },
]);
assert.strictEqual(arvore.arquivos.length, 1);
assert.strictEqual(arvore.pastas.length, 1);
assert.strictEqual(arvore.pastas[0].nome, 'Linha');
assert.strictEqual(arvore.pastas[0].pastas.length, 2);
var split = Logica.separarPorNegocio([
  { nome: 'A', negocio: 'Apparel' },
  { nome: 'S', negocio: 'Smartrac' },
  { nome: 'P', negocio: 'Solutions' },
  { nome: 'X', negocio: '' },
], 'Solutions');
assert.strictEqual(split.apparel.length, 1);
assert.strictEqual(split.smartrac.length, 1);
assert.strictEqual(split.solutions.length, 2);

var mapaAcao = Logica.mapearColunas(['Tema', 'Ação corretiva', 'O quê?', 'Prazo']);
assert.strictEqual(mapaAcao.como, 1);
assert.strictEqual(mapaAcao.oque, 2);
assert.strictEqual(mapaAcao.prazo, 3);

var cab = Logica.escolherLinhaCabecalho([
  ['Planos 2026', '', '', ''],
  ['Tema', 'Divisão', 'Área', 'O quê?', 'Como', 'Responsável', 'E-mail', 'Prazo', 'Status', 'Comentários'],
], 1);
assert.strictEqual(cab.linha, 2);
assert.strictEqual(cab.mapa.oque, 3);

var htmlMail = Logica.htmlFollowUp({
  plano: {
    tema: 'EHS', divisao: 'Operations', area: 'EHS', oque: 'LOTO',
    como: 'Treinar', responsavel: 'Ana', status: 'Atrasado', comentarios: '',
  },
  dec: { email: 'ana@avery.com', diasAtraso: 2 },
  hoje: hoje,
  logoSrc: 'cid:logoAvery',
});
assert.ok(htmlMail.indexOf('#07080C') === -1);
assert.ok(htmlMail.indexOf('background:#ffffff') !== -1);
assert.ok(htmlMail.indexOf('OPSHUB') !== -1);
assert.ok(htmlMail.indexOf('Ação com prazo vencido') !== -1);
assert.ok(htmlMail.indexOf('ana@avery.com') !== -1);
assert.ok(htmlMail.indexOf('cid:logoAvery') !== -1);
assert.ok(htmlMail.indexOf('border:1px solid #C9C3BB') !== -1);

var I18n = require('../src/00_I18n.js');
global.I18n = I18n;
assert.strictEqual(I18n.normalizar('EN-US'), 'en');
assert.strictEqual(I18n.normalizar('es-MX'), 'es');
assert.strictEqual(I18n.t('en', 'nav_planos'), 'Action plans');
assert.strictEqual(I18n.t('es', 'nav_planos'), 'Planes de acción');
assert.strictEqual(I18n.t('pt', 'nav_planos'), 'Planos de ação');
assert.strictEqual(I18n.t('en', 'chave_inexistente_xyz'), 'chave_inexistente_xyz');
assert.strictEqual(I18n.t('en', 'n_acoes', { n: 3, total: 10 }), '3 of 10 actions');
assert.strictEqual(I18n.rotuloStatus('en', 'Aberto'), 'Open');
assert.strictEqual(I18n.rotuloStatus('es', 'Atrasado'), 'Retrasado');
assert.strictEqual(I18n.rotuloStatus('en', 'Concluída'), 'Done');
assert.strictEqual(I18n.rotuloStatus('pt', 'Cancelada'), 'Cancelado');
assert.strictEqual(I18n.rotuloStatus('en', 'Waiting on parts'), 'Waiting on parts');

var htmlEn = Logica.htmlFollowUp({
  idioma: 'en',
  plano: {
    tema: 'EHS', divisao: 'Operations', area: 'EHS', oque: 'LOTO',
    como: 'Treinar', responsavel: 'Ana', status: 'Atrasado', comentarios: '',
  },
  dec: { email: 'ana@avery.com', diasAtraso: 2 },
  hoje: hoje,
  prazo: '24/08/2026',
  logoSrc: 'cid:logoAvery',
});
assert.ok(htmlEn.indexOf('Action past due') !== -1);
assert.ok(htmlEn.indexOf('What?') !== -1);

assert.strictEqual(I18n.t('pt', 'planos_area_kicker'), 'Planos da área');
assert.strictEqual(I18n.t('en', 'planos_area_entrar'), 'Open plans');
assert.strictEqual(I18n.t('es', 'planos_area_senha_errada'), 'Contraseña incorrecta.');

Object.keys(I18n.TEXTOS.pt).forEach(function (k) {
  assert.ok(I18n.TEXTOS.en[k], 'en missing ' + k);
  assert.ok(I18n.TEXTOS.es[k], 'es missing ' + k);
});
Object.keys(I18n.TEXTOS.en).forEach(function (k) {
  assert.ok(I18n.TEXTOS.pt[k], 'pt missing ' + k);
});

console.log('ok — ' + module.filename);
