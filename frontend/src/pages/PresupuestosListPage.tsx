import { useState } from "react";
import { Link } from "react-router-dom";
import { usePresupuestos } from "../hooks/usePresupuestos";
import { useFacturar } from "../hooks/useFacturar";
import { PresupuestosTable } from "../components/PresupuestosTable";
import { ErrorAlert } from "../components/ErrorAlert";

export function PresupuestosListPage() {
  const { presupuestos, loading, error, refrescar, eliminar } = usePresupuestos();
  const { facturar, facturandoId, errores } = useFacturar();
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const handleEliminar = async (id: number) => {
    if (!window.confirm("¿Eliminar este presupuesto?")) return;
    setErrorEliminar(null);
    try {
      await eliminar(id);
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : "No se pudo eliminar el presupuesto.");
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1>Presupuestos</h1>
        <Link to="/nuevo" className="button">
          Nuevo presupuesto
        </Link>
      </div>

      {error && <ErrorAlert message={error} />}
      {errorEliminar && <ErrorAlert message={errorEliminar} />}

      {loading ? (
        <p className="empty-hint">Cargando...</p>
      ) : (
        <PresupuestosTable
          presupuestos={presupuestos}
          facturandoId={facturandoId}
          erroresFacturacion={errores}
          onFacturar={(id) => facturar(id, refrescar)}
          onEliminar={handleEliminar}
        />
      )}
    </div>
  );
}
