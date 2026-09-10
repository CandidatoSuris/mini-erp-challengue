import { apiGet } from './client';
import type { ClienteDto } from '../types/api';

export function listarClientes(): Promise<ClienteDto[]> {
  return apiGet('/api/clientes');
}
