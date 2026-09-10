export interface ItemParaTotales {
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  alicuotaIva: number;
}

export interface Totales {
  subtotal: number;
  iva: number;
  total: number;
}

/** Espeja PresupuestoService.CalcularTotales del backend. */
export function calcularTotales(items: ItemParaTotales[]): Totales {
  let subtotal = 0;
  let iva = 0;

  for (const item of items) {
    const subtotalLinea =
      item.cantidad * item.precioUnitario * (1 - item.descuentoPct / 100);
    const ivaLinea = subtotalLinea * (item.alicuotaIva / 100);
    subtotal += subtotalLinea;
    iva += ivaLinea;
  }

  return { subtotal, iva, total: subtotal + iva };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
