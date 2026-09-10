import { useEffect, useState } from 'react';
import { buscarArticulos } from '../api/articulos';
import type { ArticuloDto } from '../types/api';

interface ArticuloSearchProps {
  onSelect: (articulo: ArticuloDto) => void;
}

export function ArticuloSearch({ onSelect }: ArticuloSearchProps) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ArticuloDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await buscarArticulos(query);
        if (!cancelled) setResultados(data);
      } catch (e) {
        if (!cancelled) {
          setResultados([]);
          setError(e instanceof Error ? e.message : 'Error al buscar artículos');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  return (
    <div className="articulo-search">
      <label htmlFor="busqueda-articulo">Buscar artículos</label>
      <input
        id="busqueda-articulo"
        type="search"
        placeholder="Código o descripción…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {loading && <p className="muted">Buscando…</p>}
      {error && <p className="text-error">{error}</p>}
      {!loading && resultados.length > 0 && (
        <ul className="articulo-search__list">
          {resultados.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onSelect(a)}>
                <span>
                  <strong>{a.codigo}</strong> — {a.descripcion}
                </span>
                <span className="muted">
                  ${a.precioUnitario.toLocaleString('es-AR')} · IVA {a.alicuotaIva}% · Stock{' '}
                  {a.stockActual}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
