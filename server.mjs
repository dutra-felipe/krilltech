// server.mjs — servidor e Orquestrador de Risco.
// Sem dependências: só node:http, node:fs e fetch global. Node 18+.
// Existe por dois motivos: servir os estáticos e ser proxy, porque chave de
// API não vai para o JavaScript do navegador e parte das fontes públicas não
// manda header de CORS.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { avaliar, ancorarHistorico, simularChoque, CHOQUES } from './motor.js';
import { CARTEIRA, EXPLICACOES_CACHE, FONTES_CACHE, FONTES_INDISPONIVEIS_POR_DESIGN } from './dados.js';

import * as brasilapi from './fontes/brasilapi.mjs';
import * as ibge from './fontes/ibge.mjs';
import * as queridodiario from './fontes/queridodiario.mjs';
import * as datajud from './fontes/datajud.mjs';
import * as clima from './fontes/clima.mjs';
import * as bcb from './fontes/bcb.mjs';
import * as interna from './fontes/interna.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PORTA = process.env.PORT || 3000;

// ---------- .env.local, sem dependência ----------
try {
  const env = fs.readFileSync(path.join(RAIZ, '.env.local'), 'utf8');
  for (const linha of env.split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  console.log('.env.local carregado');
} catch {
  console.log('.env.local ausente — DataJud e LLM ficarão em modo simulado');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function json(res, dados, status = 200) {
  const corpo = JSON.stringify(dados);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo),
  });
  res.end(corpo);
}

