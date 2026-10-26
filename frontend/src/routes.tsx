import { Route, Routes } from 'react-router';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { ActionItemDetailPage } from './pages/ActionItemDetailPage';
import { ActionItemsListPage } from './pages/ActionItemsListPage';
import { DeletedPage } from './pages/DeletedPage';
import { HomePage } from './pages/HomePage';
import { IssueDetailPage } from './pages/IssueDetailPage';
import { IssuesListPage } from './pages/IssuesListPage';
import { LoginPage } from './pages/LoginPage';
import { MeetingDetailPage } from './pages/MeetingDetailPage';
import { MeetingEditPage } from './pages/MeetingEditPage';
import { MeetingNewPage } from './pages/MeetingNewPage';
import { MeetingsListPage } from './pages/MeetingsListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';

/** Routes from specs/001-meeting-action-tracker/contracts/ui-routes.md. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="meetings" element={<MeetingsListPage />} />
        <Route path="meetings/new" element={<MeetingNewPage />} />
        <Route path="meetings/:id" element={<MeetingDetailPage />} />
        <Route path="meetings/:id/edit" element={<MeetingEditPage />} />
        <Route path="action-items" element={<ActionItemsListPage />} />
        <Route path="action-items/:id" element={<ActionItemDetailPage />} />
        <Route path="issues" element={<IssuesListPage />} />
        <Route path="issues/:id" element={<IssueDetailPage />} />
        <Route path="deleted" element={<DeletedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
