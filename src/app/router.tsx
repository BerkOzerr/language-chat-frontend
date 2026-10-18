import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./auth-provider";
import { AppShell } from "../components/AppShell";
import { LandingPage } from "../features/auth/LandingPage";
import { AuthPage } from "../features/auth/AuthPage";
import { VerifyEmailPage } from "../features/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "../features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../features/auth/ResetPasswordPage";
import { RoomsPage } from "../features/rooms/RoomsPage";
import { ChatPage } from "../features/chat/ChatPage";
import { ProfilePage } from "../features/profile/ProfilePage";

function ProtectedLayout() {
  const { token } = useAuth();
  return token ? <AppShell><Outlet /></AppShell> : <Navigate to="/welcome" replace />;
}
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/rooms" replace /> },
  { path: "/welcome", element: <LandingPage /> },
  { path: "/login", element: <AuthPage mode="login" /> },
  { path: "/register", element: <AuthPage mode="register" /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { element: <ProtectedLayout />, children: [
    { path: "/rooms", element: <RoomsPage /> },
    { path: "/rooms/:roomId", element: <ChatPage /> },
    { path: "/profile", element: <ProfilePage /> }
  ] },
  { path: "*", element: <Navigate to="/welcome" replace /> }
]);