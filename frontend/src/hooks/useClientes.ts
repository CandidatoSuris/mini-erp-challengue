import { useEffect, useState } from "react";
import { clientesService } from "../services/clientesService";
import type { Cliente } from "../types/dtos";

export function useClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    clientesService
      .listar()
      .then((data) => {
        if (!cancelado) setClientes(data);
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : "Error al cargar clientes.");
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return { clientes, loading, error };
}
