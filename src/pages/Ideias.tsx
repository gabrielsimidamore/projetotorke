import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Ideia } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Check, X, LayoutGrid, List, Linkedin, Instagram, Youtube, Facebook, Globe, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLATAFORMAS = [
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'tiktok', label: 'TikTok', icon: Globe },
  { value: 'blog', label: 'Blog', icon: BookOpen },
];

const FORMATOS = [
  { value: 'storytelling', label: '📖 Storytelling' },
  { value: 'informativo', label: '📊 Informativo / Educativo' },
  { value: 'dica', label: '🎯 Dica Prática' },
  { value: 'opiniao', label: '💬 Opinião / Ponto de Vista' },
  { value: 'case', label: '🏆 Case de Sucesso' },
  { value: 'enquete', label: '❓ Pergunta / Enquete' },
  { value: 'promocional', label: '🛒 Promocional / Oferta' },
  { value: 'bastidores', label: '🎉 Bastidores' },
  { value: 'lancamento', label: '📣 Lançamento / Novidade' },
  { value: 'parceria', label: '🤝 Parceria / Depoimento' },
];

const STATUS_COLS = [
  { id: 'Pendente', title: 'Pendentes', color: '#F5C518' },
  { id: 'Em uso', title: 'Em Uso', color: '#3b82f6' },
  { id: 'Usado', title: 'Usados', color: '#22c55e' },
  { id: 'Rejeitado', title: 'Rejeitados', color: '#ef4444' },
];

const IdeiasPage = () => {
  const { toast } = useToast();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');
  const [form, setForm] = useState({
    assunto_tema: '', formato: 'storytelling', observacoes: '', plataforma: 'linkedin', data_postagem: '',
  });

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
      assunto_tema: form.assunto_tema,
      formato: form.formato,
      observacoes: form.observacoes || null,
      plataforma: form.plataforma,
      data_uso: form.data_postagem || null,
      status,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Ideia criada!' }); setDialogOpen(false); setForm({ assunto_tema: '', formato: 'storytelling', observacoes: '', plataforma: 'linkedin', data_postagem: '' }); fetchData(); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await supabase.from('ideias').update({ status, data_uso: status === 'Em uso' ? new Date().toISOString().split('T')[0] : null }).eq('id', id);
    setIdeias(prev => prev.map(i => i.id === id ? { ...i, status: status as Ideia['status'] } : i));
    toast({ title: `Status atualizado para ${status}` });
  };

  const handleKanbanMove = async (itemId: string | number, newStatus: string) => {
    await handleStatusChange(Number(itemId), newStatus);
  };

  const platformIcon = (p: string) => {
    const plat = PLATAFORMAS.find(pl => pl.value === p);
    if (!plat) return null;
    const Icon = plat.icon;
    return <Icon className="w-3 h-3" />;
  };

  const columns: KanbanColumn<Ideia>[] = STATUS_COLS.map(col => ({
    id: col.id,
    title: col.title,
    color: col.color,
    items: ideias.filter(i => i.status === col.id),
  }));

  const renderKanbanCard = (ideia: Ideia) => (
    <div className="glass-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{platformIcon(ideia.plataforma ?? 'linkedin')}</span>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }} className="flex-1">{ideia.assunto_tema}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="status-blue">{ideia.formato}</span>
        {ideia.data_uso && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date(ideia.data_uso).toLocaleDateString('pt-BR')}</span>}
      </div>
      {ideia.observacoes && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }} className="line-clamp-2">{ideia.observacoes}</p>}
    </div>
  );

  const renderListCards = (items: Ideia[]) => {
    if (items.length === 0) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>Nenhuma ideia nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(ideia => (
          <div key={ideia.id} className="glass-card p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{platformIcon(ideia.plataforma ?? 'linkedin')}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{ideia.assunto_tema}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-blue">{ideia.formato}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{new Date(ideia.data_cadastro).toLocaleDateString('pt-BR')}</span>
            </div>
            {ideia.observacoes && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{ideia.observacoes}</p>}
            {ideia.status === 'Pendente' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleStatusChange(ideia.id, 'Em uso')}><Check className="w-3 h-3" />Usar</Button>
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={() => handleStatusChange(ideia.id, 'Rejeitado')} style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}><X className="w-3 h-3" />Rejeitar</Button>
              </div>
            )}
            {ideia.status === 'Em uso' && (
              <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => handleStatusChange(ideia.id, 'Usado')} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>Marcar como Usado</Button>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Ideias de Conteúdo</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{ideias.length} ideias cadastradas</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center overflow-hidden rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none h-7 w-8 p-0">
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('lista')} className="rounded-none h-7 w-8 p-0">
                <List className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Ideia</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="text-sm">Nova Ideia de Conteúdo</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Plataforma</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATAFORMAS.map(p => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setForm({ ...form, plataforma: p.value })}
                            className="flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              border: `1px solid ${form.plataforma === p.value ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.08)'}`,
                              background: form.plataforma === p.value ? 'rgba(245,197,24,0.08)' : 'rgba(255,255,255,0.03)',
                              color: form.plataforma === p.value ? '#F5C518' : 'rgba(255,255,255,0.5)',
                            }}
                          >
                            <Icon className="w-3.5 h-3.5" />{p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Assunto / Tema</Label>
                    <Textarea value={form.assunto_tema} onChange={e => setForm({ ...form, assunto_tema: e.target.value })} required placeholder="Sobre o que é esse conteúdo?" rows={2} className="text-xs resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data de Postagem</Label>
                    <Input type="date" value={form.data_postagem} onChange={e => setForm({ ...form, data_postagem: e.target.value })} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Formato do Conteúdo</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {FORMATOS.map(f => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setForm({ ...form, formato: f.value })}
                          className="text-left p-2 rounded-lg text-xs transition-all"
                          style={{
                            border: `1px solid ${form.formato === f.value ? 'rgba(245,197,24,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            background: form.formato === f.value ? 'rgba(245,197,24,0.08)' : 'transparent',
                            color: form.formato === f.value ? '#F5C518' : 'rgba(255,255,255,0.5)',
                            fontWeight: form.formato === f.value ? 500 : 400,
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} className="text-xs resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 h-8 text-xs" disabled={saving}>
                      {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Salvar como Pendente
                    </Button>
                    <Button type="button" variant="ghost" className="flex-1 h-8 text-xs" disabled={saving} onClick={(e) => handleCreate(e as any, 'Em uso')} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                      Salvar e Usar
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <KanbanBoard
            columns={columns}
            onMove={handleKanbanMove}
            renderCard={renderKanbanCard}
            getId={(i) => String(i.id)}
          />
        ) : (
          <Tabs defaultValue="Pendente">
            <TabsList>
              {STATUS_COLS.map(col => (
                <TabsTrigger key={col.id} value={col.id} className="text-xs">{col.title} ({ideias.filter(i => i.status === col.id).length})</TabsTrigger>
              ))}
            </TabsList>
            {STATUS_COLS.map(col => (
              <TabsContent key={col.id} value={col.id} className="mt-4">
                {renderListCards(ideias.filter(i => i.status === col.id))}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default IdeiasPage;
