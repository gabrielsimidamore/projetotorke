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
  Plus, Loader2, FileText, X, Check, AlertCircle,
  Play, Eye, Calendar, Hash, AlignLeft, Layers,
  Sparkles, Pencil as PencilIcon, ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlatformBadge, PlatformIcon } from '@/components/PlatformBadge';
import { RoteirDrawer } from '@/components/RoteirDrawer';
import { MediaModal } from '@/components/VideoPlayer';
import { N8nStatusBar } from '@/components/N8nStatusBar';
import { PLATAFORMAS, FORMATO_POR_PLATAFORMA, STAGED_STATUS_CONFIG } from '@/lib/constants';
import { updateIdeia, createIdeia, triggerGerarRoteiro } from '@/hooks/useIdeias';

/* ── helpers ── */
const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

const datePlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const platformKeys = Object.keys(PLATAFORMAS) as Plataforma[];

const normPlat = (p: string): Plataforma => {
  const found = platformKeys.find(k => k.toLowerCase() === (p ?? '').toLowerCase());
  return (found ?? p) as Plataforma;
};

/* ── Platform badge colors spec ── */
const PLAT_BADGE: Record<string, { bg: string; color: string }> = {
  Instagram: { bg: '#fde8f5', color: '#8b1a5e' },
  TikTok:    { bg: '#e8f0fe', color: '#1a3a8b' },
  LinkedIn:  { bg: '#e8f4fd', color: '#0a4d7a' },
  YouTube:   { bg: '#fff0e8', color: '#8b3a00' },
};

/* ══════════════════════════════════════════════
   IdeiaCard — apenas "Em andamento"
══════════════════════════════════════════════ */
interface IdeiaCardProps {
  ideia: Ideia;
  removing: boolean;
  onOpenDrawer: (i: Ideia) => void;
  onApprove: (i: Ideia) => void;
  onReject: (i: Ideia) => void;
}

