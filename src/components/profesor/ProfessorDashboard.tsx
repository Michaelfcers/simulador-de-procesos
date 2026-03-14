import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { EvaluationForm } from './EvaluationForm';
import { LobbyManager } from './LobbyManager';
import { RequestsHub } from './RequestsHub';
import { SessionController } from './SessionController';
import { TeamsMonitor } from './TeamsMonitor';

interface Session {
  id: string;
  join_code: string;
  status: string;
  template_id: string;
  game_templates?: {
    name: string;
  };
}

export function ProfessorDashboard({
  initialSession,
  userId,
}: {
  initialSession: Session;
  userId: string;
}) {
  const [session, setSession] = useState<Session>(initialSession);

  useEffect(() => {
    const channel = supabase
      .channel(`professor-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload: any) => {
          setSession((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.id]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {session.join_code}
            </h1>
            <span
              className={`text-[10px] uppercase font-black px-3 py-1 rounded-full border tracking-widest ${
                session.status === 'ESPERA'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {session.status}
            </span>
          </div>
          <p className="text-slate-500 mt-2 font-medium">
            Sesión activa:{' '}
            <span className="text-indigo-600 font-bold">{session.game_templates?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          En vivo (Tiempo Real)
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <SessionController
              sessionId={session.id}
              currentStatus={session.status as any}
              onStatusChange={(newStatus) => setSession((prev) => ({ ...prev, status: newStatus }))}
            />
          </div>
        </div>

        <div className="xl:col-span-3 space-y-8">
          {session.status === 'ESPERA' ? (
            <LobbyManager sessionId={session.id} />
          ) : (
            <>
              <TeamsMonitor sessionId={session.id} />

              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    Hub de Operaciones
                  </h2>
                </div>
                <div className="p-6">
                  <RequestsHub sessionId={session.id} />
                </div>
              </div>

              {session.status === 'EVALUACION' && <EvaluationForm sessionId={session.id} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
