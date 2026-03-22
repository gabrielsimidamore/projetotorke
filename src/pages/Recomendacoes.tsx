import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Recomendacao } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, Sparkles, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RecomendacoesPage = () => {
  const { toast } = useToast();
  const [recs, setRecs] = useState<Recomendacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => { const { data } = await supabase.from('recomendacoes').select('*').order('gerado_em', { ascending: false }); setRecs(data ?? []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => { await supabase.from('recomendacoes').update({ status: 'Aprovado' }).eq('id', id); toast({ title: 'Recomendação aprovada!' }); fetchData(); };
  const handleReject = async (id: string) => { await supabase.from('recomendacoes').update({ status: 'Rejeitado' }).eq('id', id); toast({ title: 'Recomendação rejeitada' }); fetchData(); };

  const pendentes = recs.filter(r => r.status === 'Pendente');
  const aprovados = recs.filter(r => r.status === 'Aprovado');
  const rejeitados = recs.filter(r => r.status === 'Rejeitado');

  const renderCards = (items: Recomendacao[]) => {
    if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-12">Nenhuma recomendação</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(rec => (
          <div key={rec.id} className="bg-card rounded-lg border border-border p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{rec.id}</span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{rec.assunto_sugerido}</p>
              </div>
              <Sparkles className="w-4 h-4 shrink-0 text-primary" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{rec.formato_sugerido}</span>
              {rec.horario_sugerido && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{rec.horario_sugerido}</span>}
            </div>
            {rec.justificativa_ia && <p className="text-sm text-muted-foreground">{rec.justificativa_ia}</p>}
            <p className="text-xs text-muted-foreground">Gerado: {new Date(rec.gerado_em).toLocaleDateString('pt-BR')}</p>
            {rec.status === 'Pendente' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 gap-1" onClick={() => handleApprove(rec.id)}><Check className="w-3 h-3" />Aprovar</Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive" onClick={() => handleReject(rec.id)}><X className="w-3 h-3" />Rejeitar</Button>
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
        <div>
          <h1 className="text-xl font-bold text-foreground">Recomendações IA</h1>
          <p className="text-sm text-muted-foreground">Sugestões geradas automaticamente pela IA</p>
        </div>
        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="aprovados">Aprovados ({aprovados.length})</TabsTrigger>
            <TabsTrigger value="rejeitados">Rejeitados ({rejeitados.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pendentes" className="mt-4">{renderCards(pendentes)}</TabsContent>
          <TabsContent value="aprovados" className="mt-4">{renderCards(aprovados)}</TabsContent>
          <TabsContent value="rejeitados" className="mt-4">{renderCards(rejeitados)}</TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default RecomendacoesPage;
