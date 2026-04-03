import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2, Trash2, Pencil, Lightbulb, Bug, Sparkles, Wrench, FolderKanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TIPO_CFG = {
  melhoria: { label: 'Melhoria', icon: Wrench,    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  ideia:    { label: 'Ideia',    icon: Lightbulb,  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  sugestao: { label: 'Sugestão', icon: Sparkles,   color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  bug:      { label: 'Bug',      icon: Bug,         color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

const STATUS_CFG = {
  aberta:       { label: 'Aberta',       color: 'bg-yellow-100 text-yellow-700' },
  em_analise:   { label: 'Em análise',   color: 'bg-blue-100 text-blue-700' },
  aprovada:     { label: 'Aprovada',     color: 'bg-green-100 text-green-700' },
  implementada: { label: 'Implementada', color: 'bg-emerald-100 text-emerald-700' },
  recusada:     { label: 'Recusada',     color: 'bg-red-100 text-red-700' },
};

const PRIORIDADE_CFG = {
  baixa:   'bg-gray-100 text-gray-600',
  media:   'bg-blue-100 text-blue-600',
  alta:    'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-700',
};

const RESPONSAVEIS = ['Gabriel Pinheiro', 'Junior Pinheiro'];

type Melhoria = {
  id: string; titulo: string; descricao: string | null;
  tipo: string; status: string; prioridade: string;
  responsavel: string | null; autor: string | null;
  projeto_id: string | null; created_at: string;
};

const emptyForm = {
  titulo: '', descricao: '', tipo: 'melhoria', status: 'aberta',
  prioridade: 'media', responsavel: '', autor: '', projeto_id: '',
};

export default function Melhorias() {
  const { toast } = useToast();
  const [melhorias, setMelhorias] = useState<Melhoria[]>([]);
  const [projetos, setProjetos] = useState<{ id: string; nome: string; cor: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Melhoria | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  const fetchData = async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('melhorias').select('*').order('created_at', { ascending: false }),
      supabase.from('projetos').select('id, nome, cor').order('nome'),
    ]);
    setMelhorias(m ?? []);
    setProjetos(p ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (m: Melhoria) => {
    setEditing(m);
    setForm({
      titulo: m.titulo, descricao: m.descricao ?? '', tipo: m.tipo,
      status: m.status, prioridade: m.prioridade,
      responsavel: m.responsavel ?? '', autor: m.autor ?? '',
      projeto_id: m.projeto_id ?? '',
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { toast({ title: 'Título obrigatório', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      titulo: form.titulo, descricao: form.descricao || null,
      tipo: form.tipo, status: form.status, prioridade: form.prioridade,
      responsavel: form.responsavel || null, autor: form.autor || null,
      projeto_id: form.projeto_id || null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('melhorias').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('melhorias').insert(payload));
    }
    setSaving(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing ? 'Atualizado!' : 'Registrado!' });
    setDialog(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('melhorias').delete().eq('id', id);
    setDeletingId(null);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return; }
    setMelhorias(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Removido' });
  };

  const filtered = melhorias.filter(m => {
    if (tipoFilter !== 'todos' && m.tipo !== tipoFilter) return false;
    if (statusFilter !== 'todos' && m.status !== statusFilter) return false;
    return true;
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_CFG).map(s => [s, melhorias.filter(m => m.status === s).length])
  );

  return (
    <Layout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Melhorias & Sugestões</h1>
            <p className="text-sm text-muted-foreground">{melhorias.length} registro{melhorias.length !== 1 ? 's' : ''} no total</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />Nova Entrada
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(STATUS_CFG).map(([s, cfg]) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'todos' : s)}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${statusFilter === s ? 'border-primary ring-1 ring-primary' : 'border-border'}`}
            >
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className="text-xl font-bold text-foreground">{counts[s] ?? 0}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(TIPO_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {(tipoFilter !== 'todos' || statusFilter !== 'todos') && (
            <button onClick={() => { setTipoFilter('todos'); setStatusFilter('todos'); }} className="text-xs text-muted-foreground hover:text-foreground">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-3">
            <Lightbulb className="w-10 h-10 mx-auto opacity-20" />
            <p className="text-sm font-medium">Nenhuma entrada encontrada</p>
            <Button variant="outline" size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />Adicionar
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(m => {
              const tipoCfg = TIPO_CFG[m.tipo as keyof typeof TIPO_CFG] ?? TIPO_CFG.melhoria;
              const TipoIcon = tipoCfg.icon;
              const proj = projetos.find(p => p.id === m.projeto_id);
              return (
                <Card key={m.id} className="group hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <TipoIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm">{m.titulo}</p>
                          <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(m)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                              {deletingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        {m.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.descricao}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge className={tipoCfg.color} variant="outline">{tipoCfg.label}</Badge>
                          <Badge className={STATUS_CFG[m.status as keyof typeof STATUS_CFG]?.color ?? 'bg-muted text-muted-foreground'} variant="outline">
                            {STATUS_CFG[m.status as keyof typeof STATUS_CFG]?.label ?? m.status}
                          </Badge>
                          <Badge className={PRIORIDADE_CFG[m.prioridade as keyof typeof PRIORIDADE_CFG] ?? 'bg-muted text-muted-foreground'} variant="outline">
                            {m.prioridade}
                          </Badge>
                          {m.responsavel && <span className="text-xs text-muted-foreground">👤 {m.responsavel}</span>}
                          {proj && (
                            <span className="text-xs font-medium flex items-center gap-1" style={{ color: proj.cor || '#6366f1' }}>
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: proj.cor || '#6366f1' }} />
                              {proj.nome}
                            </span>
                          )}
                          {m.autor && <span className="text-xs text-muted-foreground">por {m.autor}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Entrada' : 'Nova Entrada'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required placeholder="Descreva brevemente..." />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPO_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={4} placeholder="Detalhe a melhoria, ideia ou sugestão..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Responsável</Label>
                <Input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Quem vai resolver" />
                <div className="flex gap-1.5 mt-1">
                  {RESPONSAVEIS.map(name => (
                    <button key={name} type="button" onClick={() => setForm(f => ({ ...f, responsavel: name }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.responsavel === name ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Autor / Solicitante</Label>
                <Input value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))} placeholder="Quem sugeriu" />
                <div className="flex gap-1.5 mt-1">
                  {RESPONSAVEIS.map(name => (
                    <button key={name} type="button" onClick={() => setForm(f => ({ ...f, autor: name }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${form.autor === name ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" />Vincular Projeto</Label>
              <Select value={form.projeto_id} onValueChange={v => setForm(f => ({ ...f, projeto_id: v === '__none' ? '' : v }))}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhum projeto</SelectItem>
                  {projetos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.cor || '#6366f1' }} />
                        {p.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? 'Salvar' : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
