import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { useState, useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { hasValidSession, clearSession } from "./lib/auth";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Feedback from "./pages/Feedback";
import Analytics from "./pages/Analytics";
import Themes from "./pages/Themes";
import Features from "./pages/Features";
import Prioritization from "./pages/Prioritization";
import PRD from "./pages/PRD";
import Roadmap from "./pages/Roadmap";
import Chat from "./pages/Chat";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import SignUp from "./pages/SignUp";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import TwoFactorAuth from "./pages/TwoFactorAuth";

/**
 * Logout lives in the Sidebar, which calls redirectToLogin() — that clears the
 * session and hard-navigates, so App does not need to pass a callback down.
 * The previous `onLogout` prop was only ever stamped onto a DOM attribute,
 * where React could not serialize it.
 */
function Router({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPasswordConfirm} />
        <Route path="/two-factor-auth" component={TwoFactorAuth} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 overflow-x-hidden min-h-screen">
        <Switch>
          {/* Pages that call protected endpoints re-check the session on entry,
              so an expired token redirects instead of firing a doomed request. */}
          <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
          <Route path="/feedback"><ProtectedRoute component={Feedback} /></Route>
          <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
          <Route path="/themes"><ProtectedRoute component={Themes} /></Route>
          <Route path="/features"><ProtectedRoute component={Features} /></Route>
          <Route path="/prioritization"><ProtectedRoute component={Prioritization} /></Route>
          {/* PRD and Roadmap now read and write owner-scoped records, and
              Settings reads the account, so all three are guarded too. */}
          <Route path="/prd"><ProtectedRoute component={PRD} /></Route>
          <Route path="/roadmap"><ProtectedRoute component={Roadmap} /></Route>
          <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

          {/* Client-side only — no backend call, so no guard needed beyond the
              outer isAuthenticated check. */}
          <Route path="/chat" component={Chat} />
          <Route path="/404" component={NotFound} />
          {/* Final fallback route */}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Protected API routes require a live JWT. An expired token is treated the
    // same as no token — clear it rather than letting every request 401.
    if (hasValidSession()) {
      setIsAuthenticated(true);
    } else {
      clearSession();
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router isAuthenticated={isAuthenticated} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
