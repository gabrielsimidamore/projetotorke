import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, FolderPlus, Upload, Trash2, FileText, Image, Video,
  Music, File, Pencil, StickyNote, ChevronRight, Home, X,
} from 'lucide-react';

type Pasta = { id: string; nome: string; descricao: string | null; cor: string; parent_id: string | null; };
type Arquivo = { id: string; nome: string; descricao: string | null; notas: string | null; tipo_arquivo: string; url: string; storage_path: string; tamanho: number | null; pasta_id: string | null; created_at: string; };
type Nota = { id: string; titulo: string; conteudo: string | null; cor: string; fixada: boolean; pasta_id: string | null; };

const BUCKET = 'arquivos';

const tipoIcon = (tipo: string) => {
  if (tipo === 'imagem') return <Image className="w-5 h-5 text-blue-400" />;
  if (tipo === 'video') return <Video className="w-5 h-5 text-purple-400" />;
  if (tipo === 'audio') return <Music className="w-5 h-5 text-pink-400" />;
  if (tipo === 'documento') return <FileText className="w-5 h-5 text-yellow-400" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
};

const formatBytes = (b: number | null) => {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

const mimeToTipo = (mime: string): string => {
  if (mime.startsWith('image/')) return 'imagem';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('document') || mime.includes('text')) return 'documento';
  return 'outro';
};

