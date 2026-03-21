import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Cliente, type Interacao } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Mail, Phone, Linkedin, Users, TrendingUp, Download, ArrowUpDown, Instagram, PhoneCall, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const avatarColor = (name: string) => {
  const colors = ['#F5C518', '#5b8dee', '#22c55e', '#a855f7', '#ef4444', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const Clientes = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [form, setForm] = useState({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' });
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<string>('nome');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [newInteracao, setNewInteracao] = useState({ canal: 'whatsapp', mensagem: '', status: 'aberto' });
  const [savingInteracao, setSavingInteracao] = useState(false);
  const PER_PAGE = 20;

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    setClientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const segmentos = useMemo(() => [...new Set(clientes.map(c => c.segmento).filter(Boolean))], [clientes]);

  const filtered = useMemo(() => {
    let list = clientes.filter(c => {
      const matchSearch = !search || [c.nome, c.empresa, c.email, c.telefone].some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchSeg = segmentoFilter === 'todos' || c.segmento === segmentoFilter;
      const matchStatus = statusFilter === 'todos' || (c.status ?? 'ativo') === statusFilter;
      return matchSearch && matchSeg && matchStatus;
    });
    list.sort((a, b) => {
      const av = (a as any)[sortField] ?? '';
      const bv = (b as any)[sortField] ?? '';
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [clientes, search, segmentoFilter, statusFilter, sortField, sortDir]);

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('clientes').update(form).eq('id', editing.id);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else toast({ title: 'Cliente atualizado!' });
    } else {
      const { error } = await supabase.from('clientes').insert(form);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else toast({ title: 'Cliente criado!' });
    }
    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' });
    fetchClientes();
  };

  const handleEdit = (c: Cliente) => {
    setEditing(c);
    setForm({ nome: c.nome, empresa: c.empresa, telefone: c.telefone, email: c.email, segmento: c.segmento, cargo: c.cargo ?? '', cidade: c.cidade ?? '', estado: c.estado ?? '', cnpj: c.cnpj ?? '', observacoes: c.observacoes ?? '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Cliente removido' }); fetchClientes(); }
  };

  const handleView = async (c: Cliente) => {
    setSelectedCliente(c);
    const { data } = await supabase.from('interacoes').select('*').eq('cliente_id', c.id).order('data_interacao', { ascending: false });
    setInteracoes(data ?? []);
    setSheetOpen(true);
  };

  const handleSaveInteracao = async () => {
    if (!selectedCliente || !newInteracao.mensagem.trim()) return;
    setSavingInteracao(true);
    const { error } = await supabase.from('interacoes').insert({
      cliente_id: selectedCliente.id,
      canal: newInteracao.canal,
      mensagem: newInteracao.mensagem,
      status: newInteracao.status,
      data_interacao: new Date().toISOString(),
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Interação registrada!' });
      setNewInteracao({ canal: 'whatsapp', mensagem: '', status: 'aberto' });
      const { data } = await supabase.from('interacoes').select('*').eq('cliente_id', selectedCliente.id).order('data_interacao', { ascending: false });
      setInteracoes(data ?? []);
    }
    setSavingInteracao(false);
  };

  const exportCSV = () => {
    const headers = ['Nome', 'Empresa', 'Email', 'Telefone', 'Segmento', 'Cidade', 'Estado'];
    const rows = filtered.map(c => [c.nome, c.empresa, c.email, c.telefone, c.segmento, c.cidade ?? '', c.estado ?? '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'clientes.csv'; a.click();
  };

  const channelIcon = (canal: string) => {
    if (canal === 'email') return <Mail className="w-3 h-3" style={{ color: '#F5C518' }} />;
    if (canal === 'whatsapp') return <Phone className="w-3 h-3" style={{ color: '#22c55e' }} />;
    if (canal === 'linkedin') return <Linkedin className="w-3 h-3" style={{ color: '#5b8dee' }} />;
    if (canal === 'instagram') return <Instagram className="w-3 h-3" style={{ color: '#e1306c' }} />;
    if (canal === 'ligacao') return <PhoneCall className="w-3 h-3" style={{ color: '#a855f7' }} />;
    return <UserCheck className="w-3 h-3" style={{ color: '#06b6d4' }} />;
  };

  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-stagger">
          <div className="kpi-card glass-accent">
            <span className="section-label mb-0">Total Clientes</span>
            <p className="text-2xl font-bold text-white mt-1">{clientes.length}</p>
          </div>
          <div className="kpi-card glass-green">
            <span className="section-label mb-0">Ativos</span>
            <p className="text-2xl font-bold text-white mt-1">{activeClients}</p>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Clientes</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{filtered.length} clientes encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5" style={{ border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              <Download className="w-3.5 h-3.5" />CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' }); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Cliente</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-sm">{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2"><Label className="text-xs">Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Empresa</Label><Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Segmento</Label><Input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Cidade</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} className="h-8 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Estado</Label><Input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="h-8 text-xs" /></div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} className="text-xs" /></div>
                  <Button type="submit" className="w-full h-8 text-xs" disabled={saving}>
                    {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}{editing ? 'Salvar' : 'Criar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-8 h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }} />
          </div>
          <Select value={segmentoFilter} onValueChange={v => { setSegmentoFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px] h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos segmentos</SelectItem>
              {segmentos.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px] h-7 text-xs" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos</SelectItem>
              <SelectItem value="ativo" className="text-xs">Ativos</SelectItem>
              <SelectItem value="inativo" className="text-xs">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
        ) : (
          <>
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full dense-table">
                  <thead>
                    <tr>
                      <th className="w-10"></th>
                      <th className="text-left cursor-pointer" onClick={() => toggleSort('nome')}>
                        <span className="flex items-center gap-1">Nome <ArrowUpDown className="w-2.5 h-2.5" /></span>
                      </th>
                      <th className="text-left hidden sm:table-cell cursor-pointer" onClick={() => toggleSort('empresa')}>
                        <span className="flex items-center gap-1">Empresa <ArrowUpDown className="w-2.5 h-2.5" /></span>
                      </th>
                      <th className="text-left hidden lg:table-cell">Segmento</th>
                      <th className="text-left hidden md:table-cell">Telefone</th>
                      <th className="text-left hidden md:table-cell">Email</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white/90" style={{ background: `${avatarColor(c.nome)}20`, border: `1px solid ${avatarColor(c.nome)}30` }}>
                            {initials(c.nome)}
                          </div>
                        </td>
                        <td><span className="text-white/80 font-medium">{c.nome}</span></td>
                        <td className="hidden sm:table-cell text-white/50">{c.empresa}</td>
                        <td className="hidden lg:table-cell">
                          {c.segmento && <span className="status-blue">{c.segmento}</span>}
                        </td>
                        <td className="hidden md:table-cell">
                          {c.telefone && (
                            <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#22c55e' }} className="hover:underline">
                              {c.telefone}
                            </a>
                          )}
                        </td>
                        <td className="hidden md:table-cell">
                          {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: '#F5C518' }} className="hover:underline">{c.email}</a>}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleView(c)}><Eye className="w-3.5 h-3.5 text-white/40" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}><Pencil className="w-3.5 h-3.5 text-white/40" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5 text-red-400/60" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Nenhum cliente encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="h-7 text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>Anterior</Button>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{page + 1} de {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="h-7 text-xs" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>Próxima</Button>
              </div>
            )}
          </>
        )}

        {/* Client Drawer */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto" style={{ background: 'rgba(10,10,25,0.95)', backdropFilter: 'blur(24px)', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3 text-sm">
                {selectedCliente && (
                  <>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white/90" style={{ background: `${avatarColor(selectedCliente.nome)}20`, border: `1px solid ${avatarColor(selectedCliente.nome)}30` }}>
                      {initials(selectedCliente.nome)}
                    </div>
                    <span className="text-white">{selectedCliente.nome}</span>
                  </>
                )}
              </SheetTitle>
            </SheetHeader>
            {selectedCliente && (
              <Tabs defaultValue="dados" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="dados" className="flex-1 text-xs">Dados</TabsTrigger>
                  <TabsTrigger value="interacoes" className="flex-1 text-xs">Interações</TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1 text-xs">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Empresa', selectedCliente.empresa],
                      ['Cargo', selectedCliente.cargo],
                      ['Email', selectedCliente.email],
                      ['Telefone', selectedCliente.telefone],
                      ['Segmento', selectedCliente.segmento],
                      ['CNPJ', selectedCliente.cnpj],
                      ['Cidade', selectedCliente.cidade],
                      ['Estado', selectedCliente.estado],
                    ].map(([label, val]) => val && (
                      <div key={label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCliente.observacoes && (
                    <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>Observações</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{selectedCliente.observacoes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="interacoes" className="mt-4 space-y-4">
                  <div className="glass-card p-3 space-y-3">
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Registrar Interação</p>
                    <div className="flex gap-2">
                      <Select value={newInteracao.canal} onValueChange={v => setNewInteracao({ ...newInteracao, canal: v })}>
                        <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp" className="text-xs">WhatsApp</SelectItem>
                          <SelectItem value="email" className="text-xs">Email</SelectItem>
                          <SelectItem value="ligacao" className="text-xs">Ligação</SelectItem>
                          <SelectItem value="presencial" className="text-xs">Presencial</SelectItem>
                          <SelectItem value="instagram" className="text-xs">Instagram</SelectItem>
                          <SelectItem value="linkedin" className="text-xs">LinkedIn</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newInteracao.status} onValueChange={v => setNewInteracao({ ...newInteracao, status: v })}>
                        <SelectTrigger className="w-[120px] h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberto" className="text-xs">Aberto</SelectItem>
                          <SelectItem value="resolvido" className="text-xs">Resolvido</SelectItem>
                          <SelectItem value="aguardando" className="text-xs">Aguardando</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea placeholder="Mensagem..." value={newInteracao.mensagem} onChange={e => setNewInteracao({ ...newInteracao, mensagem: e.target.value })} rows={2} className="text-xs resize-none" />
                    <Button size="sm" onClick={handleSaveInteracao} disabled={savingInteracao || !newInteracao.mensagem.trim()} className="h-7 text-xs">
                      {savingInteracao && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Registrar
                    </Button>
                  </div>

                  {interacoes.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>Nenhuma interação</p>
                  ) : (
                    <div className="space-y-2">
                      {interacoes.map(int => (
                        <div key={int.id} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center gap-2 mb-1">
                            {channelIcon(int.canal)}
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{int.canal}</span>
                            <span className={`ml-auto ${int.status === 'pendente' || int.status === 'aberto' ? 'status-pending' : int.status === 'resolvido' || int.status === 'respondido' ? 'status-approved' : 'status-blue'}`}>{int.status}</span>
                          </div>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{int.mensagem}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  {interacoes.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>Sem atividades</p>
                  ) : (
                    <div className="relative pl-6 space-y-3">
                      <div className="absolute left-2 top-2 bottom-2 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      {interacoes.map(int => (
                        <div key={int.id} className="relative">
                          <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full" style={{ border: '2px solid #F5C518', background: 'hsl(230, 25%, 5%)' }} />
                          <div className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                            <div className="flex items-center gap-2">
                              {channelIcon(int.canal)}
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4, lineHeight: 1.5 }}>{int.mensagem}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default Clientes;
