import type { ArticuloDto } from "../types";

export interface LineaCalculo {
  articulo: ArticuloDto;
  cantidad: number;
  descuentoPct: number;
}

export interface Totales {
  subtotal: number;
  iva: number;
  total: number;
}

/** Redondeo a 2 decimales, mitad hacia arriba (igual que Math.Round AwayFromZero en el backend). */
function round2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Replica la regla de negocio del backend (PresupuestoService.CalcularTotales):
 * subtotal por linea = cantidad * precio * (1 - descuento%), IVA por linea segun
 * su propia alicuota redondeado a 2 decimales, y recien despues se suma.
 */
export function calcularTotales(lineas: LineaCalculo[]): Totales {
  let subtotal = 0;
  let iva = 0;

  for (const linea of lineas) {
    const subtotalLinea =
      linea.cantidad * linea.articulo.precioUnitario * (1 - linea.descuentoPct / 100);
    const ivaLinea = round2(subtotalLinea * (linea.articulo.alicuotaIva / 100));

    subtotal += subtotalLinea;
    iva += ivaLinea;
  }

  return {
    subtotal: round2(subtotal),
    iva: round2(iva),
    total: round2(subtotal + iva),
  };
}
