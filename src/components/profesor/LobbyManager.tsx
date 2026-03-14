import {
  closestCenter,
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Check, Plus, Shuffle, Users, UserX, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface Guest {
  id: string;
  guest_name: string;
  team_id: string | null;
  is_online: boolean;
}

interface Team {
  id: string;
  name: string;
}

interface TeamRequest {
  id: string;
  guest_id: string;
  request_type: 'CREATE_TEAM' | 'JOIN_TEAM';
  requested_team_name?: string;
  target_team_id?: string;
  status: string;
  guest: { guest_name: string };
  team?: { name: string };
}

function DraggableStudent({ guest }: { guest: Guest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `guest-${guest.id}`,
    data: guest,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between p-3 bg-white rounded-xl border group cursor-grab active:cursor-grabbing shadow-sm transition-all ${
        isDragging
          ? 'opacity-50 ring-2 ring-indigo-500 z-50 shadow-lg scale-105 border-indigo-200'
          : 'border-slate-200 hover:border-indigo-300'
      }`}
    >
      <span className="font-bold text-slate-700 text-sm truncate">{guest.guest_name}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`w-2 h-2 rounded-full ${guest.is_online ? 'bg-emerald-500' : 'bg-slate-300'}`}
        ></span>
      </div>
    </div>
  );
}

function DroppableUnassigned({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 min-h-[150px] p-2 -m-2 rounded-xl transition-colors ${isOver ? 'bg-amber-50 outline-dashed outline-2 outline-amber-200' : ''}`}
    >
      {children}
    </div>
  );
}

