var Repo = {

  _memoria: {},

  planilha: function () {
    if (this._memoria.planilha) return this._memoria.planilha;
    var id = PropertiesService.getScriptProperties().getProperty('PLANILHA_ID');
    var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error(
        'Nenhuma planilha encontrada. Defina PLANILHA_ID nas propriedades do script ' +
        'ou vincule este projeto a uma planilha.'
      );
    }
    this._memoria.planilha = ss;
    return ss;
  },

  aba: function (nome, criarSeFaltar) {
    var ss = this.planilha();
    var aba = ss.getSheetByName(nome);
    if (!aba && criarSeFaltar) aba = ss.insertSheet(nome);
    if (!aba) throw new Error('Aba "' + nome + '" nao existe. Rode Instalar / atualizar estrutura.');
    return aba;
  },

  ler: function (nome) {
    if (this._memoria[nome]) return this._memoria[nome];
    var aba = this.aba(nome);
    var ultima = aba.getLastRow();
    var colunas = ESQUEMA[nome] || [];
    if (ultima < 2 || !colunas.length) {
      this._memoria[nome] = [];
      return [];
    }
    var valores = aba.getRange(2, 1, ultima - 1, colunas.length).getValues();
    var linhas = [];
    for (var i = 0; i < valores.length; i++) {
      var obj = { _linha: 2 + i };
      var vazio = true;
      for (var c = 0; c < colunas.length; c++) {
        obj[colunas[c]] = valores[i][c];
        if (valores[i][c] !== '' && valores[i][c] !== null) vazio = false;
      }
      if (!vazio) linhas.push(obj);
    }
    this._memoria[nome] = linhas;
    return linhas;
  },

  descarregar: function () {
    try { SpreadsheetApp.flush(); } catch (e) {}
  },

  acrescentar: function (nome, registros) {
    if (!registros || !registros.length) return 0;
    this.descarregar();
    var aba = this.aba(nome);
    var colunas = ESQUEMA[nome];
    var matriz = registros.map(function (r) {
      return colunas.map(function (c) {
        var v = r[c];
        return v === undefined || v === null ? '' : v;
      });
    });
    var primeira = Math.max(aba.getLastRow() + 1, 2);
    aba.getRange(primeira, 1, matriz.length, colunas.length).setValues(matriz);
    this.descarregar();
    delete this._memoria[nome];
    return matriz.length;
  },

  substituirAba: function (nome, registros) {
    var aba = this.aba(nome);
    var colunas = ESQUEMA[nome];
    var ultima = aba.getLastRow();
    if (ultima > 1) aba.getRange(2, 1, ultima - 1, colunas.length).clearContent();
    this.descarregar();
    delete this._memoria[nome];
    return this.acrescentar(nome, registros);
  },

  atualizarRegistro: function (nome, linha, registro) {
    var colunas = ESQUEMA[nome];
    var atual = null;
    var lista = this.ler(nome);
    for (var i = 0; i < lista.length; i++) {
      if (lista[i]._linha === linha) { atual = lista[i]; break; }
    }
    atual = atual || {};
    var valores = colunas.map(function (c) {
      var v = registro[c] !== undefined ? registro[c] : atual[c];
      return v === undefined || v === null ? '' : v;
    });
    this.aba(nome).getRange(linha, 1, 1, colunas.length).setValues([valores]);
    this.descarregar();
    delete this._memoria[nome];
  },

  excluirLinha: function (nome, linha) {
    this.aba(nome).deleteRow(linha);
    this.descarregar();
    delete this._memoria[nome];
  },

  limparMemoria: function () {
    this._memoria = {};
  },

  registrarLog: function (rotina, status, detalhe) {
    try {
      this.acrescentar(ABAS.log, [{
        quando: new Date(),
        rotina: rotina,
        status: status,
        detalhe: String(detalhe || '').slice(0, 4000),
      }]);
    } catch (e) {
      console.error('Falha ao gravar log: ' + e);
    }
  },
};

var Cadastros = {
  config: function () {
    var mapa = {};
    Repo.ler(ABAS.config).forEach(function (l) {
      mapa[String(l.chave).trim()] = l.valor;
    });
    return {
      bruto: mapa,
      texto: function (chave, padrao) {
        var v = mapa[chave];
        return v === undefined || v === '' ? padrao : String(v);
      },
      numero: function (chave, padrao) {
        var n = Number(mapa[chave]);
        return isFinite(n) && mapa[chave] !== '' && mapa[chave] !== undefined ? n : padrao;
      },
    };
  },

  departamentos: function () {
    return Repo.ler(ABAS.departamentos)
      .filter(function (d) { return Logica.sim(d.ativo); })
      .sort(function (a, b) { return Number(a.ordem || 0) - Number(b.ordem || 0); });
  },

  controles: function () {
    return Repo.ler(ABAS.controles)
      .filter(function (c) { return Logica.sim(c.ativo); })
      .sort(function (a, b) { return Number(a.ordem || 0) - Number(b.ordem || 0); });
  },

  fontes: function () {
    return Repo.ler(ABAS.fontes);
  },

  planos: function () {
    return Repo.ler(ABAS.planos);
  },
};
