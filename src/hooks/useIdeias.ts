import { useState, useCallback } from 'react';
import { supabase, type Ideia, type IdeiaOrigem, type PerfilCriador } from '@/lib/supabase';
import { N8N_BASE_URL } from '@/lib/constants';

/* ── generic patch ── */
export async function updateIdeia(id: number, data: Partial<Ideia>) {
  return supabase.from('ideias').update(data as any).eq('id', id);
}

/* ── insert ── */
export async function createIdeia(data: {
  assunto_tema: string;
  plataforma: string;
  formato: string;
  observacoes?: string | null;
  data_postagem?: string | null;
  origem: IdeiaOrigem;
}) {
  return supabase
    .from('ideias')
    .insert({ ...data, status: 'Em andamento' })
    .select()
    .single();
}

/* ── upload video/imagem → Storage ── */
export async function uploadVideo(
  ideiaId: number | string,
  file: File,
  tipo: 'bruto' | 'editado' | 'imagem',
  onProgress?: (pct: number) => void,
): Promise<string> {
  const ext    = file.name.split('.').pop();
  const folder = tipo === 'imagem' ? 'imagens' : `videos-${tipo}`;
  const path   = `${folder}/${ideiaId}/${Date.now()}.${ext}`;
  const bucket = tipo === 'imagem' ? 'imagens' : 'videos';

  // simulate progress for UX (Supabase JS v2 doesn't expose upload progress natively)
  onProgress?.(10);
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  onProgress?.(100);
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/* ── N8N webhook ── */
export async function triggerGerarRoteiro(payload: {
  ideia_id: number;
  assunto_tema: string;
  plataforma: string;
  formato: string;
  observacoes?: string | null;
}) {
  try {
    await fetch(`${N8N_BASE_URL}/webhook/gerar-roteiro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencia: N8N pode não estar disponível em dev
  }
}

export async function triggerVideoUploaded(payload: {
  post_id: string;
  url_video: string;
  roteiro?: string | null;
  plataforma?: string | null;
}) {
  try {
    await fetch(`${N8N_BASE_URL}/webhook/video-uploaded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

/* ── useIdeias — só "Em andamento" ── */
export function useIdeias() {
  const [ideias, setIdeias]   = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ideias')
      .select('*')
      .eq('status', 'Em andamento')
      .order('created_at', { ascending: false });
    setIdeias(data ?? []);
    setLoading(false);
  }, []);

  return { ideias, setIdeias, loading, refetch: fetch };
}

/* ── usePosts ── */
export function usePosts() {
  const [posts, setPosts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*, ideias(assunto_tema, plataforma)')
      .order('created_at', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  return { posts, setPosts, loading, refetch: fetch };
}

/* ── usePerfilCriador ── */
export function usePerfilCriador() {
  const [perfil, setPerfil]   = useState<PerfilCriador | null>(null);
  const [ultimaIdeia, setUltimaIdeia] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    const [{ data: p }, { data: u }] = await Promise.all([
      supabase.from('perfil_criador').select('*').eq('ativo', true).limit(1).maybeSingle(),
      supabase.from('ideias').select('created_at').eq('origem', 'ia')
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPerfil(p ?? null);
    setUltimaIdeia(u?.created_at ?? null);
  }, []);

  return { perfil, ultimaIdeia, refetch: fetch };
}
