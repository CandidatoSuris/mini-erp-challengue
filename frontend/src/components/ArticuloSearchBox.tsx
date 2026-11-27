import type { Articulo } from "../types/dtos";

interface Props {
  query: string;
  onQueryChange: (query: string) => void;
  resultados: Articulo[];
  loading: boolean;
  error: string | null;
  onSeleccionar: (articulo: Articulo) => void;
}

/** Puramente presentacional: la busqueda (debounce + fetch) vive en useArticuloSearch, propiedad de la pagina. */
export function ArticuloSearchBox({ query, onQueryChange, resultados, loading, error, onSeleccionar }: Props) {
  return (
    <div className="search-box">
      <label className="field">
        <span className="field__label">Buscar artículo</span>
        <input
          className="field__control"
          type="text"
          placeholder="Código o descripción..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </label>

      {loading && <p className="search-box__hint">Buscando...</p>}
      {error && <p className="search-box__hint search-box__hint--error">{error}</p>}

      {resultados.length > 0 && (
        <ul className="search-box__results">
          {resultados.map((articulo) => (
            <li key={articulo.id}>
              <button type="button" className="search-box__result" onClick={() => onSeleccionar(articulo)}>
                <span className="search-box__codigo">{articulo.codigo}</span>
                <span className="search-box__descripcion">{articulo.descripcion}</span>
                <span className="search-box__precio">${articulo.precioUnitario.toLocaleString("es-AR")}</span>
                <span className="search-box__stock">stock: {articulo.stockActual}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
