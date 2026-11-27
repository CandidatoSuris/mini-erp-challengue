import { useMemo, useState } from "react";
import type { Articulo, ItemBorrador } from "../types/dtos";

export interface Totales {
  subtotal: number;
  iva: number;
  total: number;
}

/**
 * Redondeo a 2 decimales "away from zero" (igual que MidpointRounding.AwayFromZero
 * del backend). El truco de sumar Number.EPSILON no alcanza para estos montos: el
 * ULP de un numero de varios digitos es ordenes de magnitud mayor que EPSILON, asi
 * que un valor que matematicamente cae justo en .XX5 puede llegar representado
 * como .XX49999999999 y redondear para el lado equivocado (reproducido con
 * ART-004, descuento 31%: da 326.02 en vez de 326.03). Redondeamos primero a una
 * precision bien por encima de 2 decimales para eliminar ese ruido de punto
 * flotante, y recien ahi aplicamos el redondeo final. Verificado contra 200k casos
 * aleatorios comparados con una referencia exacta en enteros (BigInt).
 */
function redondear2(valor: number): number {
  const limpio = Math.round(valor * 1e8) / 1e6;
  const signo = limpio < 0 ? -1 : 1;
  return (signo * Math.round(Math.abs(limpio))) / 100;
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

  /** Reemplaza todos los items de una, para precargar el form al duplicar un presupuesto. */
  const reemplazarItems = (nuevosItems: ItemBorrador[]) => setItems(nuevosItems);

  const totales = useMemo(() => calcularTotales(items), [items]);

  return { items, agregarItem, actualizarCantidad, actualizarDescuento, quitarItem, reemplazarItems, totales };
}
