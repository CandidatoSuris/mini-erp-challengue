import type { Totales } from "../hooks/usePresupuestoForm";

function formatearMoneda(valor: number) {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TotalesSummary({ totales }: { totales: Totales }) {
  return (
    <dl className="totales">
      <div className="totales__row">
        <dt>Subtotal</dt>
        <dd>${formatearMoneda(totales.subtotal)}</dd>
      </div>
      <div className="totales__row">
        <dt>IVA</dt>
        <dd>${formatearMoneda(totales.iva)}</dd>
      </div>
      <div className="totales__row totales__row--total">
        <dt>Total</dt>
        <dd>${formatearMoneda(totales.total)}</dd>
      </div>
    </dl>
  );
}
