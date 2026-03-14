import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Package,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface WarehouseItem {
  id?: string;
  name: string;
  price: number;
  category: string;
}

interface ProductionRubric {
  id?: string;
  label: string;
  price_per_unit: number;
  description: string;
}

interface BankRule {
  id?: string;
  min_amount: number;
  max_amount: number | null;
  guarantee_amount: number;
}

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  interest_rate: number;
  starting_cash: number;
  is_active: boolean;
}

export function TemplateEditor({ templateId }: { templateId?: string }) {
  const [activeTab, setActiveTab] = useState<'general' | 'warehouse' | 'production' | 'bank'>(
    'general'
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [general, setGeneral] = useState<TemplateData>({
    name: '',
    description: '',
    interest_rate: 10,
    starting_cash: 150,
    is_active: true,
  });

  const [warehouse, setWarehouse] = useState<WarehouseItem[]>([]);
  const [production, setProduction] = useState<ProductionRubric[]>([]);
  const [bank, setBank] = useState<BankRule[]>([]);

  useEffect(() => {
    if (templateId) {
      loadTemplateData();
    }
  }, [templateId]);

  const loadTemplateData = async () => {
    setLoading(true);
    try {
      const [tplRes, itemsRes, rubricsRes, bankRes] = await Promise.all([
        supabase.from('game_templates').select('*').eq('id', templateId).single(),
        supabase.from('template_items').select('*').eq('template_id', templateId),
        supabase.from('template_production_rubrics').select('*').eq('template_id', templateId),
        supabase
          .from('template_bank_rules')
          .select('*')
          .eq('template_id', templateId)
          .order('min_amount'),
      ]);

      if (tplRes.data) setGeneral(tplRes.data);
      if (itemsRes.data) setWarehouse(itemsRes.data);
      if (rubricsRes.data) setProduction(rubricsRes.data);
      if (bankRes.data) setBank(bankRes.data);
    } catch (err) {
      setError('Error al cargar los datos de la plantilla');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let currentId = templateId;

      // 1. Save General Template Info
      if (currentId) {
        await supabase.from('game_templates').update(general).eq('id', currentId);
      } else {
        const { data, error } = await supabase
          .from('game_templates')
          .insert(general)
          .select()
          .single();
        if (error) throw error;
        currentId = data.id;
      }

      // 2. Sync Warehouse Items (Delete old, insert all new for simplicity in this version)
      // Note: A more robust version would use upserts or diffing
      await supabase.from('template_items').delete().eq('template_id', currentId);
      if (warehouse.length > 0) {
        await supabase
          .from('template_items')
          .insert(warehouse.map((item) => ({ ...item, template_id: currentId, id: undefined })));
      }

      // 3. Sync Production Rubrics
      await supabase.from('template_production_rubrics').delete().eq('template_id', currentId);
      if (production.length > 0) {
        await supabase
          .from('template_production_rubrics')
          .insert(
            production.map((rubric) => ({ ...rubric, template_id: currentId, id: undefined }))
          );
      }

      // 4. Sync Bank Rules
      await supabase.from('template_bank_rules').delete().eq('template_id', currentId);
      if (bank.length > 0) {
        await supabase
          .from('template_bank_rules')
          .insert(bank.map((rule) => ({ ...rule, template_id: currentId, id: undefined })));
      }

      setSuccess(true);
      if (!templateId) {
        window.location.href = `/profesor/plantillas/${currentId}`;
      }
    } catch (err: any) {
      setError(err.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for dynamic lists
  const addItem = () =>
    setWarehouse([...warehouse, { name: 'Nuevo Item', price: 0, category: 'GENERAL' }]);
  const removeItem = (index: number) => setWarehouse(warehouse.filter((_, i) => i !== index));

  const addRubric = () =>
    setProduction([...production, { label: 'Nuevo Rubro', price_per_unit: 0, description: '' }]);
  const removeRubric = (index: number) => setProduction(production.filter((_, i) => i !== index));

  const addBankRule = () =>
    setBank([...bank, { min_amount: 0, max_amount: null, guarantee_amount: 0 }]);
  const removeBankRule = (index: number) => setBank(bank.filter((_, i) => i !== index));

  if (loading)
    return <div className="p-20 text-center text-slate-400 font-medium">Cargando editor...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <a
            href="/profesor/plantillas"
            className="text-slate-400 hover:text-indigo-600 flex items-center gap-1 text-sm font-bold uppercase tracking-wider mb-2 transition-colors"
          >
            <ChevronLeft size={16} /> Volver a Plantillas
          </a>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {templateId ? 'Editar Plantilla' : 'Nueva Plantilla'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {success && (
            <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={18} /> Guardado con éxito
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 animate-in fade-in zoom-in duration-300">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 py-6 font-bold shadow-xl shadow-indigo-100 transition-all active:scale-95 gap-2"
          >
            {saving ? (
              'Guardando...'
            ) : (
              <>
                <Save size={20} /> Guardar Todo
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="space-y-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center justify-between ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100'}`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={20} /> Datos Generales
            </div>
            <ChevronRight
              size={16}
              className={activeTab === 'general' ? 'opacity-100' : 'opacity-0'}
            />
          </button>

          <button
            onClick={() => setActiveTab('warehouse')}
            className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center justify-between ${activeTab === 'warehouse' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100'}`}
          >
            <div className="flex items-center gap-3">
              <Package size={20} /> Bodega e Items
            </div>
            <ChevronRight
              size={16}
              className={activeTab === 'warehouse' ? 'opacity-100' : 'opacity-0'}
            />
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center justify-between ${activeTab === 'production' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100'}`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 size={20} /> Rubros Producción
            </div>
            <ChevronRight
              size={16}
              className={activeTab === 'production' ? 'opacity-100' : 'opacity-0'}
            />
          </button>

          <button
            onClick={() => setActiveTab('bank')}
            className={`w-full text-left p-4 rounded-2xl font-bold transition-all flex items-center justify-between ${activeTab === 'bank' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100'}`}
          >
            <div className="flex items-center gap-3">
              <Landmark size={20} /> Reglas del Banco
            </div>
            <ChevronRight
              size={16}
              className={activeTab === 'bank' ? 'opacity-100' : 'opacity-0'}
            />
          </button>
        </aside>

        {/* Content Area */}
        <div className="md:col-span-3">
          {activeTab === 'general' && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                <CardTitle className="text-2xl font-black text-slate-900">
                  Configuración Base
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Nombre de la Plantilla
                    </label>
                    <input
                      type="text"
                      value={general.name}
                      onChange={(e) => setGeneral({ ...general, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                      placeholder="Ej: Manufactura Básica"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Estado
                    </label>
                    <select
                      value={general.is_active ? 'active' : 'inactive'}
                      onChange={(e) =>
                        setGeneral({ ...general, is_active: e.target.value === 'active' })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                    >
                      <option value="active">Activa</option>
                      <option value="inactive">Inactiva</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Descripción
                    </label>
                    <textarea
                      value={general.description}
                      onChange={(e) => setGeneral({ ...general, description: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none min-h-[120px]"
                      placeholder="Breve descripción del escenario de simulación..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Interés Préstamos (%)
                    </label>
                    <input
                      type="number"
                      value={general.interest_rate}
                      onChange={(e) =>
                        setGeneral({ ...general, interest_rate: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-blue-600 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                      Efectivo Inicial ($)
                    </label>
                    <input
                      type="number"
                      value={general.starting_cash}
                      onChange={(e) =>
                        setGeneral({ ...general, starting_cash: Number(e.target.value) })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'warehouse' && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    Catálogo de Bodega
                  </CardTitle>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Materiales y herramientas disponibles para compra.
                  </p>
                </div>
                <Button
                  onClick={addItem}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl gap-2 font-bold"
                >
                  <Plus size={18} /> Agregar Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-8 py-4">Nombre del Item</th>
                      <th className="px-8 py-4">Precio ($)</th>
                      <th className="px-8 py-4">Categoría</th>
                      <th className="px-8 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {warehouse.map((item, index) => (
                      <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => {
                              const newW = [...warehouse];
                              newW[index].name = e.target.value;
                              setWarehouse(newW);
                            }}
                            className="bg-transparent border-none p-0 font-bold text-slate-800 w-full focus:ring-0"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => {
                              const newW = [...warehouse];
                              newW[index].price = Number(e.target.value);
                              setWarehouse(newW);
                            }}
                            className="bg-slate-100/50 border-none rounded-lg px-3 py-1 font-black text-indigo-600 w-24 focus:ring-0"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <select
                            value={item.category}
                            onChange={(e) => {
                              const newW = [...warehouse];
                              newW[index].category = e.target.value;
                              setWarehouse(newW);
                            }}
                            className="bg-transparent border-none p-0 font-bold text-slate-500 text-xs focus:ring-0"
                          >
                            <option value="GENERAL">General</option>
                            <option value="MATERIAL">Material</option>
                            <option value="HERRAMIENTA">Herramienta</option>
                            <option value="OTROS">Otros</option>
                          </select>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {warehouse.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 italic">
                          No hay items en el catálogo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'production' && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    Rubros de Evaluación
                  </CardTitle>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Cómo se pagará el producto terminado.
                  </p>
                </div>
                <Button
                  onClick={addRubric}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2 font-bold"
                >
                  <Plus size={18} /> Agregar Rubro
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-8 py-4">Etiqueta/Categoría</th>
                      <th className="px-8 py-4">Precio x Unidad ($)</th>
                      <th className="px-8 py-4">Descripción</th>
                      <th className="px-8 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {production.map((rubric, index) => (
                      <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <input
                            type="text"
                            value={rubric.label}
                            onChange={(e) => {
                              const newP = [...production];
                              newP[index].label = e.target.value;
                              setProduction(newP);
                            }}
                            className="bg-transparent border-none p-0 font-bold text-slate-800 w-full focus:ring-0"
                            placeholder="Ej: Producto Aceptable"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input
                            type="number"
                            value={rubric.price_per_unit}
                            onChange={(e) => {
                              const newP = [...production];
                              newP[index].price_per_unit = Number(e.target.value);
                              setProduction(newP);
                            }}
                            className="bg-emerald-50 border-none rounded-lg px-3 py-1 font-black text-emerald-700 w-24 focus:ring-0"
                          />
                        </td>
                        <td className="px-8 py-4">
                          <input
                            type="text"
                            value={rubric.description}
                            onChange={(e) => {
                              const newP = [...production];
                              newP[index].description = e.target.value;
                              setProduction(newP);
                            }}
                            className="bg-transparent border-none p-0 text-slate-500 italic text-xs w-full focus:ring-0"
                            placeholder="Detalles del criterio..."
                          />
                        </td>
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => removeRubric(index)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {production.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 italic">
                          No hay rubros de evaluación.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {activeTab === 'bank' && (
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
              <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    Escalas de Préstamo
                  </CardTitle>
                  <p className="text-slate-500 text-sm font-medium mt-1">
                    Garantías requeridas según monto solicitado.
                  </p>
                </div>
                <Button
                  onClick={addBankRule}
                  className="bg-amber-600 hover:bg-amber-700 rounded-xl gap-2 font-bold text-white"
                >
                  <Plus size={18} /> Agregar Escala
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-8 py-4">Min Monto ($)</th>
                      <th className="px-8 py-4">Max Monto ($)</th>
                      <th className="px-8 py-4">Garantía ($)</th>
                      <th className="px-8 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bank.map((rule, index) => (
                      <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <input
                            type="number"
                            value={rule.min_amount}
                            onChange={(e) => {
                              const newB = [...bank];
                              newB[index].min_amount = Number(e.target.value);
                              setBank(newB);
                            }}
                            className="bg-slate-100 border-none rounded-lg px-3 py-1 font-bold text-slate-800 w-24 focus:ring-0"
                          />
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={rule.max_amount || ''}
                              onChange={(e) => {
                                const newB = [...bank];
                                newB[index].max_amount = e.target.value
                                  ? Number(e.target.value)
                                  : null;
                                setBank(newB);
                              }}
                              disabled={rule.max_amount === null}
                              className={`bg-slate-100 border-none rounded-lg px-3 py-1 font-bold text-slate-800 w-24 focus:ring-0 ${rule.max_amount === null ? 'opacity-30' : ''}`}
                              placeholder="∞"
                            />
                            <button
                              onClick={() => {
                                const newB = [...bank];
                                newB[index].max_amount =
                                  newB[index].max_amount === null ? 100 : null;
                                setBank(newB);
                              }}
                              className="text-[10px] uppercase font-black text-indigo-600 hover:text-indigo-800"
                            >
                              {rule.max_amount === null ? 'Fijar tope' : 'A Infinito'}
                            </button>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <input
                            type="number"
                            value={rule.guarantee_amount}
                            onChange={(e) => {
                              const newB = [...bank];
                              newB[index].guarantee_amount = Number(e.target.value);
                              setBank(newB);
                            }}
                            className="bg-amber-50 border-none rounded-lg px-3 py-1 font-black text-amber-700 w-24 focus:ring-0"
                          />
                        </td>
                        <td className="px-8 py-6 text-right">
                          <button
                            onClick={() => removeBankRule(index)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {bank.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center text-slate-400 italic">
                          No hay escalas bancarias.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
