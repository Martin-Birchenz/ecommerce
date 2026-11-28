import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Mail,
  Lock,
  Loader2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user?.role === "superadmin") {
        navigate("/superadmin");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Credenciales inválidas. Revisá tu email y contraseña.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Luces ambientales de fondo */}
      <div className="absolute top-[-15%] left-[-10%] w-[480px] h-[480px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[480px] h-[480px] rounded-full bg-indigo-500/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-2xl">
        {/* Columna Izquierda: Propuesta de Valor */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-9 bg-gradient-to-b from-emerald-500/15 via-slate-900/40 to-slate-950/90 border-r border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight block">
                Camaleón SaaS
              </span>
              <span className="text-[11px] text-emerald-400 font-medium">
                Commerce Engine
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-emerald-300 font-medium">
              <Sparkles className="w-3.5 h-3.5" /> Panel Unificado
            </div>
            <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
              Tu negocio online y de mostrador, sincronizados.
            </h2>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Control de stock atómico en tiempo real
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Cobros con Mercado Pago y transferencias
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Etiquetas Andreani y Correo Argentino
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-slate-500">
            Conexión segura SSL · Multi-Tenant
          </p>
        </div>

        {/* Columna Derecha: Formulario */}
        <div className="lg:col-span-7 p-8 sm:p-11 flex flex-col justify-center">
          <div className="mb-7">
            <div className="lg:hidden w-11 h-11 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center mb-4">
              <Store className="w-5 h-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Iniciar sesión
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ingresá con tu cuenta de administrador para continuar
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="tu@comercio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-emerald-400 focus:bg-white/10 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 outline-none focus:border-emerald-400 focus:bg-white/10 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ingresando al panel...</span>
                </>
              ) : (
                <>
                  <span>Acceder al Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
