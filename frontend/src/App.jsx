import { Route, Routes } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Selection from './pages/Selection';
import CustomerFeedback from './pages/CustomerFeedback';
import LetteringDesigner from './pages/LetteringDesigner';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Overview from './pages/admin/Overview';
import ManageTattoos from './pages/admin/ManageTattoos';
import TattooForm from './pages/admin/TattooForm';
import ManageCategories from './pages/admin/ManageCategories';
import ManagePrices from './pages/admin/ManagePrices';
import ManageFeedback from './pages/admin/ManageFeedback';
import ManageLetteringRequests from './pages/admin/ManageLetteringRequests';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/category/:id" element={<Gallery />} />
        <Route path="/selection" element={<Selection />} />
        <Route path="/feedback" element={<CustomerFeedback />} />
        <Route path="/lettering-designer" element={<LetteringDesigner />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="categories" element={<ManageCategories />} />
        <Route path="tattoos" element={<ManageTattoos />} />
        <Route path="tattoos/new" element={<TattooForm />} />
        <Route path="tattoos/:id/edit" element={<TattooForm />} />
        <Route path="prices" element={<ManagePrices />} />
        <Route path="feedback" element={<ManageFeedback />} />
        <Route path="lettering-requests" element={<ManageLetteringRequests />} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
