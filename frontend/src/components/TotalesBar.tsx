import { formatMoney } from '../lib/totales';
import type { Totales } from '../lib/totales';

interface TotalesBarProps {
  totales: Totales;
}

export function TotalesBar({ totales }: TotalesBarProps) {
  return (
    <div className="totales-bar">
      <div>
        <span className="totales-bar__label">Subtotal</span>
        <strong>{formatMoney(totales.subtotal)}</strong>
      </div>
      <div>
        <span className="totales-bar__label">IVA</span>
        <strong>{formatMoney(totales.iva)}</strong>
      </div>
      <div>
        <span className="totales-bar__label">Total</span>
        <strong className="totales-bar__total">{formatMoney(totales.total)}</strong>
      </div>
    </div>
  );
}
