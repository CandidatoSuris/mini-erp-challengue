import type { PresupuestoDto } from "../types";

interface Props {
  presupuestos: PresupuestoDto[];
  onFacturar: (id: number) => void;
  onEliminar: (id: number) => void;
  onNuevo: () => void;
  errorPorPresupuesto: Record<number, string>;
}

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function PresupuestosGrid({
  presupuestos,
  onFacturar,
  onEliminar,
  onNuevo,
  errorPorPresupuesto,
}: Props) {
  return (
    <div className="grid-container">
      <div className="grid-header">
        <h2>Presupuestos</h2>
        <button onClick={onNuevo}>+ Nuevo presupuesto</button>
      </div>

      {presupuestos.length === 0 ? (
        <p>No hay presupuestos todavia.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {presupuestos.map((p) => (
              <tr key={p.id}>
                <td>{p.numero}</td>
                <td>{p.clienteRazonSocial}</td>
                <td>{new Date(p.fecha).toLocaleDateString("es-AR")}</td>
                <td>
                  <span className={`estado estado-${p.estado.toLowerCase()}`}>
                    {p.estado}
                  </span>
                </td>
                <td>{formatoMoneda.format(p.total)}</td>
                <td className="acciones">
                  <button
                    disabled={p.estado === "Facturado"}
                    onClick={() => onFacturar(p.id)}
                  >
                    Facturar
                  </button>
                  <button className="secundario" onClick={() => onEliminar(p.id)}>
                    Eliminar
                  </button>
                  {errorPorPresupuesto[p.id] && (
                    <div className="error-inline">{errorPorPresupuesto[p.id]}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
