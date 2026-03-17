import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Cliente, type Interacao } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Mail, Phone, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Clientes = () => {
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [form, setForm] = useState({ nome: '', empresa: '', telefone: '', email: '', segmento: '' });
  const [saving, setSaving] = useState(false);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false });
    setClientes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

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
    setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '' });
    fetchClientes();
  };

  const handleEdit = (c: Cliente) => {
    setEditing(c);
    setForm({ nome: c.nome, empresa: c.empresa, telefone: c.telefone, email: c.email, segmento: c.segmento });
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

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.empresa.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">{clientes.length} clientes cadastrados</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '' }); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Input value={form.segmento} onChange={e => setForm({ ...form, segmento: e.target.value })} placeholder="Ex: Autopeças pesado" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editing ? 'Salvar' : 'Criar'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Empresa</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Segmento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{c.empresa}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{c.segmento}</span>
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
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum cliente encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{selectedCliente?.nome}</SheetTitle>
            </SheetHeader>
            {selectedCliente && (
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Empresa: <span className="text-foreground">{selectedCliente.empresa}</span></p>
                  <p className="text-sm text-muted-foreground">Email: <span className="text-foreground">{selectedCliente.email}</span></p>
                  <p className="text-sm text-muted-foreground">Telefone: <span className="text-foreground">{selectedCliente.telefone}</span></p>
                  <p className="text-sm text-muted-foreground">Segmento: <span className="text-foreground">{selectedCliente.segmento}</span></p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Interações</h3>
                  {interacoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma interação</p>
                  ) : (
                    <div className="space-y-3">
                      {interacoes.map(int => (
                        <div key={int.id} className="p-3 rounded-md bg-muted/50 border border-border">
                          <div className="flex items-center gap-2 mb-1">
                            {int.canal === 'email' && <Mail className="w-3 h-3 text-accent" />}
                            {int.canal === 'whatsapp' && <Phone className="w-3 h-3 text-success" />}
                            {int.canal === 'linkedin' && <Linkedin className="w-3 h-3 text-primary" />}
                            <span className="text-xs font-medium text-muted-foreground uppercase">{int.canal}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ml-auto ${int.status === 'pendente' ? 'status-pending' : 'status-approved'}`}>{int.status}</span>
                          </div>
                          <p className="text-sm text-foreground">{int.mensagem}</p>
                          <p className="text-xs text-muted-foreground mt-1">{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
};

export default Clientes;
