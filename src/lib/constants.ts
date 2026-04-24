import type { Plataforma, FormatoConteudo } from './supabase';

// ─── Pipeline de projetos ─────────────────────────────────────
export const STATUS_COLS = [
  { id: 'prospeccao',       title: 'Prospecção',       color: '#e5a700' },
  { id: 'proposta_enviada', title: 'Proposta Enviada',  color: '#3b82f6' },
  { id: 'em_negociacao',    title: 'Em Negociação',     color: '#a855f7' },
  { id: 'aprovado',         title: 'Aprovado',          color: '#22c55e' },
  { id: 'em_execucao',      title: 'Em Execução',       color: '#06b6d4' },
  { id: 'concluido',        title: 'Concluído',         color: '#10b981' },
  { id: 'perdido',          title: 'Perdido',           color: '#ef4444' },
] as const;

// ─── Cores de projetos ────────────────────────────────────────
export const COR_OPCOES = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#10b981', '#f97316', '#ec4899',
  '#64748b', '#fbbf24',
];

// ─── Cores gráficos ───────────────────────────────────────────
export const CHART_COLORS = {
  ACCENT: '#e5a700',
  BLUE:   '#3b82f6',
  GREEN:  '#22c55e',
  RED:    '#ef4444',
  PURPLE: '#a855f7',
  CYAN:   '#06b6d4',
} as const;

// ─── Plataformas ─────────────────────────────────────────────
export const PLATAFORMAS: Record<Plataforma, {
  label: string;
  color: string;
  bg: string;
  gradient: string;
  textColor: string;
}> = {
  Instagram: {
    label:     'Instagram',
    color:     '#E1306C',
    bg:        'rgba(225,48,108,0.12)',
    gradient:  'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    textColor: '#E1306C',
  },
  TikTok: {
    label:     'TikTok',
    color:     '#69C9D0',
    bg:        'rgba(105,201,208,0.1)',
    gradient:  'linear-gradient(135deg, #010101, #69C9D0)',
    textColor: '#69C9D0',
  },
  YouTube: {
    label:     'YouTube',
    color:     '#FF0000',
    bg:        'rgba(255,0,0,0.1)',
    gradient:  'linear-gradient(135deg, #FF0000, #cc0000)',
    textColor: '#FF0000',
  },
  LinkedIn: {
    label:     'LinkedIn',
    color:     '#0A66C2',
    bg:        'rgba(10,102,194,0.12)',
    gradient:  'linear-gradient(135deg, #0A66C2, #004182)',
    textColor: '#0A66C2',
  },
};

export const PLATAFORMA_LIST: Plataforma[] = ['Instagram', 'TikTok', 'YouTube', 'LinkedIn'];

// ─── Formatos ─────────────────────────────────────────────────
export const FORMATO_POR_PLATAFORMA: Record<Plataforma, FormatoConteudo[]> = {
  Instagram: ['Reels', 'Story', 'Carrossel', 'Post'],
  TikTok:    ['Reels', 'Short'],
  YouTube:   ['Vídeo Longo', 'Short'],
  LinkedIn:  ['Post', 'Carrossel'],
};

export const FORMATO_LIST: FormatoConteudo[] = ['Reels', 'Short', 'Story', 'Carrossel', 'Post', 'Vídeo Longo'];

// ─── Status de ideias ─────────────────────────────────────────
export const IDEIA_STATUS_CONFIG = {
  'Em andamento': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Em andamento' },
  'Aprovado':     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Aprovado'     },
  'Rejeitado':    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Rejeitado'    },
  'Concluído':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Concluído'    },
} as const;

// ─── Status de publicacoes_staged ────────────────────────────
export const STAGED_STATUS_CONFIG = {
  'Em andamento': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Em andamento' },
  'Aprovado':     { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Aprovado'     },
  'Rejeitado':    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  label: 'Rejeitado'    },
} as const;

// ─── Status pipeline de posts ─────────────────────────────────
export const POST_PIPELINE_STATUS = [
  'Aguardando vídeo',
  'Em edição',
  'Pronto',
  'Postado',
  'Aguardando métricas',
] as const;

export type PostPipelineStatus = typeof POST_PIPELINE_STATUS[number];

export const POST_STATUS_CONFIG: Record<string, {
  color: string; bg: string; icon: string; label: string;
}> = {
  'Aguardando vídeo':    { color: '#d97706', bg: '#FAEEDA', icon: '🎬', label: 'Aguardando vídeo'    },
  'Em edição':           { color: '#7c3aed', bg: '#EEEDFE', icon: '✂️', label: 'Em edição'           },
  'Pronto':              { color: '#16a34a', bg: '#E1F5EE', icon: '✓',  label: 'Pronto'              },
  'Postado':             { color: '#6b7280', bg: '#F1EFE8', icon: '📤', label: 'Postado'             },
  'Aguardando métricas': { color: '#2563eb', bg: '#E6F1FB', icon: '📊', label: 'Aguardando métricas' },
};

// ─── URL base do N8N ─────────────────────────────────────────
export const N8N_BASE_URL = import.meta.env.VITE_N8N_URL ?? 'https://n8n.seudominio.com';
