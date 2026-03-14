import { CheckCircle2, Loader2, LogOut, Shield, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getActiveGuest } from '../../lib/guestAuth';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';

interface Team {
  id: string;
  name: string;
  _count?: { session_guests: number };
}

export const StudentLobby: React.FC<{ sessionId: string; guestId: string }> = ({
  sessionId,
  guestId,
}) => {
  const [guest, setGuest] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const fetchData = async () => {
    const [guestData, teamsData] = await Promise.all([
      getActiveGuest(sessionId),
      supabase.from('teams').select('id, name').eq('session_id', sessionId),
    ]);

    if (guestData) setGuest(guestData);
    if (teamsData.data) setTeams(teamsData.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const channel = supabase
      .channel(`lobby-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_guests', filter: `id=eq.${guestId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          if (payload.new.status !== 'ESPERA') {
            window.location.reload(); // Trigger re-render to main game view
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, guestId]);

  const handleJoinRequest = async (teamId: string) => {
    setRequesting(teamId);
    try {
      const { error } = await supabase.from('team_requests').insert({
        session_id: sessionId,
        guest_id: guestId,
        request_type: 'JOIN_TEAM',
        target_team_id: teamId,
        status: 'PENDING',
      });
      if (error) throw error;
      alert('Solicitud enviada al profesor.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequesting(null);
    }
  };

  const handleCreateRequest = async () => {
    const teamName = prompt('Nombre de tu nueva empresa:');
    if (!teamName) return;

    try {
      const { error } = await supabase.from('team_requests').insert({
        session_id: sessionId,
        guest_id: guestId,
        request_type: 'CREATE_TEAM',
        requested_team_name: teamName,
        status: 'PENDING',
      });
      if (error) throw error;
      alert('Solicitud de creación enviada al profesor.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
        <p className="text-slate-500 font-medium animate-pulse">Cargando lobby...</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Estudiante */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-500/5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Shield size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              ¡Hola, {guest?.guest_name}!
            </h1>
            <p className="text-slate-500 font-medium">Estás en la sala de espera.</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {guest?.team_id ? (
            <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} /> Equipo: {guest.teams?.name}
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 border-none px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest">
              Sin Equipo Asignado
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Teams List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Users size={20} className="text-indigo-600" />
              Equipos en la Sala
            </h2>
            {!guest?.team_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateRequest}
                className="rounded-xl border-indigo-200 text-indigo-600 font-bold hover:bg-indigo-50"
              >
                + Crear Empresa
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {teams.length > 0 ? (
              teams.map((team) => (
                <Card
                  key={team.id}
                  className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl group overflow-hidden"
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                        <Users size={20} />
                      </div>
                      <span className="font-black text-slate-700 text-lg">{team.name}</span>
                    </div>

                    {!guest?.team_id && (
                      <Button
                        size="sm"
                        disabled={requesting === team.id}
                        onClick={() => handleJoinRequest(team.id)}
                        className="rounded-xl bg-slate-900 hover:bg-indigo-600 font-bold text-xs uppercase tracking-wider px-6"
                      >
                        {requesting === team.id ? '...' : 'Unirme'}
                      </Button>
                    )}

                    {guest?.team_id === team.id && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg font-bold">
                        MI EQUIPO
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
                <p className="text-slate-400 font-medium italic">
                  El profesor aún no ha creado equipos.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="md:col-span-1">
          <Card className="border-indigo-100 shadow-xl shadow-indigo-500/5 rounded-[2.5rem] bg-indigo-600 text-white overflow-hidden sticky top-6">
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black mb-2">Esperando al Profesor</h3>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  Cuando el profesor inicie la simulación, entrarás automáticamente al dashboard de
                  tu empresa.
                </p>
              </div>
              <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-indigo-200">
                  <span>Tu Estado</span>
                  <span className="text-white">EN LÍNEA</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => (window.location.href = '/')}
                  className="w-full text-white hover:bg-white/10 rounded-xl font-bold flex items-center gap-2"
                >
                  <LogOut size={16} /> Salir de la Sala
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
