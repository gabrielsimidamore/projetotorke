import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Ideia } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Check, X, LayoutGrid, List, Linkedin, Instagram, Youtube, Facebook, Globe, BookOpen, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLATAFORMAS = [
  { value: 'linkedin',  label: 'LinkedIn',  icon: Linkedin,  tagClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, tagClass: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { value: 'youtube',   label: 'YouTube',   icon: Youtube,   tagClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'facebook',  label: 'Facebook',  icon: Facebook,  tagClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  { value: 'tiktok',    label: 'TikTok',    icon: Globe,     tagClass: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300' },
  { value: 'blog',      label: 'Blog',      icon: BookOpen,  tagClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
];

const FORMATOS = [
  { value: 'storytelling', label: '📖 Storytelling' },
  { value: 'informativo',  label: '📊 Informativo' },
  { value: 'dica',         label: '🎯 Dica Prática' },
  { value: 'opiniao',      label: '💬 Opinião' },
  { value: 'case',         label: '🏆 Case de Sucesso' },
  { value: 'enquete',      label: '❓ Enquete' },
  { value: 'promocional',  label: '🛒 Promocional' },
  { value: 'bastidores',   label: '🎉 Bastidores' },
  { value: 'lancamento',   label: '📣 Lançamento' },
  { value: 'parceria',     label: '🤝 Parceria' },
];

const STATUS_COLS = [
  { id: 'Pendente',     title: 'Pendentes',    color: '#e5a700' },
  { id: 'Em andamento', title: 'Em Andamento', color: '#3b82f6' },
  { id: 'Aprovado',     title: 'Aprovados',    color: '#22c55e' },
  { id: 'Rejeitado',    title: 'Rejeitados',   color: '#ef4444' },
];

const getPlatformInfo = (value: string) => PLATAFORMAS.find(p => p.value === value) ?? PLATAFORMAS[0];

const PlatformTag = ({ plataforma }: { plataforma: string }) => {
  const info = getPlatformInfo(plataforma);
  const Icon = info.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${info.tagClass}`}>
      <Icon className="w-3 h-3" />{info.label}
    </span>
  );
};

const IdeiasPage = () => {
  const { toast } = useToast();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [form, setForm] = useState({ assunto_tema: '', formato: 'storytelling', observacoes: '', plataforma: 'linkedin', data_postagem: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadId = useRef<number | null>(null);

  const fetchData = async () => {
    const { data } = await supabase.from('ideias').select('*').order('created_at', { ascending: false });
    setIdeias(data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent, status: string = 'Pendente') => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('ideias').insert({
      assunto_tema: form.assunto_tema, formato: form.formato,
      observacoes: form.observacoes || null, plataforma: form.plataforma,
      data_uso: form.data_postagem || null, status,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Ideia criada!' });
      setDialogOpen(false);
      setForm({ assunto_tema: '', formato: 'storytelling', observacoes: '', plataforma: 'linkedin', data_postagem: '' });
      fetchData();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await supabase.from('ideias').update({
      status,
      data_uso: status === 'Em andamento' ? new Date().toISOString().split('T')[0] : undefined,
    }).eq('id', id);
    setIdeias(prev => prev.map(i => i.id === id ? { ...i, status: status as Ideia['status'] } : i));
    toast({ title: `Status: ${status}` });
  };

  const handleKanbanMove = async (itemId: string | number, newStatus: string) => {
    await handleStatusChange(Number(itemId), newStatus);
  };

  const handleMediaUpload = async (ideiaId: number, file: File) => {
    setUploadingId(ideiaId);
    try {
      const ext = file.name.split('.').pop();
      const path = `ideias/${ideiaId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('conteudos').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('conteudos').getPublicUrl(path);
      await supabase.from('ideias').update({
        status: 'Aprovado',
        imagem_url: urlData.publicUrl,
        publicado_em: new Date().toISOString(),
      }).eq('id', ideiaId);

      setIdeias(prev => prev.map(i =>
        i.id === ideiaId ? { ...i, status: 'Aprovado' as Ideia['status'], imagem_url: urlData.publicUrl } : i
      ));
      toast({ title: '✅ Mídia enviada!', description: 'Status atualizado para Aprovado automaticamente.' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingId(null);
      activeUploadId.current = null;
    }
  };

  const triggerUpload = (id: number) => {
    activeUploadId.current = id;
    fileInputRef.current?.click();
  };

  const columns: KanbanColumn<Ideia>[] = STATUS_COLS.map(col => ({
    id: col.id, title: col.title, color: col.color,
    items: ideias.filter(i => i.status === col.id),
  }));

  const renderKanbanCard = (ideia: Ideia) => (
    <div className="bg-card rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow">
      <p className="text-sm font-medium text-foreground">{ideia.assunto_tema}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PlatformTag plataforma={ideia.plataforma ?? 'linkedin'} />
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{ideia.formato}</span>
      </div>
      {ideia.data_uso && <span className="text-xs text-muted-foreground">{new Date(ideia.data_uso).toLocaleDateString('pt-BR')}</span>}
      {ideia.observacoes && <p className="text-xs text-muted-foreground line-clamp-2">{ideia.observacoes}</p>}
    </div>
  );

  const renderListCards = (items: Ideia[]) => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Nenhuma ideia nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(ideia => (
          <div key={ideia.id} className="bg-card rounded-lg border border-border p-4 space-y-2.5">
            <p className="text-sm font-semibold text-foreground">{ideia.assunto_tema}</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <PlatformTag plataforma={ideia.plataforma ?? 'linkedin'} />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{ideia.formato}</span>
              <span className="text-xs text-muted-foreground">{new Date(ideia.data_cadastro).toLocaleDateString('pt-BR')}</span>
            </div>
            {ideia.observacoes && <p className="text-xs text-muted-foreground">{ideia.observacoes}</p>}
            {ideia.imagem_url && (
              <div className="rounded-md overflow-hidden border border-border">
                <img src={ideia.imagem_url} alt="mídia" className="w-full h-28 object-cover" />
              </div>
            )}

            {ideia.status === 'Pendente' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatusChange(ideia.id, 'Em andamento')}>
                  <Check className="w-3 h-3" />Em Andamento
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleStatusChange(ideia.id, 'Rejeitado')}>
                  <X className="w-3 h-3" />Rejeitar
                </Button>
              </div>
            )}
            {ideia.status === 'Em andamento' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 gap-1"
                  onClick={() => triggerUpload(ideia.id)} disabled={uploadingId === ideia.id}>
                  {uploadingId === ideia.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {uploadingId === ideia.id ? 'Enviando...' : 'Enviar Foto/Vídeo'}
                </Button>
                <Button size="sm" className="flex-1 gap-1" onClick={() => handleStatusChange(ideia.id, 'Aprovado')}>
                  <Check className="w-3 h-3" />Aprovar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && activeUploadId.current != null) handleMediaUpload(activeUploadId.current, file);
          e.target.value = '';
        }} />

      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Ideias de Conteúdo</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-sm text-muted-foreground">{ideias.length} ideias</p>
              {PLATAFORMAS.map(p => {
                const count = ideias.filter(i => i.plataforma === p.value).length;
                if (!count) return null;
                return (
                  <span key={p.value} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.tagClass}`}>
                    <p.icon className="w-3 h-3" />{p.label} {count}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-md border border-border">
              <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none h-8 w-8 p-0"><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('lista')} className="rounded-none h-8 w-8 p-0"><List className="w-4 h-4" /></Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Ideia</Button></DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova Ideia de Conteúdo</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="font-semibold">Plataforma</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATAFORMAS.map(p => {
                        const Icon = p.icon;
                        return (
                          <button key={p.value} type="button" onClick={() => setForm({ ...form, plataforma: p.value })}
                            className={`flex items-center gap-2 p-2.5 rounded-md text-sm font-medium transition-all border ${form.plataforma === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                            <Icon className="w-4 h-4" />{p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Assunto / Tema</Label><Textarea value={form.assunto_tema} onChange={e => setForm({ ...form, assunto_tema: e.target.value })} required placeholder="Sobre o que é esse conteúdo?" rows={2} /></div>
                  <div className="space-y-1.5"><Label>Data de Postagem</Label><Input type="date" value={form.data_postagem} onChange={e => setForm({ ...form, data_postagem: e.target.value })} /></div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Formato</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORMATOS.map(f => (
                        <button key={f.value} type="button" onClick={() => setForm({ ...form, formato: f.value })}
                          className={`text-left p-2 rounded-md text-sm transition-all border ${form.formato === f.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar como Pendente</Button>
                    <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={(e) => handleCreate(e as any, 'Em andamento')}>Salvar em Andamento</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <KanbanBoard columns={columns} onMove={handleKanbanMove} renderCard={renderKanbanCard} getId={(i) => String(i.id)} />
        ) : (
          <Tabs defaultValue="Pendente">
            <TabsList className="flex-wrap h-auto gap-1">
              {STATUS_COLS.map(col => <TabsTrigger key={col.id} value={col.id}>{col.title} ({ideias.filter(i => i.status === col.id).length})</TabsTrigger>)}
            </TabsList>
            {STATUS_COLS.map(col => <TabsContent key={col.id} value={col.id} className="mt-4">{renderListCards(ideias.filter(i => i.status === col.id))}</TabsContent>)}
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default IdeiasPage;
