import { ArrowRight, Landmark, Package, Play, Shapes, Warehouse } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Template {
  id: string;
  name: string;
  interest_rate: number;
  starting_cash: number;
}

interface TemplateItem {
  id: string;
  template_id: string;
  name: string;
  price: number;
  item_type: string;
}

interface TemplateRubric {
  id: string;
  label: string;
  price_per_unit: number;
}

interface BankRule {
  id: string;
  min_amount: number;
  max_amount: number | null;
  guarantee_amount: number;
}

export const NewGameFlow: React.FC<{ professorId?: string }> = ({ professorId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [templateRubrics, setTemplateRubrics] = useState<TemplateRubric[]>([]);
  const [bankRules, setBankRules] = useState<BankRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('game_templates')
        .select(
          `
        *,
        template_items(*),
        template_production_rubrics(*),
        template_bank_rules(count)
      `
        )
        .eq('is_active', true);
      if (data) setTemplates(data);
    };
    fetchTemplates();
  }, []);

  const handleSelectTemplate = async (template: any) => {
    setLoading(true);
    setSelectedTemplate(template);

    const [itemsRes, rubricsRes, bankRes] = await Promise.all([
      supabase.from('template_items').select('*').eq('template_id', template.id),
      supabase.from('template_production_rubrics').select('*').eq('template_id', template.id),
      supabase
        .from('template_bank_rules')
        .select('*')
        .eq('template_id', template.id)
        .order('min_amount', { ascending: true }),
    ]);

    if (itemsRes.data) setTemplateItems(itemsRes.data);
    if (rubricsRes.data) setTemplateRubrics(rubricsRes.data);
    if (bankRes.data) setBankRules(bankRes.data);

    setStep(2);
    setLoading(false);
  };
  const handleCreateSession = async () => {
    if (!selectedTemplate || loading) return;
    setLoading(true);

    try {
      let userId = professorId;

      if (!userId) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      }

      if (!userId) throw new Error('No se pudo verificar el usuario autenticado');

      // Generar código de unión único: 4 letras del nombre + 4 números aleatorios
      const prefix =
        selectedTemplate.name
          .replace(/[^a-zA-Z]/g, '')
          .substring(0, 4)
          .toUpperCase() || 'GAME';
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const joinCode = `${prefix}-${randomCode}`;

      const { data: newSession, error: sessionErr } = await supabase
        .from('sessions')
        .insert({
          template_id: selectedTemplate.id,
          professor_id: userId,
          join_code: joinCode,
          status: 'ESPERA',
        })
        .select()
        .single();

      if (sessionErr) {
        if (sessionErr.code === '23505') {
          // Error de clave duplicada (join_code)
          return handleCreateSession(); // Reintentar con otro código
        }
        throw sessionErr;
      }

      if (newSession) {
        window.location.href = `/profesor`;
      }
    } catch (err: any) {
      console.error('Error creating session:', err);
      alert(`No se pudo crear la sesión: ${err.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };
  if (step === 1) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 shadow-xl shadow-indigo-100/50">
          <Play size={40} fill="currentColor" />
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-4 text-center">
          ¿Listo para una nueva sesión?
        </h2>
        <p className="text-slate-500 mb-12 max-w-md text-center font-medium italic">
          Selecciona una plantilla de juego para configurar el entorno de simulación para tus
          alumnos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl">
          {templates.map((tpl: any) => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 group flex flex-col cursor-pointer hover:-translate-y-1 active:scale-95"
            >
              <div className="p-10 flex-1">
                <div className="flex justify-between items-start mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-3xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:from-indigo-600 group-hover:to-indigo-500 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                    <Shapes size={32} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-xl border bg-green-50 text-green-700 border-green-100">
                      Activa
                    </span>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                      ID: {tpl.id.substring(0, 8)}
                    </p>
                  </div>
                </div>

                <h3 className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                  {tpl.name}
                </h3>

                <div className="flex flex-wrap items-center gap-2 mt-4 text-[10px] font-black uppercase tracking-wider">
                  <div className="px-3 py-1 bg-blue-50 rounded-lg text-blue-600 border border-blue-100/50">
                    Interés: <span className="text-blue-900">{tpl.interest_rate}%</span>
                  </div>
                  <div className="px-3 py-1 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100/50">
                    Efectivo Inicial: <span className="text-indigo-900">${tpl.starting_cash}</span>
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Preview Bodega */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-slate-800 font-bold text-sm">
                      <div className="flex items-center gap-2">
                        <Package size={18} className="text-amber-500" />
                        Bodega
                      </div>
                      <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">
                        {tpl.template_items?.length || 0} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {tpl.template_items?.slice(0, 3).map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center text-xs py-2 px-3 bg-slate-50/50 rounded-xl border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all"
                        >
                          <span className="text-slate-600 font-medium truncate pr-2">
                            {item.name}
                          </span>
                          <span className="text-slate-900 font-bold">${item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Rubros y Banco */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-slate-800 font-bold text-sm">
                        <div className="flex items-center gap-2">
                          <Landmark size={18} className="text-emerald-500" />
                          Rubros Venta
                        </div>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">
                          {tpl.template_production_rubrics?.length || 0} rubros
                        </span>
                      </div>
                      <div className="space-y-2">
                        {tpl.template_production_rubrics
                          ?.slice(0, 2)
                          .map((rubric: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs py-2 px-3 bg-slate-50/50 rounded-xl border border-slate-50 group-hover:bg-white group-hover:border-slate-100 transition-all"
                            >
                              <span className="text-slate-600 font-medium truncate pr-2">
                                {rubric.label}
                              </span>
                              <span className="text-emerald-600 font-bold">
                                ${rubric.price_per_unit}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 group-hover:bg-white transition-all">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Landmark size={18} className="text-indigo-400" />
                        <span className="text-xs font-bold text-slate-700">Reglas Banco</span>
                      </div>
                      <span className="text-[10px] font-black bg-indigo-600 text-white px-2.5 py-1 rounded-lg">
                        {tpl.template_bank_rules?.[0]?.count || 0} ESCALAS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300">
                <span className="text-sm font-black text-indigo-600 group-hover:text-white uppercase tracking-widest flex items-center gap-2">
                  Seleccionar Plantilla <ArrowRight size={18} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => setStep(1)}
            className="text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 mb-2"
          >
            ← Cambiar plantilla
          </button>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Configuración: <span className="text-indigo-600">{selectedTemplate?.name}</span>
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setStep(1)}
            className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition-all uppercase tracking-widest text-[10px]"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateSession}
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 flex items-center gap-2"
          >
            {loading ? (
              'Cargando...'
            ) : (
              <>
                Crear Sesión <Play size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card: Producción */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-emerald-50/30 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Producción</h3>
              <p className="text-xs text-slate-500">Rubros y estados de compra</p>
            </div>
          </div>
          <div className="p-6 flex-1 space-y-4">
            {templateRubrics.length > 0 ? (
              templateRubrics.map((rubric) => (
                <div
                  key={rubric.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <span className="text-sm font-medium text-slate-700">{rubric.label}</span>
                  <span className="text-sm font-bold text-emerald-600">
                    ${rubric.price_per_unit}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm py-10">
                Sin rubros configurados
              </div>
            )}
          </div>
        </div>

        {/* Card: Bodega */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-amber-50/30 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Warehouse size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Bodega</h3>
              <p className="text-xs text-slate-500">Materiales y costos base</p>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto max-h-[350px]">
            {templateItems.length > 0 ? (
              <div className="space-y-3">
                {templateItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700">{item.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-tight">
                        {item.item_type}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${item.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-sm">
                No hay items definidos
              </div>
            )}
          </div>
        </div>

        {/* Card: Banco */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 bg-blue-50/30 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Banco</h3>
              <p className="text-xs text-slate-500">Políticas de crédito</p>
            </div>
          </div>
          <div className="p-6 flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-100">
                  <th className="font-bold py-2 text-left">Préstamo</th>
                  <th className="font-bold py-2 text-right">Garantías</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bankRules.length > 0 ? (
                  bankRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="py-2 text-slate-600">
                        {rule.max_amount
                          ? `${rule.min_amount} - ${rule.max_amount}`
                          : `Más ${rule.min_amount}`}
                      </td>
                      <td className="py-2 text-right font-bold text-slate-900">
                        ${rule.guarantee_amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                      Sin escalas configuradas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
                  Interés
                </p>
                <p className="text-lg font-bold text-blue-700">
                  {selectedTemplate?.interest_rate}%
                </p>
              </div>
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">
                  Efectivo Inicial
                </p>
                <p className="text-lg font-bold text-indigo-700">
                  ${selectedTemplate?.starting_cash.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
