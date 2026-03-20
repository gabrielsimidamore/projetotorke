import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Interacao, type Cliente } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Mail, Phone, Linkedin, Loader2, Search, Instagram, PhoneCall, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Interacoes = () => {
  const { toast } = useToast();
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [canalFilter, setCanalFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [form, setForm] = useState({ cliente_id: '', canal: 'whatsapp', mensagem: '', status: 'aberto' });

  const fetchData = async () => {
    const [i, c] = await Promise.all([
      supabase.from('interacoes').select('*, clientes(nome, empresa)').order('data_interacao', { ascending: false }),
      supabase.from('clientes').select('*').order('nome'),
    ]);
    setInteracoes(i.data ?? []);
    setClientes(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('interacoes').insert({ ...form, data_interacao: new Date().toISOString() });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Interação registrada!' }); setDialogOpen(false); setForm({ cliente_id: '', canal: 'whatsapp', mensagem: '', status: 'aberto' }); fetchData(); }
    setSaving(false);
  };

  const channelIcon = (canal: string) => {
    if (canal === 'email') return <Mail className="w-3.5 h-3.5 text-accent" />;
    if (canal === 'whatsapp') return <Phone className="w-3.5 h-3.5 text-emerald-500" />;
    if (canal === 'linkedin') return <Linkedin className="w-3.5 h-3.5 text-blue-500" />;
    if (canal === 'instagram') return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (canal === 'ligacao') return <PhoneCall className="w-3.5 h-3.5 text-primary" />;
    return <UserCheck className="w-3.5 h-3.5 text-foreground" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'pendente' || s === 'aberto') return 'status-pending';
    if (s === 'respondido' || s === 'resolvido') return 'status-approved';
    return 'bg-blue-500/15 text-blue-500 border border-blue-500/30';
  };

  const filtered = useMemo(() => {
    return interacoes.filter(i => {
      const matchSearch = !search || [
        (i as any).clientes?.nome,
        (i as any).clientes?.empresa,
        i.mensagem,
      ].some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchCanal = canalFilter === 'todos' || i.canal === canalFilter;
      const matchStatus = statusFilter === 'todos' || i.status === statusFilter;
      return matchSearch && matchCanal && matchStatus;
    });
  }, [interacoes, search, canalFilter, statusFilter]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interações</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} interações</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nova Interação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Interação</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} - {c.empresa}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Canal</Label>
                    <Select value={form.canal} onValueChange={v => setForm({ ...form, canal: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="ligacao">Ligação</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea value={form.mensagem} onChange={e => setForm({ ...form, mensagem: e.target.value })} required rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={saving || !form.cliente_id}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Registrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente ou mensagem..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={canalFilter} onValueChange={setCanalFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos canais</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="ligacao">Ligação</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
              <SelectItem value="aguardando">Aguardando</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Canal</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(int => (
                    <TableRow key={int.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>{channelIcon(int.canal)}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{(int as any).clientes?.nome ?? '—'}</p>
                        <p className="text-xs text-muted-foreground">{(int as any).clientes?.empresa}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[300px]">
                        <p className="text-sm text-muted-foreground truncate">{int.mensagem}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(int.status)}`}>{int.status}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma interação encontrada</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Interacoes;
