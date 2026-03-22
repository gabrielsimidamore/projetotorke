import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, Phone, Linkedin, Loader2, Search, Instagram, PhoneCall, UserCheck, MessageSquare, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CANAL_CFG: Record<string, { icon: any; color: string; label: string }> = {
  whatsapp:   { icon: Phone,      color: '#22c55e', label: 'WhatsApp' },
  email:      { icon: Mail,       color: '#e5a700', label: 'E-mail' },
  linkedin:   { icon: Linkedin,   color: '#3b82f6', label: 'LinkedIn' },
  instagram:  { icon: Instagram,  color: '#e1306c', label: 'Instagram' },
  ligacao:    { icon: PhoneCall,  color: '#a855f7', label: 'Ligação' },
  presencial: { icon: UserCheck,  color: '#06b6d4', label: 'Presencial' },
};

const STATUS_CFG: Record<string, { label: string; class: string }> = {
  aberto:     { label: 'Aberto', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  pendente:   { label: 'Pendente', class: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  aguardando: { label: 'Aguardando', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resolvido:  { label: 'Resolvido', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
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
  const [form, setForm] = useState({ cliente_id: '', canal: 'whatsapp', mensagem: '', status: 'aberto' });

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

  const handleSelect = async (int: any) => {
    setSelected(int);
    if (int.clientes?.id) {
      const { data } = await supabase.from('interacoes').select('*').eq('cliente_id', int.clientes.id).neq('id', int.id).order('data_interacao', { ascending: false }).limit(10);
      setClienteHistory(data ?? []);
    } else setClienteHistory([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('interacoes').insert({ ...form, data_interacao: new Date().toISOString() });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Interação registrada!' }); setDialogOpen(false); setForm({ cliente_id: '', canal: 'whatsapp', mensagem: '', status: 'aberto' }); fetchData(); }
    setSaving(false);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Interação</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Registrar Interação</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.empresa}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Canal</Label>
                    <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CANAL_CFG).map(([v, c]) => <SelectItem key={v} value={v}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Mensagem</Label>
                  <Textarea value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} required rows={4} placeholder="Descreva a interação..." />
                </div>
                <Button type="submit" className="w-full" disabled={saving || !form.cliente_id}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
            <div className="w-[360px] shrink-0 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filtered.length === 0 && <div className="text-center py-12 text-muted-foreground text-sm">Nenhuma interação encontrada</div>}
                {filtered.map(int => {
                  const canal = CANAL_CFG[int.canal] ?? CANAL_CFG.presencial;
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
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${status.class}`}>{status.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-px bg-border shrink-0" />

            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Selecione uma interação</p>
                  <p className="text-xs text-muted-foreground mt-1">Clique em qualquer item à esquerda</p>
                </div>
              ) : (() => {
                const canal = CANAL_CFG[selected.canal] ?? CANAL_CFG.presencial;
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
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mensagem Completa</h4>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.mensagem || 'Sem mensagem'}</p>
                    </div>
                    {clienteHistory.length > 0 && (
                      <div className="bg-card rounded-lg border border-border p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico do Cliente ({clienteHistory.length})</h4>
                        <div className="space-y-2">
                          {clienteHistory.map(h => {
                            const hc = CANAL_CFG[h.canal] ?? CANAL_CFG.presencial;
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
