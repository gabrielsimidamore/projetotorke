import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FolderKanban,
  Loader2,
  Target,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import {
  supabase,
  type Atividade,
  type CustoProjeto,
  type Projeto,
  type ProjetoIdeia,
  type ProjetoMetrica,
  type Tarefa,
} from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_LABELS: Record<Projeto['status'], string> = {
  prospeccao: 'Prospecção',
  proposta_enviada: 'Proposta Enviada',
  em_negociacao: 'Em Negociação',
  aprovado: 'Aprovado',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
  perdido: 'Perdido',
};

const TAREFA_LABELS: Record<Tarefa['status'], string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  em_execucao: 'Em execução',
  concluuido: 'Concluído',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
} as Record<Tarefa['status'], string>;

const IDEIA_LABELS: Record<ProjetoIdeia['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  aprovado: 'Aprovado',
  descartado: 'Descartado',
};

const formatCurrency = (value?: number | null) => (
  value == null ? '—' : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
);

const formatDate = (value?: string | null) => (
  value ? new Date(value).toLocaleDateString('pt-BR') : '—'
);

const getBadgeClass = (status?: string | null) => {
  switch (status) {
    case 'aprovado':
    case 'concluido':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'em_execucao':
    case 'em_negociacao':
    case 'em_andamento':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'proposta_enviada':
    case 'em_analise':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    case 'pendente':
    case 'prospeccao':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'perdido':
    case 'cancelado':
    case 'descartado':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

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
  const [atividades, setAtividades] = useState<Atividade[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const projetoQuery = await supabase
        .from('projetos')
        .select('*, clientes(nome, empresa)')
        .eq('id', id)
        .maybeSingle();

      if (projetoQuery.error) {
        toast({
          title: 'Erro ao carregar projeto',
          description: projetoQuery.error.message,
          variant: 'destructive',
        });
        setProjeto(null);
        setLoading(false);
        return;
      }

      setProjeto(projetoQuery.data ?? null);

      const [tarefasQuery, custosQuery, metricasQuery, ideiasQuery, atividadesQuery] = await Promise.all([
        supabase.from('tarefas').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
        supabase.from('custos_projeto').select('*').eq('projeto_id', id).order('data', { ascending: false }),
        supabase.from('projeto_metricas').select('*').eq('projeto_id', id).order('data', { ascending: false }),
        supabase.from('projeto_ideias').select('*').eq('projeto_id', id).order('created_at', { ascending: false }),
        supabase.from('atividades').select('*').eq('entidade_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      setTarefas(tarefasQuery.data ?? []);
      setCustos(custosQuery.data ?? []);
      setMetricas(metricasQuery.data ?? []);
      setIdeias(ideiasQuery.data ?? []);
      setAtividades(atividadesQuery.data ?? []);
      setLoading(false);
    };

    void loadData();
  }, [id, toast]);

  const resumo = useMemo(() => {
    const receitas = custos
      .filter((item) => item.tipo === 'receita')
      .reduce((total, item) => total + Number(item.valor ?? 0), 0);

    const despesas = custos
      .filter((item) => item.tipo === 'despesa')
      .reduce((total, item) => total + Number(item.valor ?? 0), 0);

    const concluidas = tarefas.filter((item) => item.status === 'concluido').length;

    return {
      receitas,
      despesas,
      saldo: receitas - despesas,
      concluidas,
      percentualConclusao: tarefas.length > 0 ? Math.round((concluidas / tarefas.length) * 100) : 0,
    };
  }, [custos, tarefas]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!projeto) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <h1 className="text-2xl font-bold">Projeto não encontrado</h1>
          <p className="text-muted-foreground">O item pode ter sido removido ou o link informado não existe mais.</p>
          <Button onClick={() => navigate('/projetos')} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para projetos
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/projetos')} className="gap-2 w-fit">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{projeto.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {projeto.empresa || projeto.clientes?.empresa || projeto.clientes?.nome || 'Projeto sem empresa vinculada'}
              </p>
            </div>
          </div>

          <Badge className={getBadgeClass(projeto.status)}>
            {STATUS_LABELS[projeto.status] ?? projeto.status}
          </Badge>
        </div>

        <Card className="overflow-hidden">
          <div
            className="h-28 w-full flex items-center justify-center"
            style={{ backgroundColor: projeto.foto_url ? undefined : (projeto.cor || '#6366f1') }}
          >
            {projeto.foto_url ? (
              <img src={projeto.foto_url} alt={projeto.nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold text-white/30 select-none">{projeto.nome.charAt(0)}</span>
            )}
          </div>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Valor estimado</p>
                    <p className="text-lg font-semibold">{formatCurrency(projeto.valor_estimado)}</p>
                  </div>
                  <CircleDollarSign className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tarefas concluídas</p>
                    <p className="text-lg font-semibold">{resumo.concluidas}/{tarefas.length}</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo do projeto</p>
                    <p className="text-lg font-semibold">{formatCurrency(resumo.saldo)}</p>
                  </div>
                  <Target className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão de fechamento</p>
                    <p className="text-lg font-semibold">{formatDate(projeto.data_fechamento_prevista)}</p>
                  </div>
                  <CalendarDays className="w-5 h-5 text-primary" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted/60 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                  {projeto.descricao || 'Nenhuma descrição cadastrada para este projeto.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/60 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Dados rápidos</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Responsável</span>
                    <p className="font-medium">{projeto.responsavel || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cliente</span>
                    <p className="font-medium">{projeto.clientes?.nome || '—'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Criado em</span>
                    <p className="font-medium">{formatDate(projeto.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última atualização</span>
                    <p className="font-medium">{formatDate(projeto.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="tarefas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 gap-1">
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="ideias">Ideias</TabsTrigger>
            <TabsTrigger value="atividade">Atividade</TabsTrigger>
          </TabsList>

          <TabsContent value="tarefas">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tarefas do projeto</CardTitle>
                <CardDescription>Acompanhe o andamento operacional do projeto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {tarefas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada até o momento.</p>
                ) : (
                  tarefas.map((tarefa) => (
                    <div key={tarefa.id} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{tarefa.titulo}</p>
                          {tarefa.descricao && (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{tarefa.descricao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getBadgeClass(tarefa.status)}>{TAREFA_LABELS[tarefa.status]}</Badge>
                          <Badge variant="outline" className="capitalize">{tarefa.prioridade}</Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>Responsável: {tarefa.responsavel || '—'}</span>
                        <span>Prevista: {formatDate(tarefa.data_prevista)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Receitas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(resumo.receitas)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Despesas</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(resumo.despesas)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Saldo</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{formatCurrency(resumo.saldo)}</p></CardContent>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Lançamentos</CardTitle>
                <CardDescription>Despesas e receitas registradas para o projeto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {custos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum lançamento financeiro encontrado.</p>
                ) : (
                  custos.map((item) => (
                    <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border border-border rounded-xl p-4">
                      <div>
                        <p className="font-medium">{item.descricao}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.categoria} • {formatDate(item.data)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getBadgeClass(item.tipo)}>{item.tipo}</Badge>
                        <p className="font-semibold mt-2">{formatCurrency(item.valor)}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metricas">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métricas</CardTitle>
                <CardDescription>Indicadores de desempenho vinculados ao projeto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {metricas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma métrica registrada.</p>
                ) : (
                  metricas.map((metrica) => (
                    <div key={metrica.id} className="border border-border rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FolderKanban className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{metrica.nome}</p>
                          <p className="text-sm text-muted-foreground">Atualizado em {formatDate(metrica.data)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{metrica.valor} {metrica.unidade}</p>
                        <p className="text-xs text-muted-foreground">Meta: {metrica.meta ?? '—'} {metrica.unidade}</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ideias">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ideias do projeto</CardTitle>
                <CardDescription>Banco de ideias e sugestões relacionadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {ideias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma ideia cadastrada ainda.</p>
                ) : (
                  ideias.map((ideia) => (
                    <div key={ideia.id} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium">{ideia.titulo}</p>
                        <Badge className={getBadgeClass(ideia.status)}>{IDEIA_LABELS[ideia.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ideia.descricao || 'Sem detalhes adicionais.'}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atividade">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atividade recente</CardTitle>
                <CardDescription>Últimos registros e movimentações desse projeto.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {atividades.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem atividades registradas até o momento.</p>
                ) : (
                  atividades.map((atividade) => (
                    <div key={atividade.id} className="border-l-2 border-primary pl-4 py-1">
                      <p className="text-sm font-medium">{atividade.acao}</p>
                      <p className="text-sm text-muted-foreground">{atividade.descricao || 'Sem descrição adicional.'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {atividade.usuario_email || 'Sistema'} • {formatDate(atividade.created_at)}
                      </p>
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
