// ibge.mjs — cola entre nome de município (BrasilAPI) e código IBGE
// (exigido pelo Querido Diário). Gratuita, sem autenticação.
//
// Busca por UF, não o país inteiro: /estados/MS/municipios devolve ~80
// registros contra ~5.570 de /municipios. Baixar o país todo estourava o
// timeout em rede lenta e derrubava o Querido Diário junto.
import { buscar, normalizar } from './contrato.mjs';

const CACHE = new Map(); // uf -> Map(nomeNormalizado -> {id, nome, uf})

async function carregarUf(uf) {
  const chave = String(uf || '').toUpperCase();
  if (!chave) return null;
  if (CACHE.has(chave)) return CACHE.get(chave);

  const r = await buscar(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${chave}/municipios`,
    { timeout: 4000 }
  );
  if (!r.ok || !Array.isArray(r.dados)) return null;

  const mapa = new Map();
  for (const m of r.dados) mapa.set(normalizar(m.nome), { id: m.id, nome: m.nome, uf: chave });
  CACHE.set(chave, mapa);
  return mapa;
}

export async function codigoIbge(municipio, uf) {
  if (!municipio) return null;
  const mapa = await carregarUf(uf);
  if (!mapa) return null;
  const alvo = normalizar(municipio);
  if (mapa.has(alvo)) return mapa.get(alvo);
  // Tolera divergência de grafia entre Receita e IBGE (ex.: D'Oeste, Sant'Ana).
  const semApostrofo = alvo.replace(/[^A-Z ]/g, '');
  for (const [nome, dados] of mapa) {
    if (nome.replace(/[^A-Z ]/g, '') === semApostrofo) return dados;
  }
  return null;
}
