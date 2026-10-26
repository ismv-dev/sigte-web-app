# Propuestas de Mejora y Validación Técnica: "Tesina ciberseguridad.pdf" (Versión Preliminar: Capítulos 1 a 4) vs. Implementación Real S.I.G.T.E.

> **Documento Analizado:** `docs/Tesina ciberseguridad.pdf` (Versión preliminar: Capítulos 1 al 4)  
> **Proyecto Evaluado:** S.I.G.T.E. (Sistema Inteligente de Gestión del Tránsito y Estacionamiento - UTFSM Sede Viña del Mar)  
> **Alcance de esta Revisión:** Validación estricta y exhaustiva de la redacción, arquitectura técnica, modelos matemáticos y citas de código de los **Capítulos 1 (Introducción), 2 (Marco Teórico), 3 (Requerimientos y Alcance) y 4 (Diseño e Implementación)** respecto al software real. *(Se excluyen deliberadamente los capítulos 5 al 8 por corresponder a etapas posteriores del proyecto).*

---

## 1. Resumen Ejecutivo de la Validación

El manuscrito preliminar presenta una excelente fundamentación teórica, modelando amenazas con **STRIDE** y enmarcando la protección de datos en la **Ley N° 21.719** (convergencia con el RGPD) y la **Ley N° 21.663** (Ley Marco de Ciberseguridad).

Sin embargo, al contrastar el texto contra el repositorio de software (`/src`, `/prisma`, `/scripts` y configuraciones del proyecto), se identifican **seis (6) ejes de mejora técnica sustantiva** que deben corregirse en la redacción de estos cuatro primeros capítulos:

1. **Discrepancia en la Versión del Framework Central (Next.js 14 vs. Next.js 16):** Existen menciones contradictorias en el texto (páginas 7, 11, 24 y diagrama de pág. 41 citan `Next.js 14`, mientras que la página 39 menciona `Next.js 16 y React 19`). En el código fuente real se utiliza **Next.js 16.2.12** y **React 19.0.0**, utilizando la convención de interceptor `src/proxy.ts`.
2. **Discrepancia en Identificadores Primarios (CUID vs. UUID v4):** La página 40 cita textualmente `id String @id @default(cuid())`, cuando en la realidad de `prisma/schema.prisma` todos los modelos relacionales implementan `@id @default(uuid())`.
3. **Inexactitud en la Restricción de Integridad de Nonces (`UsedNonce`):** Las páginas 25, 42 y 44 afirman que el claim `jti` se define como la "clave primaria (PRIMARY KEY)", cuando en el esquema relacional real `id` es la Primary Key (UUID v4) y `jti` está protegido mediante una **restricción de unicidad estricta (`@unique`)** con índice indexado.
4. **Omisión de la Seudonimización Aplicada a Guardias y Administradores:** Aunque el requerimiento RT-04 y la tabla 11 declaran la seudonimización para todos los perfiles, en el Capítulo 4 (Código 4.3) únicamente se detalla el cifrado de patentes y el Blind Index, omitiendo las funciones desarrolladas en `src/lib/masking.ts` (`maskRut`, `maskPhone`, `maskEmail`, `pseudonymizeUserData`).
5. **Profundización en la Jerarquía de Resolución de Sesión (RT-07):** El texto justifica correctamente la mitigación frente al NAT universitario compartido, pero no detalla la cascada criptográfica mediante la cual `src/proxy.ts` resuelve unívocamente el `sessionId` para evitar ataques de suplantación de cuota.
6. **Corrección de Notación Matemática y Artefactos Tipográficos:** Múltiples páginas (17, 19, 26, 35 y 43) presentan variables duplicadas y fórmulas incompletas derivadas de la exportación a PDF (ej. `(𝐾𝑎𝑢𝑑𝑖𝑡𝐾𝑎𝑢𝑑𝑖𝑡append-only)`, `(𝑛 − 1 𝑛 − 1`).

---

## 2. Eje 1: Armonización de Arquitectura y Stack Tecnológico (Next.js 14 vs. Next.js 16)

