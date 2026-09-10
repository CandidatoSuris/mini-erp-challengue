import type { LineaEditor } from '../types/api';
import { formatMoney } from '../lib/totales';

interface LineaItemProps {
  linea: LineaEditor;
  onChange: (key: string, patch: Partial<LineaEditor>) => void;
  onRemove: (key: string) => void;
}

export function LineaItem({ linea, onChange, onRemove }: LineaItemProps) {
  const subtotalLinea =
    linea.cantidad * linea.precioUnitario * (1 - linea.descuentoPct / 100);

  return (
    <tr>
      <td>
        <strong>{linea.codigo}</strong>
        <div className="muted">{linea.descripcion}</div>
      </td>
      <td className="num">{formatMoney(linea.precioUnitario)}</td>
      <td className="num">{linea.alicuotaIva}%</td>
      <td>
        <input
          type="number"
          min={1}
          step={1}
          value={linea.cantidad}
          onChange={(e) =>
            onChange(linea.key, { cantidad: Number(e.target.value) || 0 })
          }
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={linea.descuentoPct}
          onChange={(e) =>
            onChange(linea.key, { descuentoPct: Number(e.target.value) || 0 })
          }
        />
      </td>
      <td className="num">{formatMoney(subtotalLinea)}</td>
      <td>
        <button type="button" className="btn btn--ghost" onClick={() => onRemove(linea.key)}>
          Quitar
        </button>
      </td>
    </tr>
  );
}
