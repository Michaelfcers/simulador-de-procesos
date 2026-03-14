import { useState } from 'react';
import { Badge } from '../../ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  time: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'PRESUPUESTO_INICIAL',
    amount: 250.0,
    description: 'Capital Inicial',
    time: '10:00',
  },
  {
    id: '2',
    type: 'COMPRA_MATERIAL',
    amount: -15.5,
    description: 'Compra de 50 hojas',
    time: '10:15',
  },
];

export function FinanceLedger({
  teamId,
  currentBalance,
}: {
  teamId: string;
  currentBalance: number;
}) {
  // En la implementación real, esto se suscribirá a `ledger_transactions`
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-slate-500 text-sm uppercase tracking-wider mb-1">
              Saldo Actual
            </CardTitle>
            <span className="text-4xl font-bold text-slate-800">${currentBalance.toFixed(2)}</span>
          </div>
          <Badge variant={currentBalance >= 0 ? 'success' : 'destructive'}>
            {currentBalance >= 0 ? 'Solvente' : 'En Quiebra'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">
          Últimas Transacciones
        </h3>
        <div className="space-y-3 h-[250px] overflow-y-auto pr-2">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-lg"
            >
              <div>
                <p className="font-medium text-slate-700">{t.description}</p>
                <p className="text-xs text-slate-400">{t.time}</p>
              </div>
              <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {t.amount > 0 ? '+' : ''}
                {t.amount.toFixed(2)}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Sin movimientos aún.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
