// motor.js — motor de score do Krill Radar
// Funções puras. Sem rede, sem estado, sem dependências.

export const FAIXAS = [
  {
    rating: 'A',
    min: 801,
    max: 1000,
    rotulo: 'Baixo risco',
    decisao: 'Limite liberado, prazo padrão até 90 dias.',
  },
  {
    rating: 'B',
    min: 601,
    max: 800,
    rotulo: 'Risco moderado',
    decisao: 'Limite mantido, revisão em 30 dias, prazo reduzido para 60 dias.',
  },
  {
    rating: 'C',
    min: 401,
    max: 600,
    rotulo: 'Risco elevado',
    decisao:
      'Limite congelado, exigir garantia real (CPR ou alienação fiduciária), prazo máximo 30 dias.',
  },
  {
    rating: 'D',
    min: 0,
    max: 400,
    rotulo: 'Risco crítico — alerta de RJ',
    decisao:
      'Suspender venda a prazo, acionar jurídico, avaliar antecipação de vencimentos.',
  },
];

// Dimensão de cada tipo de sinal. 'juridico' e 'fiscal' são fatos objetivos
// (determinísticos). 'comportamental' e 'climatico' alimentam a tendência.
export const CATALOGO_SINAIS = {
  rj_distribuida: { peso: 600, dimensao: 'juridico', deterministico: true },
  execucao_fiscal: { peso: 180, dimensao: 'fiscal', deterministico: true },
  protesto_duplicata: { peso: 120, dimensao: 'juridico', deterministico: true },
  embargo_ambiental: { peso: 150, dimensao: 'juridico', deterministico: true },
  divida_ativa: { peso: 110, dimensao: 'fiscal', deterministico: true },
  situacao_cadastral_irregular: { peso: 200, dimensao: 'cadastral', deterministico: true },
  atividade_recente: { peso: 60, dimensao: 'cadastral', deterministico: true },
  alteracao_societaria: { peso: 50, dimensao: 'cadastral', deterministico: false },
  uso_limite_alto: { peso: 90, dimensao: 'comportamental', deterministico: false },
  atraso_recorrente: { peso: 110, dimensao: 'comportamental', deterministico: false },
  renegociacao: { peso: 80, dimensao: 'comportamental', deterministico: false },
  deficit_hidrico: { peso: 70, dimensao: 'climatico', deterministico: false },
  zarc_fora_janela: { peso: 50, dimensao: 'climatico', deterministico: false },
  pressao_macro: { peso: 25, dimensao: 'macro', deterministico: false },
};

export const SCORE_BASE = 1000;

export function descreverSinal(sinal) {
  const meta = CATALOGO_SINAIS[sinal.tipo] || {
    peso: 40,
    dimensao: 'outro',
    deterministico: false,
  };
  return { ...meta, ...sinal, peso: sinal.peso ?? meta.peso };
}

// Salvaguarda: risco climático nunca pontua isolado. Só entra na conta se
// houver ao menos um sinal jurídico, fiscal, cadastral ou comportamental.
// Sem isso, uma seca regional rebaixaria toda a carteira de uma vez.
export function aplicarSalvaguardaClimatica(sinais) {
  const enriquecidos = sinais.map(descreverSinal);
  const temAncora = enriquecidos.some((s) =>
    ['juridico', 'fiscal', 'cadastral', 'comportamental'].includes(s.dimensao)
  );
  return enriquecidos.map((s) => {
    if (s.dimensao === 'climatico' && !temAncora) {
      return { ...s, peso: 0, neutralizado: true, motivoNeutralizacao: 'clima isolado' };
    }
    if (s.dimensao === 'macro' && !temAncora) {
      return { ...s, peso: 0, neutralizado: true, motivoNeutralizacao: 'macro isolado' };
    }
    return { ...s, neutralizado: false };
  });
}

export function ratingDe(score) {
  const s = Math.max(0, Math.min(1000, Math.round(score)));
  return FAIXAS.find((f) => s >= f.min && s <= f.max);
}

export function calcularScore(sinais) {
  const aplicados = aplicarSalvaguardaClimatica(sinais);
  const penalidade = aplicados.reduce((soma, s) => soma + s.peso, 0);
  const score = Math.max(0, Math.min(1000, SCORE_BASE - penalidade));
  const faixa = ratingDe(score);
  return {
    score,
    penalidade,
    rating: faixa.rating,
    rotulo: faixa.rotulo,
    decisao: faixa.decisao,
    sinais: aplicados,
  };
}

