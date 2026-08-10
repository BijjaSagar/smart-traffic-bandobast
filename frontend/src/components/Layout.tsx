import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Layout() {
  const { user, logout } = useAuth();
  const isCommand = user?.role === "admin" || user?.role === "commander";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-navy text-white px-4 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wide">SMART BANDOBAST</span>
          <span className="hidden sm:inline text-xs bg-saffron px-2 py-0.5 rounded font-medium">
            SBS
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {isCommand && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "underline" : "text-gray-200 hover:text-white"}>
                Command Map
              </NavLink>
              <NavLink to="/planner" className={({ isActive }) => isActive ? "underline" : "text-gray-200 hover:text-white"}>
                Duty Planner
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => isActive ? "underline" : "text-gray-200 hover:text-white"}>
                Settings
              </NavLink>
            </>
          )}
          {!isCommand && (
            <NavLink to="/field" className={({ isActive }) => isActive ? "underline" : "text-gray-200 hover:text-white"}>
              My Duty
            </NavLink>
          )}
          <span className="text-gray-300 hidden sm:inline">{user?.name} · {user?.badgeNo}</span>
          <button onClick={logout} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded">
            Log out
          </button>
        </nav>
      </header>
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
