import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

export function BankModule({ teamId }: { teamId: string }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Interés fijo para la simulación
  const INTEREST_RATE = 10;

  const handleLoanRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Insertar en 'loans' con estado PENDIENTE. Profesor aprueba.
    console.log('Solicitando préstamo:', { amount, INTEREST_RATE });
    setTimeout(() => {
      alert('Solicitud enviada al profesor/banquero.');
      setLoading(false);
      setAmount('');
    }, 800);
  };

  return (
    <Card className="border-amber-100 bg-gradient-to-br from-amber-50/50 to-white overflow-hidden relative">
      <div className="absolute right-0 top-0 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>

      <CardHeader>
        <CardTitle className="text-amber-900 flex items-center gap-2">
          Banco Nacional Estudiantil
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10">
        <p className="text-sm text-slate-600 mb-6">
          ¿Te quedaste sin capital para materia prima? Solicita un crédito. La tasa de interés
          actual es del <span className="font-bold text-amber-700">{INTEREST_RATE}%</span> para el
          periodo de simulación.
        </p>

        <form onSubmit={handleLoanRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto Solicitado ($)
            </label>
            <input
              type="number"
              required
              min="5"
              step="5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-4 rounded-xl border border-amber-200 bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-medium"
              placeholder="Ej. 150"
            />
          </div>

          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-amber-700">Interés a pagar al cierre:</span>
              <span className="font-bold text-amber-900">
                ${(Number(amount || 0) * (INTEREST_RATE / 100)).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-amber-800">Total a deducir en Evaluación:</span>
              <span className="font-bold text-amber-900 text-base">
                ${(Number(amount || 0) * (1 + INTEREST_RATE / 100)).toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white"
            disabled={loading || !amount}
          >
            {loading ? 'Procesando...' : 'Solicitar Crédito'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
