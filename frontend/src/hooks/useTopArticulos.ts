import { useCallback, useState } from "react";
import { reportesService } from "../services/reportesService";
import type { TopArticulo } from "../types/dtos";

/** Dispara la consulta a pedido (no auto-fetch al montar): no hay un rango de fechas por defecto razonable. */
export function useTopArticulos() {
  const [resultados, setResultados] = useState<TopArticulo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async (desde: string, hasta: string, top: number) => {
    setLoading(true);
    setError(null);
    try {
      setResultados(await reportesService.topArticulos(desde, hasta, top));
    } catch (err) {
      setResultados(null);
      setError(err instanceof Error ? err.message : "No se pudo cargar el reporte.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { resultados, loading, error, buscar };
}
