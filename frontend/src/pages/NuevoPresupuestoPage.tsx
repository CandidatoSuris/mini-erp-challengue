import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useClientes } from "../hooks/useClientes";
import { useArticuloSearch } from "../hooks/useArticuloSearch";
import { usePresupuestoForm } from "../hooks/usePresupuestoForm";
import { useCrearPresupuesto } from "../hooks/useCrearPresupuesto";
import { useDuplicarPresupuesto } from "../hooks/useDuplicarPresupuesto";
import { ClienteSelect } from "../components/ClienteSelect";
import { ArticuloSearchBox } from "../components/ArticuloSearchBox";
import { PresupuestoItemsEditor } from "../components/PresupuestoItemsEditor";
import { TotalesSummary } from "../components/TotalesSummary";
import { ErrorAlert } from "../components/ErrorAlert";
import type { Articulo } from "../types/dtos";

const VALIDEZ_DIAS_DEFAULT = 15;

export function NuevoPresupuestoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const duplicarDeId = (() => {
    const raw = searchParams.get("duplicarDe");
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) ? id : null;
  })();

  const { clientes, loading: clientesLoading, error: clientesError } = useClientes();
  const { datos: datosDuplicado, loading: cargandoDuplicado, error: duplicadoError } = useDuplicarPresupuesto(duplicarDeId);

  const [busqueda, setBusqueda] = useState("");
  const { resultados, loading: buscandoArticulos, error: busquedaError } = useArticuloSearch(busqueda);

  const { items, agregarItem, actualizarCantidad, actualizarDescuento, quitarItem, reemplazarItems, totales } = usePresupuestoForm();
  const { crear, enviando, error: crearError } = useCrearPresupuesto();

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [validezDias, setValidezDias] = useState(VALIDEZ_DIAS_DEFAULT);
  const [validacion, setValidacion] = useState<string | null>(null);

  const duplicadoAplicado = useRef<number | null>(null);
  useEffect(() => {
    if (!datosDuplicado || duplicadoAplicado.current === duplicarDeId) return;
    duplicadoAplicado.current = duplicarDeId;
    setClienteId(datosDuplicado.clienteId);
    setValidezDias(datosDuplicado.validezDias);
    reemplazarItems(datosDuplicado.items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datosDuplicado, duplicarDeId]);

  const handleSeleccionarArticulo = (articulo: Articulo) => {
    agregarItem(articulo);
    setBusqueda("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidacion(null);

    if (!clienteId) {
      setValidacion("Elegí un cliente.");
      return;
    }
    if (items.length === 0) {
      setValidacion("Agregá al menos un artículo.");
      return;
    }
    if (items.some((i) => i.cantidad <= 0)) {
      setValidacion("La cantidad tiene que ser mayor a cero en todas las líneas.");
      return;
    }
    if (items.some((i) => i.descuentoPct < 0 || i.descuentoPct > 100)) {
      setValidacion("El descuento tiene que estar entre 0 y 100 en todas las líneas.");
      return;
    }

    const creado = await crear({
      clienteId,
      validezDias,
      items: items.map((i) => ({
        articuloId: i.articulo.id,
        cantidad: i.cantidad,
        descuentoPct: i.descuentoPct,
      })),
    });

    if (creado) navigate("/");
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1>{duplicarDeId ? "Duplicar presupuesto" : "Nuevo presupuesto"}</h1>
      </div>

      {duplicarDeId && cargandoDuplicado && <p className="empty-hint">Cargando presupuesto #{duplicarDeId}...</p>}
      {duplicarDeId && datosDuplicado && !cargandoDuplicado && (
        <div className="callout-info">
          Duplicando el presupuesto #{datosDuplicado.numeroOriginal}. Los precios se refrescaron a los actuales — revisá
          cantidades y descuentos antes de confirmar.
        </div>
      )}
      {duplicadoError && <ErrorAlert message={duplicadoError} />}
      {clientesError && <ErrorAlert message={clientesError} />}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <ClienteSelect clientes={clientes} value={clienteId} onChange={setClienteId} disabled={clientesLoading} />

          <label className="field">
            <span className="field__label">Validez (días)</span>
            <input
              className="field__control"
              type="number"
              min={1}
              value={validezDias}
              onChange={(e) => setValidezDias(Number(e.target.value))}
            />
          </label>
        </div>

        <ArticuloSearchBox
          query={busqueda}
          onQueryChange={setBusqueda}
          resultados={resultados}
          loading={buscandoArticulos}
          error={busquedaError}
          onSeleccionar={handleSeleccionarArticulo}
        />

        <PresupuestoItemsEditor
          items={items}
          onCantidadChange={actualizarCantidad}
          onDescuentoChange={actualizarDescuento}
          onQuitar={quitarItem}
        />

        <TotalesSummary totales={totales} />

        {validacion && <ErrorAlert message={validacion} />}
        {crearError && <ErrorAlert message={crearError} />}

        <div className="form__actions">
          <button type="submit" className="button" disabled={enviando}>
            {enviando ? "Creando..." : "Crear presupuesto"}
          </button>
        </div>
      </form>
    </div>
  );
}
