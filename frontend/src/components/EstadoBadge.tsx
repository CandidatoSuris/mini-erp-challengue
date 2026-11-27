import type { EstadoPresupuesto } from "../types/dtos";

const ESTILOS: Record<EstadoPresupuesto, { label: string; className: string }> = {
  Borrador: { label: "Borrador", className: "badge badge--neutral" },
  Aprobado: { label: "Aprobado", className: "badge badge--info" },
  Rechazado: { label: "Rechazado", className: "badge badge--danger" },
  Facturado: { label: "Facturado", className: "badge badge--success" },
};

export function EstadoBadge({ estado }: { estado: EstadoPresupuesto }) {
  const { label, className } = ESTILOS[estado];
  return <span className={className}>{label}</span>;
}
