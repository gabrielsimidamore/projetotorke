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
    if (items.length === 0) return <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>Nenhuma recomendação</p>;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(rec => (
          <div key={rec.id} className="glass-card p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', color: 'rgba(255,255,255,0.35)' }}>{rec.id}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 1.3 }}>{rec.assunto_sugerido}</p>
              </div>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: '#F5C518' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="status-blue">{rec.formato_sugerido}</span>
              {rec.horario_sugerido && (
                <span className="flex items-center gap-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                  <Clock className="w-2.5 h-2.5" />{rec.horario_sugerido}
                </span>
              )}
            </div>
            {rec.justificativa_ia && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{rec.justificativa_ia}</p>}
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Gerado: {new Date(rec.gerado_em).toLocaleDateString('pt-BR')}</p>
            {rec.status === 'Pendente' && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleApprove(rec.id)}>
                  <Check className="w-3 h-3" />Aprovar
                </Button>
                <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={() => handleReject(rec.id)} style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
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
        <div>
          <h1 className="text-lg font-bold text-white">Recomendações IA</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Sugestões geradas automaticamente pela IA</p>
        </div>
        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes" className="text-xs">Pendentes ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="aprovados" className="text-xs">Aprovados ({aprovados.length})</TabsTrigger>
            <TabsTrigger value="rejeitados" className="text-xs">Rejeitados ({rejeitados.length})</TabsTrigger>
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
