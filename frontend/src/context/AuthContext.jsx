import { createContext, useContext, useState } from "react";
import api from "../config/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null,
  );
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { token: jwtToken, user: userData } = res.data.data;

    sessionStorage.removeItem("superadmin_backup_token");
    sessionStorage.removeItem("superadmin_backup_user");
    localStorage.setItem("token", jwtToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    return userData;
  };

  // Guarda la sesión de SuperAdmin antes de entrar a gestionar una tienda
  const startImpersonation = (impersonatedToken, impersonatedUser) => {
    const currentToken = localStorage.getItem("token");
    const currentUser = localStorage.getItem("user");

    if (
      currentToken &&
      currentUser &&
      !sessionStorage.getItem("superadmin_backup_token")
    ) {
      sessionStorage.setItem("superadmin_backup_token", currentToken);
      sessionStorage.setItem("superadmin_backup_user", currentUser);
    }

    localStorage.setItem("token", impersonatedToken);
    localStorage.setItem("user", JSON.stringify(impersonatedUser));
    setToken(impersonatedToken);
    setUser(impersonatedUser);
  };

  // Restaura la sesión original de SuperAdmin al salir de la tienda
  const stopImpersonation = () => {
    const backupToken = sessionStorage.getItem("superadmin_backup_token");
    const backupUserStr = sessionStorage.getItem("superadmin_backup_user");

    sessionStorage.removeItem("superadmin_backup_token");
    sessionStorage.removeItem("superadmin_backup_user");

    if (backupToken && backupUserStr) {
      try {
        const backupUser = JSON.parse(backupUserStr);
        localStorage.setItem("token", backupToken);
        localStorage.setItem("user", JSON.stringify(backupUser));
        setToken(backupToken);
        setUser(backupUser);
        return true;
      } catch {
        // Si falla el parseo, continúa al fallback
      }
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem("superadmin_backup_token");
    sessionStorage.removeItem("superadmin_backup_user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        startImpersonation,
        stopImpersonation,
        isAuthenticated: Boolean(token && user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