function IdeiaCard({ ideia, removing, onOpenDrawer, onApprove, onReject }: IdeiaCardProps) {
  const platCfg = PLAT_BADGE[ideia.plataforma] ?? { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' };
  const isIA = ideia.origem === 'ia';

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all duration-300"
      style={{
        opacity:    removing ? 0 : 1,
        transform:  removing ? 'scale(0.95)' : 'scale(1)',
      }}
      onClick={() => onOpenDrawer(ideia)}
    >
      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Plataforma */}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
          style={{ backgroundColor: platCfg.bg, color: platCfg.color }}
        >
          <PlatformIcon platform={normPlat(ideia.plataforma)} size={11} />
          {ideia.plataforma}
        </span>

        {/* Formato */}
        {ideia.formato && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground">
            {ideia.formato}
          </span>
        )}

        {/* Origem */}
        {isIA ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground ml-auto">
            <Sparkles className="w-2.5 h-2.5" /> IA
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium ml-auto"
            style={{ backgroundColor: 'rgba(127,119,221,0.15)', color: '#7F77DD' }}
          >
            <PencilIcon className="w-2.5 h-2.5" /> Sua ideia
          </span>
        )}
      </div>

      {/* Título */}
      <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2">
        {ideia.assunto_tema}
      </p>

      {/* Preview roteiro */}
      {ideia.roteiro && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {ideia.roteiro.replace(/```[\w]*\n?/g, '').replace(/```/g, '').trim()}
        </p>
      )}

      {/* Data sugerida */}
      {ideia.data_postagem && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3" /> {fmt(ideia.data_postagem)}
        </p>
      )}

      {/* Botões — stopPropagation para não abrir o drawer */}
      <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => onReject(ideia)}
          className="flex-1 h-8 rounded-lg text-[12px] font-medium text-red-600 border border-red-200 transition-colors hover:bg-[#FCEBEB] flex items-center justify-center gap-1"
        >
          <X className="w-3 h-3" /> Rejeitar
        </button>
        <button
          onClick={() => onApprove(ideia)}
          className="flex-1 h-8 rounded-lg text-[12px] font-medium text-green-700 border border-green-200 transition-colors hover:bg-[#E1F5EE] flex items-center justify-center gap-1"
        >
          <Check className="w-3 h-3" /> Aprovar
        </button>
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
  const plat = normPlat(item.plataforma);
  const cfg  = PLATAFORMAS[plat];
  const statusCfg = STAGED_STATUS_CONFIG[item.status as keyof typeof STAGED_STATUS_CONFIG];

  return (
    <div
      className="glass-card rounded-xl p-3.5 space-y-2.5 cursor-pointer"
      style={{ borderLeft: `3px solid ${cfg?.color ?? '#6366f1'}` }}
      onClick={() => onOpenDetail(item)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
          style={{ backgroundColor: cfg?.bg ?? 'rgba(99,102,241,0.1)' }}>
          <PlatformIcon platform={plat} size={13} />
          <span className="text-[12px] font-bold" style={{ color: cfg?.color ?? '#6366f1' }}>
            {cfg?.label ?? item.plataforma}
          </span>
        </div>
        {statusCfg && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
            {item.status}
          </span>
        )}
      </div>

      {item.conteudo_gerado && (
        <p className="text-[12px] text-foreground leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {item.conteudo_gerado}
        </p>
      )}

      {item.hashtags && (
        <p className="text-[11px] text-primary/80 line-clamp-1">{item.hashtags}</p>
      )}

      {item.url_imagem && (
        <button onClick={e => { e.stopPropagation(); onViewMedia(item.url_imagem!, 'image'); }}
          className="relative w-full h-24 rounded-lg overflow-hidden border border-border/50 group">
          <img src={item.url_imagem} alt="staged" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </button>
      )}

      {item.url_video && (
        <button onClick={e => { e.stopPropagation(); onViewMedia(item.url_video!, 'video'); }}
          className="w-full h-16 rounded-lg bg-black/50 flex items-center justify-center border border-border/50 gap-2 hover:bg-black/70 transition-colors">
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
            <Button size="sm" className="h-7 px-2 text-[11px] gap-1 bg-green-600 hover:bg-green-500 text-white flex-1"
              onClick={() => onApprove(item)}>
              <Check className="w-3 h-3" /> Aprovar
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10 flex-1"
              onClick={() => onReject(item)}>
              <X className="w-3 h-3" /> Rejeitar
            </Button>
          </>
        )}
        {item.status === 'Aprovado' && (
          <>
            <Button size="sm" className="h-7 px-2 text-[11px] gap-1 flex-1"
              onClick={() => onConclude(item)}>
              <Check className="w-3 h-3" /> Concluir
            </Button>
            <Button size="sm" variant="ghost"
              className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10"
              onClick={() => onReject(item)}>
              <X className="w-3 h-3" />
            </Button>
          </>
        )}
        {item.status === 'Rejeitado' && (
          <Button size="sm" variant="ghost"
            className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => onApprove(item)}>
            <Check className="w-3 h-3" /> Reativar
          </Button>
        )}
        <Button size="sm" variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground ml-auto"
          onClick={() => onOpenDetail(item)}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   IdeiaDrawer — lateral 480px
══════════════════════════════════════════════ */
interface DrawerProps {
  ideia: Ideia | null;
  open: boolean;
  onClose: () => void;
  onApprove: (i: Ideia) => void;
  onReject: (i: Ideia) => void;
  onSaved: (updated: Ideia) => void;
}

