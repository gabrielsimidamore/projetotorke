import { useEffect, useState, useMemo, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, Phone, Linkedin, Loader2, Search, Instagram, PhoneCall, UserCheck, MessageSquare, Building2, Paperclip, X, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CANAL_CFG: Record<string, { icon: any; color: string; label: string }> = {
  ligacao:    { icon: PhoneCall,  color: '#a855f7', label: 'Ligação' },
  reuniao:    { icon: UserCheck,  color: '#06b6d4', label: 'Reunião' },
  email:      { icon: Mail,       color: '#e5a700', label: 'E-mail' },
  whatsapp:   { icon: Phone,      color: '#22c55e', label: 'WhatsApp' },
  visita:     { icon: UserCheck,  color: '#3b82f6', label: 'Visita' },
  outro:      { icon: MessageSquare, color: '#6b7280', label: 'Outro' },
  linkedin:   { icon: Linkedin,   color: '#3b82f6', label: 'LinkedIn' },
  instagram:  { icon: Instagram,  color: '#e1306c', label: 'Instagram' },
  presencial: { icon: UserCheck,  color: '#06b6d4', label: 'Presencial' },
};

const STATUS_CFG: Record<string, { label: string; class: string }> = {
  aberto:     { label: 'Aberto',     class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pendente:   { label: 'Pendente',   class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  aguardando: { label: 'Aguardando', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolvido:  { label: 'Resolvido',  class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  respondido: { label: 'Respondido', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

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
  cliente_id: '',
  canal: '',
  data: '',
  data_prevista: '',
  regiao: '',
  mensagem: '',
  proxima_acao: '',
  status: 'aberto',
};

export default function Interacoes() {
  const { toast } = useToast();
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selected, setSelected] = useState<any | null>(null);
  const [clienteHistory, setClienteHistory] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteDropdown, setClienteDropdown] = useState(false);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [uploadando, setUploadando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const [i, c] = await Promise.all([
      supabase.from('interacoes').select('*, clientes(id, nome, empresa, telefone, email, segmento)').order('data_interacao', { ascending: false }),
      supabase.from('clientes').select('*').order('nome'),
    ]);
    setInteracoes(i.data ?? []);
    setClientes(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setClienteDropdown(false);
      }
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
    setClienteSearch(`${c.nome} — ${c.empresa}`);
    setClienteDropdown(false);
  };

  const handleArquivos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArquivos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removerArquivo = (i: number) => {
    setArquivos(prev => prev.filter((_, idx) => idx !== i));
  };

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
      ...(form.data_prevista && { data_prevista: new Date(form.data_prevista).toISOString() }),
      ...(form.regiao && { regiao: form.regiao }),
      ...(form.proxima_acao && { proxima_acao: form.proxima_acao }),
    };

    const { data: novaInt, error } = await supabase.from('interacoes').insert(payload).select().single();

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      setSaving(false); setUploadando(false); return;
    }

    if (arquivos.length > 0 && novaInt) {
      const urls = await uploadArquivos(novaInt.id);
      if (urls.length > 0) {
        await supabase.from('interacoes').update({ anexos: urls }).eq('id', novaInt.id);
      }
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

  const handleSelect = async (int: any) => {
    setSelected(int);
    if (int.clientes?.id) {
      const { data } = await supabase.from('interacoes').select('*').eq('cliente_id', int.clientes.id).neq('id', int.id).order('data_interacao', { ascending: false }).limit(10);
      setClienteHistory(data ?? []);
    } else setClienteHistory([]);
  };

  const filtered = useMemo(() => interacoes.filter(i => {
    const ms = !search || [i.clientes?.nome, i.clientes?.empresa, i.mensagem].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const mc = canalFilter === 'todos' || i.canal === canalFilter;
    const ms2 = statusFilter === 'todos' || i.status === statusFilter;
    return ms && mc && ms2;
  }), [interacoes, search, canalFilter, statusFilter]);

  const openCount = interacoes.filter(i => i.status === 'aberto' || i.status === 'pendente').length;

  return (
    <Layout>
      <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 96px)' }}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground">Interações</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} interações
              {openCount > 0 && <span className="ml-2 text-yellow-600 dark:text-yellow-400">· {openCount} em aberto</span>}
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setForm(emptyForm); setClienteSearch(''); setArquivos([]); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Interação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Registrar Interação</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-1">

                {/* Cliente com busca */}
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
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCliente(c)}
                          className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm transition-colors"
                        >
                          <span className="font-medium text-foreground">{c.nome}</span>
                          {c.empresa && <span className="text-muted-foreground"> — {c.empresa}</span>}
                        </button>
                      ))}
                    </div>
                  )}
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
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="reuniao">Reunião</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="visita">Visita</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Região e Data Prevista */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Região</Label>
                    <Input placeholder="Ex: São Paulo" value={form.regiao} onChange={e => setForm({ ...form, regiao: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data Prevista</Label>
                    <Input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} />
                  </div>
                </div>

                {/* Resumo da Conversa */}
                <div className="space-y-1.5">
                  <Label>Resumo da Conversa <span className="text-primary">*</span></Label>
                  <Textarea
                    value={form.mensagem}
                    onChange={e => setForm({ ...form, mensagem: e.target.value })}
                    required
                    rows={4}
                    placeholder="Descreva o que foi conversado..."
                  />
                </div>

                {/* Próxima Ação */}
                <div className="space-y-1.5">
                  <Label>Próxima Ação</Label>
                  <Textarea
                    value={form.proxima_acao}
                    onChange={e => setForm({ ...form, proxima_acao: e.target.value })}
                    rows={2}
                    placeholder="O que fazer após esta interação?"
                  />
                </div>

                {/* Anexos */}
                <div className="space-y-1.5">
                  <Label>Anexos</Label>
                  <div
                    className="border border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors text-center"
                    onClick={() => fileRef.current?.click()}
                  >
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

                {/* Botões */}
                <div className="flex gap-3 pt-1">
                  <Button type="submit" className="flex-1" disabled={saving || !form.cliente_id || !form.canal}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {uploadando ? 'Enviando anexos...' : 'Enviar'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); setForm(emptyForm); setClienteSearch(''); setArquivos([]); }}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos canais</SelectItem>
              {Object.entries(CANAL_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Lista */}
            <div className="w-[360px] shrink-0 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma interação encontrada</div>}
                {filtered.map(int => {
                  const canal = CANAL_CFG[int.canal] ?? CANAL_CFG.outro;
                  const status = STATUS_CFG[int.status] ?? STATUS_CFG.aberto;
                  const isSelected = selected?.id === int.id;
                  const CIcon = canal.icon;
                  return (
                    <div
                      key={int.id}
                      onClick={() => handleSelect(int)}
                      className={`p-3 rounded-lg cursor-pointer transition-all border ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <CIcon className="w-4 h-4 shrink-0" style={{ color: canal.color }} />
                          <span className="text-sm font-medium text-foreground truncate">{int.clientes?.nome ?? 'Cliente'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{relTime(int.data_interacao)}</span>
                      </div>
                      {int.clientes?.empresa && <p className="text-xs text-muted-foreground mb-1">{int.clientes.empresa}</p>}
                      <p className="text-sm text-foreground/70 line-clamp-2">{int.mensagem || 'Sem mensagem'}</p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.class}`}>{status.label}</span>
                        {int.regiao && <span className="text-[11px] text-muted-foreground">{int.regiao}</span>}
                        {int.anexos?.length > 0 && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-px bg-border shrink-0" />

            {/* Detalhe */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Selecione uma interação</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em qualquer item à esquerda</p>
                </div>
              ) : (() => {
                const canal = CANAL_CFG[selected.canal] ?? CANAL_CFG.outro;
                const status = STATUS_CFG[selected.status] ?? STATUS_CFG.aberto;
                const CIcon = canal.icon;
                return (
                  <div className="space-y-4">
                    <div className="bg-card rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${canal.color}15` }}>
                            <CIcon className="w-5 h-5" style={{ color: canal.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground">{selected.clientes?.nome ?? '—'}</p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.class}`}>{status.label}</span>
                            </div>
                            {selected.clientes?.empresa && (
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />{selected.clientes.empresa}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {canal.label} · {new Date(selected.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {selected.regiao && <p className="text-xs text-muted-foreground mt-0.5">📍 {selected.regiao}</p>}
                            {selected.data_prevista && <p className="text-xs text-muted-foreground mt-0.5">📅 Previsto: {new Date(selected.data_prevista).toLocaleDateString('pt-BR')}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {selected.clientes?.telefone && (
                            <a href={`https://wa.me/55${selected.clientes.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="icon" className="h-8 w-8"><Phone className="w-4 h-4 text-green-600" /></Button>
                            </a>
                          )}
                          {selected.clientes?.email && (
                            <a href={`mailto:${selected.clientes.email}`}>
                              <Button variant="outline" size="icon" className="h-8 w-8"><Mail className="w-4 h-4 text-blue-600" /></Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-card rounded-lg border border-border p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resumo da Conversa</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.mensagem || 'Sem mensagem'}</p>
                    </div>

                    {selected.proxima_acao && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Próxima Ação</h4>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.proxima_acao}</p>
                      </div>
                    )}

                    {selected.anexos?.length > 0 && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Anexos ({selected.anexos.length})</h4>
                        <div className="space-y-2">
                          {selected.anexos.map((url: string, i: number) => {
                            const nome = url.split('/').pop() ?? `Arquivo ${i + 1}`;
                            return (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-sm text-foreground truncate flex-1">{decodeURIComponent(nome.replace(/^\d+_/, ''))}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {clienteHistory.length > 0 && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico do Cliente ({clienteHistory.length})</h4>
                        <div className="space-y-2">
                          {clienteHistory.map(h => {
                            const hc = CANAL_CFG[h.canal] ?? CANAL_CFG.outro;
                            const hs = STATUS_CFG[h.status] ?? STATUS_CFG.aberto;
                            const HI = hc.icon;
                            return (
                              <div key={h.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted">
                                <HI className="w-4 h-4 shrink-0 mt-0.5" style={{ color: hc.color }} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground/80">{h.mensagem || 'Sem mensagem'}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${hs.class}`}>{hs.label}</span>
                                    <span className="text-xs text-muted-foreground">{relTime(h.data_interacao)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
