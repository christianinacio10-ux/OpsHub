# OpsHub

Hub operacional da planta (Avery Dennison): controles-chave por departamento e consolidação dos planos de ação importados de outras Google Sheets.

Tema dark, sidebar no mesmo espírito do Controle Hora por Hora, com a marca Avery.

## O que o painel faz

- **Departamentos clicáveis** abrem uma subtela com os controles-chave da área. O nome do controle leva ao link cadastrado.
- **Planos de ação consolidados** com cabeçalho: Tema, Divisão, Área, O quê?, Como, Responsável, E-mail, Prazo, Status, Comentários.
- **Filtro e ordenação** em qualquer coluna, mais busca livre.
- **Follow-up por e-mail:** depois de 1 dia de atraso, um e-mail por dia para o responsável, até a data ser reprogramada na origem. Sem e-mail cadastrado, nada é enviado — a linha mostra o aviso no tooltip.

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
| `DEPARTAMENTOS` | Áreas do hub (nome, ícone, cor, ordem) |
| `CONTROLES` | Links de cada departamento |
| `FONTES_PLANOS` | Google Sheets de origem dos planos |
| `PLANOS_ACAO` | Consolidado importado (não edite na mão se vier de fonte) |
| `_CONFIG` | Timezone, hora do gatilho, nome do remetente |
| `EMAILS_ENVIADOS` / `_LOG` | Auditoria (ocultas) |

A primeira instalação já cria departamentos típicos de planta e alguns links de exemplo. Troque as URLs pelos controles reais.

## Importar planos de outras Sheets

1. No painel, **Fontes de importação**, ou direto na aba `FONTES_PLANOS`.
2. Cole a **URL ou o ID** da planilha origem e, se quiser, o nome da aba.
3. A origem precisa ter (nomes próximos valem) as colunas: Tema, Divisão, Área, O quê?, Como, Responsável, E-mail, Prazo, Status, Comentários.
4. A conta que autorizou o OpsHub precisa ter acesso de leitura na origem.
5. **Importar agora**, ou deixe o gatilho diário cuidar disso.

A importação substitui só as linhas daquela fonte. O histórico de e-mails de follow-up é preservado quando a linha de origem continua a mesma.

## E-mail de follow-up

- Primeiro disparo no **dia seguinte ao prazo** (atraso de 1 dia).
- Depois, **um e-mail por dia**, até o prazo na origem ir para uma data futura (ou a ação ser concluída/cancelada).
- Sem e-mail válido: não envia. Na tabela, o ícone amarelo explica: *Não é possível enviar o e-mail de follow-up pois não há e-mail cadastrado.*

Crie o gatilho pelo menu **OpsHub → Criar gatilho diário** ou pela tela Follow-up (padrão: 08h, fuso `America/Sao_Paulo`). A rotina importa as fontes e em seguida envia os e-mails.

## Preview local (sem Google)

```bash
node testes/logica.test.js
node testes/empacotar.js
python3 -m http.server 4173 --directory preview
```

Abra `http://localhost:4173`. É a mesma interface, com dados de demonstração.
