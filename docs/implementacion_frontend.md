# S.I.G.T.E — Documentación de Implementación Frontend (Estilos, Maquetación y Componentes)

## 1. Introducción y Arquitectura Frontend

Este documento describe en detalle los **cambios funcionales aplicados a los estilos CSS, la maquetación de componentes y la arquitectura de interfaz de usuario** en el proyecto **S.I.G.T.E**.

La capa de presentación está construida sobre:
- **Next.js 16 (App Router)** con React 19 y TypeScript estricto.
- **Tailwind CSS + CSS Custom Properties**: combinación híbrida de utilidades de diseño atómico y variables globales para garantizar consistencia semántica y soporte nativo de temas (claro/oscuro).
- **Prisma Client & REST/Route Handlers**: consumo reactivo con validación de tipos entre cliente y servidor.

---

## 2. Configuración Global de Estilos y Tokens de Diseño

### 2.1 Variables Globales en `src/app/globals.css`
Se centralizaron los tokens de color institucionales y utilidades de maquetación en la hoja de estilos raíz:

```css
:root {
  /* ---- Colores Institucionales USM (Manual de Normas Oficial) ---- */
  --usm-azul:#004B85;         /* Pantone DS 207-1 C */
  --usm-azul-700:#003A66;
  --usm-azul-900:#002B4D;
  --usm-azul-050:#E8F0F6;
  --usm-rojo:#D60019;         /* Pantone DS 86-1 C */
  --usm-rojo-700:#9E0013;
  --usm-rojo-050:#FCE8EA;
  --usm-verde:#008452;        /* Pantone DS 268-1 C */
  --usm-verde-700:#006B43;
  --usm-verde-050:#E3F3EC;
  --usm-amarillo:#F7AE00;      /* Pantone DS 18-1 C */
  --usm-amarillo-700:#B57F00;
  --usm-amarillo-050:#FEF4DD;
  --usm-amarillo-ink:#3D2F00;
  --gris-marca:#9A999E;
  --usm-gris:#9A999E;
  --usm-negro:#000000;
  --usm-blanco:#FFFFFF;

  /* ---- Neutrales y Superficies ---- */
  --ink-900:#0E1A24;
  --ink-700:#243342;
  --ink-500:#526475;
  --ink-400:#7B8C9E;
  --surface:#FFFFFF;
  --surface-2:#FBFCFD;
  --line:#E3E8EE;
}
```

### 2.2 Extensión del Tema en `tailwind.config.ts`
Se actualizó la configuración de Tailwind para enlazar los tokens de la USM y asignar las fuentes corporativas:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      usm: {
        azul: { DEFAULT: "#004B85", 700: "#003A66", 900: "#002B4D", 50: "#E8F0F6" },
        rojo: { DEFAULT: "#D60019", 700: "#9E0013", 50: "#FCE8EA" },
        verde: { DEFAULT: "#008452", 700: "#006B43", 50: "#E3F3EC" },
        amarillo: { DEFAULT: "#F7AE00", 700: "#B57F00", 50: "#FEF4DD", ink: "#3D2F00" },
        gris: { DEFAULT: "#9A999E", 50: "#9A999E" },
        negro: "#000000",
        blanco: "#FFFFFF",
      },
      primary: { DEFAULT: "var(--usm-azul, #004B85)", foreground: "#ffffff" },
      secondary: { DEFAULT: "var(--usm-azul-050, #E8F0F6)", foreground: "var(--usm-azul, #004B85)" },
      destructive: { DEFAULT: "var(--usm-rojo, #D60019)", foreground: "#ffffff" },
      sidebar: {
        DEFAULT: "var(--usm-azul-900, #002B4D)",
        foreground: "#ffffff",
        primary: "var(--usm-azul, #004B85)",
        accent: "var(--usm-amarillo, #F7AE00)",
      },
    },
    fontFamily: {
      sans: ["var(--font-roboto)", "Roboto", "sans-serif"],
      display: ["var(--font-roboto-condensed)", "Roboto Condensed", "sans-serif"],
      mono: ["var(--font-roboto-mono)", "Roboto Mono", "monospace"],
    },
  },
}
```

---

## 3. Ajustes de Infraestructura y Content Security Policy (CSP)

En `next.config.ts`, se actualizaron las directivas de seguridad para permitir la carga segura de hojas de estilo y tipografías externas desde los CDNs oficiales de Google Fonts, eliminando bloqueos de CSP en el navegador:

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' blob: data:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];
```

---

## 4. Cambios Funcionales en Maquetación y Componentes

### 4.1 Selector de Versiones Adaptativo (`VersionSwitcher.tsx`)
- **Problema**: En pantallas de teléfonos móviles (`< 540px`), los tres botones continuos de versión (`v1`, `v2`, `v3`) saturaban el ancho del encabezado junto al logo, botón de menú y selector de modo oscuro.
- **Solución Funcional**:
  - Se crearon dos variantes de visualización condicionadas por media queries:
    - `.version-segmented-desktop`: despliega los botones segmentados en pantallas medianas y de escritorio (`>= 541px`).
    - `.version-dropdown-mobile`: muestra un único botón píldora compacto (ej. `[v3 ▾]`) en pantallas móviles (`<= 540px`).
  - Al presionar el botón en móviles, se abre un menú emergente flotante accesible con la lista completa de versiones, descripciones breves y redirección segura calculada mediante `getRedirectForDisallowedRoute`.
  - Se implementó un detector de eventos en el documento (`handleClickOutside`) que cierra automáticamente el menú flotante al hacer clic fuera del componente.

