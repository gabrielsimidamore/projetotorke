import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Projeto } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, FolderKanban, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLS = [
  { id: 'prospeccao', title: 'Prospecção', color: '#F5C518' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', color: '#3b82f6' },
  { id: 'em_negociacao', title: 'Em Negociação', color: '#a855f7' },
  { id: 'aprovado', title: 'Aprovado', color: '#22c55e' },
  { id: 'em_execucao', title: 'Em Execução', color: '#06b6d4' },
  { id: 'concluido', title: 'Concluído', color: '#15803d' },
  { id: 'perdido', title: 'Perdido', color: '#ef4444' },
];

const ProjetosPage = () => {
  const { toast } = useToast();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao' });

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
    else { toast({ title: 'Projeto criado!' }); setDialogOpen(false); setForm({ nome: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao' }); fetchData(); }
    setSaving(false);
  };

  const handleMove = async (itemId: string | number, newStatus: string) => {
    await supabase.from('projetos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', String(itemId));
    setProjetos(prev => prev.map(p => p.id === String(itemId) ? { ...p, status: newStatus as Projeto['status'] } : p));
    toast({ title: `Projeto movido para ${STATUS_COLS.find(c => c.id === newStatus)?.title}` });
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
      <Card className="hover:border-primary/30 transition-all">
        <CardContent className="p-3 space-y-2">
          <p className="text-sm font-semibold text-foreground leading-tight">{projeto.nome}</p>
          {projeto.clientes && (
            <p className="text-xs text-muted-foreground">{projeto.clientes.nome}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {projeto.valor_estimado && (
              <span className="text-xs font-medium text-primary">
                R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
            {daysSinceUpdate > 7 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive">{daysSinceUpdate}d parado</span>
            )}
          </div>
          {projeto.data_fechamento_prevista && (
            <p className="text-[11px] text-muted-foreground">Fechamento: {new Date(projeto.data_fechamento_prevista).toLocaleDateString('pt-BR')}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projetos</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-sm text-muted-foreground">{projetos.length} projetos</p>
              <p className="text-sm font-medium text-primary flex items-center gap-1">
                <DollarSign className="w-3 h-3" />Pipeline: R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Novo Projeto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>Nome do Projeto</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Valor Estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Data Fechamento</Label><Input type="date" value={form.data_fechamento_prevista} onChange={e => setForm({ ...form, data_fechamento_prevista: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
                <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} /></div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Projeto
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <KanbanBoard
          columns={columns}
          onMove={handleMove}
          renderCard={renderCard}
          getId={(p) => p.id}
        />
      </div>
    </Layout>
  );
};

export default ProjetosPage;
