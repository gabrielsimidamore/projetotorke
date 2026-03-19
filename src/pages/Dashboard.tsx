import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Post, type Ideia, type Metrica, type Recomendacao } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Lightbulb, TrendingUp, Eye, Heart, MessageSquare, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [recomendacoes, setRecomendacoes] = useState<Recomendacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [i, p, m, r] = await Promise.all([
        supabase.from('ideias').select('*'),
        supabase.from('posts').select('*'),
        supabase.from('metricas').select('*'),
        supabase.from('recomendacoes').select('*'),
      ]);
      setIdeias(i.data ?? []);
      setPosts(p.data ?? []);
      setMetricas(m.data ?? []);
      setRecomendacoes(r.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const totalLikes = metricas.reduce((a, m) => a + m.likes, 0);
  const totalImpressions = metricas.reduce((a, m) => a + m.impressoes, 0);

  const kpis = [
    { title: 'Ideias', value: ideias.length, icon: Lightbulb, color: 'text-primary' },
    { title: 'Posts', value: posts.length, icon: FileText, color: 'text-accent' },
    { title: 'Impressões', value: totalImpressions.toLocaleString('pt-BR'), icon: Eye, color: 'text-blue-500' },
    { title: 'Likes', value: totalLikes.toLocaleString('pt-BR'), icon: Heart, color: 'text-red-500' },
  ];

  const postStatusData = [
    { name: 'Rascunho', value: posts.filter(p => p.status_aprovacao === 'Rascunho').length },
    { name: 'Aprovado', value: posts.filter(p => p.status_aprovacao === 'Aprovado').length },
    { name: 'Rejeitado', value: posts.filter(p => p.status_aprovacao === 'Rejeitado').length },
  ];

  const ideiaStatusData = [
    { name: 'Pendente', value: ideias.filter(i => i.status === 'Pendente').length },
    { name: 'Em uso', value: ideias.filter(i => i.status === 'Em uso').length },
    { name: 'Usado', value: ideias.filter(i => i.status === 'Usado').length },
  ];

  const pieColors = ['hsl(43, 96%, 56%)', 'hsl(200, 80%, 50%)', 'hsl(160, 84%, 39%)'];

  const topPosts = metricas
    .sort((a, b) => b.score_performance - a.score_performance)
    .slice(0, 5);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral — Automação LinkedIn</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.title} className="kpi-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className={`w-8 h-8 ${kpi.color} opacity-70`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status dos Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={postStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ideias por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={ideiaStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {ideiaStatusData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top 5 Posts por Score</CardTitle>
            </CardHeader>
            <CardContent>
              {topPosts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma métrica registrada</p>
              ) : (
                <div className="space-y-3">
                  {topPosts.map((m, idx) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                      <span className="text-lg font-bold text-primary w-6 text-center">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.assunto ?? m.id_post}</p>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>👁 {m.impressoes}</span>
                          <span>❤️ {m.likes}</span>
                          <span>💬 {m.comentarios}</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary">{m.score_performance}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recomendações Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recomendacoes.filter(r => r.status === 'Pendente').length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma recomendação pendente</p>
              ) : (
                <div className="space-y-3">
                  {recomendacoes.filter(r => r.status === 'Pendente').slice(0, 5).map(rec => (
                    <div key={rec.id} className="p-3 rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{rec.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{rec.formato_sugerido}</span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{rec.assunto_sugerido}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
