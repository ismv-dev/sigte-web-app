import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// La presentación es el 26 de Junio 2026 a las 12:00 CLT (15:00 UTC)
const PRESENTACION = new Date("2026-06-26T15:00:00.000Z");

function ago(days: number, h: number, m = 0): Date {
  const d = new Date(PRESENTACION);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  // Salvaguarda: nunca sembrar datos demo con credenciales conocidas contra
  // una base de producción. Para hacerlo a propósito, exportar ALLOW_PROD_SEED=true.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    throw new Error(
      "Seed bloqueado en producción. Las credenciales demo son públicas; " +
        "sembrarlas expondría la app. Si de verdad lo necesitas, exporta ALLOW_PROD_SEED=true."
    );
  }

  console.log("Seeding S.I.G.T.E. demo data...");

  // Bloques
  await prisma.parkingBlock.updateMany({ data: { isDefault: false } });

  const blockDefs = [
    { name: "No definido",       capacity: 200, description: "Bloque por defecto — asignar luego", isDefault: true },
    { name: "Estacionamiento 1", capacity: 63, description: "Inferior Sector A · 63 autos + 9 motos", isDefault: false },
    { name: "Estacionamiento 2", capacity: 83, description: "Inferior Sector B · 83 autos, 7 no usables", isDefault: false },
    { name: "Estacionamiento 3", capacity: 16, description: "Central · 16 autos (2 discapacitados) + 4 motos", isDefault: false },
    { name: "Estacionamiento 4", capacity: 50, description: "Superior (en tierra) · capacidad por definir", isDefault: false },
    { name: "Estacionamiento 5", capacity: 50, description: "Superior (en tierra) · capacidad por definir", isDefault: false },
  ];

  const blockMap: Record<string, string> = {};
  for (const b of blockDefs) {
    const rec = await prisma.parkingBlock.upsert({
      where: { name: b.name },
      update: { capacity: b.capacity, description: b.description, isDefault: b.isDefault },
      create: b,
    });
    blockMap[b.name] = rec.id;
  }

  const bA = blockMap["Estacionamiento 1"];
  const bB = blockMap["Estacionamiento 2"];
  const bC = blockMap["Estacionamiento 3"];
  const bD = blockMap["Estacionamiento 4"];

  // Usuarios
  // userType: STAFF = Funcionario/Docente, STUDENT = Alumno.
  // ADMIN/GUARD quedan sin userType (no son categorías del campus).
  type UserType = "STAFF" | "STUDENT";
  type UserDef = {
    email: string; password: string; name: string;
    role: "ADMIN" | "GUARD" | "USER"; universityId: string;
    userType?: UserType; phone?: string;
    position?: string; department?: string;
    rut?: string; academicDepartment?: string; career?: string;
  };

  const INFO = "Depto. de Informática";
  const userDefs: UserDef[] = [
    // Equipo del sistema
    { email: "admin@usm.cl",    password: "admin123", name: "Alejandro Vera Espinoza",      role: "ADMIN", universityId: "ADM-0001", phone: "+56 9 8000 0001" },
    { email: "guardia@usm.cl",  password: "guard123", name: "Carlos Guardia Soto",          role: "GUARD", universityId: "GRD-0001", phone: "+56 9 8000 0002" },
    { email: "guardia2@usm.cl", password: "guard123", name: "María Vigía Rojas",            role: "GUARD", universityId: "GRD-0002", phone: "+56 9 8000 0003" },
    // Funcionarios / Docentes
    { email: "pedro@usm.cl",    password: "user123",  name: "Pedro Fernández Araya",        role: "USER", universityId: "FUN-0002", userType: "STAFF", phone: "+56 9 7111 2002", position: "Docente",        department: INFO },
    { email: "jose@usm.cl",     password: "user123",  name: "José Hidalgo Palacios",        role: "USER", universityId: "FUN-0003", userType: "STAFF", phone: "+56 9 7111 2003", position: "Administrativo",  department: "Bienestar Estudiantil" },
    { email: "fernando@usm.cl", password: "user123",  name: "Fernando Ortega Campos",       role: "USER", universityId: "FUN-0013", userType: "STAFF", phone: "+56 9 7111 2013", position: "Jefe de Carrera", department: INFO },
    // Alumnos
    { email: "user@usm.cl",     password: "user123",  name: "Juan Pablo González Astudillo",role: "USER", universityId: "USR-0001", userType: "STUDENT", phone: "+56 9 6222 3001", rut: "20.123.456-7", academicDepartment: INFO, career: "Ingeniería Civil Informática" },
    { email: "nicolas@usm.cl",  password: "user123",  name: "Nicolás Sepúlveda Cabello",    role: "USER", universityId: "USR-0004", userType: "STUDENT", phone: "+56 9 6222 3004", rut: "20.234.567-8", academicDepartment: INFO, career: "Ingeniería Civil Telemática" },
    { email: "ismael@usm.cl",   password: "user123",  name: "Ismael Galindo Acuña",         role: "USER", universityId: "USR-0005", userType: "STUDENT", phone: "+56 9 6222 3005", rut: "20.345.678-9", academicDepartment: "Depto. de Industrias",   career: "Ingeniería Civil Industrial" },
    { email: "andrea@usm.cl",   password: "user123",  name: "Andrea López Contreras",       role: "USER", universityId: "USR-0006", userType: "STUDENT", phone: "+56 9 6222 3006", rut: "21.111.222-3", academicDepartment: "Depto. de Química",      career: "Ingeniería Civil en Biotecnología" },
    { email: "diego@usm.cl",    password: "user123",  name: "Diego Muñoz Reyes",            role: "USER", universityId: "USR-0007", userType: "STUDENT", phone: "+56 9 6222 3007", rut: "21.222.333-4", academicDepartment: INFO, career: "Ingeniería en Ejecución en Informática" },
    { email: "camila@usm.cl",   password: "user123",  name: "Camila Torres Vidal",          role: "USER", universityId: "USR-0008", userType: "STUDENT", phone: "+56 9 6222 3008", rut: "21.333.444-5", academicDepartment: "Depto. de Matemática",   career: "Ingeniería Civil Matemática" },
    { email: "rodrigo@usm.cl",  password: "user123",  name: "Rodrigo Salinas Pino",         role: "USER", universityId: "USR-0009", userType: "STUDENT", phone: "+56 9 6222 3009", rut: "21.444.555-6", academicDepartment: "Depto. de Obras Civiles", career: "Ingeniería Civil" },
    { email: "valentina@usm.cl",password: "user123",  name: "Valentina Rivas Moreno",       role: "USER", universityId: "USR-0010", userType: "STUDENT", phone: "+56 9 6222 3010", rut: "22.555.666-7", academicDepartment: "Depto. de Electrónica",   career: "Ingeniería Civil Electrónica" },
    { email: "matias@usm.cl",   password: "user123",  name: "Matías Pérez Fuentes",         role: "USER", universityId: "USR-0011", userType: "STUDENT", phone: "+56 9 6222 3011", rut: "22.666.777-8", academicDepartment: INFO, career: "Ingeniería Civil Informática" },
    { email: "barbara@usm.cl",  password: "user123",  name: "Bárbara Castro Herrera",       role: "USER", universityId: "USR-0012", userType: "STUDENT", phone: "+56 9 6222 3012", rut: "22.777.888-9", academicDepartment: "Depto. de Mecánica",     career: "Ingeniería Civil Mecánica" },
  ];

  // Si se define SEED_PASSWORD, sobreescribe todas las contraseñas demo. Útil
  // para poblar un entorno compartido sin dejar las credenciales públicas del repo.
  const seedPassword = process.env.SEED_PASSWORD;

  const uMap: Record<string, string> = {};
  for (const u of userDefs) {
    const hash = await bcrypt.hash(seedPassword ?? u.password, 10);
    const profile = {
      passwordHash: hash,
      name: u.name,
      role: u.role,
      universityId: u.universityId,
      userType: u.userType ?? null,
      phone: u.phone ?? null,
      position: u.position ?? null,
      department: u.department ?? null,
      rut: u.rut ?? null,
      academicDepartment: u.academicDepartment ?? null,
      career: u.career ?? null,
    };
    const rec = await prisma.user.upsert({
      where: { email: u.email },
      update: profile,
      create: { email: u.email, ...profile },
    });
    uMap[u.email] = rec.id;
  }

  const guard1 = uMap["guardia@usm.cl"];
  const guard2 = uMap["guardia2@usm.cl"];

  // Vehículos
  const vehicleDefs: {
    plate: string; make: string; model: string; color: string;
    owner: string; authorized: boolean; block: string | null;
  }[] = [
    { plate: "AABB12", make: "Toyota",    model: "Yaris",      color: "Rojo",     owner: "user@usm.cl",     authorized: true,  block: bC },
    { plate: "CCDD34", make: "Chevrolet", model: "Sail",       color: "Azul",     owner: "user@usm.cl",     authorized: true,  block: null },
    { plate: "EEFF56", make: "Nissan",    model: "Versa",      color: "Blanco",   owner: "pedro@usm.cl",    authorized: true,  block: bA },
    { plate: "GGHH78", make: "Hyundai",   model: "Accent",     color: "Negro",    owner: "jose@usm.cl",     authorized: true,  block: bB },
    { plate: "JJKK90", make: "Kia",       model: "Rio",        color: "Gris",     owner: "nicolas@usm.cl",  authorized: true,  block: bC },
    { plate: "LLMM21", make: "Suzuki",    model: "Baleno",     color: "Blanco",   owner: "ismael@usm.cl",   authorized: true,  block: bA },
    { plate: "NNPP43", make: "Mazda",     model: "Mazda 2",    color: "Rojo",     owner: "andrea@usm.cl",   authorized: true,  block: bC },
    { plate: "QQRR65", make: "Fiat",      model: "Cronos",     color: "Negro",    owner: "diego@usm.cl",    authorized: true,  block: bB },
    { plate: "SSTT87", make: "Renault",   model: "Kwid",       color: "Blanco",   owner: "camila@usm.cl",   authorized: true,  block: bD },
    { plate: "UUVV09", make: "Volkswagen",model: "Gol",        color: "Plateado", owner: "rodrigo@usm.cl",  authorized: true,  block: bA },
    { plate: "WWXX31", make: "Chevrolet", model: "Aveo",       color: "Azul",     owner: "valentina@usm.cl",authorized: true,  block: bC },
    { plate: "YYZZ53", make: "Honda",     model: "Fit",        color: "Plateado", owner: "matias@usm.cl",   authorized: true,  block: bD },
    { plate: "BBCC75", make: "Kia",       model: "Morning",    color: "Blanco",   owner: "barbara@usm.cl",  authorized: true,  block: bB },
    { plate: "DDEE97", make: "Toyota",    model: "Corolla",    color: "Gris",     owner: "fernando@usm.cl", authorized: true,  block: bC },
    // Vehículo no autorizado (para demo de infracción)
    { plate: "FFGG19", make: "Mitsubishi",model: "Lancer",     color: "Verde",    owner: "diego@usm.cl",    authorized: false, block: null },
    { plate: "HHII41", make: "Peugeot",   model: "208",        color: "Blanco",   owner: "jose@usm.cl",     authorized: true,  block: bD },
  ];

  const vMap: Record<string, string> = {};
  for (const v of vehicleDefs) {
    const ownerId = uMap[v.owner];
    const rec = await prisma.vehicle.upsert({
      where: { plate: v.plate },
      update: { make: v.make, model: v.model, color: v.color, ownerId, authorized: v.authorized, currentBlockId: v.block },
      create: { plate: v.plate, make: v.make, model: v.model, color: v.color, ownerId, authorized: v.authorized, currentBlockId: v.block },
    });
    vMap[v.plate] = rec.id;
  }

  // Logs de acceso
  await prisma.accessLog.deleteMany({});

  // Todos los vehículos con historial activo (incluido FFGG19)
  const activePlates = vehicleDefs.map(v => v.plate);

  const methods: Array<"PLATE" | "QR" | "CARD" | "MANUAL"> = ["PLATE","PLATE","PLATE","QR","QR","CARD","MANUAL"];
  const guardIds = [guard1, guard2];
  function crearLog(vid: string, ownerId: string, dir: "IN" | "OUT", ts: Date, block: string, meth?: "PLATE" | "QR" | "CARD" | "MANUAL", auth = true, note?: string) {
    return prisma.accessLog.create({
      data: {
        vehicleId: vid, userId: ownerId, guardId: pick(guardIds),
        method: meth ?? pick(methods),
        direction: dir, blockId: block,
        timestamp: ts, authorized: auth, note,
      },
    });
  }

  // Días 1-29: cada vehículo entra y sale casi todos los días
  for (const plate of activePlates) {
    const vid = vMap[plate];
    const veh = vehicleDefs.find(v => v.plate === plate)!;
    const ownerId = uMap[veh.owner];
    const defaultBlock = veh.block ?? bA;

    for (let day = 29; day >= 1; day--) {
      // Últimos 7 días: 98% de actividad; días anteriores: 80%
      const prob = day <= 7 ? 0.98 : 0.80;
      if (Math.random() > prob) continue;

      const inHour  = pick([7,8,8,9]);
      const inMin   = pick([0,10,15,20,25,30,35,40,45,50]);
      const outHour = pick([16,17,17,18,18,19]);
      const outMin  = pick([0,10,15,20,30,40,45,50]);

      await crearLog(vid, ownerId, "IN", ago(day, inHour, inMin), defaultBlock);

      // 50% de los días: entrada extra al mediodía (para más volumen)
      if (Math.random() < 0.5) {
        await crearLog(vid, ownerId, "IN", ago(day, pick([12,13,14]), pick([0,15,30,45])), defaultBlock);
      }

      await crearLog(vid, ownerId, "OUT", ago(day, outHour, outMin), defaultBlock);
    }
  }

  // Hoy (día 0) y mañana (día -1) hasta las 12:00
  // Vehículos que están dentro
  const insideToday = vehicleDefs.filter(v => v.block !== null).map(v => v.plate);
  for (const plate of insideToday) {
    const vid = vMap[plate];
    const veh = vehicleDefs.find(v => v.plate === plate)!;
    const ownerId = uMap[veh.owner];
    const blockId = veh.block!;

    // Hoy temprano: algunos ya entraron
    if (Math.random() < 0.7) {
      await crearLog(vid, ownerId, "IN", ago(0, pick([7,7,8,8,8,9]), pick([0,10,15,20,25,30])), blockId);
    }

    // Mañana (presentación): entradas escalonadas 7:00-11:30
    await crearLog(vid, ownerId, "IN", ago(-1, pick([7,7,8,8,8,9,10,10,11]), pick([0,10,15,20,25,30,35,40,45])), blockId);
  }

  // Vehículos que aún no entran hoy: entran mañana
  const outsideToday = vehicleDefs.filter(v => v.block === null).map(v => v.plate);
  for (const plate of outsideToday) {
    const vid = vMap[plate];
    const veh = vehicleDefs.find(v => v.plate === plate)!;
    const ownerId = uMap[veh.owner];
    const blockId = veh.block ?? bA;

    // Mañana entran
    await crearLog(vid, ownerId, "IN", ago(-1, pick([8,8,9,9,10,10,11]), pick([0,10,15,20,25,30,35])), blockId);
  }

  // Accesos rechazados FFGG19 (distribuidos en últimos 14 días)
  for (let i = 0; i < 12; i++) {
    const day = Math.floor(Math.random() * 14);
    await crearLog(
      vMap["FFGG19"], uMap[vehicleDefs.find(v => v.plate === "FFGG19")!.owner],
      "IN", ago(day, pick([8,9,10,14,15,16]), pick([0,15,30,45])),
      bA, pick(["PLATE","MANUAL"] as const), false,
      "Vehículo no autorizado — acceso denegado"
    );
  }

  // Accesos de prueba adicionales para llenar métricas
  // Tráfico peatonal simulado (ingresos sin vehículo asociado, solo conteo)
  // Simulamos más accesos para que los totales se vean robustos
  for (let day = 7; day >= 0; day--) {
    const extraCount = pick([3, 4, 5, 6]);
    for (let e = 0; e < extraCount; e++) {
      const plate = pick(activePlates);
      const veh = vehicleDefs.find(v => v.plate === plate)!;
      // Solo IN en distintos horarios del día
      await crearLog(
        vMap[plate], uMap[veh.owner],
        "IN", ago(day, pick([7,8,9,10,11,12,13,14,15,16,17,18]), pick([0,15,30,45])),
        veh.block ?? bA, pick(methods)
      );
    }
  }

  // Infracciones
  await prisma.infraction.deleteMany({});

  const infractions = [
    {
      plate: "AABB12", guardEmail: "guardia@usm.cl",
      type: "DOUBLE_PARKING" as const,
      description: "Vehículo estacionado en doble fila frente al Estacionamiento 1, bloqueando salida",
      status: "OPEN" as const,
      daysAgo: 0,
    },
    {
      plate: "GGHH78", guardEmail: "guardia2@usm.cl",
      type: "WRONG_BLOCK" as const,
      description: "Vehículo estacionado en sector de funcionarios sin autorización",
      status: "ACKNOWLEDGED" as const,
      daysAgo: 2,
    },
    {
      plate: "FFGG19", guardEmail: "guardia@usm.cl",
      type: "UNAUTHORIZED_ENTRY" as const,
      description: "Intento de ingreso con patente no registrada en el sistema",
      status: "RESOLVED" as const,
      daysAgo: 5,
    },
    {
      plate: "QQRR65", guardEmail: "guardia@usm.cl",
      type: "BLOCKING_ACCESS" as const,
      description: "Vehículo bloqueando rampa de acceso peatonal en Estacionamiento 2",
      status: "OPEN" as const,
      daysAgo: 1,
    },
    {
      plate: "CCDD34", guardEmail: "guardia2@usm.cl",
      type: "EXPIRED_PERMIT" as const,
      description: "Permiso vehicular vencido desde hace 15 días — notificar al propietario",
      status: "ACKNOWLEDGED" as const,
      daysAgo: 4,
    },
    {
      plate: "WWXX31", guardEmail: "guardia@usm.cl",
      type: "SPEEDING" as const,
      description: "Vehículo circulando a velocidad excesiva en zona de peatones frente a biblioteca",
      status: "RESOLVED" as const,
      daysAgo: 8,
    },
    {
      plate: "NNPP43", guardEmail: "guardia2@usm.cl",
      type: "WRONG_BLOCK" as const,
      description: "Vehículo ocupando lugar reservado sin credencial de acceso correspondiente",
      status: "DISMISSED" as const,
      daysAgo: 12,
    },
    {
      plate: "EEFF56", guardEmail: "guardia@usm.cl",
      type: "OTHER" as const,
      description: "Vehículo con alarma activada por más de 20 minutos — se notificó al dueño",
      status: "RESOLVED" as const,
      daysAgo: 15,
    },
  ];

  for (const inf of infractions) {
    const vehicle = await prisma.vehicle.findUnique({ where: { plate: inf.plate } });
    if (!vehicle) continue;
    const ts = ago(inf.daysAgo, 10, 30);
    await prisma.infraction.create({
      data: {
        vehicleId: vehicle.id,
        userId: vehicle.ownerId,
        guardId: uMap[inf.guardEmail],
        type: inf.type,
        description: inf.description,
        status: inf.status,
        createdAt: ts,
        updatedAt: ts,
      },
    });
  }

  // Notificaciones
  await prisma.notification.deleteMany({});

  const notifications = [
    { email: "user@usm.cl",      title: "Infracción registrada",         message: "Se registró una infracción (Doble fila) para tu vehículo AABB12. Por favor comunícate con Seguridad.", read: false, createdAt: ago(3, 9, 15) },
    { email: "user@usm.cl",      title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada exitosamente. Puedes generar tu QR de acceso desde el panel.", read: true, createdAt: ago(28, 8, 30) },
    { email: "pedro@usm.cl",     title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada exitosamente. Puedes generar tu QR de acceso desde el panel.", read: true, createdAt: ago(25, 9, 10) },
    { email: "jose@usm.cl",      title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada exitosamente. Puedes generar tu QR de acceso desde el panel.", read: true, createdAt: ago(23, 14, 45) },
    { email: "nicolas@usm.cl",   title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada. Registra tu vehículo para obtener tu código QR de acceso.", read: false, createdAt: ago(6, 11, 20) },
    { email: "ismael@usm.cl",    title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada. Registra tu vehículo para obtener tu código QR de acceso.", read: false, createdAt: ago(5, 16, 5) },
    { email: "andrea@usm.cl",    title: "Bienvenido a S.I.G.T.E.",       message: "Tu cuenta fue creada exitosamente. Puedes generar tu QR de acceso desde el panel.", read: true, createdAt: ago(19, 10, 0) },
    { email: "diego@usm.cl",     title: "Vehículo no autorizado",         message: "Se detectó un intento de ingreso con tu vehículo FFGG19 que no tiene autorización activa.", read: false, createdAt: ago(2, 18, 40) },
  ];

  // Solo insertamos notificaciones para emails que existen en uMap
  const validNotifs = notifications.filter(n => uMap[n.email]);
  for (const n of validNotifs) {
    await prisma.notification.create({
      data: { userId: uMap[n.email], title: n.title, message: n.message, read: n.read, createdAt: n.createdAt },
    });
  }

  // Notificación de infracción para dueño de GGHH78 (jose@usm.cl)
  await prisma.notification.create({
    data: {
      userId: uMap["jose@usm.cl"],
      title: "Infracción — Bloque incorrecto",
      message: "Tu vehículo GGHH78 fue registrado en sector no autorizado. Estado: Notificado.",
      read: false,
      createdAt: ago(4, 13, 25),
    },
  });
  // Notificación para dueño de CCDD34 (user@usm.cl)
  await prisma.notification.create({
    data: {
      userId: uMap["user@usm.cl"],
      title: "Permiso próximo a vencer",
      message: "El permiso de tu vehículo CCDD34 está próximo a vencer. Renuévalo en Administración.",
      read: false,
      createdAt: ago(7, 10, 5),
    },
  });

  console.log("Seed finalizado.");
  console.log(`  Bloques: ${blockDefs.length} | Usuarios: ${userDefs.length} | Vehículos: ${vehicleDefs.length}`);
  const logCount = await prisma.accessLog.count();
  const infrCount = await prisma.infraction.count();
  const notifCount = await prisma.notification.count();
  console.log(`  AccessLogs: ${logCount} | Infracciones: ${infrCount} | Notificaciones: ${notifCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