### 4.2 Maquetación del Login y Formularios de Acceso (`login.module.css` y `page.tsx`)
- **Ajuste de Rejilla y Altura en Pantallas Móviles**:
  - En pantallas mayores a 820px, la interfaz opera como un split de `1fr 1fr` a pantalla completa (`height: 100vh`).
  - En pantallas menores a 820px, se conmuta a una sola columna elástica (`height: auto; min-height: 100vh`) ocultando el panel ornamental lateral.
  - Para pantallas de teléfonos angostos (`max-width: 480px`), el padding del formulario se redujo de 40px a `20px 16px`, y el ancho máximo (`formInner`) se amplió al 100%. Esto previene el desbordamiento vertical y evita que el usuario tenga que hacer scroll para ver los botones de demo y de envío.
- **Alternancia de Visibilidad de Contraseña**:
  - Se añadió la variable de estado reactivo `showPassword` con su respectivo botón interactivo posicionado dentro del campo con `position: absolute; right: 10px;`.
  - Conmuta dinámicamente el tipo de input entre `"password"` y `"text"`, renderizando los íconos `<I name={showPassword ? "eyeOff" : "eye"} />`.

### 4.3 Consola Operativa de Guardia y Atajos de Teclado (`guard/page.tsx`)
- **Operación Manos Libres en Garita (Atajo `Enter`)**:
  - Se introdujo un listener global de eventos `keydown` en el componente de tarjeta vehicular (`VehicleCard`).
  - Si el operador presiona la tecla **Enter** y el cursor no se encuentra dentro de un campo de texto o menú desplegable:
    - Si el vehículo está autorizado y aún no ingresa al recinto, se dispara automáticamente la acción `onIn()` (Registrar ingreso).
    - Si el vehículo ya se encuentra en un bloque de estacionamiento, se ejecuta inmediatamente `onOut()` (Registrar salida).
  - Se añadieron indicaciones visuales en el botón (`(Enter ↵)`) y atributos `title` explicativos.

### 4.4 Resolución de Hydration Mismatch en SSR (`guard/occupancy/page.tsx`)
- **Diagnóstico**: La marca temporal de última actualización (`Date.now()`) calculada durante el renderizado en el servidor difería de la evaluada milisegundos después en el navegador, provocando el error React `#418` en consola.
- **Solución Funcional**:
  - Se introdujo un estado `mounted` inicializado en `false` y activado en `true` dentro de un hook `useEffect`.
  - El timestamp solo se formatea en el cliente tras el montaje, utilizando además el atributo `suppressHydrationWarning`:
    ```tsx
    <span suppressHydrationWarning>
      {mounted && ts ? `Actualizado ${new Date(ts).toLocaleTimeString()}` : "Actualizado"}
    </span>
    ```

### 4.5 Ampliación del Repositorio de Íconos SVG (`src/components/Icon.tsx`)
- **Ampliación de Glifos**:
  - Se incorporaron las definiciones de trazo vectorial para:
    - `edit` (alias funcional de `pencil`).
    - `userX` (usuario inactivo o bloqueado).
    - `userCheck` (usuario activo y validado).
    - `lock`, `unlock`, `power` y `shield`.
    - `eye` y `eyeOff`.
- **Mapeo Semántico en la Tabla de Administración (`admin/users/page.tsx`)**:
  - Se reemplazaron las llamadas erróneas que forzaban la "X" por los íconos correctos:
    - Edición: `<I name="pencil" size={16} />`
    - Estado: `<I name={u.active ? "userCheck" : "userX"} size={16} />` con color contextual según `u.active`.
    - Eliminación: `<I name="trash" size={16} />`.

### 4.6 Visualización Dinámica de Tokens QR (`user/qr/page.tsx`)
- **Cálculo de Vigencia y Reactividad Cromática**:
  - Se calcula el porcentaje restante `pct = Math.round((secondsLeft / (TTL_MS / 1000)) * 100)`.
  - Se enlaza la variable reactiva `timerColor`:
    ```typescript
    const timerColor =
      secondsLeft > 60
        ? "var(--usm-verde, #008452)"
        : secondsLeft > 20
        ? "var(--usm-amarillo, #F7AE00)"
        : "var(--usm-rojo, #D60019)";
    ```
  - La barra de progreso CSS sincroniza su anchura y fondo de forma fluida:
    ```tsx
    <div
      style={{
        height: "100%",
        width: Math.min(100, pct) + "%",
        background: timerColor,
        borderRadius: 3,
        transition: "width .5s linear, background 0.3s ease",
      }}
    />
    ```

### 4.7 Reglas de Tabla Responsiva para Celdas de Datos (`globals.css`)
- **Problema**: Tablas con múltiples columnas provocaban que los textos de RUT, correos e identificadores se quebraran verticalmente en palabras individuales en pantallas medianas.
- **Solución Funcional**:
  - Se aplicó `white-space: nowrap` general para `.table th, .table td`.
  - Se liberó la primera columna con `.table td:first-child { white-space: normal; }` para que los nombres de los usuarios o bloques de estacionamiento puedan fluir de forma elástica sin comprimir las columnas de contacto o acciones.

---

## 5. Pruebas y Validación Técnica

1. **DevSecOps & SAST**:
   - `node scripts/security-audit.mjs`: **84 de 84 pruebas unitarias e integración aprobadas al 100%**.
   - Verificación estática de tipos con `tsc --noEmit` completada con **0 errores**.
2. **Despliegue en Contenedores**:
   - Imagen `sigte-web:latest` compilada y empaquetada exitosamente vía Docker Compose (`docker compose up -d --build web`).
   - Verificación operativa del endpoint en `http://localhost:3000`.
