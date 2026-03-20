import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Ideia } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const statusColor = (s: string) => {
    if (s === 'Pendente') return 'bg-primary/15 text-primary border border-primary/30';
    if (s === 'Em uso') return 'bg-blue-500/15 text-blue-500 border border-blue-500/30';
    if (s === 'Usado') return 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30';
    return 'bg-destructive/15 text-destructive border border-destructive/30';
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
    <Card className="hover:border-primary/30 transition-all">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            {platformIcon(ideia.plataforma ?? 'linkedin')}
          </div>
          <p className="text-sm font-medium text-foreground leading-tight flex-1">{ideia.assunto_tema}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ideia.formato}</span>
          {ideia.data_uso && <span className="text-[11px] text-muted-foreground">{new Date(ideia.data_uso).toLocaleDateString('pt-BR')}</span>}
        </div>
        {ideia.observacoes && <p className="text-xs text-muted-foreground line-clamp-2">{ideia.observacoes}</p>}
      </CardContent>
    </Card>
  );

  const renderListCards = (items: Ideia[]) => {
    if (items.length === 0) return <p className="text-center py-12 text-muted-foreground">Nenhuma ideia nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(ideia => (
          <Card key={ideia.id} className="hover:shadow-md transition-shadow hover:border-primary/30">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {platformIcon(ideia.plataforma ?? 'linkedin')}
                  <CardTitle className="text-sm font-semibold">{ideia.assunto_tema}</CardTitle>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor(ideia.status)}`}>{ideia.status}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{ideia.formato}</span>
                <span className="text-xs text-muted-foreground">{new Date(ideia.data_cadastro).toLocaleDateString('pt-BR')}</span>
              </div>
              {ideia.observacoes && <p className="text-sm text-muted-foreground mb-3">{ideia.observacoes}</p>}
              {ideia.status === 'Pendente' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleStatusChange(ideia.id, 'Em uso')}><Check className="w-3 h-3 mr-1" />Usar</Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => handleStatusChange(ideia.id, 'Rejeitado')}><X className="w-3 h-3 mr-1" />Rejeitar</Button>
                </div>
              )}
              {ideia.status === 'Em uso' && (
                <Button size="sm" className="w-full" variant="outline" onClick={() => handleStatusChange(ideia.id, 'Usado')}>Marcar como Usado</Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ideias de Conteúdo</h1>
            <p className="text-sm text-muted-foreground">{ideias.length} ideias cadastradas</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-md overflow-hidden">
              <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-none">
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button variant={viewMode === 'lista' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('lista')} className="rounded-none">
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Nova Ideia</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova Ideia de Conteúdo</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-6">
                  {/* Plataforma */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Plataforma</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {PLATAFORMAS.map(p => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setForm({ ...form, plataforma: p.value })}
                            className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${form.plataforma === p.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                          >
                            <Icon className="w-4 h-4" />{p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assunto */}
                  <div className="space-y-2">
                    <Label>Assunto / Tema</Label>
                    <Textarea value={form.assunto_tema} onChange={e => setForm({ ...form, assunto_tema: e.target.value })} required placeholder="Sobre o que é esse conteúdo?" rows={2} />
                  </div>

                  {/* Data */}
                  <div className="space-y-2">
                    <Label>Data de Postagem</Label>
                    <Input type="date" value={form.data_postagem} onChange={e => setForm({ ...form, data_postagem: e.target.value })} />
                  </div>

                  {/* Formato */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Formato do Conteúdo</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {FORMATOS.map(f => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setForm({ ...form, formato: f.value })}
                          className={`text-left p-3 rounded-lg border text-sm transition-all ${form.formato === f.value ? 'border-primary bg-primary/10 text-primary font-medium' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} />
                  </div>

                  {/* Botões */}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar como Pendente
                    </Button>
                    <Button type="button" variant="outline" className="flex-1" disabled={saving} onClick={(e) => handleCreate(e as any, 'Em uso')}>
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
          <Tabs defaultValue="pendentes">
            <TabsList>
              {STATUS_COLS.map(col => (
                <TabsTrigger key={col.id} value={col.id}>{col.title} ({ideias.filter(i => i.status === col.id).length})</TabsTrigger>
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
