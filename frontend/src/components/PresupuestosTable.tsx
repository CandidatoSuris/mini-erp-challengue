import { Link } from "react-router-dom";
import type { Presupuesto } from "../types/dtos";
import { EstadoBadge } from "./EstadoBadge";

function formatearMoneda(valor: number) {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR");
}

interface Props {
  presupuestos: Presupuesto[];
  facturandoId: number | null;
  erroresFacturacion: Record<number, string>;
  onFacturar: (id: number) => void;
  onEliminar: (id: number) => void;
}

export function PresupuestosTable({ presupuestos, facturandoId, erroresFacturacion, onFacturar, onEliminar }: Props) {
  if (presupuestos.length === 0) {
    return (
      <p className="empty-hint">
        No hay presupuestos todavía. <Link to="/nuevo">Creá el primero.</Link>
      </p>
    );
  }

  return (
    <table className="presupuestos-table">
      <thead>
        <tr>
          <th>N°</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Estado</th>
          <th>Total</th>
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {presupuestos.map((p) => (
          <tr key={p.id}>
            <td>{p.numero}</td>
            <td>{formatearFecha(p.fecha)}</td>
            <td>{p.clienteRazonSocial}</td>
            <td>
              <EstadoBadge estado={p.estado} />
            </td>
            <td>${formatearMoneda(p.total)}</td>
            <td className="presupuestos-table__acciones">
              <div className="presupuestos-table__botones">
                {p.estado !== "Facturado" && (
                  <button
                    type="button"
                    className="button button--small"
                    disabled={facturandoId === p.id}
                    onClick={() => onFacturar(p.id)}
                  >
                    {facturandoId === p.id ? "Facturando..." : "Facturar"}
                  </button>
                )}
                <Link to={`/nuevo?duplicarDe=${p.id}`} className="link-button">
                  Duplicar
                </Link>
                <button type="button" className="link-button" onClick={() => onEliminar(p.id)}>
                  Eliminar
                </button>
              </div>
              {erroresFacturacion[p.id] && <div className="alert alert--error alert--inline">{erroresFacturacion[p.id]}</div>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