function IdeiaDrawer({ ideia, open, onClose, onApprove, onReject, onSaved }: DrawerProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({ assunto_tema: '', roteiro: '', observacoes: '', data_postagem: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ideia) {
      setForm({
        assunto_tema:  ideia.assunto_tema,
        roteiro:       ideia.roteiro ?? '',
        observacoes:   ideia.observacoes ?? '',
        data_postagem: ideia.data_postagem?.split('T')[0] ?? '',
      });
    }
  }, [ideia]);

  const handleSave = async () => {
    if (!ideia) return;
    setSaving(true);
    const payload = {
      assunto_tema:  form.assunto_tema,
      roteiro:       form.roteiro || null,
      observacoes:   form.observacoes || null,
      data_postagem: form.data_postagem || null,
    };
    const { error } = await updateIdeia(ideia.id, payload as any);
    setSaving(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Alterações salvas!' });
    onSaved({ ...ideia, ...payload });
  };

  if (!open || !ideia) return null;

  const platCfg = PLAT_BADGE[ideia.plataforma] ?? { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' };
  const isIA    = ideia.origem === 'ia';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="fixed right-0 top-0 h-full z-50 w-full max-w-[480px] bg-card border-l border-border shadow-glass-lg flex flex-col"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.25s ease' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: platCfg.bg, color: platCfg.color }}>
              <PlatformIcon platform={normPlat(ideia.plataforma)} size={11} />
              {ideia.plataforma}
            </span>
            {ideia.formato && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/60 text-muted-foreground">
                {ideia.formato}
              </span>
            )}
            {isIA ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/50 text-muted-foreground">
                <Sparkles className="w-2.5 h-2.5" /> IA
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
                style={{ backgroundColor: 'rgba(127,119,221,0.15)', color: '#7F77DD' }}>
                <PencilIcon className="w-2.5 h-2.5" /> Sua ideia
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Título */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Título</Label>
            <Input
              value={form.assunto_tema}
              onChange={e => setForm(f => ({ ...f, assunto_tema: e.target.value }))}
              className="text-sm"
            />
          </div>

          {/* Roteiro */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Roteiro
            </Label>
            <Textarea
              value={form.roteiro}
              onChange={e => setForm(f => ({ ...f, roteiro: e.target.value }))}
              rows={8}
              placeholder="O roteiro gerado pelo N8N aparece aqui..."
              className="text-sm resize-none"
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Observações para a IA
            </Label>
            <Textarea
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={3}
              placeholder="Instruções extras para o próximo roteiro..."
              className="text-sm resize-none"
            />
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Data de Postagem
            </Label>
            <Input
              type="date"
              value={form.data_postagem}
              onChange={e => setForm(f => ({ ...f, data_postagem: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 space-y-2">
          <Button className="w-full h-8 text-sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Salvar alterações
          </Button>
          <div className="flex gap-2">
            <button
              onClick={() => { onReject(ideia); onClose(); }}
              className="flex-1 h-8 rounded-lg text-[12px] font-medium text-red-600 border border-red-200 hover:bg-[#FCEBEB] transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3 h-3" /> Rejeitar
            </button>
            <button
              onClick={() => { onApprove(ideia); onClose(); }}
              className="flex-1 h-8 rounded-lg text-[12px] font-medium text-green-700 border border-green-200 hover:bg-[#E1F5EE] transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" /> Aprovar
            </button>
          </div>
        </div>
      </aside>
    </>
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
  const [removing, setRemoving] = useState<number | null>(null);

  /* drawer ideia */
  const [drawerIdeia, setDrawerIdeia]   = useState<Ideia | null>(null);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  /* roteiro drawer (legado — para ideias aprovadas) */
  const [roteiroIdeia, setRoteiroIdeia] = useState<Ideia | null>(null);
  const [roteiroOpen, setRoteiroOpen]   = useState(false);

  /* media modal */
  const [mediaUrl, setMediaUrl]   = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('image');
  const [mediaOpen, setMediaOpen] = useState(false);

  /* modal rejeição */
  const [rejectTarget, setRejectTarget] = useState<Ideia | PublicacaoStaged | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');
  const [rejecting, setRejecting]       = useState(false);
  const rejectIsIdeia = rejectTarget && 'assunto_tema' in rejectTarget;

  /* modal aprovação */
  const [approveTarget, setApproveTarget] = useState<Ideia | null>(null);
  const [approveDate, setApproveDate]     = useState('');
  const [approving, setApproving]         = useState(false);

  /* modal nova ideia */
  const [newOpen, setNewOpen]   = useState(false);
  const [newSaving, setNewSaving] = useState(false);
  const blankNew = { assunto_tema: '', plataforma: 'Instagram' as Plataforma, formato: 'Reels', observacoes: '', data_postagem: '' };
  const [newForm, setNewForm]   = useState(blankNew);
  const [pendingRoteiro, setPendingRoteiro] = useState<number | null>(null); // ideia_id aguardando roteiro

  /* staged detail drawer */
  const [stagedDetail, setStagedDetail]       = useState<PublicacaoStaged | null>(null);
  const [stagedDetailOpen, setStagedDetailOpen] = useState(false);
  const [stagedDate, setStagedDate]             = useState('');
  const [savingDate, setSavingDate]             = useState(false);

  /* ── fetch ── */
  const fetchAll = useCallback(async () => {
    const [{ data: id }, { data: st }] = await Promise.all([
      supabase.from('ideias').select('*').eq('status', 'Em andamento').order('created_at', { ascending: false }),
      supabase.from('publicacoes_staged').select('*').order('created_at', { ascending: false }),
    ]);
    setIdeias(id ?? []);
    setStaged(st ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── helpers ── */
  const viewMedia = (url: string, type: 'video' | 'image') => {
    setMediaUrl(url); setMediaType(type); setMediaOpen(true);
  };

  const removeIdeia = (id: number) => {
    setRemoving(id);
    setTimeout(() => {
      setIdeias(prev => prev.filter(x => x.id !== id));
      setRemoving(null);
    }, 300);
  };

  /* ── open approve modal ── */
  const openApprove = (i: Ideia) => {
    setApproveTarget(i);
    setApproveDate(i.data_postagem?.split('T')[0] ?? datePlus(3));
  };

  /* ── confirm approve ── */
  const confirmApprove = async () => {
    if (!approveTarget) return;
    setApproving(true);
    await updateIdeia(approveTarget.id, { status: 'Aprovado', data_postagem: approveDate || null } as any);
    setApproving(false);
    setApproveTarget(null);
    removeIdeia(approveTarget.id);
    toast({ title: 'Ideia aprovada!', description: 'Aguardando upload do vídeo.' });
  };

  /* ── open reject modal ── */
  const openReject = (target: Ideia | PublicacaoStaged) => {
    setRejectTarget(target);
    setRejectMotivo('');
  };

  /* ── confirm reject ── */
  const confirmReject = async () => {
    if (!rejectTarget || !rejectMotivo.trim()) return;
    setRejecting(true);
    if (rejectIsIdeia) {
      const t = rejectTarget as Ideia;
      await updateIdeia(t.id, { status: 'Rejeitado', motivo_rejeicao: rejectMotivo } as any);
      removeIdeia(t.id);
    } else {
      const t = rejectTarget as PublicacaoStaged;
      await supabase.from('publicacoes_staged')
        .update({ status: 'Rejeitado', motivo_rejeicao: rejectMotivo })
        .eq('id', t.id);
      setStaged(prev => prev.map(x =>
        x.id === t.id ? { ...x, status: 'Rejeitado' as PublicacaoStaged['status'], motivo_rejeicao: rejectMotivo } : x
      ));
    }
    setRejecting(false);
    setRejectTarget(null);
    toast({ title: 'Ideia rejeitada e salva.' });
  };

  /* ── criar nova ideia manual ── */
  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSaving(true);
    const { data, error } = await createIdeia({
      assunto_tema:  newForm.assunto_tema,
      plataforma:    newForm.plataforma,
      formato:       newForm.formato,
      observacoes:   newForm.observacoes || null,
      data_postagem: newForm.data_postagem || null,
      origem:        'manual',
    });
    setNewSaving(false);
    if (error || !data) {
      toast({ title: 'Erro ao criar ideia', description: error?.message, variant: 'destructive' });
      return;
    }
    setIdeias(prev => [data as Ideia, ...prev]);
    setNewOpen(false);
    setNewForm(blankNew);
    setPendingRoteiro(data.id);
    toast({ title: 'Ideia criada!', description: 'Gerando roteiro com N8N...' });

    /* chama N8N */
    await triggerGerarRoteiro({
      ideia_id:    data.id,
      assunto_tema: newForm.assunto_tema,
      plataforma:  newForm.plataforma,
      formato:     newForm.formato,
      observacoes: newForm.observacoes || null,
    });

    /* poll por 60s esperando roteiro */
    const maxTries = 12;
    let tries = 0;
    const poll = setInterval(async () => {
      tries++;
      const { data: fresh } = await supabase.from('ideias').select('roteiro').eq('id', data.id).single();
      if (fresh?.roteiro || tries >= maxTries) {
        clearInterval(poll);
        setPendingRoteiro(null);
        if (fresh?.roteiro) {
          setIdeias(prev => prev.map(x => x.id === data.id ? { ...x, roteiro: fresh.roteiro } : x));
          toast({ title: 'Roteiro gerado!', description: 'Clique no card para visualizar.' });
        }
      }
    }, 5000);
  };

  /* ── staged actions ── */
  const approveStaged = async (item: PublicacaoStaged) => {
    await supabase.from('publicacoes_staged').update({ status: 'Aprovado' }).eq('id', item.id);
    setStaged(prev => prev.map(x => x.id === item.id ? { ...x, status: 'Aprovado' as PublicacaoStaged['status'] } : x));
    toast({ title: 'Publicação aprovada!' });
  };

  const concludeStaged = async (item: PublicacaoStaged) => {
    const { error } = await supabase.from('posts').insert({
      plataforma:    item.plataforma,
      conteudo_post: item.conteudo_gerado ?? '',
      assunto:       item.conteudo_gerado?.slice(0, 100) ?? '',
      hashtags:      item.hashtags,
      url_video:     item.url_video,
      url_imagem:    item.url_imagem,
      roteiro:       item.roteiro,
      ideia_id:      item.ideia_id,
      projeto_id:    item.projeto_id,
      status_aprovacao: 'Aprovado',
    });
    if (error) { toast({ title: 'Erro ao mover para posts', description: error.message, variant: 'destructive' }); return; }
    await supabase.from('publicacoes_staged').delete().eq('id', item.id);
    setStaged(prev => prev.filter(x => x.id !== item.id));
    toast({ title: 'Publicação concluída!', description: 'Movida para Posts.' });
  };

  const openStagedDetail = (item: PublicacaoStaged) => {
    setStagedDetail(item);
    setStagedDate(item.data_postagem ?? '');
    setStagedDetailOpen(true);
  };

  const savePostDate = async () => {
    if (!stagedDetail) return;
    setSavingDate(true);
    await supabase.from('publicacoes_staged').update({ data_postagem: stagedDate || null } as any).eq('id', stagedDetail.id);
    setStaged(prev => prev.map(x => x.id === stagedDetail.id ? { ...x, data_postagem: stagedDate } as PublicacaoStaged : x));
    setStagedDetail(prev => prev ? { ...prev, data_postagem: stagedDate } as PublicacaoStaged : prev);
    setSavingDate(false);
    toast({ title: 'Data salva!' });
  };

  const pendingCount = ideias.filter(i => i.status === 'Em andamento').length;

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
      {/* Roteiro drawer legado */}
      <RoteirDrawer
        ideia={roteiroIdeia}
        open={roteiroOpen}
        onClose={() => setRoteiroOpen(false)}
        onSaved={fetchAll}
      />

      {/* Media modal */}
      {mediaOpen && <MediaModal url={mediaUrl} type={mediaType} onClose={() => setMediaOpen(false)} />}

      {/* Ideia drawer */}
      <IdeiaDrawer
        ideia={drawerIdeia}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApprove={openApprove}
        onReject={openReject}
        onSaved={updated => setIdeias(prev => prev.map(x => x.id === updated.id ? updated : x))}
      />

      {/* ── Modal rejeição ── */}
      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) setRejectTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" /> Rejeitar ideia
            </DialogTitle>
          </DialogHeader>
          {rejectTarget && rejectIsIdeia && (
            <p className="text-xs text-muted-foreground -mt-2 line-clamp-1">
              "{(rejectTarget as Ideia).assunto_tema}"
            </p>
          )}
          <div className="space-y-3">
            <Label className="text-sm">Motivo da rejeição <span className="text-destructive">*</span></Label>
            <Textarea
              value={rejectMotivo}
              onChange={e => setRejectMotivo(e.target.value)}
              placeholder="Ex: tom muito genérico, já fizemos algo parecido..."
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1"
                disabled={!rejectMotivo.trim() || rejecting}
                onClick={confirmReject}>
                {rejecting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Rejeitar e salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal aprovação ── */}
      <Dialog open={!!approveTarget} onOpenChange={o => { if (!o) setApproveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Check className="w-4 h-4" /> Aprovar ideia
            </DialogTitle>
          </DialogHeader>
          {approveTarget && (
            <p className="text-xs text-muted-foreground -mt-2 line-clamp-1">
              "{approveTarget.assunto_tema}"
            </p>
          )}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Data de postagem
              </Label>
              <Input
                type="date"
                value={approveDate}
                onChange={e => setApproveDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setApproveTarget(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                disabled={approving} onClick={confirmApprove}>
                {approving && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                Aprovar e salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal nova ideia ── */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ideia</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateNew} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Plataforma</Label>
              <div className="grid grid-cols-2 gap-2">
                {platformKeys.map(p => {
                  const cfg = PLATAFORMAS[p];
                  const sel = newForm.plataforma === p;
                  return (
                    <button key={p} type="button"
                      onClick={() => setNewForm(f => ({ ...f, plataforma: p, formato: FORMATO_POR_PLATAFORMA[p][0] }))}
                      className={`flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium transition-all border ${
                        sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <PlatformIcon platform={p} size={16} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Formato</Label>
              <div className="flex flex-wrap gap-1.5">
                {FORMATO_POR_PLATAFORMA[newForm.plataforma].map(f => (
                  <button key={f} type="button"
                    onClick={() => setNewForm(prev => ({ ...prev, formato: f }))}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                      newForm.formato === f ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Assunto / Tema <span className="text-destructive">*</span></Label>
              <Textarea
                value={newForm.assunto_tema}
                onChange={e => setNewForm(f => ({ ...f, assunto_tema: e.target.value }))}
                required
                placeholder="Sobre o que é esse conteúdo?"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Observações para IA</Label>
              <Textarea
                value={newForm.observacoes}
                onChange={e => setNewForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Instruções extras para gerar o roteiro..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Data de postagem</Label>
              <Input
                type="date"
                value={newForm.data_postagem}
                onChange={e => setNewForm(f => ({ ...f, data_postagem: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setNewOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={newSaving}>
                {newSaving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Criar e gerar roteiro
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Staged detail drawer ── */}
      {stagedDetailOpen && stagedDetail && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setStagedDetailOpen(false)} />
          <aside className="fixed right-0 top-0 h-full z-50 w-full max-w-[480px] bg-card border-l border-border shadow-glass-lg flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              {(() => {
                const p = normPlat(stagedDetail.plataforma);
                const c = PLATAFORMAS[p];
                return (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: c?.bg ?? 'rgba(99,102,241,0.12)' }}>
                    <PlatformIcon platform={p} size={15} />
                    <span className="text-[13px] font-bold" style={{ color: c?.color ?? '#6366f1' }}>
                      {c?.label ?? stagedDetail.plataforma}
                    </span>
                  </div>
                );
              })()}
              <button onClick={() => setStagedDetailOpen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data de Postagem
                </Label>
                <div className="flex gap-2">
                  <Input type="date" value={stagedDate} onChange={e => setStagedDate(e.target.value)} className="h-8 text-sm flex-1" />
                  <Button size="sm" className="h-8 px-3" onClick={savePostDate} disabled={savingDate}>
                    {savingDate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
                  </Button>
                </div>
              </div>
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
              {stagedDetail.hashtags && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Hashtags
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {stagedDetail.hashtags.split(/\s+/).filter(Boolean).map(h => (
                      <span key={h} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium">{h}</span>
                    ))}
                  </div>
                </div>
              )}
              {stagedDetail.url_imagem && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Imagem</Label>
                  <button onClick={() => viewMedia(stagedDetail.url_imagem!, 'image')}
                    className="w-full rounded-lg overflow-hidden border border-border/50 group">
                    <img src={stagedDetail.url_imagem} alt="imagem"
                      className="w-full object-cover max-h-60 group-hover:scale-105 transition-transform duration-300" />
                  </button>
                </div>
              )}
              {stagedDetail.url_video && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vídeo</Label>
                  <button onClick={() => viewMedia(stagedDetail.url_video!, 'video')}
                    className="w-full h-20 rounded-lg bg-black/50 flex items-center justify-center border border-border/50 gap-2 hover:bg-black/70 transition-colors">
                    <Play className="w-6 h-6 text-white" />
                    <span className="text-sm text-white/70">Assistir vídeo</span>
                  </button>
                </div>
              )}
              {stagedDetail.motivo_rejeicao && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/8 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-destructive mb-0.5">Motivo da Rejeição</p>
                    <p className="text-xs text-destructive/80">{stagedDetail.motivo_rejeicao}</p>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground">Criado em: {fmt(stagedDetail.created_at)}</p>
                {stagedDetail.ideia_id && (
                  <p className="text-[11px] text-muted-foreground">ID da Ideia: #{stagedDetail.ideia_id}</p>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex gap-2">
              {stagedDetail.status === 'Em andamento' && (
                <>
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-500 text-white h-8"
                    onClick={() => { approveStaged(stagedDetail); setStagedDetailOpen(false); }}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Aprovar
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:bg-destructive/10 h-8"
                    onClick={() => { setStagedDetailOpen(false); openReject(stagedDetail); }}>
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
                    onClick={() => { setStagedDetailOpen(false); openReject(stagedDetail); }}>
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

      {/* ══ PAGE ══ */}
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideias de Conteúdo</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingCount} {pendingCount === 1 ? 'ideia aguardando' : 'ideias aguardando'} validação
            </p>
          </div>
          <Button size="sm" className="gap-1.5 h-8" onClick={() => setNewOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Nova Ideia
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ideias">
          <TabsList className="h-8 gap-1">
            <TabsTrigger value="ideias" className="text-xs h-7 px-3">
              Ideias
              {pendingCount > 0 && (
                <span className="ml-1.5 min-w-[16px] h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
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
          <TabsContent value="ideias" className="mt-4 space-y-4">
            {/* N8N status bar */}
            <N8nStatusBar />

            {/* Shimmer para ideia aguardando roteiro */}
            {pendingRoteiro && (
              <div className="glass-card rounded-xl p-4 space-y-3 animate-pulse">
                <div className="flex gap-2">
                  <div className="h-5 w-20 rounded-md bg-muted" />
                  <div className="h-5 w-12 rounded-md bg-muted" />
                  <div className="h-5 w-14 rounded-md bg-muted ml-auto" />
                </div>
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Gerando roteiro...
                </p>
              </div>
            )}

            {/* Grid de cards */}
            {ideias.length === 0 && !pendingRoteiro ? (
              <div className="h-48 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl gap-2">
                <FileText className="w-6 h-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma ideia aguardando validação</p>
                <p className="text-xs text-muted-foreground">O N8N gerará novas ideias às 08:00 ou crie uma manualmente</p>
              </div>
            ) : (
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {ideias.map(ideia => (
                  <IdeiaCard
                    key={ideia.id}
                    ideia={ideia}
                    removing={removing === ideia.id}
                    onOpenDrawer={i => { setDrawerIdeia(i); setDrawerOpen(true); }}
                    onApprove={openApprove}
                    onReject={openReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PUBLICAÇÕES TAB ── */}
          <TabsContent value="publicacoes" className="mt-4">
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Publicações geradas pelo N8N aguardando validação antes de ir para Posts.
              </p>
              {staged.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl gap-2">
                  <FileText className="w-6 h-6 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma publicação em fila</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['Em andamento', 'Aprovado', 'Rejeitado'] as const).map(col => {
                    const colCfg = STAGED_STATUS_CONFIG[col];
                    const items  = staged.filter(s => s.status === col);
                    return (
                      <div key={col} className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colCfg.color }} />
                          <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{col}</span>
                          <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {items.length}
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {items.map(item => (
                            <StagedCard
                              key={item.id}
                              item={item}
                              onApprove={approveStaged}
                              onReject={openReject}
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
