import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dzhtmesadorwylshytbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aHRtZXNhZG9yd3lsc2h5dGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDM3MjIsImV4cCI6MjA4ODM3OTcyMn0.kLBIWCi2ydrYJhsetV2nE72QtFn0c50iNUbr5Ve1oQo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Cliente = {
  id: string;
  nome: string;
  empresa: string;
  telefone: string;
  email: string;
  segmento: string;
  created_at: string;
};

export type Interacao = {
  id: string;
  cliente_id: string;
  canal: 'email' | 'whatsapp' | 'linkedin';
  mensagem: string;
  status: 'respondido' | 'pendente';
  data_interacao: string;
  clientes?: Cliente;
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
