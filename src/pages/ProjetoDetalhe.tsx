import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, CircleDollarSign,
  Loader2, Plus, Save, Target, Trash2, Users, MessageSquare,
  Building2, Phone, Mail, Calendar, Pencil, Palette,
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
  resolvido: 'Resolvido', respondido: 'Respondido', aprovado: 'Aprovado',
  concluido: 'Concluído', em_executar: 'Em Executar',
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

  // Interações management
  const [intDateFrom, setIntDateFrom] = useState('');
  const [intDateTo, setIntDateTo] = useState('');
  const [deletingIntId, setDeletingIntId] = useState<string | null>(null);
  const [editInteracao, setEditInteracao] = useState<any | null>(null);
  const [savingEditInt, setSavingEditInt] = useState(false);

  const interacoesFiltradas = interacoes.filter(int => {
    if (intDateFrom && int.data_interacao < intDateFrom) return false;
    if (intDateTo && int.data_interacao > intDateTo + 'T23:59:59') return false;
    return true;
  });

  const [intClienteSelectedId, setIntClienteSelectedId] = useState<string | null>(null);

  const getStatusCalculado = (int: any): 'concluido' | 'em_executar' | 'em_aberto' => {
    if (int.status === 'concluido') return 'concluido';
    const dateField = int.data_proxima_acao || (int.proxima_acao && /^\d{4}-\d{2}-\d{2}/.test(int.proxima_acao) ? int.proxima_acao : null);
    if (!dateField) return 'concluido';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const data = new Date(dateField.substring(0, 10) + 'T00:00:00');
    if (data <= today) return 'concluido';
    if (data.getTime() === tomorrow.getTime()) return 'em_executar';
    return 'em_aberto';
  };

  const interacoesPorCliente = useMemo(() => {
    const map = new Map<string, { clienteId: string; cliente: any; interacoes: any[]; emAberto: number; emExecutar: number; concluido: number }>();
    interacoesFiltradas.forEach(int => {
      const cId = int.cliente_id || 'sem_cliente';
      const sc = getStatusCalculado(int);
      if (!map.has(cId)) {
        map.set(cId, { clienteId: cId, cliente: int.clientes || { id: cId, nome: 'Sem cliente', empresa: '' }, interacoes: [], emAberto: 0, emExecutar: 0, concluido: 0 });
      }
      const entry = map.get(cId)!;
      entry.interacoes.push(int);
      if (sc === 'em_aberto') entry.emAberto++;
      else if (sc === 'em_executar') entry.emExecutar++;
      else entry.concluido++;
    });
    return Array.from(map.values()).filter(e => e.interacoes.length > 0);
  }, [interacoesFiltradas]);

  const intMetrics = useMemo(() => {
    let concluido = 0, emAberto = 0, emExecutar = 0;
    interacoes.forEach(i => {
      const sc = getStatusCalculado(i);
      if (sc === 'concluido') concluido++;
      else if (sc === 'em_executar') emExecutar++;
      else emAberto++;
    });
    return { concluido, emAberto, emExecutar };
  }, [interacoes]);

  const intDrawerData = useMemo(() =>
    intClienteSelectedId ? (interacoesPorCliente.find(e => e.clienteId === intClienteSelectedId) ?? null) : null,
    [intClienteSelectedId, interacoesPorCliente]
  );

  const handleDeleteInteracao = async (intId: string) => {
    setDeletingIntId(intId);
    const { error } = await supabase.from('interacoes').delete().eq('id', intId);
    setDeletingIntId(null);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setInteracoes(prev => prev.filter(i => i.id !== intId));
    toast({ title: 'Interação removida' });
  };

  const handleCompleteInteracao = async (intId: string) => {
    const { error } = await supabase.from('interacoes').update({ status: 'concluido' }).eq('id', intId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setInteracoes(prev => prev.map(i => i.id === intId ? { ...i, status: 'concluido' } : i));
    toast({ title: 'Concluída!' });
  };

  const handleUpdateInteracao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInteracao) return;
    setSavingEditInt(true);
    // Auto-compute status based on proxima_acao date
    let newStatus = editInteracao.status;
    if (editInteracao.data_proxima_acao && newStatus !== 'concluido') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (new Date(editInteracao.data_proxima_acao + 'T00:00:00') <= today) newStatus = 'concluido';
    }
    const { error } = await supabase.from('interacoes').update({
      mensagem: editInteracao.mensagem, status: newStatus,
      canal: editInteracao.canal, data_proxima_acao: editInteracao.data_proxima_acao || null,
    }).eq('id', editInteracao.id);
    setSavingEditInt(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setInteracoes(prev => prev.map(i => i.id === editInteracao.id ? { ...i, ...editInteracao, status: newStatus } : i));
    toast({ title: 'Interação atualizada!' });
    setEditInteracao(null);
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

  // Novo cliente
  const [clienteDialog, setClienteDialog] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    nome: '', empresa: '', telefone: '', email: '',
    segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '',
  });
  const [deletingClienteId, setDeletingClienteId] = useState<string | null>(null);

  const handleAddCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingCliente(true);
    const { error } = await supabase.from('clientes').insert({
      ...clienteForm, projeto_id: id,
      empresa: clienteForm.empresa || null, telefone: clienteForm.telefone || null,
      email: clienteForm.email || null, segmento: clienteForm.segmento || null,
      cargo: clienteForm.cargo || null, cidade: clienteForm.cidade || null,
      estado: clienteForm.estado || null, cnpj: clienteForm.cnpj || null,
      observacoes: clienteForm.observacoes || null,
    });
    setSavingCliente(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Cliente adicionado!' });
    setClienteForm({ nome: '', empresa: '', telefone: '', email: '', segmento: '', cargo: '', cidade: '', estado: '', cnpj: '', observacoes: '' });
    setClienteDialog(false);
    void loadData();
  };

  const handleDeleteCliente = async (clienteId: string) => {
    setDeletingClienteId(clienteId);
    const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
    setDeletingClienteId(null);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setClientes(prev => prev.filter(c => c.id !== clienteId));
    toast({ title: 'Cliente removido' });
  };

  // Personalização de cor
  const [customizarDialog, setCustomizarDialog] = useState(false);
  const [customCor, setCustomCor] = useState('#6366f1');
  const [savingCor, setSavingCor] = useState(false);

  const COR_PRESETS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4',
    '#84cc16','#a855f7','#f43f5e','#10b981','#0ea5e9',
    '#1d4ed8','#15803d','#b45309','#9f1239','#1e1b4b',
  ];

  const handleSaveCor = async () => {
    if (!id) return;
    setSavingCor(true);
    const { error } = await supabase.from('projetos').update({ cor: customCor, updated_at: new Date().toISOString() }).eq('id', id);
    setSavingCor(false);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    setProjeto(prev => prev ? { ...prev, cor: customCor } : prev);
    setProject({ color: customCor, name: projeto?.nome ?? '' });
    toast({ title: 'Cor atualizada!' });
    setCustomizarDialog(false);
  };

  const accentColor = projeto?.cor || '#6366f1';

  const loadData = async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const projetoQuery = await supabase
      .from('projetos').select('*').eq('id', id).maybeSingle();
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

    // Auto-complete interactions where proxima_acao has passed
    const rawInteracoes = int.data ?? [];
    const today0 = new Date(); today0.setHours(0, 0, 0, 0);
    const overdue = rawInteracoes.filter((ix: any) => {
      const df = ix.data_proxima_acao || (ix.proxima_acao && /^\d{4}-\d{2}-\d{2}/.test(ix.proxima_acao) ? ix.proxima_acao : null);
      return ix.status !== 'concluido' && df && new Date(df.substring(0, 10) + 'T00:00:00') <= today0;
    });
    if (overdue.length > 0) {
      await Promise.all(overdue.map((ix: any) =>
        supabase.from('interacoes').update({ status: 'concluido' }).eq('id', ix.id)
      ));
    }
    setInteracoes(rawInteracoes.map((ix: any) =>
      overdue.find((o: any) => o.id === ix.id) ? { ...ix, status: 'concluido' } : ix
    ));

    setReunioes(reu.data ?? []);

    // Load all clients of this project
    const { data: clientesData } = await supabase.from('clientes').select('*').eq('projeto_id', id).order('nome');
    setClientes(clientesData ?? []);

    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [id]);

  useEffect(() => {
    if (projeto) {
      setProject({ color: projeto.cor || '#6366f1', name: projeto.nome });
      setCustomCor(projeto.cor || '#6366f1');
    }
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
                    {projeto.empresa || clientes[0]?.empresa || clientes[0]?.nome || 'Sem empresa vinculada'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start mt-1">
              <Badge
                style={{ backgroundColor: `${accentColor}20`, color: accentColor, borderColor: `${accentColor}40` }}
              >
                {STATUS_LABELS[projeto.status] ?? projeto.status}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCustomizarDialog(true)}
                className="h-7 gap-1.5 text-xs px-2"
                style={{ borderColor: `${accentColor}60`, color: accentColor }}
              >
                <Palette className="w-3.5 h-3.5" />
                Personalizar
              </Button>
            </div>
          </div>
        </div>

        {/* Customization dialog */}
        <Dialog open={customizarDialog} onOpenChange={setCustomizarDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="w-4 h-4" style={{ color: customCor }} />
                Personalizar Projeto
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              {/* Preview strip */}
              <div
                className="h-8 rounded-lg w-full transition-colors duration-200"
                style={{ background: `linear-gradient(90deg, ${customCor}, ${customCor}88)` }}
              />
              {/* Color presets */}
              <div>
                <p className="text-xs text-muted-foreground mb-2.5 font-medium">Cores predefinidas</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {COR_PRESETS.map(cor => (
                    <button
                      key={cor}
                      onClick={() => setCustomCor(cor)}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        backgroundColor: cor,
                        borderColor: customCor === cor ? '#fff' : 'transparent',
                        boxShadow: customCor === cor ? `0 0 0 2px ${cor}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* Custom color input */}
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Cor personalizada</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={customCor}
                    onChange={e => setCustomCor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={customCor}
                    onChange={e => setCustomCor(e.target.value)}
                    placeholder="#6366f1"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <Button onClick={handleSaveCor} disabled={savingCor} className="w-full" style={{ backgroundColor: customCor, borderColor: customCor }}>
                {savingCor && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Aplicar cor
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Concluídas', value: intMetrics.concluido, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
                { label: 'Em Aberto', value: intMetrics.emAberto, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Executar Hoje', value: intMetrics.emExecutar, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              ].map(({ label, value, color, bg }) => (
                <Card key={label} style={{ borderColor: `${accentColor}30` }}>
                  <CardContent className={`p-4 text-center ${bg} rounded-xl`}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Interações por Cliente</CardTitle>
                    <CardDescription>{interacoesPorCliente.length} cliente{interacoesPorCliente.length !== 1 ? 's' : ''} com interações</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/interacoes')} className="gap-1.5 shrink-0 text-xs">
                    <MessageSquare className="w-3.5 h-3.5" />Ver todas
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>De:</span>
                    <Input type="date" value={intDateFrom} onChange={e => setIntDateFrom(e.target.value)} className="h-7 text-xs w-36" />
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>Até:</span>
                    <Input type="date" value={intDateTo} onChange={e => setIntDateTo(e.target.value)} className="h-7 text-xs w-36" />
                  </div>
                  {(intDateFrom || intDateTo) && (
                    <button onClick={() => { setIntDateFrom(''); setIntDateTo(''); }} className="text-xs text-muted-foreground hover:text-foreground">Limpar</button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {interacoesPorCliente.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    {interacoes.length === 0 ? 'Nenhuma interação vinculada.' : 'Nenhuma interação no período.'}
                  </p>
                ) : (
                  interacoesPorCliente.map(entry => (
                    <div
                      key={entry.clienteId}
                      onClick={() => setIntClienteSelectedId(entry.clienteId)}
                      className="border border-border rounded-xl p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-accent/40 transition-colors"
                      style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          {(entry.cliente?.nome || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">{entry.cliente?.nome || 'Sem cliente'}</p>
                          {entry.cliente?.empresa && (
                            <p className="text-xs text-muted-foreground truncate">{entry.cliente.empresa}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {entry.emAberto > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                            {entry.emAberto} aberto
                          </Badge>
                        )}
                        {entry.emExecutar > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                            {entry.emExecutar} hoje
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-medium">{entry.interacoes.length} total</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Client interactions drawer */}
            <Dialog open={!!intClienteSelectedId} onOpenChange={open => { if (!open) setIntClienteSelectedId(null); }}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" style={{ color: accentColor }} />
                    {intDrawerData?.cliente?.nome || 'Cliente'} — Interações
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-2 mt-1">
                  {(intDrawerData?.interacoes ?? []).map(int => {
                    const sc = getStatusCalculado(int);
                    return (
                      <div key={int.id} className="border border-border rounded-xl p-4 group" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">{int.mensagem || 'Sem mensagem'}</p>
                            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                              <span>{CANAL_LABELS[int.canal] || int.canal}</span>
                              <span>·</span>
                              <span>{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</span>
                              {int.data_proxima_acao && (
                                <>
                                  <span>·</span>
                                  <span className={sc === 'em_executar' ? 'text-blue-600 font-medium' : sc === 'em_aberto' ? 'text-amber-600' : ''}>
                                    Próx: {new Date(int.data_proxima_acao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            <Badge className={
                              sc === 'concluido'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : sc === 'em_executar'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            }>
                              {sc === 'concluido' ? 'Concluída' : sc === 'em_executar' ? 'Executar Hoje' : 'Em Aberto'}
                            </Badge>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {sc !== 'concluido' && (
                                <button
                                  onClick={() => handleCompleteInteracao(int.id)}
                                  className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                  Concluir
                                </button>
                              )}
                              <button
                                onClick={() => setEditInteracao({ ...int })}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteInteracao(int.id)}
                                disabled={deletingIntId === int.id}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                              >
                                {deletingIntId === int.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit interaction dialog */}
            <Dialog open={!!editInteracao} onOpenChange={open => { if (!open) setEditInteracao(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Editar Interação</DialogTitle></DialogHeader>
                {editInteracao && (
                  <form onSubmit={handleUpdateInteracao} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editInteracao.status} onValueChange={v => setEditInteracao({ ...editInteracao, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_INTERACAO).map(([v, l]) => <SelectItem key={v} value={v}>{l as string}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Canal</Label>
                      <Select value={editInteracao.canal} onValueChange={v => setEditInteracao({ ...editInteracao, canal: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CANAL_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l as string}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Mensagem</Label>
                      <Textarea value={editInteracao.mensagem || ''} onChange={e => setEditInteracao({ ...editInteracao, mensagem: e.target.value })} rows={3} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data da próxima ação</Label>
                      <Input type="date" value={editInteracao.data_proxima_acao || ''} onChange={e => setEditInteracao({ ...editInteracao, data_proxima_acao: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={savingEditInt} style={{ backgroundColor: accentColor }}>
                      {savingEditInt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ─── CLIENTES ─── */}
          <TabsContent value="clientes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" style={{ color: accentColor }} />
                    Clientes do Projeto
                  </CardTitle>
                  <CardDescription>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}.</CardDescription>
                </div>
                <Dialog open={clienteDialog} onOpenChange={setClienteDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 shrink-0" style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                      <Plus className="w-3.5 h-3.5" />Novo Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
                    <form onSubmit={handleAddCliente} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome *</Label>
                        <Input value={clienteForm.nome} onChange={e => setClienteForm({ ...clienteForm, nome: e.target.value })} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Empresa</Label>
                          <Input value={clienteForm.empresa} onChange={e => setClienteForm({ ...clienteForm, empresa: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cargo</Label>
                          <Input value={clienteForm.cargo} onChange={e => setClienteForm({ ...clienteForm, cargo: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Telefone / WhatsApp</Label>
                          <Input value={clienteForm.telefone} onChange={e => setClienteForm({ ...clienteForm, telefone: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">E-mail</Label>
                          <Input type="email" value={clienteForm.email} onChange={e => setClienteForm({ ...clienteForm, email: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Segmento</Label>
                          <Input value={clienteForm.segmento} onChange={e => setClienteForm({ ...clienteForm, segmento: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">CNPJ</Label>
                          <Input value={clienteForm.cnpj} onChange={e => setClienteForm({ ...clienteForm, cnpj: e.target.value })} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cidade</Label>
                          <Input value={clienteForm.cidade} onChange={e => setClienteForm({ ...clienteForm, cidade: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Estado</Label>
                          <Input value={clienteForm.estado} onChange={e => setClienteForm({ ...clienteForm, estado: e.target.value })} placeholder="SP" maxLength={2} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Observações</Label>
                        <Textarea value={clienteForm.observacoes} onChange={e => setClienteForm({ ...clienteForm, observacoes: e.target.value })} rows={2} />
                      </div>
                      <Button type="submit" className="w-full" disabled={savingCliente} style={{ backgroundColor: accentColor, borderColor: accentColor }}>
                        {savingCliente && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adicionar Cliente
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {clientes.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <p className="text-sm text-muted-foreground">Nenhum cliente neste projeto ainda.</p>
                    <Button size="sm" variant="outline" onClick={() => setClienteDialog(true)} className="gap-1.5">
                      <Plus className="w-3.5 h-3.5" />Adicionar primeiro cliente
                    </Button>
                  </div>
                ) : (
                  clientes.map(cliente => (
                    <div key={cliente.id} className="border border-border rounded-xl p-4 group" style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                            style={{ backgroundColor: accentColor }}
                          >
                            {cliente.nome?.charAt(0) || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{cliente.nome}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Building2 className="w-3 h-3 shrink-0" />
                              {cliente.empresa || '—'}
                              {cliente.cargo && <span>· {cliente.cargo}</span>}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-1.5">
                              {cliente.telefone && (
                                <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                                  <Phone className="w-3 h-3" />{cliente.telefone}
                                </a>
                              )}
                              {cliente.email && (
                                <a href={`mailto:${cliente.email}`}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                  <Mail className="w-3 h-3" />{cliente.email}
                                </a>
                              )}
                              {(cliente.cidade || cliente.segmento) && (
                                <span className="text-xs text-muted-foreground">
                                  {cliente.cidade && `📍 ${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ''}`}
                                  {cliente.segmento && ` · 🏷️ ${cliente.segmento}`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteCliente(cliente.id)}
                          disabled={deletingClienteId === cliente.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-1"
                        >
                          {deletingClienteId === cliente.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
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
