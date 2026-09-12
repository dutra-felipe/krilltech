// brasilapi.mjs — Agente Coletor Cadastral. Receita Federal via BrasilAPI.
// Gratuita, sem autenticação. Rate limit: espace ~100ms entre chamadas.
import { resposta, indisponivel, simulado, buscar, soDigitos } from './contrato.mjs';

const FONTE = 'BrasilAPI / Receita Federal';

export async function consultar({ cnpj, ficticio = false }) {
  const limpo = soDigitos(cnpj);
  if (limpo.length !== 14) {
    return indisponivel(FONTE, 'CNPJ inválido', 'CNPJ deve ter 14 dígitos.');
  }
  // Clientes da carteira de demonstração têm CNPJ fictício. Consultar a
  // Receita com eles retornaria empresa alheia e o painel afirmaria uma
  // identidade que não é a do cliente exibido.
  if (ficticio || limpo.startsWith('99000')) {
    return simulado(
      FONTE,
      [],
      null,
      'Cliente fictício da carteira de demonstração — consulta cadastral não aplicável. Use a busca por CNPJ para ver o agente coletor operando ao vivo.'
    );
  }

  const r = await buscar(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
  if (!r.ok) return indisponivel(FONTE, r.erro);

  const d = r.dados;
  const sinais = [];
  const hoje = new Date();

  // Situação cadastral diferente de ativa é fato objetivo e grave.
  const situacao = String(d.descricao_situacao_cadastral || '').toUpperCase();
  if (situacao && situacao !== 'ATIVA') {
    sinais.push({
      tipo: 'situacao_cadastral_irregular',
      descricao: `Situação cadastral na Receita: ${d.descricao_situacao_cadastral}.`,
      data: d.data_situacao_cadastral || null,
      deterministico: true,
      evidencia: d.descricao_motivo_situacao_cadastral || null,
    });
  }

  // Menos de 2 anos de atividade: a Lei 14.112/2020 exige atividade mínima de
  // 2 anos para o produtor pessoa física requerer RJ. Empresa nova no agro
  // costuma indicar reestruturação societária recente.
  const abertura = d.data_inicio_atividade ? new Date(d.data_inicio_atividade) : null;
  const anos = abertura ? (hoje - abertura) / (365.25 * 864e5) : null;
  if (anos !== null && anos < 2) {
    sinais.push({
      tipo: 'atividade_recente',
      descricao: `CNPJ com ${anos.toFixed(1)} anos de atividade. Sem histórico consolidado.`,
      data: d.data_inicio_atividade,
      deterministico: true,
    });
  }

  const socios = Array.isArray(d.qsa) ? d.qsa : [];
  const socioRecente = socios.find((s) => {
    const e = s.data_entrada_sociedade ? new Date(s.data_entrada_sociedade) : null;
    return e && (hoje - e) / 864e5 < 180;
  });
  if (socioRecente) {
    sinais.push({
      tipo: 'alteracao_societaria',
      descricao: `Entrada de sócio nos últimos 180 dias: ${socioRecente.nome_socio}.`,
      data: socioRecente.data_entrada_sociedade,
      deterministico: false,
    });
  }

  return resposta({
    fonte: FONTE,
    sinais,
    defasagemDias: 7, // defasagem típica da base da Receita, não a idade do cadastro
    bruto: {
      razaoSocial: d.razao_social,
      nomeFantasia: d.nome_fantasia || null,
      cnaePrincipal: `${d.cnae_fiscal} — ${d.cnae_fiscal_descricao}`,
      situacao: d.descricao_situacao_cadastral,
      inicioAtividade: d.data_inicio_atividade,
      situacaoDesde: d.data_situacao_cadastral,
      anosAtividade: anos !== null ? +anos.toFixed(1) : null,
      municipio: d.municipio,
      uf: d.uf,
      capitalSocial: d.capital_social,
      socios: socios.map((s) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })),
    },
    nota: 'Atualização da base da Receita costuma ter até 1 semana de defasagem.',
  });
}
