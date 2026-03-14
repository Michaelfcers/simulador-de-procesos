import React, { useEffect, useState } from 'react';
import { getActiveGuest } from '../../lib/guestAuth';
import { supabase } from '../../lib/supabase';
import { JoinSession } from './JoinSession';
import { StudentLobby } from './StudentLobby';

export const StudentFlow: React.FC = () => {
  const [session, setSession] = useState<{ id: string; status: string } | null>(null);
  const [guest, setGuest] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkState = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionCode = urlParams.get('join_code');

      // If we have a code in URL, we could auto-fill or auto-join
      // But for now, let's check if there's an active guest in ANY session
      // Since device_token is unique per session in the DB schema (session_id, device_token)
      // we need a way to know WHICH session to check.

      // Let's rely on the JoinSession to start.
      // If the user refreshes while in StudentLobby, the state is lost...
      // let's add a small persistence in sessionStorage for the current active sessionId.
      const savedSessionId = sessionStorage.getItem('active_session_id');
      if (savedSessionId) {
        const guestData = await getActiveGuest(savedSessionId);
        if (guestData) {
          handleJoined(savedSessionId, guestData.id);
        }
      }
      setLoading(false);
    };
    checkState();
  }, []);

  const handleJoined = (sessionId: string, guestId: string) => {
    sessionStorage.setItem('active_session_id', sessionId);
    setSession({ id: sessionId, status: 'ESPERA' });
    setGuest({ id: guestId });

    // Subscribe to session status to know when to jump to the game
    supabase
      .channel('session-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status !== 'ESPERA') {
            // Redirect to the actual session game page (or stay here if we build the game view in React too)
            window.location.href = `/estudiante/sesiones/${sessionId}`;
          }
        }
      )
      .subscribe();
  };

  if (loading) return null;

  if (!session || !guest) {
    return <JoinSession onJoined={handleJoined} />;
  }

  return <StudentLobby sessionId={session.id} guestId={guest.id} />;
};
