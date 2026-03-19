import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Ideia } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Lightbulb, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const IdeiasPage = () => {
  const { toast } = useToast();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ assunto_tema: '', formato: 'texto', observacoes: '' });

  const fetchData = async () => {
    const { data } = await supabase.from('ideias').select('*').order('created_at', { ascending: false });
    setIdeias(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('ideias').insert({
      assunto_tema: form.assunto_tema,
      formato: form.formato,
      observacoes: form.observacoes || null,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Ideia criada!' }); setDialogOpen(false); setForm({ assunto_tema: '', formato: 'texto', observacoes: '' }); fetchData(); }
    setSaving(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await supabase.from('ideias').update({ status, data_uso: status === 'Em uso' ? new Date().toISOString().split('T')[0] : null }).eq('id', id);
    toast({ title: `Status atualizado para ${status}` });
    fetchData();
  };

  const statusColor = (s: string) => {
    if (s === 'Pendente') return 'bg-amber-500/15 text-amber-600 border border-amber-500/30';
    if (s === 'Em uso') return 'bg-blue-500/15 text-blue-600 border border-blue-500/30';
    if (s === 'Usado') return 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30';
    return 'bg-red-500/15 text-red-600 border border-red-500/30';
  };

  const pendentes = ideias.filter(i => i.status === 'Pendente');
  const emUso = ideias.filter(i => i.status === 'Em uso');
  const usados = ideias.filter(i => i.status === 'Usado');
  const rejeitados = ideias.filter(i => i.status === 'Rejeitado');

  const renderCards = (items: Ideia[]) => {
    if (items.length === 0) return <p className="text-center py-12 text-muted-foreground">Nenhuma ideia nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(ideia => (
          <Card key={ideia.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-semibold">{ideia.assunto_tema}</CardTitle>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor(ideia.status)}`}>{ideia.status}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{ideia.formato}</span>
                <span className="text-xs text-muted-foreground">{new Date(ideia.data_cadastro).toLocaleDateString('pt-BR')}</span>
              </div>
              {ideia.observacoes && <p className="text-sm text-muted-foreground mb-3">{ideia.observacoes}</p>}
              {ideia.status === 'Pendente' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleStatusChange(ideia.id, 'Em uso')}>
                    <Check className="w-3 h-3 mr-1" />Usar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => handleStatusChange(ideia.id, 'Rejeitado')}>
                    <X className="w-3 h-3 mr-1" />Rejeitar
                  </Button>
                </div>
              )}
              {ideia.status === 'Em uso' && (
                <Button size="sm" className="w-full" variant="outline" onClick={() => handleStatusChange(ideia.id, 'Usado')}>
                  Marcar como Usado
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ideias de Conteúdo</h1>
            <p className="text-sm text-muted-foreground">{ideias.length} ideias cadastradas</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nova Ideia</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Ideia</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label>Assunto / Tema</Label>
                  <Input value={form.assunto_tema} onChange={e => setForm({ ...form, assunto_tema: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={form.formato} onValueChange={v => setForm({ ...form, formato: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="texto">Texto</SelectItem>
                      <SelectItem value="carrossel">Carrossel</SelectItem>
                      <SelectItem value="vídeo">Vídeo</SelectItem>
                      <SelectItem value="imagem">Imagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Ideia
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="emuso">Em uso ({emUso.length})</TabsTrigger>
            <TabsTrigger value="usados">Usados ({usados.length})</TabsTrigger>
            <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pendentes" className="mt-4">{renderCards(pendentes)}</TabsContent>
          <TabsContent value="emuso" className="mt-4">{renderCards(emUso)}</TabsContent>
          <TabsContent value="usados" className="mt-4">{renderCards(usados)}</TabsContent>
          <TabsContent value="rejeitados" className="mt-4">{renderCards(rejeitados)}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default IdeiasPage;
