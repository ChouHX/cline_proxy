import { Navigate, Route, Routes } from 'react-router-dom';

import RequireAuth from './auth/RequireAuth';
import AppLayout from './layout/AppLayout';
import AccountsPage from './pages/AccountsPage';
import CatalogPage from './pages/CatalogPage';
import HistoryPage from './pages/HistoryPage';
import LoginPage from './pages/LoginPage';
import ModelsPage from './pages/ModelsPage';
import NotFoundPage from './pages/NotFoundPage';
import OverviewPage from './pages/OverviewPage';
import PlaygroundPage from './pages/PlaygroundPage';
import SecurityPage from './pages/SecurityPage';

/**
 * 路由表。守卫挂在 <RequireAuth> 这一层：
 * /dashboard 整棵子树都在其下，未通过服务端凭据校验的访客无法渲染任何 dashboard 内容。
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="models" element={<ModelsPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="security" element={<SecurityPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
