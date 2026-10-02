"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { I } from "@/components/Icon";
import { Brand } from "@/components/ui-system";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { AppVersion, isValidVersion, parseVersion } from "@/lib/versions";
import st from "./login.module.css";

const DEMO = [
  { role: "Admin", email: "admin@usm.cl", pw: "admin123" },
  { role: "Guardia", email: "guardia@usm.cl", pw: "guard123" },
  { role: "Usuario", email: "user@usm.cl", pw: "user123" },
] as const;

function LoginForm({ version }: { version: AppVersion }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Ingresa tu correo institucional y contraseña");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Error al iniciar sesión. Verifica la conexión con la base de datos.");
        setLoading(false);
        return;
      }
      const target =
        sp.get("next") ||
        (data.role === "ADMIN"
          ? `/${version}/admin`
          : data.role === "GUARD"
          ? `/${version}/guard`
          : `/${version}/user`);
      window.location.href = target;
    } catch (err) {
      console.error(err);
      setError("Error de red o del servidor al procesar la solicitud.");
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string, demoPw: string) {
    setEmail(demoEmail);
    setPassword(demoPw);
    setError(null);
  }

  return (
    <form onSubmit={submit} className="col" style={{ gap: 14, textAlign: "left" }}>
      <div className="field">
        <label className="field-lbl" htmlFor="email">Correo institucional</label>
        <input
          id="email"
          className="input"
          type="email"
          required
          placeholder="nombre.apellido@usm.cl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-lbl" htmlFor="password">Contraseña</label>
        <input
          id="password"
          className="input"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <span className="field-hint">Credenciales entregadas por administración.</span>
      </div>

      {error && (
        <div className="field-err">
          <I name="alert" size={14} /> {error}
        </div>
      )}

      <button className="btn primary lg block" type="submit" disabled={loading}>
        <I name="login" size={19} /> {loading ? "Ingresando…" : `Ingresar a ${version.toUpperCase()}`}
      </button>

      <p style={{ fontSize: 13, color: "var(--ink-500)", textAlign: "center", margin: 0 }}>
        ¿No tienes cuenta?{" "}
        <Link href={`/${version}/register`} style={{ color: "var(--accent)", fontWeight: 600 }}>
          Regístrate
        </Link>
      </p>
      <p style={{ fontSize: 13, color: "var(--ink-500)", textAlign: "center", margin: 0 }}>
        <Link href={`/${version}/forgot-password`} style={{ color: "var(--accent)", fontWeight: 600 }}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <div className="card pad-sm" style={{ marginTop: 4 }}>
        <p
          style={{
            fontFamily: "var(--ff-mono)",
            fontSize: 11,
            letterSpacing: ".15em",
            textTransform: "uppercase",
            color: "var(--ink-500)",
            margin: "0 0 8px",
          }}
        >
          Credenciales demo
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {DEMO.map((d) => (
            <button
              key={d.role}
              type="button"
              onClick={() => fillDemo(d.email, d.pw)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                border: "1px solid var(--line)",
                borderRadius: 8,
                background: "var(--surface)",
                padding: "8px 11px",
                cursor: "pointer",
                fontFamily: "var(--ff-body)",
                fontSize: 12.5,
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--ink-900)" }}>{d.role}</span>
              <span style={{ fontFamily: "var(--ff-mono)", color: "var(--ink-500)" }}>{d.email}</span>
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default function VersionLoginPage() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  return (
    <main className={st.split}>
      <div className={st.formSide}>
        <div className={st.formInner}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <Link
              href={`/${version}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink-500)" }}
            >
              <I name="chevronLeft" size={16} /> Volver a {version.toUpperCase()}
            </Link>
            <VersionSwitcher currentVersion={version} compact />
          </div>

          <div style={{ display: "inline-flex", marginBottom: 20 }}>
            <Brand />
          </div>

          <h1 style={{ fontSize: 26, marginBottom: 8 }}>
            Bienvenido a S.I.G.T.E ({version.toUpperCase()})
          </h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Acceso al portal con alcance de la {version.toUpperCase()}
          </p>

          <Suspense fallback={<p className="muted" style={{ fontSize: 13 }}>Cargando…</p>}>
            <LoginForm version={version} />
          </Suspense>
        </div>
      </div>

      <div className={st.aside}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,.1) 1px,transparent 0)",
            backgroundSize: "22px 22px",
            opacity: 0.6,
          }}
        />
        <div style={{ position: "relative", color: "#fff", textAlign: "center", padding: 40 }}>
          <div
            style={{
              fontFamily: "var(--ff-mono)",
              fontSize: 11,
              letterSpacing: ".18em",
              color: "var(--usm-amarillo)",
              marginBottom: 14,
            }}
          >
            S.I.G.T.E · {version.toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: "var(--ff-display)",
              fontWeight: 700,
              fontSize: 34,
              lineHeight: 1.1,
              maxWidth: "14ch",
              margin: "0 auto",
            }}
          >
            Cada patente, cada acceso, en un solo lugar.
          </div>
        </div>
      </div>
    </main>
  );
}