function corpoDaRequisicao(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (c) => (dados += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(dados || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// Montagem de sinais em três camadas de precedência, com dedup por
// tipo+data+fonte. Extraída para função porque a fila e o dossiê PRECISAM
// usar a mesma: quando cada um montava do seu jeito, a fila mostrava 510 e o
// dossiê 420 para o mesmo cliente.
function montarSinais(cliente, fontes) {
  const chave = (s) => `${s.tipo}|${String(s.data || '').slice(0, 10)}|${s.fonte || ''}`;

  const aoVivo = fontes
    .filter((f) => f.status === 'ao_vivo')
    .flatMap((f) => f.sinais.map((s) => ({ ...s, aoVivo: true, simulado: false })));

  const tiposAoVivo = new Set(aoVivo.map((s) => s.tipo));
  const vistos = new Set(aoVivo.map(chave));

  const simuladas = fontes
    .filter((f) => f.status === 'simulado')
    .flatMap((f) => f.sinais.map((s) => ({ ...s, aoVivo: false, simulado: true })))
    .filter((s) => !tiposAoVivo.has(s.tipo) && !vistos.has(chave(s)) && vistos.add(chave(s)));

  const tiposJaTemos = new Set([...tiposAoVivo, ...simuladas.map((s) => s.tipo)]);
  const complemento = (cliente?.sinaisDemo || [])
    .filter((s) => !tiposJaTemos.has(s.tipo) && !vistos.has(chave(s)) && vistos.add(chave(s)))
    .map((s) => ({ ...s, aoVivo: false, simulado: true }));

  return [...aoVivo, ...simuladas, ...complemento];
}

// Avaliação local de toda a carteira, sem tocar rede — só a base interna,
// que é local por definição. Usada pela fila (Tela 1) e pelo simulador de
// estresse (Tela 3): as duas PRECISAM partir do mesmo score, pelo mesmo
// motivo que motarSinais existe (fila e dossiê não podem divergir).
async function avaliarTodosLocal() {
  return Promise.all(
    CARTEIRA.map(async (c) => {
      const fontesLocais = [await interna.consultar({ comportamento: c.comportamento })];
      const sinais = montarSinais(c, fontesLocais);
      const a = avaliar({ sinais, historico: c.historico, fontes: fontesLocais });
      return {
        id: c.id,
        nome: c.nome,
        cnpj: c.cnpj,
        cultura: c.cultura,
        municipio: c.municipio,
        uf: c.uf,
        limiteCredito: c.limiteCredito ?? 0,
        score: a.score,
        rating: a.rating,
        rotulo: a.rotulo,
        tendencia: a.tendencia,
        confianca: a.confianca.nivel,
        prioridade: a.prioridade,
        sinais: a.sinais.length,
      };
    })
  );
}

// ---------- Orquestrador de Risco ----------
// Combina as fontes, aplica o motor e devolve tudo que o dossiê precisa.
// Nenhuma fonte pode derrubar a cadeia: todas devolvem contrato, nunca lançam.
async function orquestrar({ cnpj, clienteId, aoVivo = true }) {
  const cliente =
    CARTEIRA.find((c) => c.id === clienteId) ||
    CARTEIRA.find((c) => c.cnpj === String(cnpj || '').replace(/\D/g, '')) ||
    null;

  const cnpjAlvo = String(cnpj || cliente?.cnpj || '').replace(/\D/g, '');
  const fontes = [];

  if (!aoVivo) {
    // Modo offline: fallbacks cacheados para as cinco fontes de rede, mas a
    // base interna continua sendo consultada de verdade — ela é local e não
    // depende de rede. Substituí-la pelo stub cacheado fazia o modo offline
    // divergir da fila, que é onde o analista viu o número pela primeira vez.
    fontes.push(
      ...FONTES_CACHE.filter((f) => f.fonte !== 'Base interna Krill Tech'),
      await interna.consultar({ comportamento: cliente?.comportamento })
    );
  } else {
    // 1 e 2 em paralelo. O IBGE não precisa esperar a Receita: quando o
    // cliente está na carteira já sabemos o município. Antes isso era
    // sequencial e o dossiê levava ~28s, inviável para demo ao vivo.
    const [cad, munPreliminar] = await Promise.all([
      brasilapi.consultar({ cnpj: cnpjAlvo, ficticio: cliente?.ficticio }),
      cliente?.municipio
        ? ibge.codigoIbge(cliente.municipio, cliente.uf)
        : Promise.resolve(null),
    ]);
    fontes.push(cad);

    const razaoSocial = cad.bruto?.razaoSocial || cliente?.nome || null;
    const municipio = cad.bruto?.municipio || cliente?.municipio;
    const uf = cad.bruto?.uf || cliente?.uf;

    // Uma tentativa só. Antes, quando a primeira falhava, a segunda repetia o
    // custo inteiro e o dossiê chegava a 50s — inviável para demo ao vivo.
    let territorio = munPreliminar?.id || null;
    if (!territorio && municipio && !munPreliminar) {
      const mesmaCidade =
        !cliente?.municipio ||
        municipio.toUpperCase().trim() === String(cliente.municipio).toUpperCase().trim();
      if (!mesmaCidade) territorio = (await ibge.codigoIbge(municipio, uf))?.id || null;
    }

    // 3. Diários oficiais com texto real. Roda em paralelo com o resto.
    const [diario, processos, tempo, macro, comportamento] = await Promise.all([
      territorio
        ? queridodiario.consultar({ territorioIbge: territorio, razaoSocial })
        : Promise.resolve({
            fonte: 'Querido Diário (OKBR) / Diários Oficiais',
            status: 'indisponivel',
            atualizadoEm: new Date().toISOString(),
            defasagemDias: 0,
            sinais: [],
            bruto: null,
            nota: 'Município não resolvido no IBGE.',
          }),
      datajud.consultar({ razaoSocial }),
      clima.consultar({
        lat: cliente?.lat,
        lon: cliente?.lon,
        estacaoInmet: cliente?.estacaoInmet || null,
      }),
      bcb.consultar(),
      interna.consultar({ comportamento: cliente?.comportamento }),
    ]);

    fontes.push(diario, processos, tempo, macro, comportamento);
  }

  // Sinais, em três camadas de precedência por tipo:
  //   1. fonte ao vivo    -> aoVivo: true
  //   2. fonte simulada    -> aoVivo: false (ex.: base interna da Krill, que é
  //                           simulada por definição e antes era descartada,
  //                           deixando o agente comportamental sem efeito)
  //   3. sinal de demonstração do dados.js, só para o que faltou
  const sinaisAoVivo = fontes
    .filter((f) => f.status === 'ao_vivo')
    .flatMap((f) => f.sinais.map((s) => ({ ...s, aoVivo: true, simulado: false })));

  const sinais = montarSinais(cliente, fontes);

  const avaliacao = avaliar({ sinais, historico: cliente?.historico || [], fontes });
  const historico = ancorarHistorico(cliente?.historico || [], avaliacao.score);

  return {
    cliente: cliente
      ? {
          id: cliente.id,
          nome: cliente.nome,
          cnpj: cliente.cnpj,
          cultura: cliente.cultura,
          municipio: cliente.municipio,
          uf: cliente.uf,
          ficticio: Boolean(cliente.ficticio),
        }
      : {
          id: null,
          nome: fontes.find((f) => f.bruto?.razaoSocial)?.bruto?.razaoSocial || 'CNPJ consultado',
          cnpj: cnpjAlvo,
          cultura: fontes.find((f) => f.bruto?.cnaePrincipal)?.bruto?.cnaePrincipal || null,
          municipio: fontes.find((f) => f.bruto?.municipio)?.bruto?.municipio || null,
          uf: fontes.find((f) => f.bruto?.uf)?.bruto?.uf || null,
          ficticio: false,
          novaConsulta: true,
        },
    avaliacao,
    historico,
    fontes,
    indisponiveisPorDesign: FONTES_INDISPONIVEIS_POR_DESIGN,
    modo: aoVivo ? 'ao_vivo' : 'offline',
  };
}

// ---------- Agente Sintetizador ----------
const PROMPT_SISTEMA = `Você é o agente sintetizador do Krill Radar, um sistema de alerta precoce de inadimplência no agronegócio brasileiro, usado por analistas de crédito da Krill Tech.

Regras invioláveis:
- Use APENAS os sinais presentes no JSON recebido. Nunca invente sinal, valor ou data.
- Nunca afirme que o cliente vai entrar em Recuperação Judicial. Fale em deterioração e em risco.
- Cite a fonte de cada sinal que mencionar.
- Termine sempre com a ação recomendada, não com diagnóstico.
- Se um sinal estiver marcado como simulado, não o apresente como confirmado.
- Escreva 3 a 5 frases, em português do Brasil, voz de analista, sem listas e sem título.`;

async function explicar(payload) {
  const chave = process.env.ANTHROPIC_API_KEY;
  const clienteId = payload?.clienteId;

  if (!chave) {
    return {
      texto: EXPLICACOES_CACHE[clienteId] || EXPLICACOES_CACHE.generico,
      origem: 'cache',
      nota: 'ANTHROPIC_API_KEY ausente — explicação pré-gerada.',
    };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: PROMPT_SISTEMA,
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const texto = (d.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    if (!texto) throw new Error('resposta vazia');
    return { texto, origem: 'llm' };
  } catch (e) {
    // Fallback cacheado. A demo não morre ao vivo por causa de rede.
    return {
      texto: EXPLICACOES_CACHE[clienteId] || EXPLICACOES_CACHE.generico,
      origem: 'cache',
      nota: `Chamada ao LLM falhou (${e.message}) — explicação pré-gerada.`,
    };
  } finally {
    clearTimeout(t);
  }
}

// Extração estruturada sobre o texto real do diário oficial.
// É o "parser" do Agente Coletor. Extração assistida por LLM, não RAG.
async function extrairDoDiario(achados) {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave || !achados?.length) return { itens: [], origem: 'indisponivel' };

  const sistema = `Extraia dados estruturados de trechos de diários oficiais brasileiros.
Devolva SOMENTE um array JSON, sem markdown e sem preâmbulo. Cada item:
{"tipoAto": string, "partes": string[], "numeroProcesso": string|null, "valor": string|null, "data": string|null, "relevanciaCredito": "alta"|"media"|"baixa", "resumo": string}
Se o trecho não trouxer informação de risco de crédito, use relevanciaCredito "baixa".
Nunca invente dado que não esteja no trecho. Campo ausente é null.`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': chave,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: sistema,
        messages: [
          {
            role: 'user',
            content: JSON.stringify(
              achados.slice(0, 5).map((a) => ({ data: a.data, municipio: a.municipio, trecho: a.trecho }))
            ),
          },
        ],
      }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    const bruto = (d.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim();
    return { itens: JSON.parse(bruto), origem: 'llm' };
  } catch (e) {
    return { itens: [], origem: 'erro', nota: e.message };
  }
}

// ---------- Rotas ----------
const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  const rota = url.pathname;

  try {
    if (rota === '/api/carteira') {
      // Fila do analista: ordenada por deterioração, não por risco absoluto.
      // Usa a MESMA montagem de sinais do dossiê, só sem as fontes de rede,
      // para que o score da fila nunca divirja do score do dossiê.
      const linhas = await avaliarTodosLocal();
      linhas.sort((x, y) => y.prioridade - x.prioridade);
      return json(res, { linhas, geradoEm: new Date().toISOString() });
    }

    if (rota === '/api/choques') {
      // Catálogo de choques disponíveis pro simulador montar o formulário.
      return json(res, { choques: CHOQUES });
    }

    if (rota === '/api/simular' && req.method === 'POST') {
      // Simulador de Stress de Portfólio (diferencial do documento de
      // solução, item 5). Cálculo local e determinístico: parte do MESMO
      // score que a fila mostra (avaliarTodosLocal), aplica um choque
      // hipotético e recalcula rating + exposição. Não é fonte nova, não é
      // chamada de API — é uma camada de simulação sobre limiteCredito
      // mockado, deixado explícito na resposta.
      const { tipo, intensidadePct, uf } = await corpoDaRequisicao(req);
      if (!CHOQUES[tipo]) {
        return json(res, { erro: `tipo de choque desconhecido: ${tipo}. Use ${Object.keys(CHOQUES).join(' ou ')}.` }, 400);
      }
      const clientes = await avaliarTodosLocal();
      const resultado = simularChoque({ clientes, tipo, intensidadePct, uf: uf || null });
      return json(res, resultado);
    }

    if (rota === '/api/dossie') {
      const resultado = await orquestrar({
        cnpj: url.searchParams.get('cnpj'),
        clienteId: url.searchParams.get('id'),
        aoVivo: url.searchParams.get('offline') !== '1',
      });
      return json(res, resultado);
    }

    if (rota === '/api/explicar' && req.method === 'POST') {
      const payload = await corpoDaRequisicao(req);
      return json(res, await explicar(payload));
    }

    if (rota === '/api/extrair' && req.method === 'POST') {
      const { achados } = await corpoDaRequisicao(req);
      return json(res, await extrairDoDiario(achados));
    }

    // Rotas de diagnóstico: testam uma fonte por vez, sem passar pela UI.
    if (rota === '/api/fonte/cnpj') {
      return json(res, await brasilapi.consultar({ cnpj: url.searchParams.get('cnpj') }));
    }
    if (rota === '/api/fonte/ibge') {
      return json(res, await ibge.codigoIbge(url.searchParams.get('municipio'), url.searchParams.get('uf')));
    }
    if (rota === '/api/fonte/diario') {
      return json(
        res,
        await queridodiario.consultar({
          territorioIbge: url.searchParams.get('territorio'),
          razaoSocial: url.searchParams.get('nome'),
        })
      );
    }
    if (rota === '/api/fonte/datajud') {
      return json(res, await datajud.consultar({ razaoSocial: url.searchParams.get('nome') }));
    }
    if (rota === '/api/fonte/clima') {
      return json(
        res,
        await clima.consultar({
          lat: Number(url.searchParams.get('lat')),
          lon: Number(url.searchParams.get('lon')),
        })
      );
    }
    if (rota === '/api/fonte/macro') {
      return json(res, await bcb.consultar());
    }

    if (rota === '/api/saude') {
      return json(res, {
        ok: true,
        node: process.version,
        datajudConfigurado: Boolean(process.env.DATAJUD_API_KEY),
        llmConfigurado: Boolean(process.env.ANTHROPIC_API_KEY),
      });
    }

    // ---------- estáticos ----------
    const alvo = rota === '/' ? '/index.html' : rota;
    const arquivo = path.join(RAIZ, path.normalize(alvo).replace(/^(\.\.[/\\])+/, ''));
    if (!arquivo.startsWith(RAIZ) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Não encontrado.');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(arquivo)] || 'application/octet-stream' });
    return fs.createReadStream(arquivo).pipe(res);
  } catch (e) {
    console.error('erro na rota', rota, e);
    return json(res, { erro: e.message, rota }, 500);
  }
});

servidor.listen(PORTA, () => {
  console.log(`Krill Radar em http://localhost:${PORTA}`);
  console.log(`Diagnóstico: http://localhost:${PORTA}/api/saude`);
});
