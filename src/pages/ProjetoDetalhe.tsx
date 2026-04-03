import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign,
  Loader2, Plus, Save, Target, Trash2, Users, MessageSquare,
  Building2, Phone, Mail, Calendar, Pencil,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useProject } from '@/contexts/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import {
  supabase, type CustoProjeto, type Projeto, type ProjetoIdeia,
  type ProjetoMetrica, type Tarefa,
} from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const STATUS_LABELS: Record<Projeto['status'], string> = {
  prospeccao: 'Prospecção', proposta_enviada: 'Proposta Enviada',
  em_negociacao: 'Em Negociação', aprovado: 'Aprovado',
  em_execucao: 'Em Execução', concluido: 'Concluído', perdido: 'Perdido',
};

const TAREFA_STATUS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'em_execucao', label: 'Em execução' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

const TAREFA_PRIORIDADE = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const REUNIAO_TIPO = ['interna', 'cliente', 'parceiro', 'outro'] as const;
const REUNIAO_STATUS = ['agendada', 'realizada', 'cancelada', 'adiada'] as const;

const formatCurrency = (v?: number | null) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—';

function getBadgeStyle(status?: string | null) {
  switch (status) {
    case 'aprovado': case 'concluido': case 'receita':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'em_execucao': case 'em_negociacao': case 'em_andamento':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'proposta_enviada': case 'em_analise':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    case 'pendente': case 'prospeccao':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'urgente': case 'alta':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'perdido': case 'cancelado': case 'descartado': case 'despesa':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

const TAREFA_LABELS: Record<string, string> = Object.fromEntries(TAREFA_STATUS.map(s => [s.value, s.label]));

const CANAL_LABELS: Record<string, string> = {
  ligacao: 'Ligação', reuniao: 'Reunião', email: 'E-mail',
  whatsapp: 'WhatsApp', visita: 'Visita', outro: 'Outro',
  linkedin: 'LinkedIn', instagram: 'Instagram', presencial: 'Presencial',
};

const STATUS_INTERACAO: Record<string, string> = {
  aberto: 'Aberto', pendente: 'Pendente', aguardando: 'Aguardando',
  resolvido: 'Resolvido', respondido: 'Respondido', aprovado: 'Aprovado', concluido: 'Concluído',
};

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setProject } = useProject();

  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [custos, setCustos] = useState<CustoProjeto[]>([]);
  const [metricas, setMetricas] = useState<ProjetoMetrica[]>([]);
  const [ideias, setIdeias] = useState<ProjetoIdeia[]>([]);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [reunioes, setReunioes] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  // Nova tarefa
  const [taskDialog, setTaskDialog] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: '', descricao: '', responsavel: '',
    status: 'pendente', prioridade: 'media', data_prevista: '',
  });

  // Detalhe/edição de tarefa
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({
    titulo: '', descricao: '', responsavel: '', status: 'pendente', prioridade: 'media', data_prevista: '',
  });
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const openTarefaDetail = (t: Tarefa) => {
    setSelectedTarefa(t);
    setEditTaskForm({
      titulo: t.titulo, descricao: t.descricao ?? '',
      responsavel: t.responsavel ?? '', status: t.status ?? 'pendente',
      prioridade: t.prioridade ?? 'media', data_prevista: t.data_prevista ?? '',
    });
  };

  const handleUpdateTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarefa) return;
    setSavingEditTask(true);
    const { error } = await supabase.from('tarefas').update({
      titulo: editTaskForm.titulo, descricao: editTaskForm.descricao || null,
      responsavel: editTaskForm.responsavel || null, status: editTaskForm.status,
      prioridade: editTaskForm.prioridade, data_prevista: editTaskForm.data_prevista || null,
    }).eq('id', selectedTarefa.id);
    setSavingEditTask(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setTarefas(prev => prev.map(t => t.id === selectedTarefa.id ? {
      ...t,
      titulo: editTaskForm.titulo,
      descricao: editTaskForm.descricao || null,
      responsavel: editTaskForm.responsavel || null,
      status: editTaskForm.status as Tarefa['status'],
      prioridade: editTaskForm.prioridade as Tarefa['prioridade'],
      data_prevista: editTaskForm.data_prevista || null,
    } : t));
    toast({ title: 'Tarefa atualizada!' });
    setSelectedTarefa(null);
  };

  const handleDeleteTarefaFromDetail = async () => {
    if (!selectedTarefa) return;
    setDeletingTask(true);
    const { error } = await supabase.from('tarefas').delete().eq('id', selectedTarefa.id);
    setDeletingTask(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setTarefas(prev => prev.filter(t => t.id !== selectedTarefa.id));
    toast({ title: 'Tarefa removida' });
    setSelectedTarefa(null);
  };

  // Nova reunião
  const [reuniaoDialog, setReuniaoDialog] = useState(false);
  const [savingReuniao, setSavingReuniao] = useState(false);
  const [reuniaoForm, setReuniaoForm] = useState({
    titulo: '', data: '', horario_inicio: '', horario_fim: '',
    local: '', tipo: 'cliente' as typeof REUNIAO_TIPO[number],
    assunto: '', pauta: '', observacoes: '', participantes: '',
    responsavel: '', status: 'agendada' as typeof REUNIAO_STATUS[number],
  });

  // Notas
  const [notas, setNotas] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);
  const [notasEdited, setNotasEdited] = useState(false);

  const accentColor = projeto?.cor || '#6366f1';

  const loadData = async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const projetoQuery = await supabase
      .from('projetos').select('*, clientes(id, nome, empresa, telefone, email, segmento, cargo, cidade, estado)').eq('id', id).maybeSingle();
    if (projetoQuery.error) {
      toast({ title: 'Erro ao carregar projeto', description: projetoQuery.error.message, variant: 'destructive' });
      setLoading(false); return;
    }
    const p = projetoQuery.data;
    setProjeto(p ?? null);
    setNotas(p?.observacoes ?? '');

    const [t, c, m, i, int, reu] = await Promise.all([
      supabase.from('tarefas').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
      supabase.from('custos_projeto').select('*').eq('projeto_id', id).order('data', { ascending: false }),
      supabase.from('projeto_metricas').select('*').eq('projeto_id', id).order('data', { ascending: false }),
      supabase.from('projeto_ideias').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
      supabase.from('interacoes').select('*, clientes(id, nome, empresa, telefone, email)').eq('projeto_id', id).order('data_interacao', { ascending: false }),
      supabase.from('reunioes').select('*').eq('projeto_id', id).order('data', { ascending: false }),
    ]);
    setTarefas(t.data ?? []);
    setCustos(c.data ?? []);
    setMetricas(m.data ?? []);
    setIdeias(i.data ?? []);
    setInteracoes(int.data ?? []);
    setReunioes(reu.data ?? []);

    // If project has a client, load client info
    if (p?.cliente_id) {
      const { data: clienteData } = await supabase.from('clientes').select('*').eq('id', p.cliente_id).single();
      setClientes(clienteData ? [clienteData] : []);
    } else {
      setClientes([]);
    }

    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [id]);

  useEffect(() => {
    if (projeto) setProject({ color: projeto.cor || '#6366f1', name: projeto.nome });
    return () => setProject(null);
  }, [projeto?.id, projeto?.cor, projeto?.nome]);

  const resumo = useMemo(() => {
    const receitas = custos.filter(i => i.tipo === 'receita').reduce((a, i) => a + Number(i.valor ?? 0), 0);
    const despesas = custos.filter(i => i.tipo === 'despesa').reduce((a, i) => a + Number(i.valor ?? 0), 0);
    const concluidas = tarefas.filter(t => t.status === 'concluido').length;
    return { receitas, despesas, saldo: receitas - despesas, concluidas,
      pct: tarefas.length > 0 ? Math.round((concluidas / tarefas.length) * 100) : 0 };
  }, [custos, tarefas]);

  const handleAddTarefa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingTask(true);
    const { error } = await supabase.from('tarefas').insert({
      projeto_id: id, titulo: taskForm.titulo,
      descricao: taskForm.descricao || null, responsavel: taskForm.responsavel || null,
      status: taskForm.status, prioridade: taskForm.prioridade,
      data_prevista: taskForm.data_prevista || null,
    });
    setSavingTask(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Tarefa adicionada!' });
    setTaskForm({ titulo: '', descricao: '', responsavel: '', status: 'pendente', prioridade: 'media', data_prevista: '' });
    setTaskDialog(false);
    void loadData();
  };

  const handleDeleteTarefa = async (tarefaId: string) => {
    const { error } = await supabase.from('tarefas').delete().eq('id', tarefaId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setTarefas(prev => prev.filter(t => t.id !== tarefaId));
    toast({ title: 'Tarefa removida' });
  };

  const handleAddReuniao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingReuniao(true);
    const { error } = await supabase.from('reunioes').insert({
      titulo: reuniaoForm.titulo, data: reuniaoForm.data,
      horario_inicio: reuniaoForm.horario_inicio, horario_fim: reuniaoForm.horario_fim || null,
      local: reuniaoForm.local || null, tipo: reuniaoForm.tipo,
      assunto: reuniaoForm.assunto, pauta: reuniaoForm.pauta || null,
      observacoes: reuniaoForm.observacoes || null,
      participantes: reuniaoForm.participantes ? reuniaoForm.participantes.split(',').map(s => s.trim()).filter(Boolean) : null,
      responsavel: reuniaoForm.responsavel || null,
      status: reuniaoForm.status, projeto_id: id,
    });
    setSavingReuniao(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Reunião adicionada!' });
    setReuniaoForm({ titulo: '', data: '', horario_inicio: '', horario_fim: '', local: '', tipo: 'cliente', assunto: '', pauta: '', observacoes: '', participantes: '', responsavel: '', status: 'agendada' });
    setReuniaoDialog(false);
    void loadData();
  };

  const handleDeleteReuniao = async (reuniaoId: string) => {
    const { error } = await supabase.from('reunioes').delete().eq('id', reuniaoId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setReunioes(prev => prev.filter(r => r.id !== reuniaoId));
    toast({ title: 'Reunião removida' });
  };

  const handleSaveNotas = async () => {
    if (!id) return;
    setSavingNotas(true);
    const { error } = await supabase.from('projetos').update({ observacoes: notas, updated_at: new Date().toISOString() }).eq('id', id);
    setSavingNotas(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return; }
    setNotasEdited(false);
    toast({ title: 'Notas salvas!' });
  };

  if (loading) return (
    <Layout><div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div></Layout>
  );

  if (!projeto) return (
    <Layout>
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h1 className="text-2xl font-bold">Projeto não encontrado</h1>
        <Button onClick={() => navigate('/projetos')} className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      {/* Accent color injected via CSS variable */}
      <style>{`:root { --projeto-accent: ${accentColor}; }`}</style>
      <div className="space-y-6 animate-fade-in">

        {/* Header with accent color strip */}
        <div
          className="rounded-xl overflow-hidden border border-border"
          style={{ borderColor: `${accentColor}40` }}
        >
          {/* Color banner */}
          <div
            className="h-2 w-full"
            style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}88)` }}
          />
          <div className="p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 bg-card">
            <div className="space-y-1.5">
              <Button variant="outline" size="sm" onClick={() => navigate('/projetos')} className="gap-2 w-fit">
                <ArrowLeft className="w-4 h-4" />Voltar
              </Button>
              <div className="flex items-center gap-3">
                {projeto.foto_url ? (
                  <img src={projeto.foto_url} alt={projeto.nome} className="w-10 h-10 rounded-lg object-cover border border-border" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    {projeto.nome.charAt(0)}
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{projeto.nome}</h1>
                  <p className="text-sm text-muted-foreground">
                    {projeto.empresa || projeto.clientes?.empresa || projeto.clientes?.nome || 'Sem empresa vinculada'}
                  </p>
                </div>
              </div>
            </div>
            <Badge
              className="self-start mt-1"
              style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}
            >
              {STATUS_LABELS[projeto.status] ?? projeto.status}
            </Badge>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            { label: 'Valor estimado', value: formatCurrency(projeto.valor_estimado), icon: CircleDollarSign },
            { label: 'Tarefas', value: `${resumo.concluidas}/${tarefas.length} (${resumo.pct}%)`, icon: CheckCircle2 },
            { label: 'Saldo', value: formatCurrency(resumo.saldo), icon: Target },
            { label: 'Fechamento', value: formatDate(projeto.data_fechamento_prevista), icon: CalendarDays },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} style={{ borderColor: `${accentColor}30` }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-base font-semibold leading-tight mt-0.5">{value}</p>
                </div>
                <Icon className="w-5 h-5 shrink-0" style={{ color: accentColor }} />
              </CardContent>
            </Card>
          ))}
        </div>

        {projeto.descricao && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: `${accentColor}08`, borderColor: `${accentColor}30` }}>
            <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{projeto.descricao}</p>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="tarefas" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto gap-1">
            <TabsTrigger value="tarefas" className="flex-1">Tarefas</TabsTrigger>
            <TabsTrigger value="reunioes" className="flex-1">Reuniões</TabsTrigger>
            <TabsTrigger value="interacoes" className="flex-1">Interações</TabsTrigger>
            <TabsTrigger value="clientes" className="flex-1">Clientes</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
            <TabsTrigger value="metricas" className="flex-1">Métricas</TabsTrigger>
            <TabsTrigger value="ideias" className="flex-1">Ideias</TabsTrigger>
            <TabsTrigger value="notas" className="flex-1">Notas</TabsTrigger>
          </TabsList>

          {/* ─── TAREFAS ─── */}
          <TabsContent value="tarefas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Tarefas</CardTitle>
                  <CardDescription>Gerencie o que precisa ser feito.</CardDescription>
                </div>
                <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 shrink-0" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                      <Plus className="w-3.5 h-3.5" />Nova Tarefa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddTarefa} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Título *</Label>
                        <Input value={taskForm.titulo} onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })} required placeholder="O que precisa ser feito?" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Descrição</Label>
                        <Textarea value={taskForm.descricao} onChange={e => setTaskForm({ ...taskForm, descricao: e.target.value })} rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Status</Label>
                          <Select value={taskForm.status} onValueChange={v => setTaskForm({ ...taskForm, status: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{TAREFA_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Prioridade</Label>
                          <Select value={taskForm.prioridade} onValueChange={v => setTaskForm({ ...taskForm, prioridade: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{TAREFA_PRIORIDADE.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Responsável</Label>
                          <Input value={taskForm.responsavel} onChange={e => setTaskForm({ ...taskForm, responsavel: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Data prevista</Label>
                          <Input type="date" value={taskForm.data_prevista} onChange={e => setTaskForm({ ...taskForm, data_prevista: e.target.value })} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={savingTask} style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                        {savingTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adicionar Tarefa
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {tarefas.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
                    <Button size="sm" variant="outline" onClick={() => setTaskDialog(true)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />Adicionar primeira tarefa
                    </Button>
                  </div>
                ) : (
                  tarefas.map(tarefa => (
                    <div
                      key={tarefa.id}
                      onClick={() => openTarefaDetail(tarefa)}
                      className="border border-border rounded-xl p-4 space-y-2 cursor-pointer hover:bg-accent/40 transition-colors"
                      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{tarefa.titulo}</p>
                          {tarefa.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{tarefa.descricao}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getBadgeStyle(tarefa.status)}>{TAREFA_LABELS[tarefa.status] ?? tarefa.status}</Badge>
                          <Badge className={getBadgeStyle(tarefa.prioridade)} variant="outline">{tarefa.prioridade}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        {tarefa.responsavel && <span>👤 {tarefa.responsavel}</span>}
                        {tarefa.data_prevista && <span>📅 {formatDate(tarefa.data_prevista)}</span>}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── TASK DETAIL DIALOG ─── */}
          <Dialog open={!!selectedTarefa} onOpenChange={open => { if (!open) setSelectedTarefa(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Pencil className="w-4 h-4" style={{ color: accentColor }} />
                  Detalhe da Tarefa
                </DialogTitle>
              </DialogHeader>
              {selectedTarefa && (
                <form onSubmit={handleUpdateTarefa} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título *</Label>
                    <Input value={editTaskForm.titulo} onChange={e => setEditTaskForm({ ...editTaskForm, titulo: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={editTaskForm.descricao} onChange={e => setEditTaskForm({ ...editTaskForm, descricao: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editTaskForm.status} onValueChange={v => setEditTaskForm({ ...editTaskForm, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TAREFA_STATUS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Prioridade</Label>
                      <Select value={editTaskForm.prioridade} onValueChange={v => setEditTaskForm({ ...editTaskForm, prioridade: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TAREFA_PRIORIDADE.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Responsável</Label>
                      <Input value={editTaskForm.responsavel} onChange={e => setEditTaskForm({ ...editTaskForm, responsavel: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data prevista</Label>
                      <Input type="date" value={editTaskForm.data_prevista} onChange={e => setEditTaskForm({ ...editTaskForm, data_prevista: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" className="flex-1" disabled={savingEditTask} style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                      {savingEditTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
                    </Button>
                    <Button type="button" variant="destructive" onClick={handleDeleteTarefaFromDetail} disabled={deletingTask} className="gap-1.5">
                      {deletingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* ─── REUNIÕES ─── */}
          <TabsContent value="reunioes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Reuniões do Projeto</CardTitle>
                  <CardDescription>Reuniões vinculadas a este projeto.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate('/reunioes')} className="gap-1.5 shrink-0 text-xs">
                    <Calendar className="w-3.5 h-3.5" />Ver todas
                  </Button>
                  <Dialog open={reuniaoDialog} onOpenChange={setReuniaoDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 shrink-0" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                        <Plus className="w-3.5 h-3.5" />Nova Reunião
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                      <DialogHeader><DialogTitle>Nova Reunião</DialogTitle></DialogHeader>
                      <form onSubmit={handleAddReuniao} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Título *</Label>
                          <Input value={reuniaoForm.titulo} onChange={e => setReuniaoForm({ ...reuniaoForm, titulo: e.target.value })} required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Data *</Label>
                            <Input type="date" value={reuniaoForm.data} onChange={e => setReuniaoForm({ ...reuniaoForm, data: e.target.value })} required />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Horário Início *</Label>
                            <Input type="time" value={reuniaoForm.horario_inicio} onChange={e => setReuniaoForm({ ...reuniaoForm, horario_inicio: e.target.value })} required />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Horário Fim</Label>
                            <Input type="time" value={reuniaoForm.horario_fim} onChange={e => setReuniaoForm({ ...reuniaoForm, horario_fim: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Tipo</Label>
                            <Select value={reuniaoForm.tipo} onValueChange={v => setReuniaoForm({ ...reuniaoForm, tipo: v as typeof REUNIAO_TIPO[number] })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {REUNIAO_TIPO.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Assunto *</Label>
                          <Input value={reuniaoForm.assunto} onChange={e => setReuniaoForm({ ...reuniaoForm, assunto: e.target.value })} required />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Local / Link</Label>
                          <Input value={reuniaoForm.local} onChange={e => setReuniaoForm({ ...reuniaoForm, local: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Participantes (separados por vírgula)</Label>
                          <Input value={reuniaoForm.participantes} onChange={e => setReuniaoForm({ ...reuniaoForm, participantes: e.target.value })} placeholder="João, Maria, Pedro" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Pauta</Label>
                          <Textarea value={reuniaoForm.pauta} onChange={e => setReuniaoForm({ ...reuniaoForm, pauta: e.target.value })} rows={3} />
                        </div>
                        <Button type="submit" className="w-full" disabled={savingReuniao} style={{ backgroundColor: accentColor }}>
                          {savingReuniao && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adicionar Reunião
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {reunioes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma reunião vinculada a este projeto.</p>
                ) : (
                  reunioes.map(r => (
                    <div key={r.id} className="border border-border rounded-xl p-4 group" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{r.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.assunto}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                            <span>📅 {r.data.split('-').reverse().join('/')}</span>
                            <span>🕐 {r.horario_inicio}{r.horario_fim ? ` – ${r.horario_fim}` : ''}</span>
                            {r.local && <span>📍 {r.local}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getBadgeStyle(r.status)}>{r.status}</Badge>
                          <button
                            onClick={() => handleDeleteReuniao(r.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── INTERAÇÕES ─── */}
          <TabsContent value="interacoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Interações do Projeto</CardTitle>
                  <CardDescription>Todas as interações vinculadas a este projeto.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/interacoes')} className="gap-1.5 shrink-0 text-xs">
                  <MessageSquare className="w-3.5 h-3.5" />Ver todas
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {interacoes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma interação vinculada. Ao registrar interações, vincule-as a este projeto.</p>
                ) : (
                  interacoes.map(int => (
                    <div key={int.id} className="border border-border rounded-xl p-4" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground text-sm">{int.clientes?.nome || 'Cliente'}</p>
                            {int.clientes?.empresa && <span className="text-xs text-muted-foreground">{int.clientes.empresa}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{int.mensagem || 'Sem mensagem'}</p>
                          <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                            <span>{CANAL_LABELS[int.canal] || int.canal}</span>
                            <span>·</span>
                            <span>{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <Badge className={getBadgeStyle(int.status)}>
                          {STATUS_INTERACAO[int.status] || int.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── CLIENTES ─── */}
          <TabsContent value="clientes">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: accentColor }} />
                  Cliente Vinculado
                </CardTitle>
                <CardDescription>Cliente associado a este projeto.</CardDescription>
              </CardHeader>
              <CardContent>
                {clientes.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm text-muted-foreground">Nenhum cliente vinculado.</p>
                    <Button size="sm" variant="outline" onClick={() => navigate('/clientes')} className="gap-1.5">
                      <Users className="w-3.5 h-3.5" />Gerenciar clientes
                    </Button>
                  </div>
                ) : (
                  clientes.map(cliente => (
                    <div key={cliente.id} className="border border-border rounded-xl p-5 space-y-4" style={{ borderColor: `${accentColor}40` }}>
                      <div className="flex items-start gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          {cliente.nome?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-lg text-foreground">{cliente.nome}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {cliente.empresa || '—'}
                          </p>
                          {cliente.cargo && <p className="text-xs text-muted-foreground mt-0.5">{cliente.cargo}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {cliente.telefone && (
                          <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                            <Phone className="w-4 h-4 text-green-600 shrink-0" />
                            <span className="text-xs truncate">{cliente.telefone}</span>
                          </a>
                        )}
                        {cliente.email && (
                          <a href={`mailto:${cliente.email}`}
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                            <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs truncate">{cliente.email}</span>
                          </a>
                        )}
                      </div>
                      {(cliente.cidade || cliente.estado || cliente.segmento) && (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {cliente.cidade && <span>📍 {cliente.cidade}{cliente.estado ? `, ${cliente.estado}` : ''}</span>}
                          {cliente.segmento && <span>🏷️ {cliente.segmento}</span>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── FINANCEIRO ─── */}
          <TabsContent value="financeiro">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Receitas', value: formatCurrency(resumo.receitas), cls: 'text-green-600' },
                { label: 'Despesas', value: formatCurrency(resumo.despesas), cls: 'text-red-500' },
                { label: 'Saldo', value: formatCurrency(resumo.saldo), cls: resumo.saldo >= 0 ? 'text-green-600' : 'text-red-500' },
              ].map(({ label, value, cls }) => (
                <Card key={label} style={{ borderColor: `${accentColor}30` }}>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold ${cls}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lançamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {custos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum lançamento financeiro.</p>
                ) : (
                  custos.map(item => (
                    <div key={item.id} className="flex items-center justify-between border border-border rounded-xl p-4">
                      <div>
                        <p className="font-medium">{item.descricao}</p>
                        <p className="text-sm text-muted-foreground">{item.categoria} • {formatDate(item.data)}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={getBadgeStyle(item.tipo)}>{item.tipo}</Badge>
                        <p className="font-semibold mt-1">{formatCurrency(item.valor)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── MÉTRICAS ─── */}
          <TabsContent value="metricas">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métricas</CardTitle>
                <CardDescription>Indicadores de desempenho do projeto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metricas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma métrica registrada.</p>
                ) : (
                  metricas.map(m => (
                    <div key={m.id} className="border border-border rounded-xl p-4 flex items-center justify-between" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                      <div>
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">Atualizado em {formatDate(m.data)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold" style={{ color: accentColor }}>{m.valor} {m.unidade}</p>
                        <p className="text-xs text-muted-foreground">Meta: {m.meta ?? '—'} {m.unidade}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── IDEIAS ─── */}
          <TabsContent value="ideias">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ideias do Projeto</CardTitle>
                <CardDescription>Banco de sugestões e ideias relacionadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ideias.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ideia cadastrada.</p>
                ) : (
                  ideias.map(ideia => (
                    <div key={ideia.id} className="border border-border rounded-xl p-4 space-y-1.5" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{ideia.titulo}</p>
                        <Badge className={getBadgeStyle(ideia.status ?? 'pendente')}>
                          {{ pendente: 'Pendente', em_andamento: 'Em andamento', aprovado: 'Aprovado', descartado: 'Descartado' }[ideia.status ?? 'pendente']}
                        </Badge>
                      </div>
                      {ideia.descricao && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ideia.descricao}</p>}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── NOTAS ─── */}
          <TabsContent value="notas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Notas e Observações</CardTitle>
                  <CardDescription>Anote informações importantes, pontos de atenção ou decisões do projeto.</CardDescription>
                </div>
                {notasEdited && (
                  <Button size="sm" onClick={handleSaveNotas} disabled={savingNotas} className="gap-1.5 shrink-0" style={{ backgroundColor: accentColor }}>
                    {savingNotas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notas}
                  onChange={e => { setNotas(e.target.value); setNotasEdited(true); }}
                  rows={12}
                  placeholder="Escreva aqui suas anotações..."
                  className="resize-y text-sm leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {notasEdited ? 'Alterações não salvas' : 'Notas salvas'}
                  </p>
                  <Button size="sm" onClick={handleSaveNotas} disabled={savingNotas || !notasEdited} className="gap-1.5" style={{ backgroundColor: accentColor }}>
                    {savingNotas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar notas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjetoDetalhe;
