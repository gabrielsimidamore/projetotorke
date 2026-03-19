import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Metrica } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, Eye, Heart, MessageSquare, Share2, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricasPage = () => {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('metricas').select('*').order('score_performance', { ascending: false });
      setMetricas(data ?? []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalImpressions = metricas.reduce((a, m) => a + m.impressoes, 0);
  const totalLikes = metricas.reduce((a, m) => a + m.likes, 0);
  const totalComments = metricas.reduce((a, m) => a + m.comentarios, 0);
  const avgScore = metricas.length ? Math.round(metricas.reduce((a, m) => a + m.score_performance, 0) / metricas.length) : 0;

  const chartData = metricas.slice(0, 10).map(m => ({
    post: m.id_post || `#${m.id}`,
    score: m.score_performance,
    likes: m.likes,
    comments: m.comentarios,
  }));

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Métricas</h1>
          <p className="text-sm text-muted-foreground">Performance dos posts no LinkedIn</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: 'text-blue-500' },
            { title: 'Likes', value: totalLikes.toLocaleString('pt-BR'), icon: Heart, color: 'text-red-500' },
            { title: 'Comentários', value: totalComments.toLocaleString('pt-BR'), icon: MessageSquare, color: 'text-emerald-500' },
            { title: 'Score Médio', value: avgScore.toLocaleString('pt-BR'), icon: TrendingUp, color: 'text-primary' },
          ].map(kpi => (
            <div key={kpi.title} className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`w-8 h-8 ${kpi.color} opacity-70`} />
              </div>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top 10 Posts por Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="post" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Detalhamento</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {metricas.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhuma métrica registrada</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Post</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comentários</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-center">Top</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metricas.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.id_post}</TableCell>
                        <TableCell className="text-sm">{m.assunto ?? '—'}</TableCell>
                        <TableCell className="text-right">{m.impressoes.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{m.likes.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{m.comentarios.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-right font-semibold">{m.score_performance.toLocaleString('pt-BR')}</TableCell>
                        <TableCell className="text-center">{m.top_conteudo ? <Trophy className="w-4 h-4 text-primary mx-auto" /> : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MetricasPage;
