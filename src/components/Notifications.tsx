import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

type Notif = { id: string; text: string; type: 'warning' | 'info'; read: boolean };

export function Notifications() {
  const [notifs, setNotifs] = useState<Notif[]>([]);

  useEffect(() => {
    const check = async () => {
      const alerts: Notif[] = [];
      // Ideias pendentes há mais de 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: oldIdeias } = await supabase.from('ideias').select('id, assunto_tema').eq('status', 'Pendente').lt('created_at', sevenDaysAgo).limit(5);
      (oldIdeias ?? []).forEach(i => alerts.push({ id: `ideia-${i.id}`, text: `Ideia "${i.assunto_tema}" pendente há mais de 7 dias`, type: 'warning', read: false }));

      // Clientes sem interação há 30 dias
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: inactiveClients } = await supabase.from('clientes').select('id, nome').limit(5);
      if (inactiveClients && inactiveClients.length > 0) {
        for (const c of inactiveClients.slice(0, 3)) {
          const { data: recent } = await supabase.from('interacoes').select('id').eq('cliente_id', c.id).gt('data_interacao', thirtyDaysAgo).limit(1);
          if (!recent || recent.length === 0) {
            alerts.push({ id: `cli-${c.id}`, text: `${c.nome} sem interação há 30+ dias`, type: 'info', read: false });
          }
        }
      }
      setNotifs(alerts);
    };
    check();
  }, []);

  const unread = notifs.filter(n => !n.read).length;
  const markRead = (id: string) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
        </div>
        <div className="max-h-64 overflow-auto">
          {notifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Sem notificações</p>
          ) : notifs.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border last:border-0 transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'warning' ? 'bg-primary' : 'bg-blue-500'}`} />
                <p className="text-xs text-foreground leading-relaxed">{n.text}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
