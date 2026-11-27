import { http } from "./http";
import type { CrearPresupuestoRequest, Presupuesto } from "../types/dtos";

export const presupuestosService = {
  listar: () => http.get<Presupuesto[]>("/api/presupuestos"),
  obtener: (id: number) => http.get<Presupuesto>(`/api/presupuestos/${id}`),
  crear: (request: CrearPresupuestoRequest) => http.post<Presupuesto>("/api/presupuestos", request),
  eliminar: (id: number) => http.delete<void>(`/api/presupuestos/${id}`),
};
