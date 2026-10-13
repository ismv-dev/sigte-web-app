import { PanelShell } from "@/components/PanelShell";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { AppVersion, getUserNavGroups, isValidVersion } from "@/lib/versions";
import { notFound, redirect } from "next/navigation";

export default async function VersionUserLayout({
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

  const groups = getUserNavGroups(version);

  return (
    <>
      <PanelShell
        groups={groups}
        title="Portal de Usuario"
        subtitle={`Servicios al conductor · ${version.toUpperCase()}`}
        userName={session.name}
        userRole="Conductor"
        version={version}
      >
        <div className="page-padding" style={{ padding: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
          {children}
        </div>
      </PanelShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
