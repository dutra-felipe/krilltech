# Krill Radar — Brief do Projeto

Protótipo para o Hackathon PMI-DF 2026 (case Krill Tech).
Leia este arquivo inteiro antes de escrever qualquer código.

## Contexto

A Krill Tech vende para produtores rurais e agroindústrias. Quando um cliente
entra em Recuperação Judicial, o Stay Period suspende legalmente toda cobrança
por até 180 dias e o capital fica preso. O problema não é identificar cliente
ruim: é detectar que um cliente **bom está piorando**, semanas antes de a
Justiça fechar a janela de ação.

O Krill Radar cruza três dimensões que nenhum concorrente cruza junto:
jurídica, agroclimática e comportamental.

**Meta deste repositório: o mínimo possível de dado simulado.** Cada fonte que
sai do mock e passa a consultar base pública real é um ponto direto no critério
de Viabilidade Técnica. Dado simulado é sempre rotulado como simulado na
interface, nunca disfarçado.

## Arquitetura

Sem bundler, sem framework, sem `npm install`. Node 18+ já tem `fetch` e `http`
nativos. Isso é mitigação de risco de wifi de hackathon.

```
index.html          markup + CSS à mão
motor.js            motor de score, funções puras
dados.js            carteira base + fallbacks cacheados
server.mjs          servidor Node sem dependências + proxy das fontes
fontes/
  brasilapi.mjs     cadastral (Receita Federal)
  ibge.mjs           município → código IBGE
  queridodiario.mjs  diários oficiais (texto real)
  datajud.mjs        processual (CNJ)
  clima.mjs          precipitação
  bcb.mjs            macro (Selic, câmbio)
  interna.mjs        comportamental — simulado por definição
.env.local          chaves — no .gitignore antes do primeiro commit
```

`server.mjs` existe por dois motivos: servir os estáticos e ser proxy, porque
chave de API não vai para o JavaScript do navegador em nenhuma circunstância, e
parte das fontes públicas não manda header de CORS. Subir com `node server.mjs`
em `localhost:3000`.

## Contrato único das fontes (faça isso primeiro)

**Todo módulo em `fontes/` exporta a mesma assinatura.** Isso é o que permite
parar em qualquer ponto sem quebrar nada:

```js
// retorno obrigatório de toda fonte
{
  fonte: 'BrasilAPI / Receita Federal',
  status: 'ao_vivo' | 'simulado' | 'indisponivel',
  atualizadoEm: '2026-09-12T14:22:00Z',
  defasagemDias: 0,
  sinais: [ { tipo, descricao, peso, data, determinístico: true } ],
  bruto: {}   // payload original, para o dossiê poder mostrar a evidência
}
```

Regras:

- Toda fonte tem timeout de 5s e try/catch. Falha devolve
  `status: 'indisponivel'`, nunca lança.
- Toda fonte tem fallback cacheado em `dados.js`. Se a rede morrer no pitch, a
  demo continua rodando em modo simulado com aviso discreto.
- A UI lê `status` e rotula sozinha. Nunca hardcode o rótulo na tela.
- `defasagemDias` aparece no painel de fontes. O sistema declara a defasagem em
  vez de esconder.

Implemente esse contrato e um módulo simulado antes de qualquer integração real.
Depois cada fonte real é só trocar o corpo de uma função.

## Escada de fontes reais, em ordem de prioridade

Faça na ordem. Cada item que cair, cai como simulado, e o painel continua
coerente. Não pule para o próximo antes do anterior estar rodando.

### 1. Cadastral — BrasilAPI (gratuita, sem autenticação)

`GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`

Retorna razão social, nome fantasia, QSA, CNAE principal, situação cadastral,
data de início de atividade, município e UF. Respeite ~100ms entre chamadas.

