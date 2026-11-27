import { useEffect, useState } from "react";
import { presupuestosService } from "../services/presupuestosService";
import { articulosService } from "../services/articulosService";
import type { Articulo, ItemBorrador } from "../types/dtos";

export interface DatosDuplicado {
  numeroOriginal: number;
  clienteId: number;
  validezDias: number;
  items: ItemBorrador[];
}

/**
 * Trae un presupuesto existente + los articulos actuales (para el preview de
 * totales con precios ya refrescados) y arma los datos para precargar el form de
 * alta. El refresco "de verdad" lo hace igual el backend en CrearAsync al
 * confirmar — esto es sólo para que el preview no muestre precios viejos.
 */
export function useDuplicarPresupuesto(presupuestoId: number | null) {
  const [datos, setDatos] = useState<DatosDuplicado | null>(null);
  const [loading, setLoading] = useState(presupuestoId !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presupuestoId === null) {
      setDatos(null);
      setLoading(false);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    Promise.all([presupuestosService.obtener(presupuestoId), articulosService.buscar("")])
      .then(([original, articulosActuales]) => {
        if (cancelado) return;

        const actualesPorId = new Map<number, Articulo>(articulosActuales.map((a) => [a.id, a]));

        const items: ItemBorrador[] = original.items.map((item) => ({
          // Si el articulo ya no esta en el catalogo, caemos al snapshot guardado en el item.
          articulo: actualesPorId.get(item.articuloId) ?? {
            id: item.articuloId,
            codigo: item.articuloCodigo,
            descripcion: item.articuloDescripcion,
            precioUnitario: item.precioUnitario,
            stockActual: 0,
            alicuotaIva: item.alicuotaIva,
          },
          cantidad: item.cantidad,
          descuentoPct: item.descuentoPct,
        }));

        setDatos({
          numeroOriginal: original.numero,
          clienteId: original.clienteId,
          validezDias: original.validezDias,
          items,
        });
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "No se pudo cargar el presupuesto a duplicar.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [presupuestoId]);

  return { datos, loading, error };
}
