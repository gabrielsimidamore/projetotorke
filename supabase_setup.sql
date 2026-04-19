-- ============================================================
-- PROJETOTORKE — SETUP COMPLETO DO BANCO DE DADOS
-- Execute no Supabase Dashboard > SQL Editor
-- Projeto: pirlajhqenegpedomnug
-- ============================================================

-- 1. PROJETOS
-- ============================================================
CREATE TABLE IF NOT EXISTS projetos (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          TEXT        NOT NULL,
  descricao     TEXT,
  cor           TEXT        DEFAULT '#F5A623',
  foto_url      TEXT,
  status        TEXT        NOT NULL DEFAULT 'ativo'
                CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  ordem         INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo        TEXT,
  descricao     TEXT        NOT NULL,
  valor_unit    NUMERIC(12,2) DEFAULT 0,
  unidade       TEXT        DEFAULT 'un',
  estoque       INTEGER     DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome          TEXT        NOT NULL,
  empresa       TEXT        NOT NULL DEFAULT '',
  telefone      TEXT        NOT NULL DEFAULT '',
  email         TEXT        NOT NULL DEFAULT '',
  segmento      TEXT        NOT NULL DEFAULT '',
  cargo         TEXT,
  cidade        TEXT,
  estado        TEXT,
  cnpj          TEXT,
  observacoes   TEXT,
  status        TEXT        DEFAULT 'ativo',
  projeto_id    UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INTERAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS interacoes (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id          UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  projeto_id          UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  canal               TEXT        NOT NULL
                      CHECK (canal IN ('email','whatsapp','linkedin','ligacao','presencial','instagram')),
  mensagem            TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('respondido','pendente','aberto','resolvido','aguardando','concluido','em_executar','aprovado')),
  proxima_acao        TEXT,
  data_proxima_acao   TIMESTAMPTZ,
  data_interacao      TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 5. IDEIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS ideias (
  id                BIGSERIAL   PRIMARY KEY,
  assunto_tema      TEXT        NOT NULL,
  formato           TEXT        NOT NULL,
  observacoes       TEXT,
  roteiro           TEXT,
  url_video         TEXT,
  imagem_url        TEXT,
  motivo_rejeicao   TEXT,
  status            TEXT        NOT NULL DEFAULT 'Em andamento'
                    CHECK (status IN ('Em andamento','Aprovado','Rejeitado','Concluído')),
  data_uso          DATE,
  plataforma        TEXT        NOT NULL DEFAULT 'Instagram',
  data_postagem     TIMESTAMPTZ,
  data_cadastro     TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PUBLICAÇÕES STAGED
-- ============================================================
CREATE TABLE IF NOT EXISTS publicacoes_staged (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ideia_id          BIGINT      REFERENCES ideias(id) ON DELETE CASCADE,
  plataforma        TEXT        NOT NULL,
  conteudo_gerado   TEXT,
  hashtags          TEXT,
  url_imagem        TEXT,
  url_video         TEXT,
  roteiro           TEXT,
  status            TEXT        NOT NULL DEFAULT 'Em andamento'
                    CHECK (status IN ('Em andamento','Aprovado','Rejeitado')),
  motivo_rejeicao   TEXT,
  projeto_id        UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  data_postagem     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  ideia_id          BIGINT      REFERENCES ideias(id) ON DELETE SET NULL,
  assunto           TEXT        NOT NULL DEFAULT '',
  conteudo_post     TEXT        NOT NULL DEFAULT '',
  hashtags          TEXT,
  status_aprovacao  TEXT        NOT NULL DEFAULT 'Rascunho'
                    CHECK (status_aprovacao IN ('Rascunho','Revisão','Aprovado','Rejeitado','Publicado')),
  data_aprovacao    TIMESTAMPTZ,
  data_postagem     TIMESTAMPTZ,
  modo_imagem       TEXT        NOT NULL DEFAULT 'sem_imagem'
                    CHECK (modo_imagem IN ('sem_imagem','gerar_ia','minha_foto')),
  url_imagem        TEXT,
  url_video         TEXT,
  roteiro           TEXT,
  plataforma        TEXT,
  formato           TEXT,
  projeto_id        UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  linkedin_post_id  TEXT,
  impressoes        INTEGER     DEFAULT 0,
  views             INTEGER     DEFAULT 0,
  likes             INTEGER     DEFAULT 0,
  comentarios       INTEGER     DEFAULT 0,
  compartilhamentos INTEGER     DEFAULT 0,
  cliques_perfil    INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MÉTRICAS
-- ============================================================
CREATE TABLE IF NOT EXISTS metricas (
  id                    BIGSERIAL   PRIMARY KEY,
  id_post               UUID        REFERENCES posts(id) ON DELETE SET NULL,
  assunto               TEXT,
  data_post             DATE,
  horario               TEXT,
  formato               TEXT,
  impressoes            INTEGER     DEFAULT 0,
  views                 INTEGER     DEFAULT 0,
  likes                 INTEGER     DEFAULT 0,
  comentarios           INTEGER     DEFAULT 0,
  compartilhamentos     INTEGER     DEFAULT 0,
  cliques_perfil        INTEGER     DEFAULT 0,
  score_performance     NUMERIC(5,2),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 9. RECOMENDAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS recomendacoes (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  assunto_sugerido    TEXT        NOT NULL,
  formato_sugerido    TEXT        NOT NULL,
  justificativa_ia    TEXT,
  horario_sugerido    TEXT,
  gerado_em           TIMESTAMPTZ DEFAULT NOW(),
  status              TEXT        NOT NULL DEFAULT 'Pendente'
                      CHECK (status IN ('Pendente','Aprovado','Rejeitado')),
  motivo_rejeicao     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PEDIDOS / VENDAS
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_pedido     TEXT,
  cliente_id        UUID        NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  produto_id        UUID        REFERENCES produtos(id) ON DELETE SET NULL,
  data              DATE,
  qtd               INTEGER,
  data_emissao      DATE,
  data_vencimento   DATE,
  total             NUMERIC(12,2),
  desconto          NUMERIC(12,2) DEFAULT 0,
  status            TEXT        DEFAULT 'pendente'
                    CHECK (status IN ('pendente','aprovado','cancelado','entregue','faturado')),
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 11. REUNIÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS reunioes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo          TEXT        NOT NULL,
  data            DATE        NOT NULL,
  horario_inicio  TEXT        NOT NULL,
  horario_fim     TEXT,
  local           TEXT,
  tipo            TEXT        NOT NULL DEFAULT 'interna'
                  CHECK (tipo IN ('interna','cliente','parceiro','outro')),
  assunto         TEXT        NOT NULL DEFAULT '',
  pauta           TEXT,
  ata             TEXT,
  participantes   TEXT,
  status          TEXT        NOT NULL DEFAULT 'agendada'
                  CHECK (status IN ('agendada','realizada','cancelada')),
  projeto_id      UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 12. NOTIFICAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo      TEXT        NOT NULL,
  mensagem    TEXT,
  tipo        TEXT        DEFAULT 'info',
  lida        BOOLEAN     DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ATIVIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS atividades (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade_tipo   TEXT        NOT NULL,
  entidade_id     TEXT        NOT NULL,
  acao            TEXT        NOT NULL,
  descricao       TEXT,
  usuario_email   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CUSTOS DE PROJETO
-- ============================================================
CREATE TABLE IF NOT EXISTS custos_projeto (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id  UUID        NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  descricao   TEXT        NOT NULL,
  valor       NUMERIC(12,2) NOT NULL,
  categoria   TEXT        NOT NULL,
  data        DATE        NOT NULL,
  tipo        TEXT        NOT NULL DEFAULT 'despesa'
              CHECK (tipo IN ('despesa','receita')),
  observacoes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 15. MÉTRICAS DE PROJETO
-- ============================================================
CREATE TABLE IF NOT EXISTS projeto_metricas (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  projeto_id  UUID        NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  nome        TEXT        NOT NULL,
  valor       NUMERIC(14,4) NOT NULL,
  unidade     TEXT        NOT NULL,
  meta        NUMERIC(14,4),
  data        DATE        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  FOREACH tbl IN ARRAY ARRAY['projetos','clientes','interacoes','ideias',
    'publicacoes_staged','posts','pedidos','reunioes']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON %1$s;
       CREATE TRIGGER trg_updated_at_%1$s
         BEFORE UPDATE ON %1$s
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_clientes_projeto   ON clientes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente ON interacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_projeto ON interacoes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ideias_status      ON ideias(status);
CREATE INDEX IF NOT EXISTS idx_ideias_plataforma  ON ideias(plataforma);
CREATE INDEX IF NOT EXISTS idx_pub_staged_status  ON publicacoes_staged(status);
CREATE INDEX IF NOT EXISTS idx_pub_staged_ideia   ON publicacoes_staged(ideia_id);
CREATE INDEX IF NOT EXISTS idx_posts_plataforma   ON posts(plataforma);
CREATE INDEX IF NOT EXISTS idx_posts_projeto      ON posts(projeto_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente    ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_data      ON reunioes(data);
CREATE INDEX IF NOT EXISTS idx_reunioes_projeto   ON reunioes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida  ON notificacoes(lida);

-- ============================================================
-- RLS — Row Level Security (autenticados podem tudo)
-- ============================================================
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['projetos','produtos','clientes','interacoes',
    'ideias','publicacoes_staged','posts','metricas','recomendacoes',
    'pedidos','reunioes','notificacoes','atividades','custos_projeto','projeto_metricas']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format(
      'DROP POLICY IF EXISTS "allow_authenticated" ON %I;
       CREATE POLICY "allow_authenticated" ON %I
         FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- FIM DO SETUP
-- ============================================================
