import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Projeto } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, DollarSign } from 'lucide-react';
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
      <div className="glass-card p-3 space-y-2">
        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3 }}>{projeto.nome}</p>
        {projeto.clientes && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{projeto.clientes.nome}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {projeto.valor_estimado != null && (
            <span style={{ fontSize: 12, fontWeight: 600, color: '#F5C518' }}>
              R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          {daysSinceUpdate > 7 && (
            <span className="status-rejected">{daysSinceUpdate}d parado</span>
          )}
        </div>
        {projeto.data_fechamento_prevista && (
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Fechamento: {new Date(projeto.data_fechamento_prevista).toLocaleDateString('pt-BR')}</p>
        )}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Projetos</h1>
            <div className="flex items-center gap-4 mt-0.5">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{projetos.length} projetos</p>
              <p className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: '#F5C518' }}>
                <DollarSign className="w-3 h-3" />Pipeline: R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Projeto</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="text-sm">Novo Projeto</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5"><Label className="text-xs">Nome do Projeto</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className="h-8 text-xs" /></div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label className="text-xs">Valor Estimado</Label><Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} className="h-8 text-xs" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Data Fechamento</Label><Input type="date" value={form.data_fechamento_prevista} onChange={e => setForm({ ...form, data_fechamento_prevista: e.target.value })} className="h-8 text-xs" /></div>
                </div>
                <div className="space-y-1.5"><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} className="h-8 text-xs" /></div>
                <div className="space-y-1.5"><Label className="text-xs">Descrição</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={3} className="text-xs resize-none" /></div>
                <Button type="submit" className="w-full h-8 text-xs" disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Criar Projeto
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
