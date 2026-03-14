import {
  ArrowRight,
  Check,
  ExternalLink,
  FileText,
  History as HistoryIcon,
  Landmark,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface Request {
  id: string;
  type: 'CONTRATO' | 'PRESTAMO';
  teamName: string;
  amount: number;
  details: string;
  status: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  pdf_url?: string;
  created_at: string;
}

export function RequestsHub({ sessionId }: { sessionId: string }) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);

    const [contractsRes, loansRes] = await Promise.all([
      supabase
        .from('contracts')
        .select(
          `
          id, promised_quantity, agreed_price_per_unit, pdf_r2_url, status, created_at, 
          teams!inner(name, session_id)
        `
        )
        .eq('teams.session_id', sessionId)
        .order('created_at', { ascending: false }),
      supabase
        .from('loans')
        .select(
          `
          id, amount, interest_rate, status, created_at, 
          teams!inner(name, session_id)
        `
        )
        .eq('teams.session_id', sessionId)
        .order('created_at', { ascending: false }),
    ]);

    const combined: Request[] = [];

    if (contractsRes.data) {
      contractsRes.data.forEach((c: any) => {
        combined.push({
          id: c.id,
          type: 'CONTRATO',
          teamName: c.teams.name,
          amount: c.promised_quantity,
          details: `$${c.agreed_price_per_unit} c/u`,
          status: c.status,
          pdf_url: c.pdf_r2_url,
          created_at: c.created_at,
        });
      });
    }

    if (loansRes.data) {
      loansRes.data.forEach((l: any) => {
        combined.push({
          id: l.id,
          type: 'PRESTAMO',
          teamName: l.teams.name,
          amount: l.amount,
          details: `${l.interest_rate}% Interés`,
          status: l.status,
          created_at: l.created_at,
        });
      });
    }

    setRequests(combined);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    // Suscribirse a cambios en tiempo real si es necesario
    const channel = supabase
      .channel('requests-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () =>
        fetchRequests()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () =>
        fetchRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const handleAction = async (
    id: string,
    type: 'CONTRATO' | 'PRESTAMO',
    action: 'APROBAR' | 'RECHAZAR'
  ) => {
    const table = type === 'CONTRATO' ? 'contracts' : 'loans';
    const finalStatus = action === 'APROBAR' ? 'APROBADO' : 'RECHAZADO';

    const { error } = await supabase.from(table).update({ status: finalStatus }).eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      fetchRequests();
    }
  };

  const pending = requests.filter((r) => r.status === 'PENDIENTE');
  const history = requests.filter((r) => r.status !== 'PENDIENTE').slice(0, 10);

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-medium italic">
        Sincronizando solicitudes...
      </div>
    );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Columna: Pendientes */}
      <Card className="border-indigo-100 shadow-sm rounded-3xl overflow-hidden bg-white">
        <CardHeader className="bg-indigo-50/30 border-b border-indigo-100/50 p-6">
          <CardTitle className="flex justify-between items-center text-lg font-black text-indigo-900 uppercase tracking-tight">
            SOLICITUDES EN VIVO
            <Badge className="bg-indigo-600 text-white border-none px-3 py-1 rounded-lg">
              {pending.length} ACTIVAS
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {pending.length > 0 ? (
              pending.map((req) => (
                <div
                  key={req.id}
                  className="p-6 hover:bg-slate-50/50 transition-all duration-300 flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${req.type === 'CONTRATO' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}
                      >
                        {req.type === 'CONTRATO' ? <FileText size={18} /> : <Landmark size={18} />}
                      </div>
                      <div>
                        <span className="font-black text-slate-900 block">{req.teamName}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                          {req.type}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">
                      {req.type === 'CONTRATO' ? 'Compromiso:' : 'Crédito:'}{' '}
                      <span className="font-black text-slate-900">
                        {req.type === 'CONTRATO' ? `${req.amount} unidades` : `$${req.amount}`}
                      </span>
                      <span className="mx-2 text-slate-300">•</span>
                      <span className="text-slate-500 italic text-xs">{req.details}</span>
                    </p>

                    {req.type === 'CONTRATO' && req.pdf_url && (
                      <a
                        href={req.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-indigo-600 hover:text-white hover:bg-indigo-600 bg-white px-4 py-2 rounded-xl transition-all border border-indigo-100 shadow-sm"
                      >
                        <FileText size={14} />
                        Revisar PDF <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-100 h-11 px-4"
                      onClick={() => handleAction(req.id, req.type, 'RECHAZAR')}
                    >
                      <X size={18} />
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 gap-2 h-11 px-6 font-bold"
                      onClick={() => handleAction(req.id, req.type, 'APROBAR')}
                    >
                      <Check size={18} />
                      Aprobar
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 italic">
                <Check size={48} className="text-emerald-500/20 mb-4" />
                <p className="font-medium">No hay solicitudes pendientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Columna: Historial Reciente */}
      <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-white/50">
        <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
            <HistoryIcon size={16} />
          </div>
          <CardTitle className="text-sm font-black text-slate-600 uppercase tracking-widest">
            Historial de Decisiones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-50">
            {history.length > 0 ? (
              history.map((req) => (
                <div
                  key={req.id}
                  className="p-4 flex items-center justify-between gap-4 opacity-75"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${req.status === 'APROBADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
                    >
                      {req.status === 'APROBADO' ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 text-sm block leading-none mb-1">
                        {req.teamName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                        {req.type} <ArrowRight size={8} /> {req.status}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    {new Date(req.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">
                Sin actividad reciente
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
