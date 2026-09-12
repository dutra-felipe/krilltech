# Krill Radar
### Sistema Inteligente de Prevenção à Inadimplência e Análise de Risco de Crédito no Agronegócio
**Hackathon PMI-DF 2026 — Empresa Parceira: Krill Tech**

---

## 1. Problema & Diagnóstico

O agronegócio brasileiro atravessa um ciclo de reestruturação financeira sem precedentes. Três fatores combinados elevaram drasticamente o risco de crédito no setor:

- **Marco Legal (Lei nº 14.112/2020):** facilitou a extensão da Recuperação Judicial (RJ) ao produtor rural pessoa física, provocando uma escalada nos pedidos formais de RJ no campo.
- **Pressão de margens e quebra de safra:** instabilidades climáticas (El Niño/La Niña), custos elevados de insumos e queda nas cotações de commodities (soja, milho) estrangularam a liquidez de produtores.
- **Efeito cascata na cadeia produtiva:** a inadimplência do produtor rural contamina progressivamente distribuidores, tradings, indústrias de equipamentos e fornecedores de tecnologia — como a Krill Tech.

**A dor específica da Krill Tech:** quando um cliente entra em RJ ou se torna inadimplente, o fluxo de caixa da empresa é severamente comprometido e a recuperação do capital investido é lenta e complexa. Hoje esse risco é identificado tarde demais — geralmente só quando o calote já ocorreu ou o pedido de RJ já foi protocolado.

---

## 2. Público-Alvo / Beneficiários

- **Direto:** Krill Tech — equipe de crédito e comercial, responsável por decidir limites, prazos e condições de venda a prazo para clientes do agronegócio.
- **Indireto (fase de expansão):** bancos, seguradoras e cooperativas do agronegócio que enfrentam o mesmo problema de due diligence e monitoramento de risco (ver Seção 6 — Arquitetura de Negócios).
- **Beneficiário final:** o próprio produtor rural, que passa a ter acesso a alertas preventivos e alternativas de renegociação antes de entrar em situação de inadimplência irreversível.

---

## 3. Lógica de Funcionamento da Solução

O Krill Radar segue uma arquitetura de 6 etapas — as 4 sugeridas pelo desafio (Seção 6 do documento de desafio) mais 2 camadas de diferencial que transformam o sistema de uma ferramenta de diagnóstico em uma ferramenta de decisão de negócio:

1. **Agente Coletor & Parser (RAG / Data Ingestion):** recebe CNPJ/CPF do cliente e consulta bases públicas (Receita Federal/CNPJ Abertos, DataJud/CNJ, SICAR/IBAMA, PGFN/TST/CRF-FGTS), fazendo parsing de diários oficiais e certidões.
2. **Agente de Risco Agro & Climático:** cruza a localização do imóvel (via CAR) com zoneamento agrícola (ZARC) e histórico de quebra de safra da região (Conab/MAPA/INMET).
3. **Motor de Decisão & Scoring (Predictive ML):** calcula a probabilidade de inadimplência (PD) e o risco de RJ em horizontes de 6, 12 e 24 meses, gerando um score de 0 a 1000.
4. **Agente de Ação Recomendada** *(diferencial 1)*: em vez de apenas classificar o risco, cruza o motivo do score com um catálogo de instrumentos de mitigação e sugere a ação concreta — renegociação preventiva de prazo, conversão parcial para operação de barter, exigência de seguro paramétrico climático, ou reforço de garantia (de penhor para alienação fiduciária) antes de ampliar o limite de crédito.
5. **Simulador de Stress de Portfólio** *(diferencial 2)*: aplica choques hipotéticos (queda de X% no preço da soja, quebra de safra por El Niño numa região) sobre toda a carteira de clientes da Krill Tech, mostrando quantos clientes migrariam de rating, qual seria a exposição financeira agregada, e quais ações de mitigação (do Agente de Ação, item 4) reduziriam essa exposição.
6. **Agente Sintetizador & Gerador de Relatórios:** compila os achados técnicos das etapas anteriores em um Relatório Padronizado de Risco de Crédito, em linguagem natural, destinado ao tomador de decisão da Krill Tech.

**Por que isso é um diferencial:** o fluxo sugerido no desafio (etapas 1–3 e 6) resolve "qual é o risco". Os diferenciais (4 e 5) respondem "o que eu faço com esse risco" — no nível do cliente individual (ação recomendada) e no nível da carteira inteira (simulador de stress), aproximando a Krill Tech de uma lógica de gestão de risco como a de uma seguradora, não apenas de um sistema de alerta.

