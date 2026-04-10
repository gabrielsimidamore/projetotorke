import { useEffect, useState, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Ideia, type PublicacaoStaged, type Plataforma } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Loader2, FileText, Upload, Check, X, AlertCircle,
  Play, MoreHorizontal, Eye, Pencil, Trash2, Video, Image as ImageIcon,
  Calendar, Hash, ChevronRight, AlignLeft, Layers,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlatformBadge, PlatformIcon } from '@/components/PlatformBadge';
import { RoteirDrawer } from '@/components/RoteirDrawer';
import { MediaModal } from '@/components/VideoPlayer';
import { PLATAFORMAS, FORMATO_POR_PLATAFORMA, IDEIA_STATUS_CONFIG, STAGED_STATUS_CONFIG } from '@/lib/constants';

/* ── helpers ── */
const KANBAN_COLS = ['Em andamento', 'Aprovado', 'Rejeitado'] as const;
type KanbanStatus = typeof KANBAN_COLS[number];

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

const platformKeys = Object.keys(PLATAFORMAS) as Plataforma[];

/* ══════════════════════════════════════════════
   IdeiaCard
══════════════════════════════════════════════ */
interface IdeiaCardProps {
  ideia: Ideia;
  onOpenRoteiro: (i: Ideia) => void;
  onApprove: (i: Ideia) => void;
  onReject: (i: Ideia) => void;
  onConclude: (i: Ideia) => void;
  onUploadVideo: (i: Ideia) => void;
  onViewMedia: (url: string, type: 'video' | 'image') => void;
  onEdit: (i: Ideia) => void;
  onDelete: (i: Ideia) => void;
  uploadingId: number | null;
}

