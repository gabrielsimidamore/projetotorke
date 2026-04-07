import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Metrica } from '@/lib/supabase';
import { Loader2, Eye, Heart, MessageSquare, TrendingUp, Star, Share2, MousePointer } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const ACCENT = '#e5a700';
const BLUE = '#3b82f6';
const GREEN = '#22c55e';
const RED = '#ef4444';
const PURPLE = '#a855f7';
const CYAN = '#06b6d4';

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-xl text-xs">
      {label && <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: <span className="text-foreground">{p.value?.toLocaleString('pt-BR')}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Traffic Funnel ───────────────────────────────────────── */
const TrafficFunnel = ({ metricas }: { metricas: Metrica[] }) => {
  const totalImp = metricas.reduce((a, m) => a + m.impressoes, 0);
  const totalViews = metricas.reduce((a, m) => a + m.views, 0);
  const totalLikes = metricas.reduce((a, m) => a + m.likes, 0);
  const totalComm = metricas.reduce((a, m) => a + m.comentarios, 0);
  const totalShares = metricas.reduce((a, m) => a + m.compartilhamentos, 0);
  const totalCliques = metricas.reduce((a, m) => a + m.cliques_perfil, 0);

  const stages = [
    { label: 'Impressões', value: totalImp, color: ACCENT, rate: null },
    { label: 'Views', value: totalViews, color: BLUE, rate: totalImp > 0 ? (totalViews / totalImp * 100).toFixed(1) : '0' },
    { label: 'Likes', value: totalLikes, color: PURPLE, rate: totalViews > 0 ? (totalLikes / totalViews * 100).toFixed(1) : '0' },
    { label: 'Comentários', value: totalComm, color: CYAN, rate: totalLikes > 0 ? (totalComm / totalLikes * 100).toFixed(1) : '0' },
    { label: 'Compartilhos', value: totalShares, color: GREEN, rate: totalComm > 0 ? (totalShares / totalComm * 100).toFixed(1) : '0' },
    { label: 'Cliques Perfil', value: totalCliques, color: RED, rate: totalImp > 0 ? (totalCliques / totalImp * 100).toFixed(2) : '0' },
  ];

  const top = Math.max(totalImp, 1);

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground w-28 shrink-0 text-right uppercase tracking-wider">Métrica</span>
        <span className="flex-1 text-center text-[10px] text-muted-foreground uppercase tracking-wider">Volume</span>
        <span className="text-[10px] text-muted-foreground w-14 shrink-0 text-right uppercase tracking-wider">Taxa</span>
      </div>
      {stages.map((s) => {
        const pct = Math.max((s.value / top) * 100, 3);
        return (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-28 shrink-0 text-right truncate">{s.label}</span>
            <div className="flex-1 flex items-center justify-center h-7">
              <div
                className="h-full rounded flex items-center justify-between px-2.5 transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${s.color}25, ${s.color}45)`,
                  border: `1px solid ${s.color}70`,
                }}
              >
                <span className="text-xs font-bold" style={{ color: s.color }}>
                  {s.value.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
            <span
              className="text-[11px] font-semibold w-14 shrink-0 text-right"
              style={{ color: s.rate !== null ? s.color : 'transparent' }}
            >
              {s.rate !== null ? `${s.rate}%` : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Main Page ────────────────────────────────────────────── */
const MetricasPage = () => {
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('metricas')
      .select('*')
      .order('score_performance', { ascending: false })
      .then(({ data }) => {
        setMetricas(data ?? []);
        setLoading(false);
      });
  }, []);

  /* ── aggregates ─────────────────────────────────────────── */
  const totalImpressions = metricas.reduce((a, m) => a + m.impressoes, 0);
  const totalViews = metricas.reduce((a, m) => a + m.views, 0);
  const totalLikes = metricas.reduce((a, m) => a + m.likes, 0);
  const totalComments = metricas.reduce((a, m) => a + m.comentarios, 0);
  const totalShares = metricas.reduce((a, m) => a + m.compartilhamentos, 0);
  const totalCliques = metricas.reduce((a, m) => a + m.cliques_perfil, 0);
  const avgScore = metricas.length
    ? Math.round(metricas.reduce((a, m) => a + m.score_performance, 0) / metricas.length)
    : 0;
  const ctr = totalImpressions > 0
    ? ((totalCliques / totalImpressions) * 100).toFixed(2)
    : '0.00';
  const engajamento = totalImpressions > 0
    ? (((totalLikes + totalComments + totalShares) / totalImpressions) * 100).toFixed(2)
    : '0.00';

  /* ── chart data ─────────────────────────────────────────── */
  const timelineData = (() => {
    const map: Record<string, any> = {};
    [...metricas].sort((a, b) => (a.data_post ?? '').localeCompare(b.data_post ?? '')).forEach(m => {
      if (!m.data_post) return;
      const key = m.data_post.slice(0, 7);
      const label = new Date(m.data_post + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { mes: label, impressoes: 0, likes: 0, views: 0, score: 0, count: 0 };
      map[key].impressoes += m.impressoes;
      map[key].likes += m.likes;
      map[key].views += m.views;
      map[key].score += m.score_performance;
      map[key].count++;
    });
    return Object.values(map).map((d: any) => ({ ...d, score: Math.round(d.score / d.count) })).slice(-8);
  })();

  const topChartData = metricas.slice(0, 10).map(m => ({
    post: m.id_post ? m.id_post.slice(-6) : `#${m.id}`,
    score: m.score_performance,
    impressoes: m.impressoes,
  }));

  if (loading) return (
    <Layout>
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">

        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-5 rounded-full" style={{ background: ACCENT }} />
              <h1 className="text-lg font-bold text-foreground">Métricas</h1>
              <span className="text-muted-foreground text-lg">/</span>
              <span className="text-sm text-muted-foreground font-medium">Performance</span>
            </div>
            <p className="text-xs text-muted-foreground pl-3">LinkedIn · {metricas.length} registros analisados</p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold"
            style={{ background: ACCENT + '15', borderColor: ACCENT + '40', color: ACCENT }}
          >
            <Star className="w-4 h-4" />
            Score Médio: {avgScore}
          </div>
        </div>

        {/* ── KPI Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: ACCENT },
            { label: 'Views', value: totalViews.toLocaleString('pt-BR'), icon: Eye, color: BLUE },
            { label: 'Likes', value: totalLikes.toLocaleString('pt-BR'), icon: Heart, color: RED },
            { label: 'Comentários', value: totalComments.toLocaleString('pt-BR'), icon: MessageSquare, color: GREEN },
            { label: 'Compartilhos', value: totalShares.toLocaleString('pt-BR'), icon: Share2, color: PURPLE },
            { label: 'Cliques Perfil', value: totalCliques.toLocaleString('pt-BR'), icon: MousePointer, color: CYAN },
            { label: 'CTR', value: `${ctr}%`, icon: TrendingUp, color: BLUE },
            { label: 'Engajamento', value: `${engajamento}%`, icon: TrendingUp, color: GREEN },
          ].map(kpi => (
            <div
              key={kpi.label}
              className="bg-card rounded-xl border border-border p-3 relative overflow-hidden"
              style={{ borderTop: `3px solid ${kpi.color}` }}
            >
              <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ background: `radial-gradient(circle at 80% 20%, ${kpi.color}, transparent 70%)` }}
              />
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${kpi.color}20` }}>
                  <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground leading-none">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* ── Funil de Tráfego + Timeline ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Funil de Tráfego */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-foreground">Funil de Tráfego</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Fluxo de engajamento por estágio</p>
            </div>
            {metricas.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Sem dados</div>
            ) : (
              <TrafficFunnel metricas={metricas} />
            )}

            {/* Mini summary */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
              {[
                { label: 'Taxa de Views', value: totalImpressions > 0 ? `${(totalViews / totalImpressions * 100).toFixed(1)}%` : '—', color: BLUE },
                { label: 'CTR', value: `${ctr}%`, color: PURPLE },
                { label: 'Engajamento', value: `${engajamento}%`, color: GREEN },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
                  <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Linha do Tempo</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Impressões e likes por mês</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded inline-block" style={{ background: ACCENT }} /> Impressões
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 rounded inline-block" style={{ background: BLUE }} /> Likes
                </span>
              </div>
            </div>
            {timelineData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados históricos</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timelineData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gImpM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLikesM" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="impressoes" name="Impressões" stroke={ACCENT} fill="url(#gImpM)" strokeWidth={2.5} dot={false} />
                  <Area type="monotone" dataKey="likes" name="Likes" stroke={BLUE} fill="url(#gLikesM)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Top Posts Score + Tabela ───────────────────────── */}
        {topChartData.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-foreground">Top Posts por Score</h2>
              <p className="text-xs text-muted-foreground mt-0.5">10 posts com maior performance</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topChartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="post" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="score" name="Score" fill={ACCENT} radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="impressoes" name="Impressões" fill={BLUE + '60'} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Tabela Detalhada ───────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Detalhamento dos Posts</h3>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: ACCENT + '20', color: ACCENT }}
            >
              {metricas.length} registros
            </span>
          </div>
          {metricas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Nenhuma métrica registrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Post', 'Assunto', 'Impressões', 'Views', 'Likes', 'Coment.', 'Score', 'Top'].map(h => (
                      <th
                        key={h}
                        className={`px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${['Impressões', 'Views', 'Likes', 'Coment.', 'Score'].includes(h) ? 'text-right' : h === 'Top' ? 'text-center' : 'text-left'}`}
                      >{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricas.map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{m.id_post ?? `#${m.id}`}</td>
                      <td className="px-4 py-2.5 text-xs text-foreground max-w-[160px] truncate">{m.assunto ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.impressoes.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.views.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.likes.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{m.comentarios.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: m.score_performance >= 70 ? GREEN + '20' : m.score_performance >= 40 ? ACCENT + '20' : RED + '20',
                            color: m.score_performance >= 70 ? GREEN : m.score_performance >= 40 ? ACCENT : RED,
                          }}
                        >
                          {m.score_performance}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {m.top_conteudo
                          ? <Star className="w-4 h-4 mx-auto" style={{ color: ACCENT }} />
                          : <span className="text-muted-foreground/40">—</span>
                        }
                      </td>
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
