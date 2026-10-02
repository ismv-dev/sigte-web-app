"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, Metric, Badge } from "@/components/ui-system";
import { I } from "@/components/Icon";
import type { AppUser } from "@/types/user";
import { AppVersion, isFeatureEnabled, parseVersion } from "@/lib/versions";

type Metrics = {
  vehicles: number;
  accessToday: number;
  openInfractions: number;
  unreadNotifs: number;
};

export default function VersionUserHome() {
  const params = useParams<{ version: string }>();
  const version: AppVersion = parseVersion(params?.version, "v3");

  const [m, setM] = useState<Metrics | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setM(d.metrics))
      .catch(() => {});

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {});
  }, []);

  const hasAccessRecords = isFeatureEnabled(version, "access_records");

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Bienvenido, {user?.name ?? ""}</h1>
        <p className="muted" style={{ fontSize: 13 }}>
          Resumen de tu perfil institucional y actividad en el campus · {version.toUpperCase()}
        </p>
      </div>

      {user && (
        <Card>
          <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div className="row" style={{ gap: 14, alignItems: "center" }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--usm-azul)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {user.name
                  .split(" ")
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div>
                <div className="row" style={{ gap: 8, alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{user.name}</span>
                  {user.userType === "STUDENT" ? (
                    <Badge kind="info">Alumno</Badge>
                  ) : user.userType === "STAFF" ? (
                    <Badge kind="wait">Funcionario / Docente</Badge>
                  ) : null}
                </div>
                <div className="muted" style={{ fontSize: 13 }}>{user.email}</div>
              </div>
            </div>

            <div className="row" style={{ gap: 20, flexWrap: "wrap", fontSize: 13 }}>
              {user.userType === "STUDENT" && (
                <>
                  {"rut" in user && user.rut && (
                    <div>
                      <span className="muted">RUT: </span>
                      <strong className="mono">{user.rut}</strong>
                    </div>
                  )}
                  {"career" in user && user.career && (
                    <div>
                      <span className="muted">Carrera: </span>
                      <strong>{user.career}</strong>
                    </div>
                  )}
                  {"academicDepartment" in user && user.academicDepartment && (
                    <div>
                      <span className="muted">Depto: </span>
                      <span>{user.academicDepartment}</span>
                    </div>
                  )}
                </>
              )}

              {user.userType === "STAFF" && (
                <>
                  {"position" in user && user.position && (
                    <div>
                      <span className="muted">Cargo: </span>
                      <strong>{user.position}</strong>
                    </div>
                  )}
                  {"department" in user && user.department && (
                    <div>
                      <span className="muted">Unidad: </span>
                      <span>{user.department}</span>
                    </div>
                  )}
                </>
              )}

              {user.phone && (
                <div>
                  <span className="muted">Teléfono: </span>
                  <span>{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {m && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Metric label="Mis vehículos" icon="car" value={m.vehicles} />
          {hasAccessRecords && (
            <Metric label="Accesos hoy" icon="arrowRight" value={m.accessToday} />
          )}
          <Metric label="Infracciones" icon="shieldAlert" value={m.openInfractions} />
          <Metric label="Notificaciones" icon="bell" value={m.unreadNotifs} />
        </div>
      )}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
        <Link href={`/${version}/qr`} style={{ textDecoration: "none", color: "inherit" }}>
          <Card>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--accent-050)",
                  color: "var(--usm-azul)",
                }}
              >
                <I name="qr" size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Generar mi QR</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  Código válido por 5 minutos para presentar al guardia
                </div>
              </div>
              <I name="arrowRight" size={18} />
            </div>
          </Card>
        </Link>
        <Link href={`/${version}/vehicles`} style={{ textDecoration: "none", color: "inherit" }}>
          <Card>
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--accent-050)",
                  color: "var(--usm-azul)",
                }}
              >
                <I name="car" size={20} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Mis vehículos</div>
                <div className="muted" style={{ fontSize: 13 }}>Registra o edita tus patentes autorizadas</div>
              </div>
              <I name="arrowRight" size={18} />
            </div>
          </Card>
        </Link>
        {hasAccessRecords && (
          <Link href={`/${version}/access`} style={{ textDecoration: "none", color: "inherit" }}>
            <Card>
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--accent-050)",
                    color: "var(--usm-azul)",
                  }}
                >
                  <I name="history" size={20} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Mis accesos</div>
                  <div className="muted" style={{ fontSize: 13 }}>Historial de entradas y salidas registradas</div>
                </div>
                <I name="arrowRight" size={18} />
              </div>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
