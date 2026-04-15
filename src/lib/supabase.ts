import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzhtmesadorwylshytbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aHRtZXNhZG9yd3lsc2h5dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDM3MjIsImV4cCI6MjA4ODM3OTcyMn0.kLBIWCi2ydrYJhsetV2nE72QtFn0c50iNUbr5Ve1oQo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── Plataformas ─────────────────────────────────────────────
export type Plataforma = 'Instagram' | 'TikTok' | 'YouTube' | 'LinkedIn';
export type FormatoConteudo = 'Reels' | 'Short' | 'Story' | 'Carrossel' | 'Post' | 'Vídeo Longo';

// ─── Clientes ────────────────────────────────────────────────
export type Cliente = {
  id: string; nome: string; empresa: string; telefone: string; email: string;
  segmento: string; cargo?: string; cidade?: string; estado?: string;
  cnpj?: string; observacoes?: string; status?: string; created_at: string;
  projeto_id?: string | null;
};

// ─── Interações ───────────────────────────────────────────────
export type Interacao = {
  id: string; cliente_id: string; projeto_id?: string | null;
  canal: 'email' | 'whatsapp' | 'linkedin' | 'ligacao' | 'presencial' | 'instagram';
  mensagem: string;
  status: 'respondido' | 'pendente' | 'aberto' | 'resolvido' | 'aguardando' | 'concluido' | 'em_executar' | 'aprovado';
  proxima_acao?: string | null;
  data_interacao: string;
  clientes?: { id: string; nome: string; empresa: string; telefone?: string; email?: string } | null;
};

// ─── Ideias ───────────────────────────────────────────────────
export type IdeiaStatus = 'Em andamento' | 'Aprovado' | 'Rejeitado' | 'Concluído';

export type Ideia = {
  id: number;
  created_at: string;
  data_cadastro?: string;
  assunto_tema: string;
  formato: FormatoConteudo | string;
  observacoes: string | null;         // notas do usuário para a IA
  roteiro: string | null;             // roteiro gerado pelo n8n (editável)
  url_video: string | null;           // vídeo gravado enviado pelo usuário
  imagem_url: string | null;           // imagem enviada pelo usuário (LinkedIn)
  motivo_rejeicao: string | null;
  status: IdeiaStatus;
  data_uso: string | null;
  plataforma: Plataforma | string;
  data_postagem: string | null;       // data marcada como Concluído
};

// ─── Publicações Staged ───────────────────────────────────────
export type PublicacaoStagedStatus = 'Em andamento' | 'Aprovado' | 'Rejeitado';

export type PublicacaoStaged = {
  id: string;
  ideia_id: number | null;
  plataforma: Plataforma | string;
  conteudo_gerado: string | null;
  hashtags: string | null;
  url_imagem: string | null;
  url_video: string | null;
  roteiro: string | null;
  status: PublicacaoStagedStatus;
  motivo_rejeicao: string | null;
  projeto_id: string | null;
  data_postagem: string | null;
  created_at: string;
  updated_at: string;
  ideias?: { assunto_tema: string; plataforma: string } | null;
  projetos?: { nome: string } | null;
};

// ─── Posts ────────────────────────────────────────────────────
export type Post = {
  id: string;
  ideia_id: number | null;
  id_ideia?: number | null;
  assunto: string;
  conteudo_post: string;
  hashtags: string | null;
  status_aprovacao: 'Rascunho' | 'Aprovado' | 'Rejeitado';
  data_aprovacao: string | null;
  data_postagem: string | null;
  modo_imagem: 'sem_imagem' | 'gerar_ia' | 'minha_foto';
  url_imagem: string | null;
  url_video: string | null;
  roteiro: string | null;
  plataforma: Plataforma | string | null;
  formato: FormatoConteudo | string | null;
  projeto_id: string | null;
  linkedin_post_id: string | null;
  // métricas individuais
  impressoes: number;
  views: number;
  likes: number;
  comentarios: number;
  compartilhamentos: number;
  cliques_perfil: number;
  created_at: string;
};

// ─── Métricas (gerais do CRM) ─────────────────────────────────
export type Metrica = {
  id: number; id_post: string | null; assunto: string | null;
  data_post: string | null; horario: string | null; formato: string | null;
  impressoes: number; views: number; likes: number; comentarios: number;
  compartilhamentos: number; cliques_perfil: number; score_performance: number;
  top_conteudo: boolean; created_at: string; updated_at: string;
};

export type TopConteudo = {
  id: number; id_post: string | null; assunto: string | null; formato: string | null;
  data_post: string | null; horario: string | null; score_performance: number | null;
  impressoes: number | null; views: number | null; likes: number | null;
  comentarios: number | null; padroes_identificados: string | null; created_at: string;
};

