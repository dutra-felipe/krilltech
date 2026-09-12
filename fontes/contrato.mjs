// contrato.mjs — contrato único de toda fonte de dados.
// Regra: nenhuma fonte lança exceção. Falha devolve status 'indisponivel'.

import dns from 'node:dns';
// Algumas redes resolvem IPv6 mas não roteiam para ele — o pedido não erra,
// fica pendurado até o timeout. Node 18+ tenta a ordem 'verbatim' por
// padrão, então esse tipo de rede quebrada aparece como 'sem resposta',
// nunca como falha de DNS. Forçar IPv4 primeiro é defensivo: não piora nada
// se a causa da lentidão for outra.
dns.setDefaultResultOrder('ipv4first');

export const TIMEOUT_MS = 4000;

export function resposta({
  fonte,
  status = 'ao_vivo',
  sinais = [],
  bruto = null,
  defasagemDias = 0,
  nota = null,
}) {
  return {
    fonte,
    status, // 'ao_vivo' | 'simulado' | 'indisponivel'
    atualizadoEm: new Date().toISOString(),
    defasagemDias,
    sinais: sinais.map((s) => ({ ...s, fonte })),
    bruto,
    nota,
  };
}

export function indisponivel(fonte, erro, nota = null) {
  return resposta({
    fonte,
    status: 'indisponivel',
    nota: nota || `Consulta falhou: ${erro?.message || erro}`,
  });
}

export function simulado(fonte, sinais, bruto = null, nota = null) {
  return resposta({
    fonte,
    status: 'simulado',
    sinais,
    bruto,
    nota: nota || 'Dado simulado — sem API pública viável.',
  });
}

// fetch com timeout e sem exceção vazando.
export async function buscar(url, opcoes = {}) {
  const limite = opcoes.timeout ?? TIMEOUT_MS;
  const tentativas = opcoes.tentativas ?? 1;
  let ultimoErro = null;

  for (let n = 1; n <= tentativas; n++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), limite);
    try {
      const r = await fetch(url, {
        ...opcoes,
        signal: ctrl.signal,
        headers: { 'User-Agent': 'KrillRadar/0.1 (hackathon PMI-DF)', ...(opcoes.headers || {}) },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const texto = await r.text();
      try {
        return { ok: true, dados: JSON.parse(texto) };
      } catch {
        return { ok: true, dados: texto };
      }
    } catch (e) {
      // 'This operation was aborted' não diz nada a quem está depurando.
      ultimoErro =
        e.name === 'AbortError' || /aborted/i.test(e.message)
          ? new Error(`sem resposta em ${limite}ms (${new URL(url).hostname})`)
          : e;
    } finally {
      clearTimeout(t);
    }
  }
  return { ok: false, erro: ultimoErro };
}

export function diasDesde(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(+d)) return null;
  return Math.max(0, Math.round((Date.now() - d) / 864e5));
}

export function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

export function normalizar(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}
