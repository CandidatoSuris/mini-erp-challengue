import type { Cliente } from "../types/dtos";

interface Props {
  clientes: Cliente[];
  value: number | null;
  onChange: (clienteId: number) => void;
  disabled?: boolean;
}

export function ClienteSelect({ clientes, value, onChange, disabled }: Props) {
  return (
    <label className="field">
      <span className="field__label">Cliente</span>
      <select
        className="field__control"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>
          Elegir cliente...
        </option>
        {clientes.map((cliente) => (
          <option key={cliente.id} value={cliente.id}>
            {cliente.razonSocial}
          </option>
        ))}
      </select>
    </label>
  );
}
