import { ClipboardCheck, Factory, Flag, GraduationCap, Play } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';

type SessionStatus =
  | 'ESPERA'
  | 'PLANIFICACION'
  | 'COMPRAS_PRODUCCION'
  | 'EVALUACION'
  | 'FINALIZADO';

const STATE_FLOW: {
  status: SessionStatus;
  label: string;
  icon: any;
  next: SessionStatus | null;
  prev: SessionStatus | null;
  action: string;
  desc: string;
}[] = [
  {
    status: 'ESPERA',
    label: '1. Espera',
    icon: Play,
    next: 'PLANIFICACION',
    prev: null,
    action: 'Iniciar Planificación',
    desc: 'Los estudiantes se están uniendo.',
  },
  {
    status: 'PLANIFICACION',
    label: '2. Planificación',
    icon: ClipboardCheck,
    next: 'COMPRAS_PRODUCCION',
    prev: 'ESPERA',
    action: 'Abrir Bodega y Banco',
    desc: 'Los equipos están firmando contratos.',
  },
  {
    status: 'COMPRAS_PRODUCCION',
    label: '3. Producción',
    icon: Factory,
    next: 'EVALUACION',
    prev: 'PLANIFICACION',
    action: 'Detener Producción',
    desc: 'Compras y créditos habilitados.',
  },
  {
    status: 'EVALUACION',
    label: '4. Evaluación',
    icon: GraduationCap,
    next: 'FINALIZADO',
    prev: 'COMPRAS_PRODUCCION',
    action: 'Finalizar Sesión',
    desc: 'Calificando entregas físicas.',
  },
  {
    status: 'FINALIZADO',
    label: '5. Terminado',
    icon: Flag,
    next: null,
    prev: 'EVALUACION',
    action: '',
    desc: 'Sesión concluida.',
  },
];

export function SessionController({
  sessionId,
  currentStatus,
  onStatusChange,
}: {
  sessionId: string;
  currentStatus: SessionStatus;
  onStatusChange?: (newStatus: SessionStatus) => void;
}) {
  const [loading, setLoading] = useState(false);

  const currentStepIndex = STATE_FLOW.findIndex((s) => s.status === currentStatus);
  const flow = STATE_FLOW[currentStepIndex];

  const updateState = async (newStatus: SessionStatus) => {
    if (loading) return;
    setLoading(true);

    try {
      // Optimistic update
      if (onStatusChange) {
        onStatusChange(newStatus);
      }

      const { error } = await supabase
        .from('sessions')
        .update({ status: newStatus })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating session state:', err);
      // Revert optimistic update
      if (onStatusChange) {
        onStatusChange(currentStatus);
      }
      alert('Error al actualizar el estado de la sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-indigo-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl font-black text-slate-900">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
            <Play size={20} fill="currentColor" />
          </div>
          Control de Sesión
        </CardTitle>
        <CardDescription className="text-slate-500 font-medium">
          Avanza la simulación fase por fase.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          {STATE_FLOW.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const Icon = step.icon;

            return (
              <button
                key={step.status}
                onClick={() => {
                  if (!isCurrent) {
                    if (confirm(`¿Cambiar a fase: ${step.label}?`)) {
                      updateState(step.status);
                    }
                  }
                }}
                disabled={loading}
                className={`w-full p-4 rounded-2xl border flex gap-4 transition-all duration-300 text-left group ${
                  isCurrent
                    ? 'bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isCurrent
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110'
                      : 'bg-indigo-50 text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`font-black text-sm uppercase tracking-wider ${
                        isCurrent
                          ? 'text-emerald-900'
                          : 'text-slate-400 group-hover:text-indigo-900'
                      }`}
                    >
                      {step.label}
                    </h3>
                    {isCurrent && (
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-1 font-medium ${
                      isCurrent ? 'text-emerald-700' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  >
                    {step.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {currentStatus === 'FINALIZADO' && (
          <div className="pt-4 mt-6 border-t border-slate-100 italic text-[10px] text-slate-400 text-center uppercase font-bold tracking-widest">
            Simulación Concluida
          </div>
        )}

        <button
          onClick={async () => {
            if (
              confirm('¿Estás seguro de finalizar esta sesión? Esta acción no se puede deshacer.')
            ) {
              const { error } = await supabase
                .from('sessions')
                .update({ status: 'FINALIZADO' })
                .eq('id', sessionId);
              if (!error) {
                if (onStatusChange) onStatusChange('FINALIZADO');
                else window.location.reload();
              }
            }
          }}
          className="w-full mt-6 py-4 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest border-t border-slate-50 pt-8"
        >
          Finalizar sesión definitivamente
        </button>
      </CardContent>
    </Card>
  );
}
