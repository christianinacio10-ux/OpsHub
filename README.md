# OpsHub

Hub operacional da planta (Avery Dennison): controles-chave por departamento e consolidação dos planos de ação importados de outras Google Sheets.

Tema dark, sidebar no mesmo espírito do Controle Hora por Hora, com a marca Avery.

## O que o painel faz

- **Departamentos clicáveis** na aba OpsHub abrem uma subtela só com os arquivos da área. A **lista** no card abre os planos de ação daquela área (não entram no consolidado da planta). A engrenagem configura o card (ícone, cor, arquivos e senha opcional da lista). Cada área tem a **divisão** Apparel, Smartrac ou Solutions (a coluna na planilha continua `bandeira`). Em Solutions o modal de visualização mostra três colunas. Arraste os cards para reordenar.
- **Planos de ação** com resumo (KPIs) e filtro por tema: a tabela começa vazia até o gestor marcar um ou mais temas, ou **Todos**. Os demais eixos (divisão, área, status, responsável) são multi-seleção no estilo Excel. A lista privada de cada área usa os mesmos filtros e guarda o recorte no navegador.
- **Configurações** reúne departamentos, fontes de importação e follow-up/gatilho.
- **Follow-up por e-mail:** depois de 1 dia de atraso, um e-mail por dia para o responsável, até a data ser reprogramada na origem. Em Follow-up e gatilho, chips ligam ou desligam quais temas entram no e-mail (vazio = todos). Sem e-mail cadastrado, nada é enviado — a linha mostra o aviso no tooltip.

## Instalar na Google Sheet

1. Crie uma planilha em branco (ex.: `OpsHub`).
2. **Extensões → Apps Script**.
3. Apague o conteúdo de `Code.gs` e cole o arquivo [`Appscript.txt`](Appscript.txt) inteiro.
4. Salve. No editor, selecione a função `instalarSistema` e clique em **Executar**. Autorize a conta (planilhas, Gmail e gatilhos).
5. Volte à planilha: o menu **OpsHub** deve aparecer após F5.
6. **Implantar → Nova implantação → Tipo: App da web**.
   - Executar como: você
   - Quem tem acesso: sua organização
7. Copie a URL. O menu **OpsHub → Abrir painel** também tenta abrir essa URL.

Edite o código em `src/` e regenere o pacote com:

```bash
node testes/empacotar.js
```

## Planilha: abas

| Aba | Uso |
| --- | --- |
| `DEPARTAMENTOS` | Áreas do hub (nome, ícone, cor, ordem, divisão Apparel/Smartrac/Solutions na coluna `bandeira`, senha opcional em `senha_planos`, follow-up privado da área) |
| `CONTROLES` | Links de cada departamento (negócio Apparel/Smartrac/Solutions e agrupamento opcional, ex.: Linha / Programa) |
| `FONTES_PLANOS` | Google Sheets de origem dos planos da planta |
| `PLANOS_ACAO` | Consolidado importado da planta (não edite na mão se vier de fonte) |
| `FONTES_AREA` | Google Sheets de origem dos planos privados de cada área (aba oculta) |
| `PLANOS_AREA` | Planos privados por departamento (aba oculta; a importação da planta não a substitui) |
| `_CONFIG` | Timezone, hora do gatilho, nome do remetente, temas de follow-up |
| `EMAILS_ENVIADOS` / `_LOG` | Auditoria (ocultas) |

A primeira instalação (quando as abas ainda não existem) cria departamentos típicos de planta e alguns links de exemplo. Se você apagar esses cadastros, o painel **não** os recoloca — o vazio é respeitado. Troque as URLs pelos controles reais, ou cadastre os seus.

## Importar planos de outras Sheets

1. No painel, **Configurações → Fontes de importação**, ou direto na aba `FONTES_PLANOS`, para o consolidado da planta.
2. Na **lista** de cada área, cole a **URL ou o ID** da planilha daquela área (`FONTES_AREA`). As ações ficam só ali.
3. A origem precisa ter (nomes próximos valem) as colunas: Tema, Divisão, Área, O quê?, Como, Responsável, E-mail, Prazo, Status, Comentários.
4. A conta que autorizou o OpsHub precisa ter acesso de leitura na origem.
5. **Importar agora**, o **Atualizar** do painel, ou o gatilho diário — os três leem as fontes da planta e das áreas.

A importação substitui só as linhas daquela fonte. O histórico de e-mails de follow-up é preservado quando a linha de origem continua a mesma.

## E-mail de follow-up

- Primeiro disparo no **dia seguinte ao prazo** (atraso de 1 dia).
- Depois, **um e-mail por dia** no gatilho automático, até o prazo na origem ir para uma data futura (ou a ação ser concluída/cancelada).
- **Enviar follow-ups agora** pode repetir no mesmo dia. Se já houve envio, o painel avisa e pergunta se deseja cobrar de novo aquele tema.
- Sem e-mail válido: não envia. Na tabela, o ícone amarelo explica: *Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.*
- Em **Configurações → Follow-up e gatilho**, os chips dos temas da planta ligam ou desligam o envio do consolidado. Lista vazia em `_CONFIG.followup_temas` = todos os temas.
- Na **lista de cada área**, o follow-up é **independente**: chips de tema daquela planilha, opção de cobrar só o e-mail de quem está logado, e desmarcar responsáveis um a um (`followup_temas`, `followup_so_eu`, `followup_gestor_email`, `followup_emails_off` em `DEPARTAMENTOS`). O gatilho diário da planta continua único — não se cria outro disparo. Os filtros da lista (tema + Excel) ficam em cache no navegador por área.

Crie o gatilho pelo menu **OpsHub → Ativar gatilho** ou em **Configurações → Follow-up e gatilho** (padrão: 08h, fuso `America/Sao_Paulo`). A rotina importa as fontes e em seguida envia os e-mails.

## Preview local (sem Google)

```bash
node testes/logica.test.js
node testes/empacotar.js
python3 -m http.server 4173 --directory preview
```

Abra `http://localhost:4173`. É a mesma interface, com dados de demonstração.
