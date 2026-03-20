import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail, Phone, Linkedin, Loader2, Search, Instagram, PhoneCall, UserCheck, MessageSquare, Clock, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CANAL_CFG: Record<string, { icon: any; color: string; label: string }> = {
  whatsapp:   { icon: Phone,      color: '#22c55e', label: 'WhatsApp' },
  email:      { icon: Mail,       color: '#F5C518', label: 'E-mail' },
  linkedin:   { icon: Linkedin,   color: '#5b8dee', label: 'LinkedIn' },
  instagram:  { icon: Instagram,  color: '#e1306c', label: 'Instagram' },
  ligacao:    { icon: PhoneCall,  color: '#a855f7', label: 'Ligação' },
  presencial: { icon: UserCheck,  color: '#06b6d4', label: 'Presencial' },
};

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  aberto:     { cls: 'status-pending',  label: 'Aberto' },
  pendente:   { cls: 'status-pending',  label: 'Pendente' },
  aguardando: { cls: 'status-blue',     label: 'Aguardando' },
  resolvido:  { cls: 'status-approved', label: 'Resolvido' },
  respondido: { cls: 'status-approved', label: 'Respondido' },
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
      const { data } = await supabase.from('interacoes').select('*').eq('cliente_id', int.clientes.id).neq('id', int.id).order('data_interacao', { ascending: false }).limit(5);
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
      <div className="flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 80px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-white">Interações</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {filtered.length} interações
              {openCount > 0 && <span className="ml-2 text-yellow-400">· {openCount} em aberto</span>}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Nova Interação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="text-sm">Registrar Interação</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome} — {c.empresa}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Canal</Label>
                    <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CANAL_CFG).map(([v, c]) => <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto" className="text-xs">Aberto</SelectItem>
                        <SelectItem value="aguardando" className="text-xs">Aguardando</SelectItem>
                        <SelectItem value="resolvido" className="text-xs">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mensagem</Label>
                  <Textarea value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} required rows={4} className="text-xs resize-none" placeholder="Descreva a interação em detalhes..." />
                </div>
                <Button type="submit" className="w-full h-8 text-xs" disabled={saving || !form.cliente_id}>
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Registrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }} />
          </div>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="w-[120px] h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos canais</SelectItem>
              {Object.entries(CANAL_CFG).map(([v, c]) => <SelectItem key={v} value={v} className="text-xs">{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px] h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos status</SelectItem>
              <SelectItem value="aberto" className="text-xs">Aberto</SelectItem>
              <SelectItem value="aguardando" className="text-xs">Aguardando</SelectItem>
              <SelectItem value="resolvido" className="text-xs">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
        ) : (
          <div className="flex flex-1 gap-3 min-h-0">

            {/* LEFT — list */}
            <div className="w-[340px] shrink-0 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filtered.length === 0 && <div className="text-center py-12 text-white/30 text-xs">Nenhuma interação encontrada</div>}
                {filtered.map(int => {
                  const canal = CANAL_CFG[int.canal] ?? CANAL_CFG.presencial;
                  const status = STATUS_CFG[int.status] ?? STATUS_CFG.aberto;
                  const isSelected = selected?.id === int.id;
                  const CIcon = canal.icon;
                  return (
                    <div
                      key={int.id}
                      onClick={() => handleSelect(int)}
                      className="p-3 rounded-xl cursor-pointer transition-all duration-150"
                      style={{
                        background: isSelected ? 'rgba(245,197,24,0.07)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isSelected ? 'rgba(245,197,24,0.22)' : 'rgba(255,255,255,0.06)'}`,
                        borderLeft: `3px solid ${isSelected ? '#F5C518' : 'transparent'}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: `${canal.color}20` }}>
                            <CIcon className="w-2.5 h-2.5" style={{ color: canal.color }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }} className="truncate">{int.clientes?.nome ?? 'Cliente'}</span>
                        </div>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginLeft: 8 }}>{relTime(int.data_interacao)}</span>
                      </div>
                      {int.clientes?.empresa && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{int.clientes.empresa}</p>}
                      {/* FULL 2 lines of message — not truncated to 1 */}
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }} className="line-clamp-2">{int.mensagem}</p>
                      <div className="mt-2"><span className={status.cls}>{status.label}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="panel-divider shrink-0" />

            {/* RIGHT — detail */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {!selected ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <MessageSquare className="w-5 h-5 text-white/20" />
                  </div>
                  <p className="text-sm text-white/30 font-medium">Selecione uma interação</p>
                  <p className="text-xs text-white/20 mt-1">Clique em qualquer item à esquerda para ver os detalhes completos</p>
                </div>
              ) : (() => {
                const canal = CANAL_CFG[selected.canal] ?? CANAL_CFG.presencial;
                const status = STATUS_CFG[selected.status] ?? STATUS_CFG.aberto;
                const CIcon = canal.icon;
                return (
                  <div className="space-y-4">
                    {/* Header card */}
                    <div className="glass-card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${canal.color}18`, border: `1px solid ${canal.color}30` }}>
                            <CIcon className="w-5 h-5" style={{ color: canal.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-white">{selected.clientes?.nome ?? '—'}</p>
                              <span className={status.cls}>{status.label}</span>
                            </div>
                            {selected.clientes?.empresa && (
                              <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
                                <Building2 className="w-2.5 h-2.5" />{selected.clientes.empresa}
                              </p>
                            )}
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                              {canal.label} · {new Date(selected.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {selected.clientes?.telefone && (
                            <a href={`https://wa.me/55${selected.clientes.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              </Button>
                            </a>
                          )}
                          {selected.clientes?.email && (
                            <a href={`mailto:${selected.clientes.email}`}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" style={{ background: 'rgba(245,197,24,0.1)' }}>
                                <Mail className="w-3.5 h-3.5 text-yellow-400" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Full message */}
                    <div className="glass-card p-4">
                      <span className="section-label">Mensagem Completa</span>
                      <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{selected.mensagem}</p>
                    </div>

                    {/* Client info */}
                    {(selected.clientes?.email || selected.clientes?.telefone || selected.clientes?.segmento) && (
                      <div className="glass-card p-3">
                        <span className="section-label">Informações do Cliente</span>
                        <div className="flex flex-wrap gap-4">
                          {selected.clientes?.email && (
                            <div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>E-mail</p>
                              <a href={`mailto:${selected.clientes.email}`} className="text-xs text-yellow-400 hover:underline">{selected.clientes.email}</a>
                            </div>
                          )}
                          {selected.clientes?.telefone && (
                            <div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Telefone</p>
                              <a href={`https://wa.me/55${selected.clientes.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline">{selected.clientes.telefone}</a>
                            </div>
                          )}
                          {selected.clientes?.segmento && (
                            <div>
                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Segmento</p>
                              <p className="text-xs text-white/70">{selected.clientes.segmento}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* History */}
                    {clienteHistory.length > 0 && (
                      <div className="glass-card p-4">
                        <span className="section-label">Histórico do Cliente ({clienteHistory.length} outras)</span>
                        <div className="space-y-2">
                          {clienteHistory.map(h => {
                            const hc = CANAL_CFG[h.canal] ?? CANAL_CFG.presencial;
                            const hs = STATUS_CFG[h.status] ?? STATUS_CFG.aberto;
                            const HI = hc.icon;
                            return (
                              <div key={h.id} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${hc.color}18` }}>
                                  <HI className="w-2.5 h-2.5" style={{ color: hc.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>{h.mensagem}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={hs.cls}>{hs.label}</span>
                                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{relTime(h.data_interacao)}</span>
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
