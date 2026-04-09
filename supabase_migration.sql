-- =============================================================
-- AUTO-PEAK-FLOW — MIGRATION COMPLETA
-- Execute no Supabase Dashboard > SQL Editor
-- =============================================================

-- 1. MODIFICAR TABELA ideias
-- =============================================================
ALTER TABLE ideias
  ADD COLUMN IF NOT EXISTS roteiro          TEXT,
  ADD COLUMN IF NOT EXISTS url_video        TEXT,
  ADD COLUMN IF NOT EXISTS imagem_url       TEXT,
  ADD COLUMN IF NOT EXISTS motivo_rejeicao  TEXT;

-- Renomear data_cadastro para created_at se não existir
-- (manter data_cadastro como alias)

-- Garantir que plataforma aceita os novos valores capitalizados
-- (campo TEXT livre, validação no frontend)

-- Remover status Pendente atualizando registros existentes
UPDATE ideias SET status = 'Em andamento' WHERE status = 'Pendente';

-- 2. CRIAR TABELA publicacoes_staged
-- =============================================================
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
                    CHECK (status IN ('Em andamento', 'Aprovado', 'Rejeitado')),
  motivo_rejeicao   TEXT,
  projeto_id        UUID        REFERENCES projetos(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at para publicacoes_staged
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_publicacoes_staged_updated_at ON publicacoes_staged;
CREATE TRIGGER update_publicacoes_staged_updated_at
  BEFORE UPDATE ON publicacoes_staged
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. REESTRUTURAR TABELA posts
-- =============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS url_video         TEXT,
  ADD COLUMN IF NOT EXISTS roteiro           TEXT,
  ADD COLUMN IF NOT EXISTS plataforma        TEXT,
  ADD COLUMN IF NOT EXISTS formato           TEXT,
  ADD COLUMN IF NOT EXISTS projeto_id        UUID REFERENCES projetos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_postagem     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ideia_id          BIGINT REFERENCES ideias(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS impressoes        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes             INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comentarios       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compartilhamentos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cliques_perfil    INTEGER DEFAULT 0;

-- 4. RLS POLICIES para publicacoes_staged
-- =============================================================
ALTER TABLE publicacoes_staged ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON publicacoes_staged;
CREATE POLICY "Allow all for authenticated"
  ON publicacoes_staged FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. STORAGE BUCKET para vídeos (execute se não existir)
-- =============================================================
-- No Supabase Dashboard > Storage > New Bucket
-- Nome: "videos" — Public: true
-- Ou via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload de vídeos
DROP POLICY IF EXISTS "Allow upload videos" ON storage.objects;
CREATE POLICY "Allow upload videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow read videos" ON storage.objects;
CREATE POLICY "Allow read videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

DROP POLICY IF EXISTS "Allow delete videos" ON storage.objects;
CREATE POLICY "Allow delete videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- 6. ÍNDICES para performance
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_ideias_status     ON ideias(status);
CREATE INDEX IF NOT EXISTS idx_ideias_plataforma ON ideias(plataforma);
CREATE INDEX IF NOT EXISTS idx_pub_staged_status ON publicacoes_staged(status);
CREATE INDEX IF NOT EXISTS idx_pub_staged_ideia  ON publicacoes_staged(ideia_id);
CREATE INDEX IF NOT EXISTS idx_posts_plataforma  ON posts(plataforma);
CREATE INDEX IF NOT EXISTS idx_posts_projeto     ON posts(projeto_id);

-- =============================================================
-- FIM DA MIGRATION
-- =============================================================
