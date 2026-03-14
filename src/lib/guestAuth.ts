import { supabase } from './supabase';

const TOKEN_KEY = 'sim_device_token';

export const getDeviceToken = () => {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
};

export const registerGuest = async (sessionId: string, guestName: string) => {
  const deviceToken = getDeviceToken();

  const { data, error } = await supabase
    .from('session_guests')
    .upsert(
      {
        session_id: sessionId,
        guest_name: guestName,
        device_token: deviceToken,
        is_online: true,
        last_active_at: new Date().toISOString(),
      },
      {
        onConflict: 'session_id, device_token',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getActiveGuest = async (sessionId: string) => {
  const deviceToken = getDeviceToken();
  const { data } = await supabase
    .from('session_guests')
    .select('*, teams(name)')
    .eq('session_id', sessionId)
    .eq('device_token', deviceToken)
    .single();

  return data;
};
