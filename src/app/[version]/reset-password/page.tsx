"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { I } from "@/components/Icon";
import { Brand, Card } from "@/components/ui-system";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { AppVersion, parseVersion } from "@/lib/versions";

function ResetPasswordForm({ version }: { version: AppVersion }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo actualizar la contraseña");
        return;
      }
      setDone(true);
      setTimeout(() => router.replace(`/${version}/login`), 2000);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="field-err">
        <I name="alert" size={14} /> Enlace inválido. Solicita uno nuevo desde{" "}
        <Link href={`/${version}/forgot-password`}>recuperar contraseña</Link>.
      </div>
    );
  }

  if (done) {
    return (
      <div className="field-hint" style={{ fontSize: 13.5 }}>
        Contraseña actualizada. Te llevamos al inicio de sesión…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="col" style={{ gap: 14 }}>
      <div className="field">
        <label className="field-lbl" htmlFor="pw">Nueva contraseña (mínimo 8 caracteres)</label>
        <input
          id="pw"
          className="input"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>
      <div className="field">
        <label className="field-lbl" htmlFor="confirm">Confirma tu nueva contraseña</label>
        <input
          id="confirm"
          className="input"
          type="password"
          required
          minLength={8}
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <div className="field-err">
          <I name="alert" size={14} /> {error}
        </div>
      )}

      <button className="btn primary block" type="submit" disabled={loading}>
        <I name="check" size={18} /> {loading ? "Guardando…" : "Restablecer contraseña"}
      </button>
    </form>
  );
}

export default function VersionResetPasswordPage() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Brand />
          <VersionSwitcher currentVersion={version} compact />
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Nueva contraseña ({version.toUpperCase()})</h1>
        <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginBottom: 20 }}>
          Ingresa y confirma tu nueva contraseña institucional.
        </p>

        <Suspense fallback={<p className="muted">Cargando formulario…</p>}>
          <ResetPasswordForm version={version} />
        </Suspense>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link href={`/${version}/login`} style={{ fontSize: 13, color: "var(--accent)" }}>
            ← Volver al inicio de sesión ({version.toUpperCase()})
          </Link>
        </div>
      </Card>
    </main>
  );
}
