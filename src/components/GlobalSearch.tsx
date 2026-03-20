import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Users, Lightbulb, FileText, FolderKanban } from 'lucide-react';

type SearchResult = { type: string; id: string; title: string; subtitle: string; url: string };

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    const term = `%${q}%`;
    const [cli, ide, pos, proj] = await Promise.all([
      supabase.from('clientes').select('id, nome, empresa').ilike('nome', term).limit(5),
      supabase.from('ideias').select('id, assunto_tema, formato').ilike('assunto_tema', term).limit(5),
      supabase.from('posts').select('id, assunto, status_aprovacao').ilike('assunto', term).limit(5),
      supabase.from('projetos').select('id, nome, status').ilike('nome', term).limit(5),
    ]);
    const r: SearchResult[] = [
      ...(cli.data ?? []).map(c => ({ type: 'cliente', id: c.id, title: c.nome, subtitle: c.empresa, url: '/clientes' })),
      ...(ide.data ?? []).map(i => ({ type: 'ideia', id: String(i.id), title: i.assunto_tema, subtitle: i.formato, url: '/ideias' })),
      ...(pos.data ?? []).map(p => ({ type: 'post', id: p.id, title: p.assunto, subtitle: p.status_aprovacao, url: '/posts' })),
      ...(proj.data ?? []).map(p => ({ type: 'projeto', id: p.id, title: p.nome, subtitle: p.status, url: '/projetos' })),
    ];
    setResults(r);
    setSelectedIndex(0);
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query), 200); return () => clearTimeout(t); }, [query, search]);

  const handleSelect = (r: SearchResult) => { navigate(r.url); setOpen(false); setQuery(''); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[selectedIndex]) { handleSelect(results[selectedIndex]); }
  };

  const icon = (type: string) => {
    if (type === 'cliente') return <Users className="w-4 h-4 text-primary" />;
    if (type === 'ideia') return <Lightbulb className="w-4 h-4 text-primary" />;
    if (type === 'post') return <FileText className="w-4 h-4 text-primary" />;
    return <FolderKanban className="w-4 h-4 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setQuery(''); }}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <div className="flex items-center border-b border-border px-4">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar clientes, ideias, posts, projetos..."
            className="border-0 focus-visible:ring-0 text-sm"
            autoFocus
          />
          <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">ESC</kbd>
        </div>
        {results.length > 0 && (
          <div className="max-h-72 overflow-auto p-2">
            {results.map((r, idx) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'}`}
              >
                {icon(r.type)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                </div>
                <span className="text-[10px] uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{r.type}</span>
              </button>
            ))}
          </div>
        )}
        {query.length >= 2 && results.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