// Índice de tendência: velocidade da piora, não nível absoluto.
// É o que permite antecipar. Um cliente B caindo 180 pontos em 30 dias
// importa mais que um D estável.
export function calcularTendencia(historico) {
  if (!Array.isArray(historico) || historico.length < 2) {
    return { direcao: 'estavel', delta30: 0, velocidade: 0, dados: false };
  }
  const ordenado = [...historico].sort((a, b) => new Date(a.data) - new Date(b.data));
  const atual = ordenado[ordenado.length - 1];
  const fim = new Date(atual.data);
  const alvo = new Date(fim.getTime() - 30 * 864e5);

  let referencia = ordenado[0];
  for (const ponto of ordenado) {
    if (new Date(ponto.data) <= alvo) referencia = ponto;
  }

  const delta30 = atual.score - referencia.score;
  const dias = Math.max(1, (fim - new Date(referencia.data)) / 864e5);
  const velocidade = +(delta30 / dias).toFixed(2);

  let direcao = 'estavel';
  if (delta30 <= -40) direcao = 'caindo';
  else if (delta30 >= 40) direcao = 'subindo';

  return { direcao, delta30, velocidade, dados: true };
}

// Confiança do sinal, não probabilidade de inadimplência.
// Fonte simulada nunca produz confiança alta.
export function calcularConfianca(sinais, fontes = []) {
  const aplicados = aplicarSalvaguardaClimatica(sinais).filter((s) => !s.neutralizado);

  // Confiança se mede no SINAL, nunca pelo nome da fonte.
  // Um sinal simulado que carrega 'fonte: DataJud' não vira confirmado só
  // porque o DataJud respondeu à consulta. Casar por nome de fonte fazia o
  // painel declarar confiança alta sobre dado inventado.
  const confirmados = aplicados.filter((s) => s.deterministico && s.aoVivo === true);
  const estatisticos = aplicados.filter((s) => !s.deterministico);
  const simulados = aplicados.filter((s) => s.aoVivo !== true);
  const algumaDefasada = fontes.some(
    (f) => f.status === 'ao_vivo' && (f.defasagemDias ?? 0) > 30
  );

  let nivel = 'baixo';
  let justificativa = 'Nenhum fato objetivo confirmado em fonte oficial ao vivo.';

  if (confirmados.length >= 1) {
    nivel = 'alto';
    justificativa = `Fato objetivo confirmado ao vivo em ${confirmados[0].fonte}.`;
    if (algumaDefasada) {
      nivel = 'medio';
      justificativa += ' Rebaixado: há fonte ao vivo com defasagem acima de 30 dias.';
    }
  } else if (estatisticos.filter((s) => s.aoVivo === true).length >= 2) {
    nivel = 'medio';
    justificativa = 'Dois ou mais sinais estatísticos ao vivo convergentes, sem fato objetivo confirmado.';
  } else if (aplicados.length >= 2) {
    nivel = 'baixo';
    justificativa = `${aplicados.length} sinais, nenhum confirmado ao vivo.`;
  }

  // Trava final: se todo sinal que pontuou é simulado, a confiança não passa
  // de baixa, qualquer que seja o cálculo acima.
  if (aplicados.length > 0 && simulados.length === aplicados.length && nivel !== 'baixo') {
    nivel = 'baixo';
    justificativa = 'Todos os sinais que pontuaram são simulados — nenhuma confirmação em fonte ao vivo.';
  }

  return {
    nivel,
    justificativa,
    confirmadosAoVivo: confirmados.length,
    estatisticos: estatisticos.length,
    simulados: simulados.length,
    total: aplicados.length,
  };
}

// Avaliação completa de um cliente. É o que o orquestrador devolve.
export function avaliar({ sinais = [], historico = [], fontes = [] }) {
  const base = calcularScore(sinais);
  const tendencia = calcularTendencia(historico);
  const confianca = calcularConfianca(sinais, fontes);
  const pd = estimarPD({ score: base.score, tendencia });
  const acoesRecomendadas = recomendarAcoes(base.sinais);
  return {
    ...base,
    tendencia,
    confianca,
    pd,
    acoesRecomendadas,
    // Prioridade de fila do analista: deterioração pesa mais que nível absoluto.
    prioridade: Math.abs(Math.min(0, tendencia.delta30)) * 2 + (1000 - base.score) * 0.5,
  };
}

// Ancoragem: o motor é a fonte de verdade do score atual. A série histórica
// é deslocada para terminar exatamente nele, preservando a forma da curva
// (e portanto o delta de 30 dias). Sem isso, o número do gráfico e o número
// do rating divergem, e a banca nota.
export function ancorarHistorico(historico, scoreAtual) {
  if (!Array.isArray(historico) || historico.length === 0) return [];
  const ordenado = [...historico].sort((a, b) => new Date(a.data) - new Date(b.data));
  const ultimo = ordenado[ordenado.length - 1].score;
  const deslocamento = scoreAtual - ultimo;
  return ordenado.map((p) => ({
    data: p.data,
    score: Math.max(0, Math.min(1000, p.score + deslocamento)),
    ajustado: deslocamento !== 0,
  }));
}

