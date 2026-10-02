import { PanelShell } from "@/components/PanelShell";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { AppVersion, getAdminNav, isValidVersion } from "@/lib/versions";
import { notFound, redirect } from "next/navigation";

export default async function VersionAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  const { version: rawVersion } = await params;
  if (!isValidVersion(rawVersion)) {
    notFound();
  }
  const version = rawVersion as AppVersion;

  const session = await getSession();
  if (!session) redirect(`/${version}/login`);
  if (session.role !== "ADMIN") redirect(`/${version}`);

  const groups = getAdminNav(version);

  return (
    <>
      <PanelShell
        groups={groups}
        title="Administración"
        subtitle={`Vista de mando · ${version.toUpperCase()}`}
        userName={session.name}
        userRole="Administración"
        version={version}
      >
        {children}
      </PanelShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
