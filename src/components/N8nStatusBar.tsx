import { useEffect } from 'react';
import { usePerfilCriador } from '@/hooks/useIdeias';

function fmtHora(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDia(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return `hoje às ${fmtHora(iso)}`;
  if (diff === 1) return `ontem às ${fmtHora(iso)}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ` às ${fmtHora(iso)}`;
}

export function N8nStatusBar() {
  const { perfil, ultimaIdeia, refetch } = usePerfilCriador();

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-muted/40 border border-border/50 text-[11px]">
      {/* Esquerda — última geração */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        {ultimaIdeia ? (
          <span className="text-muted-foreground truncate">
            N8N gerou ideias{' '}
            <span className="text-foreground font-medium">{fmtDia(ultimaIdeia)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Aguardando primeira geração do N8N</span>
        )}

        {perfil ? (
          <span
            className="ml-2 shrink-0 px-1.5 py-0.5 rounded-md font-semibold"
            style={{ backgroundColor: 'rgba(127,119,221,0.15)', color: '#7F77DD' }}
          >
            Perfil v{perfil.versao} ativo
          </span>
        ) : (
          <span className="ml-2 shrink-0 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground"
            title="O perfil de criador é gerado pelo fluxo quinzenal do N8N com base na sua performance">
            Perfil ainda não gerado
          </span>
        )}
      </div>

      {/* Direita — próxima geração */}
      <span className="text-muted-foreground shrink-0">
        Próxima geração: <span className="text-foreground font-medium">amanhã às 08:00</span>
      </span>
    </div>
  );
}
