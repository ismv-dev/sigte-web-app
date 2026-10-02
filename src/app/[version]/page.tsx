/* Landing versionada de S.I.G.T.E (/v1, /v2, /v3) */
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { I } from "@/components/Icon";
import { getSession } from "@/lib/auth";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import {
  AppVersion,
  VERSIONS,
  VERSION_LIST,
  isValidVersion,
  isFeatureEnabled,
} from "@/lib/versions";
import s from "../home.module.css";

export default async function VersionHomePage({
  params,
}: {
  params: Promise<{ version: string }>;
}) {
  const { version: rawVersion } = await params;
  if (!isValidVersion(rawVersion)) {
    notFound();
  }
  const version = rawVersion as AppVersion;
  const versionInfo = VERSIONS[version];

  const session = await getSession();
  if (session) {
    if (session.role === "ADMIN") redirect(`/${version}/admin`);
    if (session.role === "GUARD") redirect(`/${version}/guard`);
    redirect(`/${version}/user`);
  }

  // Feature cards tailored strictly to what corresponds to this version
  const features: { icon: string; titulo: string; texto: string; vRequired: AppVersion }[] = [];

  // Version 1 features
  features.push({
    icon: "qr",
    titulo: "QR de acceso y lectura",
    texto: "Generación de códigos dinámicos firmados (HMAC) y lectura/validación por cámara.",
    vRequired: "v1",
  });
  features.push({
    icon: "car",
    titulo: "Registro de vehículos personales",
    texto: "Inscripción y gestión de patentes autorizadas para funcionarios y alumnos.",
    vRequired: "v1",
  });
  features.push({
    icon: "file",
    titulo: "Gestión de infracciones",
    texto: "Fiscalización, registro de multas, seguimiento y notificación al infractor.",
    vRequired: "v1",
  });

  // Version 2 feature (Access & Exit records)
  if (isFeatureEnabled(version, "access_records")) {
    features.push({
      icon: "barrier",
      titulo: "Registro de accesos (IN / OUT)",
      texto: "Control en pórtico: bitácora histórica de ingresos y salidas con trazabilidad completa.",
      vRequired: "v2",
    });
  }

  // Version 3 feature (Parking monitoring)
  if (isFeatureEnabled(version, "parking_monitoring")) {
    features.push({
      icon: "parking",
      titulo: "Monitoreo de estacionamiento",
      texto: "Cálculo de cupos y ocupación por sector en tiempo real con semáforos de disponibilidad.",
      vRequired: "v3",
    });
  }

  return (
    <div className={s.page}>
      <header className={s.top}>
        <div className={s.topIn}>
          <span className={s.topName}>S.I.G.T.E</span>
          <span className={s.topTag}>UTFSM · Sede Viña del Mar</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <VersionSwitcher currentVersion={version} />
            <Link href={`/${version}/login`} className={s.topCta}>
              Iniciar sesión <I name="arrowRight" size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 20,
              background: "var(--usm-azul-050)",
              border: "1px solid var(--usm-azul-100)",
              color: "var(--usm-azul)",
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: "var(--ff-mono)",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--usm-azul)",
                display: "inline-block",
              }}
            />
            {versionInfo.name.toUpperCase()}
          </div>

          <h1>
            {version === "v1" ? (
              <>
                Identidad y vehículos, <span className="accent">versión 1</span>.
              </>
            ) : version === "v2" ? (
              <>
                Control de acceso y bitácora, <span className="accent">versión 2</span>.
              </>
            ) : (
              <>
                Control total del campus, <span className="accent">versión completa</span>.
              </>
            )}
          </h1>

          <p className={s.lead}>{versionInfo.description}</p>

          <div className={s.actions}>
            <Link href={`/${version}/login`} className="btn primary lg">
              <I name="login" size={18} /> Acceder a {version.toUpperCase()}
            </Link>
            <Link href={`/${version}/register`} className="btn secondary lg">
              Crear cuenta en {version.toUpperCase()}
            </Link>
          </div>
        </section>

        {/* Version Switcher Hub Strip */}
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {VERSION_LIST.map((v) => {
              const isCurrent = v.id === version;
              return (
                <Link
                  key={v.id}
                  href={`/${v.id}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: isCurrent
                        ? "2px solid var(--usm-azul)"
                        : "1px solid var(--line)",
                      background: isCurrent ? "var(--usm-azul-050)" : "var(--surface)",
                      boxShadow: isCurrent ? "var(--sh-2)" : "var(--sh-1)",
                      transition: "transform 0.15s ease",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <b
                          style={{
                            fontFamily: "var(--ff-mono)",
                            fontSize: 14,
                            color: isCurrent ? "var(--usm-azul)" : "var(--ink-900)",
                          }}
                        >
                          {v.label}
                        </b>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: isCurrent ? "var(--usm-azul)" : "var(--surface-muted, #eee)",
                            color: isCurrent ? "#fff" : "var(--ink-500)",
                          }}
                        >
                          {v.badge}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: "var(--ink-700)", margin: 0 }}>
                        {v.tagline}
                      </p>
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        color: isCurrent ? "var(--usm-azul)" : "var(--ink-500)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isCurrent ? "✓ Versión activa" : "Cambiar a " + v.id + " →"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className={s.wrap}>
          <section className={s.section}>
            <div className={s.sectionTitle}>
              Funcionalidades habilitadas en {version.toUpperCase()}
            </div>
            <div className={s.features}>
              {features.map((feat) => (
                <div className={s.feat} key={feat.titulo}>
                  <span className={s.featIcon}>
                    <I name={feat.icon} size={20} stroke={1.9} />
                  </span>
                  <div>
                    <b>{feat.titulo}</b>
                    <span>{feat.texto}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className={s.footer}>
        <div className={s.footerIn}>
          <b>S.I.G.T.E</b> · {versionInfo.name} · Universidad Técnica Federico Santa María.
          <br />
          Navegación dividida por versiones incrementales (/v1, /v2, /v3).
        </div>
      </footer>
    </div>
  );
}
