# O que é mockado, o que é chamada de API, o que é cálculo local

Krill Radar mistura três tipos de coisa, e é fácil confundir "simulado" com
"não implementado". Esta tabela existe pra não deixar isso passar batido no
pitch.

## 1. Fontes de dado (`fontes/*.mjs`) — cada uma é UMA das três

| Fonte | Tipo | Observação |
|---|---|---|
| BrasilAPI / Receita Federal | Chamada de API real | Sem chave, sem autenticação |
| IBGE (município → código) | Chamada de API real | Sem chave |
| Querido Diário | Chamada de API real | Texto de diário oficial de verdade, com link pro PDF |
| DataJud / CNJ | Chamada de API real | Requer `DATAJUD_API_KEY` (chave pública, na wiki do CNJ) |
| Clima (INMET → Open-Meteo) | Chamada de API real | Fallback automático — os dois são gratuitos |
| Banco Central / SGS | Chamada de API real | Sem chave |
| Base interna Krill Tech (comportamento) | **Mockado** | Dado proprietário, sem API pública — simulado por definição |
| `limiteCredito` (usado só no simulador de estresse) | **Mockado** | Mesmo motivo — dado interno da Krill Tech |
| SICAR/CAR, PGFN Dívida Ativa, CNDT/TST, CRF-FGTS, ZARC | **Fora de alcance programático** | Sem API pública viável — declarado na tela, nunca escondido |

Toda fonte real também pode virar `indisponivel` em tempo de execução (rede
caiu, rate limit, chave ausente) — isso não é mock, é o contrato de falha
graciosa descrito no brief técnico. `status` na resposta de cada fonte diz
a verdade sempre: `ao_vivo`, `simulado` ou `indisponivel`.

## 2. Camadas de cálculo (`motor.js`) — nenhuma delas é fonte nem chamada de API

Rodam 100% localmente, em cima dos sinais que as fontes acima já trouxeram
(sejam eles ao vivo ou simulados — a camada de cálculo não diferencia):

- **Score, rating, tendência, confiança** — já existiam, determinísticos e auditáveis.
- **PD estimada (6/12/24 meses)** — *novo*. Curva determinística a partir do
  score e da velocidade de deterioração. `calibrado: false` em todo lugar
  que aparece, inclusive na API. **Não é** a "PD calibrada" que o edital
  descreve na Seção 6 — calibração real exige histórico de inadimplência da
  Krill Tech, que o protótipo não tem. Rotulada na UI com o selo
  "estimativa — não calibrada" (mesmo tratamento estrutural usado pra
  distinguir fonte simulada de fonte ao vivo).
- **Ações recomendadas** — *novo*. Cruza qual sinal pesou mais no score com
  um catálogo fixo de instrumentos de mitigação (reforço de garantia,
  renegociação preventiva, seguro paramétrico/barter, diligência
  societária, etc.). É lógica de decisão sobre dado já coletado, não uma
  fonte nova.
- **Simulador de estresse de portfólio** — *novo*, Tela 3. Aplica um choque
  hipotético (queda de preço de commodity ou quebra de safra regional)
  sobre a carteira inteira e recalcula rating + exposição por cliente. Usa
  `limiteCredito` mockado — a tela diz isso explicitamente. Não é previsão:
  é dimensionamento de exposição sob cenário adverso.

## 3. O que o documento de solução descreve e o protótipo não implementa

- Integração real com watsonx.ai Orchestrate / agentes Bob — o
  `/api/explicar` usa a API do Claude, com endpoint isolado numa função
  única pra trocar em uma linha se for integrar watsonx de fato.
- Retraining periódico de modelo de ML — não há modelo de ML aqui; o motor
  é regra determinística + heurística de tendência, auditável por design,
  não uma caixa-preta treinada.
- Banco de dados, login, deploy, modelo comercial B2B2B — fora de escopo do
  hackathon, exatamente como o brief técnico original já dizia antes desta
  rodada.

Isso é intencional, não corte por falta de tempo: uma PD calibrada de
verdade, montada sem dado real de inadimplência, seria número inventado com
roupagem de estatística — o oposto do que o projeto inteiro se propõe a
fazer. O rótulo `calibrado: false` existe pra isso nunca passar despercebido,
nem no código nem no pitch.
