import { useEffect, useState } from "react";
import { buscarArticulos, crearPresupuesto } from "../api/client";
import type { ArticuloDto, ClienteDto } from "../types";
import { calcularTotales } from "../utils/totales";

interface LineaForm {
  articulo: ArticuloDto;
  cantidad: number;
  descuentoPct: number;
}

interface Props {
  clientes: ClienteDto[];
  onCreado: () => void;
  onCancelar: () => void;
}

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function PresupuestoForm({ clientes, onCreado, onCancelar }: Props) {
  const [clienteId, setClienteId] = useState<number | "">("");
  const [validezDias, setValidezDias] = useState(15);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<ArticuloDto[]>([]);
  const [lineas, setLineas] = useState<LineaForm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!busqueda.trim()) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      buscarArticulos(busqueda).then(setResultados).catch(() => setResultados([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  function agregarLinea(articulo: ArticuloDto) {
    if (lineas.some((l) => l.articulo.id === articulo.id)) return;
    setLineas([...lineas, { articulo, cantidad: 1, descuentoPct: 0 }]);
    setBusqueda("");
    setResultados([]);
  }

  function actualizarLinea(articuloId: number, campo: "cantidad" | "descuentoPct", valor: number) {
    setLineas(
      lineas.map((l) => (l.articulo.id === articuloId ? { ...l, [campo]: valor } : l))
    );
  }

  function quitarLinea(articuloId: number) {
    setLineas(lineas.filter((l) => l.articulo.id !== articuloId));
  }

  const totales = calcularTotales(lineas);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (clienteId === "") {
      setError("Elegi un cliente.");
      return;
    }
    if (lineas.length === 0) {
      setError("Agrega al menos un articulo.");
      return;
    }

    setGuardando(true);
    try {
      await crearPresupuesto({
        clienteId,
        validezDias,
        items: lineas.map((l) => ({
          articuloId: l.articulo.id,
          cantidad: l.cantidad,
          descuentoPct: l.descuentoPct,
        })),
      });
      onCreado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el presupuesto.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="presupuesto-form" onSubmit={handleSubmit}>
      <h2>Nuevo presupuesto</h2>

      <div className="campo">
        <label>Cliente</label>
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.razonSocial}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label>Validez (dias)</label>
        <input
          type="number"
          min={1}
          value={validezDias}
          onChange={(e) => setValidezDias(Number(e.target.value))}
        />
      </div>

      <div className="campo">
        <label>Buscar articulo</label>
        <input
          type="text"
          placeholder="Codigo o descripcion..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {resultados.length > 0 && (
          <ul className="resultados-busqueda">
            {resultados.map((a) => (
              <li key={a.id} onClick={() => agregarLinea(a)}>
                <strong>{a.codigo}</strong> - {a.descripcion} ({formatoMoneda.format(a.precioUnitario)},
                stock {a.stockActual})
              </li>
            ))}
          </ul>
        )}
      </div>

      {lineas.length > 0 && (
        <table className="lineas-table">
          <thead>
            <tr>
              <th>Articulo</th>
              <th>Cantidad</th>
              <th>Descuento %</th>
              <th>Subtotal linea</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => {
              const subtotalLinea =
                l.cantidad * l.articulo.precioUnitario * (1 - l.descuentoPct / 100);
              return (
                <tr key={l.articulo.id}>
                  <td>
                    {l.articulo.codigo} - {l.articulo.descripcion}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={l.cantidad}
                      onChange={(e) =>
                        actualizarLinea(l.articulo.id, "cantidad", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={l.descuentoPct}
                      onChange={(e) =>
                        actualizarLinea(l.articulo.id, "descuentoPct", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>{formatoMoneda.format(subtotalLinea)}</td>
                  <td>
                    <button type="button" className="secundario" onClick={() => quitarLinea(l.articulo.id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="totales">
        <div>Subtotal: {formatoMoneda.format(totales.subtotal)}</div>
        <div>IVA: {formatoMoneda.format(totales.iva)}</div>
        <div className="total-final">Total: {formatoMoneda.format(totales.total)}</div>
      </div>

      {error && <div className="error-inline">{error}</div>}

      <div className="acciones-form">
        <button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Crear presupuesto"}
        </button>
        <button type="button" className="secundario" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
