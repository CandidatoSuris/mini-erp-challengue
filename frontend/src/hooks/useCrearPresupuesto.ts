import { useCallback, useState } from "react";
import { presupuestosService } from "../services/presupuestosService";
import type { CrearPresupuestoRequest, Presupuesto } from "../types/dtos";

export function useCrearPresupuesto() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const crear = useCallback(async (request: CrearPresupuestoRequest): Promise<Presupuesto | null> => {
    setEnviando(true);
    setError(null);
    try {
      return await presupuestosService.crear(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el presupuesto.");
      return null;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { crear, enviando, error };
}
