(function () {
  var hoje = new Date();
  function add(n) {
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n);
  }
  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function br(d) {
    var day = d.getDate(), m = d.getMonth() + 1;
    return (day < 10 ? '0' : '') + day + '/' + (m < 10 ? '0' : '') + m + '/' + d.getFullYear();
  }

  var departamentos = [
    { id: 'D-PROD', nome: 'Produção', descricao: 'Controles de chão de fábrica e desempenho da linha', icone: 'producao', cor: '#B42336', ordem: 1, ativo: 'SIM' },
    { id: 'D-QUAL', nome: 'Qualidade', descricao: 'NC, auditorias e controle de processo', icone: 'qualidade', cor: '#7A8BA3', ordem: 2, ativo: 'SIM' },
    { id: 'D-MAN', nome: 'Manutenção', descricao: 'PCM, CMMS e confiabilidade', icone: 'manutencao', cor: '#C4B5A0', ordem: 3, ativo: 'SIM' },
    { id: 'D-EHS', nome: 'EHS', descricao: 'Segurança, meio ambiente e saúde ocupacional', icone: 'ehs', cor: '#8FA393', ordem: 4, ativo: 'SIM' },
    { id: 'D-LOG', nome: 'Logística', descricao: 'Armazém, expedição e materiais', icone: 'logistica', cor: '#8B8499', ordem: 5, ativo: 'SIM' },
    { id: 'D-ENG', nome: 'Engenharia', descricao: 'Processo, industrialização e projetos', icone: 'engenharia', cor: '#7E9AAB', ordem: 6, ativo: 'SIM' },
    { id: 'D-PCP', nome: 'PCP', descricao: 'Planejamento, programação e controle da produção', icone: 'pcp', cor: '#C4A484', ordem: 7, ativo: 'SIM' },
    { id: 'D-CI', nome: 'Melhoria Contínua', descricao: 'Kaizen, A3 e planos de ação corporativos', icone: 'melhoria', cor: '#B0899A', ordem: 8, ativo: 'SIM' },
  ];

  var controles = [
    { id: 'C1', departamento_id: 'D-PROD', nome: 'Controle Hora por Hora', descricao: 'Painel de produção por máquina e turno', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C2', departamento_id: 'D-PROD', nome: 'Plano de produção', descricao: 'Programa congelado da semana', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM' },
    { id: 'C3', departamento_id: 'D-QUAL', nome: 'Gestão de não conformidades', descricao: 'Registro e tratamento de NCs', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C4', departamento_id: 'D-QUAL', nome: 'Controle de processo', descricao: 'Cartas e limites de qualidade', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM' },
    { id: 'C5', departamento_id: 'D-MAN', nome: 'CMMS / Ordens de serviço', descricao: 'Backlog e preventiva', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C6', departamento_id: 'D-EHS', nome: 'Observações de segurança', descricao: 'Desvios e near miss', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C7', departamento_id: 'D-LOG', nome: 'Inventário e FIFO', descricao: 'Posição de estoque e giro', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C8', departamento_id: 'D-ENG', nome: 'PCP de projetos', descricao: 'Pipeline de industrialização', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C9', departamento_id: 'D-PCP', nome: 'Plano mestre', descricao: 'MPS / sequência da linha', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
    { id: 'C10', departamento_id: 'D-CI', nome: 'A3 consolidado', descricao: 'Planos de ação por tema da planta', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM' },
  ];

  function plano(id, o) {
    var prazo = o.prazo;
    var st = o.status;
    if (st !== 'Concluído' && st !== 'Cancelado' && prazo < hoje) st = 'Atrasado';
    var tem = !!(o.email && o.email.indexOf('@') > 0);
    return {
      id: id, fonte_id: 'SEED', fonte_nome: 'Demonstração',
      tema: o.tema, divisao: o.divisao, area: o.area, oque: o.oque, como: o.como,
      responsavel: o.responsavel, email: o.email || '',
      prazo: ymd(prazo), prazo_br: br(prazo),
      status: st, status_origem: o.status,
      status_classe: st === 'Atrasado' ? 'risco' : st === 'Concluído' ? 'ok' : st === 'Em andamento' ? 'info' : 'aberto',
      comentarios: o.comentarios || '',
      tem_email: tem,
      tooltip_email: tem ? o.email : 'Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.',
    };
  }

  var planos = [
    plano('1', { tema: 'Segurança', divisao: 'Operations', area: 'EHS', oque: 'Eliminar desvio de bloqueio LOTO na DDA2', como: 'Padronizar checklist de LOTO e treinar turno 1 e 2', responsavel: 'Ana Souza', email: 'ana.souza@example.com', prazo: add(5), status: 'Em andamento', comentarios: 'Treinamento agendado' }),
    plano('2', { tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade', oque: 'Reduzir NC de epóxi irregular', como: 'Ajustar janela de viscosidade e inspeção visual a cada 2h', responsavel: 'Bruno Lima', email: '', prazo: add(-3), status: 'Aberto', comentarios: 'Aguardando e-mail do responsável' }),
    plano('3', { tema: 'OEE', divisao: 'Operations', area: 'Produção', oque: 'Recuperar uptime da DDA1 abaixo da meta', como: 'A3 de paradas não justificadas + padrão de apontamento', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(-2), status: 'Aberto', comentarios: '' }),
    plano('4', { tema: 'Entrega', divisao: 'Supply Chain', area: 'Logística', oque: 'Estabilizar FIFO do armazém de acabados', como: 'Sinalizar endereços e auditar 2x por semana', responsavel: 'Diego Alves', email: 'diego.alves@example.com', prazo: add(12), status: 'Aberto', comentarios: '' }),
    plano('5', { tema: 'Manutenção', divisao: 'Operations', area: 'Manutenção', oque: 'Zerar backlog de preventiva atrasada > 7 dias', como: 'Janela semanal congelada na sexta para PCM', responsavel: 'Elisa Rocha', email: 'elisa.rocha@example.com', prazo: add(-10), status: 'Concluído', comentarios: 'Backlog zerado na semana 32' }),
    plano('6', { tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade', oque: 'Fechar CAPA de auditoria de cliente', como: 'Atualizar procedimento e treinar operadores', responsavel: 'Bruno Lima', email: '', prazo: add(-1), status: 'Aberto', comentarios: '' }),
  ];

  var fontes = [
    { id: 'F1', nome: 'A3 Qualidade', referencia: 'https://docs.google.com/spreadsheets/d/exemplo', aba: 'Planos', linha_cabecalho: 1, ativo: true, ultima_execucao: '', ultimo_status: '', ultimo_detalhe: '' },
  ];
  var gatilho = { ativo: false, quantidade: 0, hora: 8 };

  function hub() {
    var atrasados = planos.filter(function (p) { return p.status === 'Atrasado'; }).length;
    var concluidos = planos.filter(function (p) { return p.status === 'Concluído'; }).length;
    var abertos = planos.filter(function (p) { return p.status !== 'Concluído' && p.status !== 'Cancelado'; }).length;
    var semEmail = planos.filter(function (p) { return !p.tem_email && p.status !== 'Concluído'; }).length;
    return {
      hoje: ymd(hoje),
      departamentos: departamentos.map(function (d) {
        return { id: d.id, nome: d.nome, descricao: d.descricao, icone: d.icone, cor: d.cor, ordem: d.ordem };
      }),
      controles: controles.map(function (c) {
        return { id: c.id, departamento_id: c.departamento_id, nome: c.nome, descricao: c.descricao, url: c.url, ordem: c.ordem };
      }),
      planos: planos,
      kpis: { total: planos.length, atrasados: atrasados, abertos: abertos, semEmail: semEmail, concluidos: concluidos },
      fontes: fontes,
      departamentosAdmin: departamentos,
      controlesAdmin: controles,
      gatilho: gatilho,
    };
  }

  function nid(p) { return p + Date.now().toString(36); }

  var api = {
    apiContexto: function () {
      return {
        app: { nome: 'OpsHub', versao: '1.0.0' },
        usuario: { email: 'plant.manager@averydennison.com', nome: 'Plant Manager', iniciais: 'PM' },
        gatilho: gatilho,
      };
    },
    apiHub: function () { return hub(); },
    apiSalvarDepartamento: function (reg) {
      if (!reg.id) { reg.id = nid('D'); departamentos.push(reg); }
      else departamentos = departamentos.map(function (d) { return d.id === reg.id ? Object.assign({}, d, reg) : d; });
      return hub();
    },
    apiExcluirDepartamento: function (id) {
      departamentos = departamentos.filter(function (d) { return d.id !== id; });
      return hub();
    },
    apiSalvarControle: function (reg) {
      if (!reg.id) { reg.id = nid('C'); controles.push(reg); }
      else controles = controles.map(function (d) { return d.id === reg.id ? Object.assign({}, d, reg) : d; });
      return hub();
    },
    apiExcluirControle: function (id) {
      controles = controles.filter(function (d) { return d.id !== id; });
      return hub();
    },
    apiSalvarFonte: function (reg) {
      if (!reg.id) { reg.id = nid('F'); fontes.push(reg); }
      else fontes = fontes.map(function (d) { return d.id === reg.id ? Object.assign({}, d, reg) : d; });
      return hub();
    },
    apiExcluirFonte: function (id) {
      fontes = fontes.filter(function (d) { return d.id !== id; });
      return hub();
    },
    apiImportarAgora: function () { return { fontes: fontes.length, linhas: planos.length, avisos: [] }; },
    apiAtualizar: function () {
      var h = hub();
      h.importacao = { fontes: fontes.length, linhas: planos.length, avisos: [] };
      return h;
    },
    apiEnviarFollowUpsAgora: function () { return { enviados: 1, pulados: planos.length - 1, erros: 0 }; },
    apiCriarGatilho: function () {
      gatilho = { ativo: true, quantidade: 1, hora: 8 };
      return { mensagem: 'Gatilho diario criado para a rotina das 8h.', gatilho: gatilho };
    },
    apiRemoverGatilhos: function () {
      gatilho = { ativo: false, quantidade: 0, hora: 8 };
      return { mensagem: 'Gatilhos removidos.', gatilho: gatilho };
    },
  };

  window.google = {
    script: {
      run: {
        withSuccessHandler: function (cb) { this._ok = cb; return this; },
        withFailureHandler: function (cb) { this._err = cb; return this; },
      },
    },
  };

  Object.keys(api).forEach(function (nome) {
    Object.defineProperty(window.google.script.run, nome, {
      value: function () {
        var args = arguments;
        var ok = this._ok;
        var err = this._err;
        try {
          var out = api[nome].apply(null, args);
          var delay = (nome === 'apiAtualizar') ? 700 : 40;
          setTimeout(function () { ok(out); }, delay);
        } catch (e) {
          setTimeout(function () { err(e); }, 30);
        }
      },
    });
  });
})();
