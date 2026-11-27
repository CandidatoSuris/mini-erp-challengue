import { useCallback, useEffect, useState } from "react";
import { presupuestosService } from "../services/presupuestosService";
import type { Presupuesto } from "../types/dtos";

/** Lista + elimina presupuestos. El alta vive en useCrearPresupuesto para no refetchear la grilla desde la pagina de alta. */
export function usePresupuestos() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refrescar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPresupuestos(await presupuestosService.listar());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los presupuestos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refrescar();
  }, [refrescar]);

  const eliminar = useCallback(
    async (id: number) => {
      await presupuestosService.eliminar(id);
      await refrescar();
    },
    [refrescar],
  );

  return { presupuestos, loading, error, refrescar, eliminar };
}
