// clima.mjs — Agente Agroclimático. Déficit hídrico acumulado.
// Tenta INMET primeiro (fonte nomeada no edital); cai para Open-Meteo,
// que é gratuito, sem chave e estável. A troca é declarada na interface.
import { resposta, indisponivel, buscar, diasDesde } from './contrato.mjs';

const FONTE = 'INMET / Open-Meteo';

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export async function consultar({ lat, lon, estacaoInmet = null }) {
  if (lat == null || lon == null) {
    return indisponivel(FONTE, 'sem coordenadas', 'Município sem lat/lon resolvida.');
  }

  const fim = new Date(Date.now() - 3 * 864e5); // API de arquivo tem ~3 dias de lag
  const ini = new Date(fim.getTime() - 60 * 864e5);
  let serie = null;
  let origem = null;

  // 1. INMET, se houver código de estação configurado.
  if (estacaoInmet) {
    const r = await buscar(
      `https://apitempo.inmet.gov.br/estacao/${fmt(ini)}/${fmt(fim)}/${estacaoInmet}`,
      { timeout: 8000 }
    );
    if (r.ok && Array.isArray(r.dados) && r.dados.length) {
      serie = r.dados
        .map((d) => ({ data: d.DT_MEDICAO, mm: Number(d.CHUVA) || 0 }))
        .filter((d) => d.data);
      origem = `INMET (estação ${estacaoInmet})`;
    }
  }

  // 2. Fallback Open-Meteo. O endpoint de arquivo histórico é mais lento que
  // uma série pronta — 4s (padrão do contrato) estourava com frequência em
  // rede real, mesmo com o serviço no ar. 9s + uma segunda tentativa cobre
  // isso sem deixar a demo travada num timeout longo demais.
  if (!serie) {
    const r = await buscar(
      'https://archive-api.open-meteo.com/v1/archive' +
        `?latitude=${lat}&longitude=${lon}` +
        `&start_date=${fmt(ini)}&end_date=${fmt(fim)}` +
        '&daily=precipitation_sum&timezone=America%2FSao_Paulo',
      { timeout: 9000, tentativas: 2 }
    );
    if (!r.ok) return indisponivel(FONTE, r.erro);
    const t = r.dados?.daily?.time || [];
    const p = r.dados?.daily?.precipitation_sum || [];
    serie = t.map((data, i) => ({ data, mm: p[i] ?? 0 }));
    origem = 'Open-Meteo (arquivo) — INMET é a fonte de produção';
  }

  const total = serie.reduce((s, d) => s + d.mm, 0);
  const dias = serie.length || 1;
  const mediaDiaria = total / dias;

  // Referência grosseira para Cerrado em safra. Calibrar por cultura na Fase 2.
  const REFERENCIA_60D = 280;
  const deficitPct = Math.max(0, ((REFERENCIA_60D - total) / REFERENCIA_60D) * 100);

  const sinais = [];
  if (deficitPct >= 35) {
    sinais.push({
      tipo: 'deficit_hidrico',
      descricao: `Precipitação acumulada de ${total.toFixed(0)}mm em ${dias} dias, ${deficitPct.toFixed(0)}% abaixo da referência de ${REFERENCIA_60D}mm.`,
      data: serie[serie.length - 1]?.data || null,
      deterministico: false,
      evidencia: origem,
    });
  }

  return resposta({
    fonte: FONTE,
    sinais,
    defasagemDias: diasDesde(serie[serie.length - 1]?.data) ?? 3,
    bruto: { origem, totalMm: +total.toFixed(1), mediaDiaria: +mediaDiaria.toFixed(2), deficitPct: +deficitPct.toFixed(1), serie },
    nota: 'Risco climático nunca pontua isolado — só combinado com sinal jurídico, fiscal ou comportamental.',
  });
}
