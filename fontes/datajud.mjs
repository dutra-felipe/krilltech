// datajud.mjs — Agente Processual. API Pública do CNJ.
// A chave é PÚBLICA e publicada na wiki do DataJud. Coloque em .env.local
// como DATAJUD_API_KEY (a wiki pode rotacioná-la a qualquer momento).
//
// LIMITAÇÃO ESTRUTURAL: a API não indexa CPF/CNPJ nos campos pesquisáveis,
// por LGPD. A busca é por nome da parte — daí a razão social vinda da
// BrasilAPI ser a chave de entrada. Homônimo é ruído real, e é exatamente
// o que justifica o nível de confiança do motor.
import { resposta, indisponivel, buscar } from './contrato.mjs';

const FONTE = 'DataJud / CNJ';

// Tribunais com maior volume agro. Amplie se sobrar tempo.
export const TRIBUNAIS = ['tjmt', 'tjgo', 'tjms', 'tjba', 'tjpr', 'tjsp', 'trf1'];

const CLASSES_RJ = [/recupera/i, /falência/i, /falencia/i];
const CLASSES_EXEC = [/execução fiscal/i, /execucao fiscal/i, /execução de título/i];

export async function consultar({ razaoSocial, tribunais = TRIBUNAIS.slice(0, 3) }) {
  const chave = process.env.DATAJUD_API_KEY;
  if (!chave) {
    return indisponivel(
      FONTE,
      'sem chave',
      'DATAJUD_API_KEY ausente. A chave pública está na wiki do DataJud.'
    );
  }
  if (!razaoSocial) {
    return indisponivel(FONTE, 'sem razão social', 'Depende do retorno da BrasilAPI.');
  }

  const sinais = [];
  const processos = [];
  let respostasOk = 0;
  const falhas = [];

  for (const trib of tribunais) {
    const r = await buscar(
      `https://api-publica.datajud.cnj.jus.br/api_publica_${trib}/_search`,
      {
        method: 'POST',
        headers: {
          Authorization: `APIKey ${chave}`,
          'Content-Type': 'application/json',
        },
        // 'partes.nome' não está no glossário oficial do DataJud (dado de
        // parte é justamente o que a LGPD protege), mas é o campo usado em
        // exemplos de terceiros que efetivamente buscam por nome. Sem essa
        // cláusula a busca ignorava razaoSocial e devolvia os mesmos
        // processos de RJ do tribunal inteiro para qualquer cliente — bug,
        // não limitação. Se o campo divergir do índice real, a resposta
        // some ou o tribunal falha e cai em 'indisponivel' pelo try/catch
        // do buscar(), nunca finge confirmação.
        body: JSON.stringify({
          size: 10,
          query: { match: { 'partes.nome': razaoSocial } },
          sort: [{ dataAjuizamento: { order: 'desc' } }],
        }),
      }
    );
    if (!r.ok) {
      falhas.push(`${trib}: ${r.erro?.message || 'falha'}`);
      continue;
    }
    respostasOk++;

    const hits = r.dados?.hits?.hits || [];
    for (const h of hits) {
      const p = h._source || {};
      processos.push({
        tribunal: (p.tribunal || trib).toUpperCase(),
        numero: p.numeroProcesso,
        classe: p.classe?.nome,
        assunto: (p.assuntos || [])[0]?.nome || null,
        ajuizamento: p.dataAjuizamento,
        grau: p.grau,
      });
    }
  }

  for (const p of processos) {
    if (CLASSES_RJ.some((re) => re.test(p.classe || ''))) {
      sinais.push({
        tipo: 'rj_distribuida',
        descricao: `${p.classe} distribuída no ${p.tribunal} (processo ${p.numero}).`,
        data: p.ajuizamento,
        deterministico: true,
        evidencia: `Classe: ${p.classe}. Assunto: ${p.assunto || 'não informado'}.`,
      });
    } else if (CLASSES_EXEC.some((re) => re.test(p.classe || ''))) {
      sinais.push({
        tipo: 'execucao_fiscal',
        descricao: `${p.classe} no ${p.tribunal} (processo ${p.numero}).`,
        data: p.ajuizamento,
        deterministico: true,
      });
    }
  }

  // Zero resposta bem-sucedida não é "consultado e nada encontrado".
  // Declarar ao_vivo aqui fazia o painel afirmar confirmação que nunca houve.
  if (respostasOk === 0) {
    return indisponivel(
      FONTE,
      'nenhum tribunal respondeu',
      `Nenhuma das ${tribunais.length} consultas completou. ${falhas.join(' · ')}`
    );
  }

  return resposta({
    fonte: FONTE,
    sinais,
    defasagemDias: 2,
    bruto: { processos, tribunaisConsultados: tribunais, respostasOk, falhas },
    nota:
      `${respostasOk} de ${tribunais.length} tribunais responderam. ` +
      'API não indexa CNPJ (LGPD): busca por nome da parte (campo partes.nome, não documentado oficialmente), com risco de homônimo refletido no nível de confiança.',
  });
}
