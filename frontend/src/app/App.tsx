import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../components/common/AppLayout.js";
import { ProtectedRoute } from "../components/common/ProtectedRoute.js";
import { AuthProvider, useAuth } from "../lib/authContext.js";
import { AdminDashboard } from "../pages/admin/AdminDashboard.js";
import { AnnouncementsPage } from "../pages/announcements/AnnouncementsPage.js";
import { LoginPage } from "../pages/auth/LoginPage.js";
import { CertificatesPage } from "../pages/certificates/CertificatesPage.js";
import { ContentLibraryPage } from "../pages/content/ContentLibraryPage.js";
import { KbReviewPage } from "../pages/kb/KbReviewPage.js";
import { LeaderboardPage } from "../pages/leaderboard/LeaderboardPage.js";
import { TrainingPlayerPage } from "../pages/learning/TrainingPlayerPage.js";
import { UsersRoute } from "../pages/org/UsersRoute.js";
import { ReportsPage } from "../pages/reports/ReportsPage.js";
import { AiSupportPage } from "../pages/support/AiSupportPage.js";
import { SuperAdminDashboard } from "../pages/superadmin/SuperAdminDashboard.js";
import { TrainerDashboard } from "../pages/trainer/TrainerDashboard.js";
import { TrainingBuilderPage } from "../pages/trainer/TrainingBuilderPage.js";
import { MyTicketsPage } from "../pages/tickets/MyTicketsPage.js";
import { TicketQueuePage } from "../pages/tickets/TicketQueuePage.js";
import { UserDashboard } from "../pages/user/UserDashboard.js";

function HomeRoute() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "trainer":
      return <TrainerDashboard />;
    default:
      return <UserDashboard />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomeRoute />} />
          <Route
            path="users"
            element={
              <ProtectedRoute roles={["super_admin", "admin"]}>
                <UsersRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="content"
            element={
              <ProtectedRoute roles={["super_admin", "admin", "trainer"]}>
                <ContentLibraryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="trainings"
            element={
              <ProtectedRoute roles={["super_admin", "admin", "trainer"]}>
                <TrainingBuilderPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="learning/:trainingId"
            element={
              <ProtectedRoute roles={["franchise_owner", "operator", "employee"]}>
                <TrainingPlayerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="certificates"
            element={
              <ProtectedRoute roles={["franchise_owner", "operator", "employee"]}>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="my-tickets"
            element={
              <ProtectedRoute roles={["franchise_owner", "operator", "employee"]}>
                <MyTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="support"
            element={
              <ProtectedRoute roles={["franchise_owner", "operator", "employee"]}>
                <AiSupportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="tickets"
            element={
              <ProtectedRoute roles={["super_admin", "admin", "trainer"]}>
                <TicketQueuePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="kb-review"
            element={
              <ProtectedRoute roles={["super_admin"]}>
                <KbReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="leaderboard"
            element={
              <ProtectedRoute roles={["franchise_owner", "operator", "employee"]}>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="announcements"
            element={
              <ProtectedRoute>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="reports"
            element={
              <ProtectedRoute roles={["super_admin"]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
