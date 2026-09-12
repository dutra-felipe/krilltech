// interna.mjs — Agente Comportamental.
// SIMULADO POR DEFINIÇÃO: atraso, uso de limite e renegociação são dados
// proprietários da Krill Tech. Não existem em base pública. É também o único
// componente com dado exclusivo da empresa — vale dizer isso no pitch.
import { simulado } from './contrato.mjs';

const FONTE = 'Base interna Krill Tech';

export async function consultar({ comportamento }) {
  if (!comportamento) {
    return simulado(FONTE, [], null, 'Sem registro interno para este CNPJ.');
  }

  const sinais = [];
  const { usoLimite, usoLimiteAnterior, diasAtrasoMedio, renegociacoes12m } = comportamento;

  if (usoLimite >= 0.85) {
    sinais.push({
      tipo: 'uso_limite_alto',
      descricao: `Uso do limite em ${(usoLimite * 100).toFixed(0)}%, contra ${(usoLimiteAnterior * 100).toFixed(0)}% no trimestre anterior.`,
      data: comportamento.referencia,
      deterministico: false,
    });
  }
  if (diasAtrasoMedio >= 10) {
    sinais.push({
      tipo: 'atraso_recorrente',
      descricao: `Atraso médio de ${diasAtrasoMedio} dias nas últimas faturas.`,
      data: comportamento.referencia,
      deterministico: false,
    });
  }
  if (renegociacoes12m >= 1) {
    sinais.push({
      tipo: 'renegociacao',
      descricao: `${renegociacoes12m} renegociação(ões) nos últimos 12 meses.`,
      data: comportamento.referencia,
      deterministico: false,
    });
  }

  return simulado(
    FONTE,
    sinais,
    comportamento,
    'Dado proprietário da Krill Tech — simulado no protótipo, real em produção.'
  );
}
