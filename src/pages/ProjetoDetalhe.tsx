import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, CheckCircle2, CircleDollarSign,
  Loader2, Plus, Save, Target, Trash2,
} from 'lucide-react';
import Layout from '@/components/Layout';
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

const formatCurrency = (v?: number | null) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const formatDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('pt-BR') : '—';

const getBadgeClass = (status?: string | null) => {
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
};

const TAREFA_LABELS: Record<string, string> = Object.fromEntries(TAREFA_STATUS.map(s => [s.value, s.label]));

const ProjetoDetalhe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [custos, setCustos] = useState<CustoProjeto[]>([]);
  const [metricas, setMetricas] = useState<ProjetoMetrica[]>([]);
  const [ideias, setIdeias] = useState<ProjetoIdeia[]>([]);

  // Nova tarefa
  const [taskDialog, setTaskDialog] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titulo: '', descricao: '', responsavel: '',
    status: 'pendente', prioridade: 'media', data_prevista: '',
  });

  // Notas
  const [notas, setNotas] = useState('');
  const [savingNotas, setSavingNotas] = useState(false);
  const [notasEdited, setNotasEdited] = useState(false);

  const loadData = async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    const projetoQuery = await supabase
      .from('projetos').select('*, clientes(nome, empresa)').eq('id', id).maybeSingle();
    if (projetoQuery.error) {
      toast({ title: 'Erro ao carregar projeto', description: projetoQuery.error.message, variant: 'destructive' });
      setLoading(false); return;
    }
    setProjeto(projetoQuery.data ?? null);
    setNotas(projetoQuery.data?.observacoes ?? '');

    const [t, c, m, i] = await Promise.all([
      supabase.from('tarefas').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
      supabase.from('custos_projeto').select('*').eq('projeto_id', id).order('data', { ascending: false }),
      supabase.from('projeto_metricas').select('*').eq('projeto_id', id).order('data', { ascending: false }),
      supabase.from('projeto_ideias').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
    ]);
    setTarefas(t.data ?? []);
    setCustos(c.data ?? []);
    setMetricas(m.data ?? []);
    setIdeias(i.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [id]);

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
      projeto_id: id,
      titulo: taskForm.titulo,
      descricao: taskForm.descricao || null,
      responsavel: taskForm.responsavel || null,
      status: taskForm.status,
      prioridade: taskForm.prioridade,
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
        <p className="text-muted-foreground">O item pode ter sido removido ou o link não existe.</p>
        <Button onClick={() => navigate('/projetos')} className="gap-2"><ArrowLeft className="w-4 h-4" />Voltar</Button>
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/projetos')} className="gap-2 w-fit">
              <ArrowLeft className="w-4 h-4" />Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{projeto.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {projeto.empresa || projeto.clientes?.empresa || projeto.clientes?.nome || 'Sem empresa vinculada'}
              </p>
            </div>
          </div>
          <Badge className={`${getBadgeClass(projeto.status)} self-start mt-1`}>
            {STATUS_LABELS[projeto.status] ?? projeto.status}
          </Badge>
        </div>

        {/* Capa + resumo */}
        <Card className="overflow-hidden">
          <div className="h-32 w-full flex items-center justify-center"
            style={{ backgroundColor: projeto.foto_url ? undefined : (projeto.cor || '#6366f1') }}>
            {projeto.foto_url
              ? <img src={projeto.foto_url} alt={projeto.nome} className="w-full h-full object-cover" />
              : <span className="text-6xl font-bold text-white/25 select-none">{projeto.nome.charAt(0)}</span>}
          </div>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Valor estimado', value: formatCurrency(projeto.valor_estimado), icon: CircleDollarSign },
                { label: 'Tarefas', value: `${resumo.concluidas}/${tarefas.length} (${resumo.pct}%)`, icon: CheckCircle2 },
                { label: 'Saldo', value: formatCurrency(resumo.saldo), icon: Target },
                { label: 'Fechamento', value: formatDate(projeto.data_fechamento_prevista), icon: CalendarDays },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-base font-semibold leading-tight mt-0.5">{value}</p>
                    </div>
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
            {projeto.descricao && (
              <div className="p-4 rounded-xl bg-muted/60">
                <p className="text-xs font-medium text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{projeto.descricao}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="tarefas" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto gap-1">
            <TabsTrigger value="tarefas" className="flex-1">Tarefas</TabsTrigger>
            <TabsTrigger value="notas" className="flex-1">Notas</TabsTrigger>
            <TabsTrigger value="financeiro" className="flex-1">Financeiro</TabsTrigger>
            <TabsTrigger value="metricas" className="flex-1">Métricas</TabsTrigger>
            <TabsTrigger value="ideias" className="flex-1">Ideias</TabsTrigger>
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
                    <Button size="sm" className="gap-1.5 shrink-0">
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
                        <Textarea value={taskForm.descricao} onChange={e => setTaskForm({ ...taskForm, descricao: e.target.value })} rows={2} placeholder="Detalhes opcionais..." />
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
                          <Input value={taskForm.responsavel} onChange={e => setTaskForm({ ...taskForm, responsavel: e.target.value })} placeholder="Nome ou email" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Data prevista</Label>
                          <Input type="date" value={taskForm.data_prevista} onChange={e => setTaskForm({ ...taskForm, data_prevista: e.target.value })} />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={savingTask}>
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
                    <div key={tarefa.id} className="border border-border rounded-xl p-4 space-y-2 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{tarefa.titulo}</p>
                          {tarefa.descricao && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">{tarefa.descricao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={getBadgeClass(tarefa.status)}>{TAREFA_LABELS[tarefa.status] ?? tarefa.status}</Badge>
                          <Badge className={getBadgeClass(tarefa.prioridade)} variant="outline">{tarefa.prioridade}</Badge>
                          <button
                            onClick={() => handleDeleteTarefa(tarefa.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

          {/* ─── NOTAS ─── */}
          <TabsContent value="notas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Notas e Observações</CardTitle>
                  <CardDescription>Anote informações importantes, pontos de atenção ou decisões do projeto.</CardDescription>
                </div>
                {notasEdited && (
                  <Button size="sm" onClick={handleSaveNotas} disabled={savingNotas} className="gap-1.5 shrink-0">
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
                  placeholder="Escreva aqui suas anotações, observações, decisões tomadas, pontos de atenção..."
                  className="resize-y text-sm leading-relaxed"
                />
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-muted-foreground">
                    {notasEdited ? 'Alterações não salvas' : 'Salvo automaticamente ao clicar em Salvar'}
                  </p>
                  <Button size="sm" onClick={handleSaveNotas} disabled={savingNotas || !notasEdited} className="gap-1.5">
                    {savingNotas ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar notas
                  </Button>
                </div>
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
                <Card key={label}>
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
                <CardDescription>Despesas e receitas registradas.</CardDescription>
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
                        <Badge className={getBadgeClass(item.tipo)}>{item.tipo}</Badge>
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
                    <div key={m.id} className="border border-border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.nome}</p>
                        <p className="text-xs text-muted-foreground">Atualizado em {formatDate(m.data)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{m.valor} {m.unidade}</p>
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
                    <div key={ideia.id} className="border border-border rounded-xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{ideia.titulo}</p>
                        <Badge className={getBadgeClass(ideia.status ?? 'pendente')}>
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
        </Tabs>
      </div>
    </Layout>
  );
};

export default ProjetoDetalhe;
