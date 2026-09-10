export type AccionPresupuesto = 'aprobar' | 'rechazar' | 'facturar' | 'reabrir';

export interface AccionesHabilitadas {
  aprobar: boolean;
  rechazar: boolean;
  facturar: boolean;
  reabrir: boolean;
}

/** Solo las acciones válidas para el estado actual quedan enabled. */
export function accionesPara(estado: string): AccionesHabilitadas {
  switch (estado) {
    case 'Borrador':
      return { aprobar: true, rechazar: true, facturar: false, reabrir: false };
    case 'Aprobado':
      return { aprobar: false, rechazar: false, facturar: true, reabrir: false };
    case 'Rechazado':
      return { aprobar: false, rechazar: false, facturar: false, reabrir: true };
    case 'Facturado':
    default:
      return { aprobar: false, rechazar: false, facturar: false, reabrir: false };
  }
}

export function tituloAccionDeshabilitada(
  _accion: AccionPresupuesto,
  estado: string,
): string {
  return `No disponible en estado ${estado}`;
}
