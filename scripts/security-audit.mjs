import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();

/**
 * Escaneo de Secretos Expuestos en Código Fuente (Secret Scanning - RT-09 / RQ-09)
 */
function scanSecrets() {
  console.log("\n=======================================================");
  console.log(" [1/3] DevSecOps: Escaneo de Secretos y Credenciales");
  console.log("=======================================================");

  const SUSPICIOUS_PATTERNS = [
    /-----BEGIN (RSA|EC|OPENSSH|DSA)? ?PRIVATE KEY-----/,
    /eyJhbGciOi[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/, // JWTs en texto plano
    /AKIA[0-9A-Z]{16}/, // AWS Access Keys
    /ghp_[0-9a-zA-Z]{36}/, // GitHub Personal Access Token
    /sk_live_[0-9a-zA-Z]{24}/, // Stripe live key
  ];

  const TARGET_DIRS = ["src"];
  let findings = 0;

  function traverse(dir) {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.startsWith(".") || f === "node_modules" || f === ".next") continue;
      const full = join(dir, f);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        traverse(full);
      } else if (f.endsWith(".ts") || f.endsWith(".tsx") || f.endsWith(".js") || f.endsWith(".json")) {
        const content = readFileSync(full, "utf8");
        for (const pat of SUSPICIOUS_PATTERNS) {
          if (pat.test(content)) {
            console.error(`🚨 ALERTA DE SEGURIDAD: Patrón de secreto sospechoso en ${full}`);
            findings++;
          }
        }
      }
    }
  }

  for (const d of TARGET_DIRS) {
    traverse(join(rootDir, d));
  }

  if (findings === 0) {
    console.log("✅ 0 secretos expuestos en código fuente (Cumple RQ-09).");
    return true;
  } else {
    console.error(`❌ Se detectaron ${findings} posibles secretos hardcodeados.`);
    return false;
  }
}

/**
 * Ejecución de la Suite Integral de Pruebas de Ciberseguridad (Fase 10 / RQ-01 a RQ-10)
 */
function runSecurityTests() {
  console.log("\n=======================================================");
  console.log(" [2/3] DevSecOps: Ejecución de Tests de Ciberseguridad");
  console.log("=======================================================");

  const testFiles = [
    "src/lib/env.test.ts",
    "src/lib/crypto.test.ts",
    "src/lib/audit-chain.test.ts",
    "src/lib/qr.test.ts",
    "src/middleware.test.ts",
    "src/lib/minimization.test.ts",
    "src/lib/lpr.test.ts",
    "src/lib/rate-limit.test.ts",
    "src/lib/captcha.test.ts",
    "src/lib/pruning.test.ts",
    "src/lib/loginPolicy.test.ts",
    "src/lib/rut.test.ts",
    "src/lib/versions.test.ts",
  ];

  const args = [
    "--import", "./scripts/test-register.mjs",
    "--experimental-strip-types",
    "--test",
    ...testFiles,
  ];

  const res = spawnSync("node", args, { stdio: "inherit", cwd: rootDir });
  if (res.status === 0) {
    console.log("✅ 100% de las pruebas automatizadas de ciberseguridad aprobadas.");
    return true;
  } else {
    console.error("❌ Fallaron una o más pruebas de seguridad.");
    return false;
  }
}

/**
 * Comprobación de Tipado y Sintaxis (SAST)
 */
function runTypecheck() {
  console.log("\n=======================================================");
  console.log(" [3/3] DevSecOps: Verificación Estática de Tipos (SAST)");
  console.log("=======================================================");

  const res = spawnSync("npx", ["tsc", "--noEmit", "--incremental", "false"], {
    stdio: "inherit",
    cwd: rootDir,
  });

  if (res.status === 0) {
    console.log("✅ Análisis estático de tipos completado con 0 errores.");
    return true;
  } else {
    console.error("❌ Se encontraron errores de tipado.");
    return false;
  }
}

const args = process.argv.slice(2);
const scanOnly = args.includes("--scan-secrets");
const testOnly = args.includes("--run-tests");

let allPassed = true;

if (scanOnly) {
  if (!scanSecrets()) process.exit(1);
} else if (testOnly) {
  if (!runSecurityTests()) process.exit(1);
} else {
  if (!scanSecrets()) allPassed = false;
  if (!runSecurityTests()) allPassed = false;
  if (!runTypecheck()) allPassed = false;

  console.log("\n=======================================================");
  if (allPassed) {
    console.log("🎉 AUDITORÍA DEVSECOPS COMPLETA: TODOS LOS QUALITY GATES APROBADOS.");
    console.log("=======================================================\n");
    process.exit(0);
  } else {
    console.error("⛔ CALIDAD COMPROMETIDA: Uno o más controles fallaron.");
    console.log("=======================================================\n");
    process.exit(1);
  }
}
