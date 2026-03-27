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
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Mail, Phone, Download, ArrowUpDown, Instagram, PhoneCall, UserCheck, Linkedin, ShoppingCart, DollarSign, TrendingUp, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const avatarColor = (name: string) => {
  const colors = ['#e5a700', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4'];
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
  const [pedidos, setPedidos] = useState<any[]>([]);
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
  const toggleSort = (field: string) => { if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDir('asc'); } };

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
    setSaving(false); setDialogOpen(false); setEditing(null);
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
    const [intRes, pedRes] = await Promise.all([
      supabase.from('interacoes').select('*').eq('cliente_id', c.id).order('data_interacao', { ascending: false }),
      supabase.from('pedidos').select('*, produtos(codigo, descricao, valor_unit)').eq('cliente_id', c.id).order('data', { ascending: false }),
    ]);
    setInteracoes(intRes.data ?? []);
    setPedidos(pedRes.data ?? []);
    setSheetOpen(true);
  };

  const handleSaveInteracao = async () => {
    if (!selectedCliente || !newInteracao.mensagem.trim()) return;
    setSavingInteracao(true);
    const { error } = await supabase.from('interacoes').insert({ cliente_id: selectedCliente.id, canal: newInteracao.canal, mensagem: newInteracao.mensagem, status: newInteracao.status, data_interacao: new Date().toISOString() });
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
    const headers = ['Nome', 'Empresa', 'Email', 'Telefone', 'Segmento'];
    const rows = filtered.map(c => [c.nome, c.empresa, c.email, c.telefone, c.segmento]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'clientes.csv'; a.click();
  };

  const channelIcon = (canal: string) => {
    if (canal === 'email') return <Mail className="w-3.5 h-3.5 text-yellow-500" />;
    if (canal === 'whatsapp') return <Phone className="w-3.5 h-3.5 text-green-500" />;
    if (canal === 'linkedin') return <Linkedin className="w-3.5 h-3.5 text-blue-500" />;
    if (canal === 'instagram') return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (canal === 'ligacao') return <PhoneCall className="w-3.5 h-3.5 text-purple-500" />;
    return <UserCheck className="w-3.5 h-3.5 text-cyan-500" />;
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Total Clientes</p>
            <p className="text-2xl font-bold text-foreground mt-1">{clientes.length}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">Ativos</p>
            <p className="text-2xl font-bold text-foreground mt-1">{clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} clientes encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="w-3.5 h-3.5" />CSV</Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' }); } }}>
              <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Cliente</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5 col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
                    <div className="space-y-1.5"><Label>Empresa</Label><Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required /></div>
                    <div className="space-y-1.5"><Label>Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Segmento</Label><Input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Estado</Label><Input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
                  <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editing ? 'Salvar' : 'Criar'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={segmentoFilter} onValueChange={v => { setSegmentoFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos segmentos</SelectItem>
              {segmentos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-10 px-3 py-2"></th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('nome')}>
                        <span className="flex items-center gap-1">Nome <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell cursor-pointer" onClick={() => toggleSort('empresa')}>
                        <span className="flex items-center gap-1">Empresa <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Segmento</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Telefone</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Email</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(c => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: avatarColor(c.nome) }}>
                            {initials(c.nome)}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-medium text-foreground">{c.nome}</td>
                        <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">{c.empresa}</td>
                        <td className="px-3 py-2 hidden lg:table-cell">
                          {c.segmento && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">{c.segmento}</span>}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          {c.telefone && <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">{c.telefone}</a>}
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          {c.email && <a href={`mailto:${c.email}`} className="text-blue-600 hover:underline text-sm">{c.email}</a>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(c)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginated.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">{page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {selectedCliente && (
                  <>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: avatarColor(selectedCliente.nome) }}>
                      {initials(selectedCliente.nome)}
                    </div>
                    <div>
                      <span className="text-foreground">{selectedCliente.nome}</span>
                      {selectedCliente.empresa && <p className="text-xs text-muted-foreground">{selectedCliente.empresa}</p>}
                    </div>
                  </>
                )}
              </SheetTitle>
            </SheetHeader>
            {selectedCliente && (
              <Tabs defaultValue="dados" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                  <TabsTrigger value="interacoes" className="flex-1">Interações ({interacoes.length})</TabsTrigger>
                  <TabsTrigger value="vendas" className="flex-1">Vendas ({pedidos.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="dados" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Empresa', selectedCliente.empresa], ['Cargo', selectedCliente.cargo], ['Email', selectedCliente.email],
                      ['Telefone', selectedCliente.telefone], ['Segmento', selectedCliente.segmento], ['CNPJ', selectedCliente.cnpj],
                      ['Cidade', selectedCliente.cidade], ['Estado', selectedCliente.estado],
                    ].map(([label, val]) => val && (
                      <div key={label} className="p-3 rounded-lg bg-muted">
                        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-sm text-foreground">{val}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCliente.observacoes && (
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-[11px] text-muted-foreground mb-0.5">Observações</p>
                      <p className="text-sm text-foreground/80">{selectedCliente.observacoes}</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="interacoes" className="mt-4 space-y-4">
                  <div className="bg-muted rounded-lg p-3 space-y-3">
                    <p className="text-sm font-medium text-foreground">Nova Interação</p>
                    <div className="flex gap-2">
                      <Select value={newInteracao.canal} onValueChange={v => setNewInteracao({ ...newInteracao, canal: v })}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="ligacao">Ligação</SelectItem>
                          <SelectItem value="presencial">Presencial</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newInteracao.status} onValueChange={v => setNewInteracao({ ...newInteracao, status: v })}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aberto">Aberto</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                          <SelectItem value="aguardando">Aguardando</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea placeholder="Mensagem..." value={newInteracao.mensagem} onChange={e => setNewInteracao({ ...newInteracao, mensagem: e.target.value })} rows={2} />
                    <Button size="sm" onClick={handleSaveInteracao} disabled={savingInteracao || !newInteracao.mensagem.trim()}>
                      {savingInteracao && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Registrar
                    </Button>
                  </div>
                  {interacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma interação</p>
                  ) : (
                    <div className="space-y-2">
                      {interacoes.map(int => (
                        <div key={int.id} className="p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            {channelIcon(int.canal)}
                            <span className="text-xs font-medium text-muted-foreground uppercase">{int.canal}</span>
                            <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${int.status === 'resolvido' || int.status === 'respondido' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : int.status === 'aguardando' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{int.status}</span>
                          </div>
                          <p className="text-sm text-foreground/80">{int.mensagem}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="vendas" className="mt-4 space-y-3">
                  {pedidos.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum pedido registrado</p>
                    </div>
                  ) : (
                    <>
                      {/* Mini métricas */}
                      <div className="grid grid-cols-2 gap-2">
                        {(() => {
                          const valid = pedidos.filter((p: any) => p.status !== 'perdido' && p.status !== 'cancelado');
                          const total = valid.reduce((s: number, p: any) => s + (p.total ?? 0), 0);
                          const ticket = valid.length > 0 ? total / valid.length : 0;
                          return [
                            { icon: DollarSign, label: 'Total', value: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'text-yellow-500' },
                            { icon: ShoppingCart, label: 'Pedidos', value: pedidos.length, color: 'text-blue-500' },
                            { icon: TrendingUp, label: 'Ticket Médio', value: ticket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'text-green-500' },
                            { icon: Calendar, label: 'Última Compra', value: pedidos[0]?.data ? new Date(pedidos[0].data).toLocaleDateString('pt-BR') : '—', color: 'text-purple-500' },
                          ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="p-2.5 rounded-lg bg-muted flex items-center gap-2">
                              <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                              <div>
                                <p className="text-[10px] text-muted-foreground">{label}</p>
                                <p className="text-xs font-bold text-foreground">{value}</p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                      {/* Lista de pedidos */}
                      <div className="space-y-2">
                        {pedidos.map((p: any) => {
                          const statusCfg: Record<string, { label: string; cls: string }> = {
                            aprovado: { label: 'Aprovado', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                            em_negociacao: { label: 'Em negociação', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                            proposta_enviada: { label: 'Proposta', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                            perdido: { label: 'Perdido', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
                            concluido: { label: 'Concluído', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                            aguardando: { label: 'Aguardando', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
                            cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' },
                          };
                          const st = statusCfg[p.status ?? ''] ?? { label: p.status ?? '—', cls: 'bg-gray-100 text-gray-600' };
                          return (
                            <div key={p.id} className="p-3 rounded-lg border border-border space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Calendar className="w-3 h-3" />
                                  {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '—'}
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                              </div>
                              {p.produtos && (
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Package className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono text-foreground">{p.produtos.codigo}</span>
                                  {p.produtos.descricao && <span className="text-muted-foreground">— {p.produtos.descricao}</span>}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex gap-3">
                                  {p.qtd && <span>Qtd: <strong className="text-foreground">{p.qtd}</strong></span>}
                                  {p.desconto_pct && <span>Desc: <strong className="text-foreground">{p.desconto_pct}%</strong></span>}
                                  {p.forma_pagamento && <span className="capitalize">{p.forma_pagamento.replace('_', ' ')}</span>}
                                </div>
                                <span className="font-bold text-foreground text-sm">
                                  {p.total != null ? p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
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
