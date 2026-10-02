import { PortalShell } from "@/components/PortalShell";
import { Toaster } from "@/components/ui/sonner";
import { getSession } from "@/lib/auth";
import { AppVersion, getUserNav, isValidVersion } from "@/lib/versions";
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

  const tabs = getUserNav(version);

  return (
    <>
      <PortalShell tabs={tabs} userName={session.name} version={version}>
        {children}
      </PortalShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
