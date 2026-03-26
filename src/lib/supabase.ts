import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzhtmesadorwylshytbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aHRtZXNhZG9yd3lsc2h5dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDM3MjIsImV4cCI6MjA4ODM3OTcyMn0.kLBIWCi2ydrYJhsetV2nE72QtFn0c50iNUbr5Ve1oQo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---- Tipos CRM ----
export type Cliente = {
  id: string;
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  segmento: string;
  cargo?: string;
  cidade?: string;
  estado?: string;
  cnpj?: string;
  observacoes?: string;
  status?: string;
  created_at: string;
};

export type Interacao = {
  id: string;
  cliente_id: string;
  canal: 'email' | 'whatsapp' | 'linkedin' | 'ligacao' | 'presencial' | 'instagram';
  mensagem: string;
  status: 'respondido' | 'pendente' | 'aberto' | 'resolvido' | 'aguardando';
  data_interacao: string;
  clientes?: { nome: string; empresa: string };
};

export type IdeiaConteudo = {
  id: string;
  titulo: string;
  descricao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'producao' | 'concluido';
  feedback_gestor: string | null;
  created_at: string;
};

export type Conteudo = {
  id: string;
  ideia_id: string;
  url_video: string;
  data_publicacao: string;
  status: 'ativo' | 'arquivado';
  ideias_conteudo?: IdeiaConteudo;
};

// ---- Tipos LinkedIn Automation ----
export type Ideia = {
  id: number;
  data_cadastro: string;
  assunto_tema: string;
  formato: string;
  observacoes: string | null;
  status: 'Pendente' | 'Em andamento' | 'Aprovado' | 'Rejeitado';
  data_uso: string | null;
  plataforma?: string;
  data_postagem?: string | null;
  created_at: string;
};

export type Post = {
  id: string;
  id_ideia: number | null;
  assunto: string;
  conteudo_post: string;
  hashtags: string | null;
  status_aprovacao: 'Rascunho' | 'Aprovado' | 'Rejeitado';
  data_aprovacao: string | null;
  observacao: string | null;
  modo_imagem: 'sem_imagem' | 'gerar_ia' | 'minha_foto';
  url_imagem: string | null;
  linkedin_post_id: string | null;
  created_at: string;
};

export type Metrica = {
  id: number;
  id_post: string | null;
  assunto: string | null;
  data_post: string | null;
  horario: string | null;
  formato: string | null;
  impressoes: number;
  views: number;
  likes: number;
  comentarios: number;
  compartilhamentos: number;
  cliques_perfil: number;
  score_performance: number;
  top_conteudo: boolean;
  created_at: string;
  updated_at: string;
};

export type TopConteudo = {
  id: number;
  id_post: string | null;
  assunto: string | null;
  formato: string | null;
  data_post: string | null;
  horario: string | null;
  score_performance: number | null;
  impressoes: number | null;
  views: number | null;
  likes: number | null;
  comentarios: number | null;
  padroes_identificados: string | null;
  created_at: string;
};

export type Recomendacao = {
  id: string;
  assunto_sugerido: string;
  formato_sugerido: string;
  justificativa_ia: string | null;
  horario_sugerido: string | null;
  gerado_em: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  motivo_rejeicao: string | null;
  created_at: string;
};

export type Rejeitado = {
  id: string;
  origem: 'Ideia' | 'Recomendação' | 'Post';
  assunto: string | null;
  formato: string | null;
  data_rejeicao: string;
  motivo: string;
  padroes_identificados: string | null;
  created_at: string;
};

export type Projeto = {
  id: string;
  nome: string;
  cliente_id: string | null;
  valor_estimado: number | null;
  data_fechamento_prevista: string | null;
  responsavel: string | null;
  descricao: string | null;
  status: 'prospeccao' | 'proposta_enviada' | 'em_negociacao' | 'aprovado' | 'em_execucao' | 'concluido' | 'perdido';
  motivo_perda: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  clientes?: { nome: string; empresa: string };
};

export type VwDashboard = {
  post_id: string;
  assunto: string;
  status_aprovacao: string;
  modo_imagem: string;
  post_criado_em: string;
  ideia_original: string | null;
  formato_ideia: string | null;
  impressoes: number | null;
  views: number | null;
  likes: number | null;
  comentarios: number | null;
  compartilhamentos: number | null;
  score_performance: number | null;
  top_conteudo: boolean | null;
  data_post: string | null;
  horario: string | null;
  padroes_identificados: string | null;
};

export type Atividade = {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  acao: string;
  descricao: string | null;
  usuario_email: string | null;
  created_at: string;
};
