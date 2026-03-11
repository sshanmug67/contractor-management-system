import { Routes, Route, Navigate } from 'react-router-dom';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { ContractorLayout } from './components/layout/ContractorLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Owner pages
import { OwnerDashboard } from './routes/owner/OwnerDashboard';
import { ProjectListPage } from './routes/owner/ProjectListPage';
import { ProjectDetailPage } from './routes/owner/ProjectDetailPage';
import { WorkgroupDetailPage as OwnerWorkgroupDetail } from './routes/owner/WorkgroupDetailPage';
import { ContractorPoolPage } from './routes/owner/ContractorPoolPage';
import { InvoicesPage as OwnerInvoicesPage } from './routes/owner/InvoicesPage';
import { MessagesPage as OwnerMessagesPage } from './routes/owner/MessagesPage';
import { SettingsPage } from './routes/owner/SettingsPage';

// Contractor pages
import { MyWorkgroupsPage } from './routes/contractor/MyWorkgroupsPage';
import { WorkgroupDetailPage as ContractorWorkgroupDetail } from './routes/contractor/WorkgroupDetailPage';
import { JobDetailPage } from './routes/contractor/JobDetailPage';
import { InvoicesPage as ContractorInvoicesPage } from './routes/contractor/InvoicesPage';
import { MessagesPage as ContractorMessagesPage } from './routes/contractor/MessagesPage';
import { ProfilePage } from './routes/contractor/ProfilePage';

function App() {
  return (
    <Routes>
      {/* Business Owner Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="projects" element={<ProjectListPage />} />
        <Route path="projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="workgroups/:workgroupId" element={<OwnerWorkgroupDetail />} />
        <Route path="contractors" element={<ContractorPoolPage />} />
        <Route path="invoices" element={<OwnerInvoicesPage />} />
        <Route path="messages" element={<OwnerMessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Contractor Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute role="contractor">
            <ContractorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MyWorkgroupsPage />} />
        <Route path="workgroups/:workgroupId" element={<ContractorWorkgroupDetail />} />
        <Route path="jobs/:jobId" element={<JobDetailPage />} />
        <Route path="invoices" element={<ContractorInvoicesPage />} />
        <Route path="messages" element={<ContractorMessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
