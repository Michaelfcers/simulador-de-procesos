import { supabase } from './supabase';

export async function checkProfessorAuth(Astro: any) {
  const accessToken = Astro.cookies.get('sb-access-token');
  const refreshToken = Astro.cookies.get('sb-refresh-token');

  if (!accessToken || !refreshToken) {
    return { redirect: '/profesor/login' };
  }

  const { data, error } = await supabase.auth.getUser(accessToken.value);

  if (error || !data?.user) {
    return { redirect: '/profesor/login' };
  }

  return { user: data.user };
}
