import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import {
  Users, Lightbulb, MessageSquare,
  Star, ArrowUpRight, ArrowDownRight,
  Minus, AlertTriangle, FolderKanban, CalendarDays, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

import { STATUS_COLS, CHART_COLORS } from '@/lib/constants';

const { ACCENT, BLUE, GREEN, CYAN, PURPLE } = CHART_COLORS;

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

  const avgScore = metricas.length ? Math.round(metricas.reduce((a, m) => a + (m.score_performance ?? 0), 0) / metricas.length) : 0;
  const openInteracoes = interacoes.filter(i => i.status === 'aberto' || i.status === 'pendente').length;
  const activeClients = clientes.filter(c => (c.status ?? 'ativo') === 'ativo').length;
  const totalPipeline = projetos.filter(p => !['concluido', 'perdido'].includes(p.status)).reduce((a, p) => a + (p.valor_estimado ?? 0), 0);

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

  const projetosByStatus = STATUS_COLS.map(col => ({
    name: col.title,
    value: projetos.filter(p => p.status === col.id).length,
    color: col.color,
    id: col.id,
  })).filter(s => s.value > 0);

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral — todos os projetos</p>
          </div>
          {totalPipeline > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Pipeline: R$ {totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard title="Clientes" raw={clientes.length} icon={Users} color={ACCENT} trend={1} trendLabel={`${activeClients} ativos`} />
          <KpiCard title="Projetos" raw={projetos.length} icon={FolderKanban} color={GREEN} trend={0} trendLabel={`${projetos.filter(p => p.status === 'em_execucao').length} em execução`} />
          <KpiCard title="Ideias" raw={ideias.length} icon={Lightbulb} color={BLUE} trend={0} trendLabel={`${ideias.filter(i => i.status === 'Pendente').length} pendentes`} />
          <KpiCard title="Interações" raw={interacoes.length} icon={MessageSquare} color={CYAN} trend={openInteracoes > 0 ? -1 : 0} trendLabel={`${openInteracoes} em aberto`} />
          <KpiCard title="Reuniões" raw={reunioes.length} icon={CalendarDays} color={PURPLE} trend={0} trendLabel="próximos 7 dias" />
          <KpiCard title="Score Médio" raw={avgScore} icon={Star} color={ACCENT} trend={avgScore >= 50 ? 1 : -1} trendLabel={`${metricas.filter(m => m.top_conteudo).length} top posts`} />
        </div>

        {/* Projetos em destaque */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Projetos</h2>
            <button onClick={() => navigate('/projetos')} className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          {projetos.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
              Nenhum projeto cadastrado
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {projetos.slice(0, 10).map(projeto => {
                const statusCol = STATUS_COLS.find(s => s.id === projeto.status);
                return (
                  <div
                    key={projeto.id}
                    className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                    onClick={() => navigate(`/projetos/${projeto.id}`)}
                  >
                    <div
                      className="h-20 flex items-center justify-center relative"
                      style={{ backgroundColor: projeto.foto_url ? undefined : (projeto.cor || '#6366f1') }}
                    >
                      {projeto.foto_url ? (
                        <img src={projeto.foto_url} alt={projeto.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-white/25 select-none">{projeto.nome.charAt(0)}</span>
                      )}
                      {statusCol && (
                        <span
                          className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: statusCol.color + 'cc' }}
                        >
                          {statusCol.title}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-foreground truncate">{projeto.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {projeto.empresa || projeto.clientes?.nome || '—'}
                      </p>
                      {projeto.valor_estimado != null && (
                        <p className="text-[11px] font-bold mt-0.5" style={{ color: projeto.cor || '#6366f1' }}>
                          R$ {Number(projeto.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Charts row */}
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
            <h3 className="text-sm font-semibold text-foreground mb-3">Pipeline por Status</h3>
            {projetosByStatus.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Nenhum projeto</div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {projetosByStatus.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{s.name}</span>
                    <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                      <div
                        className="h-full rounded flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max((s.value / Math.max(...projetosByStatus.map(x => x.value), 1)) * 100, 12)}%`, background: `${s.color}20`, borderRight: `3px solid ${s.color}` }}
                      >
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: Atividade recente + Próximas reuniões */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Atividade Recente</h3>
              <button onClick={() => navigate('/interacoes')} className="text-xs text-primary hover:underline">Ver todas</button>
            </div>
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
                {interacoes.slice(0, 6).map(int => (
                  <div key={int.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: int.status === 'aberto' || int.status === 'pendente' ? ACCENT : GREEN }} />
                    <div className="min-w-0">
                      <p className="text-xs text-foreground/80 line-clamp-1">{int.clientes?.nome || 'Cliente'} — {int.mensagem || 'Sem mensagem'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(int.data_interacao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {int.canal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Próximas Reuniões (7 dias)</h3>
              <button onClick={() => navigate('/reunioes')} className="text-xs text-primary hover:underline">Ver todas</button>
            </div>
            {reunioes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm gap-2">
                <CalendarDays className="w-8 h-8 text-muted-foreground/30" />
                <p>Nenhuma reunião nos próximos 7 dias</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reunioes.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate('/reunioes')}
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-primary uppercase">
                        {new Date(r.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short' })}
                      </span>
                      <span className="text-sm font-bold text-primary leading-none">
                        {new Date(r.data + 'T00:00:00').getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{r.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{r.horario_inicio}{r.horario_fim ? ` – ${r.horario_fim}` : ''} · {r.assunto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
