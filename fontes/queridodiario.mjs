// queridodiario.mjs — Agente Coletor & Parser. Texto REAL de diário oficial.
// Gratuita, sem autenticação. Limite de referência: 60 req/min.
// Cobertura: diários municipais e União. Atos judiciais de RJ ficam nos DJEs
// dos tribunais — o que esta fonte prova é que o pipeline de extração funciona
// sobre documento oficial real.
import { resposta, indisponivel, buscar, diasDesde } from './contrato.mjs';

const FONTE = 'Querido Diário (OKBR) / Diários Oficiais';

export const TERMOS_RISCO = [
  'divida ativa',
  'notificacao fiscal',
  'auto de infracao',
  'execucao fiscal',
];

const TIPO_POR_TERMO = {
  'divida ativa': 'divida_ativa',
  'notificacao fiscal': 'divida_ativa',
  'auto de infracao': 'embargo_ambiental',
  'execucao fiscal': 'execucao_fiscal',
};

export async function consultar({ territorioIbge, razaoSocial, termos = TERMOS_RISCO }) {
  if (!territorioIbge) {
    return indisponivel(FONTE, 'sem código IBGE', 'Município não resolvido no IBGE.');
  }

  const achados = [];
  const sinais = [];
  let respostasOk = 0;
  const falhas = [];

  for (const termo of termos) {
    const q = razaoSocial ? `"${razaoSocial}" ${termo}` : termo;
    const url =
      'https://api.queridodiario.ok.org.br/gazettes' +
      `?territory_ids=${encodeURIComponent(territorioIbge)}` +
      `&querystring=${encodeURIComponent(q)}` +
      '&excerpt_size=500&number_of_excerpts=2&size=5&sort_by=descending_date';

    const r = await buscar(url);
    await new Promise((res) => setTimeout(res, 1100)); // respeita 60 req/min
    if (!r.ok) {
      falhas.push(`"${termo}": ${r.erro?.message || 'falha'}`);
      continue;
    }
    respostasOk++;

    const itens = r.dados?.gazettes || [];
    for (const g of itens) {
      const trecho = (g.excerpts || [])[0] || '';
      if (!trecho) continue;
      achados.push({
        termo,
        data: g.date,
        edicao: g.edition_number || null,
        municipio: g.territory_name,
        uf: g.state_code,
        url: g.url || g.txt_url || null,
        trecho,
      });
    }
  }

  // Distingue "consultei e não achei nada" de "não consegui consultar".
  if (respostasOk === 0) {
    return indisponivel(
      FONTE,
      'nenhuma busca completou',
      `Nenhum dos ${termos.length} termos foi consultado. ${falhas.join(' · ')}`
    );
  }

  if (achados.length === 0) {
    return resposta({
      fonte: FONTE,
      sinais: [],
      bruto: { achados: [], respostasOk, termosConsultados: termos },
      nota: `${respostasOk} de ${termos.length} buscas completaram, nenhuma publicação encontrada. Ausência de registro não é prova de inexistência.`,
    });
  }

  // Um sinal por achado. A classificação fina vem da rota /api/explicar,
  // que manda o trecho real para o LLM extrair estrutura.
  for (const a of achados) {
    sinais.push({
      tipo: TIPO_POR_TERMO[a.termo] || 'divida_ativa',
      descricao: `Publicação em diário oficial de ${a.municipio}/${a.uf} contendo "${a.termo}".`,
      data: a.data,
      deterministico: false, // vira true só após extração confirmar as partes
      evidencia: a.trecho,
      url: a.url,
      pendenteExtracao: true,
    });
  }

  const maisRecente = achados.map((a) => a.data).sort().reverse()[0];

  return resposta({
    fonte: FONTE,
    sinais,
    defasagemDias: diasDesde(maisRecente) ?? 0,
    bruto: { achados },
    nota: 'Cobre diários municipais e União. Atos judiciais de RJ ficam nos DJEs dos tribunais (Fase 2).',
  });
}
