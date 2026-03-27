import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, Search, Eye, Trash2, Loader2, ArrowUpDown, Download,
  TrendingUp, ShoppingCart, DollarSign, Users, Package, Calendar,
  Pencil, BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const avatarColor = (name: string) => {
  const colors = ['#e5a700', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};
const initials = (name: string) => name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  aprovado:         { label: 'Aprovado',        cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  em_negociacao:    { label: 'Em negociação',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  proposta_enviada: { label: 'Proposta enviada',cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  perdido:          { label: 'Perdido',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  concluido:        { label: 'Concluído',       cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  aguardando:       { label: 'Aguardando',      cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  cancelado:        { label: 'Cancelado',       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' },
};

const fmtBRL = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

type Pedido = {
  id: string;
  codigo_pedido: string | null;
  cliente_id: string;
  produto_id: string | null;
  data: string | null;
  qtd: number | null;
  data_emissao: string | null;
  data_vencimento: string | null;
  total: number | null;
  desconto_pct: number | null;
  forma_pagamento: string | null;
  prazo: string | null;
  vencimento: string | null;
  status: string | null;
  motivo_perda: string | null;
  observacoes: string | null;
  clientes?: { nome: string; empresa: string } | null;
  produtos?: { codigo: string; descricao: string | null; valor_unit: number | null } | null;
};

const emptyForm = {
  cliente_id: '',
  produto_codigo: '',
  data: '',
  qtd: '',
  valor_unit: '',
  desconto_pct: '',
  forma_pagamento: '',
  prazo: '',
  status: 'em_negociacao',
  observacoes: '',
};

export default function Vendas() {
  const { toast } = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
  const [clientePedidos, setClientePedidos] = useState<Pedido[]>([]);
  const [sortField, setSortField] = useState('data');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const PER_PAGE = 20;

  // Computed total for form
  const computedTotal = useMemo(() => {
    const qty = parseFloat(form.qtd) || 0;
    const unit = parseFloat(form.valor_unit) || 0;
    const disc = parseFloat(form.desconto_pct) || 0;
    const subtotal = qty * unit;
    return subtotal - (subtotal * disc) / 100;
  }, [form.qtd, form.valor_unit, form.desconto_pct]);

  const fetchData = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, clientes(nome, empresa), produtos(codigo, descricao, valor_unit)')
        .order('data', { ascending: false }),
      supabase.from('clientes').select('id, nome, empresa, segmento, telefone, email, status, cidade').order('nome'),
    ]);
    setPedidos(p.data ?? []);
    setClientes(c.data ?? []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  // Metrics
  const metrics = useMemo(() => {
    const valid = pedidos.filter(p => p.status !== 'perdido' && p.status !== 'cancelado');
    const total = valid.reduce((s, p) => s + (p.total ?? 0), 0);
    const unique = new Set(valid.map(p => p.cliente_id)).size;
    const ticket = valid.length > 0 ? total / valid.length : 0;
    return { total, count: pedidos.length, unique, ticket };
  }, [pedidos]);

  const filtered = useMemo(() => {
    let list = pedidos.filter(p => {
      const nome = p.clientes?.nome ?? '';
      const empresa = p.clientes?.empresa ?? '';
      const prod = p.produtos?.codigo ?? '';
      const q = search.toLowerCase();
      const matchS = !search || [nome, empresa, prod, p.codigo_pedido ?? ''].some(f => f.toLowerCase().includes(q));
      const matchSt = statusFilter === 'todos' || p.status === statusFilter;
      return matchS && matchSt;
    });
    list.sort((a, b) => {
      const av = (a as any)[sortField] ?? '';
      const bv = (b as any)[sortField] ?? '';
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [pedidos, search, statusFilter, sortField, sortDir]);

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const toggleSort = (f: string) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.cliente_id) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' });
      return;
    }
    setSaving(true);
    // Find or auto-create produto by codigo
    let produto_id: string | null = null;
    if (form.produto_codigo.trim()) {
      const { data: prod } = await supabase
        .from('produtos')
        .select('id')
        .eq('codigo', form.produto_codigo.trim())
        .maybeSingle();
      if (prod) {
        produto_id = prod.id;
      } else {
        const { data: newProd } = await supabase
          .from('produtos')
          .insert({ codigo: form.produto_codigo.trim(), valor_unit: parseFloat(form.valor_unit) || null })
          .select('id')
          .single();
        if (newProd) produto_id = newProd.id;
      }
    }
    const payload = {
      cliente_id: form.cliente_id,
      produto_id,
      data: form.data || null,
      qtd: form.qtd ? parseInt(form.qtd) : null,
      total: computedTotal || null,
      desconto_pct: form.desconto_pct ? parseFloat(form.desconto_pct) : null,
      forma_pagamento: form.forma_pagamento || null,
      prazo: form.prazo || null,
      status: form.status || null,
      observacoes: form.observacoes || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from('pedidos').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('pedidos').insert(payload));
    }
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: editing ? 'Pedido atualizado!' : 'Pedido criado!' });
    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleEdit = (p: Pedido) => {
    setEditing(p);
    setForm({
      cliente_id: p.cliente_id,
      produto_codigo: p.produtos?.codigo ?? '',
      data: p.data ?? '',
      qtd: p.qtd?.toString() ?? '',
      valor_unit: p.produtos?.valor_unit?.toString() ?? '',
      desconto_pct: p.desconto_pct?.toString() ?? '',
      forma_pagamento: p.forma_pagamento ?? '',
      prazo: p.prazo ?? '',
      status: p.status ?? 'em_negociacao',
      observacoes: p.observacoes ?? '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Pedido removido' }); fetchData(); }
  };

  const handleViewCliente = (clienteId: string) => {
    const cli = clientes.find(c => c.id === clienteId);
    if (!cli) return;
    setSelectedCliente(cli);
    const cp = pedidos.filter(p => p.cliente_id === clienteId);
    setClientePedidos(cp);
    setSheetOpen(true);
  };

  const clienteMetrics = useMemo(() => {
    if (!selectedCliente) return null;
    const valid = clientePedidos.filter(p => p.status !== 'perdido' && p.status !== 'cancelado');
    const total = valid.reduce((s, p) => s + (p.total ?? 0), 0);
    const ticket = valid.length > 0 ? total / valid.length : 0;
    const ultima = clientePedidos.find(p => p.data)?.data ?? null;
    return { total, count: clientePedidos.length, ticket, ultima };
  }, [selectedCliente, clientePedidos]);

  const exportCSV = () => {
    const headers = ['Cliente', 'Empresa', 'Data', 'Produto', 'Qtd', 'Total', 'Desconto%', 'Forma Pgto', 'Status'];
    const rows = filtered.map(p => [
      p.clientes?.nome ?? '', p.clientes?.empresa ?? '', fmtDate(p.data),
      p.produtos?.codigo ?? '', p.qtd ?? '', p.total ?? '',
      p.desconto_pct ?? '', p.forma_pagamento ?? '', p.status ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'vendas.csv'; a.click();
  };

  const clienteNome = clientes.find(c => c.id === form.cliente_id)?.nome ?? '';
  const clienteEmpresa = clientes.find(c => c.id === form.cliente_id)?.empresa ?? '';

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: 'Total em Vendas', value: fmtBRL(metrics.total), color: 'text-yellow-500' },
            { icon: ShoppingCart, label: 'Pedidos', value: metrics.count, color: 'text-blue-500' },
            { icon: TrendingUp, label: 'Ticket Médio', value: fmtBRL(metrics.ticket), color: 'text-green-500' },
            { icon: Users, label: 'Clientes c/ Venda', value: metrics.unique, color: 'text-purple-500' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-card rounded-lg border border-border p-4 flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-lg bg-muted ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Vendas / Pedidos</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} pedidos encontrados</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
              <Download className="w-3.5 h-3.5" />CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Plus className="w-3.5 h-3.5" />Novo Pedido</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-foreground">
                    {editing ? 'Editar Pedido' : 'Novo Pedido'}
                  </DialogTitle>
                </DialogHeader>

                {/* Form — matches the style from the screenshots */}
                <div className="space-y-4 pt-2">
                  {/* Row 1: Cliente / Empresa / Data */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Cliente <span className="text-primary">*</span></Label>
                      <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Empresa</Label>
                      <Input value={clienteEmpresa} readOnly className="bg-muted text-muted-foreground cursor-default" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data <span className="text-primary">*</span></Label>
                      <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                    </div>
                  </div>

                  {/* Row 2: Código Produto / Qtd / Valor Unit */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Código Produto</Label>
                      <Input
                        placeholder="Ex: 238854749"
                        value={form.produto_codigo}
                        onChange={e => setForm({ ...form, produto_codigo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Qtd</Label>
                      <Input
                        type="number" min="1"
                        value={form.qtd}
                        onChange={e => setForm({ ...form, qtd: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Valor Unit R$</Label>
                      <Input
                        type="number" step="0.01" min="0"
                        value={form.valor_unit}
                        onChange={e => setForm({ ...form, valor_unit: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 3: Total / Desconto / Forma de Pagamento */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label>Total R$</Label>
                      <div className="h-9 px-3 rounded-md bg-primary flex items-center">
                        <span className="text-sm font-semibold text-primary-foreground">
                          {fmtBRL(computedTotal)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>% Desconto</Label>
                      <Input
                        type="number" step="0.01" min="0" max="100"
                        placeholder="0"
                        value={form.desconto_pct}
                        onChange={e => setForm({ ...form, desconto_pct: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Forma de Pagamento</Label>
                      <Select value={form.forma_pagamento} onValueChange={v => setForm({ ...form, forma_pagamento: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                          <SelectItem value="transferencia">Transferência</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 4: Prazo / Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prazo</Label>
                      <Input
                        placeholder="30/60/90 dias"
                        value={form.prazo}
                        onChange={e => setForm({ ...form, prazo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="em_negociacao">Em negociação</SelectItem>
                          <SelectItem value="proposta_enviada">Proposta enviada</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="aguardando">Aguardando</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="perdido">Perdido</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Observações */}
                  <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <Textarea
                      placeholder="Escreva suas observações aqui..."
                      rows={3}
                      value={form.observacoes}
                      onChange={e => setForm({ ...form, observacoes: e.target.value })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <Button className="flex-1" onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editing ? 'Salvar' : 'Enviar'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => { setDialogOpen(false); resetForm(); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, produto..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('clientes.nome')}>
                        <span className="flex items-center gap-1">Cliente <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden sm:table-cell">Empresa</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell cursor-pointer" onClick={() => toggleSort('data')}>
                        <span className="flex items-center gap-1">Data <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Produto</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden md:table-cell">Qtd</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort('total')}>
                        <span className="flex items-center gap-1">Total <ArrowUpDown className="w-3 h-3" /></span>
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground hidden lg:table-cell">Forma Pgto</th>
                      <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(p => {
                      const nome = p.clientes?.nome ?? '—';
                      const st = STATUS_CFG[p.status ?? ''] ?? { label: p.status ?? '—', cls: 'bg-gray-100 text-gray-600' };
                      return (
                        <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ background: avatarColor(nome) }}>
                                {initials(nome)}
                              </div>
                              <button
                                onClick={() => handleViewCliente(p.cliente_id)}
                                className="font-medium text-foreground hover:text-primary transition-colors text-left"
                              >
                                {nome}
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground text-xs">{p.clientes?.empresa ?? '—'}</td>
                          <td className="px-3 py-2 hidden md:table-cell text-muted-foreground text-xs">{fmtDate(p.data)}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">
                            {p.produtos ? (
                              <div>
                                <p className="text-xs font-mono text-foreground">{p.produtos.codigo}</p>
                                {p.produtos.descricao && <p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{p.produtos.descricao}</p>}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="px-3 py-2 hidden md:table-cell text-muted-foreground text-xs text-center">{p.qtd ?? '—'}</td>
                          <td className="px-3 py-2 font-semibold text-foreground text-sm">{fmtBRL(p.total)}</td>
                          <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground text-xs capitalize">{p.forma_pagamento?.replace('_', ' ') ?? '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewCliente(p.cliente_id)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginated.length === 0 && (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-muted-foreground">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          Nenhum pedido encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">{page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </>
        )}

        {/* Sheet — Visão detalhada do cliente */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedCliente && (
              <>
                <SheetHeader className="pb-4 border-b border-border">
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: avatarColor(selectedCliente.nome) }}>
                      {initials(selectedCliente.nome)}
                    </div>
                    <div>
                      <p className="text-foreground font-semibold">{selectedCliente.nome}</p>
                      <p className="text-xs text-muted-foreground font-normal">{selectedCliente.empresa}</p>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="vendas" className="mt-5">
                  <TabsList className="w-full">
                    <TabsTrigger value="dados" className="flex-1">Dados</TabsTrigger>
                    <TabsTrigger value="vendas" className="flex-1">Vendas ({clientePedidos.length})</TabsTrigger>
                    <TabsTrigger value="metricas" className="flex-1">Métricas</TabsTrigger>
                  </TabsList>

                  {/* Aba Dados */}
                  <TabsContent value="dados" className="mt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Empresa', selectedCliente.empresa],
                        ['Segmento', selectedCliente.segmento],
                        ['Telefone', selectedCliente.telefone],
                        ['Email', selectedCliente.email],
                        ['Cidade', selectedCliente.cidade],
                        ['Status', selectedCliente.status],
                      ].map(([label, val]) => val && (
                        <div key={label} className="p-3 rounded-lg bg-muted">
                          <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                          <p className="text-sm text-foreground capitalize">{val}</p>
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="gap-1.5 w-full mt-2" onClick={() => {
                      setSheetOpen(false);
                      setTimeout(() => {
                        setForm({ ...emptyForm, cliente_id: selectedCliente.id });
                        setDialogOpen(true);
                      }, 200);
                    }}>
                      <Plus className="w-3.5 h-3.5" />Novo Pedido para este Cliente
                    </Button>
                  </TabsContent>

                  {/* Aba Vendas */}
                  <TabsContent value="vendas" className="mt-4 space-y-3">
                    {clientePedidos.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhum pedido registrado</p>
                        <Button size="sm" className="mt-3 gap-1.5" onClick={() => {
                          setSheetOpen(false);
                          setTimeout(() => {
                            setForm({ ...emptyForm, cliente_id: selectedCliente.id });
                            setDialogOpen(true);
                          }, 200);
                        }}>
                          <Plus className="w-3.5 h-3.5" />Registrar Pedido
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {clientePedidos.map(p => {
                          const st = STATUS_CFG[p.status ?? ''] ?? { label: p.status ?? '—', cls: 'bg-gray-100 text-gray-600' };
                          return (
                            <div key={p.id} className="p-3 rounded-lg border border-border space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">{fmtDate(p.data)}</span>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                              </div>
                              {p.produtos && (
                                <div className="flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs font-mono text-foreground">{p.produtos.codigo}</span>
                                  {p.produtos.descricao && <span className="text-xs text-muted-foreground">— {p.produtos.descricao}</span>}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  {p.qtd && <span>Qtd: <strong className="text-foreground">{p.qtd}</strong></span>}
                                  {p.desconto_pct && <span>Desc: <strong className="text-foreground">{p.desconto_pct}%</strong></span>}
                                  {p.forma_pagamento && <span className="capitalize">{p.forma_pagamento.replace('_', ' ')}</span>}
                                  {p.prazo && <span>{p.prazo}</span>}
                                </div>
                                <span className="text-sm font-bold text-foreground">{fmtBRL(p.total)}</span>
                              </div>
                              {p.observacoes && (
                                <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">{p.observacoes}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Aba Métricas */}
                  <TabsContent value="metricas" className="mt-4 space-y-4">
                    {clienteMetrics && (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { icon: DollarSign, label: 'Total Comprado', value: fmtBRL(clienteMetrics.total), color: 'text-yellow-500' },
                            { icon: ShoppingCart, label: 'Nº de Pedidos', value: clienteMetrics.count, color: 'text-blue-500' },
                            { icon: TrendingUp, label: 'Ticket Médio', value: fmtBRL(clienteMetrics.ticket), color: 'text-green-500' },
                            { icon: Calendar, label: 'Última Compra', value: fmtDate(clienteMetrics.ultima), color: 'text-purple-500' },
                          ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="p-3 rounded-lg bg-muted flex items-start gap-3">
                              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
                              <div>
                                <p className="text-[11px] text-muted-foreground">{label}</p>
                                <p className="text-sm font-bold text-foreground mt-0.5">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Status breakdown */}
                        <div className="p-3 rounded-lg bg-muted space-y-2">
                          <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5" />Distribuição por Status
                          </p>
                          {Object.entries(STATUS_CFG).map(([k, v]) => {
                            const count = clientePedidos.filter(p => p.status === k).length;
                            if (!count) return null;
                            const pct = Math.round((count / clientePedidos.length) * 100);
                            return (
                              <div key={k} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">{v.label}</span>
                                  <span className="text-foreground font-medium">{count} ({pct}%)</span>
                                </div>
                                <div className="h-1.5 bg-background rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Produtos mais comprados */}
                        {clientePedidos.some(p => p.produtos) && (
                          <div className="p-3 rounded-lg bg-muted space-y-2">
                            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5" />Produtos Comprados
                            </p>
                            {Array.from(new Set(clientePedidos.filter(p => p.produtos).map(p => p.produtos!.codigo))).map(cod => {
                              const pedidosProd = clientePedidos.filter(p => p.produtos?.codigo === cod);
                              const totalProd = pedidosProd.reduce((s, p) => s + (p.total ?? 0), 0);
                              return (
                                <div key={cod} className="flex justify-between text-xs">
                                  <span className="font-mono text-foreground">{cod}</span>
                                  <span className="text-muted-foreground">{pedidosProd.length}x · {fmtBRL(totalProd)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
