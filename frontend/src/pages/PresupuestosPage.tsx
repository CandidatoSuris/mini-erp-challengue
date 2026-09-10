import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorBanner } from '../components/ErrorBanner';
import { ApiError } from '../api/client';
import { facturarPresupuesto } from '../api/facturas';
import {
  aprobarPresupuesto,
  listarPresupuestos,
  listarTodosPresupuestos,
  reabrirPresupuesto,
  rechazarPresupuesto,
} from '../api/presupuestos';
import { accionesPara, tituloAccionDeshabilitada } from '../lib/acciones';
import { formatMoney } from '../lib/totales';
import type { PresupuestoDto } from '../types/api';

export function PresupuestosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mostrarTodos = searchParams.get('mostrarTodos') !== 'false';

  const [items, setItems] = useState<PresupuestoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = mostrarTodos
        ? await listarTodosPresupuestos()
        : await listarPresupuestos();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [mostrarTodos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function setMostrarTodos(value: boolean) {
    setSearchParams(value ? { mostrarTodos: 'true' } : { mostrarTodos: 'false' });
  }

  async function runAccion(
    id: number,
    accion: () => Promise<unknown>,
  ) {
    setBusyId(id);
    setError(null);
    try {
      await accion();
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Presupuestos</h1>
          <p className="muted">Mini ERP — gestión de presupuestos y facturación</p>
        </div>
        <Link className="btn btn--primary" to="/nuevo">
          Nuevo presupuesto
        </Link>
      </header>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <div className="toolbar">
        <label className="switch">
          <input
            type="checkbox"
            checked={mostrarTodos}
            onChange={(e) => setMostrarTodos(e.target.checked)}
          />
          <span>Mostrar borradores</span>
        </label>
        <button type="button" className="btn btn--ghost" onClick={() => void cargar()} disabled={loading}>
          Actualizar
        </button>
      </div>

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No hay presupuestos para mostrar.</p>
          {!mostrarTodos && (
            <p className="muted">
              Los borradores están ocultos; activá <strong>Mostrar borradores</strong>.
            </p>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className="num">Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const acciones = accionesPara(p.estado);
                const busy = busyId === p.id;

                return (
                  <tr key={p.id}>
                    <td>{p.numero}</td>
                    <td>{new Date(p.fecha).toLocaleDateString('es-AR')}</td>
                    <td>{p.clienteRazonSocial}</td>
                    <td>
                      <span className={`badge badge--${p.estado.toLowerCase()}`}>{p.estado}</span>
                    </td>
                    <td className="num">{formatMoney(p.total)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={!acciones.aprobar || busy}
                        title={
                          acciones.aprobar
                            ? 'Aprobar presupuesto'
                            : tituloAccionDeshabilitada('aprobar', p.estado)
                        }
                        onClick={() => void runAccion(p.id, () => aprobarPresupuesto(p.id))}
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={!acciones.rechazar || busy}
                        title={
                          acciones.rechazar
                            ? 'Rechazar presupuesto'
                            : tituloAccionDeshabilitada('rechazar', p.estado)
                        }
                        onClick={() => void runAccion(p.id, () => rechazarPresupuesto(p.id))}
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--accent"
                        disabled={!acciones.facturar || busy}
                        title={
                          acciones.facturar
                            ? 'Facturar presupuesto'
                            : tituloAccionDeshabilitada('facturar', p.estado)
                        }
                        onClick={() => void runAccion(p.id, () => facturarPresupuesto(p.id))}
                      >
                        Facturar
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={!acciones.reabrir || busy}
                        title={
                          acciones.reabrir
                            ? 'Reabrir presupuesto'
                            : tituloAccionDeshabilitada('reabrir', p.estado)
                        }
                        onClick={() => void runAccion(p.id, () => reabrirPresupuesto(p.id))}
                      >
                        Reabrir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
