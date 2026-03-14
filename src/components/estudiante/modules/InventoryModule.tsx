import { Info, Loader2, Package, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';

interface Item {
  id: string;
  name: string;
  price: number;
  type: string;
  stock?: number;
}

export function InventoryModule({ teamId }: { teamId: string }) {
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      // Obtener el ID de la sesión del equipo para saber qué plantilla usar
      const { data: team } = await supabase
        .from('teams')
        .select('session_id')
        .eq('id', teamId)
        .single();

      if (team) {
        const { data: session } = await supabase
          .from('sessions')
          .select('template_id')
          .eq('id', team.session_id)
          .single();

        if (session) {
          const { data: items } = await supabase
            .from('template_items')
            .select('*')
            .eq('template_id', session.template_id);

          if (items) setCatalog(items);
        }
      }
      setLoading(false);
    };

    fetchCatalog();
  }, [teamId]);

  const handlePurchase = async (item: Item) => {
    const qty = quantities[item.id] || 0;
    if (qty <= 0) return;

    setBuying(item.id);
    try {
      // 1. Obtener balance actual del equipo
      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('current_cash')
        .eq('id', teamId)
        .single();

      if (teamErr) throw teamErr;

      const totalCost = item.price * qty;
      if (team.current_cash < totalCost) {
        alert('Saldo insuficiente en la cuenta de la empresa.');
        return;
      }

      // 2. Realizar la compra (Descontar dinero y registrar en ledger)
      const { error: updateErr } = await supabase
        .from('teams')
        .update({ current_cash: team.current_cash - totalCost })
        .eq('id', teamId);

      if (updateErr) throw updateErr;

      // 3. Registrar transacción
      await supabase.from('ledger_transactions').insert({
        team_id: teamId,
        type: 'EXPENSE',
        category: 'COMPRA_MATERIAL',
        amount: totalCost,
        description: `Compra de ${qty} x ${item.name}`,
      });

      // 4. Agregar al inventario (En una BDD real usaríamos una tabla inventory,
      // pero por ahora podemos registrarlo como un evento o en una tabla simple si existe)
      // Si no existe tabla 'inventory', la creamos o usamos un log.

      alert(`¡Compra exitosa! Has adquirido ${qty} ${item.name}.`);
      setQuantities({ ...quantities, [item.id]: 0 });
    } catch (err: any) {
      alert('Error en la transacción: ' + err.message);
    } finally {
      setBuying(null);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="animate-spin mb-2" />
        <p>Cargando catálogo de materiales...</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
          <ShoppingCart size={20} className="text-indigo-600" />
          Catálogo del Almacén
        </h3>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {catalog.map((item) => (
          <Card
            key={item.id}
            className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group"
          >
            <CardContent className="p-5 flex flex-col h-full">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-black text-slate-900 leading-tight">{item.name}</h4>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {item.type}
                  </span>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg font-black text-sm">
                  ${item.price.toFixed(2)}
                </div>
              </div>

              <div className="mt-auto pt-4 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={quantities[item.id] || ''}
                  onChange={(e) =>
                    setQuantities({ ...quantities, [item.id]: parseInt(e.target.value) || 0 })
                  }
                  className="w-16 h-10 rounded-xl border-slate-200 bg-slate-50 text-center font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all"
                />
                <Button
                  onClick={() => handlePurchase(item)}
                  disabled={buying === item.id || !quantities[item.id] || quantities[item.id] <= 0}
                  className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-indigo-600 font-bold text-xs uppercase tracking-widest gap-2"
                  size="sm"
                >
                  {buying === item.id ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Package size={14} />
                  )}
                  Comprar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {catalog.length === 0 && (
        <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Info className="mx-auto text-slate-300 mb-2" size={32} />
          <p className="text-slate-500 font-medium">
            No hay materiales configurados para este juego.
          </p>
        </div>
      )}
    </div>
  );
}
