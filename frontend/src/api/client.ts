import type {
  ArticuloDto,
  ClienteDto,
  CrearPresupuestoRequest,
  FacturaDto,
  PresupuestoDto,
} from "../types";

const BASE = "http://localhost:5080/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Error ${res.status} al llamar a la API.`);
  }
  return res.json();
}

export function getClientes(): Promise<ClienteDto[]> {
  return fetch(`${BASE}/clientes`).then((res) => handleResponse(res));
}

export function buscarArticulos(busqueda: string): Promise<ArticuloDto[]> {
  const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : "";
  return fetch(`${BASE}/articulos${query}`).then((res) => handleResponse(res));
}

export function getPresupuestos(): Promise<PresupuestoDto[]> {
  return fetch(`${BASE}/presupuestos`).then((res) => handleResponse(res));
}

export function getPresupuesto(id: number): Promise<PresupuestoDto> {
  return fetch(`${BASE}/presupuestos/${id}`).then((res) => handleResponse(res));
}

export function crearPresupuesto(
  body: CrearPresupuestoRequest
): Promise<PresupuestoDto> {
  return fetch(`${BASE}/presupuestos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((res) => handleResponse(res));
}

export function eliminarPresupuesto(id: number): Promise<void> {
  return fetch(`${BASE}/presupuestos/${id}`, { method: "DELETE" }).then((res) => {
    if (!res.ok) throw new Error(`Error ${res.status} al eliminar el presupuesto.`);
  });
}

export function getFacturas(): Promise<FacturaDto[]> {
  return fetch(`${BASE}/facturas`).then((res) => handleResponse(res));
}

export function facturarPresupuesto(presupuestoId: number): Promise<FacturaDto> {
  return fetch(`${BASE}/facturas/facturar/${presupuestoId}`, {
    method: "POST",
  }).then((res) => handleResponse(res));
}
