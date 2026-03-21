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
  const [form, setForm] = useState({
    id_ideia: '', assunto: '', conteudo_post: '', hashtags: '', modo_imagem: 'sem_imagem', url_imagem: '',
  });

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
    const { error } = await supabase.from('posts').insert({
      id: nextId,
      id_ideia: form.id_ideia ? parseInt(form.id_ideia) : null,
      assunto: form.assunto,
      conteudo_post: form.conteudo_post,
      hashtags: form.hashtags || null,
      modo_imagem: form.modo_imagem,
      url_imagem: form.url_imagem || null,
    });
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Post criado!' });
      setDialogOpen(false);
      setForm({ id_ideia: '', assunto: '', conteudo_post: '', hashtags: '', modo_imagem: 'sem_imagem', url_imagem: '' });
      fetchData();
    }
    setSaving(false);
  };

  const handleApprove = async (id: string) => {
    await supabase.from('posts').update({ status_aprovacao: 'Aprovado', data_aprovacao: new Date().toISOString().split('T')[0] }).eq('id', id);
    toast({ title: 'Post aprovado!' });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await supabase.from('posts').update({ status_aprovacao: 'Rejeitado' }).eq('id', id);
    toast({ title: 'Post rejeitado' });
    fetchData();
  };

  const rascunhos = posts.filter(p => p.status_aprovacao === 'Rascunho');
  const aprovados = posts.filter(p => p.status_aprovacao === 'Aprovado');
  const rejeitados = posts.filter(p => p.status_aprovacao === 'Rejeitado');

  const modoLabel = (m: string) => {
    if (m === 'gerar_ia') return 'IA';
    if (m === 'minha_foto') return 'Foto';
    return 'Sem img';
  };

  const renderCards = (items: Post[]) => {
    if (items.length === 0) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>Nenhum post nesta categoria</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(post => (
          <div key={post.id} className="glass-card p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', color: 'rgba(255,255,255,0.35)' }}>{post.id}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 1.3 }}>{post.assunto}</p>
              </div>
              <span className="status-blue shrink-0">{modoLabel(post.modo_imagem)}</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }} className="line-clamp-3">{post.conteudo_post}</p>
            {post.hashtags && <p style={{ fontSize: 11, color: '#F5C518' }}>{post.hashtags}</p>}
            {post.url_imagem && (
              <a href={post.url_imagem} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline" style={{ fontSize: 11, color: '#5b8dee' }}>
                <Image className="w-3 h-3" />Ver imagem <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {post.status_aprovacao === 'Rascunho' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleApprove(post.id)}>
                  <Check className="w-3 h-3" />Aprovar
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={() => handleReject(post.id)} style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <X className="w-3 h-3" />Rejeitar
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Posts LinkedIn</h1>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{posts.length} posts • Próximo: <span style={{ fontFamily: 'Geist Mono, monospace', color: '#F5C518' }}>{nextId}</span></p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="text-sm">Novo Post ({nextId})</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Ideia vinculada (opcional)</Label>
                  <Select value={form.id_ideia} onValueChange={v => setForm({ ...form, id_ideia: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                    <SelectContent>{ideias.map(i => <SelectItem key={i.id} value={String(i.id)} className="text-xs">{i.assunto_tema}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Assunto</Label>
                  <Input value={form.assunto} onChange={e => setForm({ ...form, assunto: e.target.value })} required className="h-8 text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Conteúdo do Post</Label>
                  <Textarea value={form.conteudo_post} onChange={e => setForm({ ...form, conteudo_post: e.target.value })} required rows={5} className="text-xs resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Hashtags</Label>
                  <Input value={form.hashtags} onChange={e => setForm({ ...form, hashtags: e.target.value })} placeholder="#linkedin #conteudo" className="h-8 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modo Imagem</Label>
                    <Select value={form.modo_imagem} onValueChange={v => setForm({ ...form, modo_imagem: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem_imagem" className="text-xs">Sem imagem</SelectItem>
                        <SelectItem value="gerar_ia" className="text-xs">Gerar com IA</SelectItem>
                        <SelectItem value="minha_foto" className="text-xs">Minha foto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.modo_imagem !== 'sem_imagem' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL da Imagem</Label>
                      <Input value={form.url_imagem} onChange={e => setForm({ ...form, url_imagem: e.target.value })} className="h-8 text-xs" />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full h-8 text-xs" disabled={saving}>
                  {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}Criar Post
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="rascunhos">
          <TabsList>
            <TabsTrigger value="rascunhos" className="text-xs">Rascunhos ({rascunhos.length})</TabsTrigger>
            <TabsTrigger value="aprovados" className="text-xs">Aprovados ({aprovados.length})</TabsTrigger>
            <TabsTrigger value="rejeitados" className="text-xs">Rejeitados ({rejeitados.length})</TabsTrigger>
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