Sinais reais a derivar: situação cadastral diferente de ativa; menos de 2 anos
de atividade (relevante porque a Lei 14.112/2020 exige atividade mínima de 2
anos para produtor pessoa física pedir RJ); CNAE fora do agro quando esperado
agro; alteração recente de quadro societário.

A razão social retornada aqui é a **chave de entrada do item 4**. Guarde.

### 2. Município → código IBGE (gratuita, sem autenticação)

`GET https://servicodados.ibge.gov.br/api/v1/localidades/municipios`

Cola necessária: o Querido Diário indexa por código IBGE de território, e a
BrasilAPI devolve nome de município. Baixe a lista uma vez, cacheie em memória,
normalize acento e caixa no matching.

### 3. Diários Oficiais — Querido Diário + extração por LLM (gratuita, sem autenticação)

Esta é a peça que transforma o projeto de painel em agente. É o componente
"Agente Coletor & Parser" do edital, funcionando de verdade.

```
GET https://api.queridodiario.ok.org.br/gazettes
      ?territory_ids={codigo_ibge}
      &querystring={termo}
      &excerpt_size=500
      &number_of_excerpts=3
      &size=10
```

Sem autenticação. Limite de referência: 60 requisições/minuto, respeite.
Retorna trecho real do texto do diário, data, edição e link do PDF original.

Termos de busca: razão social do cliente, mais termos de risco como "dívida
ativa", "notificação fiscal", "auto de infração", "execução".

O texto bruto vai para a rota de LLM extrair estrutura: tipo de ato, partes,
data, número de processo se houver. Salve o trecho original junto, porque o
dossiê precisa mostrar a evidência ao lado da extração. Avaliador clicando no
link do PDF real do diário é o momento mais forte da demo.

**Não chame isso de RAG no pitch.** É extração assistida por LLM sobre
documento público recuperado por busca full-text. Honesto e defensável. E diga
a limitação: o Querido Diário cobre diários **municipais** e a União, então atos
judiciais de RJ vivem nos DJEs dos tribunais, não aqui. O que a demo prova é que
o pipeline de extração funciona sobre documento oficial real; trocar a fonte por
DJE na Fase 2 é configuração, não arquitetura.

### 4. Processual — DataJud (gratuita, chave pública)

A chave de autenticação é publicada abertamente na wiki do DataJud. URL base
`https://api-publica.datajud.cnj.jus.br/api_publica_{tribunal}/_search`, com
endpoint próprio por tribunal, corpo de query no formato Elasticsearch.

**A API não indexa CPF/CNPJ nos campos pesquisáveis, por LGPD.** A busca é por
nome da parte. Por isso o item 1 vem antes: use a razão social da BrasilAPI
como termo. Funciona, e a imprecisão por homônimo é justamente o que justifica o
`nivelConfianca` do motor.

Se o formato de query travar mais de 20 minutos, pare, deixe como simulado e
leve a limitação mapeada para o pitch. Restrição documentada vale mais que
integração meia-boca.

### 5. Clima — precipitação real

Tente primeiro o INMET, porque é a fonte que o edital nomeia:
`https://apitempo.inmet.gov.br/estacao/{dataIni}/{dataFim}/{codigoEstacao}`.
**Verifique o endpoint antes de investir tempo** — o portal do INMET muda de
formato e parte dos dados históricos exige cadastro no BDMEP.

Fallback confiável, sem chave e sem cadastro: Open-Meteo archive
(`https://archive-api.open-meteo.com/v1/archive`), com lat/lon do município e
`daily=precipitation_sum`. Se usar, declare na interface que a série é do
Open-Meteo e que o INMET é a fonte de produção.

Derive déficit hídrico acumulado nos últimos 60 dias contra a média do período.

### 6. Macro — Banco Central SGS (gratuita, sem autenticação)

`https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`

Selic e câmbio como fator de pressão de custo da carteira inteira, não do
cliente individual. Dez minutos de trabalho e fecha o argumento de "pressão de
margens" da Seção 3 do edital com número real do dia.

