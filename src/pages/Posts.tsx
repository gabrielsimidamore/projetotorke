import { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Post, type Plataforma } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Play, Eye, Heart, MessageCircle, Share2, TrendingUp, BarChart3, MousePointerClick, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlatformBadge, PlatformIcon } from '@/components/PlatformBadge';
import { MediaModal } from '@/components/VideoPlayer';
import { PLATAFORMAS } from '@/lib/constants';

/* ── helpers ── */
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

const fmtNum = (n?: number | null) => {
  if (!n) return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
};

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

/* ── Inline metric editor ── */
function MetricEditor({ post, onSaved }: { post: Post; onSaved: () => void }) {
  const { toast } = useToast();
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals]   = useState({
    impressoes:       post.impressoes ?? 0,
    views:            post.views ?? 0,
    likes:            post.likes ?? 0,
    comentarios:      post.comentarios ?? 0,
    compartilhamentos:post.compartilhamentos ?? 0,
    cliques_perfil:   post.cliques_perfil ?? 0,
  });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('posts').update(vals).eq('id', post.id);
    setSaving(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Métricas salvas!' });
    setOpen(false);
    onSaved();
  };

  const fields: { key: keyof typeof vals; label: string }[] = [
    { key: 'impressoes',       label: 'Impressões'    },
    { key: 'views',            label: 'Views'         },
    { key: 'likes',            label: 'Curtidas'      },
    { key: 'comentarios',      label: 'Comentários'   },
    { key: 'compartilhamentos',label: 'Compart.'      },
    { key: 'cliques_perfil',   label: 'Cliques Perfil'},
  ];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
      >
        <BarChart3 className="w-3 h-3" /> Editar métricas
      </button>
    );
  }

  return (
    <div className="space-y-2 p-2 rounded-lg bg-muted/40 border border-border/50">
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
          {saving && <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />} Salvar
        </Button>
      </div>
    </div>
  );
}

/* ── Post Card ── */
function PostCard({ post, onViewMedia, onSaved }: {
  post: Post; onViewMedia: (url: string, type: 'video' | 'image') => void; onSaved: () => void;
}) {
  const hasVideo = !!post.url_video;
  const hasImage = !!post.url_imagem;
  const hasMedia = hasVideo || hasImage;

  return (
    <div className="glass-card rounded-xl overflow-hidden flex flex-col">
      {/* Media thumbnail */}
      {hasMedia && (
        <button
          className="relative w-full h-36 bg-black/40 overflow-hidden group shrink-0"
          onClick={() => onViewMedia(
            hasVideo ? post.url_video! : post.url_imagem!,
            hasVideo ? 'video' : 'image',
          )}
        >
          {hasImage && (
            <img
              src={post.url_imagem!}
              alt=""
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {hasVideo && !hasImage && (
            <div className="w-full h-full flex items-center justify-center bg-muted/40">
              <Play className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          {hasVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                <Play className="w-4 h-4 text-white ml-0.5" />
              </div>
            </div>
          )}
          {!hasVideo && hasImage && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-6 h-6 text-white" />
            </div>
          )}
        </button>
      )}

      {/* Content */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        {/* Platform + date */}
        <div className="flex items-center justify-between gap-2">
          <PlatformBadge platform={post.plataforma ?? 'LinkedIn'} size="sm" />
          <span className="text-[10px] text-muted-foreground">{fmt(post.data_postagem)}</span>
        </div>

        {/* Conteudo */}
        <p className="text-[12px] text-foreground leading-relaxed line-clamp-3 flex-1">
          {post.conteudo_post || post.assunto}
        </p>

        {/* Hashtags */}
        {post.hashtags && (
          <p className="text-[10px] text-primary/80 line-clamp-1">{post.hashtags}</p>
        )}

        {/* Formato */}
        {post.formato && (
          <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-muted/60 text-muted-foreground uppercase tracking-wide">
            {post.formato}
          </span>
        )}

        {/* Metrics bar */}
        <div className="flex items-center gap-1 pt-1 border-t border-border/40">
          <MetricPill icon={Eye}               value={post.impressoes}       label="Imp."  color="#6366f1" />
          <MetricPill icon={Play}              value={post.views}            label="Views" color="#3b82f6" />
          <MetricPill icon={Heart}             value={post.likes}            label="Likes" color="#ec4899" />
          <MetricPill icon={MessageCircle}     value={post.comentarios}      label="Comt." color="#f59e0b" />
          <MetricPill icon={Share2}            value={post.compartilhamentos} label="Comp." color="#10b981" />
          <MetricPill icon={MousePointerClick} value={post.cliques_perfil}   label="Cliq." color="#8b5cf6" />
        </div>

        {/* Edit metrics */}
        <MetricEditor post={post} onSaved={onSaved} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
const PostsPage = () => {
  const { toast } = useToast();
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterPlat, setFilterPlat] = useState<string>('all');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [mediaOpen, setMediaOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('data_postagem', { ascending: false });
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const viewMedia = (url: string, type: 'video' | 'image') => {
    setMediaUrl(url); setMediaType(type); setMediaOpen(true);
  };

  const platformKeys = Object.keys(PLATAFORMAS) as Plataforma[];

  const filtered = filterPlat === 'all'
    ? posts
    : posts.filter(p => p.plataforma === filterPlat);

  /* ── summary metrics ── */
  const totalImps   = posts.reduce((s, p) => s + (p.impressoes ?? 0), 0);
  const totalLikes  = posts.reduce((s, p) => s + (p.likes ?? 0), 0);
  const totalViews  = posts.reduce((s, p) => s + (p.views ?? 0), 0);
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
      {mediaOpen && (
        <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaOpen(false)} />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Posts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{posts.length} posts publicados</p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Impressões',    value: fmtNum(totalImps),   icon: Eye,               color: '#6366f1' },
            { label: 'Views',         value: fmtNum(totalViews),  icon: Play,              color: '#3b82f6' },
            { label: 'Curtidas',      value: fmtNum(totalLikes),  icon: Heart,             color: '#ec4899' },
            { label: 'Compart.',      value: fmtNum(totalShares), icon: TrendingUp,        color: '#10b981' },
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

        {/* Platform filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <button
            onClick={() => setFilterPlat('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
              filterPlat === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            Todos ({posts.length})
          </button>
          {platformKeys.map(p => {
            const count = posts.filter(x => x.plataforma === p).length;
            if (!count) return null;
            const cfg = PLATAFORMAS[p];
            const active = filterPlat === p;
            return (
              <button
                key={p}
                onClick={() => setFilterPlat(p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  active ? 'border-transparent' : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                style={active ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color + '40' } : {}}
              >
                <PlatformIcon platform={p} size={12} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl gap-2">
            <TrendingUp className="w-6 h-6 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum post ainda</p>
            <p className="text-xs text-muted-foreground">Conclua ideias para movê-las para cá</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onViewMedia={viewMedia}
                onSaved={fetchPosts}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PostsPage;