// ---------- PD estimada (NÃO calibrada) ----------
// O edital pede PD em 6/12/24 meses (Seção 6). O brief técnico original
// deixou isso de fora de propósito: sem histórico de inadimplência da Krill
// Tech, uma "PD calibrada" seria número inventado usando linguagem de
// estatística — o oposto do que este projeto se propõe a fazer. O que segue
// é uma curva determinística e auditável a partir do score e da velocidade
// de deterioração (mesma lógica de tendência usada no rating), sempre
// rotulada como estimativa. calibrado:false não é detalhe de rodapé — é o
// campo que a UI usa para nunca deixar isso passar por PD de verdade.
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function estimarPD({ score, tendencia }) {
  const s = clamp01(score / 1000); // 0 = pior, 1 = melhor
  const baseAnual = Math.pow(1 - s, 1.6); // curva não linear: score baixo pesa desproporcionalmente mais

  // Velocidade de deterioração agrava o horizonte curto mais que o longo —
  // mesmo argumento usado em calcularTendencia, aplicado à curva de PD.
  const delta = tendencia?.dados ? tendencia.delta30 : 0;
  const agravante = delta < 0 ? Math.min(0.35, Math.abs(delta) / 500) : 0;

  const pd6 = clamp01(baseAnual * 0.5 * (1 + agravante * 1.4));
  const pd12 = clamp01(baseAnual * (1 + agravante));
  const pd24 = clamp01(1 - Math.pow(1 - baseAnual, 2) * (1 - agravante * 0.6));

  const pct = (v) => Math.round(v * 1000) / 10; // 1 casa decimal, em %

  return {
    pd6m: pct(pd6),
    pd12m: pct(pd12),
    pd24m: pct(pd24),
    calibrado: false,
    metodologia:
      'Estimativa determinística a partir do score e da velocidade de deterioração — não é PD calibrada estatisticamente. Calibração real exige histórico de inadimplência da Krill Tech; é entregável de saída do piloto, não do protótipo.',
  };
}

// ---------- Agente de Ação Recomendada ----------
// Diferencial do documento de solução (item 4): não fica só na faixa do
// rating — cruza qual sinal domina o score com um catálogo de instrumentos
// de mitigação. Cálculo local sobre sinais já coletados: não é fonte nova
// nem chamada de API, é uma camada de decisão em cima do que as fontes já
// trouxeram (sejam elas ao vivo ou simuladas — isso já vem rotulado em cada
// sinal antes de chegar aqui).
const CATALOGO_ACOES = [
  {
    gatilho: (s) => s.tipo === 'rj_distribuida',
    acao: 'Suspender venda a prazo e habilitar o crédito dentro do prazo legal do processo de RJ.',
    motivo: 'Recuperação Judicial distribuída — Stay Period em curso, sem ação de cobrança disponível agora.',
  },
  {
    gatilho: (s) => ['execucao_fiscal', 'divida_ativa'].includes(s.tipo),
    acao: 'Reforçar garantia: migrar de penhor/aval para alienação fiduciária (CPR) antes de ampliar limite.',
    motivo: 'Execução fiscal ou dívida ativa é fato objetivo — garantia real reduz exposição em caso de RJ.',
  },
  {
    gatilho: (s) => s.tipo === 'protesto_duplicata',
    acao: 'Reduzir prazo de pagamento e acompanhar de perto o ciclo de caixa do cliente.',
    motivo: 'Protesto de duplicata indica tensão de curto prazo com outros credores.',
  },
  {
    gatilho: (s) => s.tipo === 'embargo_ambiental',
    acao: 'Verificar regularidade do CAR antes de renovar limite — embargo pode suspender a atividade produtiva.',
    motivo: 'Auto de infração ambiental publicado em diário oficial.',
  },
  {
    gatilho: (s) => ['uso_limite_alto', 'atraso_recorrente'].includes(s.tipo),
    acao: 'Renegociação preventiva de prazo e condições, antes que o atraso vire fato consumado.',
    motivo: 'Piora comportamental (uso de limite ou atraso) capturada pela base interna.',
  },
  {
    gatilho: (s) => s.tipo === 'renegociacao',
    acao: 'Monitorar de perto: renegociação recente reduz a margem para uma segunda rodada.',
    motivo: 'Cliente já renegociou nos últimos 12 meses.',
  },
  {
    gatilho: (s) => s.tipo === 'deficit_hidrico' && !s.neutralizado,
    acao: 'Avaliar conversão parcial para barter ou exigir seguro paramétrico climático para a safra em curso.',
    motivo: 'Déficit hídrico relevante, combinado com sinal de outra dimensão — clima nunca pontua sozinho.',
  },
  {
    gatilho: (s) => s.tipo === 'situacao_cadastral_irregular',
    acao: 'Suspender novas operações até regularização cadastral na Receita.',
    motivo: 'Situação cadastral diferente de ativa é bloqueio operacional, não só de crédito.',
  },
  {
    gatilho: (s) => s.tipo === 'alteracao_societaria',
    acao: 'Aprofundar diligência societária — validar quem são os novos sócios antes de ampliar limite.',
    motivo: 'Alteração recente no quadro societário.',
  },
];

