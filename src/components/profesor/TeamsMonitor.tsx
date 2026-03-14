import { Package, TrendingUp, Users, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface TeamProgress {
  id: string;
  name: string;
  cash: number;
  inventory_count: number;
  has_contract: boolean;
}

export function TeamsMonitor({ sessionId }: { sessionId: string }) {
  const [teams, setTeams] = useState<TeamProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamsData = async () => {
    // 1. Get Teams
    const { data: teamsData } = await supabase
      .from('teams')
      .select(
        `
        id, 
        name, 
        contracts(id),
        ledger_transactions(amount),
        team_inventory(quantity)
      `
      )
      .eq('session_id', sessionId);

    if (teamsData) {
      const processed: TeamProgress[] = teamsData.map((t: any) => {
        const cash = t.ledger_transactions.reduce(
          (sum: number, tx: any) => sum + Number(tx.amount),
          0
        );
        const inventory = t.team_inventory.reduce(
          (sum: number, inv: any) => sum + Number(inv.quantity),
          0
        );

        return {
          id: t.id,
          name: t.name,
          cash: cash,
          inventory_count: inventory,
          has_contract: t.contracts.length > 0,
        };
      });
      setTeams(processed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeamsData();

    // Subscribe to changes in ledger and inventory for real-time updates
    const channel = supabase
      .channel('teams-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_transactions' }, () =>
        fetchTeamsData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_inventory' }, () =>
        fetchTeamsData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () =>
        fetchTeamsData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, () =>
        fetchTeamsData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  if (loading)
    return (
      <div className="p-8 text-center text-slate-400 font-medium animate-pulse italic">
        Sincronizando equipos...
      </div>
    );

  return (
    <Card className="border-indigo-100 shadow-xl shadow-indigo-500/5 rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                <Users size={20} />
              </div>
              Monitor de Equipos
            </CardTitle>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Avance financiero e inventario en tiempo real.
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-none px-4 py-1.5 rounded-xl font-black text-[10px] tracking-widest uppercase">
            {teams.length} Empresas activas
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.length > 0 ? (
            teams.map((team) => (
              <div
                key={team.id}
                className="group p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500"
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {team.has_contract ? (
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none text-[10px] px-2 py-0.5 rounded-lg font-bold">
                          CONTRATO FIRMADO
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-500 hover:bg-slate-200 border-none text-[10px] px-2 py-0.5 rounded-lg font-bold">
                          SIN CONTRATO
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-sm text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-all group-hover:-translate-y-1">
                    <TrendingUp size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-600">
                      <Wallet size={48} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Efectivo
                    </p>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-lg font-black ${team.cash >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        ${team.cash.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-2 -bottom-2 opacity-5 text-indigo-600">
                      <Package size={48} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Inventario
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-indigo-600">
                        {team.inventory_count}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">UNDS</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-[2rem]">
              No se han unido equipos a esta sesión todavía.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
