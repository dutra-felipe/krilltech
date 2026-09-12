// dados.js — carteira de demonstração + fallbacks cacheados.
// Carregado tanto pelo server.mjs quanto pelo index.html (ESM nos dois casos).

const HOJE = new Date();

function diasAtras(n) {
  return new Date(HOJE.getTime() - n * 864e5).toISOString().slice(0, 10);
}

// Constrói a série diária de score interpolando entre pontos-chave.
// Mantém o arquivo legível sem abrir mão de 90 pontos no gráfico.
function serie(pontos) {
  const ordenado = [...pontos].sort((a, b) => b.dias - a.dias);
  const out = [];
  for (let i = 0; i < ordenado.length - 1; i++) {
    const a = ordenado[i];
    const b = ordenado[i + 1];
    const span = a.dias - b.dias;
    for (let d = 0; d < span; d++) {
      const t = d / span;
      out.push({
        data: diasAtras(a.dias - d),
        score: Math.round(a.score + (b.score - a.score) * t),
      });
    }
  }
  const ultimo = ordenado[ordenado.length - 1];
  out.push({ data: diasAtras(ultimo.dias), score: ultimo.score });
  return out;
}

export const CARTEIRA = [
  {
    id: 'cli-a',
    ficticio: true,
    nome: 'Agropecuária Vale do Sucuriú Ltda',
    cnpj: '99000001000110', // fictício — a carteira é sintética por construção
    limiteCredito: 2200000, // mockado — dado interno da Krill Tech, usado só no simulador de estresse
    cultura: 'Soja / milho safrinha',
    municipio: 'Rondonópolis',
    uf: 'MT',
    lat: -16.4708,
    lon: -54.6356,
    estacaoInmet: 'A908',
    destaque: true,
    historico: serie([
      { dias: 90, score: 792 },
      { dias: 61, score: 780 },
      { dias: 47, score: 714 },
      { dias: 33, score: 602 },
      { dias: 18, score: 511 },
      { dias: 1, score: 420 },
    ]),
    comportamento: {
      referencia: diasAtras(5),
      usoLimite: 0.94,
      usoLimiteAnterior: 0.62,
      diasAtrasoMedio: 3,
      renegociacoes12m: 0,
    },
    // Sinais de demonstração. Os que a consulta ao vivo confirmar são
    // substituídos pelos reais no orquestrador.
    sinaisDemo: [
      {
        tipo: 'execucao_fiscal',
        descricao: 'Execução fiscal distribuída, R$ 2,4 mi em tributos federais.',
        data: diasAtras(47),
        deterministico: true,
        fonte: 'PGFN / Dívida Ativa',
        simulado: true,
      },
      {
        tipo: 'protesto_duplicata',
        descricao: 'Protesto de duplicata em cartório — credor: distribuidora de fertilizantes.',
        data: diasAtras(33),
        deterministico: true,
        fonte: 'Diários de Justiça Eletrônicos',
        simulado: true,
      },
      {
        tipo: 'protesto_duplicata',
        descricao: 'Segundo protesto de duplicata, credor distinto — revenda de defensivos.',
        data: diasAtras(29),
        deterministico: true,
        fonte: 'Diários de Justiça Eletrônicos',
        simulado: true,
      },
      {
        tipo: 'deficit_hidrico',
        descricao: 'Déficit hídrico de 41% sobre a referência em janela crítica do ZARC.',
        data: diasAtras(12),
        deterministico: false,
        fonte: 'INMET / Open-Meteo',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-b',
    ficticio: true,
    nome: 'Cerrado Grãos Comércio e Representações',
    cnpj: '99000002000119',
    limiteCredito: 1450000,
    cultura: 'Algodão',
    municipio: 'Luís Eduardo Magalhães',
    uf: 'BA',
    lat: -12.0917,
    lon: -45.8006,
    historico: serie([
      { dias: 90, score: 848 },
      { dias: 45, score: 830 },
      { dias: 1, score: 662 },
    ]),
    comportamento: {
      referencia: diasAtras(6),
      usoLimite: 0.88,
      usoLimiteAnterior: 0.71,
      diasAtrasoMedio: 9,
      renegociacoes12m: 0,
    },
    sinaisDemo: [
      {
        tipo: 'uso_limite_alto',
        descricao: 'Uso do limite em 88%, acima do teto contratual de 80%.',
        data: diasAtras(20),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
      {
        tipo: 'alteracao_societaria',
        descricao: 'Entrada de novo sócio administrador há 4 meses.',
        data: diasAtras(120),
        deterministico: false,
        fonte: 'BrasilAPI / Receita Federal',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-c',
    ficticio: true,
    nome: 'Fazenda Boa Esperança Agronegócios',
    cnpj: '99000003000117',
    limiteCredito: 980000,
    cultura: 'Milho / pecuária',
    municipio: 'Rio Verde',
    uf: 'GO',
    lat: -17.7923,
    lon: -50.9198,
    historico: serie([
      { dias: 90, score: 604 },
      { dias: 40, score: 588 },
      { dias: 1, score: 512 },
    ]),
    comportamento: {
      referencia: diasAtras(4),
      usoLimite: 0.79,
      usoLimiteAnterior: 0.74,
      diasAtrasoMedio: 22,
      renegociacoes12m: 2,
    },
    sinaisDemo: [
      {
        tipo: 'atraso_recorrente',
        descricao: 'Atraso médio de 22 dias nas últimas seis faturas.',
        data: diasAtras(10),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
      {
        tipo: 'renegociacao',
        descricao: 'Duas renegociações nos últimos 12 meses.',
        data: diasAtras(80),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
      {
        tipo: 'divida_ativa',
        descricao: 'Inscrição em dívida ativa estadual.',
        data: diasAtras(55),
        deterministico: true,
        fonte: 'Querido Diário (OKBR) / Diários Oficiais',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-d',
    ficticio: true,
    nome: 'Sementes Planalto Central S.A.',
    cnpj: '99000004000115',
    limiteCredito: 610000,
    cultura: 'Sementes certificadas',
    municipio: 'Cristalina',
    uf: 'GO',
    lat: -16.7675,
    lon: -47.6136,
    historico: serie([
      { dias: 90, score: 902 },
      { dias: 1, score: 886 },
    ]),
    comportamento: {
      referencia: diasAtras(3),
      usoLimite: 0.41,
      usoLimiteAnterior: 0.38,
      diasAtrasoMedio: 0,
      renegociacoes12m: 0,
    },
    sinaisDemo: [],
  },
  {
    id: 'cli-e',
    ficticio: true,
    nome: 'Agroindustrial Rio Pardo Ltda',
    cnpj: '99000005000113',
    limiteCredito: 3100000,
    cultura: 'Cana-de-açúcar',
    municipio: 'Dourados',
    uf: 'MS',
    lat: -22.2211,
    lon: -54.8056,
    historico: serie([
      { dias: 90, score: 358 },
      { dias: 40, score: 349 },
      { dias: 1, score: 341 },
    ]),
    comportamento: {
      referencia: diasAtras(7),
      usoLimite: 0.97,
      usoLimiteAnterior: 0.95,
      diasAtrasoMedio: 48,
      renegociacoes12m: 3,
    },
    sinaisDemo: [
      {
        tipo: 'rj_distribuida',
        descricao: 'Recuperação Judicial distribuída — Stay Period em curso.',
        data: diasAtras(74),
        deterministico: true,
        fonte: 'DataJud / CNJ',
        simulado: true,
      },
      {
        tipo: 'atraso_recorrente',
        descricao: 'Atraso médio de 48 dias.',
        data: diasAtras(7),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-f',
    ficticio: true,
    nome: 'Nova Fronteira Insumos Agrícolas',
    cnpj: '99000006000111',
    limiteCredito: 870000,
    cultura: 'Revenda de insumos',
    municipio: 'Sorriso',
    uf: 'MT',
    lat: -12.5453,
    lon: -55.7114,
    historico: serie([
      { dias: 90, score: 742 },
      { dias: 30, score: 738 },
      { dias: 1, score: 726 },
    ]),
    comportamento: {
      referencia: diasAtras(5),
      usoLimite: 0.68,
      usoLimiteAnterior: 0.65,
      diasAtrasoMedio: 4,
      renegociacoes12m: 0,
    },
    sinaisDemo: [
      {
        tipo: 'alteracao_societaria',
        descricao: 'Alteração de quadro societário há 5 meses.',
        data: diasAtras(150),
        deterministico: false,
        fonte: 'BrasilAPI / Receita Federal',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-g',
    ficticio: true,
    nome: 'Cooperativa Agrícola do Oeste',
    cnpj: '99000007000118',
    limiteCredito: 1950000,
    cultura: 'Trigo / soja',
    municipio: 'Cascavel',
    uf: 'PR',
    lat: -24.9555,
    lon: -53.4552,
    historico: serie([
      { dias: 90, score: 812 },
      { dias: 25, score: 806 },
      { dias: 1, score: 774 },
    ]),
    comportamento: {
      referencia: diasAtras(4),
      usoLimite: 0.73,
      usoLimiteAnterior: 0.7,
      diasAtrasoMedio: 6,
      renegociacoes12m: 0,
    },
    sinaisDemo: [],
  },
  {
    id: 'cli-h',
    ficticio: true,
    nome: 'Terra Boa Armazéns Gerais Ltda',
    cnpj: '99000008000116',
    limiteCredito: 1120000,
    cultura: 'Armazenagem',
    municipio: 'Uberaba',
    uf: 'MG',
    lat: -19.7472,
    lon: -47.9381,
    historico: serie([
      { dias: 90, score: 688 },
      { dias: 35, score: 671 },
      { dias: 1, score: 596 },
    ]),
    comportamento: {
      referencia: diasAtras(6),
      usoLimite: 0.86,
      usoLimiteAnterior: 0.69,
      diasAtrasoMedio: 11,
      renegociacoes12m: 1,
    },
    sinaisDemo: [
      {
        tipo: 'uso_limite_alto',
        descricao: 'Uso do limite de 69% para 86% em um trimestre.',
        data: diasAtras(15),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
      {
        tipo: 'atraso_recorrente',
        descricao: 'Atraso médio de 11 dias, tendência de alta.',
        data: diasAtras(6),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-i',
    ficticio: true,
    nome: 'Pecuária São Joaquim Ltda',
    cnpj: '99000009000114',
    limiteCredito: 690000,
    cultura: 'Bovinocultura de corte',
    municipio: 'Barreiras',
    uf: 'BA',
    lat: -12.1528,
    lon: -44.99,
    historico: serie([
      { dias: 90, score: 559 },
      { dias: 45, score: 563 },
      { dias: 1, score: 571 },
    ]),
    comportamento: {
      referencia: diasAtras(8),
      usoLimite: 0.58,
      usoLimiteAnterior: 0.67,
      diasAtrasoMedio: 3,
      renegociacoes12m: 1,
    },
    sinaisDemo: [
      {
        tipo: 'embargo_ambiental',
        descricao: 'Auto de infração ambiental publicado em diário oficial.',
        data: diasAtras(210),
        deterministico: true,
        fonte: 'Querido Diário (OKBR) / Diários Oficiais',
        simulado: true,
      },
      {
        tipo: 'renegociacao',
        descricao: 'Uma renegociação, já adimplente há 4 meses.',
        data: diasAtras(130),
        deterministico: false,
        fonte: 'Base interna Krill Tech',
        simulado: true,
      },
    ],
  },
  {
    id: 'cli-j',
    ficticio: true,
    nome: 'Irrigação Chapadão Serviços Agrícolas',
    cnpj: '99000010000112',
    limiteCredito: 540000,
    cultura: 'Serviços / irrigação',
    municipio: 'Chapadão do Sul',
    uf: 'MS',
    lat: -18.7889,
    lon: -52.6264,
    historico: serie([
      { dias: 90, score: 776 },
      { dias: 20, score: 769 },
      { dias: 1, score: 751 },
    ]),
    comportamento: {
      referencia: diasAtras(9),
      usoLimite: 0.64,
      usoLimiteAnterior: 0.61,
      diasAtrasoMedio: 2,
      renegociacoes12m: 0,
    },
    sinaisDemo: [],
  },
];

// Explicações pré-geradas. Usadas quando a rota /api/explicar falha.
// Sem isso a demo morre ao vivo se o wifi cair.
export const EXPLICACOES_CACHE = {
  'cli-a':
    'O score caiu 360 pontos em 60 dias, de 780 para 420, e o rating passou de B para C — e esse cliente não tem histórico de atraso nem renegociação. Cinco sinais de três fontes distintas convergem: execução fiscal de R$ 2,4 mi (PGFN), dois protestos de duplicata de credores distintos (DJE), salto no uso do limite de 62% para 94% (base interna) e déficit hídrico de 41% em janela crítica do ZARC. A combinação de fato fiscal objetivo com aperto de caixa num pagador até aqui pontual é o padrão que antecede pedido de RJ. Congele o limite, exija garantia real antes de novo embarque e reduza o prazo para 30 dias enquanto a janela de execução está aberta.',
  'cli-e':
    'Recuperação Judicial já distribuída há 74 dias. O Stay Period está em curso, o que significa que a Krill Tech está legalmente impedida de executar garantias ou protestar até o fim do prazo. Não há ação de cobrança disponível agora. Suspenda qualquer venda a prazo, habilite o crédito no processo dentro do prazo legal e verifique se algum crédito é extraconcursal por alienação fiduciária.',
  generico:
    'Os sinais detectados foram cruzados e o score reflete a soma das penalidades, com o clima neutralizado quando aparece isolado. Consulte o painel de fontes para ver o que está ao vivo e o que está simulado antes de decidir.',
};

export const FONTES_CACHE = [
  { fonte: 'BrasilAPI / Receita Federal', status: 'simulado', defasagemDias: 7, sinais: [], nota: 'Fallback offline.' },
  { fonte: 'Querido Diário (OKBR) / Diários Oficiais', status: 'simulado', defasagemDias: 12, sinais: [], nota: 'Fallback offline.' },
  { fonte: 'DataJud / CNJ', status: 'simulado', defasagemDias: 2, sinais: [], nota: 'Fallback offline.' },
  { fonte: 'INMET / Open-Meteo', status: 'simulado', defasagemDias: 3, sinais: [], nota: 'Fallback offline.' },
  { fonte: 'Banco Central / SGS', status: 'simulado', defasagemDias: 1, sinais: [], nota: 'Fallback offline.' },
  { fonte: 'Base interna Krill Tech', status: 'simulado', defasagemDias: 0, sinais: [], nota: 'Dado proprietário — simulado por definição.' },
];

export const FONTES_INDISPONIVEIS_POR_DESIGN = [
  { fonte: 'SICAR / CAR', motivo: 'Sem API pública. Consulta protegida por captcha.' },
  { fonte: 'PGFN Dívida Ativa', motivo: 'Publicada como dump CSV trimestral de milhões de linhas.' },
  { fonte: 'CNDT / TST e CRF-FGTS', motivo: 'Emissão de certidão protegida por captcha.' },
  { fonte: 'ZARC / MAPA', motivo: 'Sem endpoint estável para consulta programática.' },
];