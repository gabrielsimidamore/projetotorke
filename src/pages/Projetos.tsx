import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Projeto } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLS = [
  { id: 'prospeccao', title: 'Prospecção', color: '#e5a700' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', color: '#3b82f6' },
  { id: 'em_negociacao', title: 'Em Negociação', color: '#a855f7' },
  { id: 'aprovado', title: 'Aprovado', color: '#22c55e' },
  { id: 'em_execucao', title: 'Em Execução', color: '#06b6d4' },
  { id: 'concluido', title: 'Concluído', color: '#10b981' },
  { id: 'perdido', title: 'Perdido', color: '#ef4444' },
];

const ProjetosPage = () => {
  const { toast } = useToast();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [ideias, setIdeias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao', observacoes: '' });

  const fetchData = async () => {
    const [p, c, i] = await Promise.all([
      supabase.from('projetos').select('*, clientes(nome, empresa)').order('ordem'),
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('ideias').select('id, assunto_tema').order('created_at', { ascending: false }),
    ]);
    setProjetos(p.data ?? []);
    setClientes(c.data ?? []);
    setIdeias(i.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('projetos').insert({
      nome: form.nome,
      cliente_id: form.cliente_id || null,
      valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
      data_fechamento_prevista: form.data_fechamento_prevista || null,
      responsavel: form.responsavel || null,
      descricao: form.descricao || null,
      status: form.status,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Projeto criado!' }); setDialogOpen(false); setForm({ nome: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao', observacoes: '' }); fetchData(); }
    setSaving(false);
  };

  const handleMove = async (itemId: string | number, newStatus: string) => {
    await supabase.from('projetos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', String(itemId));
    setProjetos(prev => prev.map(p => p.id === String(itemId) ? { ...p, status: newStatus as Projeto['status'] } : p));
    toast({ title: `Projeto movido para ${STATUS_COLS.find(c => c.id === newStatus)?.title}` });
  };

  const handleCardClick = (projeto: Projeto) => {
    setSelectedProjeto(projeto);
    setSheetOpen(true);
  };

  const columns: KanbanColumn<Projeto>[] = STATUS_COLS.map(col => ({
    id: col.id,
    title: col.title,
    color: col.color,
    items: projetos.filter(p => p.status === col.id),
  }));

  const totalPipeline = projetos.filter(p => !['concluido', 'perdido'].includes(p.status)).reduce((a, p) => a + (p.valor_estimado ?? 0), 0);

  const renderCard = (projeto: Projeto) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(projeto.updated_at).getTime()) / 86400000);
    return (
      <div className="bg-card rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer" onClick={() => handleCardClick(projeto)}>
        <p className="text-sm font-medium text-foreground">{projeto.nome}</p>
        {projeto.clientes && <p className="text-xs text-muted-foreground">{projeto.clientes.nome}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          {projeto.valor_estimado != null && (
            <span className="text-sm font-semibold text-primary">
              R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {daysSinceUpdate > 7 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{daysSinceUpdate}d parado</span>
          )}
        </div>
        {projeto.responsavel && <p className="text-xs text-muted-foreground">👤 {projeto.responsavel}</p>}
        {projeto.data_fechamento_prevista && (
          <p className="text-xs text-muted-foreground">📅 {new Date(projeto.data_fechamento_prevista).toLocaleDateString('pt-BR')}</p>
        )}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Projeto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5"><Label>Nome do Projeto</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Valor Estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>Data Fechamento</Label><Input type="date" value={form.data_fechamento_prevista} onChange={e => setForm({ ...form, data_fechamento_prevista: e.target.value })} /></div>
                </div>
                <div className="space-y-1.5"><Label>Responsável / Executor</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome de quem vai executar" /></div>
                <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} /></div>
                <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={2} placeholder="Notas adicionais..." /></div>
                <div className="space-y-1.5">
                  <Label>Vincular Ideia (opcional)</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>{ideias.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.assunto_tema}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Projeto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <KanbanBoard columns={columns} onMove={handleMove} renderCard={renderCard} getId={(p) => p.id} />

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedProjeto?.nome}</SheetTitle>
            </SheetHeader>
            {selectedProjeto && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Cliente', selectedProjeto.clientes?.nome],
                    ['Responsável', selectedProjeto.responsavel],
                    ['Valor', selectedProjeto.valor_estimado ? `R$ ${selectedProjeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null],
                    ['Fechamento', selectedProjeto.data_fechamento_prevista ? new Date(selectedProjeto.data_fechamento_prevista).toLocaleDateString('pt-BR') : null],
                    ['Status', STATUS_COLS.find(c => c.id === selectedProjeto.status)?.title],
                    ['Criado em', new Date(selectedProjeto.created_at).toLocaleDateString('pt-BR')],
                  ].map(([label, val]) => val && (
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
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default ProjetosPage;
