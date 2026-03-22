import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import {
  Users, FileText, Lightbulb, Eye, Heart, MessageSquare, Sparkles,
  Share2, Star, BarChart2, Activity, ArrowUpRight, ArrowDownRight,
  Minus, AlertTriangle, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const ACCENT = '#e5a700', BLUE = '#3b82f6', GREEN = '#22c55e', RED = '#ef4444', PURPLE = '#a855f7', CYAN = '#06b6d4';

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

const KpiCard = ({ title, raw, icon: Icon, color, trend, trendLabel, fmt }: any) => {
  const animated = useCountUp(raw ?? 0);
  const display = fmt ? fmt(animated) : animated.toLocaleString('pt-BR');
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{display}</p>
      {trendLabel && (
        <div className="flex items-center gap-1 mt-1">
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 text-green-500" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
          <span className="text-xs text-muted-foreground">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
      {label && <p className="text-xs text-muted-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-medium" style={{ color: p.color }}>
          {p.name}: <span className="text-foreground">{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const [ideias, setIdeias] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [recomendacoes, setRecomendacoes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('ideias').select('*'),
      supabase.from('posts').select('*'),
      supabase.from('metricas').select('*').order('data_post', { ascending: false }),
      supabase.from('recomendacoes').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('interacoes').select('*').order('data_interacao', { ascending: false }).limit(20),
      supabase.from('projetos').select('*').limit(100),
    ]).then(([i, p, m, r, c, int, proj]) => {
      setIdeias(i.data ?? []);
      setPosts(p.data ?? []);
      setMetricas(m.data ?? []);
      setRecomendacoes(r.data ?? []);
      setClientes(c.data ?? []);
      setInteracoes(int.data ?? []);
      setProjetos(proj.data ?? []);
      setLoading(false);
    });
  }, []);

  const totalLikes = metricas.reduce((a, m) => a + (m.likes ?? 0), 0);
  const totalImpressions = metricas.reduce((a, m) => a + (m.impressoes ?? 0), 0);
  const totalComments = metricas.reduce((a, m) => a + (m.comentarios ?? 0), 0);
  const totalShares = metricas.reduce((a, m) => a + (m.compartilhamentos ?? 0), 0);
  const avgScore = metricas.length ? Math.round(metricas.reduce((a, m) => a + (m.score_performance ?? 0), 0) / metricas.length) : 0;
  const openInteracoes = interacoes.filter(i => i.status === 'aberto' || i.status === 'pendente').length;
  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;

  const metricasPorMes = (() => {
    const map: Record<string, any> = {};
    metricas.forEach(m => {
      if (!m.data_post) return;
      const key = m.data_post.slice(0, 7);
      const label = new Date(m.data_post + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { mes: label, impressoes: 0, likes: 0 };
      map[key].impressoes += m.impressoes ?? 0;
      map[key].likes += m.likes ?? 0;
    });
    return Object.values(map).slice(-6);
  })();

  const ideiaStatusData = [
    { name: 'Pendente', value: ideias.filter(i => i.status === 'Pendente').length, color: ACCENT },
    { name: 'Em uso', value: ideias.filter(i => i.status === 'Em uso').length, color: BLUE },
    { name: 'Usado', value: ideias.filter(i => i.status === 'Usado').length, color: GREEN },
    { name: 'Rejeitado', value: ideias.filter(i => i.status === 'Rejeitado').length, color: RED },
  ].filter(d => d.value > 0);

  const projetosByStatus = [
    { name: 'Prospecção', value: projetos.filter(p => p.status === 'prospeccao').length, color: ACCENT },
    { name: 'Proposta', value: projetos.filter(p => p.status === 'proposta_enviada').length, color: BLUE },
    { name: 'Negociação', value: projetos.filter(p => p.status === 'em_negociacao').length, color: PURPLE },
    { name: 'Aprovado', value: projetos.filter(p => p.status === 'aprovado').length, color: GREEN },
    { name: 'Execução', value: projetos.filter(p => p.status === 'em_execucao').length, color: CYAN },
    { name: 'Concluído', value: projetos.filter(p => p.status === 'concluido').length, color: '#10b981' },
  ].filter(s => s.value > 0);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do CRM Torke Assistem</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Clientes" raw={clientes.length} icon={Users} color={ACCENT} trend={1} trendLabel={`${activeClients} ativos`} />
          <KpiCard title="Ideias" raw={ideias.length} icon={Lightbulb} color={BLUE} trend={0} trendLabel={`${ideias.filter(i=>i.status==='Pendente').length} pendentes`} />
          <KpiCard title="Posts" raw={posts.length} icon={FileText} color={PURPLE} trend={1} trendLabel={`${posts.filter(p=>p.status_aprovacao==='Aprovado').length} aprovados`} />
          <KpiCard title="Interações" raw={interacoes.length} icon={MessageSquare} color={CYAN} trend={openInteracoes > 0 ? -1 : 0} trendLabel={`${openInteracoes} em aberto`} />
          <KpiCard title="Projetos" raw={projetos.length} icon={BarChart2} color={GREEN} trend={0} trendLabel={`${projetos.filter(p=>p.status==='em_execucao').length} em execução`} />
          <KpiCard title="Score Médio" raw={avgScore} icon={Star} color={ACCENT} trend={avgScore >= 50 ? 1 : -1} trendLabel={`${metricas.filter(m=>m.top_conteudo).length} top posts`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border border-border p-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Performance por Mês</h3>
            {metricasPorMes.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem dados de métricas</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metricasPorMes} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} /><stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="impressoes" name="Impressões" stroke={ACCENT} fill="url(#gImp)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="likes" name="Likes" stroke={BLUE} fill="transparent" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Ideias por Status</h3>
            {ideiaStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Sem ideias</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={ideiaStatusData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" strokeWidth={0} paddingAngle={3}>
                      {ideiaStatusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {ideiaStatusData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline de Projetos</h3>
            {projetosByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-muted-foreground text-sm">Nenhum projeto</div>
            ) : (
              <div className="space-y-2">
                {projetosByStatus.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0">{s.name}</span>
                    <div className="flex-1 h-6 rounded bg-muted overflow-hidden">
                      <div className="h-full rounded flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max((s.value / Math.max(...projetosByStatus.map(x => x.value), 1)) * 100, 12)}%`, background: `${s.color}20`, borderRight: `3px solid ${s.color}` }}>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Atividade Recente</h3>
            {interacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem interações</p>
            ) : (
              <div className="space-y-2">
                {openInteracoes > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-md text-xs bg-destructive/10 border-l-2 border-destructive">
                    <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                    <span className="text-destructive">{openInteracoes} interação{openInteracoes > 1 ? 'ões' : ''} em aberto</span>
                  </div>
                )}
                {interacoes.slice(0, 5).map(int => (
                  <div key={int.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: int.status === 'aberto' || int.status === 'pendente' ? ACCENT : GREEN }} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground/80 line-clamp-2">{int.mensagem || 'Sem mensagem'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {int.canal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {metricas.length > 0 && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Todas as Métricas</h3>
              <span className="text-xs text-muted-foreground">{metricas.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Post</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Impressões</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Likes</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.slice(0, 10).map(m => (
                    <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2 text-foreground">{m.assunto ?? m.id_post ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{(m.impressoes ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2 text-right text-muted-foreground">{m.likes ?? 0}</td>
                      <td className="px-4 py-2 text-right font-semibold" style={{ color: (m.score_performance ?? 0) >= 70 ? GREEN : (m.score_performance ?? 0) >= 40 ? ACCENT : RED }}>
                        {m.score_performance ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
