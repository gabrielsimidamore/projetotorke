import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Projeto } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, DollarSign, Trash2, LayoutGrid, KanbanSquare, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

const STATUS_COLS = [
  { id: 'prospeccao',       title: 'Prospecção',       color: '#e5a700' },
  { id: 'proposta_enviada', title: 'Proposta Enviada',  color: '#3b82f6' },
  { id: 'em_negociacao',    title: 'Em Negociação',     color: '#a855f7' },
  { id: 'aprovado',         title: 'Aprovado',          color: '#22c55e' },
  { id: 'em_execucao',      title: 'Em Execução',       color: '#06b6d4' },
  { id: 'concluido',        title: 'Concluído',         color: '#10b981' },
  { id: 'perdido',          title: 'Perdido',           color: '#ef4444' },
];

const COR_OPCOES = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#10b981','#f97316','#ec4899'];

const ProjetosPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [form, setForm] = useState({
    nome: '', empresa: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '',
    responsavel: '', descricao: '', status: 'prospeccao', foto_url: '', cor: '#6366f1',
  });

  const fetchData = async () => {
    const [p, c] = await Promise.all([
      supabase.from('projetos').select('*, clientes(nome, empresa)').order('ordem'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ]);
    setProjetos(p.data ?? []);
    setClientes(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (searchParams.get('novo') === '1') setDialogOpen(true); }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('projetos').insert({
      nome: form.nome,
      empresa: form.empresa || null,
      cliente_id: form.cliente_id || null,
      valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
      data_fechamento_prevista: form.data_fechamento_prevista || null,
      responsavel: form.responsavel || null,
      descricao: form.descricao || null,
      status: form.status,
      foto_url: form.foto_url || null,
      cor: form.cor,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: '🚀 Projeto criado!' });
      setDialogOpen(false);
      setForm({ nome: '', empresa: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao', foto_url: '', cor: '#6366f1' });
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (projeto: Projeto) => {
    setDeleting(true);
    const { error } = await supabase.from('projetos').delete().eq('id', projeto.id);
    if (error) toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    else {
      toast({ title: '🗑️ Projeto excluído' });
      setProjetos(prev => prev.filter(p => p.id !== projeto.id));
      setSheetOpen(false); setSelectedProjeto(null);
    }
    setDeleting(false);
  };

  const handleMove = async (itemId: string | number, newStatus: string) => {
    await supabase.from('projetos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', String(itemId));
    setProjetos(prev => prev.map(p => p.id === String(itemId) ? { ...p, status: newStatus as Projeto['status'] } : p));
    toast({ title: `Projeto movido para ${STATUS_COLS.find(c => c.id === newStatus)?.title}` });
  };

  const handleCardClick = (projeto: Projeto) => { setSelectedProjeto(projeto); setSheetOpen(true); };

  const columns: KanbanColumn<Projeto>[] = STATUS_COLS.map(col => ({
    id: col.id, title: col.title, color: col.color,
    items: projetos.filter(p => p.status === col.id),
  }));

  const totalPipeline = projetos
    .filter(p => !['concluido', 'perdido'].includes(p.status))
    .reduce((a, p) => a + (p.valor_estimado ?? 0), 0);

  const renderKanbanCard = (projeto: Projeto) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(projeto.updated_at).getTime()) / 86400000);
    return (
      <div className="bg-card rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
        onClick={() => handleCardClick(projeto)}>
        <div className="flex items-center gap-2">
          {projeto.foto_url ? (
            <img src={projeto.foto_url} alt={projeto.nome} className="w-7 h-7 rounded-md object-cover border border-border shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: projeto.cor || '#6366f1' }}>
              {projeto.nome.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{projeto.nome}</p>
            {(projeto.empresa || projeto.clientes) && (
              <p className="text-xs text-muted-foreground truncate">{projeto.empresa || projeto.clientes?.nome}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {projeto.valor_estimado != null && (
            <span className="text-xs font-semibold text-primary">
              R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {daysSinceUpdate > 7 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {daysSinceUpdate}d parado
            </span>
          )}
        </div>
        {projeto.responsavel && <p className="text-xs text-muted-foreground">👤 {projeto.responsavel}</p>}
      </div>
    );
  };

  const renderGridCard = (projeto: Projeto) => (
    <div key={projeto.id}
      className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all group cursor-pointer"
      onClick={() => navigate(`/projetos/${projeto.id}`)}>
      {/* Cover */}
      <div className="h-24 relative flex items-center justify-center"
        style={{ backgroundColor: projeto.foto_url ? undefined : (projeto.cor || '#6366f1') }}>
        {projeto.foto_url ? (
          <img src={projeto.foto_url} alt={projeto.nome} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl font-bold text-white/30 select-none">{projeto.nome.charAt(0)}</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        <div className="absolute top-2 right-2">
          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-black/40 text-white backdrop-blur-sm">
            {STATUS_COLS.find(c => c.id === projeto.status)?.title}
          </span>
        </div>
      </div>
      {/* Content */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold text-foreground truncate">{projeto.nome}</p>
        {(projeto.empresa || projeto.clientes) && (
          <p className="text-xs text-muted-foreground truncate">{projeto.empresa || projeto.clientes?.nome}</p>
        )}
        <div className="flex items-center justify-between">
          {projeto.valor_estimado != null ? (
            <span className="text-xs font-semibold text-primary">
              R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : <span />}
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Projetos</h1>
            <div className="flex items-center gap-4 mt-0.5">
              <p className="text-sm text-muted-foreground">{projetos.length} projetos</p>
              <p className="flex items-center gap-1 text-sm font-semibold text-primary">
                <DollarSign className="w-4 h-4" />Pipeline: R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle view */}
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <button onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <KanbanSquare className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Projeto</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  {/* Cor */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor do Projeto</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COR_OPCOES.map(c => (
                        <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })}
                          className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Nome do Projeto *</Label>
                    <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Empresa</Label>
                    <Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="Nome da empresa cliente" />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Cliente (CRM)</Label>
                    <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Vincular cliente do CRM (opcional)" /></SelectTrigger>
                      <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label className="text-xs">Valor Estimado</Label>
                      <Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} />
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Data Fechamento</Label>
                      <Input type="date" value={form.data_fechamento_prevista} onChange={e => setForm({ ...form, data_fechamento_prevista: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Responsável</Label>
                    <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome ou email" />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">URL da Foto (opcional)</Label>
                    <Input value={form.foto_url} onChange={e => setForm({ ...form, foto_url: e.target.value })} placeholder="https://..." />
                    {form.foto_url && <img src={form.foto_url} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-border" />}
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Descrição</Label>
                    <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Status Inicial</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_COLS.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Projeto
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View: GRID */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {projetos.map(renderGridCard)}
            {projetos.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground">
                <p className="text-sm">Nenhum projeto ainda. Crie o primeiro!</p>
              </div>
            )}
          </div>
        )}

        {/* View: KANBAN */}
        {viewMode === 'kanban' && (
          <KanbanBoard columns={columns} onMove={handleMove} renderCard={renderKanbanCard} getId={(p) => p.id} />
        )}

        {/* Sheet detalhe rápido */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader><SheetTitle>{selectedProjeto?.nome}</SheetTitle></SheetHeader>
            {selectedProjeto && (
              <div className="mt-6 space-y-4">
                {/* Cover mini */}
                <div className="h-20 rounded-xl overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: selectedProjeto.foto_url ? undefined : (selectedProjeto.cor || '#6366f1') }}>
                  {selectedProjeto.foto_url
                    ? <img src={selectedProjeto.foto_url} alt={selectedProjeto.nome} className="w-full h-full object-cover" />
                    : <span className="text-3xl font-bold text-white/40">{selectedProjeto.nome.charAt(0)}</span>
                  }
                </div>

                <Button className="w-full gap-2" onClick={() => { setSheetOpen(false); navigate(`/projetos/${selectedProjeto.id}`); }}>
                  Abrir Projeto Completo <ArrowRight className="w-4 h-4" />
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Empresa', selectedProjeto.empresa],
                    ['Cliente', selectedProjeto.clientes?.nome],
                    ['Responsável', selectedProjeto.responsavel],
                    ['Valor', selectedProjeto.valor_estimado ? `R$ ${selectedProjeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                    ['Fechamento', selectedProjeto.data_fechamento_prevista ? new Date(selectedProjeto.data_fechamento_prevista).toLocaleDateString('pt-BR') : null],
                    ['Status', STATUS_COLS.find(c => c.id === selectedProjeto.status)?.title],
                  ].filter(([, val]) => val).map(([label, val]) => (
                    <div key={label as string} className="p-3 rounded-lg bg-muted">
                      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                      <p className="text-sm text-foreground">{val}</p>
                    </div>
                  ))}
                </div>

                {selectedProjeto.descricao && (
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-[11px] text-muted-foreground mb-0.5">Descrição</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selectedProjeto.descricao}</p>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2" disabled={deleting}>
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Excluir Projeto
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir projeto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>"{selectedProjeto.nome}"</strong>? Todas as tarefas, custos e ideias vinculadas também serão removidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(selectedProjeto)}>
                          Sim, excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default ProjetosPage;
