import { useEffect, useState } from "react";
import { articulosService } from "../services/articulosService";
import type { Articulo } from "../types/dtos";

export function useArticuloSearch(query: string, debounceMs = 300) {
  const [resultados, setResultados] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const termino = query.trim();
    if (termino.length === 0) {
      setResultados([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);

    const timeout = setTimeout(() => {
      articulosService
        .buscar(termino)
        .then((data) => {
          if (!cancelado) setResultados(data);
        })
        .catch((err) => {
          if (!cancelado) setError(err instanceof Error ? err.message : "Error al buscar artículos.");
        })
        .finally(() => {
          if (!cancelado) setLoading(false);
        });
    }, debounceMs);

    return () => {
      cancelado = true;
      clearTimeout(timeout);
    };
  }, [query, debounceMs]);

  return { resultados, loading, error };
}
