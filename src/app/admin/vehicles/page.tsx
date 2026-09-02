"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, Badge, Plate, Modal } from "@/components/ui-system";
import { I } from "@/components/Icon";

type Vehicle = {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  color: string | null;
  authorized: boolean;
  owner: { id: string; name: string; email: string };
  currentBlock: { id: string; name: string } | null;
};

type OwnerHit = {
  id: string;
  name: string;
  email: string;
  rut: string | null;
  userType: "STAFF" | "STUDENT" | null;
};

const USER_TYPE_LABEL: Record<"STAFF" | "STUDENT", string> = {
  STAFF: "Funcionario/Docente",
  STUDENT: "Alumno",
};

export default function AdminVehiclesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }} className="muted">Cargando…</div>}>
      <AdminVehicles />
    </Suspense>
  );
}

function AdminVehicles() {
  const params = useSearchParams();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de búsqueda
  const [searchPlate, setSearchPlate] = useState(params.get("q") ?? "");
  const [searchName, setSearchName] = useState("");
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([]);

  // Registro de vehículo (solo admin)
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ plate: "", make: "", model: "", color: "" });
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerHits, setOwnerHits] = useState<OwnerHit[]>([]);
  const [owner, setOwner] = useState<OwnerHit | null>(null);
  const [saving, setSaving] = useState(false);

  // Carga lista de bloques para el filtro de ubicación
  useEffect(() => {
    fetch("/api/parking")
      .then((r) => r.json())
      .then((r) => setBlocks(r.blocks ?? []))
      .catch(() => {});
  }, []);

  // Busca dueños por nombre/correo/RUT mientras se escribe (debounce simple).
  useEffect(() => {
    if (owner || ownerQuery.trim().length < 2) {
      setOwnerHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/users?q=${encodeURIComponent(ownerQuery.trim())}`).then((r) => r.json());
      setOwnerHits(r.users ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [ownerQuery, owner]);

  function resetNew() {
    setForm({ plate: "", make: "", model: "", color: "" });
    setOwnerQuery("");
    setOwnerHits([]);
    setOwner(null);
  }

  async function createVehicle(e: React.FormEvent) {
    e.preventDefault();
    if (!owner) return toast.error("Selecciona un dueño");
    setSaving(true);
    try {
      const r = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: form.plate,
          make: form.make || undefined,
          model: form.model || undefined,
          color: form.color || undefined,
          ownerId: owner.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) return toast.error(data.error ?? "No se pudo registrar");
      toast.success(`Vehículo ${data.vehicle.plate} enlazado a ${owner.name}`);
      setShowNew(false);
      resetNew();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function load(overrides?: {
    plate?: string;
    name?: string;
    location?: string;
    status?: string;
  }) {
    setLoading(true);
    const p = overrides?.plate ?? searchPlate;
    const n = overrides?.name ?? searchName;
    const loc = overrides?.location ?? filterLocation;
    const st = overrides?.status ?? filterStatus;

    const queryParams = new URLSearchParams();
    if (p.trim()) queryParams.set("plate", p.trim().toUpperCase());
    if (n.trim()) queryParams.set("name", n.trim());
    if (loc && loc !== "ALL") queryParams.set("location", loc);
    if (st && st !== "ALL") queryParams.set("status", st);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
    try {
      const r = await fetch(`/api/vehicles${queryString}`).then((r) => r.json());
      setItems(r.vehicles ?? []);
    } catch {
      toast.error("Error al cargar los vehículos");
    } finally {
      setLoading(false);
    }
  }

  // Búsqueda y filtrado dinámico con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchPlate, searchName, filterLocation, filterStatus]);

  // Refleja el parámetro `?q=` que envía la barra superior.
  useEffect(() => {
    const q = params.get("q") ?? "";
    if (q) setSearchPlate(q);
  }, [params]);

  function clearFilters() {
    setSearchPlate("");
    setSearchName("");
    setFilterLocation("ALL");
    setFilterStatus("ALL");
  }

  const hasActiveFilters =
    Boolean(searchPlate.trim()) ||
    Boolean(searchName.trim()) ||
    filterLocation !== "ALL" ||
    filterStatus !== "ALL";

  async function toggleAuth(v: Vehicle) {
    const r = await fetch(`/api/vehicles/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorized: !v.authorized }),
    });
    if (!r.ok) return toast.error("No se pudo actualizar");
    toast.success(v.authorized ? "Vehículo bloqueado" : "Vehículo autorizado");
    load();
  }

  async function remove(v: Vehicle) {
    if (!confirm(`¿Eliminar patente ${v.plate}?`)) return;
    const r = await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("No se pudo eliminar");
    toast.success("Vehículo eliminado");
    load();
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="row between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Vehículos</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            Registro completo del parque vehicular del campus
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowNew(true)}>
          <I name="plus" size={18} /> Registrar vehículo
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div
        className="card"
        style={{
          padding: "14px 16px",
          marginBottom: 16,
          background: "var(--surface)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 12,
        }}
      >
        {/* Buscar por patente */}
        <div style={{ flex: "1 1 180px", minWidth: 150 }}>
          <label className="field-lbl" style={{ marginBottom: 5, display: "block" }}>
            Patente
          </label>
          <div className="searchbox">
            <I name="car" size={16} />
            <input
              className="input mono"
              placeholder="Buscar patente…"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
        </div>

        {/* Buscar por nombre del dueño */}
        <div style={{ flex: "1 1 220px", minWidth: 180 }}>
          <label className="field-lbl" style={{ marginBottom: 5, display: "block" }}>
            Nombre del dueño
          </label>
          <div className="searchbox">
            <I name="search" size={16} />
            <input
              className="input"
              placeholder="Buscar por nombre o apellido…"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
        </div>

        {/* Filtro desplegable: Ubicación */}
        <div style={{ flex: "1 1 180px", minWidth: 160 }}>
          <label className="field-lbl" style={{ marginBottom: 5, display: "block" }}>
            Ubicación
          </label>
          <select
            className="select"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="ALL">Todas las ubicaciones</option>
            <option value="INSIDE">Dentro del campus</option>
            <option value="OUTSIDE">Fuera del campus</option>
            {blocks.length > 0 && (
              <optgroup label="Bloques específicos">
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Filtro desplegable: Estado */}
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label className="field-lbl" style={{ marginBottom: 5, display: "block" }}>
            Estado
          </label>
          <select
            className="select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Todos los estados</option>
            <option value="AUTHORIZED">Autorizado</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <div>
            <button
              className="btn ghost"
              style={{ fontSize: 13, padding: "10px 14px" }}
              onClick={clearFilters}
              title="Restablecer todos los filtros"
            >
              <I name="x" size={15} /> Limpiar
            </button>
          </div>
        )}
      </div>

      <div className="row between" style={{ marginBottom: 10, alignItems: "center" }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          Mostrando <strong>{items.length}</strong> {items.length === 1 ? "vehículo" : "vehículos"}
        </p>
      </div>

      <Card>
        <table className="table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Vehículo</th>
              <th>Color</th>
              <th>Dueño</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => (
              <tr key={v.id}>
                <td>
                  <Plate size="sm">{v.plate}</Plate>
                </td>
                <td>
                  {[v.make, v.model].filter(Boolean).join(" ") || (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className="muted">{v.color ?? "—"}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{v.owner.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {v.owner.email}
                  </div>
                </td>
                <td>
                  {v.currentBlock ? (
                    <Badge kind="info">{v.currentBlock.name}</Badge>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>
                      Fuera
                    </span>
                  )}
                </td>
                <td>
                  <Badge kind={v.authorized ? "go" : "no"}>
                    {v.authorized ? "Autorizado" : "Bloqueado"}
                  </Badge>
                </td>
                <td>
                  <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                    <button
                      className="btn ghost icon"
                      title={v.authorized ? "Bloquear" : "Autorizar"}
                      onClick={() => toggleAuth(v)}
                    >
                      <I name={v.authorized ? "shieldAlert" : "shieldCheck"} size={16} />
                    </button>
                    <button
                      className="btn danger icon"
                      title="Eliminar"
                      onClick={() => remove(v)}
                    >
                      <I name="trash" size={16} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 28 }} className="muted">
                  Cargando vehículos…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 28 }} className="muted">
                  No se encontraron vehículos con los filtros aplicados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {showNew && (
        <Modal
          title="Registrar vehículo"
          width={520}
          onClose={() => {
            setShowNew(false);
            resetNew();
          }}
        >
          <form onSubmit={createVehicle} style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {/* Dueño */}
            <div className="field">
              <label className="field-lbl">Dueño</label>
              {owner ? (
                <div className="row between" style={{ gap: 8, border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px" }}>
                  <span>
                    <span style={{ fontWeight: 600 }}>{owner.name}</span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      {owner.rut ?? owner.email}
                      {owner.userType ? ` · ${USER_TYPE_LABEL[owner.userType]}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn ghost icon"
                    title="Cambiar dueño"
                    onClick={() => {
                      setOwner(null);
                      setOwnerQuery("");
                    }}
                  >
                    <I name="x" size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="searchbox">
                    <I name="search" size={17} />
                    <input
                      className="input"
                      placeholder="Buscar por nombre, correo o RUT…"
                      value={ownerQuery}
                      onChange={(e) => setOwnerQuery(e.target.value)}
                    />
                  </div>
                  {ownerHits.length > 0 && (
                    <div style={{ border: "1px solid var(--line)", borderRadius: 10, marginTop: 6, maxHeight: 200, overflowY: "auto" }}>
                      {ownerHits.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          className="row between"
                          style={{ width: "100%", textAlign: "left", gap: 8, padding: "8px 12px", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer" }}
                          onClick={() => {
                            setOwner(h);
                            setOwnerHits([]);
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{h.name}</span>
                          <span className="muted" style={{ fontSize: 12 }}>
                            {h.rut ?? h.email}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="field">
              <label className="field-lbl" htmlFor="plate">Patente</label>
              <input
                id="plate"
                className="input mono"
                required
                minLength={3}
                placeholder="AABB12"
                value={form.plate}
                onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="make">Marca</label>
                <input
                  id="make"
                  className="input"
                  placeholder="Toyota"
                  value={form.make}
                  onChange={(e) => setForm({ ...form, make: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="model">Modelo</label>
                <input
                  id="model"
                  className="input"
                  placeholder="Yaris"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-lbl" htmlFor="color">Color</label>
              <input
                id="color"
                className="input"
                placeholder="Rojo"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setShowNew(false);
                  resetNew();
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn primary" disabled={saving || !owner || form.plate.trim().length < 3}>
                {saving ? "Registrando…" : "Registrar vehículo"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
