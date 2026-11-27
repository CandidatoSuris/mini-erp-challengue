import { useCallback, useState } from "react";
import { facturasService } from "../services/facturasService";

export function useFacturar() {
  const [facturandoId, setFacturandoId] = useState<number | null>(null);
  const [errores, setErrores] = useState<Record<number, string>>({});

  const facturar = useCallback(async (presupuestoId: number, onExito?: () => Promise<void> | void) => {
    setFacturandoId(presupuestoId);
    setErrores((prev) => {
      const { [presupuestoId]: _omitido, ...resto } = prev;
      return resto;
    });

    try {
      await facturasService.facturar(presupuestoId);
      await onExito?.();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo facturar.";
      setErrores((prev) => ({ ...prev, [presupuestoId]: mensaje }));
    } finally {
      setFacturandoId(null);
    }
  }, []);

  return { facturar, facturandoId, errores };
}