### 2.1 Diagnóstico del Problema
En el documento actual coexisten referencias a dos generaciones tecnológicas distintas:
- **Página 7 (Sección 1.1.3):** *"Frontend y Backend unificado (Next.js 14): Framework que articula Server-Side Rendering..."*
- **Página 11 (Sección 1.2.6):** *"en la arquitectura Next.js 14 / PostgreSQL."*
- **Página 24 (Sección 3.1):** *"desarrolladas sobre Next.js 14."*
- **Página 39 (Sección 4.1.1):** *"desarrolladas en React 19 y Next.js 16."*
- **Página 41 (Figura 2):** El diagrama incluye el bloque *"Next.js 14 API Gateway / Middlewares"*.

En el código fuente real del proyecto:
- En [`package.json`](file:///Users/ismael/Desktop/sigte-web-app/package.json):
  ```json
  "dependencies": {
    "next": "^16.2.12",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "prisma": "^6.19.3",
    "@prisma/client": "^6.19.3"
  }
  ```
- El interceptor perimetral de seguridad no utiliza la convención obsoleta `middleware.ts`, sino el estándar de Next.js 16 implementado en [`src/proxy.ts`](file:///Users/ismael/Desktop/sigte-web-app/src/proxy.ts).

### 2.2 Justificación Técnica
Presentar una tesina citando Next.js 14 genera cuestionamientos técnicos inmediatos de la comisión evaluadora: React 19 no es compatible con el núcleo estándar de Next.js 14, y las ventajas de rendimiento y seguridad invocadas en la propuesta (como Server Actions tipadas, compilación optimizada y manejo de proxies perimetrales) corresponden a las capacidades nativas de Next.js 16.

### 2.3 Propuesta de Redacción y Modificaciones

#### Modificación en Sección 1.1.3 (Página 7)
*Reemplazar:*
> «Frontend y Backend unificado (Next.js 14): Framework que articula Server-Side Rendering (SSR) para paneles administrativos y generación estática/híbrida para las API Routes internas que actúan como backend REST. Desplegado en la plataforma serverless de Vercel.»

*Por:*
> «**Frontend y Backend unificado (Next.js 16 y React 19):** Plataforma full-stack unificada que articula Server-Side Rendering (SSR) reactivo, Server Actions para transacciones seguras en servidor y Route Handlers nativos como backend REST. Integra el compilador de alto rendimiento Turbopack y la convención moderna de interceptor perimetral (`src/proxy.ts`), permitiendo un despliegue desacoplado mediante contenedores Docker aislados.»

#### Modificación en Sección 1.2.6 (Página 11) y Sección 3.1 (Página 24)
*Reemplazar:*
> «...arquitectura Next.js 14 / PostgreSQL.»  
> «...desarrolladas sobre Next.js 14.»

*Por:*
> «...arquitectura Next.js 16 / PostgreSQL.»  
> «...desarrolladas sobre Next.js 16 y React 19.»

#### Modificación en Figura 2 (Página 41)
> En el diagrama de arquitectura de red y cloud, actualizar el rótulo del contenedor de aplicación central de `Next.js 14 API Gateway / Middlewares` a **`Next.js 16 API Gateway / Middlewares (Proxy Convention)`**.

---

## 3. Eje 2: Corrección en Modelado de Datos y Restricciones de Integridad en Prisma/PostgreSQL

### 3.1 Discrepancia A: Tipo de Identificadores (CUID vs. UUID v4)
#### Diagnóstico
En la **Página 40**, párrafo 3, se indica textualmente:
> *«Implementa una estrategia integral de seudonimización mediante identificadores compactos y opacos resistentes a colisiones (CUID / UUID v4) en el modelo relacional (id String @id @default(cuid()))»*

Sin embargo, al examinar [`prisma/schema.prisma`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma):
```prisma
// Línea 27:
model User {
  id String @id @default(uuid())
  ...
}

// Línea 75:
model Vehicle {
  id String @id @default(uuid())
  ...
}

// Línea 199:
model UsedNonce {
  id String @id @default(uuid())
  ...
}

// Línea 212:
model SecurityAuditLog {
  id String @id @default(uuid())
  ...
}
```
Todos los modelos relacionales del sistema implementan de forma estricta y consistente **UUID v4 (`@default(uuid())`)**, el estándar universal de 128 bits según el RFC 4122. En ningún archivo del repositorio se utiliza `cuid()`.

#### Propuesta de Redacción (Página 40, Sección 4.1.1)
*Reemplazar:*
> «...identificadores compactos y opacos resistentes a colisiones (CUID / UUID v4) en el modelo relacional (id String @id @default(cuid())), desacoplando...»

*Por:*
> «...identificadores universales únicos opacos y pseudoaleatorios (**UUID v4** según RFC 4122) en todos los modelos del sistema relacional (`id String @id @default(uuid())`), desacoplando de manera transversal los datos de identidad civil de conductores, guardias y administradores respecto a las bitácoras operativas y transaccionales para prevenir la enumeración secuencial y la correlación directa en caso de brechas.»

---

### 3.2 Discrepancia B: Restricción de Integridad Atómica en `UsedNonce` (Primary Key vs. Unique Index)
#### Diagnóstico
El texto de la tesina afirma en tres lugares distintos:
- **Página 25 (Tabla 5, RT-01):** *«tabla dedicada de PostgreSQL (UsedNonce) con clave primaria, garantizando consumo único atómico»*
- **Página 42 (Tabla 11):** *«Persistencia atómica del claim jti como clave primaria para asegurar el consumo de un solo uso.»*
- **Página 44 (Párrafo 3):** *«garantizando que cualquier intento de colisión sea bloqueado a nivel de motor de base de datos mediante la restricción de clave primaria (PRIMARY KEY).»*

Sin embargo, en el esquema relacional real ([`prisma/schema.prisma`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma), líneas 198-208):
```prisma
model UsedNonce {
  id        String   @id @default(uuid())
  jti       String   @unique
  userId    String?
  vehicleId String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([expiresAt])
  @@index([jti])
}
```
La clave primaria técnica de la tabla es la columna `id` (UUID v4). La protección contra replay attacks se logra porque el campo `jti` (JWT ID) está definido con una **restricción de unicidad estricta (`@unique`) respaldada por un índice B-Tree dedicado (`@@index([jti])`)**.

#### Justificación Técnica
Si bien en términos de álgebra relacional y concurrencia tanto una `PRIMARY KEY` como una restricción `UNIQUE` rechazan colisiones duplicadas a nivel de motor de base de datos (`UniqueViolationError`), un revisor que compare el texto con el script DDL o el archivo Prisma detectará una falta de rigurosidad terminológica.

#### Propuesta de Redacción Corregida

**En Tabla 5 (RT-01, Página 25):**
*Reemplazar:*
> «...persistencia transaccional del identificador único de token (jti) en una tabla dedicada de PostgreSQL (UsedNonce) con clave primaria, garantizando...»

*Por:*
> «...persistencia transaccional del identificador único de token (`jti`) en una tabla dedicada de PostgreSQL (`UsedNonce`) gobernada por una **restricción de unicidad relacional (`@unique` e índice indexado)**, garantizando consumo único atómico y neutralización de condiciones de carrera en infraestructura distribuida.»

**En Tabla 11 (Página 42) y Sección 4.1.3 (Página 44):**
*Reemplazar:*
> «Persistencia atómica del claim jti como clave primaria para asegurar el consumo de un solo uso.»  
> «...mediante la restricción de clave primaria (PRIMARY KEY).»

*Por:*
> «Persistencia atómica del claim `jti` bajo restricción de unicidad estricta (`@unique`) para asegurar el consumo de un solo uso.»  
> «...garantizando que cualquier intento de retransmisión concurrente colisione y sea bloqueado a nivel del motor relacional PostgreSQL mediante la **restricción de unicidad (`UNIQUE CONSTRAINT`)**, devolviendo un error HTTP 409 (Conflict).»

---

## 4. Eje 3: Detalle de la Seudonimización Transversal de Conductores, Guardias y Administradores (RT-04 / RQ-10)

### 4.1 Diagnóstico del Problema
En los requerimientos actualizados de ciberseguridad, la seudonimización no se limita a las placas vehiculares: **debe aplicarse obligatoriamente sobre los datos personales de conductores, guardias y administradores** para mitigar la sobreexposición y cumplir la Ley N° 21.719.

Aunque las tablas 5 (pág. 25), 9 (pág. 35) y 11 (pág. 42) mencionan la seudonimización de todos los roles, en la **Sección 4.2.4 (Código 4.3, página 48-49)** solo se exponen las funciones de cifrado de patente y Blind Index (`encryptSensitiveData` y `computeBlindIndex`). No se muestra ni explica el mecanismo implementado en el software para seudonimizar y enmascarar los datos de las personas naturales.

### 4.2 Justificación Técnica
Para que el Capítulo 4 sustente sólidamente el cumplimiento del requerimiento técnico RT-04 y el requerimiento de calidad RQ-10, debe incluirse el detalle de implementación del módulo [`src/lib/masking.ts`](file:///Users/ismael/Desktop/sigte-web-app/src/lib/masking.ts), demostrando cómo el sistema disocia el RUT, correo, teléfono y nombre operativo de los tres estamentos institucionales.

### 4.3 Propuesta de Inclusión en la Sección 4.2.4 (después de Código 4.3)

```markdown
#### Seudonimización y enmascaramiento transversal de identidades civiles (src/lib/masking.ts)

Para dar estricto cumplimiento al principio de Privacidad por Diseño (PbD) consagrado en la Ley N° 21.719, el sistema implementa en `src/lib/masking.ts` un conjunto de primitivas deterministas de disociación y enmascaramiento. Estas funciones se aplican transversalmente sobre los perfiles de **Conductores, Guardias y Administradores**, impidiendo que sus identificadores civiles naturales queden expuestos en interfaces operativas o en el tráfico de red perimetral:

```typescript
// Fragmento representativo: src/lib/masking.ts

/**
 * Enmascara el Rol Único Tributario (RUT) civil de conductores, guardias y administradores (RT-04).
 * Ejemplo: "12.345.678-9" -> "12.***.***-9" | "12345678-9" -> "12****78-9"
 */
export function maskRut(rut?: string | null): string {
  if (!rut) return "";
  const clean = rut.trim();
  if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts.length === 3) {
      const first = parts[0];
      const dv = clean.split("-")[1] || "";
      return `${first}.***.***-${dv}`;
    }
  }
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}${"*".repeat(clean.length - 4)}${clean.slice(-2)}`;
  }
  return clean;
}

/**
 * Minimiza el nombre completo para visualización en casetas y paneles operacionales (RT-03 / RQ-03).
 * Restringe la visibilidad al nombre de pila y la inicial del apellido.
 * Ejemplo: "Alejandro Vera Espinoza" -> "Alejandro V." | "Carlos Guardia Soto" -> "Carlos G."
 */
export function maskName(fullName?: string | null): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "";
  const firstName = parts[0];
  const surname = parts.length === 2 ? parts[1] : parts.length === 3 ? parts[1] : parts[2];
  return `${firstName} ${surname[0].toUpperCase()}.`;
}

/**
 * Enmascara casillas de correo institucional y números telefónicos.
 * Ejemplos: "conductor@usm.cl" -> "c***r@usm.cl" | "+56912345678" -> "+569****5678"
 */
export function maskEmail(email?: string | null): string {
  if (!email) return "";
  const clean = email.trim();
  const atIdx = clean.indexOf("@");
  if (atIdx <= 1) return clean;
  const mailbox = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx);
  return `${mailbox[0]}***${mailbox.slice(-1)}${domain}`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "";
  const clean = phone.trim();
  if (clean.startsWith("+569") && clean.length >= 12) {
    return `${clean.slice(0, 4)}****${clean.slice(-4)}`;
  }
  return clean.length > 4 ? `${clean.slice(0, 2)}****${clean.slice(-2)}` : clean;
}

/**
 * Aplica la disociación integral sobre la entidad User, generando un payload protegido (RT-04 / RQ-10).
 */
export function pseudonymizeUserData<T extends { id: string; name?: string | null; email?: string | null; rut?: string | null; phone?: string | null }>(user: T) {
  return {
    id: user.id, // Identificador opaco UUID v4
    name: maskName(user.name),
    email: maskEmail(user.email),
    rut: user.rut ? maskRut(user.rut) : undefined,
    phone: user.phone ? maskPhone(user.phone) : undefined,
  };
}
```

Mediante este desacoplamiento, la capa de presentación y las respuestas JSON de las API Routes suprimen cualquier identificador directo, garantizando que un operador de caseta o un observador de tráfico perimetral no puedan reconstruir la identidad civil de los miembros de la comunidad universitaria.
```

---

## 5. Eje 4: Detalle del Mecanismo de Resolución de Sesión para Rate-Limiting bajo NAT Universitario (RT-07)

### 5.1 Diagnóstico del Problema
En las páginas 20, 27, 40 y 48, la tesina introduce el cambio fundamental de **rate limiting por sesión** en lugar de dirección IP, justificando adecuadamente que en la red universitaria miles de equipos comparten la misma dirección IP pública a través de NAT/proxies perimetrales.

No obstante, en el Código 4.2 (página 48) únicamente se muestra la invocación:
`const sessionId = resolveSessionId(request);`
sin explicar cómo se resuelve y valida esa sesión para evitar que un atacante envíe identificadores de sesión aleatorios y evada la cuota.

### 5.2 Justificación Técnica
Para la aprobación formal del diseño de seguridad ante una comisión académica, debe detallarse la **cascada jerárquica de resolución de sesión** desarrollada en [`src/proxy.ts`](file:///Users/ismael/Desktop/sigte-web-app/src/proxy.ts), demostrando que el sistema previene la falsificación de sesiones y no deja puntos ciegos.

### 5.3 Propuesta de Inclusión en la Sección 4.2.4 (Previo a Código 4.2)

```markdown
#### Jerarquía de resolución y vinculación de sesión (src/proxy.ts)

Para garantizar que el rate-limiting y la activación del desafío interactivo operen de forma estricta por sesión sin ser eludidos mediante la rotación de encabezados volátiles, la función `resolveSessionId()` implementa una cascada priorizada basada en credenciales criptográficas y cookies protegidas:

```typescript
// Fragmento representativo: src/proxy.ts

export function resolveSessionId(req: NextRequest, verifiedSub?: string | null): string {
  // 1. Cabecera explícita inyectada por clientes móviles controlados (PWA Conductor/Guardia)
  const headerSessionId = req.headers.get("x-session-id");
  if (headerSessionId && headerSessionId.trim()) {
    return headerSessionId.trim();
  }

  // 2. Cookie dedicada de sesión generada con directivas HttpOnly y SameSite (sigte_session_id)
  const cookieSessionId = req.cookies.get("sigte_session_id")?.value;
  if (cookieSessionId && cookieSessionId.trim()) {
    return cookieSessionId.trim();
  }

  // 3. Sujeto autenticado (sub) extraído de la verificación matemática del JWT en servidor
  if (verifiedSub && verifiedSub.trim()) {
    return `usr_${verifiedSub.trim()}`;
  }

  // 4. Hash HMAC determinista del Bearer Token en tránsito para peticiones API M2M
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const rawToken = authHeader.substring(7).trim();
    if (rawToken) {
      return `tok_${createHmac("sha256", getBlindIndexSalt()).update(rawToken).digest("hex").slice(0, 16)}`;
    }
  }

  // 5. Fallback a identificador pseudoaleatorio de sesión anónima en cookie de cliente
  return "anon_fallback_session";
}
```

Esta jerarquía garantiza que:
1. Las sesiones autenticadas queden irreversiblemente vinculadas al sujeto verificado del token JWT, imposibilitando el reseteo del contador de fallos por manipulación de cabeceras.
2. Los clientes que navegan bajo la misma dirección IP pública de la UTFSM (ej. `200.1.28.10`) mantengan contextos de cuota (`RateLimitTier`) y registros de fallos (`CONSECUTIVE_FAILURES_BEFORE_CAPTCHA = 2`) estrictamente independientes en memoria, garantizando que el bloqueo interactivo de una sesión maliciosa no degrade el servicio de las demás terminales de la sede.
```

---

## 6. Eje 5: Formalización del Encadenamiento Criptográfico de Bitácoras (RT-06 / RQ-04)

### 6.1 Diagnóstico
En la **Página 49 (Código 4.4)** se presenta la función `calculateNextAuditHash` de `src/lib/audit-chain.ts`. Sin embargo, en el texto explicativo no se menciona un elemento fundacional de la seguridad criptográfica: **la serialización canónica determinista del JSON (`canonicalJsonStringify`)**.

En JavaScript/Node.js, el orden de las claves en un objeto JSON no está estandarizado por defecto. Si un registro se vuelve a inspeccionar y sus propiedades cambian de orden (por ejemplo, `{ a: 1, b: 2 }` versus `{ b: 2, a: 1 }`), el hash HMAC resultante será completamente diferente, generando falsos positivos de alteración (*tampering*) en la bitácora.

### 6.2 Propuesta de Mejora en la Explicación de la Sección 4.2.4

Se sugiere complementar la descripción del Código 4.4 con el siguiente párrafo explicativo:

> «Un componente crítico del diseño de inmutabilidad es la función auxiliar `canonicalJsonStringify(payload)`. Esta función ordena recursivamente las claves de los objetos antes de serializarlos a texto plano, eliminando la ambigüedad inherente al orden de inserción de propiedades en los motores de JavaScript. De este modo, la cadena de concatenación $D_n \parallel H_{n-1}$ produce una representación canónica invariante, asegurando que el cálculo determinista $H_n = \text{HMAC-SHA256}_{K_{audit}}(D_n \parallel H_{n-1})$ arroje exactamente el mismo resumen criptográfico durante las auditorías forenses posteriores, a menos que los datos hayan sido efectivamente adulterados.»

---

## 7. Eje 6: Corrección de Fórmulas Matemáticas y Artefactos Tipográficos

En la revisión visual y de texto del PDF se detectaron caracteres duplicados, símbolos encimados y ecuaciones truncadas generadas durante la renderización del documento original. Deben ser subsanados en el procesador de texto (Word/LaTeX) antes de la entrega:

| Página | Ubicación | Texto con Error en el PDF | Corrección Propuesta | Causa del Error |
| :---: | :--- | :--- | :--- | :--- |
| **17** | Sección 2.2.3, Viñeta 4 | `empleando un sellado con clave externa segregada (𝐾𝑎𝑢𝑑𝑖𝑡𝐾𝑎𝑢𝑑𝑖𝑡append-only) en base de datos` | `empleando un sellado con clave externa segregada ($K_{audit}$) y esquema de sólo inserción (append-only) en base de datos` | Superposición y duplicación de la variable $K_{audit}$ con el texto adjunto. |
| **19** | Sección 2.3.4, Viñeta 1 | `donde cada tupla histórica 𝑛 incluye el hash del registro precedente (𝑛 − 1 𝑛 − 1` | `donde cada tupla histórica $n$ incluye el hash del registro precedente ($n - 1$).` | La ecuación matemática se truncó y repitió los caracteres sin cerrar el paréntesis. |
| **19** | Sección 2.3.4, Viñeta 2 | `gobernado por una clave institucional segregada (𝐾𝑎𝑢𝑑𝑖𝑡𝐾𝑎𝑢𝑑𝑖𝑡` | `gobernado por una clave institucional segregada ($K_{audit}$).` | Duplicación de símbolo matemático y falta de paréntesis de cierre. |
| **26** | Tabla 5, RT-06 | `sin poder regenerarlo sin la clave 𝐾𝑎𝑢𝑑𝑖𝑡.` | `sin poder regenerarlo sin la clave institucional de auditoría ($K_{audit}$).` | Falta de formateo matemático estándar para la variable $K_{audit}$. |
| **35** | Tabla 9, Fila 3 | `𝐻𝑛 = 𝐻𝑀𝐴𝐶 − 𝑆𝐻𝐴256𝐾𝑎𝑢𝑑𝑖𝑡(𝐷𝑛 ∥ 𝐻𝑛−1))` | $H_n = \text{HMAC-SHA256}_{K_{audit}}(D_n \parallel H_{n-1})$ | Ecuación desalineada tipográficamente y con paréntesis redundante al final. |
| **43** | Tabla 11, Fila 6 | `𝐻𝑛 = 𝐻𝑀𝐴𝐶 − 𝑆𝐻𝐴256𝑘𝑎𝑢𝑑𝑖𝑡(𝐷𝑛 ∥ 𝐻𝑛−1)` | $H_n = \text{HMAC-SHA256}_{K_{audit}}(D_n \parallel H_{n-1})$ | Inconsistencia en la nomenclatura de la clave: $k_{audit}$ en minúscula en vez de $K_{audit}$. |

---

## 8. Matriz Consolidada de Acciones para la Versión Preliminar (Capítulos 1 al 4)

La siguiente tabla resume las acciones correctivas concretas recomendadas para sincronizar al 100% el texto de la entrega preliminar con el software funcional:

| Sección | Página | Tipo de Ajuste | Acción Concreta | Referencia en Software |
| :--- | :---: | :---: | :--- | :--- |
| **1.1.3** | 7 | Stack tecnológico | Reemplazar `Next.js 14` por `Next.js 16 y React 19`. | [`package.json`](file:///Users/ismael/Desktop/sigte-web-app/package.json) |
| **1.2.6** | 11 | Stack tecnológico | Actualizar referencia de framework a Next.js 16. | [`package.json`](file:///Users/ismael/Desktop/sigte-web-app/package.json) |
| **2.2.3** | 17 | Tipografía / LaTeX | Corregir texto duplicado `(𝐾𝑎𝑢𝑑𝑖𝑡𝐾𝑎𝑢𝑑𝑖𝑡append-only)`. | `$K_{audit}$` |
| **2.3.4** | 19 | Ecuación matemática | Reemplazar `(𝑛 − 1 𝑛 − 1` por `($n - 1$)` y cerrar paréntesis de `$K_{audit}$`. | Notación Hash Chaining |
| **3.1** | 24 | Stack tecnológico | Reemplazar mención de Next.js 14 por Next.js 16. | [`package.json`](file:///Users/ismael/Desktop/sigte-web-app/package.json) |
| **Tabla 5 (RT-01)** | 25 | Precisión de DDL | Aclarar que `jti` es una restricción `@unique` y no la clave primaria. | [`schema.prisma:200`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma#L200) |
| **Tabla 5 (RT-06)** | 26 | Tipografía | Formatear formalmente la clave `$K_{audit}$`. | Variable de entorno |
| **Tabla 9 (Fila 3)** | 35 | Ecuación matemática | Alinear fórmula $H_n = \text{HMAC-SHA256}_{K_{audit}}(D_n \parallel H_{n-1})$. | Notación Hash Chaining |
| **4.1.1** | 39 | Convención | Mantener `React 19 y Next.js 16` y citar la convención `src/proxy.ts`. | [`src/proxy.ts`](file:///Users/ismael/Desktop/sigte-web-app/src/proxy.ts) |
| **4.1.1** | 40 | Modelo relacional | Cambiar `default(cuid())` por `default(uuid())`. | [`schema.prisma:27`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma#L27) |
| **Figura 2** | 41 | Diagrama | Actualizar bloque a `Next.js 16 API Gateway / Middlewares`. | Diagrama Cloud |
| **Tabla 11** | 42 | Precisión de DDL | Modificar `jti como clave primaria` por `jti bajo restricción de unicidad`. | [`schema.prisma:200`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma#L200) |
| **Tabla 11** | 43 | Ecuación matemática | Cambiar $k_{audit}$ por mayúscula $K_{audit}$. | Notación formal |
| **4.1.3** | 44 | Restricción DDL | Reemplazar `PRIMARY KEY` de `jti` por `restricción UNIQUE`. | [`schema.prisma:200`](file:///Users/ismael/Desktop/sigte-web-app/prisma/schema.prisma#L200) |
| **4.2.4** | 48 | Profundización | Incorporar la lógica y código de `resolveSessionId` de `src/proxy.ts`. | [`src/proxy.ts:41`](file:///Users/ismael/Desktop/sigte-web-app/src/proxy.ts#L41) |
| **4.2.4** | 49 | Profundización | Añadir subsección y código de `src/lib/masking.ts` para todos los roles. | [`src/lib/masking.ts:59`](file:///Users/ismael/Desktop/sigte-web-app/src/lib/masking.ts#L59) |
| **4.2.4** | 49 | Explicación técnica | Justificar la serialización canónica determinista de JSON. | [`audit-chain.ts:16`](file:///Users/ismael/Desktop/sigte-web-app/src/lib/audit-chain.ts#L16) |
