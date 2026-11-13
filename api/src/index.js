// Registro de uso da Trilha de Onboarding (GitHub Pages).
// A pagina e estatica: sem este Worker, nada do que o executivo faz sai do
// navegador dele e a gestao nao ve nada.
//
//   POST /eventos        -> grava um lote de eventos de uma pessoa
//   GET  /pessoas        -> uma linha por pessoa, com os totais (painel ?gestao)
//   GET  /pessoas/:id    -> todos os eventos daquela pessoa, do mais novo pro mais velho
//
// O POST chega por sendBeacon quando a aba fecha, e sendBeacon nao faz
// preflight: por isso o corpo vem como text/plain e o JSON.parse e nosso.

const ORIGENS = ["https://daianesilvasvc-afk.github.io"];
const MAX_BYTES = 256 * 1024;
const MAX_EVENTOS = 200;
const MAX_LISTA = 3000;
const ID_OK = /^[a-zA-Z0-9-]{8,64}$/;
const TIPOS = [
  "entrou", "aula_abriu", "aula_concluiu", "aula_desmarcou",
  "video_abriu", "video_assistido", "video_desmarcou",
  "quiz_tentativa", "tempo"
];

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const ok = ORIGENS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ORIGENS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors(request) },
  });
}

function texto(v, max) {
  return typeof v === "string" ? (v.trim().slice(0, max) || null) : null;
}

function quando(v) {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  // Relogio do navegador adiantado nao vira evento do futuro no painel.
  const agora = Date.now();
  if (!Number.isFinite(t) || t > agora + 60000 || t < agora - 365 * 24 * 3600 * 1000) {
    return new Date(agora).toISOString();
  }
  return new Date(t).toISOString();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(request) });

    const partes = new URL(request.url).pathname.split("/").filter(Boolean);

    // ---- POST /eventos ----
    if (partes[0] === "eventos" && partes.length === 1) {
      if (request.method !== "POST") return json(request, { error: "método não permitido" }, 405);

      const cru = await request.text();
      if (cru.length > MAX_BYTES) return json(request, { error: "lote grande demais" }, 413);
      let body;
      try { body = JSON.parse(cru); } catch (e) { return json(request, { error: "JSON inválido" }, 400); }
      if (!body || !ID_OK.test(String(body.pessoa || ""))) return json(request, { error: "pessoa inválida" }, 400);
      if (!Array.isArray(body.eventos) || body.eventos.length === 0) return json(request, { error: "faltaram eventos" }, 400);
      if (body.eventos.length > MAX_EVENTOS) return json(request, { error: "lote com eventos demais" }, 413);

      const pessoa = body.pessoa;
      const nome = texto(body.nome, 80);
      const trilha = texto(body.trilha, 20);
      const agora = new Date().toISOString();

      const linhas = [];
      for (const e of body.eventos) {
        if (!e || TIPOS.indexOf(e.tipo) < 0) continue;
        const aula = Number.isInteger(e.aula) && e.aula >= 0 && e.aula < 500 ? e.aula : null;
        let detalhe = null;
        if (e.detalhe && typeof e.detalhe === "object") {
          const s = JSON.stringify(e.detalhe);
          detalhe = s.length <= 2000 ? s : null;
        }
        linhas.push([pessoa, quando(e.quando), e.tipo, texto(e.trilha, 20) || trilha, aula, texto(e.titulo, 160), detalhe]);
      }
      if (linhas.length === 0) return json(request, { error: "nenhum evento reconhecido" }, 400);

      const lote = [
        env.DB.prepare(
          `INSERT INTO pessoas (id, nome, trilha, criado, visto) VALUES (?1, ?2, ?3, ?4, ?4)
           ON CONFLICT(id) DO UPDATE SET
             nome = COALESCE(?2, pessoas.nome),
             trilha = COALESCE(?3, pessoas.trilha),
             visto = ?4`
        ).bind(pessoa, nome, trilha, agora),
      ];
      for (const l of linhas) {
        lote.push(env.DB.prepare(
          "INSERT INTO eventos (pessoa, quando, tipo, trilha, aula, titulo, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(...l));
      }
      await env.DB.batch(lote);
      return json(request, { ok: true, gravados: linhas.length });
    }

    // ---- GET /pessoas ----
    if (partes[0] === "pessoas" && partes.length === 1) {
      if (request.method !== "GET") return json(request, { error: "método não permitido" }, 405);
      const { results } = await env.DB.prepare(
        `SELECT p.id, p.nome, p.trilha, p.criado, p.visto,
                (SELECT COUNT(*) FROM eventos e WHERE e.pessoa = p.id) AS eventos,
                (SELECT COUNT(DISTINCT e.aula) FROM eventos e WHERE e.pessoa = p.id AND e.tipo = 'aula_concluiu') AS concluidas,
                (SELECT COUNT(DISTINCT e.aula) FROM eventos e WHERE e.pessoa = p.id AND e.tipo = 'aula_abriu') AS abertas,
                (SELECT COUNT(*) FROM eventos e WHERE e.pessoa = p.id AND e.tipo = 'video_assistido') AS videos,
                (SELECT COUNT(*) FROM eventos e WHERE e.pessoa = p.id AND e.tipo = 'quiz_tentativa') AS quizzes
         FROM pessoas p ORDER BY p.visto DESC`
      ).all();
      // Segundos somados fora do SQL: o valor mora dentro do JSON de detalhe.
      const { results: tempos } = await env.DB.prepare(
        "SELECT pessoa, detalhe FROM eventos WHERE tipo = 'tempo'"
      ).all();
      const soma = {};
      for (const t of tempos) {
        let s = 0;
        try { s = Number(JSON.parse(t.detalhe || "{}").segundos) || 0; } catch (e) { s = 0; }
        soma[t.pessoa] = (soma[t.pessoa] || 0) + s;
      }
      return json(request, results.map(function (r) {
        return { ...r, segundos: soma[r.id] || 0 };
      }));
    }

    // ---- GET /pessoas/:id ----
    if (partes[0] === "pessoas" && partes.length === 2) {
      if (request.method !== "GET") return json(request, { error: "método não permitido" }, 405);
      const id = partes[1];
      if (!ID_OK.test(id)) return json(request, { error: "id inválido" }, 400);
      const p = await env.DB.prepare("SELECT id, nome, trilha, criado, visto FROM pessoas WHERE id = ?").bind(id).first();
      if (!p) return json(request, { error: "não encontrado" }, 404);
      const { results } = await env.DB.prepare(
        "SELECT quando, tipo, trilha, aula, titulo, detalhe FROM eventos WHERE pessoa = ? ORDER BY quando DESC, id DESC LIMIT ?"
      ).bind(id, MAX_LISTA).all();
      return json(request, {
        pessoa: p,
        eventos: results.map(function (e) {
          let d = null;
          try { d = e.detalhe ? JSON.parse(e.detalhe) : null; } catch (x) { d = null; }
          return { quando: e.quando, tipo: e.tipo, trilha: e.trilha, aula: e.aula, titulo: e.titulo, detalhe: d };
        }),
      });
    }

    return json(request, { error: "rota inexistente" }, 404);
  },
};
