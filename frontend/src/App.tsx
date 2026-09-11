import { useEffect, useState } from "react";
import {
  eliminarPresupuesto,
  facturarPresupuesto,
  getClientes,
  getPresupuestos,
} from "./api/client";
import { PresupuestoForm } from "./components/PresupuestoForm";
import { PresupuestosGrid } from "./components/PresupuestosGrid";
import type { ClienteDto, PresupuestoDto } from "./types";
import "./App.css";

type Vista = "grid" | "form";

function App() {
  const [vista, setVista] = useState<Vista>("grid");
  const [presupuestos, setPresupuestos] = useState<PresupuestoDto[]>([]);
  const [clientes, setClientes] = useState<ClienteDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errorPorPresupuesto, setErrorPorPresupuesto] = useState<Record<number, string>>({});

  async function cargarDatos() {
    setCargando(true);
    setErrorGeneral(null);
    try {
      const [pres, clis] = await Promise.all([getPresupuestos(), getClientes()]);
      setPresupuestos(pres);
      setClientes(clis);
    } catch (err) {
      setErrorGeneral(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con la API. Verifica que este corriendo en http://localhost:5080."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  async function handleFacturar(id: number) {
    setErrorPorPresupuesto((prev) => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
    try {
      await facturarPresupuesto(id);
      await cargarDatos();
    } catch (err) {
      setErrorPorPresupuesto((prev) => ({
        ...prev,
        [id]: err instanceof Error ? err.message : "No se pudo facturar.",
      }));
    }
  }

  async function handleEliminar(id: number) {
    await eliminarPresupuesto(id);
    await cargarDatos();
  }

  function handleCreado() {
    setVista("grid");
    cargarDatos();
  }

  return (
    <div className="app">
      <header>
        <h1>Mini ERP - Presupuestos</h1>
      </header>

      {errorGeneral && <div className="error-general">{errorGeneral}</div>}

      {cargando ? (
        <p>Cargando...</p>
      ) : vista === "grid" ? (
        <PresupuestosGrid
          presupuestos={presupuestos}
          onFacturar={handleFacturar}
          onEliminar={handleEliminar}
          onNuevo={() => setVista("form")}
          errorPorPresupuesto={errorPorPresupuesto}
        />
      ) : (
        <PresupuestoForm
          clientes={clientes}
          onCreado={handleCreado}
          onCancelar={() => setVista("grid")}
        />
      )}
    </div>
  );
}

export default App;