function DroppableTeam({ team, children }: { team: Team; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${team.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] p-2 -m-2 rounded-xl transition-colors ${isOver ? 'bg-indigo-50 outline-dashed outline-2 outline-indigo-200' : ''}`}
    >
      {children}
    </div>
  );
}

export const LobbyManager: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [requests, setRequests] = useState<TeamRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [guestsRes, teamsRes, requestsRes] = await Promise.all([
      supabase.from('session_guests').select('*').eq('session_id', sessionId),
      supabase.from('teams').select('*').eq('session_id', sessionId),
      supabase
        .from('team_requests')
        .select('*, guest:session_guests(guest_name), team:teams(name)')
        .eq('session_id', sessionId)
        .eq('status', 'PENDING'),
    ]);

    if (guestsRes.data) setGuests(guestsRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (requestsRes.data) setRequests(requestsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const sub = supabase
      .channel(`professor-lobby-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_guests',
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `session_id=eq.${sessionId}` },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_requests',
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [sessionId]);

  const handleCreateTeam = async (name?: string) => {
    const teamName = name || prompt('Nombre del nuevo equipo:');
    if (!teamName) return;

    const { error } = await supabase.from('teams').insert({
      session_id: sessionId,
      name: teamName,
    });
    if (error) alert(error.message);
  };

  const handleRandomize = async () => {
    if (teams.length < 2) return alert('Crea al menos 2 equipos antes de aleatorizar.');
    const unassignedGuests = guests.filter((g) => !g.team_id);
    if (unassignedGuests.length === 0) return alert('No hay alumnos sin equipo.');

    const shuffled = [...unassignedGuests].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      const team = teams[i % teams.length];
      await supabase.from('session_guests').update({ team_id: team.id }).eq('id', shuffled[i].id);
    }
    fetchData();
  };

  const handleRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    if (status === 'APPROVED') {
      if (request.request_type === 'CREATE_TEAM' && request.requested_team_name) {
        const { data: newTeam } = await supabase
          .from('teams')
          .insert({ session_id: sessionId, name: request.requested_team_name })
          .select()
          .single();
        if (newTeam) {
          await supabase
            .from('session_guests')
            .update({ team_id: newTeam.id })
            .eq('id', request.guest_id);
        }
      } else if (request.request_type === 'JOIN_TEAM' && request.target_team_id) {
        await supabase
          .from('session_guests')
          .update({ team_id: request.target_team_id })
          .eq('id', request.guest_id);
      }
    }

    await supabase.from('team_requests').update({ status }).eq('id', requestId);
    fetchData();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const guestId = (active.id as string).replace('guest-', '');
    let newTeamId: string | null = null;

    if (over.id === 'unassigned-zone') {
      newTeamId = null;
    } else if ((over.id as string).startsWith('team-')) {
      newTeamId = (over.id as string).replace('team-', '');
    }

    const guest = guests.find((g) => g.id === guestId);
    if (guest?.team_id === newTeamId) return;

    // Optimistic UI update
    setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, team_id: newTeamId } : g)));

    const { error } = await supabase
      .from('session_guests')
      .update({ team_id: newTeamId })
      .eq('id', guestId);

    if (error) {
      console.error('Error assigning team:', error);
      fetchData(); // Rollback
    }
  };

  const unassigned = guests.filter((g) => !g.team_id);

  return (
    <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
              Gestión de Equipos (Lobby)
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Organiza a tus alumnos antes de iniciar la simulación. Arrastra y suelta estudiantes
              para asignarlos.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRandomize}
              className="rounded-xl font-bold gap-2"
            >
              <Shuffle size={18} /> Aleatorizar
            </Button>
            <Button
              onClick={() => handleCreateTeam()}
              className="bg-slate-900 rounded-xl font-bold gap-2"
            >
              <Plus size={18} /> Nuevo Equipo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Unassigned Students */}
          <Card className="border-indigo-100 shadow-xl shadow-indigo-500/5 rounded-[2.5rem] bg-slate-50 lg:col-span-1 border-2 border-dashed">
            <CardHeader className="bg-slate-100/50 border-b border-slate-200/50 p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black text-slate-800">Sin Equipo</CardTitle>
                <Badge className="bg-amber-100 text-amber-700 font-black tracking-widest px-3 py-1 scale-110">
                  {unassigned.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DroppableUnassigned>
                {unassigned.length > 0 ? (
                  unassigned.map((g) => <DraggableStudent key={g.id} guest={g} />)
                ) : (
                  <p className="text-center text-slate-400 font-medium italic pt-4">
                    Todos los alumnos tienen equipo.
                  </p>
                )}
              </DroppableUnassigned>
            </CardContent>
          </Card>

          {/* Requests Hub */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-500/5 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                  Solicitudes Pendientes
                  {requests.length > 0 && (
                    <Badge className="bg-indigo-600 text-white animate-pulse">
                      {requests.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {requests.length > 0 ? (
                    requests.map((req) => (
                      <div
                        key={req.id}
                        className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 font-black text-xs">
                            {req.guest.guest_name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{req.guest.guest_name}</p>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
                              {req.request_type === 'CREATE_TEAM'
                                ? `Quiere crear: ${req.requested_team_name}`
                                : `Se une a: ${req.team?.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRequest(req.id, 'REJECTED')}
                            variant="ghost"
                            className="text-red-500 hover:bg-red-50 rounded-lg h-9 w-9 p-0"
                          >
                            <X size={18} />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRequest(req.id, 'APPROVED')}
                            className="bg-slate-900 hover:bg-emerald-600 rounded-lg h-9 w-9 p-0"
                          >
                            <Check size={18} />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-sm font-medium text-slate-400 italic">
                      No hay solicitudes pendientes.
                    </div>
                  )}
                </div>
              </CardContent>
            </div>

            {/* Teams Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => {
                const members = guests.filter((g) => g.team_id === team.id);
                return (
                  <div
                    key={team.id}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-slate-800 text-lg truncate max-w-[150px]">
                        {team.name}
                      </h4>
                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg">
                        {members.length} MIEMBROS
                      </span>
                    </div>
                    <DroppableTeam team={team}>
                      <div className="flex flex-wrap gap-2">
                        {members.map((m) => (
                          <div className="relative group/student" key={m.id}>
                            <DraggableStudent guest={m} />
                            <button
                              onClick={() =>
                                supabase
                                  .from('session_guests')
                                  .update({ team_id: null })
                                  .eq('id', m.id)
                              }
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/student:opacity-100 transition-opacity z-10 shadow-sm hover:bg-red-600"
                              title="Remover de equipo"
                            >
                              <UserX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {members.length === 0 && (
                        <p className="text-xs text-slate-400 italic pt-2">
                          Arrastra estudiantes aquí
                        </p>
                      )}
                    </DroppableTeam>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
};
