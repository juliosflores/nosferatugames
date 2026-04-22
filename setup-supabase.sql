-- =====================================================
-- Nosferatu Games — SQL para rodar no Supabase
-- SQL Editor → New Query → Cole tudo e clique Run
-- =====================================================

-- 1. Tabela de visitas
CREATE TABLE IF NOT EXISTS visitas (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  pagina      text        DEFAULT '/',
  referrer    text,
  pais        text,
  dispositivo text,        -- 'mobile' | 'desktop'
  produto_id  uuid,        -- preenchido quando cliente abre um produto
  produto_nome text
);

-- 2. RLS: qualquer um pode inserir (site público insere visitas)
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_visita" ON visitas
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "select_visita_admin" ON visitas
  FOR SELECT TO anon USING (true);

-- 3. Adicionar campo vendido e viewed_count na tabela produtos (se não existir)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS vendido      boolean DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS viewed_count integer DEFAULT 0;

-- 4. Função para incrementar visualizações de produto
CREATE OR REPLACE FUNCTION incrementar_views(pid uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE produtos SET viewed_count = COALESCE(viewed_count,0) + 1 WHERE id = pid;
$$;

-- Permissão para anon chamar a função
GRANT EXECUTE ON FUNCTION incrementar_views(uuid) TO anon;

-- =====================================================
-- PRONTO! Agora rode o deploy do site e o admin
-- funcionará com analytics em tempo real.
-- =====================================================
