import { http } from "./http";
import type { Cliente } from "../types/dtos";

export const clientesService = {
  listar: () => http.get<Cliente[]>("/api/clientes"),
};
