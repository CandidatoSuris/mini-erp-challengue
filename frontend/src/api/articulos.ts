import { apiGet } from './client';
import type { ArticuloDto } from '../types/api';

export function buscarArticulos(busqueda: string): Promise<ArticuloDto[]> {
  const q = busqueda.trim()
    ? `?busqueda=${encodeURIComponent(busqueda.trim())}`
    : '';
  return apiGet(`/api/articulos${q}`);
}
