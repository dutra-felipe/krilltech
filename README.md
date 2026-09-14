# 🌾 Krill Radar

### Sistema Inteligente de Prevenção à Inadimplência e Análise de Risco de Crédito no Agronegócio

> Projeto desenvolvido durante o **Hackathon PMI-DF 2026**, a partir de um desafio proposto pela **Krill Tech**.

🥈 **2º Lugar — Hackathon PMI-DF 2026**

---

## 📌 Sobre o projeto

O **Krill Radar** é uma solução desenvolvida para apoiar a análise e a tomada de decisão relacionada ao **risco de crédito no agronegócio**.

O projeto surgiu a partir de um desafio apresentado durante o Hackathon PMI-DF, no qual nossa equipe trabalhou na construção de uma solução integrada envolvendo:

- coleta e integração de dados;
- análise de risco;
- modelos e técnicas de Inteligência Artificial;
- análise preditiva;
- monitoramento de indicadores;
- experiência do usuário (UX);
- estratégia de negócio;
- apoio à tomada de decisão.

Além da concepção estratégica da solução, foi desenvolvido um **protótipo funcional do Krill Radar**, responsável por consolidar informações de diferentes fontes, calcular indicadores de risco e apresentar os resultados de maneira visual e acionável.

O projeto foi apresentado para a banca avaliadora do Hackathon PMI-DF e conquistou o **2º lugar da competição**. 🥈

---

## 👥 Time

O projeto foi desenvolvido de forma colaborativa durante o Hackathon PMI-DF por:

