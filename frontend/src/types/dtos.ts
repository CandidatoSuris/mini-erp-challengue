export type CondicionIva = "ResponsableInscripto" | "Monotributo" | "ConsumidorFinal";
export type EstadoPresupuesto = "Borrador" | "Aprobado" | "Rechazado" | "Facturado";

export interface Cliente {
  id: number;
  razonSocial: string;
  cuit: string;
  condicionIva: CondicionIva;
}

export interface Articulo {
  id: number;
  codigo: string;
  descripcion: string;
  precioUnitario: number;
  stockActual: number;
  alicuotaIva: number;
}

export interface PresupuestoItemDto {
  articuloId: number;
  articuloCodigo: string;
  articuloDescripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPct: number;
  alicuotaIva: number;
  subtotalLinea: number;
}

export interface Presupuesto {
  id: number;
  numero: number;
  fecha: string;
  clienteId: number;
  clienteRazonSocial: string;
  estado: EstadoPresupuesto;
  validezDias: number;
  items: PresupuestoItemDto[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface Factura {
  id: number;
  numero: number;
  fecha: string;
  presupuestoId: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface CrearPresupuestoItemRequest {
  articuloId: number;
  cantidad: number;
  descuentoPct: number;
}

export interface CrearPresupuestoRequest {
  clienteId: number;
  validezDias: number;
  items: CrearPresupuestoItemRequest[];
}

/** Sólo frontend: una línea en construcción dentro del formulario de alta, antes de persistirse. */
export interface ItemBorrador {
  articulo: Articulo;
  cantidad: number;
  descuentoPct: number;
}

export interface TopArticulo {
  articuloId: number;
  codigo: string;
  descripcion: string;
  cantidadFacturada: number;
  montoFacturado: number;
}