### Irredutivelmente simulado, e isso está certo

- **Base interna comportamental** (atraso, uso de limite, renegociação). É dado
  proprietário da Krill Tech, não existe publicamente. Simular é a única opção
  honesta, e é também o único componente com dado exclusivo da empresa, o que
  vale dizer no pitch.
- **SICAR/CAR** — sem API pública, tem captcha.
- **PGFN Dívida Ativa** — publicada como dump CSV trimestral de milhões de
  linhas, inviável hoje.
- **CNDT/TST e CRF-FGTS** — captcha.
- **ZARC** — sem endpoint estável.

Rotule cada um desses como simulado na interface, com a razão. Um painel que
admite o que não sabe é mais convincente que um que finge saber tudo.

## O que construir

### Tela 1 — Carteira

8 a 12 clientes. P  or linha: nome, CNPJ mascarado, cultura, região, score
0–1000, rating A–D, tendência, delta de 30 dias, nível de confiança.

Ordenação padrão: **maior deterioração primeiro**, não maior risco absoluto. Um
cliente B que caiu 180 pontos importa mais que um D que sempre foi D. É o
argumento central do produto e precisa estar visível na primeira tela.

Campo no topo para o avaliador digitar qualquer CNPJ e ver a cadeia rodar ao
vivo: BrasilAPI → IBGE → Querido Diário → LLM → score.

### Tela 2 — Dossiê

Clicar numa linha abre o dossiê. É o momento do pitch.

Cliente A de demonstração: score cai de **780 para 421 em 60 dias**, por sinais
cruzados de fontes diferentes. Os que vierem de fonte real vêm de fonte real; o
resto é simulado e rotulado.

- Gráfico de linha do score em 90 dias, com cada sinal marcado como anotação no
  ponto em que ocorreu. SVG à mão a partir dos dados, sem biblioteca de charts.
- Cada sinal com data, fonte, o que foi detectado, quantos pontos custou, e se é
  determinístico (regra jurídica) ou estatístico (tendência).
- Trecho original do diário oficial ao lado da extração do LLM, com link para o
  PDF na fonte.
- **Nenhum número aparece sozinho.** Toda variação vem com explicação. Regra de
  produto, não preferência estética.
- Explicação em linguagem natural gerada por LLM.
- Recomendação operacional derivada da faixa.
- Painel de fontes: status ao vivo/simulado/indisponível, última atualização e
  defasagem de cada uma.

### Agente Sintetizador — rota `/api/explicar`

Um prompt. Recebe os sinais estruturados em JSON, devolve 2 ou 3 frases para o
analista: o que mudou, por que importa, o que fazer.

Preferência por **watsonx.ai**, porque a IBM é a apoiadora tecnológica do
desafio e isso conta. Se o cadastro travar, qualquer LLM serve; mantenha o
endpoint isolado em uma função para trocar em uma linha.

Regras do prompt: nunca inventar sinal fora do JSON de entrada; nunca afirmar
que o cliente vai entrar em RJ; sempre citar a fonte de cada sinal; sempre
terminar em ação, não em diagnóstico.

**Fallback cacheado implementado junto com a chamada, não depois.** A demo não
pode morrer ao vivo por wifi.

### Motor de score (`motor.js`)

Score base 1000, penalizado por sinais.

| Rating | Faixa    | Decisão operacional                                                |
| ------ | -------- | ------------------------------------------------------------------ |
| A      | 801–1000 | Limite liberado, prazo padrão até 90 dias                          |
| B      | 601–800  | Limite mantido, revisão em 30 dias, prazo reduzido para 60 dias    |
| C      | 401–600  | Limite congelado, exigir garantia real (CPR ou alienação), 30 dias |
| D      | 0–400    | Suspender venda a prazo, acionar jurídico, avaliar antecipação     |

Duas camadas, com a distinção visível na interface:

1. **Regras determinísticas** — fato jurídico objetivo. Peso fixo, sem ML,
   auditável.
