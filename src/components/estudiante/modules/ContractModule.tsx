import { jsPDF } from 'jspdf';
import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

export function ContractModule({ teamId }: { teamId: string }) {
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('1.50'); // Precio de referencia base
  const [loading, setLoading] = useState(false);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Generar PDF en cliente
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('Contrato de Producción', 20, 30);

      doc.setFontSize(12);
      const dateStr = new Date().toLocaleDateString();
      doc.text(`Fecha: ${dateStr}`, 20, 50);
      doc.text(`Empresa ID: ${teamId}`, 20, 60);
      doc.text(`Cantidad Prometida: ${quantity} unidades`, 20, 80);
      doc.text(`Precio Unitario Acordado: $${price}`, 20, 90);

      const total = (Number(quantity) * Number(price)).toFixed(2);
      doc.setFontSize(14);
      doc.text(`Ingreso Bruto Esperado: $${total}`, 20, 110);

      doc.setFontSize(10);
      doc.text('Firma del Representante Legal ___________________________', 20, 150);

      // Simular la descarga en local por ahora (idealmente sube a R2)
      doc.save(`contrato-${teamId}.pdf`);

      console.log('Firmando contrato:', { quantity, price });
      alert('Contrato firmado y PDF generado con éxito.');
    } catch (error) {
      console.error(error);
      alert('Error al generar el contrato PDF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full border-indigo-100 bg-indigo-50/30">
      <CardHeader>
        <CardTitle className="text-indigo-900">Firma de Contrato</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cantidad a Producir (Promesa)
            </label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej. 100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Precio Unitario Acordado ($)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-800"
            />
            <p className="text-xs text-slate-500 mt-1">
              El precio suele ser regulado por el profesor basado en el mercado.
            </p>
          </div>
          <div className="pt-4 border-t border-indigo-100">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="font-medium text-slate-600">Ingreso Esperado:</span>
              <span className="font-bold text-indigo-700 text-lg">
                ${(Number(quantity || 0) * Number(price || 0)).toFixed(2)}
              </span>
            </div>
            <Button type="submit" className="w-full h-12" disabled={loading || !quantity}>
              {loading ? 'Generando Contrato...' : 'Firmar y Generar PDF'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
