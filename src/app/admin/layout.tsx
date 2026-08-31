import { PanelShell, type PanelNavGroup } from "@/components/PanelShell";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const groups: PanelNavGroup[] = [
  { grp: "Administración", items: [
    { href: "/admin", label: "Panel", icon: "dashboard" },
    { href: "/admin/users", label: "Usuarios", icon: "users" },
    { href: "/admin/vehicles", label: "Vehículos", icon: "car" },
    { href: "/admin/parking", label: "Bloques", icon: "parking" },
    { href: "/admin/access", label: "Accesos", icon: "history" },
    { href: "/admin/infractions", label: "Infracciones", icon: "shieldAlert" },
  ] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");
  return (
    <>
      <PanelShell groups={groups} title="Administración" subtitle="Vista de mando" userName={session.name} userRole="Administración">
        {children}
      </PanelShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
