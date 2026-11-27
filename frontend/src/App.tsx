import { Link, Route, Routes } from "react-router-dom";
import { PresupuestosListPage } from "./pages/PresupuestosListPage";
import { NuevoPresupuestoPage } from "./pages/NuevoPresupuestoPage";

export default function App() {
  return (
    <div className="app">
      <header className="app__header">
        <Link to="/" className="app__brand">
          Mini ERP
        </Link>
      </header>
      <main className="app__main">
        <Routes>
          <Route path="/" element={<PresupuestosListPage />} />
          <Route path="/nuevo" element={<NuevoPresupuestoPage />} />
        </Routes>
      </main>
    </div>
  );
}