2. **Índice de tendência** — velocidade da piora comportamental. É aqui que mora
   a antecipação.

`calcularConfianca()`: alto com sinal determinístico confirmado em fonte oficial
ao vivo; médio com 2+ sinais estatísticos; baixo com sinal único, fonte
simulada ou fonte defasada. **Fonte com `status: 'simulado'` nunca produz
confiança alta.**

Risco climático **nunca** pontua isolado, só combinado com sinal jurídico ou
comportamental. Salvaguarda no código, porque a banca vai perguntar sobre falso
positivo.

### Fora de escopo

Banco de dados, login, deploy, treinar ML, PD calibrada em 6/12/24 meses,
responsividade mobile além do básico. A demo roda em projetor.

Sobre a PD: o edital pede na Seção 6, mas a Seção 6 é referência conceitual sem
caráter obrigatório. Sem histórico de inadimplência da Krill Tech, qualquer PD
seria inventada. Entregamos tendência mais nível de confiança agora; PD
calibrada é o entregável de saída do piloto.

## Direção visual

Painel de instrumentos para analista de crédito agro sob pressão de tempo. Não é
site institucional nem SaaS genérico.

Evite: fundo creme com serifada display e acento terracota; tudo picado em cards
arredondados idênticos com a mesma sombra cinza; eyebrow em caixa alta acima de
cada título; gradientes decorativos; seta "→" colada em botões; fade-and-slide
em cada seção.

Direção proposta (ajuste se tiver melhor ideia, mas justifique):

- **Paleta:** fundo tinta escura (`#101614`), superfície elevada (`#1A2320`),
  texto `#E8E6DF`. Cores de sinal mapeadas ao rating e usadas **só** para
  rating: A `#7FA650`, B `#D4A63C`, C `#C4712F`, D `#B03A2E`. Nenhuma delas
  aparece como decoração fora do rating.
- **Tipografia:** uma família grotesca só. Numerais tabulares obrigatórios nos
  scores (`font-variant-numeric: tabular-nums`), porque número que dança ao
  atualizar destrói a credibilidade de um painel de risco.
- **Hierarquia:** o score e sua trajetória são o elemento memorável. O resto
  fica quieto. Gaste a ousadia no gráfico do dossiê.
- **Movimento:** só em resposta a clique, para mostrar o que mudou.

Ao vivo, simulado e indisponível precisam ser distinguíveis sem legenda.
Resolva por tratamento estrutural, não por cor, que já está reservada ao rating.

## Copy

Português do Brasil, voz de analista, sentence case. Nomeie como o usuário
entende: "limite congelado", não "flag de restrição de crédito". Toda
recomendação é uma frase que diz o que fazer. Erro explica o que aconteceu e o
que fazer, sem se desculpar. Rodapé fixo em toda tela de decisão: revisão humana
obrigatória, o sistema recomenda e não decide.

## Ordem de execução

Pare e me mostre ao fim de cada etapa. Não construa tudo de uma vez.

1. `motor.js` + contrato das fontes + uma fonte simulada. Sem UI.
2. `server.mjs` + BrasilAPI + IBGE, testados por curl.
3. Tela 1 com busca de CNPJ ao vivo.
4. Querido Diário + rota `/api/explicar` com fallback cacheado.
5. Dossiê com os sinais, a evidência do diário e o painel de fontes.
6. DataJud por razão social.
7. Clima e BCB.
8. Gráfico SVG com anotações.
9. Só depois: polimento visual.

Corte seguro na etapa 5: ali já existe demo com três fontes públicas reais,
extração por LLM sobre documento oficial e dossiê completo. Etapas 6 a 8 são
ganho marginal decrescente. Se o relógio apertar, elas caem como simulado e o
painel continua coerente, que é exatamente o motivo do contrato único.

## Não esqueça

`.env.local` no `.gitignore` antes do primeiro commit.
