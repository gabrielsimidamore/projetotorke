import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Recomendacao } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Check, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RecomendacoesPage = () => {
  const { toast } = useToast();
  const [recs, setRecs] = useState<Recomendacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase.from('recomendacoes').select('*').order('gerado_em', { ascending: false });
    setRecs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: string) => {
    await supabase.from('recomendacoes').update({ status: 'Aprovado' }).eq('id', id);
    toast({ title: 'Recomendação aprovada!' });
    fetchData();
  };

  const handleReject = async (id: string) => {
    await supabase.from('recomendacoes').update({ status: 'Rejeitado' }).eq('id', id);
    toast({ title: 'Recomendação rejeitada' });
    fetchData();
  };

  const pendentes = recs.filter(r => r.status === 'Pendente');
  const aprovados = recs.filter(r => r.status === 'Aprovado');
  const rejeitados = recs.filter(r => r.status === 'Rejeitado');

  const renderCards = (items: Recomendacao[]) => {
    if (items.length === 0) return <p className="text-center py-12 text-muted-foreground">Nenhuma recomendação</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(rec => (
          <Card key={rec.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs text-muted-foreground font-mono">{rec.id}</span>
                  <CardTitle className="text-sm font-semibold mt-1">{rec.assunto_sugerido}</CardTitle>
                </div>
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{rec.formato_sugerido}</span>
                {rec.horario_sugerido && <span className="text-xs text-muted-foreground">🕐 {rec.horario_sugerido}</span>}
              </div>
              {rec.justificativa_ia && <p className="text-sm text-muted-foreground mb-3">{rec.justificativa_ia}</p>}
              <p className="text-xs text-muted-foreground mb-3">Gerado: {new Date(rec.gerado_em).toLocaleDateString('pt-BR')}</p>
              {rec.status === 'Pendente' && (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleApprove(rec.id)}>
                    <Check className="w-3 h-3 mr-1" />Aprovar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => handleReject(rec.id)}>
                    <X className="w-3 h-3 mr-1" />Rejeitar
                  </Button>
                </div>
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recomendações IA</h1>
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
