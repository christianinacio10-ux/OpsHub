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
assert.strictEqual(
  Logica.elegivelFollowUp(Object.assign({}, acao, { ultimo_email_em: hoje }), hoje).motivo,
  'ja_enviado_hoje'
);

assert.strictEqual(Logica.statusEfetivo({ status: 'Aberto', prazo: d(2026, 8, 20) }, hoje), 'Atrasado');
assert.strictEqual(Logica.statusEfetivo({ status: 'Concluído', prazo: d(2026, 8, 20) }, hoje), 'Concluído');

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
], 'Solutions');
assert.strictEqual(split.apparel.length, 1);
assert.strictEqual(split.smartrac.length, 1);

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

console.log('ok — ' + module.filename);
