import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Interacao, type Cliente } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Mail, Phone, Linkedin, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Interacoes = () => {
  const { toast } = useToast();
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ cliente_id: '', canal: 'email' as string, mensagem: '', status: 'pendente' as string });

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
    else { toast({ title: 'Interação registrada!' }); setDialogOpen(false); setForm({ cliente_id: '', canal: 'email', mensagem: '', status: 'pendente' }); fetchData(); }
    setSaving(false);
  };

  const channelIcon = (canal: string) => {
    if (canal === 'email') return <Mail className="w-4 h-4 text-accent" />;
    if (canal === 'whatsapp') return <Phone className="w-4 h-4 text-success" />;
    return <Linkedin className="w-4 h-4 text-primary" />;
  };

  const renderList = (items: Interacao[]) => {
    if (items.length === 0) return <p className="text-center py-12 text-muted-foreground">Nenhuma interação</p>;
    return (
      <div className="space-y-3">
        {items.map(int => (
          <div key={int.id} className="p-4 rounded-md bg-card border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{channelIcon(int.canal)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{(int as any).clientes?.nome ?? 'Cliente'}</span>
                  <span className="text-xs text-muted-foreground">{(int as any).clientes?.empresa}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${int.status === 'pendente' ? 'status-pending' : 'status-approved'}`}>{int.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{int.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-2">{new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interações</h1>
            <p className="text-sm text-muted-foreground">{interacoes.length} interações registradas</p>
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
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="respondido">Respondido</SelectItem>
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

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="todos">
            <TabsList>
              <TabsTrigger value="todos">Todos ({interacoes.length})</TabsTrigger>
              <TabsTrigger value="email">Email ({interacoes.filter(i => i.canal === 'email').length})</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp ({interacoes.filter(i => i.canal === 'whatsapp').length})</TabsTrigger>
              <TabsTrigger value="linkedin">LinkedIn ({interacoes.filter(i => i.canal === 'linkedin').length})</TabsTrigger>
            </TabsList>
            <TabsContent value="todos" className="mt-4">{renderList(interacoes)}</TabsContent>
            <TabsContent value="email" className="mt-4">{renderList(interacoes.filter(i => i.canal === 'email'))}</TabsContent>
            <TabsContent value="whatsapp" className="mt-4">{renderList(interacoes.filter(i => i.canal === 'whatsapp'))}</TabsContent>
            <TabsContent value="linkedin" className="mt-4">{renderList(interacoes.filter(i => i.canal === 'linkedin'))}</TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
};

export default Interacoes;