function IdeiaCard({
  ideia, onOpenRoteiro, onApprove, onReject, onConclude,
  onUploadVideo, onViewMedia, onEdit, onDelete, uploadingId,
}: IdeiaCardProps) {
  const cfg = PLATAFORMAS[ideia.plataforma as Plataforma];
  const borderColor = cfg?.color ?? '#6366f1';
  const statusCfg = IDEIA_STATUS_CONFIG[ideia.status as keyof typeof IDEIA_STATUS_CONFIG];
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="glass-card rounded-xl p-3.5 space-y-2.5 cursor-default"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 flex-1">
          {ideia.assunto_tema}
        </p>
        <div className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-6 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[130px] text-xs">
                <button onClick={() => { onEdit(ideia); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-foreground">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => { onDelete(ideia); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-accent text-destructive">
                  <Trash2 className="w-3 h-3" /> Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <PlatformBadge platform={ideia.plataforma} size="sm" />
        {ideia.formato && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground">
            {ideia.formato}
          </span>
        )}
        {statusCfg && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {ideia.status}
          </span>
        )}
      </div>

      {/* Observations */}
      {ideia.observacoes && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {ideia.observacoes}
        </p>
      )}

      {/* Reject reason */}
      {ideia.status === 'Rejeitado' && ideia.motivo_rejeicao && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/8 border border-destructive/20">
          <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive leading-relaxed">{ideia.motivo_rejeicao}</p>
        </div>
      )}

      {/* Video thumbnail */}
      {ideia.url_video && (
        <button
          onClick={() => onViewMedia(ideia.url_video!, 'video')}
          className="relative w-full h-20 rounded-lg overflow-hidden bg-black/60 flex items-center justify-center group border border-border/50"
        >
          <Play className="w-8 h-8 text-white/80 group-hover:text-white transition-colors" />
          <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
            Vídeo
          </span>
        </button>
      )}

      {/* Imagem thumbnail */}
      {ideia.imagem_url && !ideia.url_video && (
        <button
          onClick={() => onViewMedia(ideia.imagem_url!, 'image')}
          className="relative w-full h-20 rounded-lg overflow-hidden border border-border/50 group"
        >
          <img src={ideia.imagem_url} alt="mídia" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      )}

      {/* Date */}
      {ideia.data_uso && (
        <p className="text-[10px] text-muted-foreground">{fmt(ideia.data_uso)}</p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 pt-0.5 flex-wrap">
        {/* Roteiro — always available */}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => onOpenRoteiro(ideia)}
        >
          <FileText className="w-3 h-3" />
          {ideia.roteiro ? 'Roteiro' : 'Ver roteiro'}
        </Button>

        {ideia.status === 'Em andamento' && (
          <>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-primary"
              onClick={() => onUploadVideo(ideia)}
              disabled={uploadingId === ideia.id}
            >
              {uploadingId === ideia.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Upload className="w-3 h-3" />}
              {ideia.plataforma === 'LinkedIn' ? 'Foto' : 'Vídeo'}
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-green-500 hover:text-green-400 hover:bg-green-500/10"
              onClick={() => onApprove(ideia)}
            >
              <Check className="w-3 h-3" /> Aprovar
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onReject(ideia)}
            >
              <X className="w-3 h-3" /> Rejeitar
            </Button>
          </>
        )}

        {ideia.status === 'Aprovado' && (
          <>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-primary"
              onClick={() => onUploadVideo(ideia)}
              disabled={uploadingId === ideia.id}
            >
              {uploadingId === ideia.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : ideia.plataforma === 'LinkedIn' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
              Subir arquivo
            </Button>
            <Button size="sm"
              className="h-7 px-2 text-[11px] gap-1 bg-primary/90 hover:bg-primary"
              onClick={() => onConclude(ideia)}
            >
              <Check className="w-3 h-3" /> Concluir
            </Button>
          </>
        )}

        {ideia.status === 'Rejeitado' && (
          <Button size="sm" variant="ghost"
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onApprove(ideia)}
          >
            <Check className="w-3 h-3" /> Reativar
          </Button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   StagedCard
══════════════════════════════════════════════ */
interface StagedCardProps {
  item: PublicacaoStaged;
  onApprove: (i: PublicacaoStaged) => void;
  onReject: (i: PublicacaoStaged) => void;
  onConclude: (i: PublicacaoStaged) => void;
  onViewMedia: (url: string, type: 'video' | 'image') => void;
  onOpenDetail: (i: PublicacaoStaged) => void;
}

function StagedCard({ item, onApprove, onReject, onConclude, onViewMedia, onOpenDetail }: StagedCardProps) {
  const cfg = PLATAFORMAS[item.plataforma as Plataforma];
  const borderColor = cfg?.color ?? '#6366f1';
  const statusCfg = STAGED_STATUS_CONFIG[item.status as keyof typeof STAGED_STATUS_CONFIG];

  return (
    <div
      className="glass-card rounded-xl p-3.5 space-y-2.5 cursor-pointer"
      style={{ borderLeft: `3px solid ${borderColor}` }}
      onClick={() => onOpenDetail(item)}
    >
      <div className="flex items-center gap-2">
        <PlatformBadge platform={item.plataforma} size="sm" />
        {statusCfg && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {item.status}
          </span>
        )}
      </div>

      {item.conteudo_gerado && (
        <p className="text-[12px] text-foreground leading-relaxed line-clamp-4 whitespace-pre-wrap">
          {item.conteudo_gerado}
        </p>
      )}

      {item.hashtags && (
        <p className="text-[11px] text-primary/80 line-clamp-1">{item.hashtags}</p>
      )}

      {item.url_imagem && (
        <button
          onClick={() => onViewMedia(item.url_imagem!, 'image')}
          className="relative w-full h-24 rounded-lg overflow-hidden border border-border/50 group"
        >
          <img src={item.url_imagem} alt="staged" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </button>
      )}

      {item.url_video && (
        <button
          onClick={() => onViewMedia(item.url_video!, 'video')}
          className="w-full h-16 rounded-lg bg-black/50 flex items-center justify-center border border-border/50 gap-2 hover:bg-black/70 transition-colors"
        >
          <Play className="w-5 h-5 text-white" />
          <span className="text-xs text-white/70">Assistir vídeo</span>
        </button>
      )}

      {item.motivo_rejeicao && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-destructive/8 border border-destructive/20">
          <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <p className="text-[11px] text-destructive">{item.motivo_rejeicao}</p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">{fmt(item.created_at)}</p>

      <div className="flex gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
        {item.status === 'Em andamento' && (
          <>
            <Button size="sm"
              className="h-7 px-2 text-[11px] gap-1 bg-green-600 hover:bg-green-500 text-white flex-1"
              onClick={() => onApprove(item)}
            >
              <Check className="w-3 h-3" /> Aprovar
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10 flex-1"
              onClick={() => onReject(item)}
            >
              <X className="w-3 h-3" /> Rejeitar
            </Button>
          </>
        )}
        {item.status === 'Aprovado' && (
          <>
            <Button size="sm"
              className="h-7 px-2 text-[11px] gap-1 flex-1"
              onClick={() => onConclude(item)}
            >
              <Check className="w-3 h-3" /> Concluir
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => onReject(item)}
            >
              <X className="w-3 h-3" /> Rejeitar
            </Button>
          </>
        )}
        {item.status === 'Rejeitado' && (
          <Button size="sm" variant="ghost"
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onApprove(item)}
          >
            <Check className="w-3 h-3" /> Reativar
          </Button>
        )}
        <Button size="sm" variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground ml-auto"
          onClick={() => onOpenDetail(item)}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main page
══════════════════════════════════════════════ */
const IdeiasPage = () => {
  const { toast } = useToast();

  /* data */
  const [ideias, setIdeias]     = useState<Ideia[]>([]);
  const [staged, setStaged]     = useState<PublicacaoStaged[]>([]);
  const [loading, setLoading]   = useState(true);

  /* roteiro drawer */
  const [roteiroIdeia, setRoteiroIdeia] = useState<Ideia | null>(null);
  const [roteiroOpen, setRoteiroOpen]   = useState(false);

  /* media modal */
  const [mediaUrl, setMediaUrl]   = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [mediaOpen, setMediaOpen] = useState(false);

  /* reject dialog */
  const [rejectTarget, setRejectTarget] = useState<{ type: 'ideia' | 'staged'; id: number | string } | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejecting, setRejecting]       = useState(false);

  /* upload */
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Ideia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* staged detail drawer */
  const [stagedDetail, setStagedDetail]       = useState<PublicacaoStaged | null>(null);
  const [stagedDetailOpen, setStagedDetailOpen] = useState(false);
  const [stagedDate, setStagedDate]             = useState('');
  const [savingDate, setSavingDate]             = useState(false);

  const openStagedDetail = (item: PublicacaoStaged) => {
    setStagedDetail(item);
    setStagedDate(item.data_postagem || '');
    setStagedDetailOpen(true);
  };

  const savePostDate = async () => {
    if (!stagedDetail) return;
    setSavingDate(true);
    const { error } = await supabase
      .from('publicacoes_staged')
      .update({ data_postagem: stagedDate || null } as any)
      .eq('id', stagedDetail.id);
    if (error) { toast({ title: 'Erro ao salvar data', description: error.message, variant: 'destructive' }); }
    else {
      setStaged(prev => prev.map(x => x.id === stagedDetail.id ? { ...x, data_postagem: stagedDate } as PublicacaoStaged : x));
      setStagedDetail(prev => prev ? { ...prev, data_postagem: stagedDate } as PublicacaoStaged : prev);
      toast({ title: 'Data de postagem salva!' });
    }
    setSavingDate(false);
  };

  /* create/edit dialog */
  const [editIdeia, setEditIdeia] = useState<Ideia | null>(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const blankForm = {
    assunto_tema: '', plataforma: 'LinkedIn' as Plataforma,
    formato: 'Reels', observacoes: '', data_uso: '',
  };
  const [form, setForm] = useState(blankForm);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    const [{ data: id }, { data: st }] = await Promise.all([
      supabase.from('ideias').select('*').order('created_at', { ascending: false }),
      supabase.from('publicacoes_staged').select('*').order('created_at', { ascending: false }),
    ]);
    setIdeias(id ?? []);
    setStaged(st ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── open roteiro ── */
  const openRoteiro = (i: Ideia) => {
    setRoteiroIdeia(i);
    setRoteiroOpen(true);
  };

  /* ── view media ── */
  const viewMedia = (url: string, type: 'video' | 'image') => {
    setMediaUrl(url); setMediaType(type); setMediaOpen(true);
  };

  /* ── approve ideia ── */
  const approveIdeia = async (i: Ideia) => {
    await supabase.from('ideias').update({ status: 'Aprovado' }).eq('id', i.id);
    setIdeias(prev => prev.map(x => x.id === i.id ? { ...x, status: 'Aprovado' as Ideia['status'] } : x));
    toast({ title: 'Ideia aprovada!' });
  };

  /* ── reject ideia ── */
  const openRejectIdeia = (i: Ideia) => {
    setRejectTarget({ type: 'ideia', id: i.id });
    setRejectMotivo('');
  };

  /* ── reject staged ── */
  const openRejectStaged = (item: PublicacaoStaged) => {
    setRejectTarget({ type: 'staged', id: item.id });
    setRejectMotivo('');
  };

  const submitReject = async () => {
    if (!rejectTarget || !rejectMotivo.trim()) return;
    setRejecting(true);
    if (rejectTarget.type === 'ideia') {
      await supabase.from('ideias')
        .update({ status: 'Rejeitado', motivo_rejeicao: rejectMotivo })
        .eq('id', rejectTarget.id);
      setIdeias(prev => prev.map(x =>
        x.id === rejectTarget.id ? { ...x, status: 'Rejeitado' as Ideia['status'], motivo_rejeicao: rejectMotivo } : x
      ));
    } else {
      await supabase.from('publicacoes_staged')
        .update({ status: 'Rejeitado', motivo_rejeicao: rejectMotivo })
        .eq('id', rejectTarget.id);
      setStaged(prev => prev.map(x =>
        x.id === rejectTarget.id ? { ...x, status: 'Rejeitado' as PublicacaoStaged['status'], motivo_rejeicao: rejectMotivo } : x
      ));
    }
    setRejecting(false);
    setRejectTarget(null);
    toast({ title: 'Rejeitado com motivo registrado.' });
  };

  /* ── conclude ideia → posts ── */
  const concludeIdeia = async (i: Ideia) => {
    const { error } = await supabase.from('posts').insert({
      plataforma:  i.plataforma,
      formato:     i.formato,
      conteudo:    i.assunto_tema,
      roteiro:     i.roteiro,
      url_video:   i.url_video,
      imagem_url:  i.imagem_url,
      observacoes: i.observacoes,
      ideia_id:    i.id,
      data_postagem: new Date().toISOString().split('T')[0],
    });
    if (error) { toast({ title: 'Erro ao mover para posts', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('ideias').delete().eq('id', i.id);
    setIdeias(prev => prev.filter(x => x.id !== i.id));
    toast({ title: 'Concluído!', description: 'Movido para Posts.' });
  };

  /* ── conclude staged → posts ── */
  const concludeStaged = async (item: PublicacaoStaged) => {
    const { error } = await supabase.from('posts').insert({
      plataforma:      item.plataforma,
      conteudo:        item.conteudo_gerado,
      hashtags:        item.hashtags,
      url_video:       item.url_video,
      imagem_url:      item.url_imagem,
      roteiro:         item.roteiro,
      ideia_id:        item.ideia_id,
      projeto_id:      item.projeto_id,
      data_postagem:   new Date().toISOString().split('T')[0],
    });
    if (error) { toast({ title: 'Erro ao mover para posts', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('publicacoes_staged').delete().eq('id', item.id);
    setStaged(prev => prev.filter(x => x.id !== item.id));
    toast({ title: 'Publicação concluída!', description: 'Movida para Posts.' });
  };

  /* ── approve staged ── */
  const approveStaged = async (item: PublicacaoStaged) => {
    await supabase.from('publicacoes_staged').update({ status: 'Aprovado' }).eq('id', item.id);
    setStaged(prev => prev.map(x => x.id === item.id ? { ...x, status: 'Aprovado' as PublicacaoStaged['status'] } : x));
    toast({ title: 'Publicação aprovada!' });
  };

  /* ── upload video/image ── */
  const triggerUpload = (i: Ideia) => {
    setUploadTarget(i);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    e.target.value = '';
    const id = uploadTarget.id;
    setUploadingId(id);
    try {
      const ext  = file.name.split('.').pop();
      const isVideo = file.type.startsWith('video/');
      const bucket = 'videos';
      const path = `ideias/${id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      const patch = isVideo
        ? { url_video: publicUrl, status: 'Aprovado' }
        : { imagem_url: publicUrl, status: 'Aprovado' };
      await supabase.from('ideias').update(patch).eq('id', id);
      setIdeias(prev => prev.map(x => x.id === id ? { ...x, ...patch, status: 'Aprovado' as Ideia['status'] } : x));
      toast({ title: 'Arquivo enviado!', description: 'Status atualizado para Aprovado.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingId(null);
      setUploadTarget(null);
    }
  };

  /* ── create/edit dialog ── */
  const openCreate = () => {
    setEditIdeia(null);
    setForm(blankForm);
    setFormOpen(true);
  };

  const openEdit = (i: Ideia) => {
    setEditIdeia(i);
    setForm({
      assunto_tema: i.assunto_tema,
      plataforma:   (i.plataforma as Plataforma) || 'LinkedIn',
      formato:      i.formato || 'Reels',
      observacoes:  i.observacoes || '',
      data_uso:     i.data_uso || '',
    });
    setFormOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      assunto_tema: form.assunto_tema,
      plataforma:   form.plataforma,
      plataformas:  [form.plataforma.toLowerCase()],
      formato:      form.formato,
      observacoes:  form.observacoes || null,
      data_uso:     form.data_uso || null,
    };
    if (editIdeia) {
      const { error } = await supabase.from('ideias').update(payload).eq('id', editIdeia.id);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Ideia atualizada!' }); setFormOpen(false); fetchAll(); }
    } else {
      const { error } = await supabase.from('ideias').insert({ ...payload, status: 'Em andamento' });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Ideia criada!' }); setFormOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  /* ── delete ideia ── */
  const deleteIdeia = async (i: Ideia) => {
    if (!confirm(`Excluir "${i.assunto_tema}"?`)) return;
    await supabase.from('ideias').delete().eq('id', i.id);
    setIdeias(prev => prev.filter(x => x.id !== i.id));
    toast({ title: 'Ideia excluída.' });
  };

  /* ── counts ── */
  const stagedCounts = {
    'Em andamento': staged.filter(s => s.status === 'Em andamento').length,
    'Aprovado':     staged.filter(s => s.status === 'Aprovado').length,
    'Rejeitado':    staged.filter(s => s.status === 'Rejeitado').length,
  };

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
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* roteiro drawer */}
      <RoteirDrawer
        ideia={roteiroIdeia}
        open={roteiroOpen}
        onClose={() => setRoteiroOpen(false)}
        onSaved={() => {
          fetchAll();
          if (roteiroIdeia) setRoteiroIdeia(prev => prev ? { ...prev } : null);
        }}
      />

      {/* media modal */}
      {mediaOpen && (
        <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaOpen(false)} />
      )}

      {/* reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4" /> Rejeitar
          </DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">Motivo da rejeição</Label>
            <Textarea
              value={rejectMotivo}
              onChange={e => setRejectMotivo(e.target.value)}
              placeholder="Explique por que está rejeitando..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!rejectMotivo.trim() || rejecting}
                onClick={submitReject}
              >
                {rejecting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Rejeitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Staged detail drawer ── */}
      {stagedDetailOpen && stagedDetail && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setStagedDetailOpen(false)}
          />
          <aside className="fixed right-0 top-0 h-full z-50 w-full max-w-[480px] bg-card border-l border-border shadow-glass-lg flex flex-col animate-slide-right">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <PlatformBadge platform={stagedDetail.plataforma} size="sm" />
                <span className="text-sm font-semibold text-foreground">Detalhes da Publicação</span>
              </div>
              <button
                onClick={() => setStagedDetailOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Status */}
              {(() => {
                const cfg = STAGED_STATUS_CONFIG[stagedDetail.status as keyof typeof STAGED_STATUS_CONFIG];
                return cfg ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                    {stagedDetail.status}
                  </span>
                ) : null;
              })()}

              {/* Data de postagem */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data de Postagem
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={stagedDate}
                    onChange={e => setStagedDate(e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                  <Button size="sm" className="h-8 px-3" onClick={savePostDate} disabled={savingDate}>
                    {savingDate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>

              {/* Conteúdo gerado */}
              {stagedDetail.conteudo_gerado && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5" /> Conteúdo Gerado
                  </Label>
                  <div className="bg-muted/40 rounded-lg p-3.5 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap border border-border/50">
                    {stagedDetail.conteudo_gerado}
                  </div>
                </div>
              )}

              {/* Hashtags */}
              {stagedDetail.hashtags && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {stagedDetail.hashtags.split(/\s+/).filter(Boolean).map(h => (
                      <span key={h} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Roteiro */}
              {stagedDetail.roteiro && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Roteiro
                  </Label>
                  <div className="bg-muted/40 rounded-lg p-3.5 text-[13px] text-foreground leading-relaxed whitespace-pre-wrap border border-border/50">
                    {stagedDetail.roteiro}
                  </div>
                </div>
              )}

              {/* Mídia */}
              {stagedDetail.url_imagem && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Imagem</Label>
                  <button
                    onClick={() => viewMedia(stagedDetail.url_imagem!, 'image')}
                    className="w-full rounded-lg overflow-hidden border border-border/50 group"
                  >
                    <img src={stagedDetail.url_imagem} alt="imagem" className="w-full object-cover max-h-60 group-hover:scale-105 transition-transform duration-300" />
                  </button>
                </div>
              )}
              {stagedDetail.url_video && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vídeo</Label>
                  <button
                    onClick={() => viewMedia(stagedDetail.url_video!, 'video')}
                    className="w-full h-20 rounded-lg bg-black/50 flex items-center justify-center border border-border/50 gap-2 hover:bg-black/70 transition-colors"
                  >
                    <Play className="w-6 h-6 text-white" />
                    <span className="text-sm text-white/70">Assistir vídeo</span>
                  </button>
                </div>
              )}

              {/* Motivo rejeição */}
              {stagedDetail.motivo_rejeicao && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-destructive mb-0.5">Motivo da Rejeição</p>
                    <p className="text-xs text-destructive/80">{stagedDetail.motivo_rejeicao}</p>
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="pt-2 border-t border-border/50 space-y-1">
                <p className="text-[11px] text-muted-foreground">
                  Criado em: {fmt(stagedDetail.created_at)}
                </p>
                {stagedDetail.ideia_id && (
                  <p className="text-[11px] text-muted-foreground">ID da Ideia: #{stagedDetail.ideia_id}</p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              {stagedDetail.status === 'Em andamento' && (
                <>
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-500 text-white h-8"
                    onClick={() => { approveStaged(stagedDetail); setStagedDetailOpen(false); }}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => { setStagedDetailOpen(false); openRejectStaged(stagedDetail); }}>
                    <X className="w-3.5 h-3.5 mr-1" /> Rejeitar
                  </Button>
                </>
              )}
              {stagedDetail.status === 'Aprovado' && (
                <>
                  <Button size="sm" className="flex-1 h-8"
                    onClick={() => { concludeStaged(stagedDetail); setStagedDetailOpen(false); }}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Concluir
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 h-8 px-3"
                    onClick={() => { setStagedDetailOpen(false); openRejectStaged(stagedDetail); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              {stagedDetail.status === 'Rejeitado' && (
                <Button size="sm" variant="outline" className="flex-1 h-8"
                  onClick={() => { approveStaged(stagedDetail); setStagedDetailOpen(false); }}>
                  <Check className="w-3.5 h-3.5 mr-1" /> Reativar
                </Button>
              )}
            </div>
          </aside>
        </>
      )}

      {/* create/edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editIdeia ? 'Editar Ideia' : 'Nova Ideia'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveForm} className="space-y-4">
            {/* Platform */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Plataforma</Label>
              <div className="grid grid-cols-2 gap-2">
                {platformKeys.map(p => {
                  const cfg = PLATAFORMAS[p];
                  const selected = form.plataforma === p;
                  return (
                    <button key={p} type="button"
                      onClick={() => setForm(f => ({ ...f, plataforma: p, formato: FORMATO_POR_PLATAFORMA[p][0] }))}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all border ${
                        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <PlatformIcon platform={p} size={16} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Formato</Label>
              <div className="flex flex-wrap gap-1.5">
                {FORMATO_POR_PLATAFORMA[form.plataforma].map(f => (
                  <button key={f} type="button"
                    onClick={() => setForm(prev => ({ ...prev, formato: f }))}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                      form.formato === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Assunto */}
            <div className="space-y-1.5">
              <Label className="text-sm">Assunto / Tema</Label>
              <Textarea
                value={form.assunto_tema}
                onChange={e => setForm(f => ({ ...f, assunto_tema: e.target.value }))}
                required
                placeholder="Sobre o que é esse conteúdo?"
                rows={2}
              />
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-sm">Observações para a IA</Label>
              <Textarea
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Instruções extras para gerar o conteúdo..."
                rows={2}
              />
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label className="text-sm">Data de postagem</Label>
              <Input
                type="date"
                value={form.data_uso}
                onChange={e => setForm(f => ({ ...f, data_uso: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                {editIdeia ? 'Salvar alterações' : 'Criar ideia'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Page ── */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideias de Conteúdo</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{ideias.length} ideias</span>
              {platformKeys.map(p => {
                const count = ideias.filter(i => i.plataforma === p).length;
                if (!count) return null;
                return (
                  <span key={p} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: PLATAFORMAS[p].bg, color: PLATAFORMAS[p].color }}>
                    <PlatformIcon platform={p} size={10} />
                    {PLATAFORMAS[p].label} {count}
                  </span>
                );
              })}
            </div>
          </div>
          <Button size="sm" className="gap-1.5 h-8" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" /> Nova Ideia
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ideias">
          <TabsList className="h-8 gap-1">
            <TabsTrigger value="ideias" className="text-xs h-7 px-3">
              Ideias ({ideias.length})
            </TabsTrigger>
            <TabsTrigger value="publicacoes" className="text-xs h-7 px-3">
              Publicações
              {staged.length > 0 && (
                <span className="ml-1.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                  {staged.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── IDEIAS TAB ── */}
          <TabsContent value="ideias" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {KANBAN_COLS.map(col => {
                const colCfg = IDEIA_STATUS_CONFIG[col as keyof typeof IDEIA_STATUS_CONFIG];
                const items  = ideias.filter(i => i.status === col);
                return (
                  <div key={col} className="space-y-2">
                    {/* Column header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colCfg?.color }} />
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col}</span>
                      <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        {items.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2.5 stagger">
                      {items.map(ideia => (
                        <IdeiaCard
                          key={ideia.id}
                          ideia={ideia}
                          uploadingId={uploadingId}
                          onOpenRoteiro={openRoteiro}
                          onApprove={approveIdeia}
                          onReject={openRejectIdeia}
                          onConclude={concludeIdeia}
                          onUploadVideo={triggerUpload}
                          onViewMedia={viewMedia}
                          onEdit={openEdit}
                          onDelete={deleteIdeia}
                        />
                      ))}
                      {items.length === 0 && (
                        <div className="h-24 flex items-center justify-center border border-dashed border-border/50 rounded-xl">
                          <p className="text-xs text-muted-foreground">Nenhuma ideia</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── PUBLICAÇÕES TAB ── */}
          <TabsContent value="publicacoes" className="mt-4">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Publicações geradas pelo n8n aguardando validação antes de ir para Posts.
              </p>

              {staged.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl gap-2">
                  <FileText className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma publicação em fila</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['Em andamento', 'Aprovado', 'Rejeitado'] as const).map(col => {
                    const colCfg = STAGED_STATUS_CONFIG[col as keyof typeof STAGED_STATUS_CONFIG];
                    const items  = staged.filter(s => s.status === col);
                    return (
                      <div key={col} className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colCfg?.color }} />
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col}</span>
                          <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {stagedCounts[col]}
                          </span>
                        </div>
                        <div className="space-y-2.5 stagger">
                          {items.map(item => (
                            <StagedCard
                              key={item.id}
                              item={item}
                              onApprove={approveStaged}
                              onReject={openRejectStaged}
                              onConclude={concludeStaged}
                              onViewMedia={viewMedia}
                              onOpenDetail={openStagedDetail}
                            />
                          ))}
                          {items.length === 0 && (
                            <div className="h-24 flex items-center justify-center border border-dashed border-border/50 rounded-xl">
                              <p className="text-xs text-muted-foreground">Nenhuma publicação</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default IdeiasPage;
