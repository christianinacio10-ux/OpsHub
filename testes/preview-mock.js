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
    { id: 'D-PROD', nome: 'Produção', descricao: 'Controles de chão de fábrica e desempenho da linha', icone: 'producao', cor: '#B42336', ordem: 1, ativo: 'SIM', bandeira: 'Solutions' },
    { id: 'D-QUAL', nome: 'Qualidade', descricao: 'NC, auditorias e controle de processo', icone: 'qualidade', cor: '#7A8BA3', ordem: 2, ativo: 'SIM', bandeira: 'Apparel' },
    { id: 'D-MAN', nome: 'Manutenção', descricao: 'PCM, CMMS e confiabilidade', icone: 'manutencao', cor: '#C4B5A0', ordem: 3, ativo: 'SIM', bandeira: 'Smartrac' },
    { id: 'D-EHS', nome: 'EHS', descricao: 'Segurança, meio ambiente e saúde ocupacional', icone: 'ehs', cor: '#8FA393', ordem: 4, ativo: 'SIM', bandeira: 'Solutions' },
    { id: 'D-LOG', nome: 'Logística', descricao: 'Armazém, expedição e materiais', icone: 'logistica', cor: '#8B8499', ordem: 5, ativo: 'SIM', bandeira: 'Apparel' },
    { id: 'D-ENG', nome: 'Engenharia', descricao: 'Processo, industrialização e projetos', icone: 'engenharia', cor: '#7E9AAB', ordem: 6, ativo: 'SIM', bandeira: 'Smartrac' },
    { id: 'D-PCP', nome: 'PCP', descricao: 'Planejamento, programação e controle da produção', icone: 'pcp', cor: '#C4A484', ordem: 7, ativo: 'SIM', bandeira: 'Solutions' },
    { id: 'D-CI', nome: 'Melhoria Contínua', descricao: 'Kaizen, A3 e planos de ação corporativos', icone: 'melhoria', cor: '#B0899A', ordem: 8, ativo: 'SIM', bandeira: 'Solutions' },
  ];

  var controles = [
    { id: 'C1', departamento_id: 'D-PROD', nome: 'Controle Hora por Hora', descricao: 'Painel de produção por máquina e turno', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: 'Linha / Hora a hora' },
    { id: 'C2', departamento_id: 'D-PROD', nome: 'Plano de produção', descricao: 'Programa congelado da semana', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM', negocio: 'Smartrac', pasta: 'Linha / Programa' },
    { id: 'C3', departamento_id: 'D-QUAL', nome: 'Gestão de não conformidades', descricao: 'Registro e tratamento de NCs', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: 'NC' },
    { id: 'C4', departamento_id: 'D-QUAL', nome: 'Controle de processo', descricao: 'Cartas e limites de qualidade', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM', negocio: 'Apparel', pasta: 'Processo' },
    { id: 'C5', departamento_id: 'D-MAN', nome: 'CMMS / Ordens de serviço', descricao: 'Backlog e preventiva', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Smartrac', pasta: 'PCM' },
    { id: 'C6', departamento_id: 'D-EHS', nome: 'Observações de segurança', descricao: 'Desvios e near miss', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: 'Campo' },
    { id: 'C11', departamento_id: 'D-EHS', nome: 'Inspeção Smartrac', descricao: 'Roteiro de inspeção da linha Smartrac', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM', negocio: 'Smartrac', pasta: 'Campo' },
    { id: 'C7', departamento_id: 'D-LOG', nome: 'Inventário e FIFO', descricao: 'Posição de estoque e giro', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: '' },
    { id: 'C8', departamento_id: 'D-ENG', nome: 'PCP de projetos', descricao: 'Pipeline de industrialização', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Smartrac', pasta: 'Projetos' },
    { id: 'C9', departamento_id: 'D-PCP', nome: 'Plano mestre Apparel', descricao: 'MPS da linha Apparel', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: 'MPS' },
    { id: 'C12', departamento_id: 'D-PCP', nome: 'Plano mestre Smartrac', descricao: 'MPS da linha Smartrac', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM', negocio: 'Smartrac', pasta: 'MPS' },
    { id: 'C10', departamento_id: 'D-CI', nome: 'A3 consolidado', descricao: 'Planos de ação por tema da planta', url: 'https://docs.google.com/spreadsheets', ordem: 1, ativo: 'SIM', negocio: 'Apparel', pasta: 'A3' },
    { id: 'C13', departamento_id: 'D-CI', nome: 'A3 Smartrac', descricao: 'Planos de ação da operação Smartrac', url: 'https://docs.google.com/spreadsheets', ordem: 2, ativo: 'SIM', negocio: 'Smartrac', pasta: 'A3' },
    { id: 'C14', departamento_id: 'D-PROD', nome: 'KPI da planta', descricao: 'Indicadores consolidados Solutions', url: 'https://docs.google.com/spreadsheets', ordem: 3, ativo: 'SIM', negocio: 'Solutions', pasta: 'Planta' },
    { id: 'C15', departamento_id: 'D-EHS', nome: 'DDS da planta', descricao: 'Diálogo diário de segurança da planta', url: 'https://docs.google.com/spreadsheets', ordem: 3, ativo: 'SIM', negocio: '', pasta: 'Campo' },
  ];

  function plano(id, o) {
    var prazo = o.prazo;
    var st = o.status;
    var s = String(st || '').toLowerCase();
    var encerrada = s.indexOf('conclu') === 0 || s.indexOf('cancel') === 0;
    if (!encerrada && prazo < hoje) st = 'Atrasado';
    var tem = !!(o.email && o.email.indexOf('@') > 0);
    var classe = st === 'Atrasado' ? 'risco'
      : s.indexOf('conclu') === 0 ? 'ok'
      : st === 'Em andamento' ? 'info'
      : s.indexOf('cancel') === 0 ? 'neutro'
      : 'aberto';
    return {
      id: id, fonte_id: 'SEED', fonte_nome: 'Demonstração',
      tema: o.tema, divisao: o.divisao, area: o.area, oque: o.oque, como: o.como,
      responsavel: o.responsavel, email: o.email || '',
      prazo: ymd(prazo), prazo_br: br(prazo),
      status: st, status_origem: o.status,
      status_classe: classe,
      comentarios: o.comentarios || '',
      tem_email: tem,
      tooltip_email: tem ? o.email : 'Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.',
    };
  }

  function planoArea(id, deptId, o) {
    var p = plano(id, o);
    p.departamento_id = deptId;
    p.fonte_id = o.fonte_id || '';
    return p;
  }

  var planosArea = [
    planoArea('A1', 'D-PROD', { fonte_id: 'FA1', tema: 'Produção', divisao: 'Solutions', area: 'Produção', oque: 'Congelar SMED da DDA2 só nesta área', como: 'Cronometrar setup e kit pré-montado no turno 1', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(-2), status: 'Aberto', comentarios: 'Ação interna da produção' }),
    planoArea('A2', 'D-PROD', { fonte_id: 'FA1', tema: 'Produção', divisao: 'Solutions', area: 'Produção', oque: 'Padronizar handover da DDA1', como: 'Checklist de 10 min no quadro da linha', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(8), status: 'Em andamento', comentarios: '' }),
    planoArea('A3', 'D-QUAL', { fonte_id: 'FA2', tema: 'Qualidade', divisao: 'Apparel', area: 'Qualidade', oque: 'Tratar NC de viscosidade sem expor no consolidado', como: 'Carta de controle e treino do turno 2', responsavel: 'Bruno Lima', email: 'bruno.lima@example.com', prazo: add(-4), status: 'Aberto', comentarios: 'Só o gestor da qualidade vê' }),
    planoArea('A4', 'D-PROD', { fonte_id: 'FA1', tema: 'OEE', divisao: 'Solutions', area: 'Produção', oque: 'Encerrar piloto de microparada', como: 'Relatório semanal arquivado', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(-12), status: 'Concluído', comentarios: 'Encerrada' }),
    planoArea('A5', 'D-PROD', { fonte_id: 'FA1', tema: 'Produção', divisao: 'Solutions', area: 'Produção', oque: 'Consultar outras plantas para problema de setup', como: 'Alinhar com Joly o padrão de SMED', responsavel: 'Joly Soares', email: 'joly.soares@example.com', prazo: add(-6), status: 'Aberto', comentarios: 'Atrasada só nesta área' }),
  ];
  var fontesArea = [
    { id: 'FA1', departamento_id: 'D-PROD', nome: 'Ações internas Produção', referencia: 'https://docs.google.com/spreadsheets/d/exemplo-prod', aba: 'Planos', linha_cabecalho: 1, ativo: 'SIM', ultima_execucao: '', ultimo_status: 'OK', ultimo_detalhe: '4 linhas' },
    { id: 'FA2', departamento_id: 'D-QUAL', nome: 'Ações internas Qualidade', referencia: 'https://docs.google.com/spreadsheets/d/exemplo-qual', aba: 'Planos', linha_cabecalho: 1, ativo: 'SIM', ultima_execucao: '', ultimo_status: 'OK', ultimo_detalhe: '1 linha' },
  ];
  var senhasArea = { 'D-QUAL': 'gestor' };
  var areaDesbloqueadas = {};

  var planos = [
    plano('1', { tema: 'Segurança', divisao: 'Operations', area: 'EHS', oque: 'Eliminar desvio de bloqueio LOTO na DDA2', como: 'Padronizar checklist de LOTO e treinar turno 1 e 2', responsavel: 'Ana Souza', email: 'ana.souza@example.com', prazo: add(5), status: 'Em andamento', comentarios: 'Treinamento agendado' }),
    plano('2', { tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade', oque: 'Reduzir NC de epóxi irregular', como: 'Ajustar janela de viscosidade e inspeção visual a cada 2h', responsavel: 'Bruno Lima', email: '', prazo: add(-3), status: 'Aberto', comentarios: 'Aguardando e-mail do responsável' }),
    plano('3', { tema: 'OEE', divisao: 'Operations', area: 'Produção', oque: 'Recuperar uptime da DDA1 abaixo da meta', como: 'A3 de paradas não justificadas + padrão de apontamento', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(-2), status: 'Aberto', comentarios: '' }),
    plano('4', { tema: 'Entrega', divisao: 'Supply Chain', area: 'Logística', oque: 'Estabilizar FIFO do armazém de acabados', como: 'Sinalizar endereços e auditar 2x por semana', responsavel: 'Diego Alves', email: 'diego.alves@example.com', prazo: add(12), status: 'Aberto', comentarios: '' }),
    plano('5', { tema: 'Manutenção', divisao: 'Operations', area: 'Manutenção', oque: 'Zerar backlog de preventiva atrasada > 7 dias', como: 'Janela semanal congelada na sexta para PCM', responsavel: 'Elisa Rocha', email: 'elisa.rocha@example.com', prazo: add(-10), status: 'Concluída', comentarios: 'Backlog zerado na semana 32' }),
    plano('6', { tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade', oque: 'Fechar CAPA de auditoria de cliente', como: 'Atualizar procedimento e treinar operadores', responsavel: 'Bruno Lima', email: '', prazo: add(-1), status: 'Aberto', comentarios: '' }),
    plano('7', { tema: 'Segurança', divisao: 'Operations', area: 'EHS', oque: 'Substituir guarda de máquina da DDA3', como: 'Comprar kit e instalar no shutdown de setembro', responsavel: 'Ana Souza', email: 'ana.souza@example.com', prazo: add(20), status: 'Cancelada', comentarios: 'Escopo absorvido pelo A3 de segurança' }),
    plano('8', { tema: 'OEE', divisao: 'Operations', area: 'Produção', oque: 'Padronizar troca de turno com handover de 10 min', como: 'Quadro visual + checklist de passagem de turno na DDA1 e DDA2', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(8), status: 'Em andamento', comentarios: 'Piloto na DDA1' }),
    plano('9', { tema: 'Entrega', divisao: 'Supply Chain', area: 'Logística', oque: 'Reduzir lead time de expedição de acabados', como: 'Pré-separar pedidos do dia seguinte no turno 3', responsavel: 'Diego Alves', email: 'diego.alves@example.com', prazo: add(4), status: 'Aberto', comentarios: 'Falta confirmar capacidade do armazém' }),
    plano('10', { tema: 'Manutenção', divisao: 'Operations', area: 'Manutenção', oque: 'Implantar RCM na linha Smartrac', como: 'Mapear falhas críticas e definir preventiva por modo de falha', responsavel: 'Elisa Rocha', email: 'elisa.rocha@example.com', prazo: add(18), status: 'Aberto', comentarios: '' }),
    plano('11', { tema: 'Qualidade', divisao: 'Operations', area: 'Qualidade', oque: 'Eliminar retrabalho de etiqueta ilegível', como: 'Trocar ribbon e calibrar cabeça de impressão semanalmente', responsavel: 'Bruno Lima', email: '', prazo: add(6), status: 'Em andamento', comentarios: 'Peças em trânsito' }),
    plano('12', { tema: 'OEE', divisao: 'Operations', area: 'Produção', oque: 'Reduzir microparadas da DDA2 no setup', como: 'SMED com cronoanálise e kit pré-montado ao lado da máquina', responsavel: 'Carla Mendes', email: 'carla.mendes@example.com', prazo: add(-4), status: 'Aberto', comentarios: 'Aguardando foto do estado atual' }),
  ];

  var fontes = [
    { id: 'F1', nome: 'A3 Qualidade', referencia: 'https://docs.google.com/spreadsheets/d/exemplo', aba: 'Planos', linha_cabecalho: 1, ativo: true, ultima_execucao: '', ultimo_status: '', ultimo_detalhe: '' },
  ];
  var gatilho = { ativo: false, quantidade: 0, hora: 8 };
  var temasFollowUp = [];
  var followupsEnviadosHoje = {};
  var followUpPorArea = {};
  var emailSessao = 'christian.inacio@averydennison.com';

  function followUpDept(deptId) {
    if (!followUpPorArea[deptId]) {
      followUpPorArea[deptId] = { temas: [], soEu: false, gestorEmail: '', emailsOff: [] };
    }
    return followUpPorArea[deptId];
  }

  function payloadFollowArea(deptId) {
    var fu = followUpDept(deptId);
    return {
      temas: (fu.temas || []).slice(),
      soEu: !!fu.soEu,
      gestorEmail: fu.gestorEmail || '',
      emailsOff: (fu.emailsOff || []).slice(),
      meuEmail: emailSessao,
    };
  }

  function temasDistintos() {
    var set = {}; var out = [];
    planos.forEach(function (p) {
      if (!p.tema || set[p.tema]) return;
      set[p.tema] = 1; out.push(p.tema);
    });
    out.sort(function (a, b) { return String(a).localeCompare(String(b), 'pt-BR'); });
    return out;
  }

  function kpisLista(lista) {
    var atrasados = lista.filter(function (p) { return p.status === 'Atrasado'; }).length;
    var concluidos = lista.filter(function (p) {
      return String(p.status || '').toLowerCase().indexOf('conclu') === 0;
    }).length;
    var abertos = lista.filter(function (p) {
      var s = String(p.status || '').toLowerCase();
      return s.indexOf('conclu') !== 0 && s.indexOf('cancel') !== 0;
    }).length;
    var semEmail = lista.filter(function (p) {
      var s = String(p.status || '').toLowerCase();
      return !p.tem_email && s.indexOf('conclu') !== 0 && s.indexOf('cancel') !== 0;
    }).length;
    return { total: lista.length, atrasados: atrasados, abertos: abertos, semEmail: semEmail, concluidos: concluidos };
  }

  function payloadArea(deptId, precisaSenha, extra) {
    extra = extra || {};
    var lista = precisaSenha
      ? []
      : planosArea.filter(function (p) { return p.departamento_id === deptId; });
    return {
      ok: !precisaSenha,
      precisaSenha: !!precisaSenha,
      senhaErrada: !!extra.senhaErrada,
      departamento_id: deptId,
      tem_senha_planos: !!senhasArea[deptId],
      planos: lista,
      fontes: precisaSenha ? [] : fontesArea.filter(function (f) { return f.departamento_id === deptId; }),
      kpis: kpisLista(lista),
      followup: payloadFollowArea(deptId),
    };
  }

  function areaTrancada(deptId) {
    return !!senhasArea[deptId] && !areaDesbloqueadas[deptId];
  }

  function hub() {
    return {
      hoje: ymd(hoje),
      departamentos: departamentos.map(function (d) {
        return {
          id: d.id, nome: d.nome, descricao: d.descricao, icone: d.icone, cor: d.cor,
          ordem: d.ordem, bandeira: d.bandeira, tem_senha_planos: !!senhasArea[d.id],
        };
      }),
      controles: controles.map(function (c) {
        return { id: c.id, departamento_id: c.departamento_id, nome: c.nome, descricao: c.descricao, url: c.url, ordem: c.ordem, negocio: c.negocio, pasta: c.pasta };
      }),
      planos: planos,
      kpis: kpisLista(planos),
      temasDistintos: temasDistintos(),
      temasFollowUp: temasFollowUp.slice(),
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
        app: { nome: 'OpsHub', versao: '1.6.0' },
        usuario: { email: 'christian.inacio@averydennison.com', nome: 'christian inacio', iniciais: 'CI' },
        gatilho: gatilho,
      };
    },
    apiHub: function () { return hub(); },
    apiSalvarIdioma: function (codigo) {
      return { idioma: typeof I18n !== 'undefined' ? I18n.normalizar(codigo) : codigo };
    },
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
    apiReordenarDepartamentos: function (ids) {
      departamentos = (ids || []).map(function (id, i) {
        var d = departamentos.filter(function (x) { return x.id === id; })[0];
        if (d) d.ordem = i + 1;
        return d;
      }).filter(Boolean);
      return hub();
    },
    apiSalvarTemasFollowUp: function (temas) {
      if (typeof temas === 'string' && temas.indexOf('TEMAS') === 0) {
        var corpo = temas.slice(5).replace(/^[\n\t]/, '');
        temasFollowUp = corpo.trim() ? corpo.split(/[\n\t]/).map(function (t) { return t.trim(); }).filter(Boolean) : [];
        return hub();
      }
      if (temas && typeof temas === 'object' && temas.json != null) {
        temas = temas.json;
      }
      if (typeof temas === 'string') {
        try { temas = temas ? JSON.parse(temas) : []; } catch (e) { temas = []; }
      }
      if (temas && typeof temas === 'object' && !Array.isArray(temas) && typeof temas.length === 'number') {
        var copiada = [];
        for (var i = 0; i < temas.length; i++) copiada.push(temas[i]);
        temas = copiada;
      }
      temasFollowUp = Array.isArray(temas) ? temas.slice() : [];
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
    apiImportarAgora: function () {
      return { fontes: fontes.length + fontesArea.length, linhas: planos.length + planosArea.length, avisos: [] };
    },
    apiAtualizar: function () {
      var h = hub();
      h.importacao = { fontes: fontes.length + fontesArea.length, linhas: planos.length + planosArea.length, avisos: [] };
      return h;
    },
    apiEnviarFollowUpsAgora: function (forcar, departamentoId) {
      function candidato(p, area) {
        var s = String(p.status || '').toLowerCase();
        if (s.indexOf('conclu') === 0 || s.indexOf('cancel') === 0) return false;
        if (!p.tem_email || p.status !== 'Atrasado') return false;
        if (!area) {
          if (temasFollowUp.length === 1 && temasFollowUp[0] === '__NONE__') return false;
          if (temasFollowUp.length && temasFollowUp.indexOf(p.tema) === -1) return false;
        } else {
          var fu = followUpDept(p.departamento_id);
          if (fu.temas.length === 1 && fu.temas[0] === '__NONE__') return false;
          if (fu.temas.length && fu.temas.indexOf(p.tema) === -1) return false;
          var email = String(p.email || '').toLowerCase();
          if (fu.soEu) {
            var g = String(fu.gestorEmail || emailSessao).toLowerCase();
            if (email !== g) return false;
          }
          if ((fu.emailsOff || []).indexOf(email) !== -1) return false;
        }
        if (!forcar && followupsEnviadosHoje[p.id]) return false;
        return true;
      }
      var cand = [];
      if (!departamentoId) {
        cand = planos.filter(function (p) { return candidato(p, false); })
          .concat(planosArea.filter(function (p) { return candidato(p, true); }));
      } else {
        cand = planosArea.filter(function (p) {
          return p.departamento_id === departamentoId && candidato(p, true);
        });
      }
      cand.forEach(function (p) { followupsEnviadosHoje[p.id] = true; });
      var universo = departamentoId
        ? planosArea.filter(function (p) { return p.departamento_id === departamentoId; }).length
        : planos.length + planosArea.length;
      return { enviados: cand.length, pulados: universo - cand.length, erros: 0 };
    },
    apiPreverFollowUps: function (departamentoId) {
      function candidato(p, area) {
        var s = String(p.status || '').toLowerCase();
        if (s.indexOf('conclu') === 0 || s.indexOf('cancel') === 0) return false;
        if (!p.tem_email || p.status !== 'Atrasado') return false;
        if (!area) {
          if (temasFollowUp.length === 1 && temasFollowUp[0] === '__NONE__') return false;
          if (temasFollowUp.length && temasFollowUp.indexOf(p.tema) === -1) return false;
        } else {
          var fu = followUpDept(p.departamento_id);
          if (fu.temas.length === 1 && fu.temas[0] === '__NONE__') return false;
          if (fu.temas.length && fu.temas.indexOf(p.tema) === -1) return false;
          var email = String(p.email || '').toLowerCase();
          if (fu.soEu) {
            var g = String(fu.gestorEmail || emailSessao).toLowerCase();
            if (email !== g) return false;
          }
          if ((fu.emailsOff || []).indexOf(email) !== -1) return false;
        }
        return true;
      }
      var cand = [];
      if (!departamentoId) {
        cand = planos.filter(function (p) { return candidato(p, false); })
          .concat(planosArea.filter(function (p) { return candidato(p, true); }));
      } else {
        cand = planosArea.filter(function (p) {
          return p.departamento_id === departamentoId && candidato(p, true);
        });
      }
      var temasJa = [];
      var vistos = {};
      cand.forEach(function (p) {
        if (followupsEnviadosHoje[p.id] && p.tema && !vistos[p.tema]) {
          vistos[p.tema] = 1;
          temasJa.push(p.tema);
        }
      });
      return { total: cand.length, temasJaEnviadosHoje: temasJa };
    },
    apiPlanosArea: function (deptId) {
      if (areaTrancada(deptId)) return payloadArea(deptId, true);
      return payloadArea(deptId, false);
    },
    apiAbrirPlanosArea: function (deptId, senha) {
      if (senhasArea[deptId] && String(senha || '') !== senhasArea[deptId]) {
        return payloadArea(deptId, true, { senhaErrada: true });
      }
      areaDesbloqueadas[deptId] = true;
      return payloadArea(deptId, false);
    },
    apiSalvarFonteArea: function (reg) {
      if (!reg || !reg.departamento_id) throw new Error('Registro vazio.');
      if (areaTrancada(reg.departamento_id)) return payloadArea(reg.departamento_id, true);
      if (!String(reg.referencia || '').trim()) throw new Error('Cole a URL completa ou o ID da Google Sheet.');
      var id = reg.id || nid('FA');
      var registro = {
        id: id,
        departamento_id: reg.departamento_id,
        nome: reg.nome || 'Fonte da área',
        referencia: reg.referencia,
        aba: reg.aba || '',
        linha_cabecalho: Number(reg.linha_cabecalho || 1) || 1,
        ativo: reg.ativo || 'SIM',
        ultima_execucao: new Date(),
        ultimo_status: 'OK',
        ultimo_detalhe: 'preview',
      };
      var atual = fontesArea.filter(function (f) { return String(f.id) === String(id); })[0];
      if (atual) {
        fontesArea = fontesArea.map(function (f) { return String(f.id) === String(id) ? registro : f; });
      } else {
        fontesArea.push(registro);
      }
      var payload = payloadArea(reg.departamento_id, false);
      return payload;
    },
    apiExcluirFonteArea: function (id) {
      var atual = fontesArea.filter(function (f) { return String(f.id) === String(id); })[0];
      if (!atual) {
        return { ok: true, precisaSenha: false, departamento_id: '', tem_senha_planos: false, planos: [], fontes: [], kpis: kpisLista([]) };
      }
      if (areaTrancada(atual.departamento_id)) return payloadArea(atual.departamento_id, true);
      fontesArea = fontesArea.filter(function (f) { return String(f.id) !== String(id); });
      planosArea = planosArea.filter(function (p) { return String(p.fonte_id) !== String(id); });
      return payloadArea(atual.departamento_id, false);
    },
    apiImportarPlanosArea: function (deptId) {
      if (areaTrancada(deptId)) return payloadArea(deptId, true);
      var nFontes = fontesArea.filter(function (f) { return f.departamento_id === deptId; }).length;
      var payload = payloadArea(deptId, false);
      payload.importacao = { fontes: nFontes, linhas: nFontes ? payload.planos.length : 0, avisos: [] };
      return payload;
    },
    apiDefinirSenhaPlanosArea: function (deptId, senhaAtual, senhaNova) {
      if (senhasArea[deptId] && String(senhaAtual || '') !== senhasArea[deptId]) {
        throw new Error('Senha atual incorreta.');
      }
      if (String(senhaNova || '').trim()) {
        senhasArea[deptId] = String(senhaNova);
        areaDesbloqueadas[deptId] = true;
      } else if (senhasArea[deptId]) {
        delete senhasArea[deptId];
        delete areaDesbloqueadas[deptId];
      }
      var h = hub();
      h.planosArea = payloadArea(deptId, false);
      return h;
    },
    apiAlternarTemaFollowUp: function (nome) {
      nome = String(nome || '').trim();
      var todos = temasDistintos();
      var atuais = temasFollowUp.slice();
      var nenhum = atuais.length === 1 && atuais[0] === '__NONE__';
      if (!atuais.length) atuais = todos.slice();
      if (nenhum) atuais = [];
      var idx = atuais.indexOf(nome);
      if (idx === -1) atuais.push(nome);
      else atuais = atuais.filter(function (t) { return t !== nome; });
      if (!atuais.length) temasFollowUp = ['__NONE__'];
      else if (atuais.length === todos.length) temasFollowUp = [];
      else temasFollowUp = atuais;
      return hub();
    },
    apiAlternarTemaFollowUpArea: function (deptId, nome) {
      nome = String(nome || '').trim();
      var todos = [];
      var set = {};
      planosArea.forEach(function (p) {
        if (p.departamento_id !== deptId || !p.tema || set[p.tema]) return;
        set[p.tema] = 1;
        todos.push(p.tema);
      });
      var fu = followUpDept(deptId);
      var atuais = fu.temas.slice();
      var nenhum = atuais.length === 1 && atuais[0] === '__NONE__';
      if (!atuais.length) atuais = todos.slice();
      if (nenhum) atuais = [];
      var idx = atuais.indexOf(nome);
      if (idx === -1) atuais.push(nome);
      else atuais = atuais.filter(function (t) { return t !== nome; });
      if (!atuais.length) fu.temas = ['__NONE__'];
      else if (atuais.length === todos.length) fu.temas = [];
      else fu.temas = atuais;
      return payloadArea(deptId, areaTrancada(deptId));
    },
    apiDefinirFollowUpAreaEscopo: function (deptId, soEu) {
      var fu = followUpDept(deptId);
      var ligado = soEu === true || soEu === 'SIM' || soEu === 'true' || soEu === 1 || soEu === '1';
      fu.soEu = ligado;
      if (ligado) fu.gestorEmail = emailSessao;
      return payloadArea(deptId, areaTrancada(deptId));
    },
    apiAlternarEmailFollowUpArea: function (deptId, email) {
      email = String(email || '').trim().toLowerCase();
      var fu = followUpDept(deptId);
      var idx = fu.emailsOff.indexOf(email);
      if (idx === -1) fu.emailsOff.push(email);
      else fu.emailsOff.splice(idx, 1);
      return payloadArea(deptId, areaTrancada(deptId));
    },
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
          var lentos = {
            apiAtualizar: 700,
            apiEnviarFollowUpsAgora: 700,
            apiPreverFollowUps: 500,
            apiCriarGatilho: 550,
            apiRemoverGatilhos: 550,
            apiAlternarTemaFollowUp: 500,
            apiSalvarFonteArea: 700,
            apiImportarPlanosArea: 700,
          };
          var delay = lentos[nome] || 40;
          setTimeout(function () { ok(out); }, delay);
        } catch (e) {
          setTimeout(function () { err(e); }, 30);
        }
      },
    });
  });
})();
