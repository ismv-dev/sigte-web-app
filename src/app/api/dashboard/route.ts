import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api";

/**
 * GET /api/dashboard — métricas agregadas.
 * Solo ADMIN ve todo; GUARD ve métricas operativas; USER ve las propias.
 */
export const GET = withAuth(async (_req, { session }) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const last7 = new Date(now.getTime() - 7 * 86400_000);

  if (session.role === "USER") {
    const [vehicles, accessToday, openInfractions, unreadNotifs] =
      await Promise.all([
        prisma.vehicle.count({ where: { ownerId: session.sub } }),
        prisma.accessLog.count({
          where: { vehicle: { ownerId: session.sub }, timestamp: { gte: startOfDay } },
        }),
        prisma.infraction.count({ where: { userId: session.sub, status: "OPEN" } }),
        prisma.notification.count({ where: { userId: session.sub, read: false } }),
      ]);
    return NextResponse.json({
      scope: "user",
      metrics: { vehicles, accessToday, openInfractions, unreadNotifs },
    });
  }

  const [
    totalUsers,
    totalGuards,
    totalAdmins,
    totalVehicles,
    authorizedVehicles,
    totalBlocks,
    totalAccessLogs,
    accessToday,
    currentInside,
    openInfractions,
    infractionsLast7,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "GUARD" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { authorized: true } }),
    prisma.parkingBlock.count(),
    prisma.accessLog.count(),
    prisma.accessLog.count({ where: { timestamp: { gte: startOfDay } } }),
    prisma.vehicle.count({ where: { currentBlockId: { not: null } } }),
    prisma.infraction.count({ where: { status: "OPEN" } }),
    prisma.infraction.count({ where: { createdAt: { gte: last7 } } }),
  ]);

  // Serie de accesos por día (últimos 7)
  const raw = await prisma.accessLog.findMany({
    where: { timestamp: { gte: last7 } },
    select: { timestamp: true, direction: true },
  });
  const byDay: Record<string, { in: number; out: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400_000);
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { in: 0, out: 0 };
  }
  for (const l of raw) {
    const key = l.timestamp.toISOString().slice(0, 10);
    if (byDay[key]) {
      if (l.direction === "IN") byDay[key].in++;
      else byDay[key].out++;
    }
  }
  const series = Object.entries(byDay).map(([date, v]) => ({ date, ...v }));

  // Ocupación por bloque
  const blocks = await prisma.parkingBlock.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });
  const occupancy = blocks.map((b) => ({
    id: b.id,
    name: b.name,
    capacity: b.capacity,
    occupied: b._count.vehicles,
    percentage: Math.round((b._count.vehicles / b.capacity) * 100),
  }));

  // Top patentes por ingreso últimos 7 días
  const topVehiclesRaw = await prisma.accessLog.groupBy({
    by: ["vehicleId"],
    where: { timestamp: { gte: last7 }, direction: "IN" },
    _count: { vehicleId: true },
    orderBy: { _count: { vehicleId: "desc" } },
    take: 5,
  });
  const topVehicles = await Promise.all(
    topVehiclesRaw.map(async (row) => {
      const v = await prisma.vehicle.findUnique({
        where: { id: row.vehicleId },
        select: { plate: true, owner: { select: { name: true } } },
      });
      return { plate: v?.plate ?? "?", owner: v?.owner?.name ?? "—", count: row._count.vehicleId };
    })
  );

  // Distribución de métodos (últimos 7 días)
  const methodLogs = await prisma.accessLog.findMany({
    where: { timestamp: { gte: last7 } },
    select: { method: true },
  });
  const methodDist: Record<string, number> = { PLATE: 0, QR: 0, CARD: 0, MANUAL: 0 };
  for (const l of methodLogs) methodDist[l.method] = (methodDist[l.method] ?? 0) + 1;

  // Hora pico (IN, últimos 7 días)
  const inLogs7 = await prisma.accessLog.findMany({
    where: { timestamp: { gte: last7 }, direction: "IN" },
    select: { timestamp: true },
  });
  const byHour: Record<number, number> = {};
  for (const l of inLogs7) {
    const h = l.timestamp.getUTCHours();
    byHour[h] = (byHour[h] ?? 0) + 1;
  }
  const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Promedio diario de accesos (últimos 7 días)
  const avgDailyAccess = Math.round(
    series.reduce((s, d) => s + d.in + d.out, 0) / 7
  );

  // Tasa de autorización (últimos 7 días)
  const [authorizedLast7, totalLast7] = await Promise.all([
    prisma.accessLog.count({ where: { timestamp: { gte: last7 }, authorized: true } }),
    prisma.accessLog.count({ where: { timestamp: { gte: last7 } } }),
  ]);
  const authRate = totalLast7 > 0 ? Math.round((authorizedLast7 / totalLast7) * 100) : 100;

  return NextResponse.json({
    scope: session.role.toLowerCase(),
    metrics: {
      totalUsers,
      totalGuards,
      totalAdmins,
      totalVehicles,
      authorizedVehicles,
      totalBlocks,
      totalAccessLogs,
      accessToday,
      currentInside,
      openInfractions,
      infractionsLast7,
      avgDailyAccess,
      authRate,
      peakHour: peakHour !== null ? `${String(peakHour).padStart(2, "0")}:00` : null,
    },
    series,
    occupancy,
    topVehicles,
    methodDist,
  });
});
