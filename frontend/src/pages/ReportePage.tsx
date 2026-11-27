import { useState, type FormEvent } from "react";
import { useTopArticulos } from "../hooks/useTopArticulos";
import { TopArticulosTable } from "../components/TopArticulosTable";
import { ErrorAlert } from "../components/ErrorAlert";

function formatearFechaInput(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function primerDiaDelMes() {
  const hoy = new Date();
  return formatearFechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

export function ReportePage() {
  const { resultados, loading, error, buscar } = useTopArticulos();
  const [desde, setDesde] = useState(() => primerDiaDelMes());
  const [hasta, setHasta] = useState(() => formatearFechaInput(new Date()));
  const [top, setTop] = useState(5);
  const [validacion, setValidacion] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidacion(null);

    if (hasta < desde) {
      setValidacion("La fecha 'hasta' no puede ser anterior a 'desde'.");
      return;
    }
    if (top <= 0) {
      setValidacion("'Top' tiene que ser mayor a cero.");
      return;
    }

    buscar(desde, hasta, top);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1>Top artículos facturados</h1>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label className="field">
            <span className="field__label">Desde</span>
            <input className="field__control" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </label>

          <label className="field">
            <span className="field__label">Hasta</span>
            <input className="field__control" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </label>

          <label className="field">
            <span className="field__label">Top</span>
            <input
              className="field__control"
              type="number"
              min={1}
              value={top}
              onChange={(e) => setTop(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="form__actions">
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </form>

      {validacion && <ErrorAlert message={validacion} />}
      {error && <ErrorAlert message={error} />}

      {resultados && <TopArticulosTable resultados={resultados} />}
    </div>
  );
}
