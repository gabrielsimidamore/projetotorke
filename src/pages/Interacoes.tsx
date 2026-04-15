import { useEffect, useState, useMemo, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Mail, Phone, Linkedin, Loader2, Search, Instagram, PhoneCall, UserCheck,
  MessageSquare, Building2, Paperclip, X, ExternalLink, ChevronRight, Pencil, Trash2, FolderKanban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CANAL_CFG: Record<string, { icon: any; color: string; label: string }> = {
  ligacao:    { icon: PhoneCall,     color: '#a855f7', label: 'Ligação' },
  reuniao:    { icon: UserCheck,     color: '#06b6d4', label: 'Reunião' },
  email:      { icon: Mail,          color: '#e5a700', label: 'E-mail' },
  whatsapp:   { icon: Phone,         color: '#22c55e', label: 'WhatsApp' },
  visita:     { icon: UserCheck,     color: '#3b82f6', label: 'Visita' },
  outro:      { icon: MessageSquare, color: '#6b7280', label: 'Outro' },
  linkedin:   { icon: Linkedin,      color: '#3b82f6', label: 'LinkedIn' },
  instagram:  { icon: Instagram,     color: '#e1306c', label: 'Instagram' },
  presencial: { icon: UserCheck,     color: '#06b6d4', label: 'Presencial' },
};

function getStatusCalc(int: any): 'concluido' | 'em_executar' | 'em_aberto' {
  if (int.status === 'concluido' || int.status === 'aprovado' || int.status === 'resolvido') return 'concluido';
  const dateField = int.data_proxima_acao || int.proxima_acao;
  // Sem data de próxima ação = sem ação pendente = concluída
  if (!dateField) return 'concluido';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const data = new Date(dateField.substring(0, 10) + 'T00:00:00');
  if (data <= today) return 'concluido';
  if (data.getTime() === tomorrow.getTime()) return 'em_executar';
  return 'em_aberto';
}

function relTime(date: string) {
  const d = Date.now() - new Date(date).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `há ${dy}d`;
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

const emptyForm = {
  cliente_id: '', projeto_id: '', canal: '', data: '',
  regiao: '', mensagem: '', data_proxima_acao: '', status: 'aberto',
};

export default function Interacoes() {
  const { toast } = useToast();
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [editInteracao, setEditInteracao] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [uploadando, setUploadando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    const [i, c, p] = await Promise.all([
      supabase.from('interacoes')
        .select('*, clientes(id, nome, empresa, telefone, email, segmento), projetos(id, nome, cor)')
        .order('data_interacao', { ascending: false }),
      supabase.from('clientes').select('*').order('nome'),
      supabase.from('projetos').select('id, nome, cor').order('nome'),
    ]);

    // Auto-complete overdue interactions (proxima_acao <= today)
    const raw = i.data ?? [];
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const overdue = raw.filter((ix: any) => {
      const df = ix.data_proxima_acao || (ix.proxima_acao && /^\d{4}-\d{2}-\d{2}/.test(ix.proxima_acao) ? ix.proxima_acao : null);
      return ix.status !== 'concluido' && ix.status !== 'aprovado' && ix.status !== 'resolvido' &&
        df && new Date(df.substring(0, 10) + 'T00:00:00') <= today0;
    });
    if (overdue.length > 0) {
      await Promise.all(overdue.map((ix: any) =>
        supabase.from('interacoes').update({ status: 'concluido' }).eq('id', ix.id)
      ));
    }
    setInteracoes(raw.map((ix: any) =>
      overdue.find((o: any) => o.id === ix.id) ? { ...ix, status: 'concluido' } : ix
    ));
    setClientes(c.data ?? []);
    setProjetos(p.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setClienteDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clientesFiltrados = useMemo(() => {
    if (!clienteSearch) return clientes;
    return clientes.filter(c =>
      c.nome?.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.empresa?.toLowerCase().includes(clienteSearch.toLowerCase())
    );
  }, [clientes, clienteSearch]);

  const handleSelectCliente = (c: any) => {
    setForm({ ...form, cliente_id: c.id });
    setClienteSearch(`${c.nome}${c.empresa ? ` — ${c.empresa}` : ''}`);
    setClienteDropdown(false);
  };

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setArquivos(prev => [...prev, ...Array.from(e.target.files!)]);
  };
  const removerArquivo = (i: number) => setArquivos(prev => prev.filter((_, idx) => idx !== i));

  const uploadArquivos = async (interacaoId: string) => {
    const urls: string[] = [];
    for (const file of arquivos) {
      const path = `interacoes/${interacaoId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('anexos').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('anexos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente_id) { toast({ title: 'Selecione um cliente', variant: 'destructive' }); return; }
    if (!form.canal) { toast({ title: 'Selecione o tipo', variant: 'destructive' }); return; }
    setSaving(true);
    setUploadando(arquivos.length > 0);

    const payload: any = {
      cliente_id: form.cliente_id,
      canal: form.canal,
      mensagem: form.mensagem,
      status: form.status,
      data_interacao: form.data ? new Date(form.data).toISOString() : new Date().toISOString(),
      ...(form.regiao && { regiao: form.regiao }),
      ...(form.data_proxima_acao && { data_proxima_acao: form.data_proxima_acao }),
      ...(form.projeto_id && { projeto_id: form.projeto_id }),
    };

    const { data: novaInt, error } = await supabase.from('interacoes').insert(payload).select().single();
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setSaving(false); setUploadando(false); return;
    }
    if (arquivos.length > 0 && novaInt) {
      const urls = await uploadArquivos(novaInt.id);
      if (urls.length > 0) await supabase.from('interacoes').update({ anexos: urls }).eq('id', novaInt.id);
    }
    toast({ title: 'Interação registrada!' });
    setDialogOpen(false);
    setForm(emptyForm);
    setClienteSearch('');
    setArquivos([]);
    setSaving(false);
    setUploadando(false);
    fetchData();
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    const { error } = await supabase.from('interacoes').update({ status: 'concluido' }).eq('id', id);
    setCompletingId(null);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return; }
    setInteracoes(prev => prev.map(i => i.id === id ? { ...i, status: 'concluido' } : i));
    toast({ title: 'Concluída!' });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('interacoes').delete().eq('id', id);
    setDeletingId(null);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return; }
    setInteracoes(prev => prev.filter(i => i.id !== id));
    toast({ title: 'Interação removida' });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInteracao) return;
    setSavingEdit(true);
    let newStatus = editInteracao.status;
    if (editInteracao.data_proxima_acao && newStatus !== 'concluido') {
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);
      if (new Date(editInteracao.data_proxima_acao + 'T00:00:00') <= today0) newStatus = 'concluido';
    }
    const { error } = await supabase.from('interacoes').update({
      mensagem: editInteracao.mensagem, status: newStatus,
      canal: editInteracao.canal, data_proxima_acao: editInteracao.data_proxima_acao || null,
    }).eq('id', editInteracao.id);
    setSavingEdit(false);
    if (error) { toast({ title: 'Erro', variant: 'destructive' }); return; }
    setInteracoes(prev => prev.map(i => i.id === editInteracao.id ? { ...i, ...editInteracao, status: newStatus } : i));
    toast({ title: 'Atualizada!' });
    setEditInteracao(null);
  };

  // Filter
  const filtered = useMemo(() => interacoes.filter(i => {
    const ms = !search || [i.clientes?.nome, i.clientes?.empresa, i.mensagem]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const mc = canalFilter === 'todos' || i.canal === canalFilter;
    const msf = statusFilter === 'todos' || (() => {
      const sc = getStatusCalc(i);
      if (statusFilter === 'em_aberto') return sc === 'em_aberto';
      if (statusFilter === 'em_executar') return sc === 'em_executar';
      if (statusFilter === 'concluido') return sc === 'concluido';
      return i.status === statusFilter;
    })();
    return ms && mc && msf;
  }), [interacoes, search, canalFilter, statusFilter]);

  // Group by client
  const clienteGroups = useMemo(() => {
    const map = new Map<string, {
      clienteId: string; cliente: any; interacoes: any[];
      emAberto: number; emExecutar: number; concluido: number;
    }>();
    filtered.forEach(int => {
      const cId = int.cliente_id || 'sem_cliente';
      const sc = getStatusCalc(int);
      if (!map.has(cId)) {
        map.set(cId, {
          clienteId: cId,
          cliente: int.clientes || { id: cId, nome: 'Sem cliente', empresa: '' },
          interacoes: [], emAberto: 0, emExecutar: 0, concluido: 0,
        });
      }
      const entry = map.get(cId)!;
      entry.interacoes.push(int);
      if (sc === 'em_aberto') entry.emAberto++;
      else if (sc === 'em_executar') entry.emExecutar++;
      else entry.concluido++;
    });
    return Array.from(map.values()).filter(e => e.interacoes.length > 0);
  }, [filtered]);

  // Global metrics (based on ALL interacoes, not filtered)
  const metrics = useMemo(() => {
    let concluido = 0, emAberto = 0, emExecutar = 0;
    interacoes.forEach(i => {
      const sc = getStatusCalc(i);
      if (sc === 'concluido') concluido++;
      else if (sc === 'em_executar') emExecutar++;
      else emAberto++;
    });
    return { concluido, emAberto, emExecutar };
  }, [interacoes]);

  const selectedGroup = useMemo(() =>
    selectedClienteId ? (clienteGroups.find(g => g.clienteId === selectedClienteId) ?? null) : null,
    [selectedClienteId, clienteGroups]
  );

  return (
    <Layout>
      <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 96px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground">Interações</h1>
            <p className="text-sm text-muted-foreground">
              {clienteGroups.length} clientes · {filtered.length} interações
              {metrics.emAberto > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">· {metrics.emAberto} em aberto</span>
              )}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={o => {
            setDialogOpen(o);
            if (!o) { setForm(emptyForm); setClienteSearch(''); setArquivos([]); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Interação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar Interação</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-1">

                {/* Cliente */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <Label>Cliente <span className="text-primary">*</span></Label>
                  <Input
                    placeholder="Buscar cliente..."
                    value={clienteSearch}
                    onChange={e => { setClienteSearch(e.target.value); setForm({ ...form, cliente_id: '' }); setClienteDropdown(true); }}
                    onFocus={() => setClienteDropdown(true)}
                    autoComplete="off"
                  />
                  {clienteDropdown && clientesFiltrados.length > 0 && (
                    <div className="absolute z-50 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                      {clientesFiltrados.map(c => (
                        <button key={c.id} type="button" onClick={() => handleSelectCliente(c)}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm transition-colors">
                          <span className="font-medium text-foreground">{c.nome}</span>
                          {c.empresa && <span className="text-muted-foreground"> — {c.empresa}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projeto */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" />Vincular Projeto</Label>
                  <Select value={form.projeto_id} onValueChange={v => setForm({ ...form, projeto_id: v === '__none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhum projeto (opcional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Nenhum projeto</SelectItem>
                      {projetos.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.cor || '#6366f1' }} />
                            {p.nome}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data e Tipo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Data <span className="text-primary">*</span></Label>
                    <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo <span className="text-primary">*</span></Label>
                    <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CANAL_CFG).map(([v, c]) => (
                          <SelectItem key={v} value={v}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Resumo */}
                <div className="space-y-1.5">
                  <Label>Resumo da Conversa <span className="text-primary">*</span></Label>
                  <Textarea value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })}
                    required rows={4} placeholder="Descreva o que foi conversado..." />
                </div>

                {/* Próxima Ação - data */}
                <div className="space-y-1.5">
                  <Label>Data da Próxima Ação</Label>
                  <Input type="date" value={form.data_proxima_acao} onChange={e => setForm({ ...form, data_proxima_acao: e.target.value })} />
                  <p className="text-xs text-muted-foreground">
                    Automaticamente: hoje/passou = Concluída · amanhã = Executar Hoje · futuro = Em Aberto
                  </p>
                </div>

                {/* Região */}
                <div className="space-y-1.5">
                  <Label>Região</Label>
                  <Input placeholder="Ex: São Paulo" value={form.regiao} onChange={e => setForm({ ...form, regiao: e.target.value })} />
                </div>

                {/* Anexos */}
                <div className="space-y-1.5">
                  <Label>Anexos</Label>
                  <div className="border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors text-center"
                    onClick={() => fileRef.current?.click()}>
                    <Paperclip className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Clique para escolher arquivos</p>
                    <input ref={fileRef} type="file" multiple className="hidden" onChange={handleArquivos} />
                  </div>
                  {arquivos.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {arquivos.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted rounded px-3 py-1.5">
                          <span className="text-xs text-foreground truncate max-w-[280px]">{f.name}</span>
                          <button type="button" onClick={() => removerArquivo(i)} className="ml-2 text-muted-foreground hover:text-destructive">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="submit" className="flex-1" disabled={saving || !form.cliente_id || !form.canal}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {uploadando ? 'Enviando...' : 'Registrar'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1"
                    onClick={() => { setDialogOpen(false); setForm(emptyForm); setClienteSearch(''); setArquivos([]); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Métricas globais */}
        <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
          {[
            { label: 'Concluídas', value: metrics.concluido, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
            { label: 'Em Aberto', value: metrics.emAberto, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
            { label: 'Executar Hoje', value: metrics.emExecutar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center border`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente, empresa..." value={search}
              onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos canais</SelectItem>
              {Object.entries(CANAL_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="em_aberto">Em Aberto</SelectItem>
              <SelectItem value="em_executar">Executar Hoje</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-1 gap-4 min-h-0">

            {/* Lista de clientes */}
            <div className="w-[320px] shrink-0 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {clienteGroups.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhuma interação encontrada
                  </div>
                )}
                {clienteGroups.map(group => (
                  <div
                    key={group.clienteId}
                    onClick={() => setSelectedClienteId(group.clienteId)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      selectedClienteId === group.clienteId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {(group.cliente?.nome || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {group.cliente?.nome || 'Sem cliente'}
                        </p>
                        {group.cliente?.empresa && (
                          <p className="text-xs text-muted-foreground truncate">{group.cliente.empresa}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {group.emAberto > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          {group.emAberto} aberto
                        </span>
                      )}
                      {group.emExecutar > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {group.emExecutar} hoje
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground">
                        {group.interacoes.length} total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-px bg-border shrink-0" />

            {/* Painel direito */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selectedGroup ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Selecione um cliente</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em qualquer cliente à esquerda para ver suas interações
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cabeçalho do cliente */}
                  <div className="bg-card rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                          {(selectedGroup.cliente?.nome || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {selectedGroup.cliente?.nome || '—'}
                          </p>
                          {selectedGroup.cliente?.empresa && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {selectedGroup.cliente.empresa}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        {selectedGroup.cliente?.telefone && (
                          <a href={`https://wa.me/55${selectedGroup.cliente.telefone.replace(/\D/g, '')}`}
                            target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Phone className="w-4 h-4 text-green-600" />
                            </Button>
                          </a>
                        )}
                        {selectedGroup.cliente?.email && (
                          <a href={`mailto:${selectedGroup.cliente.email}`}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <Mail className="w-4 h-4 text-blue-600" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Métricas do cliente */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: 'Concluídas', value: selectedGroup.concluido, color: 'text-green-600' },
                        { label: 'Em Aberto', value: selectedGroup.emAberto, color: 'text-amber-600' },
                        { label: 'Executar Hoje', value: selectedGroup.emExecutar, color: 'text-blue-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center bg-muted/50 rounded-lg py-2">
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-[11px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interações do cliente */}
                  {selectedGroup.interacoes.map(int => {
                    const canal = CANAL_CFG[int.canal] ?? CANAL_CFG.outro;
                    const CIcon = canal.icon;
                    const sc = getStatusCalc(int);
                    return (
                      <div key={int.id} className="bg-card rounded-lg border border-border p-4 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `${canal.color}15` }}>
                              <CIcon className="w-4 h-4" style={{ color: canal.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  sc === 'concluido'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : sc === 'em_executar'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {sc === 'concluido' ? 'Concluída' : sc === 'em_executar' ? 'Executar Hoje' : 'Em Aberto'}
                                </span>
                                <span className="text-xs text-muted-foreground">{canal.label}</span>
                                <span className="text-xs text-muted-foreground">{relTime(int.data_interacao)}</span>
                                {int.projetos && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <span className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: int.projetos.cor || '#6366f1' }} />
                                    {int.projetos.nome}
                                  </span>
                                )}
                                {int.regiao && (
                                  <span className="text-[11px] text-muted-foreground">📍 {int.regiao}</span>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {int.mensagem || 'Sem mensagem'}
                              </p>
                              {(int.data_proxima_acao) && (
                                <p className={`text-xs mt-1.5 ${
                                  sc === 'em_executar' ? 'text-blue-600 font-medium' :
                                  sc === 'em_aberto' ? 'text-amber-600' : 'text-muted-foreground'
                                }`}>
                                  Próxima ação:{' '}
                                  {new Date(int.data_proxima_acao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </p>
                              )}
                              {int.anexos?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {int.anexos.map((url: string, i: number) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded">
                                      <Paperclip className="w-3 h-3" />
                                      {decodeURIComponent(url.split('/').pop()?.replace(/^\d+_/, '') ?? `Arquivo ${i + 1}`)}
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {sc !== 'concluido' && (
                              <button onClick={() => handleComplete(int.id)} disabled={completingId === int.id}
                                className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                                {completingId === int.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Concluir'}
                              </button>
                            )}
                            <button onClick={() => setEditInteracao({ ...int })}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(int.id)} disabled={deletingId === int.id}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                              {deletingId === int.id
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editInteracao} onOpenChange={open => { if (!open) setEditInteracao(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Interação</DialogTitle></DialogHeader>
          {editInteracao && (
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={editInteracao.status} onValueChange={v => setEditInteracao({ ...editInteracao, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aberto">Aberto</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Canal</Label>
                <Select value={editInteracao.canal} onValueChange={v => setEditInteracao({ ...editInteracao, canal: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CANAL_CFG).map(([v, c]) => (
                      <SelectItem key={v} value={v}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Mensagem</Label>
                <Textarea value={editInteracao.mensagem || ''}
                  onChange={e => setEditInteracao({ ...editInteracao, mensagem: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data da próxima ação</Label>
                <Input type="date" value={editInteracao.data_proxima_acao || ''}
                  onChange={e => setEditInteracao({ ...editInteracao, data_proxima_acao: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={savingEdit}>
                {savingEdit && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
