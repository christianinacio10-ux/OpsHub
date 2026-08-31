/**
 * Regras puras do OpsHub. Sem SpreadsheetApp / GmailApp — da para testar
 * no Node e reusar no Apps Script.
 */
var Logica = (function () {
  'use strict';

  var COLUNAS_PLANO = [
    'tema', 'divisao', 'area', 'oque', 'como',
    'responsavel', 'email', 'prazo', 'status', 'comentarios',
  ];

  var ALIASES = {
    tema: ['tema', 'theme', 'assunto'],
    divisao: ['divisao', 'divisão', 'division', 'bu'],
    area: ['area', 'área', 'setor', 'department', 'departamento'],
    oque: ['oque', 'o que', 'o quê', 'what', 'descricao', 'descrição', 'titulo', 'título', 'action item'],
    como: ['como', 'how', 'contramedida', 'acao corretiva', 'ação corretiva', 'countermeasure'],
    responsavel: ['responsavel', 'responsável', 'owner', 'dono', 'pic'],
    email: ['email', 'e-mail', 'e mail', 'mail', 'correio'],
    prazo: ['prazo', 'due date', 'deadline', 'data limite', 'data prazo', 'vencimento', 'target date'],
    status: ['status', 'situacao', 'situação', 'estado'],
    comentarios: ['comentarios', 'comentários', 'comments', 'obs', 'observacao', 'observação', 'observacoes', 'observações'],
    id: ['id', 'codigo', 'código', 'chave'],
  };

  function familiaEncerrada(status) {
    var partes = statusChave(status).split(' ');
    var i, w;
    for (i = 0; i < partes.length; i++) {
      w = partes[i];
      if (!w) continue;
      if (w.indexOf('cancelad') === 0 || w === 'cancelled' || w === 'canceled' || w === 'cancel') {
        return 'cancelado';
      }
      if (w.indexOf('concluid') === 0 || w === 'done' || w === 'closed' || w === 'complete') {
        return 'concluido';
      }
    }
    return '';
  }

  function texto(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return '';
    return String(v).replace(/\u00a0/g, ' ').trim();
  }

  function sim(v) {
    var s = texto(v).toLowerCase();
    return s === 'sim' || s === 's' || s === 'yes' || s === 'true' || s === '1' || s === 'ativo';
  }

  function slug(v) {
    return texto(v)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function emailValido(v) {
    var s = texto(v).toLowerCase();
    if (!s) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function cabecalhoChave(v) {
    return slug(texto(v).replace(/\?/g, ''));
  }

  function aliasBate(chave, alias) {
    var a = cabecalhoChave(alias);
    if (!chave || !a) return false;
    if (chave === a) return true;
    if (a.length >= 5 && (chave.indexOf(a + ' ') === 0 || chave.indexOf(' ' + a + ' ') !== -1 || chave.slice(-a.length - 1) === ' ' + a)) {
      return true;
    }
    return false;
  }

  function mapearColunas(cabecalhos) {
    var mapa = {};
    var usados = {};
    (cabecalhos || []).forEach(function (h, i) {
      var chave = cabecalhoChave(h);
      if (!chave || usados[i]) return;
      Object.keys(ALIASES).forEach(function (campo) {
        if (mapa[campo] !== undefined) return;
        var lista = ALIASES[campo];
        for (var k = 0; k < lista.length; k++) {
          if (aliasBate(chave, lista[k])) {
            mapa[campo] = i;
            usados[i] = true;
            return;
          }
        }
      });
    });
    return mapa;
  }

  function pontuarMapa(mapa) {
    var n = 0;
    COLUNAS_PLANO.forEach(function (c) { if (mapa[c] !== undefined) n++; });
    if (mapa.oque !== undefined) n += 2;
    if (mapa.tema !== undefined) n += 1;
    return n;
  }

  function escolherLinhaCabecalho(linhas, preferida) {
    var pref = Math.max(1, Number(preferida || 1) || 1);
    var melhor = null;
    for (var i = 0; i < (linhas || []).length; i++) {
      var mapa = mapearColunas(linhas[i]);
      var cand = { linha: i + 1, mapa: mapa, score: pontuarMapa(mapa) };
      if (!melhor || cand.score > melhor.score || (cand.score === melhor.score && cand.linha === pref)) {
        melhor = cand;
      }
    }
    if (!melhor) return { linha: pref, mapa: {}, score: 0 };
    return melhor;
  }

  function fonteAtiva(f) {
    var s = texto(f && f.ativo);
    if (!s) return true;
    var k = s.toLowerCase();
    if (k === 'nao' || k === 'não' || k === 'no' || k === 'false' || k === '0' || k === 'inativo') return false;
    return sim(s);
  }

  function extrairGid(ref) {
    var m = texto(ref).match(/[?&#]gid=([0-9]+)/);
    return m ? Number(m[1]) : null;
  }

  /**
   * Converte Date, serial do Sheets, ISO, dd/mm/aaaa ou mm/dd/aaaa.
   * Serial do Sheets: dias desde 1899-12-30.
   */
  function paraData(v) {
    if (v === null || v === undefined || v === '') return null;
    if (v instanceof Date && !isNaN(v.getTime())) {
      return new Date(v.getFullYear(), v.getMonth(), v.getDate());
    }
    if (typeof v === 'number' && isFinite(v)) {
      var epoch = new Date(Date.UTC(1899, 11, 30));
      var d = new Date(epoch.getTime() + Math.round(v) * 86400000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    var s = texto(v);
    if (!s) return null;

    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);

    var br = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
    if (br) {
      var a = +br[1];
      var b = +br[2];
      var ano = +br[3];
      if (ano < 100) ano += 2000;
      if (a > 12) return new Date(ano, b - 1, a);
      return new Date(ano, b - 1, a);
    }
    var t = Date.parse(s);
    if (!isNaN(t)) {
      var dt = new Date(t);
      return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    }
    return null;
  }

  function ymd(d) {
    if (!d) return '';
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function formatarDataBr(d) {
    if (!d) return '';
    var day = d.getDate();
    var m = d.getMonth() + 1;
    return (day < 10 ? '0' : '') + day + '/' + (m < 10 ? '0' : '') + m + '/' + d.getFullYear();
  }

  function adicionarDias(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function compararDatas(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.getTime() - b.getTime();
  }

  function mesmoDia(a, b) {
    return !!(a && b && ymd(a) === ymd(b));
  }

  function statusChave(v) {
    return slug(v);
  }

  function encerrada(status) {
    return !!familiaEncerrada(status);
  }

  /**
   * Status efetivo para a UI: se o prazo ja passou e a acao nao encerrou,
   * vira Atrasado mesmo que a origem ainda diga Aberto.
   */
  function statusEfetivo(acao, hoje) {
    var bruto = texto(acao && acao.status) || 'Aberto';
    if (encerrada(bruto)) return tituloStatus(bruto);
    var prazo = paraData(acao && acao.prazo);
    if (prazo && hoje && compararDatas(prazo, hoje) < 0) return 'Atrasado';
    return tituloStatus(bruto) || 'Aberto';
  }

  function tituloStatus(v) {
    var enc = familiaEncerrada(v);
    if (enc === 'concluido') return 'Concluído';
    if (enc === 'cancelado') return 'Cancelado';
    var k = statusChave(v);
    if (k === 'atrasado' || k === 'overdue' || k === 'late') return 'Atrasado';
    if (k === 'em andamento' || k === 'andamento' || k === 'in progress') return 'Em andamento';
    if (k === 'aberto' || k === 'open' || k === 'pending' || !k) return 'Aberto';
    return texto(v);
  }

  function classeStatus(status) {
    var enc = familiaEncerrada(status);
    if (enc === 'concluido') return 'ok';
    if (enc === 'cancelado') return 'neutro';
    var k = statusChave(status);
    if (k === 'atrasado') return 'risco';
    if (k === 'em andamento') return 'info';
    return 'aberto';
  }

  /**
   * Primeiro e-mail no dia seguinte ao prazo (atraso de 1 dia).
   * Depois, um e-mail por dia civil ate o prazo ser reprogramado para
   * o futuro (ou a acao ser encerrada). Sem e-mail cadastrado: nao envia.
   */
  function tituloNome(v) {
    return texto(v).split(/\s+/).filter(Boolean).map(function (p) {
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(' ');
  }

  function itensDeLista_(valor) {
    var extraido = [];
    var n = valor && valor.length;
    if (typeof n === 'number') {
      for (var i = 0; i < n; i++) extraido.push(texto(valor[i]));
      return extraido.filter(Boolean);
    }
    var keys = [];
    for (var k in valor) {
      if (Object.prototype.hasOwnProperty.call(valor, k) && /^\d+$/.test(k)) keys.push(k);
    }
    if (!keys.length) return [];
    keys.sort(function (a, b) { return Number(a) - Number(b); });
    return keys.map(function (k) { return texto(valor[k]); }).filter(Boolean);
  }

  /**
   * Exemplos so entram na primeira criacao da aba. Aba ja existente
   * e vazia (o usuario apagou os cadastros) permanece vazia.
   */
  function deveAplicarSemente(abasRecemCriadas, nomeAba, quantidade) {
    if (!nomeAba) return false;
    var recem = abasRecemCriadas || [];
    var criada = false;
    for (var i = 0; i < recem.length; i++) {
      if (recem[i] === nomeAba) { criada = true; break; }
    }
    return criada && !(Number(quantidade) > 0);
  }

  /**
   * google.script.run nao entrega Array de verdade e ainda parseia
   * string que parece JSON. O cliente manda "TEMAS\\nNome1\\nNome2",
   * um texto que o GAS nao transforma sozinho.
   */
  function serializarTemasFollowUp(lista) {
    var nomes = [];
    (lista || []).forEach(function (t) {
      var s = texto(t);
      if (s) nomes.push(s);
    });
    return 'TEMAS\n' + nomes.join('\n');
  }

  function parseTemasFollowUp(valor) {
    if (valor == null || valor === '') return [];
    if (typeof valor === 'object') {
      if (valor.json != null) return parseTemasFollowUp(valor.json);
      if (Array.isArray(valor)) return valor.map(texto).filter(Boolean);
      return itensDeLista_(valor);
    }
    var s = String(valor).replace(/\u00a0/g, ' ');
    if (s.indexOf('TEMAS') === 0 && (s.length === 5 || s.charAt(5) === '\n' || s.charAt(5) === '\t')) {
      s = s.slice(5).replace(/^[\n\t]/, '');
      if (!s.trim()) return [];
      return s.split(/[\n\t]/).map(texto).filter(Boolean);
    }
    s = texto(s);
    if (s.indexOf('OPSHUB_TEMAS:') === 0) s = s.slice(13);
    if (s === 'NONE' || s === '__NONE__') return ['__NONE__'];
    if (!s || s === '[]') return [];
    if (s.charAt(0) === '[') {
      try {
        var arr = JSON.parse(s);
        if (Array.isArray(arr)) return arr.map(texto).filter(Boolean);
      } catch (e) {}
    }
    return s.split(/[,;|\n]/).map(texto).filter(Boolean);
  }

  function temaFollowUpHabilitado(tema, habilitados) {
    if (!habilitados || !habilitados.length) return true;
    if (habilitados.length === 1 && texto(habilitados[0]) === '__NONE__') return false;
    var t = texto(tema);
    for (var i = 0; i < habilitados.length; i++) {
      if (texto(habilitados[i]) === t) return true;
    }
    return false;
  }

  function nomesTemas_(lista) {
    var out = [];
    (lista || []).forEach(function (t) {
      var s = texto(t);
      if (s && s !== '__NONE__') out.push(s);
    });
    return out;
  }

  /**
   * O cliente so envia o nome do tema. A lista ligada mora na planilha.
   * google.script.run perde Array/JSON; um unico texto chega intacto.
   */
  function alternarTemaFollowUp(nome, habilitados, todosTemas) {
    nome = texto(nome);
    var todos = nomesTemas_(todosTemas);
    var raw = (habilitados || []).map(texto).filter(Boolean);
    var nenhum = raw.length === 1 && raw[0] === '__NONE__';
    var atuais = nenhum ? [] : (raw.length ? nomesTemas_(raw) : todos.slice());
    var estava = false;
    var proximo = [];
    for (var i = 0; i < atuais.length; i++) {
      if (atuais[i] === nome) estava = true;
      else proximo.push(atuais[i]);
    }
    if (!estava && nome) proximo.push(nome);
    if (!proximo.length) return ['__NONE__'];
    return proximo;
  }

  function persistirTemasFollowUp(lista, todosTemas) {
    if (lista && lista.length === 1 && texto(lista[0]) === '__NONE__') return 'NONE';
    var nomes = nomesTemas_(lista);
    if (!nomes.length) return 'NONE';
    var todos = nomesTemas_(todosTemas);
    if (todos.length && nomes.length === todos.length) {
      var set = {};
      nomes.forEach(function (n) { set[n] = 1; });
      var cobre = true;
      for (var i = 0; i < todos.length; i++) {
        if (!set[todos[i]]) { cobre = false; break; }
      }
      if (cobre) return '';
    }
    return JSON.stringify(nomes);
  }

  function elegivelFollowUp(acao, hoje, temasHabilitados, opcoes) {
    hoje = paraData(hoje) || paraData(new Date());
    opcoes = opcoes || {};
    var email = texto(acao && acao.email).toLowerCase();
    if (!emailValido(email)) {
      return { ok: false, motivo: 'sem_email', mensagem: 'Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.' };
    }
    if (encerrada(acao && acao.status)) {
      return { ok: false, motivo: 'encerrada' };
    }
    if (!temaFollowUpHabilitado(acao && acao.tema, temasHabilitados)) {
      return { ok: false, motivo: 'tema_desligado' };
    }
    var prazo = paraData(acao && acao.prazo);
    if (!prazo) {
      return { ok: false, motivo: 'sem_prazo' };
    }
    var primeiro = adicionarDias(prazo, 1);
    if (compararDatas(hoje, primeiro) < 0) {
      return { ok: false, motivo: 'ainda_no_prazo' };
    }
    var ultimo = paraData(acao && acao.ultimo_email_em);
    if (ultimo && mesmoDia(ultimo, hoje) && !opcoes.ignorarJaEnviadoHoje) {
      return { ok: false, motivo: 'ja_enviado_hoje' };
    }
    var diasAtraso = Math.round((hoje.getTime() - prazo.getTime()) / 86400000);
    return {
      ok: true,
      motivo: 'atrasado',
      email: email,
      diasAtraso: diasAtraso,
    };
  }

  function linhaFonteParaPlano(valores, mapa, meta) {
    meta = meta || {};
    function col(campo) {
      var i = mapa[campo];
      return i === undefined ? '' : valores[i];
    }
    var idOrigem = texto(col('id'));
    var linha = meta.linhaFonte || 0;
    var chave = (meta.fonteId || 'F') + '#' + (idOrigem || ('L' + linha));
    var prazo = paraData(col('prazo'));
    return {
      id: chave,
      fonte_id: meta.fonteId || '',
      fonte_nome: meta.fonteNome || '',
      chave_origem: chave,
      tema: texto(col('tema')),
      divisao: texto(col('divisao')),
      area: texto(col('area')),
      oque: texto(col('oque')),
      como: texto(col('como')),
      responsavel: texto(col('responsavel')),
      email: texto(col('email')).toLowerCase(),
      prazo: prazo,
      prazo_iso: ymd(prazo),
      status: tituloStatus(col('status')) || 'Aberto',
      comentarios: texto(col('comentarios')),
    };
  }

  function mesclarImportacao(anteriores, novos) {
    var porChave = {};
    (anteriores || []).forEach(function (a) {
      porChave[a.chave_origem || a.id] = a;
    });
    return (novos || []).map(function (n) {
      var velho = porChave[n.chave_origem || n.id];
      if (!velho) return n;
      n.ultimo_email_em = velho.ultimo_email_em || '';
      n.emails_enviados = velho.emails_enviados || 0;
      return n;
    });
  }

  /**
   * Eixo de filtro estilo Excel:
   * - null/undefined: sem restrição (todas as caixas marcadas)
   * - []: nenhum valor (nenhuma linha passa)
   * - ['A','B']: união (OR) desses valores
   * Aceita também string única (API antiga: { tema: 'OEE' }).
   */
  function eixoDe(filtros, plural, singular) {
    if (!filtros) return null;
    if (Object.prototype.hasOwnProperty.call(filtros, plural)) return filtros[plural];
    if (Array.isArray(filtros[singular])) return filtros[singular];
    if (filtros[singular]) return [filtros[singular]];
    return null;
  }

  function passaEixo(selecionados, valor) {
    if (selecionados == null) return true;
    if (!selecionados.length) return false;
    return selecionados.indexOf(texto(valor)) !== -1;
  }

  function filtrarPlanos(lista, filtros) {
    filtros = filtros || {};
    var q = slug(filtros.texto);
    var temas = eixoDe(filtros, 'temas', 'tema');
    var todosTemas = !!filtros.todosTemas;
    var temaObrigatorio = !!filtros.temaObrigatorio;
    if (temaObrigatorio && !todosTemas && (!temas || !temas.length)) return [];

    var divisoes = eixoDe(filtros, 'divisoes', 'divisao');
    var areas = eixoDe(filtros, 'areas', 'area');
    var statuses = eixoDe(filtros, 'statuses', 'status');
    var responsaveis = eixoDe(filtros, 'responsaveis', 'responsavel');

    return (lista || []).filter(function (p) {
      if (!todosTemas && !passaEixo(temas, p.tema)) return false;
      if (!passaEixo(divisoes, p.divisao)) return false;
      if (!passaEixo(areas, p.area)) return false;
      if (!passaEixo(statuses, statusEfetivo(p, filtros.hoje))) return false;
      if (statuses == null && filtros.omitirEncerradas && encerrada(statusEfetivo(p, filtros.hoje))) return false;
      if (!passaEixo(responsaveis, p.responsavel)) return false;
      if (filtros.semEmail && emailValido(p.email)) return false;
      if (!q) return true;
      var blob = slug([
        p.tema, p.divisao, p.area, p.oque, p.como,
        p.responsavel, p.email, p.status, p.comentarios,
      ].join(' '));
      return blob.indexOf(q) !== -1;
    });
  }

  function valorSort(p, campo, hoje) {
    if (campo === 'prazo') return paraData(p.prazo) ? paraData(p.prazo).getTime() : 0;
    if (campo === 'status') return statusEfetivo(p, hoje);
    if (campo === 'email') return texto(p.email);
    return texto(p[campo]);
  }

  function ordenarPlanos(lista, campo, dir, hoje) {
    var sinal = dir === 'desc' ? -1 : 1;
    campo = campo || 'prazo';
    return (lista || []).slice().sort(function (a, b) {
      var va = valorSort(a, campo, hoje);
      var vb = valorSort(b, campo, hoje);
      if (va < vb) return -1 * sinal;
      if (va > vb) return 1 * sinal;
      return 0;
    });
  }

  function unicos(lista, campo, hoje) {
    var set = {};
    var out = [];
    (lista || []).forEach(function (p) {
      var v = campo === 'status' ? statusEfetivo(p, hoje) : texto(p[campo]);
      if (!v || set[v]) return;
      set[v] = 1;
      out.push(v);
    });
    out.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    return out;
  }

  function kpis(lista, hoje) {
    var total = (lista || []).length;
    var atrasados = 0;
    var abertos = 0;
    var semEmail = 0;
    var concluidos = 0;
    (lista || []).forEach(function (p) {
      var st = statusEfetivo(p, hoje);
      if (st === 'Atrasado') atrasados++;
      if (st === 'Concluído') concluidos++;
      if (st !== 'Concluído' && st !== 'Cancelado') abertos++;
      if (!emailValido(p.email) && st !== 'Concluído' && st !== 'Cancelado') semEmail++;
    });
    return { total: total, atrasados: atrasados, abertos: abertos, semEmail: semEmail, concluidos: concluidos };
  }

  function extrairIdPlanilha(ref) {
    var s = texto(ref);
    if (!s) return '';
    if (/\/spreadsheets\/d\/e\//.test(s)) return '';
    var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (m) return m[1];
    m = s.match(/[?&]id=([a-zA-Z0-9-_]{20,})/);
    if (m) return m[1];
    m = s.match(/^[a-zA-Z0-9-_]{20,}$/);
    return m ? s : '';
  }

  function idNovo(prefixo) {
    return (prefixo || 'X') + Date.now().toString(36).toUpperCase() +
      Math.floor(Math.random() * 36).toString(36).toUpperCase();
  }

  function normalizarBandeira(v) {
    var k = slug(v);
    if (k === 'solutions' || k === 'solution') return 'Solutions';
    if (k === 'apparel') return 'Apparel';
    if (k === 'smartrac') return 'Smartrac';
    return '';
  }

  function negocioDoControle(controle, bandeiraDept) {
    var n = normalizarBandeira(controle && controle.negocio);
    if (n) return n;
    var b = normalizarBandeira(bandeiraDept);
    if (b === 'Apparel' || b === 'Smartrac') return b;
    return 'Solutions';
  }

  function partesPasta(pasta) {
    return texto(pasta).split('/').map(function (p) { return p.trim(); }).filter(Boolean);
  }

  function compararControles(a, b) {
    var oa = Number(a && a.ordem || 0);
    var ob = Number(b && b.ordem || 0);
    if (oa !== ob) return oa - ob;
    return texto(a && a.nome).localeCompare(texto(b && b.nome), 'pt-BR');
  }

  function montarArvore(controles) {
    var raiz = { nome: '', filhos: {}, arquivos: [] };
    (controles || []).forEach(function (c) {
      var no = raiz;
      partesPasta(c && c.pasta).forEach(function (p) {
        if (!no.filhos[p]) no.filhos[p] = { nome: p, filhos: {}, arquivos: [] };
        no = no.filhos[p];
      });
      no.arquivos.push(c);
    });
    function serializar(no) {
      var pastas = Object.keys(no.filhos).sort(function (a, b) {
        return a.localeCompare(b, 'pt-BR');
      }).map(function (k) { return serializar(no.filhos[k]); });
      var arquivos = (no.arquivos || []).slice().sort(compararControles);
      return { nome: no.nome, pastas: pastas, arquivos: arquivos };
    }
    return serializar(raiz);
  }

  function separarPorNegocio(controles, bandeiraDept) {
    var apparel = [];
    var smartrac = [];
    var solutions = [];
    (controles || []).forEach(function (c) {
      var n = negocioDoControle(c, bandeiraDept);
      if (n === 'Smartrac') smartrac.push(c);
      else if (n === 'Apparel') apparel.push(c);
      else solutions.push(c);
    });
    return { apparel: apparel, smartrac: smartrac, solutions: solutions };
  }

  function prepararAcaoParaUi(p, hoje) {
    var prazo = paraData(p.prazo);
    var st = statusEfetivo(p, hoje);
    var temEmail = emailValido(p.email);
    return {
      id: p.id || p.chave_origem,
      fonte_id: p.fonte_id || '',
      fonte_nome: p.fonte_nome || '',
      tema: texto(p.tema),
      divisao: texto(p.divisao),
      area: texto(p.area),
      oque: texto(p.oque),
      como: texto(p.como),
      responsavel: texto(p.responsavel),
      email: texto(p.email),
      prazo: ymd(prazo),
      prazo_br: formatarDataBr(prazo),
      status: st,
      status_origem: tituloStatus(p.status),
      status_classe: classeStatus(st),
      comentarios: texto(p.comentarios),
      tem_email: temEmail,
      tooltip_email: temEmail
        ? texto(p.email)
        : 'Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.',
    };
  }

  function escaparHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function linhaHtmlFollowUp_(rotulo, valor) {
    var v = texto(valor) || '—';
    return '<tr><td style="padding:9px 0;color:#8A847C;width:140px;vertical-align:top;font-size:14px">' +
      escaparHtml(rotulo) + '</td><td style="padding:9px 0;color:#F4F6FA;font-size:14px">' +
      escaparHtml(v) + '</td></tr>';
  }

  /**
   * HTML do e-mail de follow-up. Fundo externo claro; marca em quadro branco
   * com letra vermelha; e-mail do responsável num card branco; dados da ação
   * no card escuro ("Ação com prazo vencido").
   */
  function htmlFollowUp(opts) {
    opts = opts || {};
    var plano = opts.plano || {};
    var dec = opts.dec || {};
    var hoje = opts.hoje;
    var prazo = opts.prazo || formatarDataBr(paraData(plano.prazo));
    var emailPessoa = texto(opts.email || dec.email || plano.email);
    var logoSrc = texto(opts.logoSrc);
    var idioma = (typeof I18n !== 'undefined' && I18n.normalizar)
      ? I18n.normalizar(opts.idioma || (I18n.atual && I18n.atual()) || 'pt')
      : 'pt';
    function tm(chave, padrao, vars) {
      if (typeof I18n !== 'undefined' && I18n.t) return I18n.t(idioma, chave, vars);
      var out = padrao;
      if (vars) {
        Object.keys(vars).forEach(function (k) {
          out = String(out).split('{' + k + '}').join(String(vars[k]));
        });
      }
      return out;
    }
    var atraso = '';
    if (dec.diasAtraso != null) {
      atraso = tm('mail_atraso', '{n} dia(s) em {data}', {
        n: dec.diasAtraso,
        data: hoje ? formatarDataBr(paraData(hoje)) : '',
      });
    }

    var marca = logoSrc
      ? ('<img src="' + escaparHtml(logoSrc) + '" alt="Avery Dennison" width="120" height="28" ' +
        'style="height:28px;width:auto;border:0;vertical-align:middle;margin-right:12px">' )
      : '';
    marca += '<span style="color:#E4002B;font-size:22px;font-weight:600;letter-spacing:-0.03em;' +
      'font-family:Segoe UI,Arial,sans-serif;vertical-align:middle">OPSHUB</span>';

    return [
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;margin:0;padding:0">',
      '<tr><td align="center" style="padding:28px 16px;background:#ffffff">',
      '<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">',
      '<tr><td style="padding:0 0 14px">',
      '<div style="background:#ffffff;border:1px solid #E8E4DF;border-radius:12px;padding:16px 20px;' +
        'font-family:Segoe UI,Arial,sans-serif">',
      marca,
      '</div></td></tr>',
      emailPessoa
        ? ('<tr><td style="padding:0 0 16px">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #C9C3BB;border-radius:10px">' +
          '<tr><td style="padding:10px 16px;font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1A1918">' +
          '<span style="color:#7C776F;font-size:11px;display:block;margin-bottom:3px">' +
          escaparHtml(tm('mail_rotulo_email', 'E-mail')) + '</span>' +
          '<strong style="font-weight:600">' + escaparHtml(emailPessoa) + '</strong>' +
          '</td></tr></table></td></tr>')
        : '',
      '<tr><td>',
      '<div style="background:#10141C;border:1px solid #2A3142;border-radius:16px;overflow:hidden;' +
        'font-family:Segoe UI,Arial,sans-serif;color:#F4F6FA">',
      '<div style="background:#E4002B;height:6px;line-height:6px;font-size:0">&nbsp;</div>',
      '<div style="padding:28px">',
      '<h1 style="font-size:22px;margin:0 0 8px;font-weight:600;letter-spacing:-0.03em;color:#F4F6FA">' +
        escaparHtml(tm('mail_titulo', 'Ação com prazo vencido')) + '</h1>',
      '<p style="color:#A8B2C5;margin:0 0 20px;font-size:14px;line-height:1.5">' +
        escaparHtml(tm('mail_intro', 'Este follow-up é enviado a partir de 1 dia de atraso, uma vez por dia, até o prazo ser reprogramado.')) + '</p>',
      '<table style="width:100%;border-collapse:collapse">',
      linhaHtmlFollowUp_(tm('th_tema', 'Tema'), plano.tema),
      linhaHtmlFollowUp_(tm('th_divisao', 'Divisão'), plano.divisao),
      linhaHtmlFollowUp_(tm('th_area', 'Área'), plano.area),
      linhaHtmlFollowUp_(tm('th_oque', 'O quê?'), plano.oque),
      linhaHtmlFollowUp_(tm('th_como', 'Como'), plano.como),
      linhaHtmlFollowUp_(tm('th_responsavel', 'Responsável'), plano.responsavel),
      linhaHtmlFollowUp_(tm('th_prazo', 'Prazo'), prazo),
      linhaHtmlFollowUp_(tm('mail_rotulo_atraso', 'Atraso'), atraso),
      linhaHtmlFollowUp_(tm('th_status', 'Status'), plano.status),
      linhaHtmlFollowUp_(tm('th_comentarios', 'Comentários'), plano.comentarios),
      '</table>',
      '<p style="color:#6E7890;font-size:12px;margin:24px 0 0">' +
        escaparHtml(tm('mail_rodape', 'Reprograme a data na planilha de origem para interromper estes e-mails.')) + '</p>',
      '</div></div>',
      '</td></tr></table>',
      '</td></tr></table>',
    ].join('');
  }

  return {
    COLUNAS_PLANO: COLUNAS_PLANO,
    texto: texto,
    tituloNome: tituloNome,
    sim: sim,
    slug: slug,
    emailValido: emailValido,
    mapearColunas: mapearColunas,
    escolherLinhaCabecalho: escolherLinhaCabecalho,
    fonteAtiva: fonteAtiva,
    extrairGid: extrairGid,
    paraData: paraData,
    ymd: ymd,
    formatarDataBr: formatarDataBr,
    adicionarDias: adicionarDias,
    compararDatas: compararDatas,
    mesmoDia: mesmoDia,
    encerrada: encerrada,
    statusEfetivo: statusEfetivo,
    tituloStatus: tituloStatus,
    classeStatus: classeStatus,
    parseTemasFollowUp: parseTemasFollowUp,
    serializarTemasFollowUp: serializarTemasFollowUp,
    deveAplicarSemente: deveAplicarSemente,
    temaFollowUpHabilitado: temaFollowUpHabilitado,
    alternarTemaFollowUp: alternarTemaFollowUp,
    persistirTemasFollowUp: persistirTemasFollowUp,
    elegivelFollowUp: elegivelFollowUp,
    linhaFonteParaPlano: linhaFonteParaPlano,
    mesclarImportacao: mesclarImportacao,
    eixoDe: eixoDe,
    passaEixo: passaEixo,
    filtrarPlanos: filtrarPlanos,
    ordenarPlanos: ordenarPlanos,
    unicos: unicos,
    kpis: kpis,
    extrairIdPlanilha: extrairIdPlanilha,
    idNovo: idNovo,
    prepararAcaoParaUi: prepararAcaoParaUi,
    normalizarBandeira: normalizarBandeira,
    negocioDoControle: negocioDoControle,
    partesPasta: partesPasta,
    montarArvore: montarArvore,
    separarPorNegocio: separarPorNegocio,
    htmlFollowUp: htmlFollowUp,
    escaparHtml: escaparHtml,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Logica;
}
