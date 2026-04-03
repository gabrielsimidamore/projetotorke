export const STATUS_COLS = [
  { id: 'prospeccao',       title: 'Prospecção',      color: '#e5a700' },
  { id: 'proposta_enviada', title: 'Proposta Enviada', color: '#3b82f6' },
  { id: 'em_negociacao',    title: 'Em Negociação',    color: '#a855f7' },
  { id: 'aprovado',         title: 'Aprovado',         color: '#22c55e' },
  { id: 'em_execucao',      title: 'Em Execução',      color: '#06b6d4' },
  { id: 'concluido',        title: 'Concluído',        color: '#10b981' },
  { id: 'perdido',          title: 'Perdido',          color: '#ef4444' },
] as const;

export const COR_OPCOES = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#10b981', '#f97316', '#ec4899',
  '#64748b', '#fbbf24',
];

export const CHART_COLORS = {
  ACCENT: '#e5a700',
  BLUE:   '#3b82f6',
  GREEN:  '#22c55e',
  RED:    '#ef4444',
  PURPLE: '#a855f7',
  CYAN:   '#06b6d4',
} as const;
