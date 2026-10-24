import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encryptPlate, generateBlindIndex, normalizePlate } from "@/lib/crypto";

let bootstrapPromise: Promise<boolean> | null = null;

/**
 * Asegura que la base de datos cuente con los datos institucionales base
 * (bloques, usuarios demo con credenciales conocidas, vehículos con cifrado
 * y búsqueda ciega RT-04, e historial de acceso).
 *
 * Se ejecuta automáticamente de manera segura y concurrente (idempotente)
 * si se detecta que la tabla de usuarios está vacía.
 */
export async function ensureDatabaseSeeded(): Promise<boolean> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const userCount = await prisma.user.count();
      if (userCount > 0) {
        // Verificar si existe al menos el administrador principal
        const admin = await prisma.user.findUnique({
          where: { email: "admin@usm.cl" },
        });
        if (admin && admin.active) {
          return false;
        }
      }

      console.log("==> [SIGTE-BOOTSTRAP] Inicializando base de datos con usuarios y bloques institucionales...");

      // 1. Bloques de estacionamiento
      const blockDefs = [
        { name: "No definido", capacity: 200, description: "Bloque por defecto — asignar luego", isDefault: true },
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

      // 2. Usuarios del sistema
      const INFO = "Depto. de Informática";
      const userDefs = [
        // Equipo del sistema
        { email: "admin@usm.cl", password: "admin123", name: "Alejandro Vera Espinoza", role: "ADMIN" as const, universityId: "ADM-0001", phone: "+56 9 8000 0001" },
        { email: "guardia@usm.cl", password: "guard123", name: "Carlos Guardia Soto", role: "GUARD" as const, universityId: "GRD-0001", phone: "+56 9 8000 0002" },
        { email: "guardia2@usm.cl", password: "guard123", name: "María Vigía Rojas", role: "GUARD" as const, universityId: "GRD-0002", phone: "+56 9 8000 0003" },
        // Funcionarios / Docentes
        { email: "pedro@usm.cl", password: "user123", name: "Pedro Fernández Araya", role: "USER" as const, universityId: "FUN-0002", userType: "STAFF" as const, phone: "+56 9 7111 2002", position: "Docente", department: INFO },
        { email: "jose@usm.cl", password: "user123", name: "José Hidalgo Palacios", role: "USER" as const, universityId: "FUN-0003", userType: "STAFF" as const, phone: "+56 9 7111 2003", position: "Administrativo", department: "Bienestar Estudiantil" },
        { email: "fernando@usm.cl", password: "user123", name: "Fernando Ortega Campos", role: "USER" as const, universityId: "FUN-0013", userType: "STAFF" as const, phone: "+56 9 7111 2013", position: "Jefe de Carrera", department: INFO },
        // Alumnos
        { email: "user@usm.cl", password: "user123", name: "Juan Pablo González Astudillo", role: "USER" as const, universityId: "USR-0001", userType: "STUDENT" as const, phone: "+56 9 6222 3001", rut: "20.123.456-7", academicDepartment: INFO, career: "Ingeniería Civil Informática" },
        { email: "nicolas@usm.cl", password: "user123", name: "Nicolás Sepúlveda Cabello", role: "USER" as const, universityId: "USR-0004", userType: "STUDENT" as const, phone: "+56 9 6222 3004", rut: "20.234.567-8", academicDepartment: INFO, career: "Ingeniería Civil Telemática" },
        { email: "ismael@usm.cl", password: "user123", name: "Ismael Galindo Acuña", role: "USER" as const, universityId: "USR-0005", userType: "STUDENT" as const, phone: "+56 9 6222 3005", rut: "20.345.678-9", academicDepartment: "Depto. de Industrias", career: "Ingeniería Civil Industrial" },
        { email: "andrea@usm.cl", password: "user123", name: "Andrea López Contreras", role: "USER" as const, universityId: "USR-0006", userType: "STUDENT" as const, phone: "+56 9 6222 3006", rut: "21.111.222-3", academicDepartment: "Depto. de Química", career: "Ingeniería Civil en Biotecnología" },
        { email: "diego@usm.cl", password: "user123", name: "Diego Muñoz Reyes", role: "USER" as const, universityId: "USR-0007", userType: "STUDENT" as const, phone: "+56 9 6222 3007", rut: "21.222.333-4", academicDepartment: INFO, career: "Ingeniería en Ejecución en Informática" },
        { email: "camila@usm.cl", password: "user123", name: "Camila Torres Vidal", role: "USER" as const, universityId: "USR-0008", userType: "STUDENT" as const, phone: "+56 9 6222 3008", rut: "21.333.444-5", academicDepartment: "Depto. de Matemática", career: "Ingeniería Civil Matemática" },
        { email: "rodrigo@usm.cl", password: "user123", name: "Rodrigo Salinas Pino", role: "USER" as const, universityId: "USR-0009", userType: "STUDENT" as const, phone: "+56 9 6222 3009", rut: "21.444.555-6", academicDepartment: "Depto. de Obras Civiles", career: "Ingeniería Civil" },
        { email: "valentina@usm.cl", password: "user123", name: "Valentina Rivas Moreno", role: "USER" as const, universityId: "USR-0010", userType: "STUDENT" as const, phone: "+56 9 6222 3010", rut: "22.555.666-7", academicDepartment: "Depto. de Electrónica", career: "Ingeniería Civil Electrónica" },
        { email: "matias@usm.cl", password: "user123", name: "Matías Pérez Fuentes", role: "USER" as const, universityId: "USR-0011", userType: "STUDENT" as const, phone: "+56 9 6222 3011", rut: "22.666.777-8", academicDepartment: INFO, career: "Ingeniería Civil Informática" },
        { email: "barbara@usm.cl", password: "user123", name: "Bárbara Castro Herrera", role: "USER" as const, universityId: "USR-0012", userType: "STUDENT" as const, phone: "+56 9 6222 3012", rut: "22.777.888-9", academicDepartment: "Depto. de Mecánica", career: "Ingeniería Civil Mecánica" },
      ];

      const uMap: Record<string, string> = {};
      for (const u of userDefs) {
        const hash = await bcrypt.hash(u.password, 10);
        const profile = {
          passwordHash: hash,
          name: u.name,
          role: u.role,
          universityId: u.universityId,
          userType: ("userType" in u ? u.userType : null) ?? null,
          phone: u.phone ?? null,
          position: ("position" in u ? u.position : null) ?? null,
          department: ("department" in u ? u.department : null) ?? null,
          rut: ("rut" in u ? u.rut : null) ?? null,
          academicDepartment: ("academicDepartment" in u ? u.academicDepartment : null) ?? null,
          career: ("career" in u ? u.career : null) ?? null,
          failedLoginAttempts: 0,
          lockedUntil: null,
          active: true,
        };

        const rec = await prisma.user.upsert({
          where: { email: u.email },
          update: profile,
          create: { email: u.email, ...profile },
        });
        uMap[u.email] = rec.id;
      }

      // 3. Vehículos institucionales con cifrado y Blind Index (RT-04)
      const vehicleDefs = [
        { plate: "AABB12", make: "Toyota", model: "Yaris", color: "Rojo", owner: "user@usm.cl", authorized: true, block: bC },
        { plate: "CCDD34", make: "Chevrolet", model: "Sail", color: "Azul", owner: "user@usm.cl", authorized: true, block: null },
        { plate: "EEFF56", make: "Nissan", model: "Versa", color: "Blanco", owner: "pedro@usm.cl", authorized: true, block: bA },
        { plate: "GGHH78", make: "Hyundai", model: "Accent", color: "Negro", owner: "jose@usm.cl", authorized: true, block: bB },
        { plate: "JJKK90", make: "Kia", model: "Rio", color: "Gris", owner: "nicolas@usm.cl", authorized: true, block: bC },
        { plate: "LLMM21", make: "Suzuki", model: "Baleno", color: "Blanco", owner: "ismael@usm.cl", authorized: true, block: bA },
        { plate: "NNPP43", make: "Mazda", model: "Mazda 2", color: "Rojo", owner: "andrea@usm.cl", authorized: true, block: bC },
        { plate: "QQRR65", make: "Fiat", model: "Cronos", color: "Negro", owner: "diego@usm.cl", authorized: true, block: bB },
        { plate: "SSTT87", make: "Renault", model: "Kwid", color: "Blanco", owner: "camila@usm.cl", authorized: true, block: bD },
        { plate: "UUVV09", make: "Volkswagen", model: "Gol", color: "Plateado", owner: "rodrigo@usm.cl", authorized: true, block: bA },
        { plate: "WWXX31", make: "Chevrolet", model: "Aveo", color: "Azul", owner: "valentina@usm.cl", authorized: true, block: bC },
        { plate: "YYZZ53", make: "Honda", model: "Fit", color: "Plateado", owner: "matias@usm.cl", authorized: true, block: bD },
        { plate: "BBCC75", make: "Kia", model: "Morning", color: "Blanco", owner: "barbara@usm.cl", authorized: true, block: bB },
        { plate: "DDEE97", make: "Toyota", model: "Corolla", color: "Gris", owner: "fernando@usm.cl", authorized: true, block: bC },
        { plate: "FFGG19", make: "Mitsubishi", model: "Lancer", color: "Verde", owner: "diego@usm.cl", authorized: false, block: null },
        { plate: "HHII41", make: "Peugeot", model: "208", color: "Blanco", owner: "jose@usm.cl", authorized: true, block: bD },
      ];

      const vMap: Record<string, string> = {};
      for (const v of vehicleDefs) {
        const ownerId = uMap[v.owner];
        if (!ownerId) continue;
        const normPlate = normalizePlate(v.plate);
        const { cipher, iv, tag } = encryptPlate(normPlate);
        const blindIndex = generateBlindIndex(normPlate);

        const vData = {
          plate: normPlate,
          plateCipher: cipher,
          plateIv: iv,
          plateTag: tag,
          plateBlindIndex: blindIndex,
          make: v.make,
          model: v.model,
          color: v.color,
          ownerId,
          authorized: v.authorized,
          currentBlockId: v.block,
        };

        const rec = await prisma.vehicle.upsert({
          where: { plate: normPlate },
          update: vData,
          create: vData,
        });
        vMap[normPlate] = rec.id;
      }

      console.log("==> [SIGTE-BOOTSTRAP] Base de datos inicializada exitosamente.");
      return true;
    } catch (err) {
      console.error("==> [SIGTE-BOOTSTRAP] Error al inicializar datos:", err);
      return false;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
