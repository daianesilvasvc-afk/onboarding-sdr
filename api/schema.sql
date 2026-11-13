-- Registro de uso da Trilha de Onboarding (GitHub Pages).
-- A pagina e estatica; este banco e o unico lugar onde o uso fica salvo.

CREATE TABLE IF NOT EXISTS pessoas (
  id      TEXT PRIMARY KEY,   -- id do navegador, gerado na primeira visita
  nome    TEXT,               -- digitado uma vez pela pessoa
  trilha  TEXT,               -- ultima trilha aberta (comercial / farmer)
  criado  TEXT NOT NULL,      -- ISO, UTC
  visto   TEXT NOT NULL       -- ISO, UTC, ultimo evento recebido
);

CREATE TABLE IF NOT EXISTS eventos (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  pessoa  TEXT NOT NULL,
  quando  TEXT NOT NULL,      -- ISO, UTC, hora do clique no navegador
  tipo    TEXT NOT NULL,      -- entrou, aula_abriu, video_abriu, ...
  trilha  TEXT,
  aula    INTEGER,            -- indice da aula na trilha, 0 based
  titulo  TEXT,               -- nome da aula, congelado: a trilha muda com o tempo
  detalhe TEXT                -- JSON com o resto (nota do quiz, segundos, url do video)
);

CREATE INDEX IF NOT EXISTS idx_eventos_pessoa ON eventos (pessoa, quando);
CREATE INDEX IF NOT EXISTS idx_eventos_quando ON eventos (quando);
