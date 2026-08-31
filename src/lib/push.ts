import { prisma } from "./prisma";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

// Envía una notificación push (Expo) a todos los tokens del usuario y descarta
// los que reporten DeviceNotRegistered.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const records = await prisma.pushToken.findMany({ where: { userId } });
  if (records.length === 0) return;

  const messages = records.map((r) => ({
    to: r.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: "default" as const,
  }));

  let response: Response;
  try {
    response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error("[push] failed to reach Expo API", err);
    return;
  }

  if (!response.ok) {
    console.error("[push] Expo API error", response.status);
    return;
  }

  type TicketResult = { status: "ok" } | { status: "error"; details?: { error?: string } };
  const { data: tickets }: { data: TicketResult[] } = await response.json();

  const deadTokens: string[] = [];
  tickets.forEach((ticket, i) => {
    if (
      ticket.status === "error" &&
      ticket.details?.error === "DeviceNotRegistered"
    ) {
      deadTokens.push(records[i].token);
    }
  });

  if (deadTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
  }
}
