import { notFound } from "next/navigation";
import { isValidVersion } from "@/lib/versions";

export default async function VersionRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ version: string }>;
}) {
  const { version } = await params;

  if (!isValidVersion(version)) {
    notFound();
  }

  return <>{children}</>;
}
