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
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

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

const ACCENT = '#F5C518', BLUE = '#5b8dee', GREEN = '#22c55e', RED = '#ef4444', PURPLE = '#a855f7', CYAN = '#06b6d4';

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

const KpiCard = ({ title, raw, icon: Icon, color, glow, trendLabel, trend, fmt }: any) => {
  const animated = useCountUp(raw ?? 0);
  const display = fmt ? fmt(animated) : animated.toLocaleString('pt-BR');
  return (
    <div className={`kpi-card ${glow ?? ''}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="section-label mb-0">{title}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <p className="count-up font-bold text-white" style={{ fontSize: 24, lineHeight: 1.1 }}>{display}</p>
      {trendLabel && (
        <div className="flex items-center gap-1 mt-1.5">
          {trend > 0 ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : trend < 0 ? <ArrowDownRight className="w-3 h-3 text-red-400" /> : <Minus className="w-3 h-3 text-white/30" />}
          <span style={{ fontSize: 10, color: trend > 0 ? '#4ade80' : trend < 0 ? '#f87171' : 'rgba(255,255,255,0.3)' }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

const SLabel = ({ children }: { children: React.ReactNode }) => <span className="section-label">{children}</span>;

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
  const totalViews = metricas.reduce((a, m) => a + (m.views ?? 0), 0);
  const totalComments = metricas.reduce((a, m) => a + (m.comentarios ?? 0), 0);
  const totalShares = metricas.reduce((a, m) => a + (m.compartilhamentos ?? 0), 0);
  const avgScore = metricas.length ? Math.round(metricas.reduce((a, m) => a + (m.score_performance ?? 0), 0) / metricas.length) : 0;
  const engRate = totalImpressions > 0 ? ((totalLikes + totalComments + totalShares) / totalImpressions * 100).toFixed(2) : '0.00';
  const openInteracoes = interacoes.filter(i => i.status === 'aberto' || i.status === 'pendente').length;
  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;
  const topPosts = [...metricas].sort((a, b) => (b.score_performance ?? 0) - (a.score_performance ?? 0)).slice(0, 5);

  const metricasPorMes = (() => {
    const map: Record<string, any> = {};
    metricas.forEach(m => {
      if (!m.data_post) return;
      const key = m.data_post.slice(0, 7);
      const label = new Date(m.data_post + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { mes: label, impressoes: 0, likes: 0, comentarios: 0 };
      map[key].impressoes += m.impressoes ?? 0;
      map[key].likes += m.likes ?? 0;
      map[key].comentarios += m.comentarios ?? 0;
    });
    return Object.values(map).slice(-6);
  })();

  const ideiaStatusData = [
    { name: 'Pendente', value: ideias.filter(i => i.status === 'Pendente').length, color: ACCENT },
    { name: 'Em uso',   value: ideias.filter(i => i.status === 'Em uso').length,   color: BLUE },
    { name: 'Usado',    value: ideias.filter(i => i.status === 'Usado').length,    color: GREEN },
    { name: 'Rejeitado',value: ideias.filter(i => i.status === 'Rejeitado').length,color: RED },
  ].filter(d => d.value > 0);

  const formatoData = (() => {
    const map: Record<string, number> = {};
    metricas.forEach(m => { if (m.formato) map[m.formato] = (map[m.formato] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  })();

  const projetosByStatus = [
    { name: 'Prospecção', value: projetos.filter(p => p.status === 'prospeccao').length, color: ACCENT },
    { name: 'Proposta',   value: projetos.filter(p => p.status === 'proposta_enviada').length, color: BLUE },
    { name: 'Negociação', value: projetos.filter(p => p.status === 'em_negociacao').length, color: PURPLE },
    { name: 'Aprovado',   value: projetos.filter(p => p.status === 'aprovado').length, color: GREEN },
    { name: 'Execução',   value: projetos.filter(p => p.status === 'em_execucao').length, color: CYAN },
    { name: 'Concluído',  value: projetos.filter(p => p.status === 'concluido').length, color: '#10b981' },
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
      <div className="space-y-5 animate-fade-in pb-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-white/40 mt-0.5">Visão geral do CRM Torke Assistem</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>Atualizado agora</span>
          </div>
        </div>

        {/* Row 1 — Main KPIs */}
        <div>
          <SLabel>Visão Geral</SLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-stagger">
            <KpiCard title="Clientes"    raw={clientes.length}   icon={Users}       color={ACCENT}  glow="glass-accent" trend={1}  trendLabel={`${activeClients} ativos`} />
            <KpiCard title="Ideias"      raw={ideias.length}     icon={Lightbulb}   color={BLUE}    glow="glass-blue"   trend={0}  trendLabel={`${ideias.filter(i=>i.status==='Pendente').length} pendentes`} />
            <KpiCard title="Posts"       raw={posts.length}      icon={FileText}    color={PURPLE}  glow="glass-purple" trend={1}  trendLabel={`${posts.filter(p=>p.status_aprovacao==='Aprovado').length} aprovados`} />
            <KpiCard title="Interações"  raw={interacoes.length} icon={MessageSquare} color={CYAN}  glow=""             trend={openInteracoes > 0 ? -1 : 0} trendLabel={`${openInteracoes} em aberto`} />
            <KpiCard title="Projetos"    raw={projetos.length}   icon={BarChart2}   color={GREEN}   glow="glass-green"  trend={0}  trendLabel={`${projetos.filter(p=>p.status==='em_execucao').length} em execução`} />
            <KpiCard title="Score Médio" raw={avgScore}          icon={Star}        color={ACCENT}  glow="glass-accent" trend={avgScore >= 50 ? 1 : -1} trendLabel={`${metricas.filter(m=>m.top_conteudo).length} top posts`} />
          </div>
        </div>

        {/* Row 2 — Engagement KPIs */}
        <div>
          <SLabel>Métricas de Conteúdo</SLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate-stagger">
            <KpiCard title="Impressões"      raw={totalImpressions} icon={Eye}       color={BLUE}   glow="glass-blue" />
            <KpiCard title="Views"           raw={totalViews}       icon={Eye}       color={PURPLE} glow="glass-purple" />
            <KpiCard title="Likes"           raw={totalLikes}       icon={Heart}     color={RED}    glow="glass-red" />
            <KpiCard title="Comentários"     raw={totalComments}    icon={MessageSquare} color={ACCENT} glow="glass-accent" />
            <KpiCard title="Compartilhamentos" raw={totalShares}    icon={Share2}    color={GREEN}  glow="glass-green" />
            <KpiCard title="Taxa Engaj."     raw={0}                icon={Activity}  color={CYAN}   glow="" fmt={() => `${engRate}%`} />
          </div>
        </div>

        {/* Row 3 — Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-4 lg:col-span-2">
            <SLabel>Performance por Mês</SLabel>
            {metricasPorMes.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-white/30 text-xs">Sem dados de métricas</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metricasPorMes} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} /><stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gLik" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={BLUE} stopOpacity={0.3} /><stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="impressoes" name="Impressões" stroke={ACCENT} fill="url(#gImp)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="likes" name="Likes" stroke={BLUE} fill="url(#gLik)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card p-4">
            <SLabel>Ideias por Status</SLabel>
            {ideiaStatusData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-white/30 text-xs">Sem ideias</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={ideiaStatusData} cx="50%" cy="50%" innerRadius={46} outerRadius={68} dataKey="value" strokeWidth={0} paddingAngle={3}>
                      {ideiaStatusData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {ideiaStatusData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                        <span className="text-white/60">{d.name}</span>
                      </div>
                      <span className="font-semibold text-white/80">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Row 4 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <SLabel>Posts por Formato</SLabel>
            {formatoData.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-white/30 text-xs">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={formatoData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Posts" fill={ACCENT} radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="glass-card p-4">
            <SLabel>Pipeline de Projetos</SLabel>
            {projetosByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-44 text-white/30 text-xs">Nenhum projeto</div>
            ) : (
              <div className="space-y-2 mt-1">
                {projetosByStatus.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', width: 80, flexShrink: 0 }}>{s.name}</span>
                    <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div
                        className="h-full rounded-md flex items-center justify-end pr-2 transition-all duration-700"
                        style={{ width: `${Math.max((s.value / Math.max(...projetosByStatus.map(x => x.value), 1)) * 100, 8)}%`, background: `${s.color}33`, borderRight: `2px solid ${s.color}` }}
                      >
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-3 pt-3 flex items-center justify-between text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-white/40">Total</span>
                  <span className="font-bold text-white">{projetos.length} projetos</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 5 — Top Posts + Recomendações + Atividade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <SLabel>Top 5 Posts</SLabel>
            {topPosts.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">Nenhuma métrica</p>
            ) : (
              <div className="space-y-2">
                {topPosts.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0, color: idx === 0 ? ACCENT : 'rgba(255,255,255,0.3)' }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.8)' }} className="truncate">{m.assunto ?? m.id_post ?? '—'}</p>
                      <div className="flex gap-2 mt-0.5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        <span>👁 {(m.impressoes ?? 0).toLocaleString()}</span>
                        <span>❤️ {m.likes ?? 0}</span>
                        <span>💬 {m.comentarios ?? 0}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>{m.score_performance ?? 0}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3 h-3 text-primary" />
              <SLabel>Recomendações IA</SLabel>
            </div>
            {recomendacoes.filter(r => r.status === 'Pendente').length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">Nenhuma pendente</p>
            ) : (
              <div className="space-y-2">
                {recomendacoes.filter(r => r.status === 'Pendente').slice(0, 4).map(rec => (
                  <div key={rec.id} className="p-2.5 rounded-lg" style={{ background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.12)' }}>
                    <span className="status-pending mb-1 inline-flex">{rec.formato_sugerido}</span>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{rec.assunto_sugerido}</p>
                    {rec.horario_sugerido && (
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4 }} className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />{rec.horario_sugerido}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-4">
            <SLabel>Atividade Recente</SLabel>
            {interacoes.length === 0 ? (
              <p className="text-xs text-white/30 text-center py-8">Sem interações</p>
            ) : (
              <div className="space-y-2">
                {openInteracoes > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.08)', borderLeft: '2px solid #ef4444' }}>
                    <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="text-red-300">{openInteracoes} interação{openInteracoes > 1 ? 'ões' : ''} em aberto</span>
                  </div>
                )}
                {interacoes.slice(0, 5).map(int => (
                  <div key={int.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: int.status === 'aberto' || int.status === 'pendente' ? ACCENT : GREEN }} />
                    <div className="min-w-0">
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }} className="line-clamp-2">{int.mensagem}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                        {new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {int.canal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 6 — Full metrics table */}
        {metricas.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <SLabel>Todas as Métricas</SLabel>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{metricas.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full dense-table">
                <thead>
                  <tr>
                    <th className="text-left">Post</th>
                    <th className="text-left">Formato</th>
                    <th className="text-left hidden sm:table-cell">Data</th>
                    <th className="text-right">Impressões</th>
                    <th className="text-right hidden md:table-cell">Views</th>
                    <th className="text-right">Likes</th>
                    <th className="text-right hidden lg:table-cell">Coment.</th>
                    <th className="text-right hidden lg:table-cell">Compart.</th>
                    <th className="text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {metricas.slice(0, 15).map(m => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {m.top_conteudo && <Star className="w-3 h-3 shrink-0" style={{ color: ACCENT }} />}
                          <span className="text-white/75 truncate" style={{ maxWidth: 160 }}>{m.assunto ?? m.id_post ?? '—'}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{m.formato ?? '—'}</span></td>
                      <td className="hidden sm:table-cell text-white/40">
                        {m.data_post ? new Date(m.data_post + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="text-right text-white/70">{(m.impressoes ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right hidden md:table-cell text-white/70">{(m.views ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="text-right text-white/70">{m.likes ?? 0}</td>
                      <td className="text-right hidden lg:table-cell text-white/70">{m.comentarios ?? 0}</td>
                      <td className="text-right hidden lg:table-cell text-white/70">{m.compartilhamentos ?? 0}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(m.score_performance ?? 0, 100)}%`, background: (m.score_performance ?? 0) >= 70 ? GREEN : (m.score_performance ?? 0) >= 40 ? ACCENT : RED }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, width: 24, textAlign: 'right', color: (m.score_performance ?? 0) >= 70 ? '#4ade80' : (m.score_performance ?? 0) >= 40 ? ACCENT : '#f87171' }}>
                            {m.score_performance ?? 0}
                          </span>
                        </div>
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
