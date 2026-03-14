import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface Team {
  id: string;
  name: string;
  contracts: { promised_quantity: number }[];
}

interface Rubric {
  id: string;
  label: string;
  price_per_unit: number;
}

export function EvaluationForm({ sessionId }: { sessionId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [session, setSession] = useState<any>(null);
  const [evaluations, setEvaluations] = useState<Record<string, Record<string, number>>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Get Session Template ID
      const { data: sessionData, error: sessionErr } = await supabase
        .from('sessions')
        .select('template_id')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        setSession(sessionData);
        // 2. Get Teams and Rubrics in parallel
        const [teamsRes, rubricsRes] = await Promise.all([
          supabase
            .from('teams')
            .select('id, name, contracts(promised_quantity)')
            .eq('session_id', sessionId),
          supabase
            .from('template_production_rubrics')
            .select('*')
            .eq('template_id', sessionData.template_id),
        ]);

        if (teamsRes.data) setTeams(teamsRes.data);
        if (rubricsRes.data) setRubrics(rubricsRes.data);
      }
      setLoading(false);
    };

    fetchData();
  }, [sessionId]);

  const calculateTotal = (teamId: string) => {
    const teamEval = evaluations[teamId] || {};
    return Object.entries(teamEval).reduce((sum, [rubricId, qty]) => {
      const rubric = rubrics.find((r) => r.id === rubricId);
      return sum + (rubric ? rubric.price_per_unit * qty : 0);
    }, 0);
  };

  const handleSave = async (teamId: string) => {
    const teamEval = evaluations[teamId];
    if (!teamEval || Object.keys(teamEval).length === 0) {
      alert('Por favor agrega al menos una cantidad en los rubros.');
      return;
    }

    setSaving(teamId);
    try {
      // 1. Create or update evaluation
      const { data: evalData, error: evalErr } = await supabase
        .from('evaluations')
        .upsert({
          team_id: teamId,
          notes: notes[teamId] || '',
        })
        .select()
        .single();

      if (evalErr) throw evalErr;

      // 2. Delete existing items and insert new ones
      await supabase.from('evaluation_items').delete().eq('evaluation_id', evalData.id);

      const itemsToInsert = Object.entries(teamEval)
        .filter(([_, qty]) => qty > 0)
        .map(([rubricId, qty]) => ({
          evaluation_id: evalData.id,
          rubric_id: rubricId,
          quantity: qty,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('evaluation_items').insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      // 3. Update Team Balance and Ledger
      const totalToPay = calculateTotal(teamId);

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('current_cash')
        .eq('id', teamId)
        .single();

      if (teamErr) throw teamErr;

      const { error: updateErr } = await supabase
        .from('teams')
        .update({ current_cash: team.current_cash + totalToPay })
        .eq('id', teamId);

      if (updateErr) throw updateErr;

      // 4. Register income in ledger
      await supabase.from('ledger_transactions').insert({
        team_id: teamId,
        type: 'INCOME',
        category: 'VENTA_PRODUCTO',
        amount: totalToPay,
        description: `Pago por entrega de sobres (Evaluación Final)`,
      });

      alert('Evaluación guardada y pago procesado con éxito.');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando evaluador...</div>;

  return (
    <Card className="border-indigo-100 shadow-xl shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <CardTitle className="text-2xl font-black text-slate-900">
              Evaluación de Entrega
            </CardTitle>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Califica los productos físicos entregados por cada equipo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {rubrics.map((r) => (
              <div
                key={r.id}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {r.label}
                </span>
                <span className="text-xs font-black text-emerald-600">${r.price_per_unit}</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Empresa
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Contrato
                </th>
                {
                  rubrics.map((r) => (
                    <th
                      key={r.id}
                      className="px-6 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center"
                    >
                      {r.label}
                    </th>
                  )) /* slide */
                }
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                  Liquidación
                </th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teams.length > 0 ? (
                teams.map((team) => (
                  <tr key={team.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-black text-slate-900 text-lg">{team.name}</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-sm font-bold text-slate-600">
                          {team.contracts?.[0]?.promised_quantity || 0}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          UNIDADES
                        </span>
                      </div>
                    </td>

                    {rubrics.map((r) => (
                      <td key={r.id} className="px-4 py-6 text-center">
                        <input
                          type="number"
                          min="0"
                          className="w-20 p-3 bg-white border-2 border-slate-100 rounded-2xl text-center font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                          placeholder="0"
                          value={evaluations[team.id]?.[r.id] || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setEvaluations({
                              ...evaluations,
                              [team.id]: { ...(evaluations[team.id] || {}), [r.id]: val },
                            });
                          }}
                        />
                      </td>
                    ))}

                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex flex-col items-end">
                        <span className="text-xl font-black text-emerald-600">
                          ${calculateTotal(team.id).toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          A PAGAR
                        </span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <Button
                        size="lg"
                        disabled={saving === team.id}
                        onClick={() => handleSave(team.id)}
                        className="rounded-2xl bg-slate-900 hover:bg-indigo-600 shadow-lg hover:shadow-indigo-200 transition-all font-bold text-xs uppercase tracking-widest px-6"
                      >
                        {saving === team.id ? '...' : 'Procesar'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5 + rubrics.length}
                    className="px-8 py-20 text-center text-slate-400 font-medium italic"
                  >
                    Esperando equipos para la evaluación física.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
