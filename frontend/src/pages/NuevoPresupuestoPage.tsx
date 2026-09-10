import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArticuloSearch } from '../components/ArticuloSearch';
import { ErrorBanner } from '../components/ErrorBanner';
import { LineaItem } from '../components/LineaItem';
import { TotalesBar } from '../components/TotalesBar';
import { ApiError } from '../api/client';
import { listarClientes } from '../api/clientes';
import { crearPresupuesto } from '../api/presupuestos';
import { calcularTotales } from '../lib/totales';
import type { ArticuloDto, ClienteDto, LineaEditor } from '../types/api';

export function NuevoPresupuestoPage() {
  const navigate = useNavigate();
  const formId = useId();

  const [clientes, setClientes] = useState<ClienteDto[]>([]);
  const [clienteId, setClienteId] = useState<number>(0);
  const [validezDias, setValidezDias] = useState(15);
  const [lineas, setLineas] = useState<LineaEditor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await listarClientes();
        setClientes(data);
        if (data.length > 0) setClienteId(data[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes');
      } finally {
        setLoadingClientes(false);
      }
    })();
  }, []);

  const totales = useMemo(() => calcularTotales(lineas), [lineas]);

  function agregarArticulo(articulo: ArticuloDto) {
    setLineas((prev) => {
      const existente = prev.find((l) => l.articuloId === articulo.id);
      if (existente) {
        return prev.map((l) =>
          l.articuloId === articulo.id ? { ...l, cantidad: l.cantidad + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          key: `${articulo.id}-${Date.now()}`,
          articuloId: articulo.id,
          codigo: articulo.codigo,
          descripcion: articulo.descripcion,
          cantidad: 1,
          precioUnitario: articulo.precioUnitario,
          descuentoPct: 0,
          alicuotaIva: articulo.alicuotaIva,
        },
      ];
    });
  }

  function patchLinea(key: string, patch: Partial<LineaEditor>) {
    setLineas((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLinea(key: string) {
    setLineas((prev) => prev.filter((l) => l.key !== key));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clienteId) {
      setError('Seleccioná un cliente.');
      return;
    }
    if (lineas.length === 0) {
      setError('Agregá al menos un artículo.');
      return;
    }
    if (lineas.some((l) => l.cantidad <= 0)) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }
    if (lineas.some((l) => l.descuentoPct < 0 || l.descuentoPct > 100)) {
      setError('El descuento debe estar entre 0 y 100.');
      return;
    }

    setSaving(true);
    try {
      await crearPresupuesto({
        clienteId,
        validezDias,
        items: lineas.map((l) => ({
          articuloId: l.articuloId,
          cantidad: l.cantidad,
          descuentoPct: l.descuentoPct,
        })),
      });
      navigate('/?mostrarTodos=true');
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'No se pudo crear el presupuesto',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Nuevo presupuesto</h1>
          <p className="muted">Alta con totales en vivo</p>
        </div>
        <Link className="btn btn--ghost" to="/?mostrarTodos=true">
          Volver al listado
        </Link>
      </header>

      <div className="disclaimer" role="note">
        <strong>Nota:</strong> el presupuesto se crea en estado <strong>Borrador</strong>. En la
        grilla solo aparece si <em>Mostrar borradores</em> está activo (o en el listado completo).
        Tras guardar, se abrirá el listado con borradores visibles.
      </div>

      <ErrorBanner message={error} onClose={() => setError(null)} />

      <form id={formId} className="form-stack" onSubmit={onSubmit}>
        <div className="form-row">
          <label htmlFor="cliente">Cliente</label>
          <select
            id="cliente"
            value={clienteId || ''}
            disabled={loadingClientes}
            onChange={(e) => setClienteId(Number(e.target.value))}
            required
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial} ({c.cuit})
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="validez">Validez (días)</label>
          <input
            id="validez"
            type="number"
            min={1}
            value={validezDias}
            onChange={(e) => setValidezDias(Number(e.target.value) || 1)}
          />
        </div>

        <ArticuloSearch onSelect={agregarArticulo} />

        {lineas.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th className="num">Precio</th>
                  <th className="num">IVA</th>
                  <th>Cant.</th>
                  <th>Desc. %</th>
                  <th className="num">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <LineaItem
                    key={l.key}
                    linea={l}
                    onChange={patchLinea}
                    onRemove={removeLinea}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Todavía no hay líneas. Buscá y agregá artículos.</p>
        )}

        <TotalesBar totales={totales} />

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Crear presupuesto'}
          </button>
        </div>
      </form>
    </div>
  );
}
