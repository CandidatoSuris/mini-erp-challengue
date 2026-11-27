import { http } from "./http";
import type { Articulo } from "../types/dtos";

export const articulosService = {
  buscar: (busqueda: string) => http.get<Articulo[]>(`/api/articulos?busqueda=${encodeURIComponent(busqueda)}`),
};