- **Yuri Oliveira**
- **Giuseppe** — [@gparrini](https://github.com/gparrini)
- **Pedro Dutra** — [@dutrapedro06](https://github.com/dutrapedro06)
- **Felipe Dutra** — [@dutra-felipe](https://github.com/dutra-felipe)

O trabalho envolveu colaboração entre os integrantes nas etapas de **ideação, análise do problema, construção do Project Model Canvas, estratégia de negócio, experiência do usuário, arquitetura da solução, desenvolvimento do protótipo e preparação do pitch**.

---

## 🎯 Problema

Empresas que atuam no agronegócio estão expostas ao risco financeiro de seus clientes, especialmente em operações realizadas a prazo.

Problemas como:

- inadimplência;
- recuperação judicial;
- protestos e execuções;
- irregularidades cadastrais;
- dificuldades financeiras;
- alterações societárias;
- eventos climáticos;
- quebra de safra;
- variações nas condições econômicas;

podem comprometer a capacidade de pagamento de produtores e empresas do setor.

Muitas vezes, porém, esses sinais são percebidos somente quando o problema já ocorreu.

O **Krill Radar** foi pensado para antecipar esses sinais.

---

## 💡 A solução

A proposta do Krill Radar é funcionar como um sistema de **Early Warning**, reunindo diferentes sinais de risco para apoiar decisões de crédito.

A solução foi estruturada para responder não apenas:

> **“Qual é o risco deste cliente?”**

mas também:

> **“O que podemos fazer diante desse risco?”**

Para isso, o sistema combina coleta de dados, regras de negócio, scoring, análise de tendências, estimativas de probabilidade de inadimplência e recomendações de ações.

---

## ⚙️ Como funciona

O fluxo conceitual da solução é composto por diferentes etapas:

### 1. Coleta e integração de dados

O sistema consulta ou considera informações provenientes de diferentes fontes, incluindo dados:

- cadastrais;
- jurídicos;
- fiscais;
- econômicos;
- climáticos;
- comportamentais.

### 2. Identificação de sinais de risco

As informações coletadas são transformadas em sinais que podem indicar deterioração da situação do cliente.

Entre eles estão situações como:

- recuperação judicial;
- execuções e dívidas;
- protestos;
- irregularidades cadastrais;
- alterações societárias;
- atrasos recorrentes;
- utilização elevada de limite;
- eventos climáticos adversos.

### 3. Motor de decisão e scoring

Os sinais identificados são processados por um motor de decisão responsável por gerar:

- score de risco;
- rating;
- tendência;
- nível de confiança;
- estimativas de probabilidade de inadimplência.

O protótipo utiliza regras determinísticas e auditáveis para permitir compreender quais fatores influenciaram cada resultado.

### 4. Ações recomendadas

Além de identificar o risco, o sistema relaciona os principais sinais encontrados com possíveis estratégias de mitigação.

Entre as ações sugeridas podem estar:

- renegociação preventiva;
- redução de prazo;
- revisão de limite;
- reforço de garantias;
- diligência societária;
- seguro paramétrico;
- operações de barter;
- acompanhamento jurídico.

### 5. Simulação de stress

O protótipo também possui um **Simulador de Stress de Portfólio**.

Ele permite aplicar cenários hipotéticos sobre a carteira, como:

- queda no preço de commodities;
- quebra de safra;
- eventos climáticos adversos.

A partir disso, o sistema recalcula o risco dos clientes e estima o impacto do cenário sobre a exposição da carteira.

### 6. Dossiê de risco

Por fim, as informações são consolidadas em um dossiê que apresenta os principais indicadores, sinais detectados, fontes utilizadas e ações recomendadas para apoiar a tomada de decisão.

---

## 🧠 Inteligência Artificial

A Inteligência Artificial foi incorporada à proposta como uma camada de apoio à interpretação e síntese das informações.

Dentro da arquitetura idealizada para evolução do projeto, agentes inteligentes podem atuar em diferentes etapas, como:

**Agente Coletor → Agente de Risco → Motor de Decisão → Agente de Ação → Simulador de Stress → Agente Sintetizador**

No protótipo desenvolvido durante o hackathon, parte da inteligência é implementada por regras determinísticas e cálculos locais, enquanto funcionalidades específicas utilizam LLM para interpretação e geração de explicações.

Essa separação permite manter o resultado principal do score **auditável e explicável**, evitando transformar a decisão de crédito em uma caixa-preta.

---

## 🌐 Fontes de dados

O protótipo foi estruturado para trabalhar com diferentes fontes públicas e internas.

Entre as integrações utilizadas ou consideradas estão:

- BrasilAPI / Receita Federal;
- IBGE;
- Querido Diário;
- DataJud / CNJ;
- dados climáticos;
- Banco Central;
- dados internos da Krill Tech.

Algumas informações internas utilizadas na demonstração são **mockadas**, pois dependem de dados proprietários que não estavam disponíveis durante o hackathon.

O sistema diferencia explicitamente informações **ao vivo**, **simuladas** e **indisponíveis**, mantendo transparência sobre a origem dos dados apresentados.

---

## 🖥️ Protótipo

O protótipo desenvolvido demonstra diferentes partes da experiência do Krill Radar.

### Carteira de clientes

Visualização e priorização dos clientes que demandam maior atenção do analista.

### Dossiê individual

Análise detalhada de um cliente, reunindo score, rating, histórico, sinais encontrados e respectivas fontes.

### Probabilidade de inadimplência

Estimativas para horizontes de:

- 6 meses;
- 12 meses;
- 24 meses.

No protótipo, essas probabilidades são estimativas determinísticas e **não representam um modelo estatisticamente calibrado**, pois uma calibração real dependeria do histórico de inadimplência da Krill Tech.

### Ações recomendadas

Sugestões de medidas de mitigação de acordo com os fatores que mais impactaram o risco.

### Simulador de Stress

Permite analisar como eventos adversos poderiam afetar a carteira de clientes.

---

## 🏗️ Arquitetura do protótipo

De forma simplificada, a aplicação é organizada da seguinte maneira:

```text
                         KRILL RADAR

                  ┌──────────────────┐
                  │    index.html    │
                  │ Interface / UX   │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │    server.mjs    │
                  │   Orquestrador   │
                  └────────┬─────────┘
                           │
             ┌─────────────┼─────────────┐
             │             │             │
             ▼             ▼             ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │ fontes/  │   │ dados.js │   │ motor.js │
       │          │   │          │   │          │
       │ APIs e   │   │ Dados do │   │ Scoring  │
       │ fontes   │   │ protótipo│   │ Risco    │
       │ externas │   │          │   │ Stress   │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            └──────────────┼──────────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ Resultados       │
                  │                  │
                  │ Score / Rating   │
                  │ Dossiê           │
                  │ Recomendações    │
                  │ Stress Testing   │
                  └──────────────────┘
```

---

## 🛠️ Tecnologias

O protótipo utiliza principalmente:

- **JavaScript**
- **HTML**
- **CSS**
- **Node.js**
- **APIs REST**
- **LLMs**
- **dados públicos governamentais**
- **regras determinísticas de scoring**
- **simulação de cenários**

A arquitetura também foi pensada considerando a possibilidade de evolução e integração com ferramentas de IA e orquestração de agentes.

---

## 📂 Estrutura do repositório

```text
krilltech/
│
├── Apresentacao/
│   └── Slides-Apresentacao.pdf
│
├── assets/
│   └── fonts/
│
├── fontes/
│   └── integrações e fontes de dados
│
├── .gitignore
├── CLAUDE.md
├── dados.js
├── index.html
├── Krill_Radar_Documento_Solucao.md
├── MOCKADO_VS_API.md
├── motor.js
├── README.md
└── server.mjs
```

### Principais arquivos

**`index.html`**  
Interface principal e experiência visual do protótipo.

**`server.mjs`**  
Servidor e camada de orquestração das APIs, fontes de dados e rotas utilizadas pela aplicação.

**`motor.js`**  
Motor responsável pelas regras de scoring, classificação de risco, estimativas de probabilidade de inadimplência, recomendações e simulação de stress.

**`dados.js`**  
Dados utilizados pelo protótipo e informações necessárias para composição das demonstrações.

**`fontes/`**  
Módulos responsáveis pelas integrações com as diferentes fontes externas utilizadas pelo sistema.

**`assets/`**  
Recursos utilizados pela interface da aplicação, incluindo as fontes tipográficas.

**`Krill_Radar_Documento_Solucao.md`**  
Documento que descreve a concepção, arquitetura e funcionamento da solução.

**`MOCKADO_VS_API.md`**  
Documentação que diferencia dados reais, chamadas de APIs, informações simuladas e cálculos executados localmente.

**`Apresentacao/Slides-Apresentacao.pdf`**  
Slides utilizados pela equipe durante o pitch da solução no Hackathon PMI-DF 2026.

---

## 🎤 Apresentação

A solução foi apresentada por meio de um pitch para a banca avaliadora do **Hackathon PMI-DF 2026**.

A apresentação abordou:

- contexto e problema;
- impacto da inadimplência no agronegócio;
- proposta do Krill Radar;
- arquitetura da solução;
- uso de dados e Inteligência Artificial;
- experiência do usuário;
- estratégia de negócio;
- possibilidades de evolução da solução.

### 📑 Material da apresentação

Os slides utilizados durante o pitch estão disponíveis no próprio repositório:

👉 **[Visualizar slides da apresentação](Apresentacao/Slides-Apresentacao.pdf)**

---

## 🥈 Resultado

O **Krill Radar conquistou o 2º lugar no Hackathon PMI-DF 2026**.

O resultado reconheceu uma proposta que buscou integrar diferentes áreas em uma única solução:

**Tecnologia + Dados + Inteligência Artificial + UX + Gestão de Projetos + Estratégia de Negócio**

Mais do que desenvolver um protótipo, o objetivo da equipe foi pensar em uma solução tecnicamente possível, explicável e capaz de gerar valor para um problema real do agronegócio.

---

## 🚀 Possíveis próximos passos

A evolução do Krill Radar pode envolver:

1. integração com dados reais da carteira da Krill Tech;
2. calibração do modelo de probabilidade de inadimplência;
3. validação do scoring utilizando casos históricos;
4. expansão das fontes de dados;
5. monitoramento contínuo de clientes;
6. evolução do sistema de alertas;
7. integração com ecossistemas de IA e agentes;
8. implantação de banco de dados e autenticação;
9. deploy da plataforma;
10. validação do modelo comercial da solução.

A arquitetura proposta também permite que, futuramente, a solução seja expandida para outras organizações que enfrentam problemas semelhantes de análise e monitoramento de risco no agronegócio.

---

## 📚 Documentação

Para conhecer os detalhes técnicos e conceituais do projeto, consulte:

- [Documento da Solução](Krill_Radar_Documento_Solucao.md)
- [Mockado vs API](MOCKADO_VS_API.md)
- [Slides da Apresentação](Apresentacao/Slides-Apresentacao.pdf)

---

<p align="center">
  <strong>Krill Radar</strong><br>
  Transformando sinais de risco em decisões.
</p>

<p align="center">
  🥈 2º Lugar — Hackathon PMI-DF 2026
</p>