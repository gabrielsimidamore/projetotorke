import { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCheck, Loader2, RefreshCcw } from 'lucide-react';
import Layout from '@/components/Layout';
import { useToast } from '@/hooks/use-toast';
import { supabase, type Notificacao } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const USER_NAMES: Record<string, string> = {
  'gabrielsipinheiro@gmail.com': 'Gabriel Pinheiro',
  'pinheirojunior812@gmail.com': 'Junior Pinheiro',
};
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const TYPE_LABELS: Record<Notificacao['tipo'], string> = {
  tarefa: 'Tarefa',
  projeto: 'Projeto',
  mencao: 'Menção',
};

const getTypeClass = (tipo: Notificacao['tipo']) => {
  switch (tipo) {
    case 'tarefa':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'projeto':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'mencao':
      return 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const formatDateTime = (value: string) => (
  new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
);

const NotificacoesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const userName = user?.email ? USER_NAMES[user.email.toLowerCase()] ?? null : null;

  const buildFallbackNotifications = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const tenDaysAgo = Date.now() - 10 * 86400000;

    const [ideiasQuery, projetosQuery] = await Promise.all([
      supabase
        .from('ideias')
        .select('id, assunto_tema, created_at')
        .eq('status', 'Pendente')
        .lt('created_at', sevenDaysAgo)
        .limit(6),
      supabase
        .from('projetos')
        .select('id, nome, status, updated_at')
        .order('updated_at', { ascending: true })
        .limit(10),
    ]);

    const fallback: Notificacao[] = [];

    (ideiasQuery.data ?? []).forEach((ideia) => {
      fallback.push({
        id: `ideia-${ideia.id}`,
        tipo: 'mencao',
        titulo: 'Ideia aguardando retorno',
        mensagem: `A ideia "${ideia.assunto_tema}" segue pendente há mais de 7 dias.`,
        entidade_tipo: 'ideia',
        entidade_id: String(ideia.id),
        responsavel: null,
        lida: false,
        created_at: ideia.created_at,
      });
    });

    (projetosQuery.data ?? [])
      .filter((projeto) => !['concluido', 'perdido'].includes(projeto.status) && new Date(projeto.updated_at).getTime() < tenDaysAgo)
      .forEach((projeto) => {
        fallback.push({
          id: `projeto-${projeto.id}`,
          tipo: 'projeto',
          titulo: 'Projeto sem atualização recente',
          mensagem: `O projeto "${projeto.nome}" está sem movimentação recente e pode precisar de atenção.`,
          entidade_tipo: 'projeto',
          entidade_id: projeto.id,
          responsavel: null,
          lida: false,
          created_at: projeto.updated_at,
        });
      });

    return fallback.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  };

  const fetchNotifications = async () => {
    setLoading(true);

    let query = supabase
      .from('notificacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Filter by current user: show notifications directed to them OR global (no destinatario)
    if (user?.email) {
      query = query.or(`destinatario_email.is.null,destinatario_email.eq.${user.email.toLowerCase()}`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      const fallback = await buildFallbackNotifications();
      setNotificacoes(fallback);
      setLoading(false);
      return;
    }

    setNotificacoes(data);
    setLoading(false);
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const resumo = useMemo(() => ({
    total: notificacoes.length,
    naoLidas: notificacoes.filter((item) => !item.lida).length,
    importantes: notificacoes.filter((item) => item.tipo !== 'projeto').length,
  }), [notificacoes]);

  const markAsRead = async (id: string) => {
    setNotificacoes((current) => current.map((item) => item.id === id ? { ...item, lida: true } : item));
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    const ids = notificacoes.filter((item) => !item.lida).map((item) => item.id);
    if (ids.length === 0) {
      toast({ title: 'Tudo em dia', description: 'Não há notificações pendentes de leitura.' });
      return;
    }

    setNotificacoes((current) => current.map((item) => ({ ...item, lida: true })));
    await supabase.from('notificacoes').update({ lida: true }).in('id', ids);
    toast({ title: 'Notificações atualizadas' });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              {userName ? `Exibindo notificações de ${userName}` : 'Acompanhe alertas, menções e pendências do workspace.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void fetchNotifications()} className="gap-2">
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => void markAllAsRead()} className="gap-2">
              <CheckCheck className="w-4 h-4" />
              Marcar tudo como lido
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Total</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{resumo.total}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Não lidas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{resumo.naoLidas}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Importantes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{resumo.importantes}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Central de alertas</CardTitle>
            <CardDescription>Lista consolidada de notificações recentes do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BellRing className="w-10 h-10 mx-auto text-muted-foreground" />
                <p className="font-medium">Nenhuma notificação por aqui</p>
                <p className="text-sm text-muted-foreground">Quando houver novos alertas, eles aparecerão nesta página.</p>
              </div>
            ) : (
              notificacoes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void markAsRead(item.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm ${!item.lida ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">{item.titulo}</p>
                        <Badge className={getTypeClass(item.tipo)}>{TYPE_LABELS[item.tipo]}</Badge>
                        {!item.lida && <Badge variant="outline">Nova</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.mensagem || 'Sem detalhes adicionais.'}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.responsavel || 'Sistema'} • {formatDateTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NotificacoesPage;
