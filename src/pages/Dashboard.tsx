import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase, type Cliente, type Interacao, type IdeiaConteudo } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, Lightbulb, CheckCircle, Mail, Phone, Linkedin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const Dashboard = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [ideias, setIdeias] = useState<IdeiaConteudo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [c, i, id] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('interacoes').select('*'),
        supabase.from('ideias_conteudo').select('*'),
      ]);
      setClientes(c.data ?? []);
      setInteracoes(i.data ?? []);
      setIdeias(id.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const channelData = [
    { name: 'Email', value: interacoes.filter(i => i.canal === 'email').length },
    { name: 'WhatsApp', value: interacoes.filter(i => i.canal === 'whatsapp').length },
    { name: 'LinkedIn', value: interacoes.filter(i => i.canal === 'linkedin').length },
  ];

  const contentStatusData = [
    { name: 'Pendente', value: ideias.filter(i => i.status === 'pendente').length },
    { name: 'Aprovado', value: ideias.filter(i => i.status === 'aprovado' || i.status === 'producao').length },
    { name: 'Concluído', value: ideias.filter(i => i.status === 'concluido').length },
  ];

  const pieColors = ['hsl(43, 96%, 56%)', 'hsl(160, 84%, 39%)', 'hsl(222, 47%, 11%)'];

  const kpis = [
    { title: 'Clientes', value: clientes.length, icon: Users, color: 'text-primary' },
    { title: 'Interações', value: interacoes.length, icon: MessageSquare, color: 'text-accent' },
    { title: 'Ideias', value: ideias.length, icon: Lightbulb, color: 'text-accent' },
    { title: 'Concluídos', value: ideias.filter(i => i.status === 'concluido').length, icon: CheckCircle, color: 'text-success' },
  ];

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
          <p className="text-sm text-muted-foreground">Visão geral do seu CRM</p>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Interações por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status de Conteúdo</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={contentStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {contentStatusData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Últimas Interações</CardTitle>
          </CardHeader>
          <CardContent>
            {interacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma interação registrada</p>
            ) : (
              <div className="space-y-3">
                {interacoes.slice(-5).reverse().map((int) => (
                  <div key={int.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    {int.canal === 'email' && <Mail className="w-4 h-4 text-accent shrink-0" />}
                    {int.canal === 'whatsapp' && <Phone className="w-4 h-4 text-success shrink-0" />}
                    {int.canal === 'linkedin' && <Linkedin className="w-4 h-4 text-primary shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{int.mensagem}</p>
                      <p className="text-xs text-muted-foreground">{new Date(int.data_interacao).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${int.status === 'pendente' ? 'status-pending' : 'status-approved'}`}>
                      {int.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
