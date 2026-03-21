import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Metrica } from '@/lib/supabase';
import { Loader2, Eye, Heart, MessageSquare, TrendingUp, Trophy, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const ACCENT = '#F5C518', BLUE = '#5b8dee', GREEN = '#22c55e', RED = '#ef4444';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,10,28,0.95)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
      {label && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ fontSize: 11, color: p.color, fontWeight: 600 }}>
          {p.name}: <span style={{ color: '#fff' }}>{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</span>
        </p>
      ))}
    </div>
  );
};

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

  if (loading) return <Layout><div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-lg font-bold text-white">Métricas</h1>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Performance dos posts no LinkedIn</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-stagger">
          {[
            { title: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: BLUE, glow: 'glass-blue' },
            { title: 'Likes', value: totalLikes.toLocaleString('pt-BR'), icon: Heart, color: RED, glow: 'glass-red' },
            { title: 'Comentários', value: totalComments.toLocaleString('pt-BR'), icon: MessageSquare, color: GREEN, glow: 'glass-green' },
            { title: 'Score Médio', value: avgScore.toLocaleString('pt-BR'), icon: TrendingUp, color: ACCENT, glow: 'glass-accent' },
          ].map(kpi => (
            <div key={kpi.title} className={`kpi-card ${kpi.glow}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="section-label mb-0">{kpi.title}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${kpi.color}18` }}>
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="glass-card p-4">
            <span className="section-label">Top 10 Posts por Score</span>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <XAxis dataKey="post" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" fill={ACCENT} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="section-label mb-0">Detalhamento</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{metricas.length} registros</span>
          </div>
          {metricas.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '48px 0' }}>Nenhuma métrica registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full dense-table">
                <thead>
                  <tr>
                    <th className="text-left">Post</th>
                    <th className="text-left">Assunto</th>
                    <th className="text-right">Impressões</th>
                    <th className="text-right">Likes</th>
                    <th className="text-right">Comentários</th>
                    <th className="text-right">Score</th>
                    <th className="text-center">Top</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.map(m => (
                    <tr key={m.id}>
                      <td><span style={{ fontFamily: 'Geist Mono, monospace', color: 'rgba(255,255,255,0.5)' }}>{m.id_post}</span></td>
                      <td><span className="text-white/70 truncate" style={{ maxWidth: 180, display: 'inline-block' }}>{m.assunto ?? '—'}</span></td>
                      <td className="text-right text-white/70">{m.impressoes.toLocaleString('pt-BR')}</td>
                      <td className="text-right text-white/70">{m.likes.toLocaleString('pt-BR')}</td>
                      <td className="text-right text-white/70">{m.comentarios.toLocaleString('pt-BR')}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(m.score_performance, 100)}%`, background: m.score_performance >= 70 ? GREEN : m.score_performance >= 40 ? ACCENT : RED }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, width: 28, textAlign: 'right', color: m.score_performance >= 70 ? '#4ade80' : m.score_performance >= 40 ? ACCENT : '#f87171' }}>
                            {m.score_performance}
                          </span>
                        </div>
                      </td>
                      <td className="text-center">{m.top_conteudo ? <Star className="w-3.5 h-3.5 mx-auto" style={{ color: ACCENT }} /> : <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>}</td>
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
