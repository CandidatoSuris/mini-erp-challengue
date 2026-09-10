import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { NuevoPresupuestoPage } from './pages/NuevoPresupuestoPage';
import { PresupuestosPage } from './pages/PresupuestosPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<PresupuestosPage />} />
          <Route path="/nuevo" element={<NuevoPresupuestoPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
