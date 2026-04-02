import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Plus, ChevronLeft, ChevronRight, Clock, MapPin, Users,
  Pencil, Trash2, Loader2, Calendar, X, FolderKanban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type Reuniao = {
  id: string;
  titulo: string;
  data: string;
  horario_inicio: string;
  horario_fim: string | null;
  local: string | null;
  tipo: 'interna' | 'cliente' | 'parceiro' | 'outro';
  assunto: string;
  pauta: string | null;
  observacoes: string | null;
  participantes: string[] | null;
  responsavel: string | null;
  status: 'agendada' | 'realizada' | 'cancelada' | 'adiada';
  created_at: string;
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const statusConfig = {
  agendada: { label: 'Agendada', color: 'bg-blue-500/15 text-blue-600 border-blue-300' },
  realizada: { label: 'Realizada', color: 'bg-green-500/15 text-green-600 border-green-300' },
  cancelada: { label: 'Cancelada', color: 'bg-red-500/15 text-red-600 border-red-300' },
  adiada: { label: 'Adiada', color: 'bg-yellow-500/15 text-yellow-600 border-yellow-300' },
};

const tipoConfig = {
  interna: { label: 'Interna', color: 'bg-purple-500/15 text-purple-600' },
  cliente: { label: 'Cliente', color: 'bg-blue-500/15 text-blue-600' },
  parceiro: { label: 'Parceiro', color: 'bg-orange-500/15 text-orange-600' },
  outro: { label: 'Outro', color: 'bg-gray-500/15 text-gray-600' },
};

const dotColor = {
  agendada: 'bg-blue-500',
  realizada: 'bg-green-500',
  cancelada: 'bg-red-400',
  adiada: 'bg-yellow-500',
};

const emptyForm = {
  titulo: '',
  data: '',
  horario_inicio: '',
  horario_fim: '',
  local: '',
  tipo: 'interna' as Reuniao['tipo'],
  assunto: '',
  pauta: '',
  observacoes: '',
  participantes: '',
  responsavel: '',
  status: 'agendada' as Reuniao['status'],
  projeto_id: '',
};

export default function Reunioes() {
  const { toast } = useToast();
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [projetos, setProjetos] = useState<{ id: string; nome: string; cor: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projetoFilter, setProjetoFilter] = useState('todos');

  const today = new Date();
  const [calendarDate, setCalendarDate] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reuniao | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReuniao, setSelectedReuniao] = useState<Reuniao | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchReunioes = async () => {
    const [{ data, error }, { data: projData }] = await Promise.all([
      supabase.from('reunioes').select('*, projetos(id, nome, cor)').order('data', { ascending: false }),
      supabase.from('projetos').select('id, nome, cor').order('nome'),
    ]);
    if (!error) setReunioes(data ?? []);
    setProjetos(projData ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchReunioes(); }, []);

  // Map: date string -> reunioes[]
  const reunioesByDate = useMemo(() => {
    const map: Record<string, Reuniao[]> = {};
    for (const r of reunioes) {
      if (!map[r.data]) map[r.data] = [];
      map[r.data].push(r);
    }
    return map;
  }, [reunioes]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = calendarDate;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calendarDate]);

  const dateStr = (day: number) => {
    const { year, month } = calendarDate;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const openNew = (date?: string) => {
    setEditing(null);
    setForm({ ...emptyForm, data: date ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (r: Reuniao) => {
    setEditing(r);
    setForm({
      titulo: r.titulo,
      data: r.data,
      horario_inicio: r.horario_inicio,
      horario_fim: r.horario_fim ?? '',
      local: r.local ?? '',
      tipo: r.tipo,
      assunto: r.assunto,
      pauta: r.pauta ?? '',
      observacoes: r.observacoes ?? '',
      participantes: (r.participantes ?? []).join(', '),
      responsavel: r.responsavel ?? '',
      status: r.status,
    });
    setDialogOpen(true);
  };

  const openDetail = (r: Reuniao) => {
    setSelectedReuniao(r);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.data || !form.horario_inicio || !form.assunto) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      titulo: form.titulo,
      data: form.data,
      horario_inicio: form.horario_inicio,
      horario_fim: form.horario_fim || null,
      local: form.local || null,
      tipo: form.tipo,
      assunto: form.assunto,
      pauta: form.pauta || null,
      observacoes: form.observacoes || null,
      participantes: form.participantes ? form.participantes.split(',').map(s => s.trim()).filter(Boolean) : null,
      responsavel: form.responsavel || null,
      status: form.status,
      projeto_id: form.projeto_id || null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from('reunioes').update(payload).eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('reunioes').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editing ? 'Reunião atualizada!' : 'Reunião criada!' });
      setDialogOpen(false);
      fetchReunioes();
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('reunioes').delete().eq('id', id);
    setDeleting(null);
    if (error) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    } else {
      toast({ title: 'Reunião excluída' });
      setSheetOpen(false);
      fetchReunioes();
    }
  };

  const reunioesFiltradas = useMemo(() => {
    if (projetoFilter === 'todos') return reunioes;
    if (projetoFilter === 'sem_projeto') return reunioes.filter(r => !r.projeto_id);
    return reunioes.filter(r => r.projeto_id === projetoFilter);
  }, [reunioes, projetoFilter]);

  const reunioesDoMes = useMemo(() => {
    const { year, month } = calendarDate;
    return reunioesFiltradas.filter(r => {
      const d = new Date(r.data + 'T00:00:00');
      return d.getFullYear() === year && d.getMonth() === month;
    }).sort((a, b) => a.data.localeCompare(b.data) || a.horario_inicio.localeCompare(b.horario_inicio));
  }, [reunioesFiltradas, calendarDate]);

  const reunioesDoDia = useMemo(() => {
    if (!selectedDate) return [];
    return (reunioesByDate[selectedDate] ?? [])
      .filter(r => projetoFilter === 'todos' || (projetoFilter === 'sem_projeto' ? !r.projeto_id : r.projeto_id === projetoFilter))
      .sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
  }, [selectedDate, reunioesByDate, projetoFilter]);

  const listToShow = selectedDate ? reunioesDoDia : reunioesDoMes;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reuniões</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {reunioes.length} reunião{reunioes.length !== 1 ? 'ões' : ''} no total
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filtro por projeto */}
            <Select value={projetoFilter} onValueChange={setProjetoFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <FolderKanban className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <SelectValue placeholder="Todos projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos projetos</SelectItem>
                <SelectItem value="sem_projeto">Sem projeto</SelectItem>
                {projetos.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.cor || '#6366f1' }} />
                      {p.nome}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openNew()} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Reunião
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Calendar */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCalendarDate(prev => {
                  const d = new Date(prev.year, prev.month - 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-foreground text-sm">
                {MESES[calendarDate.month]} {calendarDate.year}
              </span>
              <button
                onClick={() => setCalendarDate(prev => {
                  const d = new Date(prev.year, prev.month + 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={i} />;
                const ds = dateStr(day);
                const hasReunioes = !!reunioesByDate[ds]?.length;
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                const statuses = reunioesByDate[ds]?.map(r => r.status) ?? [];

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(prev => prev === ds ? null : ds)}
                    className={`
                      relative flex flex-col items-center justify-start pt-1.5 pb-1 rounded-lg min-h-[52px] transition-all text-sm font-medium
                      ${isSelected ? 'bg-primary text-primary-foreground shadow-sm' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'}
                    `}
                  >
                    <span className={`text-[13px] leading-none ${isToday && !isSelected ? 'font-bold' : ''}`}>{day}</span>
                    {hasReunioes && (
                      <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center px-0.5">
                        {statuses.slice(0, 3).map((s, si) => (
                          <span
                            key={si}
                            className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-primary-foreground/70' : dotColor[s]}`}
                          />
                        ))}
                        {statuses.length > 3 && (
                          <span className={`text-[9px] ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>+{statuses.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3">
              {Object.entries(dotColor).map(([status, color]) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-[11px] text-muted-foreground capitalize">{statusConfig[status as Reuniao['status']].label}</span>
                </div>
              ))}
            </div>

            {/* Quick add for selected date */}
            {selectedDate && (
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-3 gap-1.5 text-xs"
                onClick={() => openNew(selectedDate)}
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar reunião em {selectedDate.split('-').reverse().join('/')}
              </Button>
            )}
          </div>

          {/* List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                {selectedDate
                  ? `Reuniões em ${selectedDate.split('-').reverse().join('/')}`
                  : `${MESES[calendarDate.month]} ${calendarDate.year}`}
              </h2>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar filtro
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : listToShow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {selectedDate ? 'Nenhuma reunião neste dia' : 'Nenhuma reunião neste mês'}
                </p>
                <Button size="sm" variant="outline" className="mt-4 gap-1.5" onClick={() => openNew(selectedDate ?? undefined)}>
                  <Plus className="w-3.5 h-3.5" /> Nova Reunião
                </Button>
              </div>
            ) : (
              listToShow.map(r => (
                <div
                  key={r.id}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => openDetail(r)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-foreground text-sm truncate">{r.titulo}</span>
                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${statusConfig[r.status].color}`}>
                          {statusConfig[r.status].label}
                        </Badge>
                        <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${tipoConfig[r.tipo].color}`}>
                          {tipoConfig[r.tipo].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{r.assunto}</p>
                      {r.projetos && (
                        <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: r.projetos.cor || '#6366f1' }}>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: r.projetos.cor || '#6366f1' }} />
                          {r.projetos.nome}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {r.data.split('-').reverse().join('/')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {r.horario_inicio}{r.horario_fim ? ` – ${r.horario_fim}` : ''}
                        </span>
                        {r.local && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {r.local}
                          </span>
                        )}
                        {r.participantes && r.participantes.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {r.participantes.length} participante{r.participantes.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        onClick={e => { e.stopPropagation(); openEdit(r); }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                        onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        disabled={deleting === r.id}
                      >
                        {deleting === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ---- Dialog: New / Edit ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Reunião' : 'Nova Reunião'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Título <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Ex: Alinhamento semanal"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label className="flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" />Vincular Projeto</Label>
              <Select value={form.projeto_id} onValueChange={v => setForm(f => ({ ...f, projeto_id: v === '__none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum projeto (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Nenhum projeto</SelectItem>
                  {projetos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.cor || '#6366f1' }} />
                        {p.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Data <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={form.data}
                onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Reuniao['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="realizada">Realizada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="adiada">Adiada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Horário de Início <span className="text-red-500">*</span></Label>
              <Input
                type="time"
                value={form.horario_inicio}
                onChange={e => setForm(f => ({ ...f, horario_inicio: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Horário de Fim</Label>
              <Input
                type="time"
                value={form.horario_fim}
                onChange={e => setForm(f => ({ ...f, horario_fim: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as Reuniao['tipo'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interna">Interna</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="parceiro">Parceiro</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Local / Link</Label>
              <Input
                placeholder="Ex: Sala 2, Google Meet..."
                value={form.local}
                onChange={e => setForm(f => ({ ...f, local: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Assunto <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Tema principal da reunião"
                value={form.assunto}
                onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Participantes</Label>
              <Input
                placeholder="Nomes separados por vírgula: João, Maria, Pedro..."
                value={form.participantes}
                onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Responsável</Label>
              <Input
                placeholder="Quem conduziu / organizou"
                value={form.responsavel}
                onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Pauta</Label>
              <Textarea
                placeholder="Tópicos a serem discutidos..."
                rows={3}
                value={form.pauta}
                onChange={e => setForm(f => ({ ...f, pauta: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label>Observações / Ata</Label>
              <Textarea
                placeholder="Decisões tomadas, próximos passos, notas..."
                rows={4}
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Salvar Alterações' : 'Criar Reunião'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Sheet: Detail ---- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedReuniao && (
            <>
              <SheetHeader className="pb-4 border-b border-border">
                <SheetTitle className="text-lg leading-snug">{selectedReuniao.titulo}</SheetTitle>
                <div className="flex gap-2 flex-wrap pt-1">
                  <Badge variant="outline" className={statusConfig[selectedReuniao.status].color}>
                    {statusConfig[selectedReuniao.status].label}
                  </Badge>
                  <Badge variant="outline" className={tipoConfig[selectedReuniao.tipo].color}>
                    {tipoConfig[selectedReuniao.tipo].label}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="space-y-5 py-5">
                {/* Meta */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-accent/40 rounded-lg p-3 space-y-0.5">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Data</p>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {selectedReuniao.data.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <div className="bg-accent/40 rounded-lg p-3 space-y-0.5">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Horário</p>
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {selectedReuniao.horario_inicio}
                      {selectedReuniao.horario_fim && ` – ${selectedReuniao.horario_fim}`}
                    </p>
                  </div>
                  {selectedReuniao.local && (
                    <div className="bg-accent/40 rounded-lg p-3 space-y-0.5 col-span-2">
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Local / Link</p>
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {selectedReuniao.local}
                      </p>
                    </div>
                  )}
                </div>

                {/* Assunto */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assunto</p>
                  <p className="text-sm text-foreground">{selectedReuniao.assunto}</p>
                </div>

                {/* Participantes */}
                {selectedReuniao.participantes && selectedReuniao.participantes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Participantes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedReuniao.participantes.map((p, i) => (
                        <span key={i} className="bg-accent text-foreground text-xs px-2.5 py-1 rounded-full border border-border">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReuniao.responsavel && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsável</p>
                    <p className="text-sm text-foreground">{selectedReuniao.responsavel}</p>
                  </div>
                )}

                {/* Pauta */}
                {selectedReuniao.pauta && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pauta</p>
                    <div className="bg-accent/40 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap border border-border/50">
                      {selectedReuniao.pauta}
                    </div>
                  </div>
                )}

                {/* Observações */}
                {selectedReuniao.observacoes && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações / Ata</p>
                    <div className="bg-accent/40 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap border border-border/50">
                      {selectedReuniao.observacoes}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setSheetOpen(false); openEdit(selectedReuniao); }}>
                  <Pencil className="w-4 h-4" /> Editar
                </Button>
                <Button
                  variant="destructive"
                  className="gap-2"
                  onClick={() => handleDelete(selectedReuniao.id)}
                  disabled={deleting === selectedReuniao.id}
                >
                  {deleting === selectedReuniao.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Excluir
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
