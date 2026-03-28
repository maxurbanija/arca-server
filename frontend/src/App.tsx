import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import InvoiceList from './pages/InvoiceList';
import NewInvoice from './pages/NewInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import ClientList from './pages/ClientList';
import NewClient from './pages/NewClient';
import Settings from './pages/Settings';
import ApiKeys from './pages/ApiKeys';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/facturas" element={<InvoiceList />} />
        <Route path="/facturas/nueva" element={<NewInvoice />} />
        <Route path="/facturas/:id" element={<InvoiceDetail />} />
        <Route path="/clientes" element={<ClientList />} />
        <Route path="/clientes/nuevo" element={<NewClient />} />
        <Route path="/clientes/:id/editar" element={<NewClient />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="/api-keys" element={<ApiKeys />} />
      </Route>
    </Routes>
  );
}
