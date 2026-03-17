import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type IdeiaConteudo, type Conteudo } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, X, Loader2, PlayCircle, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ConteudoPage = () => {
  const { toast } = useToast();
  const [ideias, setIdeias] = useState<IdeiaConteudo[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ titulo: '', descricao: '' });
  const [videoForm, setVideoForm] = useState({ ideia_id: '', url_video: '' });

  const fetchData = async () => {
    const [i, c] = await Promise.all([
      supabase.from('ideias_conteudo').select('*').order('created_at', { ascending: false }),
      supabase.from('conteudos').select('*, ideias_conteudo(titulo)').order('data_publicacao', { ascending: false }),
    ]);
    setIdeias(i.data ?? []);
    setConteudos(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateIdeia = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('ideias_conteudo').insert({ ...form, status: 'pendente' });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Ideia criada!' }); setDialogOpen(false); setForm({ titulo: '', descricao: '' }); fetchData(); }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    await supabase.from('ideias_conteudo').update({ status: 'producao' }).eq('id', id);
    toast({ title: 'Ideia aprovada e movida para produção!' });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await supabase.from('ideias_conteudo').update({ status: 'rejeitado' }).eq('id', id);
    toast({ title: 'Ideia rejeitada' });
    fetchData();
  };

  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error: insertError } = await supabase.from('conteudos').insert({
      ideia_id: videoForm.ideia_id,
      url_video: videoForm.url_video,
      data_publicacao: new Date().toISOString(),
      status: 'ativo',
    });
    if (insertError) { toast({ title: 'Erro', description: insertError.message, variant: 'destructive' }); setSaving(false); return; }

    await supabase.from('ideias_conteudo').update({ status: 'concluido' }).eq('id', videoForm.ideia_id);
    toast({ title: 'Conteúdo publicado!' });
    setVideoDialogOpen(false);
    setVideoForm({ ideia_id: '', url_video: '' });
    fetchData();
    setSaving(false);
  };

  const pendentes = ideias.filter(i => i.status === 'pendente');
  const producao = ideias.filter(i => i.status === 'producao');
  const concluidos = ideias.filter(i => i.status === 'concluido');

  if (loading) {
    return <Layout><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conteúdo</h1>
            <p className="text-sm text-muted-foreground">Gerencie ideias e produção de conteúdo</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nova Ideia</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Ideia de Conteúdo</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateIdeia} className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Ideia
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="ideias">
          <TabsList>
            <TabsTrigger value="ideias">Ideias ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="producao">Produção ({producao.length})</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos ({concluidos.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="ideias" className="mt-4">
            {pendentes.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhuma ideia pendente</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendentes.map(ideia => (
                  <Card key={ideia.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold">{ideia.titulo}</CardTitle>
                        <span className="text-xs px-2 py-0.5 rounded-full status-pending shrink-0">Pendente</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{ideia.descricao}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(ideia.id)} className="flex-1 bg-success hover:bg-success/90 text-success-foreground">
                          <Check className="w-3 h-3 mr-1" />Aprovar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleReject(ideia.id)} className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                          <X className="w-3 h-3 mr-1" />Rejeitar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="producao" className="mt-4">
            <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Adicionar Vídeo</DialogTitle></DialogHeader>
                <form onSubmit={handlePublishVideo} className="space-y-4">
                  <div className="space-y-2">
                    <Label>URL do Vídeo</Label>
                    <Input value={videoForm.url_video} onChange={e => setVideoForm({ ...videoForm, url_video: e.target.value })} placeholder="https://youtube.com/..." required />
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Publicar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {producao.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhum conteúdo em produção</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {producao.map(ideia => (
                  <Card key={ideia.id} className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm font-semibold">{ideia.titulo}</CardTitle>
                        <span className="text-xs px-2 py-0.5 rounded-full status-approved shrink-0">Em produção</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{ideia.descricao}</p>
                      <Button size="sm" className="w-full" onClick={() => { setVideoForm({ ideia_id: ideia.id, url_video: '' }); setVideoDialogOpen(true); }}>
                        <PlayCircle className="w-3 h-3 mr-1" />Adicionar Vídeo
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concluidos" className="mt-4">
            {concluidos.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhum conteúdo concluído</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {concluidos.map(ideia => {
                  const conteudo = conteudos.find(c => c.ideia_id === ideia.id);
                  return (
                    <Card key={ideia.id} className="border-l-4 border-l-success hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-semibold">{ideia.titulo}</CardTitle>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30 shrink-0">Concluído</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{ideia.descricao}</p>
                        {conteudo && (
                          <a href={conteudo.url_video} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                            <Video className="w-3 h-3" />Ver vídeo<ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ConteudoPage;