// ─── Recomendações ───────────────────────────────────────────
export type Recomendacao = {
  id: string; assunto_sugerido: string; formato_sugerido: string;
  justificativa_ia: string | null; horario_sugerido: string | null;
  gerado_em: string; status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  motivo_rejeicao: string | null; created_at: string;
};

// ─── Pedidos / Vendas ─────────────────────────────────────────
export type Pedido = {
  id: string; codigo_pedido: string | null; cliente_id: string; produto_id: string | null;
  data: string | null; qtd: number | null; data_emissao: string | null;
  data_vencimento: string | null; total: number | null; desconto_pct: number | null;
  forma_pagamento: string | null; prazo: string | null; vencimento: string | null;
  status: string | null; motivo_perda: string | null; observacoes: string | null;
  clientes?: { nome: string; empresa: string } | null;
  produtos?: { codigo: string; descricao: string | null; valor_unit: number | null } | null;
};

// ─── Projetos ────────────────────────────────────────────────
export type Projeto = {
  id: string; nome: string; cliente_id: string | null;
  valor_estimado: number | null; data_fechamento_prevista: string | null;
  responsavel: string | null; descricao: string | null;
  status: 'prospeccao' | 'proposta_enviada' | 'em_negociacao' | 'aprovado' | 'em_execucao' | 'concluido' | 'perdido';
  motivo_perda: string | null; ordem: number; foto_url: string | null;
  titulo: string | null; empresa: string | null; cor: string | null;
  created_at: string; updated_at: string;
  observacoes?: string | null;
};

// ─── Tarefas ─────────────────────────────────────────────────
export type Tarefa = {
  id: string; projeto_id: string; titulo: string; descricao: string | null;
  responsavel: string | null;
  status: 'pendente' | 'em_analise' | 'aprovado' | 'em_execucao' | 'concluido' | 'cancelado';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  data_prevista: string | null; created_at: string; updated_at: string;
};

// ─── Notificações ─────────────────────────────────────────────
export type Notificacao = {
  id: string; tipo: 'tarefa' | 'projeto' | 'mencao';
  titulo: string; mensagem: string | null;
  entidade_tipo: string | null; entidade_id: string | null;
  responsavel: string | null; lida: boolean; created_at: string;
  destinatario_email?: string | null;
};

// ─── Custos de Projeto ───────────────────────────────────────
export type CustoProjeto = {
  id: string; projeto_id: string; descricao: string; valor: number;
  categoria: string; data: string; tipo: 'despesa' | 'receita';
  observacoes: string | null; created_at: string;
};

// ─── Métricas de Projeto ─────────────────────────────────────
export type ProjetoMetrica = {
  id: string; projeto_id: string; nome: string; valor: number;
  unidade: string; meta: number | null; data: string; created_at: string;
};

// ─── Ideias de Projeto ───────────────────────────────────────
export type ProjetoIdeia = {
  id: string; projeto_id: string; titulo: string; descricao: string | null;
  status: 'pendente' | 'em_andamento' | 'aprovado' | 'descartado'; created_at: string;
};

// ─── Dashboard View ──────────────────────────────────────────
export type VwDashboard = {
  post_id: string; assunto: string; status_aprovacao: string; modo_imagem: string;
  post_criado_em: string; ideia_original: string | null; formato_ideia: string | null;
  impressoes: number | null; views: number | null; likes: number | null;
  comentarios: number | null; compartilhamentos: number | null;
  score_performance: number | null; top_conteudo: boolean | null;
  data_post: string | null; horario: string | null; padroes_identificados: string | null;
};

// ─── Atividades ──────────────────────────────────────────────
export type Atividade = {
  id: string; entidade_tipo: string; entidade_id: string; acao: string;
  descricao: string | null; usuario_email: string | null; created_at: string;
};

// ─── Reuniões ────────────────────────────────────────────────
export type Reuniao = {
  id: string; titulo: string; data: string; horario_inicio: string;
  horario_fim: string | null; local: string | null;
  tipo: 'interna' | 'cliente' | 'parceiro' | 'outro';
  assunto: string; pauta: string | null; observacoes: string | null;
  participantes: string[] | null; responsavel: string | null;
  status: 'agendada' | 'realizada' | 'cancelada' | 'adiada';
  created_at: string; updated_at: string;
};

// ─── Conteúdo (legado) ────────────────────────────────────────
export type IdeiaConteudo = {
  id: string; titulo: string; descricao: string;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'producao' | 'concluido';
  feedback_gestor: string | null; created_at: string;
};

export type Conteudo = {
  id: string; ideia_id: string; url_video: string; data_publicacao: string;
  status: 'ativo' | 'arquivado'; ideias_conteudo?: IdeiaConteudo;
};
