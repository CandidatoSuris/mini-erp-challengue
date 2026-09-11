export interface ClienteDto {
  id: number;
  razonSocial: string;
  cuit: string;
  condicionIva: string;
}

export interface ArticuloDto {
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

export interface PresupuestoDto {
  id: number;
  numero: number;
  fecha: string;
  clienteId: number;
  clienteRazonSocial: string;
  estado: string;
  validezDias: number;
  items: PresupuestoItemDto[];
  subtotal: number;
  iva: number;
  total: number;
}

export interface FacturaDto {
  id: number;
  numero: number;
  fecha: string;
  presupuestoId: number;
  subtotal: number;
  iva: number;
  total: number;
}

export interface CrearPresupuestoItemDto {
  articuloId: number;
  cantidad: number;
  descuentoPct: number;
}

export interface CrearPresupuestoRequest {
  clienteId: number;
  validezDias: number;
  items: CrearPresupuestoItemDto[];
}

export interface ApiError {
  error: string;
}
