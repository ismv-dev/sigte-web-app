/* Landing principal de S.I.G.T.E — Portal con división de versiones (/v1, /v2, /v3) */
import Link from "next/link";
import { I } from "@/components/Icon";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { VersionSwitcher } from "@/components/VersionSwitcher";
import { VERSION_LIST } from "@/lib/versions";
import s from "./home.module.css";

export default async function Home() {
  const session = await getSession();
  if (session) {
    if (session.role === "ADMIN") redirect("/v3/admin");
    if (session.role === "GUARD") redirect("/v3/guard");
    redirect("/v3/user");
  }

  return (
    <div className={s.page}>
      <header className={s.top}>
        <div className={s.topIn}>
          <span className={s.topName}>S.I.G.T.E</span>
          <span className={s.topTag}>UTFSM · Sede Viña del Mar</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            <VersionSwitcher currentVersion="v3" />
            <Link href="/v3/login" className={s.topCta}>
              Iniciar sesión <I name="arrowRight" size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.eyebrow}>Tránsito y estacionamiento del campus · UTFSM</div>
          <h1>
            Control de acceso vehicular, <span className="accent">dividido en 3 versiones</span>.
          </h1>
          <p className={s.lead}>
            Sistema Inteligente de Gestión de Tránsito y Estacionamiento estructurado incrementalmente
            por URL (<strong>/v1</strong>, <strong>/v2</strong>, <strong>/v3</strong>). Cada versión
            habilita únicamente las funciones que le corresponden.
          </p>
          <div className={s.actions}>
            <Link href="/v3" className="btn primary lg">
              <I name="login" size={18} /> Explorar versión 3 (Completa)
            </Link>
            <Link href="/v3/login" className="btn secondary lg">
              Iniciar sesión
            </Link>
          </div>
        </section>

        {/* Versiones del Sistema: Sección destacada */}
        <div className={s.wrap} style={{ marginBottom: 40 }}>
          <section className={s.section}>
            <div className={s.sectionTitle} style={{ textAlign: "center", marginBottom: 20 }}>
              Selecciona una versión para navegar el sistema
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 20,
              }}
            >
              {VERSION_LIST.map((v) => (
                <div
                  key={v.id}
                  style={{
                    background: "var(--surface)",
                    borderRadius: 16,
                    border: v.id === "v3" ? "2px solid var(--usm-azul)" : "1px solid var(--line)",
                    boxShadow: v.id === "v3" ? "var(--sh-3)" : "var(--sh-1)",
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                  }}
                >
                  {v.id === "v3" && (
                    <div
                      style={{
                        position: "absolute",
                        top: -12,
                        right: 20,
                        background: "var(--usm-azul)",
                        color: "#fff",
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "var(--ff-mono)",
                        textTransform: "uppercase",
                      }}
                    >
                      Completo
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          fontFamily: "var(--ff-mono)",
                          color: "var(--usm-azul)",
                        }}
                      >
                        /{v.id}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 8,
                          background: "var(--accent-050)",
                          color: "var(--usm-azul)",
                        }}
                      >
                        {v.label}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 17, marginBottom: 8, lineHeight: 1.25 }}>
                      {v.tagline}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--ink-500)", marginBottom: 16 }}>
                      {v.description}
                    </p>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "var(--ink-700)" }}>
                        Módulos incluidos:
                      </div>
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
                        {v.features.map((f) => (
                          <li
                            key={f.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 12.5,
                              color: f.included ? "var(--ink-900)" : "var(--ink-400)",
                            }}
                          >
                            <I
                              name={f.included ? "check" : "x"}
                              size={15}
                              stroke={f.included ? 2.5 : 1.5}
                            />
                            <span style={{ textDecoration: f.included ? "none" : "line-through" }}>
                              {f.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div style={{ marginTop: 22, display: "grid", gap: 8 }}>
                    <Link href={`/${v.id}`} className="btn primary block">
                      Explorar /{v.id} <I name="arrowRight" size={15} />
                    </Link>
                    <Link
                      href={`/${v.id}/login`}
                      className="btn ghost block"
                      style={{ textAlign: "center", fontSize: 13 }}
                    >
                      Iniciar sesión en {v.id.toUpperCase()}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className={s.footer}>
        <div className={s.footerIn}>
          <b>S.I.G.T.E</b> · Universidad Técnica Federico Santa María, Sede Viña del Mar.
          <br />
          Sistema modular con división incremental de funcionalidades por versión (/v1, /v2, /v3).
        </div>
      </footer>
    </div>
  );
}
