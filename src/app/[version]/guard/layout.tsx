import { PanelShell } from "@/components/PanelShell";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { AppVersion, getGuardNav, isValidVersion } from "@/lib/versions";
import { notFound, redirect } from "next/navigation";

export default async function VersionGuardLayout({
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
  if (session.role !== "GUARD" && session.role !== "ADMIN") redirect(`/${version}`);

  const groups = getGuardNav(version);

  return (
    <>
      <PanelShell
        groups={groups}
        title="Guardia"
        subtitle={`Operación de pórtico · ${version.toUpperCase()}`}
        userName={session.name}
        userRole="Guardia"
        version={version}
      >
        {children}
      </PanelShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
