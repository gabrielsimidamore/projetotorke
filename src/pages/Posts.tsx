import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Post, type Ideia } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Check, X, Image, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PostsPage = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextId, setNextId] = useState('P001');
  const [form, setForm] = useState({ id_ideia: '', assunto: '', conteudo_post: '', hashtags: '', modo_imagem: 'sem_imagem', url_imagem: '' });

  const fetchData = async () => {
    const [p, i] = await Promise.all([
      supabase.from('posts').select('*').order('created_at', { ascending: false }),
      supabase.from('ideias').select('*').eq('status', 'Em uso').order('created_at', { ascending: false }),
    ]);
    const postsData = p.data ?? [];
    setPosts(postsData);
    setIdeias(i.data ?? []);
    const nums = postsData.map(p => parseInt(p.id.replace('P', ''), 10)).filter(n => !isNaN(n));
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setNextId(`P${String(next).padStart(3, '0')}`);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('posts').insert({ id: nextId, id_ideia: form.id_ideia ? parseInt(form.id_ideia) : null, assunto: form.assunto, conteudo_post: form.conteudo_post, hashtags: form.hashtags || null, modo_imagem: form.modo_imagem, url_imagem: form.url_imagem || null });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Post criado!' }); setDialogOpen(false); setForm({ id_ideia: '', assunto: '', conteudo_post: '', hashtags: '', modo_imagem: 'sem_imagem', url_imagem: '' }); fetchData(); }
    setSaving(false);
  };

  const handleApprove = async (id: string) => { await supabase.from('posts').update({ status_aprovacao: 'Aprovado', data_aprovacao: new Date().toISOString().split('T')[0] }).eq('id', id); toast({ title: 'Post aprovado!' }); fetchData(); };
  const handleReject = async (id: string) => { await supabase.from('posts').update({ status_aprovacao: 'Rejeitado' }).eq('id', id); toast({ title: 'Post rejeitado' }); fetchData(); };

  const rascunhos = posts.filter(p => p.status_aprovacao === 'Rascunho');
  const aprovados = posts.filter(p => p.status_aprovacao === 'Aprovado');
  const rejeitados = posts.filter(p => p.status_aprovacao === 'Rejeitado');

  const modoLabel = (m: string) => m === 'gerar_ia' ? 'IA' : m === 'minha_foto' ? 'Foto' : 'Sem img';

  const renderCards = (items: Post[]) => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Nenhum post nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(post => (
          <div key={post.id} className="bg-card rounded-lg border border-border p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{post.id}</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{post.assunto}</p>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">{modoLabel(post.modo_imagem)}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3">{post.conteudo_post}</p>
            {post.hashtags && <p className="text-xs text-primary">{post.hashtags}</p>}
            {post.url_imagem && (
              <a href={post.url_imagem} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Image className="w-3 h-3" />Ver imagem <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {post.status_aprovacao === 'Rascunho' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 gap-1" onClick={() => handleApprove(post.id)}><Check className="w-3 h-3" />Aprovar</Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleReject(post.id)}><X className="w-3 h-3" />Rejeitar</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Posts LinkedIn</h1>
            <p className="text-sm text-muted-foreground">{posts.length} posts • Próximo: <span className="font-mono text-primary">{nextId}</span></p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Post</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Post ({nextId})</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Ideia vinculada (opcional)</Label>
                  <Select value={form.id_ideia} onValueChange={v => setForm({ ...form, id_ideia: v })}>
                    <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>{ideias.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.assunto_tema}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Assunto</Label><Input value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} required /></div>
                <div className="space-y-1.5"><Label>Conteúdo</Label><Textarea value={form.conteudo_post} onChange={e => setForm({ ...form, conteudo_post: e.target.value })} required rows={5} /></div>
                <div className="space-y-1.5"><Label>Hashtags</Label><Input value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#linkedin #conteudo" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Modo Imagem</Label>
                    <Select value={form.modo_imagem} onValueChange={v => setForm({ ...form, modo_imagem: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_imagem">Sem imagem</SelectItem>
                        <SelectItem value="gerar_ia">Gerar com IA</SelectItem>
                        <SelectItem value="minha_foto">Minha foto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.modo_imagem !== 'sem_imagem' && (
                    <div className="space-y-1.5"><Label>URL da Imagem</Label><Input value={form.url_imagem} onChange={e => setForm({ ...form, url_imagem: e.target.value })} /></div>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Criar Post</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Tabs defaultValue="rascunhos">
          <TabsList>
            <TabsTrigger value="rascunhos">Rascunhos ({rascunhos.length})</TabsTrigger>
            <TabsTrigger value="aprovados">Aprovados ({aprovados.length})</TabsTrigger>
            <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="rascunhos" className="mt-4">{renderCards(rascunhos)}</TabsContent>
          <TabsContent value="aprovados" className="mt-4">{renderCards(aprovados)}</TabsContent>
          <TabsContent value="rejeitados" className="mt-4">{renderCards(rejeitados)}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default PostsPage;