---

## 4. Score & Classificação de Rating

Escala de 0 a 1000, associada a rating de A (Baixo Risco) a D (Risco Crítico / Alerta de RJ), calculada a partir de:

- Probabilidade de inadimplência (PD) em 6, 12 e 24 meses
- Indicadores cadastrais e societários (QSA, capital social, tempo de atividade)
- Indicadores processuais e jurídicos (execuções, protestos, distribuição de RJ)
- Indicadores agroclimáticos (produtividade regional, risco climático da cultura)
- Indicadores fiscais e trabalhistas (CNDs, execuções fiscais, passivos trabalhistas)

---

## 5. Matriz de Red Flags

Principais sinais de perigo monitorados continuamente:

- Pedido de Recuperação Judicial (RJ) distribuído
- Aumento expressivo de protestos de duplicatas
- Embargos ambientais ou irregularidade no CAR
- Inadimplência técnica (violação de índices contratuais antes do atraso de pagamento)
- Execuções fiscais federais ou passivos trabalhistas com trânsito em julgado
- Quebra de safra na região/cultura do cliente

---

## 6. Recomendação de Decisão Operacional

O relatório final não entrega apenas o score — entrega uma recomendação acionável:

- **Risco baixo (A/B):** manutenção ou ampliação de limite de crédito
- **Risco moderado (B/C) com inadimplência técnica detectada:** renegociação preventiva de prazo ou reforço de garantia
- **Risco concentrado em fator climático:** sugestão de conversão parcial para barter ou exigência de seguro paramétrico
- **Risco crítico (D) / alerta de RJ:** redução de limite, exigência de garantia real (alienação fiduciária) e sinalização para acompanhamento jurídico

---

## 7. Monitoramento Contínuo (Early Warning System)

O sistema roda em modo contínuo, não apenas na triagem inicial: novos processos judiciais, protestos ou eventos climáticos disparam recálculo automático do score e, quando relevante, disparam também novo ciclo do Agente de Ação Recomendada — mantendo a carteira sempre atualizada sem necessidade de nova consulta manual.

---

## 8. Arquitetura de Negócios & Custos

**Modelo de sustentação:**
- Fase 1 (interna): ferramenta de uso exclusivo da Krill Tech para sua própria carteira de clientes.
- Fase 2 (produto B2B2B): o Krill Radar evolui para um produto licenciável a bancos, seguradoras e cooperativas do agronegócio que enfrentam o mesmo problema de due diligence — transformando um custo de compliance em uma nova fonte de receita para a Krill Tech.

**Principais custos:**
- Consumo de APIs do ecossistema watsonx (watsonx.ai, Orchestrate, agentes Bob) por chamada
- Infraestrutura de ingestão e armazenamento de dados públicos
- Retraining periódico do modelo de scoring
- Manutenção do simulador de stress (atualização de cenários macro e climáticos)

---

## 9. Premissas, Restrições e Riscos

**Premissas:**
- Dados públicos (Receita Federal, DataJud, SICAR/IBAMA, PGFN/TST, Conab/MAPA/INMET) disponíveis e atualizados
- Krill Tech possui base de clientes ativa e disposta a monitoramento contínuo
- Ferramentas do ecossistema IBM acessíveis à equipe

**Restrições:**
- Prazo do hackathon (1 dia); não é exigida implementação funcional em código
- Pitch limitado a 3 minutos perante a banca avaliadora
- Dependência da disponibilidade e qualidade das bases públicas

**Riscos:**
- Dados públicos desatualizados ou incompletos, gerando falso positivo/negativo no score
- Resistência do cliente a ser monitorado continuamente
- Dependência do ecossistema IBM (watsonx) para operação em produção

---

## 10. Próximos Passos

1. Validar o modelo de scoring com uma amostra real da carteira da Krill Tech (MVP)
2. Rodar piloto controlado do Agente de Ação Recomendada em um subconjunto de clientes
3. Validar o Simulador de Stress de Portfólio com um cenário histórico real (ex.: safra de referência com quebra conhecida) para calibrar a exposição agregada
4. Estruturar o modelo comercial de licenciamento (Fase 2) para bancos/seguradoras/cooperativas parceiras
