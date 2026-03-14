import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export type SessionStatus =
  | 'ESPERA'
  | 'PLANIFICACION'
  | 'COMPRAS_PRODUCCION'
  | 'EVALUACION'
  | 'FINALIZADO';

export function useSessionState(sessionId: string) {
  const [status, setStatus] = useState<SessionStatus>('ESPERA');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial status
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('status')
        .eq('id', sessionId)
        .single();

      if (!error && data) {
        setStatus(data.status as SessionStatus);
      }
      setLoading(false);
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Session status updated!', payload);
          setStatus(payload.new.status as SessionStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { status, loading };
}

export function useTeamData(teamId: string) {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!teamId) return;

    // Calcular saldo inicial sumando transacciones (Simplificado para el boilerplate)
    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('amount')
        .eq('team_id', teamId);

      if (!error && data) {
        const total = data.reduce((acc, curr) => acc + Number(curr.amount), 0);
        setBalance(total);
      }
    };

    fetchBalance();

    // Sincronizar en tiempo real el saldo
    const channel = supabase
      .channel(`team-ledger-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ledger_transactions',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          console.log('New transaction!', payload);
          setBalance((current) => current + Number(payload.new.amount));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  return { balance };
}
