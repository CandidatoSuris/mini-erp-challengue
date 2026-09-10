import { apiGet, apiPost } from './client';
import type { CrearPresupuestoRequest, PresupuestoDto } from '../types/api';

export function listarPresupuestos(): Promise<PresupuestoDto[]> {
  return apiGet('/api/presupuestos');
}

export function listarTodosPresupuestos(): Promise<PresupuestoDto[]> {
  return apiGet('/api/presupuestos/todos');
}

export function crearPresupuesto(request: CrearPresupuestoRequest): Promise<PresupuestoDto> {
  return apiPost('/api/presupuestos', request);
}

export function aprobarPresupuesto(id: number): Promise<PresupuestoDto> {
  return apiPost(`/api/presupuestos/${id}/aprobar`);
}

export function rechazarPresupuesto(id: number): Promise<PresupuestoDto> {
  return apiPost(`/api/presupuestos/${id}/rechazar`);
}

export function reabrirPresupuesto(id: number): Promise<PresupuestoDto> {
  return apiPost(`/api/presupuestos/${id}/reabrir`);
}
