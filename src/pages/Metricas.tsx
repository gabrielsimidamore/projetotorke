import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Metrica } from '@/lib/supabase';
import { Loader2, Eye, Heart, MessageSquare, TrendingUp, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ACCENT = '#e5a700', BLUE = '#3b82f6', GREEN = '#22c55e', RED = '#ef4444';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>{p.name}: <span className="text-foreground">{p.value?.toLocaleString('pt-BR')}</span></p>
      ))}
    </div>
  );
};

const MetricasPage = () => {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('metricas').select('*').order('score_performance', { ascending: false }).then(({ data }) => {
      setMetricas(data ?? []);
      setLoading(false);
    });
  }, []);

  const totalImpressions = metricas.reduce((a, m) => a + m.impressoes, 0);
  const totalLikes = metricas.reduce((a, m) => a + m.likes, 0);
  const totalComments = metricas.reduce((a, m) => a + m.comentarios, 0);
  const avgScore = metricas.length ? Math.round(metricas.reduce((a, m) => a + m.score_performance, 0) / metricas.length) : 0;

  const chartData = metricas.slice(0, 10).map(m => ({ post: m.id_post || `#${m.id}`, score: m.score_performance }));

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Métricas</h1>
          <p className="text-sm text-muted-foreground">Performance dos posts no LinkedIn</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { title: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: BLUE },
            { title: 'Likes', value: totalLikes.toLocaleString('pt-BR'), icon: Heart, color: RED },
            { title: 'Comentários', value: totalComments.toLocaleString('pt-BR'), icon: MessageSquare, color: GREEN },
            { title: 'Score Médio', value: avgScore.toLocaleString('pt-BR'), icon: TrendingUp, color: ACCENT },
          ].map(kpi => (
            <div key={kpi.title} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Top 10 Posts por Score</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="post" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" fill={ACCENT} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Detalhamento</h3>
            <span className="text-xs text-muted-foreground">{metricas.length} registros</span>
          </div>
          {metricas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma métrica registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Post</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Assunto</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Impressões</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Likes</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Score</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground">Top</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-muted-foreground">{m.id_post}</td>
                      <td className="px-4 py-2 text-foreground truncate max-w-[200px]">{m.assunto ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{m.impressoes.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{m.likes.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2 text-right font-semibold" style={{ color: m.score_performance >= 70 ? GREEN : m.score_performance >= 40 ? ACCENT : RED }}>
                        {m.score_performance}
                      </td>
                      <td className="px-4 py-2 text-center">{m.top_conteudo ? <Star className="w-4 h-4 mx-auto text-primary" /> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MetricasPage;