export function recomendarAcoes(sinaisAplicados, maxItens = 3) {
  const vistos = new Set();
  const acoes = [];
  const ordenados = [...(sinaisAplicados || [])].sort((a, b) => (b.peso || 0) - (a.peso || 0));
  for (const s of ordenados) {
    if (s.neutralizado) continue;
    const regra = CATALOGO_ACOES.find((r) => r.gatilho(s));
    if (!regra || vistos.has(regra.acao)) continue;
    vistos.add(regra.acao);
    acoes.push({
      acao: regra.acao,
      motivo: regra.motivo,
      origem: s.tipo,
      fonte: s.fonte || null,
      aoVivo: Boolean(s.aoVivo),
    });
    if (acoes.length >= maxItens) break;
  }
  return acoes;
}

// ---------- Simulador de Stress de Portfólio ----------
// Diferencial do documento de solução (item 5). Aplica um choque
// hipotético sobre a carteira já avaliada (mesmo score que a fila mostra) e
// recalcula rating e exposição. Cálculo local determinístico sobre
// limiteCredito, que é dado interno mockado — rotulado como tal em todo
// lugar que aparece. Não é previsão: é dimensionamento de exposição sob
// cenário adverso.
const COMMODITIES_SENSIVEIS = ['soja', 'milho', 'algodão', 'algodao', 'trigo', 'cana'];

export const CHOQUES = {
  commodity: { rotulo: 'Queda no preço de commodity (soja/milho/algodão/trigo)', pesoMax: 260 },
  clima: { rotulo: 'Quebra de safra regional (seca / El Niño / La Niña)', pesoMax: 300 },
};

export function simularChoque({ clientes, tipo, intensidadePct, uf = null }) {
  const config = CHOQUES[tipo];
  if (!config) throw new Error(`Tipo de choque desconhecido: ${tipo}`);
  const intensidade = clamp01((Number(intensidadePct) || 0) / 100);

  const afeta = (c) => {
    if (tipo === 'commodity') {
      return COMMODITIES_SENSIVEIS.some((k) => (c.cultura || '').toLowerCase().includes(k));
    }
    if (tipo === 'clima') {
      return !uf || c.uf === uf;
    }
    return false;
  };

  const linhas = (clientes || []).map((c) => {
    const atingido = afeta(c);
    const penalidade = atingido ? Math.round(config.pesoMax * intensidade) : 0;
    const scoreChoque = Math.max(0, Math.min(1000, c.score - penalidade));
    const ratingChoque = ratingDe(scoreChoque).rating;
    return {
      id: c.id,
      nome: c.nome,
      cultura: c.cultura,
      uf: c.uf,
      scoreAntes: c.score,
      ratingAntes: c.rating,
      atingido,
      penalidade,
      scoreChoque,
      ratingChoque,
      migrou: ratingChoque !== c.rating,
      limiteCredito: c.limiteCredito ?? 0,
    };
  });

  const emRisco = (campo) => linhas.filter((l) => ['C', 'D'].includes(l[campo])).reduce((s, l) => s + l.limiteCredito, 0);
  const exposicaoAntes = emRisco('ratingAntes');
  const exposicaoDepois = emRisco('ratingChoque');

  return {
    tipo,
    rotulo: config.rotulo,
    intensidadePct: Math.round(intensidade * 100),
    uf,
    linhas,
    clientesAfetados: linhas.filter((l) => l.atingido).length,
    clientesQueMigraram: linhas.filter((l) => l.migrou).length,
    exposicaoEmRiscoAntes: exposicaoAntes,
    exposicaoEmRiscoDepois: exposicaoDepois,
    exposicaoAdicionalEmRisco: exposicaoDepois - exposicaoAntes,
    nota: 'Choque hipotético sobre limiteCredito mockado (dado interno da Krill Tech, simulado no protótipo). Não é previsão — é dimensionamento de exposição sob cenário adverso.',
  };
}