import { http } from "./http";
import type { TopArticulo } from "../types/dtos";

export const reportesService = {
  topArticulos: (desde: string, hasta: string, top: number) =>
    http.get<TopArticulo[]>(`/api/reportes/top-articulos?desde=${desde}&hasta=${hasta}&top=${top}`),
};
