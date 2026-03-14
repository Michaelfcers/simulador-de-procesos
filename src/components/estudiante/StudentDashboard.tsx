import { CheckCircle2, Lock, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent } from '../ui/Card';
import { TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { BankModule } from './modules/BankModule';
import { ContractModule } from './modules/ContractModule';
import { FinanceLedger } from './modules/FinanceLedger';
import { InventoryModule } from './modules/InventoryModule';

export function StudentDashboard({
  teamId,
  initialStatus,
  sessionId,
}: {
  teamId: string;
  initialStatus: string;
  sessionId: string;
}) {
  const [activeTab, setActiveTab] = useState('bodega');
  const [status, setStatus] = useState(initialStatus);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Suscripción a la sesión (para cambios de fase)
    const sessionChannel = supabase
      .channel(`student-session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        (payload: any) => setStatus(payload.new.status)
      )
      .subscribe();

    // Suscripción al equipo (para cambios de saldo en tiempo real)
    const teamChannel = supabase
      .channel(`student-team-${teamId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'teams', filter: `id=eq.${teamId}` },
        (payload: any) => setBalance(payload.new.current_cash)
      )
      .subscribe();

    // Carga inicial de datos
    const loadInitialData = async () => {
      const { data } = await supabase
        .from('teams')
        .select('current_cash')
        .eq('id', teamId)
        .single();
      if (data) setBalance(data.current_cash);
    };
    loadInitialData();

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(teamChannel);
    };
  }, [sessionId, teamId]);

  const isPlanning = status === 'PLANIFICACION';
  const isProd = status === 'COMPRAS_PRODUCCION';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Panel Izquierdo: Libro Mayor */}
      <div className="lg:col-span-1">
        <FinanceLedger teamId={teamId} currentBalance={balance} />
      </div>

      {/* Panel Derecho: Interfaz de Operaciones Condicional */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {status === 'ESPERA' && (
          <Card className="h-full border-slate-200 flex items-center justify-center p-12 bg-slate-50">
            <CardContent className="text-center flex flex-col items-center">
              <Lock size={48} className="text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-700">Módulos Bloqueados</h3>
              <p className="text-slate-500 mt-2 max-w-md">
                El profesor debe habilitar la fase de Planificación para poder interactuar con los
                sistemas.
              </p>
            </CardContent>
          </Card>
        )}

        {isPlanning && (
          <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
            <ContractModule teamId={teamId} />
          </div>
        )}

        {isProd && (
          <Card className="h-full border-slate-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <TabsList className="grid w-full grid-cols-2 max-w-sm">
                <TabsTrigger active={activeTab === 'bodega'} onClick={() => setActiveTab('bodega')}>
                  Bodega e Inventario (Producción)
                </TabsTrigger>
                <TabsTrigger active={activeTab === 'banco'} onClick={() => setActiveTab('banco')}>
                  Banco (Inversión)
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6 flex-1 min-h-[400px]">
              <TabsContent active={activeTab === 'bodega'} className="h-full">
                <InventoryModule teamId={teamId} />
              </TabsContent>
              <TabsContent
                active={activeTab === 'banco'}
                className="h-full flex justify-center items-center"
              >
                <div className="w-full max-w-md">
                  <BankModule teamId={teamId} />
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        )}

        {status === 'EVALUACION' && (
          <Card className="h-full border-indigo-200 flex items-center justify-center p-12 bg-indigo-50/50 animate-in zoom-in-95 duration-500">
            <CardContent className="text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-2xl font-black text-indigo-900 mb-2 font-display uppercase tracking-tight">
                Evaluación Final
              </h3>
              <p className="text-indigo-700 font-medium max-w-md">
                La producción ha cerrado. Entreguen sus sobres al profesor para que él pueda
                calificarlos y realizar el pago correspondiente.
              </p>
            </CardContent>
          </Card>
        )}

        {status === 'FINALIZADO' && (
          <Card className="h-full border-emerald-200 flex items-center justify-center p-12 bg-emerald-50/50">
            <CardContent className="text-center flex flex-col items-center">
              <CheckCircle2 size={48} className="text-emerald-600 mb-4" />
              <h3 className="text-2xl font-black text-emerald-900 mb-2 font-display uppercase tracking-tight">
                Simulación Concluida
              </h3>
              <p className="text-emerald-700 font-medium max-w-md">
                La sesión ha terminado. Pueden revisar el libro mayor a la izquierda para ver su
                resultado financiero final.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
