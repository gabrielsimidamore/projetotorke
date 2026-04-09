import { useState } from 'react';
import { X, FileText, Save, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlatformBadge } from '@/components/PlatformBadge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { Ideia } from '@/lib/supabase';

interface RoteirDrawerProps {
  ideia: Ideia | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function RoteirDrawer({ ideia, open, onClose, onSaved }: RoteirDrawerProps) {
  const [editing, setEditing] = useState(false);
  const [roteiro, setRoteiro] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // sync roteiro when ideia changes
  if (ideia && roteiro !== (ideia.roteiro ?? '') && !editing) {
    setRoteiro(ideia.roteiro ?? '');
  }

  const handleSave = async () => {
    if (!ideia) return;
    setSaving(true);
    const { error } = await supabase
      .from('ideias')
      .update({ roteiro })
      .eq('id', ideia.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar roteiro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Roteiro salvo!' });
      setEditing(false);
      onSaved();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed right-0 top-0 z-50 h-full w-full max-w-[480px]
          bg-card border-l border-border shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-semibold text-foreground text-sm">Roteiro</span>
              {ideia && <PlatformBadge platform={ideia.plataforma} size="sm" />}
            </div>
            {ideia && (
              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[360px]">
                {ideia.assunto_tema}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 flex flex-col gap-4">
          {/* Meta */}
          {ideia && (
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Formato</p>
                <p className="text-xs font-medium text-foreground">{ideia.formato || '—'}</p>
              </div>
              <div className="glass-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                <p className="text-xs font-medium text-foreground">{ideia.status}</p>
              </div>
              {ideia.observacoes && (
                <div className="col-span-2 glass-card p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Observações</p>
                  <p className="text-xs text-foreground leading-relaxed">{ideia.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Roteiro editor */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Roteiro do vídeo</p>
              {!editing ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="w-3 h-3" /> Editar
                </Button>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => { setEditing(false); setRoteiro(ideia?.roteiro ?? ''); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Check className="w-3 h-3" /> Salvar</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {editing ? (
              <Textarea
                value={roteiro}
                onChange={e => setRoteiro(e.target.value)}
                className="flex-1 min-h-[340px] text-sm leading-relaxed resize-none font-mono bg-muted/40 border-border focus:border-primary/50 transition-colors"
                placeholder="Escreva ou edite o roteiro do vídeo..."
                autoFocus
              />
            ) : (
              <div className="flex-1 min-h-[340px] p-4 rounded-lg bg-muted/30 border border-border text-sm leading-relaxed whitespace-pre-wrap text-foreground overflow-auto">
                {roteiro || (
                  <span className="text-muted-foreground italic">
                    Nenhum roteiro gerado ainda. O n8n irá preencher automaticamente.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {!editing && roteiro && (
          <div className="p-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => {
                navigator.clipboard.writeText(roteiro);
                toast({ title: 'Roteiro copiado!' });
              }}
            >
              <Save className="w-3.5 h-3.5" /> Copiar roteiro
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
