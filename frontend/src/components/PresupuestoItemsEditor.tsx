import type { ItemBorrador } from "../types/dtos";

interface Props {
  items: ItemBorrador[];
  onCantidadChange: (articuloId: number, cantidad: number) => void;
  onDescuentoChange: (articuloId: number, descuentoPct: number) => void;
  onQuitar: (articuloId: number) => void;
}

function formatearMoneda(valor: number) {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PresupuestoItemsEditor({ items, onCantidadChange, onDescuentoChange, onQuitar }: Props) {
  if (items.length === 0) {
    return <p className="empty-hint">Todavía no agregaste artículos.</p>;
  }

  return (
    <table className="items-table">
      <thead>
        <tr>
          <th>Artículo</th>
          <th>Precio</th>
          <th>IVA</th>
          <th>Cantidad</th>
          <th>Desc. %</th>
          <th>Subtotal línea</th>
          <th aria-hidden="true"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const subtotalLinea = item.cantidad * item.articulo.precioUnitario * (1 - item.descuentoPct / 100);
          return (
            <tr key={item.articulo.id}>
              <td>
                <strong>{item.articulo.codigo}</strong>
                <div className="items-table__descripcion">{item.articulo.descripcion}</div>
              </td>
              <td>${formatearMoneda(item.articulo.precioUnitario)}</td>
              <td>{item.articulo.alicuotaIva}%</td>
              <td>
                <input
                  className="items-table__input"
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => onCantidadChange(item.articulo.id, Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="items-table__input"
                  type="number"
                  min={0}
                  max={100}
                  value={item.descuentoPct}
                  onChange={(e) => onDescuentoChange(item.articulo.id, Number(e.target.value))}
                />
              </td>
              <td>${formatearMoneda(subtotalLinea)}</td>
              <td>
                <button type="button" className="link-button" onClick={() => onQuitar(item.articulo.id)}>
                  Quitar
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
