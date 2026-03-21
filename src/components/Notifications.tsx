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
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: oldIdeias } = await supabase.from('ideias').select('id, assunto_tema').eq('status', 'Pendente').lt('created_at', sevenDaysAgo).limit(5);
      (oldIdeias ?? []).forEach(i => alerts.push({ id: `ideia-${i.id}`, text: `Ideia "${i.assunto_tema}" pendente há mais de 7 dias`, type: 'warning', read: false }));

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
        <Button variant="ghost" size="icon" className="relative h-7 w-7">
          <Bell className="w-3.5 h-3.5 text-white/40" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center" style={{ background: '#F5C518', color: '#000' }}>
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" style={{ background: 'rgba(10,10,28,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Notificações</p>
        </div>
        <div className="max-h-64 overflow-auto">
          {notifs.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>Sem notificações</p>
          ) : notifs.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className="w-full text-left px-3 py-2.5 transition-colors hover:bg-white/5"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: !n.read ? 'rgba(245,197,24,0.03)' : 'transparent',
              }}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: n.type === 'warning' ? '#F5C518' : '#5b8dee' }} />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>{n.text}</p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
