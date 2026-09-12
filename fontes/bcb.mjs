// bcb.mjs — pressão macro da carteira inteira, não do cliente individual.
// Série SGS do Banco Central. Gratuita, sem autenticação.
import { resposta, indisponivel, buscar } from './contrato.mjs';

const FONTE = 'Banco Central / SGS';
const SERIES = { selic: 432, dolar: 1 }; // 432 = Selic meta % a.a., 1 = câmbio venda

async function ultima(codigo) {
  const r = await buscar(
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/1?formato=json`
  );
  if (!r.ok || !Array.isArray(r.dados) || !r.dados.length) return null;
  return r.dados[0];
}

export async function consultar() {
  const [selic, dolar] = await Promise.all([ultima(SERIES.selic), ultima(SERIES.dolar)]);
  if (!selic && !dolar) return indisponivel(FONTE, 'séries indisponíveis');

  const taxa = selic ? Number(String(selic.valor).replace(',', '.')) : null;
  const cambio = dolar ? Number(String(dolar.valor).replace(',', '.')) : null;

  const sinais = [];
  if (taxa !== null && taxa >= 12) {
    sinais.push({
      tipo: 'pressao_macro',
      descricao: `Selic meta em ${taxa}% a.a. Custo financeiro restritivo pressiona produtor alavancado.`,
      data: selic.data,
      deterministico: false,
    });
  }

  return resposta({
    fonte: FONTE,
    sinais,
    defasagemDias: 1,
    bruto: { selic: taxa, selicData: selic?.data, dolar: cambio, dolarData: dolar?.data },
    nota: 'Fator de carteira, não de cliente. Nunca pontua isolado.',
  });
}
