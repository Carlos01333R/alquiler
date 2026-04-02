"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Step = "loading" | "form" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    // Supabase manda el token en el hash de la URL:
    // /reset-password#access_token=xxx&refresh_token=yyy&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && refreshToken && type === "recovery") {
      // Establecer sesión manualmente con los tokens del hash
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            console.error("Error al establecer sesión:", error.message);
            setStep("invalid");
          } else {
            // Limpiar el hash para que no se reutilice con F5
            window.history.replaceState(null, "", window.location.pathname);
            setStep("form");
          }
        });
    } else {
      // No hay hash válido en la URL
      setStep("invalid");
    }
  }, []);

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { label: "Muy corta", color: "bg-red-400", width: "w-1/4" };
    if (pwd.length < 8) return { label: "Débil", color: "bg-orange-400", width: "w-2/4" };
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd))
      return { label: "Regular", color: "bg-yellow-400", width: "w-3/4" };
    return { label: "Fuerte", color: "bg-green-500", width: "w-full" };
  };

  const handleReset = async () => {
    setErrorMsg("");
    if (password.length < 6) {
      setErrorMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // Cerrar la sesión temporal usada solo para el reset
    await supabase.auth.signOut();
    setStep("success");
  };

  const strength = getPasswordStrength(password);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  // ── Token inválido / expirado ─────────────────────────────────────────────
  if (step === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Enlace inválido o expirado</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Este enlace ya fue usado o expiró. Los enlaces son válidos por 24 horas.
            Solicita uno nuevo desde la app.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Ir al panel
          </button>
        </div>
      </div>
    );
  }

  // ── Éxito ─────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h1>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión
            desde la app con tu nueva contraseña.
          </p>
         
        </div>
      </div>
    );
  }

  // ── Formulario ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nueva contraseña</h1>
        <p className="text-gray-500 text-sm mb-7">Elige una contraseña segura para tu cuenta.</p>

        <div className="space-y-4">
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                </div>
                <p className={`text-xs mt-1 font-medium ${
                  strength.label === "Fuerte" ? "text-green-600" :
                  strength.label === "Regular" ? "text-yellow-600" :
                  strength.label === "Débil" ? "text-orange-600" : "text-red-600"
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setErrorMsg(""); }}
                placeholder="Repite la contraseña"
                className={`w-full bg-gray-50 border rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition ${
                  confirm && confirm !== password
                    ? "border-red-300 focus:ring-red-400"
                    : confirm && confirm === password
                    ? "border-green-300 focus:ring-green-400"
                    : "border-gray-200 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
            {confirm && confirm === password && (
              <p className="text-xs text-green-600 mt-1">✓ Las contraseñas coinciden</p>
            )}
          </div>

          {/* Error general */}
          {errorMsg && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600">{errorMsg}</p>
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={isLoading || !password || !confirm}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}