import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Cliente, type Interacao } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Mail, Phone, Linkedin, Users, TrendingUp, Download, ArrowUpDown, Instagram, PhoneCall, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const avatarColor = (name: string) => {
  const colors = ['bg-primary', 'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-rose-600', 'bg-orange-600'];
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
    if (canal === 'email') return <Mail className="w-3 h-3 text-accent" />;
    if (canal === 'whatsapp') return <Phone className="w-3 h-3 text-emerald-500" />;
    if (canal === 'linkedin') return <Linkedin className="w-3 h-3 text-blue-500" />;
    if (canal === 'instagram') return <Instagram className="w-3 h-3 text-pink-500" />;
    if (canal === 'ligacao') return <PhoneCall className="w-3 h-3 text-primary" />;
    return <UserCheck className="w-3 h-3 text-foreground" />;
  };

  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;

  const kpis = [
    { title: 'Total Clientes', value: clientes.length, icon: Users },
    { title: 'Ativos', value: activeClients, icon: TrendingUp },
  ];

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.title} className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{k.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
                </div>
                <k.icon className="w-7 h-7 text-primary opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} clientes encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' }); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Novo Cliente</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Empresa</Label><Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required /></div>
                    <div className="space-y-2"><Label>Cargo</Label><Input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Segmento</Label><Input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Estado</Label><Input value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editing ? 'Salvar' : 'Criar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
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
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort('nome')}>
                        <span className="flex items-center gap-1">Nome <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="hidden sm:table-cell cursor-pointer" onClick={() => toggleSort('empresa')}>
                        <span className="flex items-center gap-1">Empresa <ArrowUpDown className="w-3 h-3" /></span>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Segmento</TableHead>
                      <TableHead className="hidden md:table-cell">Telefone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map(c => (
                      <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(c.nome)}`}>
                            {initials(c.nome)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{c.empresa}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.segmento}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.telefone && (
                            <a href={`https://wa.me/55${c.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-500 hover:underline">
                              {c.telefone}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {c.email && <a href={`mailto:${c.email}`} className="text-sm text-primary hover:underline">{c.email}</a>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleView(c)}><Eye className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {paginated.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">{page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}

        {/* Client Drawer */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {selectedCliente && (
                  <>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${avatarColor(selectedCliente.nome)}`}>
                      {initials(selectedCliente.nome)}
                    </div>
                    {selectedCliente.nome}
                  </>
                )}
              </SheetTitle>
            </SheetHeader>
            {selectedCliente && (
              <Tabs defaultValue="dados" className="mt-6">
                <TabsList className="w-full">
                  <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                  <TabsTrigger value="interacoes" className="flex-1">Interações</TabsTrigger>
                  <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="dados" className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                      <div key={label}>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-foreground">{val}</p>
                      </div>
                    ))}
                  </div>
                  {selectedCliente.observacoes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm text-foreground">{selectedCliente.observacoes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="interacoes" className="mt-4 space-y-4">
                  {/* New interaction form */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <p className="text-sm font-semibold text-foreground">Registrar Interação</p>
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
                    </CardContent>
                  </Card>

                  {interacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhuma interação</p>
                  ) : (
                    <div className="space-y-2">
                      {interacoes.map(int => (
                        <div key={int.id} className="p-3 rounded-md bg-muted/50 border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            {channelIcon(int.canal)}
                            <span className="text-xs font-medium text-muted-foreground uppercase">{int.canal}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${int.status === 'pendente' || int.status === 'aberto' ? 'status-pending' : int.status === 'resolvido' || int.status === 'respondido' ? 'status-approved' : 'bg-blue-500/15 text-blue-500'}`}>{int.status}</span>
                          </div>
                          <p className="text-sm text-foreground">{int.mensagem}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  {interacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Sem atividades</p>
                  ) : (
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                      {interacoes.map(int => (
                        <div key={int.id} className="relative">
                          <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full border-2 border-primary bg-background" />
                          <div className="p-3 rounded-md bg-muted/30">
                            <div className="flex items-center gap-2">
                              {channelIcon(int.canal)}
                              <span className="text-xs text-muted-foreground">{new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            </div>
                            <p className="text-sm text-foreground mt-1">{int.mensagem}</p>
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
