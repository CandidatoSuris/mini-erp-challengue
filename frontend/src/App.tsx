import { Link, Route, Routes } from "react-router-dom";
import { PresupuestosListPage } from "./pages/PresupuestosListPage";
import { NuevoPresupuestoPage } from "./pages/NuevoPresupuestoPage";
import { ReportePage } from "./pages/ReportePage";

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <nav className="app__nav">
          <Link to="/" className="app__brand">
            Mini ERP
          </Link>
          <Link to="/" className="app__navlink">
            Presupuestos
          </Link>
          <Link to="/reporte" className="app__navlink">
            Reporte
          </Link>
        </nav>
      </header>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<PresupuestosListPage />} />
          <Route path="/nuevo" element={<NuevoPresupuestoPage />} />
          <Route path="/reporte" element={<ReportePage />} />
        </Routes>
      </main>
    </div>
  );
}
