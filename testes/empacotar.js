'use strict';

var fs = require('fs');
var path = require('path');

var raiz = path.join(__dirname, '..');
var src = path.join(raiz, 'src');

function ler(rel) {
  return fs.readFileSync(path.join(raiz, rel), 'utf8');
}

function jsString(s) {
  return '"' + s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029') + '"';
}

var logoB64 = fs.readFileSync(path.join(raiz, 'assets/avery_logo.png')).toString('base64');
var logoUri = 'data:image/png;base64,' + logoB64;

var index = ler('src/ui/Index.html');
var estilos = ler('src/ui/Estilos.html').replace('{{LOGO_AVERY}}', logoUri);
var i18n = ler('src/00_I18n.js');
var app = '<script>\n' + i18n + '\n</script>\n' + ler('src/ui/App.html');

var pacote =
  'const PACOTE_HTML = {\n' +
  '  index: ' + jsString(index) + ',\n' +
  '  estilos: ' + jsString(estilos) + ',\n' +
  '  app: ' + jsString(app) + '\n' +
  '};\n';

var jsFiles = [
  '00_I18n.js',
  '00_Logica.js',
  '01_Config.js',
  '02_Repo.js',
  '03_Instalador.js',
  '04_Importador.js',
  '05_FollowUp.js',
  '06_Api.js',
].map(function (n) {
  return '\n/************************************************************ ' + n + ' */\n\n' +
    fs.readFileSync(path.join(src, n), 'utf8');
}).join('\n');

var cabeca = [
  '/**',
  ' * Pacote unico para colar no Apps Script como Code.gs.',
  ' * Gerado por testes/empacotar.js — nao edite este arquivo; edite src/.',
  ' */',
  '',
].join('\n');

var dest = path.join(raiz, 'Appscript.txt');
fs.writeFileSync(
  dest,
  cabeca + '\n' +
  'var LOGO_AVERY_B64 = ' + JSON.stringify(logoB64) + ';\n\n' +
  pacote + '\n' + jsFiles
);
console.log('escreveu', dest, fs.statSync(dest).size, 'bytes');

var mock = ler('testes/preview-mock.js');
var previewIndex = index
  .replace('<?!= include(\'ui/Estilos\'); ?>', estilos)
  .replace('<?!= include(\'ui/App\'); ?>', '<script>' + mock + '</script>\n' + app)
  .replace(
    'var PARAMETROS = <?!= JSON.stringify(parametros || {}) ?>;',
    'var PARAMETROS = {}; var PREVIEW = true;'
  );

fs.writeFileSync(path.join(raiz, 'preview/index.html'), previewIndex);
console.log('escreveu preview/index.html', previewIndex.length, 'bytes');

var Logica = require(path.join(src, '00_Logica.js'));
var emailPreview = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1">' +
  '<title>Follow-up OpsHub</title></head>' +
  '<body style="margin:0;background:#ffffff">' +
  Logica.htmlFollowUp({
    plano: {
      tema: 'Segurança', divisao: 'Operations', area: 'EHS',
      oque: 'Eliminar desvio de bloqueio LOTO na DDA2',
      como: 'Padronizar checklist de LOTO e treinar turno 1 e 2',
      responsavel: 'Ana Souza', status: 'Atrasado', comentarios: 'Treinamento agendado',
    },
    dec: { email: 'ana.souza@averydennison.com', diasAtraso: 2 },
    hoje: new Date(),
    prazo: '24/08/2026',
    logoSrc: logoUri,
  }) +
  '</body></html>';
fs.writeFileSync(path.join(raiz, 'preview/email.html'), emailPreview);
console.log('escreveu preview/email.html', emailPreview.length, 'bytes');
