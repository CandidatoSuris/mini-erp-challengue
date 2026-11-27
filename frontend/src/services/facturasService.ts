import { http } from "./http";
import type { Factura } from "../types/dtos";

export const facturasService = {
  facturar: (presupuestoId: number) => http.post<Factura>(`/api/facturas/facturar/${presupuestoId}`),
};
