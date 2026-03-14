import { Hash, LogIn, User } from 'lucide-react';
import React, { useState } from 'react';
import { registerGuest } from '../../lib/guestAuth';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

export const JoinSession: React.FC<{ onJoined: (sessionId: string, guestId: string) => void }> = ({
  onJoined,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !name) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Verify session
      const { data: session, error: sessionErr } = await supabase
        .from('sessions')
        .select('id, status')
        .eq('join_code', joinCode.toUpperCase().trim())
        .single();

      if (sessionErr || !session) throw new Error('Código de sesión no válido o expirado.');
      if (session.status === 'FINALIZADO') throw new Error('Esta sesión ya ha terminado.');

      // 2. Register as guest
      const guest = await registerGuest(session.id, name.trim());

      // 3. Callback
      onJoined(session.id, guest.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-indigo-100 shadow-2xl shadow-indigo-500/10 rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-indigo-200">
            <LogIn size={32} />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">
            Unirse a la Simulación
          </CardTitle>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Ingresa el código que te dio tu profesor.
          </p>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleJoin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Código de Acceso
              </label>
              <div className="relative">
                <Hash
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="EJ: SOBR-1234"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-black text-indigo-600 tracking-widest placeholder:text-slate-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Tu Nombre Completo
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-700"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold animate-in fade-in zoom-in-95 duration-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-0.5 transition-all"
            >
              {loading ? 'Verificando...' : 'Entrar al Simulador'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
