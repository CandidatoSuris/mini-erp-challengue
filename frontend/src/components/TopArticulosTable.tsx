import type { TopArticulo } from "../types/dtos";

function formatearMoneda(valor: number) {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TopArticulosTable({ resultados }: { resultados: TopArticulo[] }) {
  if (resultados.length === 0) {
    return <p className="empty-hint">No hay facturación de artículos en ese rango de fechas.</p>;
  }

  return (
    <table className="presupuestos-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Código</th>
          <th>Artículo</th>
          <th>Cantidad facturada</th>
          <th>Monto facturado</th>
        </tr>
      </thead>
      <tbody>
        {resultados.map((r, i) => (
          <tr key={r.articuloId}>
            <td>{i + 1}</td>
            <td>{r.codigo}</td>
            <td>{r.descripcion}</td>
            <td>{r.cantidadFacturada}</td>
            <td>${formatearMoneda(r.montoFacturado)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
