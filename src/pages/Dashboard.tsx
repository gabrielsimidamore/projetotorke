import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import {
  Users, ArrowUpRight, ArrowDownRight, Minus,
  CalendarDays, TrendingUp, DollarSign, Target,
  Star, Eye, AlertTriangle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { STATUS_COLS, CHART_COLORS } from '@/lib/constants';

const { ACCENT, BLUE, GREEN, CYAN, PURPLE } = CHART_COLORS;
const RED = '#ef4444';

/* ── helpers ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `R$ ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `R$ ${(n / 1_000).toFixed(1)}k`
    : `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

/* ── KPI Card ─────────────────────────────────────────────── */
const KpiCard = ({
  title, value, sub, icon: Icon, color, trend, badge,
}: {
  title: string; value: string; sub?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any; color: string;
  trend?: number; badge?: string;
}) => (
  <div
    className="relative bg-card rounded-xl border border-border p-4 overflow-hidden"
    style={{ borderTop: `3px solid ${color}` }}
  >
    <div
      className="absolute inset-0 opacity-[0.04] pointer-events-none"
      style={{ background: `radial-gradient(circle at 80% 20%, ${color}, transparent 70%)` }}
    />
    <div className="flex items-start justify-between mb-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <p className="text-2xl font-bold text-foreground leading-none mb-1">{value}</p>
    {sub && (
      <div className="flex items-center gap-1 mt-1.5">
        {trend !== undefined && (
          trend > 0
            ? <ArrowUpRight className="w-3 h-3 text-green-500" />
            : trend < 0
            ? <ArrowDownRight className="w-3 h-3 text-red-500" />
            : <Minus className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
    )}
    {badge && (
      <span
        className="absolute bottom-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${color}20`, color }}
      >{badge}</span>
    )}
  </div>
);

/* ── Animated number ──────────────────────────────────────── */
const AnimKpi = ({ raw, ...props }: any) => {
  const n = useCountUp(raw ?? 0);
  return <KpiCard {...props} value={props.fmtFn ? props.fmtFn(n) : n.toLocaleString('pt-BR')} />;
};

/* ── Tooltip ──────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-2.5 shadow-xl text-xs">
      {label && <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium" style={{ color: p.color }}>
          {p.name}: <span className="text-foreground">{typeof p.value === 'number' ? p.value.toLocaleString('pt-BR') : p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* ── Pipeline Funnel ──────────────────────────────────────── */
const FUNNEL_COLS = [
  { id: 'prospeccao',       label: 'Prospecção',      color: '#e5a700' },
  { id: 'proposta_enviada', label: 'Proposta',         color: '#f59e0b' },
  { id: 'em_negociacao',    label: 'Em Negociação',    color: '#a855f7' },
  { id: 'aprovado',         label: 'Aprovado',         color: '#3b82f6' },
  { id: 'em_execucao',      label: 'Em Execução',      color: '#06b6d4' },
  { id: 'concluido',        label: 'Concluído',        color: '#22c55e' },
];

const PipelineFunnel = ({ projetos }: { projetos: any[] }) => {
  const stages = FUNNEL_COLS.map((s, i) => {
    const count = projetos.filter(p => p.status === s.id).length;
    const valor = projetos.filter(p => p.status === s.id)
      .reduce((a, p) => a + (p.valor_estimado ?? 0), 0);
    const prev = i > 0 ? projetos.filter(p => p.status === FUNNEL_COLS[i - 1].id).length : count;
    const rate = prev > 0 ? Math.round((count / prev) * 100) : 0;
    return { ...s, count, valor, rate };
  });

  const top = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = Math.max((s.count / top) * 100, 4);
        return (
          <div key={s.id} className="flex items-center gap-2">
            {/* label */}
            <span className="text-[11px] text-muted-foreground w-28 shrink-0 text-right truncate">{s.label}</span>
            {/* bar container — centered */}
            <div className="flex-1 flex items-center justify-center h-7">
              <div
                className="h-full rounded flex items-center justify-between px-2.5 transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${s.color}25, ${s.color}40)`,
                  border: `1px solid ${s.color}70`,
                }}
              >
                <span className="text-xs font-bold leading-none" style={{ color: s.color }}>{s.count}</span>
                {s.valor > 0 && (
                  <span className="text-[10px] font-semibold hidden sm:block" style={{ color: s.color + 'cc' }}>
                    {s.valor >= 1000 ? `R$${(s.valor / 1000).toFixed(0)}k` : `R$${s.valor}`}
                  </span>
                )}
              </div>
            </div>
            {/* conversion rate */}
            <span className="text-[11px] w-10 shrink-0 text-right" style={{ color: i > 0 && s.rate < 50 ? RED : i > 0 ? GREEN : 'transparent' }}>
              {i > 0 ? `${s.rate}%` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Donut ring (status breakdown) ───────────────────────── */
const StatusRing = ({ projetos }: { projetos: any[] }) => {
  const data = STATUS_COLS.map(c => ({
    ...c,
    count: projetos.filter(p => p.status === c.id).length,
  })).filter(d => d.count > 0);
  const total = data.reduce((a, d) => a + d.count, 0);

  if (total === 0) return <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>;

  let cum = 0;
  const R = 42, CX = 52, CY = 52, stroke = 12;
  const circ = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={104} height={104} className="shrink-0">
        {data.map((d) => {
          const dash = (d.count / total) * circ;
          const offset = circ - cum * circ / total;
          cum += d.count;
          return (
            <circle
              key={d.id}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${CX} ${CY})`}
              strokeLinecap="round"
            />
          );
        })}
        <text x={CX} y={CY + 5} textAnchor="middle" fill="white" fontSize={13} fontWeight="700">{total}</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 w-full">
        {data.map(d => (
          <div key={d.id} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-[11px] text-muted-foreground truncate">{d.title}</span>
            <span className="text-[11px] font-semibold ml-auto shrink-0" style={{ color: d.color }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Main Dashboard ───────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [ideias, setIdeias] = useState<any[]>([]);
  const [metricas, setMetricas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [today, next7] = useMemo(() => {
    const t = new Date().toISOString().split('T')[0];
    const n = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return [t, n];
  }, []);

  useEffect(() => {
    Promise.all([
      supabase.from('ideias').select('*'),
      supabase.from('metricas').select('*').order('data_post', { ascending: false }),
      supabase.from('clientes').select('*'),
      supabase.from('interacoes').select('*, clientes(nome, empresa)').order('data_interacao', { ascending: false }).limit(20),
      supabase.from('projetos').select('*, clientes(nome, empresa)').order('ordem').limit(100),
      supabase.from('reunioes').select('*').gte('data', today).lte('data', next7).order('data'),
    ]).then(([i, m, c, int, proj, reu]) => {
      setIdeias(i.data ?? []);
      setMetricas(m.data ?? []);
      setClientes(c.data ?? []);
      setInteracoes(int.data ?? []);
      setProjetos(proj.data ?? []);
      setReunioes(reu.data ?? []);
      setLoading(false);
    });
  }, [today, next7]);

  /* ── computed values ──────────────────────────────────── */
  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;
  const openInteracoes = interacoes.filter(i => ['aberto', 'pendente'].includes(i.status)).length;
  const totalPipeline = projetos.filter(p => !['concluido', 'perdido'].includes(p.status))
    .reduce((a, p) => a + (p.valor_estimado ?? 0), 0);
  const totalConcluido = projetos.filter(p => p.status === 'concluido')
    .reduce((a, p) => a + (p.valor_estimado ?? 0), 0);
  const roas = totalPipeline > 0 ? (totalConcluido / totalPipeline) : 0;
  const avgScore = metricas.length
    ? Math.round(metricas.reduce((a, m) => a + (m.score_performance ?? 0), 0) / metricas.length)
    : 0;
  const totalImpressions = metricas.reduce((a, m) => a + (m.impressoes ?? 0), 0);
  const totalCliques = metricas.reduce((a, m) => a + (m.cliques_perfil ?? 0), 0);
  const ctr = totalImpressions > 0 ? ((totalCliques / totalImpressions) * 100).toFixed(2) : '0.00';
  const cpm = totalImpressions > 0 ? ((totalPipeline / totalImpressions) * 1000) : 0;

  /* ── Timeline chart data ──────────────────────────────── */
  const timelineData = (() => {
    const map: Record<string, any> = {};
    metricas.forEach(m => {
      if (!m.data_post) return;
      const key = m.data_post.slice(0, 7);
      const label = new Date(m.data_post + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { mes: label, impressoes: 0, likes: 0, views: 0 };
      map[key].impressoes += m.impressoes ?? 0;
      map[key].likes += m.likes ?? 0;
      map[key].views += m.views ?? 0;
    });
    return Object.values(map).slice(-8);
  })();

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
      <div className="space-y-5 animate-fade-in">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-1 h-5 rounded-full" style={{ background: ACCENT }} />
              <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
              <span className="text-muted-foreground text-lg">/</span>
              <span className="text-sm text-muted-foreground font-medium">Geral</span>
            </div>
            <p className="text-xs text-muted-foreground pl-3">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
          {totalPipeline > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
              style={{ background: ACCENT + '15', borderColor: ACCENT + '40' }}
            >
              <TrendingUp className="w-4 h-4" style={{ color: ACCENT }} />
              <span className="text-sm font-bold" style={{ color: ACCENT }}>
                Pipeline: {fmt(totalPipeline)}
              </span>
            </div>
          )}
        </div>

        {/* ── KPI Row ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AnimKpi
            title="Investimento" raw={totalPipeline} icon={DollarSign} color={ACCENT}
            fmtFn={fmt} sub={`${projetos.filter(p => !['concluido','perdido'].includes(p.status)).length} ativos`} trend={1}
          />
          <AnimKpi
            title="Faturamento" raw={totalConcluido} icon={TrendingUp} color={GREEN}
            fmtFn={fmt} sub={`${projetos.filter(p => p.status === 'concluido').length} concluídos`} trend={totalConcluido > 0 ? 1 : 0}
          />
          <KpiCard
            title="ROAS" value={roas > 0 ? roas.toFixed(2) : '—'} icon={Target} color={BLUE}
            sub="retorno sobre pipeline" trend={roas >= 1 ? 1 : roas > 0 ? 0 : -1}
          />
          <AnimKpi
            title="Clientes" raw={clientes.length} icon={Users} color={CYAN}
            sub={`${activeClients} ativos`} trend={1}
          />
          <KpiCard
            title="CTR" value={`${ctr}%`} icon={Eye} color={PURPLE}
            sub={`${totalImpressions.toLocaleString('pt-BR')} impressões`} trend={parseFloat(ctr) >= 1 ? 1 : 0}
          />
          <AnimKpi
            title="Score Médio" raw={avgScore} icon={Star} color={ACCENT}
            sub={`${metricas.filter(m => m.top_conteudo).length} top posts`}
            trend={avgScore >= 50 ? 1 : -1}
          />
        </div>

        {/* ── Funil + Ring + Métricas rápidas ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pipeline Funnel */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-foreground">Funil de Pipeline</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{projetos.filter(p => p.status !== 'perdido').length} negócios ativos</p>
              </div>
              <button
                onClick={() => navigate('/projetos')}
                className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: ACCENT }}
              >
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {projetos.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Nenhum projeto no pipeline
              </div>
            ) : (
              <>
                {/* header labels */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-muted-foreground w-28 shrink-0 text-right uppercase tracking-wider">Estágio</span>
                  <span className="flex-1 text-center text-[10px] text-muted-foreground uppercase tracking-wider">Volume</span>
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0 text-right uppercase tracking-wider">Taxa</span>
                </div>
                <PipelineFunnel projetos={projetos} />

                {/* Perdidos note */}
                {projetos.filter(p => p.status === 'perdido').length > 0 && (
                  <div
                    className="mt-3 flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: RED + '15', color: RED }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {projetos.filter(p => p.status === 'perdido').length} negócio(s) perdido(s)
                  </div>
                )}
              </>
            )}
          </div>

          {/* Status donut + quick metrics */}
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3">Distribuição</h2>
              <StatusRing projetos={projetos} />
            </div>

            <div className="border-t border-border pt-4 space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métricas de Conteúdo</p>
              {[
                { label: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), color: BLUE },
                { label: 'CTR', value: `${ctr}%`, color: PURPLE },
                { label: 'Score Médio', value: `${avgScore}`, color: ACCENT },
                { label: 'Top Posts', value: `${metricas.filter(m => m.top_conteudo).length}`, color: GREEN },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className="text-xs font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Linha do Tempo ──────────────────────────────── */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Linha do Tempo</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Performance de conteúdo — últimos 8 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ background: ACCENT }} /> Impressões</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ background: BLUE }} /> Likes</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded inline-block" style={{ background: CYAN }} /> Views</span>
            </div>
          </div>

          {timelineData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Sem dados de métricas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={timelineData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLikes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BLUE} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CYAN} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="impressoes" name="Impressões" stroke={ACCENT} fill="url(#gImp)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="likes" name="Likes" stroke={BLUE} fill="url(#gLikes)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="views" name="Views" stroke={CYAN} fill="url(#gViews)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Bottom: Projetos + Reuniões ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Projetos table */}
          <div className="lg:col-span-3 bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Projetos</h3>
              <button onClick={() => navigate('/projetos')} className="text-xs hover:opacity-80 flex items-center gap-1" style={{ color: ACCENT }}>
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {projetos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum projeto</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Projeto</th>
                      <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Cliente</th>
                      <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                      <th className="text-center px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projetos.slice(0, 8).map(p => {
                      const sc = STATUS_COLS.find(s => s.id === p.status);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/projetos/${p.id}`)}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold overflow-hidden"
                                style={{ backgroundColor: p.cor || '#6366f1' }}
                              >
                                {p.foto_url ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" /> : p.nome.charAt(0)}
                              </div>
                              <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">{p.nome}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-muted-foreground hidden sm:table-cell truncate max-w-[100px]">
                            {p.empresa || p.clientes?.nome || '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-xs font-bold" style={{ color: p.cor || ACCENT }}>
                            {p.valor_estimado != null ? fmt(p.valor_estimado) : '—'}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {sc && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: sc.color + '20', color: sc.color }}
                              >
                                {sc.title}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reuniões + Atividade */}
          <div className="lg:col-span-2 space-y-4">

            {/* Próximas reuniões */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Próximas Reuniões</h3>
                <button onClick={() => navigate('/reunioes')} className="text-xs hover:opacity-80" style={{ color: ACCENT }}>Ver todas</button>
              </div>
              {reunioes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs gap-1.5">
                  <CalendarDays className="w-6 h-6 opacity-30" />
                  <span>Nenhuma reunião nos próximos 7 dias</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {reunioes.slice(0, 4).map(r => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer"
                      onClick={() => navigate('/reunioes')}
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex flex-col items-center justify-center shrink-0"
                        style={{ background: ACCENT + '20' }}
                      >
                        <span className="text-[9px] font-bold uppercase" style={{ color: ACCENT }}>
                          {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold leading-none" style={{ color: ACCENT }}>
                          {new Date(r.data + 'T00:00:00').getDate()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{r.titulo}</p>
                        <p className="text-[11px] text-muted-foreground">{r.horario_inicio} · {r.assunto}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Atividade recente */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Atividade Recente</h3>
                <button onClick={() => navigate('/interacoes')} className="text-xs hover:opacity-80" style={{ color: ACCENT }}>Ver todas</button>
              </div>
              {openInteracoes > 0 && (
                <div
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg mb-2"
                  style={{ background: RED + '15', color: RED }}
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {openInteracoes} em aberto
                </div>
              )}
              <div className="space-y-2">
                {interacoes.slice(0, 4).map(int => (
                  <div key={int.id} className="flex items-start gap-2">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{ background: ['aberto', 'pendente'].includes(int.status) ? ACCENT : GREEN }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground/80 truncate">{int.clientes?.nome || 'Cliente'} — {int.mensagem || '—'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {int.canal}
                      </p>
                    </div>
                  </div>
                ))}
                {interacoes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Sem interações recentes</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
