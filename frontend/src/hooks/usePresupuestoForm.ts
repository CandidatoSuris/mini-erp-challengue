import { useMemo, useState } from "react";
import type { Articulo, ItemBorrador } from "../types/dtos";

export interface Totales {
  subtotal: number;
  iva: number;
  total: number;
}

function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Misma regla que PresupuestoService.CalcularTotales en el backend: el IVA se calcula
 * por linea segun la alicuota del articulo, redondeando a 2 decimales por linea, y
 * recien despues se suma. El backend sigue siendo la fuente de verdad; esto es sólo
 * el preview en vivo del formulario.
 */
export function calcularTotales(items: ItemBorrador[]): Totales {
  let subtotal = 0;
  let iva = 0;

  for (const item of items) {
    const subtotalLinea = item.cantidad * item.articulo.precioUnitario * (1 - item.descuentoPct / 100);
    const ivaLinea = redondear2(subtotalLinea * (item.articulo.alicuotaIva / 100));
    subtotal += subtotalLinea;
    iva += ivaLinea;
  }

  return { subtotal, iva, total: subtotal + iva };
}

export function usePresupuestoForm() {
  const [items, setItems] = useState<ItemBorrador[]>([]);

  const agregarItem = (articulo: Articulo) => {
    setItems((prev) => (prev.some((i) => i.articulo.id === articulo.id) ? prev : [...prev, { articulo, cantidad: 1, descuentoPct: 0 }]));
  };

  const actualizarCantidad = (articuloId: number, cantidad: number) => {
    setItems((prev) => prev.map((i) => (i.articulo.id === articuloId ? { ...i, cantidad } : i)));
  };

  const actualizarDescuento = (articuloId: number, descuentoPct: number) => {
    setItems((prev) => prev.map((i) => (i.articulo.id === articuloId ? { ...i, descuentoPct } : i)));
  };

  const quitarItem = (articuloId: number) => {
    setItems((prev) => prev.filter((i) => i.articulo.id !== articuloId));
  };

  const totales = useMemo(() => calcularTotales(items), [items]);

  return { items, agregarItem, actualizarCantidad, actualizarDescuento, quitarItem, totales };
}