export default function Arquivos() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [pastaAtual, setPastaAtual] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Pasta[]>([]);
  const [uploading, setUploading] = useState(false);

  const [dlgPasta, setDlgPasta] = useState(false);
  const [dlgNota, setDlgNota] = useState(false);
  const [dlgArquivo, setDlgArquivo] = useState<Arquivo | null>(null);
  const [editNota, setEditNota] = useState<Nota | null>(null);

  const [nomePasta, setNomePasta] = useState('');
  const [corPasta, setCorPasta] = useState('#F5A623');
  const [tituloNota, setTituloNota] = useState('');
  const [conteudoNota, setConteudoNota] = useState('');

  const load = async (pastaId: string | null) => {
    const [{ data: ps }, { data: arqs }, { data: nts }] = await Promise.all([
      supabase.from('pastas').select('*').eq('tipo', 'conteudo').is('parent_id', pastaId ?? null).order('nome'),
      supabase.from('arquivos').select('*').is('pasta_id', pastaId ?? null).order('created_at', { ascending: false }),
      supabase.from('notas').select('*').eq('tipo', 'conteudo').is('pasta_id', pastaId ?? null).order('fixada', { ascending: false }),
    ]);
    setPastas(ps ?? []);
    setArquivos(arqs ?? []);
    setNotas(nts ?? []);
  };

  useEffect(() => { load(pastaAtual); }, [pastaAtual]);

  const entrarPasta = async (p: Pasta) => {
    setBreadcrumb(prev => [...prev, p]);
    setPastaAtual(p.id);
  };

  const voltarPara = (idx: number) => {
    const crumb = breadcrumb.slice(0, idx);
    setBreadcrumb(crumb);
    setPastaAtual(crumb.length ? crumb[crumb.length - 1].id : null);
  };

  const criarPasta = async () => {
    if (!nomePasta.trim()) return;
    await supabase.from('pastas').insert({ nome: nomePasta, cor: corPasta, tipo: 'conteudo', parent_id: pastaAtual });
    setNomePasta(''); setDlgPasta(false);
    load(pastaAtual);
  };

  const deletarPasta = async (id: string) => {
    await supabase.from('pastas').delete().eq('id', id);
    load(pastaAtual);
  };

  const uploadArquivo = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file);
    if (upErr) { toast({ title: 'Erro no upload', description: upErr.message, variant: 'destructive' }); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    await supabase.from('arquivos').insert({
      nome: file.name, tipo_mime: file.type, tamanho: file.size,
      tipo_arquivo: mimeToTipo(file.type), url: urlData.publicUrl,
      storage_path: path, bucket: BUCKET, pasta_id: pastaAtual,
    });
    toast({ title: 'Upload concluído!' });
    setUploading(false);
    load(pastaAtual);
  };

  const deletarArquivo = async (arq: Arquivo) => {
    await supabase.storage.from(BUCKET).remove([arq.storage_path]);
    await supabase.from('arquivos').delete().eq('id', arq.id);
    setDlgArquivo(null);
    load(pastaAtual);
  };

  const salvarNota = async () => {
    if (editNota) {
      await supabase.from('notas').update({ titulo: tituloNota, conteudo: conteudoNota }).eq('id', editNota.id);
    } else {
      await supabase.from('notas').insert({ titulo: tituloNota, conteudo: conteudoNota, tipo: 'conteudo', pasta_id: pastaAtual });
    }
    setDlgNota(false); setEditNota(null); setTituloNota(''); setConteudoNota('');
    load(pastaAtual);
  };

  const deletarNota = async (id: string) => {
    await supabase.from('notas').delete().eq('id', id);
    load(pastaAtual);
  };

  const abrirNota = (n: Nota) => {
    setEditNota(n); setTituloNota(n.titulo); setConteudoNota(n.conteudo ?? ''); setDlgNota(true);
  };

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Arquivos & Mídia</h1>
            <p className="text-sm text-muted-foreground">Documentos, vídeos, fotos e notas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDlgPasta(true)}>
              <FolderPlus className="w-4 h-4 mr-1" /> Nova pasta
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setEditNota(null); setTituloNota(''); setConteudoNota(''); setDlgNota(true); }}>
              <StickyNote className="w-4 h-4 mr-1" /> Nova nota
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-1" /> {uploading ? 'Enviando…' : 'Upload'}
            </Button>
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={e => Array.from(e.target.files ?? []).forEach(uploadArquivo)} />
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <button onClick={() => voltarPara(0)} className="hover:text-foreground flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Início
          </button>
          {breadcrumb.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3" />
              <button onClick={() => voltarPara(i + 1)} className="hover:text-foreground">{p.nome}</button>
            </span>
          ))}
        </div>

        {/* Pastas */}
        {pastas.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Pastas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pastas.map(p => (
                <div key={p.id} className="group relative glass-card p-3 flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => entrarPasta(p)}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                    style={{ backgroundColor: p.cor }}>📁</div>
                  <span className="text-xs text-center text-foreground font-medium truncate w-full text-center">{p.nome}</span>
                  <button className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/20"
                    onClick={e => { e.stopPropagation(); deletarPasta(p.id); }}>
                    <X className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        {notas.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Notas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {notas.map(n => (
                <div key={n.id} className="glass-card p-4 space-y-2 cursor-pointer hover:shadow-card-hover group relative"
                  onClick={() => abrirNota(n)}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground truncate">{n.titulo}</p>
                    <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20"
                      onClick={e => { e.stopPropagation(); deletarNota(n.id); }}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{n.conteudo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Arquivos */}
        {arquivos.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Arquivos</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {arquivos.map(a => (
                <div key={a.id} className="glass-card p-4 flex items-start gap-3 cursor-pointer hover:shadow-card-hover"
                  onClick={() => setDlgArquivo(a)}>
                  {tipoIcon(a.tipo_arquivo)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.nome}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(a.tamanho)}</p>
                    {a.notas && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.notas}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastas.length === 0 && arquivos.length === 0 && notas.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderPlus className="w-12 h-12 text-muted-foreground mb-4 opacity-40" />
            <p className="text-muted-foreground">Nenhum arquivo ainda. Crie uma pasta ou faça upload.</p>
          </div>
        )}
      </div>

      {/* Dialog Nova Pasta */}
      <Dialog open={dlgPasta} onOpenChange={setDlgPasta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input value={nomePasta} onChange={e => setNomePasta(e.target.value)} placeholder="Ex: Campanhas Q1" />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <input type="color" value={corPasta} onChange={e => setCorPasta(e.target.value)}
                className="h-9 w-20 rounded cursor-pointer border border-input" />
            </div>
            <Button className="w-full" onClick={criarPasta}>Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Nota */}
      <Dialog open={dlgNota} onOpenChange={v => { setDlgNota(v); if (!v) { setEditNota(null); setTituloNota(''); setConteudoNota(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editNota ? 'Editar Nota' : 'Nova Nota'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input value={tituloNota} onChange={e => setTituloNota(e.target.value)} placeholder="Título da nota" />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <Textarea value={conteudoNota} onChange={e => setConteudoNota(e.target.value)}
                placeholder="Escreva sua nota aqui…" rows={8} />
            </div>
            <Button className="w-full" onClick={salvarNota}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Arquivo */}
      {dlgArquivo && (
        <Dialog open={!!dlgArquivo} onOpenChange={() => setDlgArquivo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="flex items-center gap-2">{tipoIcon(dlgArquivo.tipo_arquivo)}{dlgArquivo.nome}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {dlgArquivo.tipo_arquivo === 'imagem' && (
                <img src={dlgArquivo.url} alt={dlgArquivo.nome} className="w-full rounded-lg object-cover max-h-64" />
              )}
              {dlgArquivo.tipo_arquivo === 'video' && (
                <video src={dlgArquivo.url} controls className="w-full rounded-lg max-h-64" />
              )}
              <div className="flex gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{dlgArquivo.tipo_arquivo}</Badge>
                <span>{formatBytes(dlgArquivo.tamanho)}</span>
              </div>
              {dlgArquivo.notas && <p className="text-sm text-muted-foreground">{dlgArquivo.notas}</p>}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={dlgArquivo.url} target="_blank" rel="noreferrer">Abrir</a>
                </Button>
                <Button variant="destructive" onClick={() => deletarArquivo(dlgArquivo)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Layout>
  );
}
