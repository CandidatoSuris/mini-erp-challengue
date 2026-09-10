import { apiPost } from './client';
import type { FacturaDto } from '../types/api';

export function facturarPresupuesto(presupuestoId: number): Promise<FacturaDto> {
  return apiPost(`/api/facturas/facturar/${presupuestoId}`);
}
