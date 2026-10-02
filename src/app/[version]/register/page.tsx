"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { I } from "@/components/Icon";
import { Brand, Card } from "@/components/ui-system";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { formatRut, isValidRut } from "@/lib/rut";
import { AppVersion, parseVersion } from "@/lib/versions";

type UserType = "STAFF" | "STUDENT";

export default function VersionRegisterPage() {
  const router = useRouter();
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [userType, setUserType] = useState<UserType>("STUDENT");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    universityId: "",
    // staff
    position: "",
    department: "",
    // student
    rut: "",
    academicDepartment: "",
    career: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const rutOk = useMemo(() => form.rut === "" || isValidRut(form.rut), [form.rut]);

  const canSubmit =
    form.name.trim().length >= 2 &&
    /.+@.+\..+/.test(form.email) &&
    form.password.length >= 8 &&
    form.phone.trim().length >= 6 &&
    (userType === "STAFF"
      ? form.position.trim() !== "" && form.department.trim() !== ""
      : isValidRut(form.rut) && form.academicDepartment.trim() !== "" && form.career.trim() !== "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload =
        userType === "STAFF"
          ? {
              userType,
              name: form.name,
              email: form.email,
              password: form.password,
              phone: form.phone,
              universityId: form.universityId || undefined,
              position: form.position,
              department: form.department,
            }
          : {
              userType,
              name: form.name,
              email: form.email,
              password: form.password,
              phone: form.phone,
              universityId: form.universityId || undefined,
              rut: formatRut(form.rut),
              academicDepartment: form.academicDepartment,
              career: form.career,
            };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar el registro");
        return;
      }
      router.replace(`/${version}/user`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)", padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Brand />
          <VersionSwitcher currentVersion={version} compact />
        </div>
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Crear cuenta ({version.toUpperCase()})</h1>
        <p style={{ color: "var(--ink-500)", fontSize: 13.5, marginBottom: 20 }}>
          Registro como usuario del campus en {version.toUpperCase()}.
        </p>

        {/* Tipo de usuario */}
        <div className="field" style={{ marginBottom: 14 }}>
          <label className="field-lbl">Tipo de usuario</label>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className={"btn block " + (userType === "STUDENT" ? "primary" : "ghost")}
              onClick={() => setUserType("STUDENT")}
            >
              <I name="userCheck" size={16} /> Alumno
            </button>
            <button
              type="button"
              className={"btn block " + (userType === "STAFF" ? "primary" : "ghost")}
              onClick={() => setUserType("STAFF")}
            >
              <I name="userCheck" size={16} /> Funcionario / Docente
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="col" style={{ gap: 14 }}>
          <div className="field">
            <label className="field-lbl" htmlFor="name">Nombre completo</label>
            <input
              id="name"
              className="input"
              required
              placeholder="Juan Pérez"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-lbl" htmlFor="email">Correo institucional (@usm.cl)</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              placeholder="nombre.apellido@usm.cl"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-lbl" htmlFor="password">Contraseña (mínimo 8 caracteres)</label>
            <input
              id="password"
              className="input"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-lbl" htmlFor="phone">Teléfono de contacto</label>
            <input
              id="phone"
              className="input"
              required
              placeholder="+56 9 1234 5678"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>

          <div className="field">
            <label className="field-lbl" htmlFor="uid">Número de credencial USM (opcional)</label>
            <input
              id="uid"
              className="input"
              placeholder="Ej: 202104501-2"
              value={form.universityId}
              onChange={(e) => set("universityId", e.target.value)}
            />
          </div>

          {userType === "STAFF" ? (
            <>
              <div className="field">
                <label className="field-lbl" htmlFor="position">Cargo o función</label>
                <input
                  id="position"
                  className="input"
                  required
                  placeholder="Docente / Administrativo / etc."
                  value={form.position}
                  onChange={(e) => set("position", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-lbl" htmlFor="dept">Departamento o Unidad</label>
                <input
                  id="dept"
                  className="input"
                  required
                  placeholder="Ej: Depto. de Informática"
                  value={form.department}
                  onChange={(e) => set("department", e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label className="field-lbl" htmlFor="rut">RUT del estudiante</label>
                <input
                  id="rut"
                  className="input"
                  required
                  placeholder="12.345.678-9"
                  value={form.rut}
                  onChange={(e) => set("rut", e.target.value)}
                />
                {!rutOk && (
                  <span className="field-err" style={{ display: "block", marginTop: 4 }}>
                    RUT inválido (formato: 12.345.678-9)
                  </span>
                )}
              </div>
              <div className="field">
                <label className="field-lbl" htmlFor="career">Carrera</label>
                <input
                  id="career"
                  className="input"
                  required
                  placeholder="Ej: Ingeniería Civil Informática"
                  value={form.career}
                  onChange={(e) => set("career", e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-lbl" htmlFor="acadDept">Departamento académico</label>
                <input
                  id="acadDept"
                  className="input"
                  required
                  placeholder="Ej: Departamento de Informática"
                  value={form.academicDepartment}
                  onChange={(e) => set("academicDepartment", e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="field-err">
              <I name="alert" size={14} /> {error}
            </div>
          )}

          <button className="btn primary block lg" type="submit" disabled={!canSubmit || loading}>
            <I name="check" size={18} /> {loading ? "Registrando…" : `Registrarme en ${version.toUpperCase()}`}
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-500)", margin: "8px 0 0" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href={`/${version}/login`} style={{ color: "var(--accent)", fontWeight: 600 }}>
              Iniciar sesión
            </Link>
          </p>
          <p style={{ textAlign: "center", fontSize: 12, margin: 0 }}>
            <Link href={`/${version}`} style={{ color: "var(--ink-500)" }}>
              ← Volver al inicio de {version.toUpperCase()}
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
