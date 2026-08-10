import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import CommandDashboard from "./pages/CommandDashboard";
import EventPlanner from "./pages/EventPlanner";
import FieldOfficer from "./pages/FieldOfficer";
import CheckpointConsole from "./pages/CheckpointConsole";
import AfterActionReport from "./pages/AfterActionReport";
import Settings from "./pages/Settings";
import Layout from "./components/Layout";

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role === "officer") return <Navigate to="/field" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<RoleHome />} />
          <Route path="dashboard" element={<CommandDashboard />} />
          <Route path="dashboard/:eventId" element={<CommandDashboard />} />
          <Route path="planner" element={<EventPlanner />} />
          <Route path="field" element={<FieldOfficer />} />
          <Route path="checkpoint/:postId" element={<CheckpointConsole />} />
          <Route path="report/:eventId" element={<AfterActionReport />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
