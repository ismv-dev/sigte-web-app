"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Card, Badge, Modal } from "@/components/ui-system";
import { I } from "@/components/Icon";
import { formatRut, isValidRut } from "@/lib/rut";
import type { UserSummaryItem, UserType, UserRole } from "@/types/user";

export default function AdminUsers() {
  const [users, setUsers] = useState<UserSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "STUDENT" | "STAFF">("ALL");

  // Modales
  const [showNew, setShowNew] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSummaryItem | null>(null);

  // Formulario nuevo usuario
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER" as UserRole,
    userType: "STUDENT" as UserType | "",
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

  // Formulario editar usuario
  const [editForm, setEditForm] = useState({
    name: "",
    role: "USER" as UserRole,
    userType: "" as UserType | "",
    phone: "",
    universityId: "",
    position: "",
    department: "",
    rut: "",
    academicDepartment: "",
    career: "",
  });

  async function load() {
    setLoading(true);
    try {
      const q = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
      const r = await fetch(`/api/users${q}`).then((r) => r.json());
      setUsers(r.users ?? []);
    } catch {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (typeFilter === "ALL") return true;
      return u.userType === typeFilter;
    });
  }, [users, typeFilter]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (newUser.userType === "STUDENT" && newUser.rut && !isValidRut(newUser.rut)) {
      return toast.error("El RUT ingresado es inválido");
    }

    const payload = {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      role: newUser.role,
      userType: newUser.userType || null,
      phone: newUser.phone || null,
      universityId: newUser.universityId || undefined,
      position: newUser.userType === "STAFF" ? newUser.position : null,
      department: newUser.userType === "STAFF" ? newUser.department : null,
      rut: newUser.userType === "STUDENT" && newUser.rut ? formatRut(newUser.rut) : null,
      academicDepartment: newUser.userType === "STUDENT" ? newUser.academicDepartment : null,
      career: newUser.userType === "STUDENT" ? newUser.career : null,
    };

    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) return toast.error(data.error ?? "Error al crear usuario");
    toast.success("Usuario creado con éxito");
    setShowNew(false);
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "USER",
      userType: "STUDENT",
      phone: "",
      universityId: "",
      position: "",
      department: "",
      rut: "",
      academicDepartment: "",
      career: "",
    });
    load();
  }

  function openEdit(u: UserSummaryItem) {
    setEditingUser(u);
    setEditForm({
      name: u.name,
      role: u.role,
      userType: u.userType ?? "",
      phone: u.phone ?? "",
      universityId: u.universityId ?? "",
      position: u.position ?? "",
      department: u.department ?? "",
      rut: u.rut ?? "",
      academicDepartment: u.academicDepartment ?? "",
      career: u.career ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (editForm.userType === "STUDENT" && editForm.rut && !isValidRut(editForm.rut)) {
      return toast.error("El RUT ingresado es inválido");
    }

    const patchPayload = {
      name: editForm.name,
      role: editForm.role,
      userType: editForm.userType || null,
      phone: editForm.phone || null,
      universityId: editForm.universityId || null,
      position: editForm.userType === "STAFF" ? editForm.position : null,
      department: editForm.userType === "STAFF" ? editForm.department : null,
      rut: editForm.userType === "STUDENT" && editForm.rut ? formatRut(editForm.rut) : null,
      academicDepartment: editForm.userType === "STUDENT" ? editForm.academicDepartment : null,
      career: editForm.userType === "STUDENT" ? editForm.career : null,
    };

    const r = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload),
    });
    const data = await r.json();
    if (!r.ok) return toast.error(data.error ?? "Error al actualizar");
    toast.success("Usuario actualizado");
    setEditingUser(null);
    load();
  }

  async function patchUser(id: string, patch: Partial<UserSummaryItem>) {
    const r = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const e = await r.json();
      return toast.error(e.error ?? "Error");
    }
    toast.success("Usuario actualizado");
    load();
  }

  async function remove(u: UserSummaryItem) {
    if (!confirm(`¿Eliminar al usuario ${u.name} (${u.email})?`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!r.ok) {
      const e = await r.json();
      return toast.error(e.error ?? "Error");
    }
    toast.success("Usuario eliminado");
    load();
  }

  function initials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return (
    <div style={{ padding: 24 }}>
      <div className="row between" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontSize: 24 }}>Usuarios</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            Gestión integral de perfiles de Alumnos, Funcionarios/Docentes y accesos
          </p>
        </div>
        <button className="btn primary" onClick={() => setShowNew(true)}>
          <I name="plus" size={18} />
          Nuevo usuario
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="row between" style={{ gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className={"btn sm " + (typeFilter === "ALL" ? "primary" : "ghost")}
            onClick={() => setTypeFilter("ALL")}
          >
            Todos ({users.length})
          </button>
          <button
            type="button"
            className={"btn sm " + (typeFilter === "STUDENT" ? "primary" : "ghost")}
            onClick={() => setTypeFilter("STUDENT")}
          >
            <I name="userCheck" size={14} /> Alumnos ({users.filter((u) => u.userType === "STUDENT").length})
          </button>
          <button
            type="button"
            className={"btn sm " + (typeFilter === "STAFF" ? "primary" : "ghost")}
            onClick={() => setTypeFilter("STAFF")}
          >
            <I name="userCheck" size={14} /> Funcionarios / Docentes ({users.filter((u) => u.userType === "STAFF").length})
          </button>
        </div>

        <div className="row" style={{ gap: 8, maxWidth: 360, flex: 1 }}>
          <div className="searchbox" style={{ flex: 1 }}>
            <I name="search" size={16} />
            <input
              className="input"
              placeholder="Buscar por nombre, RUT, carrera…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <button className="btn primary sm" onClick={load}>
            Buscar
          </button>
        </div>
      </div>

      <Card>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Datos Institucionales</th>
                <th>Contacto</th>
                <th>Rol</th>
                <th style={{ textAlign: "center" }}>Autos</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24 }} className="muted">
                    Cargando usuarios…
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 24 }} className="muted">
                    Sin usuarios encontrados
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="row" style={{ gap: 10 }}>
                        <span className="avatar sm">{initials(u.name)}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {u.email}
                          </div>
                        </div>
                      </span>
                    </td>
                    <td>
                      {u.userType === "STUDENT" ? (
                        <Badge kind="info">Alumno</Badge>
                      ) : u.userType === "STAFF" ? (
                        <Badge kind="wait">Funcionario / Docente</Badge>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      {u.userType === "STUDENT" ? (
                        <div style={{ fontSize: 12 }}>
                          {u.rut && <div><span className="muted">RUT:</span> <span className="mono">{u.rut}</span></div>}
                          {u.career && <div><span className="muted">Carrera:</span> <strong>{u.career}</strong></div>}
                          {u.academicDepartment && <div className="muted">{u.academicDepartment}</div>}
                        </div>
                      ) : u.userType === "STAFF" ? (
                        <div style={{ fontSize: 12 }}>
                          {u.position && <div><span className="muted">Cargo:</span> <strong>{u.position}</strong></div>}
                          {u.department && <div className="muted">{u.department}</div>}
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>{u.universityId ? `ID: ${u.universityId}` : "—"}</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: 12 }}>
                        {u.phone ? <div>{u.phone}</div> : <span className="muted">Sin teléfono</span>}
                        {u.universityId && <div className="mono muted" style={{ fontSize: 11 }}>ID: {u.universityId}</div>}
                      </div>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ minWidth: 125, fontSize: 12 }}
                        value={u.role}
                        aria-label={`Cambiar rol de ${u.name}`}
                        onChange={(e) => patchUser(u.id, { role: e.target.value as UserRole })}
                      >
                        <option value="USER">Usuario</option>
                        <option value="GUARD">Guardia</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    </td>
                    <td style={{ textAlign: "center" }} className="mono">
                      {u._count.vehicles}
                    </td>
                    <td>
                      <Badge kind={u.active ? "go" : "neutral"}>
                        {u.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td>
                      <span className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn ghost icon"
                          title="Editar perfil institucional"
                          onClick={() => openEdit(u)}
                        >
                          <I name="edit" size={16} />
                        </button>
                        <button
                          className="btn ghost icon"
                          title={u.active ? "Desactivar usuario" : "Activar usuario"}
                          onClick={() => patchUser(u.id, { active: !u.active })}
                        >
                          <I name={u.active ? "x" : "check"} size={16} />
                        </button>
                        <button
                          className="btn danger icon"
                          title="Eliminar usuario"
                          onClick={() => remove(u)}
                        >
                          <I name="trash" size={16} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Crear Usuario */}
      {showNew && (
        <Modal title="Crear nuevo usuario" onClose={() => setShowNew(false)} width={560}>
          <form onSubmit={create} style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {/* Tipo de Usuario */}
            <div className="field">
              <label className="field-lbl">Tipo institucional</label>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className={"btn block sm " + (newUser.userType === "STUDENT" ? "primary" : "ghost")}
                  onClick={() => setNewUser({ ...newUser, userType: "STUDENT" })}
                >
                  <I name="userCheck" size={15} /> Alumno
                </button>
                <button
                  type="button"
                  className={"btn block sm " + (newUser.userType === "STAFF" ? "primary" : "ghost")}
                  onClick={() => setNewUser({ ...newUser, userType: "STAFF" })}
                >
                  <I name="userCheck" size={15} /> Funcionario / Docente
                </button>
                <button
                  type="button"
                  className={"btn block sm " + (newUser.userType === "" ? "primary" : "ghost")}
                  onClick={() => setNewUser({ ...newUser, userType: "" })}
                >
                  General / Otro
                </button>
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="name">Nombre completo</label>
                <input
                  id="name"
                  className="input"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="email">Email</label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="pw">Contraseña</label>
                <input
                  id="pw"
                  className="input"
                  type="password"
                  required
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  className="input"
                  placeholder="+56 9 1234 5678"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Campos condicionales Funcionario */}
            {newUser.userType === "STAFF" && (
              <div className="row" style={{ gap: 12, background: "var(--surface-muted)", padding: 12, borderRadius: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-lbl" htmlFor="position">Cargo</label>
                  <input
                    id="position"
                    className="input"
                    placeholder="Docente, Secretaria, Director…"
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-lbl" htmlFor="dept">Departamento o Unidad</label>
                  <input
                    id="dept"
                    className="input"
                    placeholder="Depto. de Informática"
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Campos condicionales Alumno */}
            {newUser.userType === "STUDENT" && (
              <div style={{ display: "grid", gap: 10, background: "var(--surface-muted)", padding: 12, borderRadius: 8 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-lbl" htmlFor="rut">RUT</label>
                    <input
                      id="rut"
                      className="input"
                      placeholder="12.345.678-9"
                      value={newUser.rut}
                      onChange={(e) => setNewUser({ ...newUser, rut: e.target.value })}
                      onBlur={(e) => e.target.value && isValidRut(e.target.value) && setNewUser({ ...newUser, rut: formatRut(e.target.value) })}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-lbl" htmlFor="academicDept">Departamento Académico</label>
                    <input
                      id="academicDept"
                      className="input"
                      placeholder="Depto. de Informática"
                      value={newUser.academicDepartment}
                      onChange={(e) => setNewUser({ ...newUser, academicDepartment: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-lbl" htmlFor="career">Carrera</label>
                  <input
                    id="career"
                    className="input"
                    placeholder="Ingeniería Civil Informática"
                    value={newUser.career}
                    onChange={(e) => setNewUser({ ...newUser, career: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="uid">Credencial Universitaria</label>
                <input
                  id="uid"
                  className="input"
                  placeholder="USR-2026-123"
                  value={newUser.universityId}
                  onChange={(e) => setNewUser({ ...newUser, universityId: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="new-user-role">Rol en el sistema</label>
                <select
                  id="new-user-role"
                  className="select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="USER">Usuario (Estándar)</option>
                  <option value="GUARD">Guardia</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Crear usuario
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Editar Usuario */}
      {editingUser && (
        <Modal title={`Editar perfil: ${editingUser.name}`} onClose={() => setEditingUser(null)} width={560}>
          <form onSubmit={saveEdit} style={{ display: "grid", gap: 14, marginTop: 14 }}>
            <div className="field">
              <label className="field-lbl">Tipo institucional</label>
              <div className="row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className={"btn block sm " + (editForm.userType === "STUDENT" ? "primary" : "ghost")}
                  onClick={() => setEditForm({ ...editForm, userType: "STUDENT" })}
                >
                  <I name="userCheck" size={15} /> Alumno
                </button>
                <button
                  type="button"
                  className={"btn block sm " + (editForm.userType === "STAFF" ? "primary" : "ghost")}
                  onClick={() => setEditForm({ ...editForm, userType: "STAFF" })}
                >
                  <I name="userCheck" size={15} /> Funcionario / Docente
                </button>
                <button
                  type="button"
                  className={"btn block sm " + (editForm.userType === "" ? "primary" : "ghost")}
                  onClick={() => setEditForm({ ...editForm, userType: "" })}
                >
                  Sin tipo
                </button>
              </div>
            </div>

            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="edit-name">Nombre completo</label>
                <input
                  id="edit-name"
                  className="input"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="edit-phone">Teléfono</label>
                <input
                  id="edit-phone"
                  className="input"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Campos condicionales Funcionario */}
            {editForm.userType === "STAFF" && (
              <div className="row" style={{ gap: 12, background: "var(--surface-muted)", padding: 12, borderRadius: 8 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-lbl" htmlFor="edit-position">Cargo</label>
                  <input
                    id="edit-position"
                    className="input"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label className="field-lbl" htmlFor="edit-dept">Departamento o Unidad</label>
                  <input
                    id="edit-dept"
                    className="input"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Campos condicionales Alumno */}
            {editForm.userType === "STUDENT" && (
              <div style={{ display: "grid", gap: 10, background: "var(--surface-muted)", padding: 12, borderRadius: 8 }}>
                <div className="row" style={{ gap: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-lbl" htmlFor="edit-rut">RUT</label>
                    <input
                      id="edit-rut"
                      className="input"
                      value={editForm.rut}
                      onChange={(e) => setEditForm({ ...editForm, rut: e.target.value })}
                      onBlur={(e) => e.target.value && isValidRut(e.target.value) && setEditForm({ ...editForm, rut: formatRut(e.target.value) })}
                    />
                  </div>
                  <div className="field" style={{ flex: 1 }}>
                    <label className="field-lbl" htmlFor="edit-acad-dept">Departamento Académico</label>
                    <input
                      id="edit-acad-dept"
                      className="input"
                      value={editForm.academicDepartment}
                      onChange={(e) => setEditForm({ ...editForm, academicDepartment: e.target.value })}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-lbl" htmlFor="edit-career">Carrera</label>
                  <input
                    id="edit-career"
                    className="input"
                    value={editForm.career}
                    onChange={(e) => setEditForm({ ...editForm, career: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="edit-uid">Credencial Universitaria</label>
                <input
                  id="edit-uid"
                  className="input"
                  value={editForm.universityId}
                  onChange={(e) => setEditForm({ ...editForm, universityId: e.target.value })}
                />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label className="field-lbl" htmlFor="edit-role">Rol</label>
                <select
                  id="edit-role"
                  className="select"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                >
                  <option value="USER">Usuario</option>
                  <option value="GUARD">Guardia</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn ghost" onClick={() => setEditingUser(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Guardar cambios
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
