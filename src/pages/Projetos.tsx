import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase, type Projeto } from '@/lib/supabase';
import { KanbanBoard, type KanbanColumn } from '@/components/KanbanBoard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, DollarSign, LayoutGrid, KanbanSquare, ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLS = [
  { id: 'prospeccao',       title: 'Prospecção',      color: '#e5a700' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', color: '#3b82f6' },
  { id: 'em_negociacao',    title: 'Em Negociação',    color: '#a855f7' },
  { id: 'aprovado',         title: 'Aprovado',         color: '#22c55e' },
  { id: 'em_execucao',      title: 'Em Execução',      color: '#06b6d4' },
  { id: 'concluido',        title: 'Concluído',        color: '#10b981' },
  { id: 'perdido',          title: 'Perdido',          color: '#ef4444' },
];

const COR_OPCOES = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#a855f7','#06b6d4','#10b981','#f97316','#ec4899'];

const ProjetosPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);

  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const [form, setForm] = useState({
    nome: '', empresa: '', cliente_id: '', valor_estimado: '',
    data_fechamento_prevista: '', responsavel: '', descricao: '',
    status: 'prospeccao', cor: '#6366f1',
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

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const uploadFoto = async (file: File): Promise<string | null> => {
    setUploadProgress(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('projeto-fotos').upload(path, file);
    setUploadProgress(false);
    if (error) { toast({ title: 'Erro no upload da foto', description: error.message, variant: 'destructive' }); return null; }
    const { data } = supabase.storage.from('projeto-fotos').getPublicUrl(path);
    return data.publicUrl;
  };

  const resetForm = () => {
    setForm({ nome: '', empresa: '', cliente_id: '', valor_estimado: '', data_fechamento_prevista: '', responsavel: '', descricao: '', status: 'prospeccao', cor: '#6366f1' });
    setFotoFile(null);
    setFotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let foto_url: string | null = null;
    if (fotoFile) {
      foto_url = await uploadFoto(fotoFile);
      if (!foto_url) { setSaving(false); return; }
    }
    const { error } = await supabase.from('projetos').insert({
      nome: form.nome,
      empresa: form.empresa || null,
      cliente_id: form.cliente_id || null,
      valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
      data_fechamento_prevista: form.data_fechamento_prevista || null,
      responsavel: form.responsavel || null,
      descricao: form.descricao || null,
      status: form.status,
      foto_url,
      cor: form.cor,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Projeto criado!' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleMove = async (itemId: string | number, newStatus: string) => {
    await supabase.from('projetos').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', String(itemId));
    setProjetos(prev => prev.map(p => p.id === String(itemId) ? { ...p, status: newStatus as Projeto['status'] } : p));
  };

  const totalPipeline = projetos
    .filter(p => !['concluido', 'perdido'].includes(p.status))
    .reduce((a, p) => a + (p.valor_estimado ?? 0), 0);

  const renderKanbanCard = (projeto: Projeto) => (
    <div
      className="bg-card rounded-lg border border-border p-3 space-y-2 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => navigate(`/projetos/${projeto.id}`)}>
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
      {projeto.valor_estimado != null && (
        <span className="text-xs font-semibold text-primary">
          R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </span>
      )}
    </div>
  );

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </Layout>
  );

  const columns: KanbanColumn<Projeto>[] = STATUS_COLS.map(col => ({
    id: col.id, title: col.title, color: col.color,
    items: projetos.filter(p => p.status === col.id),
  }));

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
                <DollarSign className="w-4 h-4" />
                Pipeline: R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
              <button onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <KanbanSquare className="w-4 h-4" />
              </button>
            </div>

            <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Novo Projeto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">

                  {/* Foto upload */}
                  <div className="space-y-2">
                    <Label className="text-xs">Foto do Projeto</Label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="relative cursor-pointer group rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden"
                      style={{ height: fotoPreview ? 140 : 90 }}>
                      {fotoPreview ? (
                        <>
                          <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white text-xs font-medium">Trocar foto</p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFotoPreview(null); setFotoFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                            className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                          <ImagePlus className="w-6 h-6" />
                          <p className="text-xs">Clique para adicionar foto</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  </div>

                  {/* Cor */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cor (quando não há foto)</Label>
                    <div className="flex gap-2 flex-wrap">
                      {COR_OPCOES.map(c => (
                        <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })}
                          className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                          style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do Projeto *</Label>
                    <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Empresa</Label>
                    <Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} placeholder="Nome da empresa cliente" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Cliente (CRM)</Label>
                    <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Vincular cliente (opcional)" /></SelectTrigger>
                      <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor Estimado</Label>
                      <Input type="number" step="0.01" value={form.valor_estimado} onChange={e => setForm({ ...form, valor_estimado: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data Fechamento</Label>
                      <Input type="date" value={form.data_fechamento_prevista} onChange={e => setForm({ ...form, data_fechamento_prevista: e.target.value })} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Responsável</Label>
                    <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} placeholder="Nome ou email" />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Status Inicial</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_COLS.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving || uploadProgress}>
                    {(saving || uploadProgress) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Criar Projeto
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* View: GRID (galeria) */}
        {viewMode === 'grid' && (
          <>
            {projetos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <LayoutGrid className="w-7 h-7" />
                </div>
                <p className="text-sm">Nenhum projeto ainda. Crie o primeiro!</p>
                <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Novo Projeto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {projetos.map(projeto => (
                  <div
                    key={projeto.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
                    onClick={() => navigate(`/projetos/${projeto.id}`)}>
                    {/* Capa */}
                    <div className="relative h-32 flex items-center justify-center"
                      style={{ backgroundColor: projeto.foto_url ? undefined : (projeto.cor || '#6366f1') }}>
                      {projeto.foto_url ? (
                        <img src={projeto.foto_url} alt={projeto.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl font-bold text-white/25 select-none">{projeto.nome.charAt(0)}</span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-sm">
                        {STATUS_COLS.find(c => c.id === projeto.status)?.title}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="p-3 space-y-1">
                      <p className="text-sm font-semibold text-foreground truncate">{projeto.nome}</p>
                      {(projeto.empresa || projeto.clientes) && (
                        <p className="text-xs text-muted-foreground truncate">{projeto.empresa || projeto.clientes?.nome}</p>
                      )}
                      {projeto.valor_estimado != null && (
                        <p className="text-xs font-semibold text-primary">
                          R$ {projeto.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Card "Novo projeto" */}
                <div
                  onClick={() => setDialogOpen(true)}
                  className="border-2 border-dashed border-border rounded-2xl h-[168px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium">Novo projeto</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* View: KANBAN */}
        {viewMode === 'kanban' && (
          <KanbanBoard columns={columns} onMove={handleMove} renderCard={renderKanbanCard} getId={(p) => p.id} />
        )}
      </div>
    </Layout>
  );
};

export default ProjetosPage;
