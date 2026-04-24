import { useEffect, useState, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Post, type Plataforma } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Play, Eye, Heart, MessageCircle, Share2,
  TrendingUp, BarChart3, MousePointerClick, Upload,
  ExternalLink, CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlatformBadge, PlatformIcon } from '@/components/PlatformBadge';
import { MediaModal } from '@/components/VideoPlayer';
import { PLATAFORMAS, POST_STATUS_CONFIG } from '@/lib/constants';
import { uploadVideo, triggerVideoUploaded } from '@/hooks/useIdeias';

/* ── helpers ── */
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const fmtNum = (n?: number | null) => {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

const daysSince = (iso: string | null) => {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
};

type PostStatus = 'Aguardando vídeo' | 'Em edição' | 'Pronto' | 'Postado' | 'Aguardando métricas';

function resolveStatus(post: Post): PostStatus {
  if (post.status_aprovacao === 'Aprovado' && post.data_postagem) {
    if (!post.metricas_coletadas_em && daysSince(post.data_postagem) >= 7) return 'Aguardando métricas';
    return 'Postado';
  }
  // usar campo livre no assunto para pipeline (fallback: status_aprovacao)
  const raw = (post as any).pipeline_status as string | undefined;
  if (raw && POST_STATUS_CONFIG[raw]) return raw as PostStatus;
  return 'Aguardando vídeo';
}

/* ── Metric pill ── */
function MetricPill({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value?: number | null; label: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[11px] font-bold text-foreground">{fmtNum(value)}</span>
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
}

/* ── Inline metric form ── */
function MetricEditor({ post, onSaved }: { post: Post; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals]     = useState({
    impressoes:        post.impressoes        ?? 0,
    views:             post.views             ?? 0,
    likes:             post.likes             ?? 0,
    comentarios:       post.comentarios       ?? 0,
    compartilhamentos: post.compartilhamentos ?? 0,
    cliques_perfil:    post.cliques_perfil    ?? 0,
  });

  const fields: { key: keyof typeof vals; label: string }[] = [
    { key: 'impressoes',        label: 'Impressões'     },
    { key: 'views',             label: 'Views'          },
    { key: 'likes',             label: 'Curtidas'       },
    { key: 'comentarios',       label: 'Comentários'    },
    { key: 'compartilhamentos', label: 'Compart.'       },
    { key: 'cliques_perfil',    label: 'Cliques Perfil' },
  ];

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('posts')
      .update({ ...vals, metricas_coletadas_em: new Date().toISOString() })
      .eq('id', post.id);
    setSaving(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Métricas salvas!' });
    setOpen(false);
    onSaved();
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
        <BarChart3 className="w-3 h-3" /> Inserir métricas
      </button>
    );
  }

  return (
    <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border border-border/50">
      <div className="grid grid-cols-2 gap-1.5">
        {fields.map(f => (
          <div key={f.key} className="space-y-0.5">
            <label className="text-[9px] text-muted-foreground uppercase tracking-wide">{f.label}</label>
            <Input
              type="number"
              value={vals[f.key]}
              onChange={e => setVals(v => ({ ...v, [f.key]: Number(e.target.value) }))}
              className="h-6 text-xs px-1.5"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" className="flex-1 h-6 text-[10px]" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button size="sm" className="flex-1 h-6 text-[10px]" onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />} Salvar métricas
        </Button>
      </div>
    </div>
  );
}

/* ── Upload button with progress ── */
function UploadBtn({
  postId, tipo, label, onComplete,
}: {
  postId: string; tipo: 'bruto' | 'editado'; label: string;
  onComplete: (url: string) => void;
}) {
  const { toast } = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPct(0);
    try {
      const url = await uploadVideo(postId, file, tipo, p => setPct(p));
      onComplete(url);
      toast({ title: 'Vídeo enviado!', description: `Status atualizado.` });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setPct(null);
    }
  };

  return (
    <>
      <input ref={ref} type="file" accept="video/mp4,video/mov,video/*" className="hidden" onChange={handle} />
      <Button size="sm" variant="outline"
        className="h-7 px-2.5 text-[11px] gap-1 w-full"
        onClick={() => ref.current?.click()}
        disabled={pct !== null}
      >
        {pct !== null
          ? <><Loader2 className="w-3 h-3 animate-spin" /> {pct}%</>
          : <><Upload className="w-3 h-3" /> {label}</>
        }
      </Button>
      {pct !== null && (
        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
    </>
  );
}

/* ── Post Card ── */
function PostCard({ post, onViewMedia, onSaved }: {
  post: Post; onViewMedia: (url: string, type: 'video' | 'image') => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const status    = resolveStatus(post);
  const statusCfg = POST_STATUS_CONFIG[status];

  const hasVideo = !!post.url_video;
  const hasImage = !!post.url_imagem;
  const hasMedia = hasVideo || hasImage;

  const markPosted = async () => {
    await supabase.from('posts').update({
      status_aprovacao: 'Aprovado',
      data_postagem: new Date().toISOString(),
    }).eq('id', post.id);
    onSaved();
    toast({ title: 'Marcado como postado!' });
  };

  const handleVideoUploaded = async (url: string, tipo: 'bruto' | 'editado') => {
    const newStatus = tipo === 'bruto' ? 'Em edição' : 'Pronto';
    await supabase.from('posts').update({
      url_video: url,
      pipeline_status: newStatus,
    } as any).eq('id', post.id);
    if (tipo === 'bruto') {
      await triggerVideoUploaded({ post_id: post.id, url_video: url, roteiro: post.roteiro, plataforma: post.plataforma });
    }
    onSaved();
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col">
      {/* Status badge */}
      <div className="px-3.5 pt-3.5 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
        >
          <span>{statusCfg.icon}</span> {statusCfg.label}
        </span>
        <PlatformBadge platform={post.plataforma ?? 'LinkedIn'} size="sm" />
      </div>

      {/* Media thumbnail */}
      {hasMedia && (
        <button
          className="relative mx-3.5 mt-2.5 h-32 rounded-lg bg-black/40 overflow-hidden group shrink-0"
          onClick={() => onViewMedia(hasVideo ? post.url_video! : post.url_imagem!, hasVideo ? 'video' : 'image')}
        >
          {hasImage && (
            <img src={post.url_imagem!} alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          )}
          {hasVideo && !hasImage && (
            <div className="w-full h-full flex items-center justify-center bg-muted/40">
              <Play className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                <Play className="w-3.5 h-3.5 text-white ml-0.5" />
              </div>
            </div>
          )}
        </button>
      )}

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {/* Título */}
        <p className="text-[12px] text-foreground leading-relaxed line-clamp-2 flex-1">
          {post.assunto || post.conteudo_post}
        </p>

        {/* Data */}
        <p className="text-[10px] text-muted-foreground">{fmt(post.data_postagem ?? post.created_at)}</p>

        {/* Métricas (se postado) */}
        {(status === 'Postado' || status === 'Aguardando métricas') && (
          <div className="flex items-center gap-1 pt-1 border-t border-border/40">
            <MetricPill icon={Eye}               value={post.impressoes}        label="Imp."  color="#6366f1" />
            <MetricPill icon={Play}              value={post.views}             label="Views" color="#3b82f6" />
            <MetricPill icon={Heart}             value={post.likes}             label="Likes" color="#ec4899" />
            <MetricPill icon={MessageCircle}     value={post.comentarios}       label="Comt." color="#f59e0b" />
            <MetricPill icon={Share2}            value={post.compartilhamentos} label="Comp." color="#10b981" />
            <MetricPill icon={MousePointerClick} value={post.cliques_perfil}    label="Cliq." color="#8b5cf6" />
          </div>
        )}

        {/* Ações contextuais por status */}
        <div className="space-y-1.5">

          {/* Aguardando vídeo */}
          {status === 'Aguardando vídeo' && (
            <UploadBtn
              postId={post.id}
              tipo="bruto"
              label="Subir vídeo bruto"
              onComplete={url => handleVideoUploaded(url, 'bruto')}
            />
          )}

          {/* Em edição */}
          {status === 'Em edição' && (
            <>
              <p className="text-[10px] text-muted-foreground">Editor notificado. Aguardando vídeo editado.</p>
              <UploadBtn
                postId={post.id}
                tipo="editado"
                label="Subir vídeo editado"
                onComplete={url => handleVideoUploaded(url, 'editado')}
              />
            </>
          )}

          {/* Pronto */}
          {status === 'Pronto' && (
            <div className="flex gap-1.5">
              <Button size="sm"
                className="flex-1 h-7 text-[11px] gap-1 bg-green-600 hover:bg-green-500 text-white"
                onClick={markPosted}
              >
                <CheckCircle2 className="w-3 h-3" /> Marcar como postado
              </Button>
              {post.url_video && (
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-[11px] gap-1"
                  onClick={() => window.open(post.url_video!, '_blank')}>
                  <ExternalLink className="w-3 h-3" /> Ver vídeo
                </Button>
              )}
            </div>
          )}

          {/* Aguardando métricas */}
          {status === 'Aguardando métricas' && (
            <MetricEditor post={post} onSaved={onSaved} />
          )}

          {/* Postado com métricas coletadas */}
          {status === 'Postado' && post.metricas_coletadas_em && (
            <MetricEditor post={post} onSaved={onSaved} />
          )}

          {/* Score de performance */}
          {(post as any).score_performance != null && (status === 'Postado' || status === 'Aguardando métricas') && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <TrendingUp className="w-3 h-3 text-primary" />
              Score: <span className="font-bold text-foreground">{(post as any).score_performance}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
const STATUS_FILTERS = ['Todos', 'Aguardando vídeo', 'Em edição', 'Pronto', 'Postado'] as const;

const PostsPage = () => {
  const { toast } = useToast();
  const [posts, setPosts]           = useState<Post[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterPlat, setFilterPlat] = useState<string>('all');
  const [mediaUrl, setMediaUrl]     = useState('');
  const [mediaType, setMediaType]   = useState<'video' | 'image'>('image');
  const [mediaOpen, setMediaOpen]   = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const viewMedia = (url: string, type: 'video' | 'image') => {
    setMediaUrl(url); setMediaType(type); setMediaOpen(true);
  };

  const platformKeys = Object.keys(PLATAFORMAS) as Plataforma[];

  const filtered = posts.filter(p => {
    const statusMatch = filterStatus === 'Todos' || resolveStatus(p) === filterStatus;
    const platMatch   = filterPlat === 'all' || p.plataforma === filterPlat;
    return statusMatch && platMatch;
  });

  /* ── summary ── */
  const totalImps   = posts.reduce((s, p) => s + (p.impressoes ?? 0), 0);
  const totalViews  = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalLikes  = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
  const totalShares = posts.reduce((s, p) => s + (p.compartilhamentos ?? 0), 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {mediaOpen && <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaOpen(false)} />}

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Posts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{posts.length} posts no pipeline</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Impressões', value: fmtNum(totalImps),   icon: Eye,         color: '#6366f1' },
            { label: 'Views',      value: fmtNum(totalViews),  icon: Play,        color: '#3b82f6' },
            { label: 'Curtidas',   value: fmtNum(totalLikes),  icon: Heart,       color: '#ec4899' },
            { label: 'Compart.',   value: fmtNum(totalShares), icon: TrendingUp,  color: '#10b981' },
          ].map(kpi => (
            <div key={kpi.label} className="glass-card rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: kpi.color + '20' }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtro por status */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => {
            const cfg = s !== 'Todos' ? POST_STATUS_CONFIG[s] : null;
            const active = filterStatus === s;
            return (
              <button key={s}
                onClick={() => setFilterStatus(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  active
                    ? 'border-transparent text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                style={active && cfg ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' } : active ? { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', borderColor: 'transparent' } : {}}
              >
                {cfg && <span>{cfg.icon}</span>}
                {s}
                <span className="text-[10px] opacity-70">
                  ({s === 'Todos' ? posts.length : posts.filter(p => resolveStatus(p) === s).length})
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtro por plataforma */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterPlat('all')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all border ${
              filterPlat === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            Todas
          </button>
          {platformKeys.map(p => {
            const count = posts.filter(x => x.plataforma === p).length;
            if (!count) return null;
            const cfg = PLATAFORMAS[p];
            const active = filterPlat === p;
            return (
              <button key={p} onClick={() => setFilterPlat(p)}
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-all border ${
                  active ? 'border-transparent' : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                style={active ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' } : {}}
              >
                <PlatformIcon platform={p} size={11} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl gap-2">
            <TrendingUp className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum post nesse filtro</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(post => (
              <PostCard key={post.id} post={post} onViewMedia={viewMedia} onSaved={fetchPosts} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PostsPage;
