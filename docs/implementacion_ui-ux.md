# S.I.G.T.E — Documentación de Implementación UI/UX (Mejoras Visuales)

## 1. Resumen Ejecutivo y Alcance

El presente documento detalla las **mejoras visuales, estéticas y de experiencia de usuario (UI/UX)** implementadas en la plataforma **S.I.G.T.E** (*Sistema Inteligente de Gestión de Tránsito y Estacionamiento - UTFSM*). 

Estas intervenciones consolidan la identidad corporativa y gráfica oficial de la **Universidad Técnica Federico Santa María (USM)**, elevan la accesibilidad y ergonomía táctil en distintos factores de forma (móvil, tablet y escritorio), y corrigen inconsistencias detectadas durante las auditorías de navegación automatizada con Playwright.

---

## 2. Identidad Institucional y Paleta de Colores Oficial USM

Se ajustaron y homologaron todas las variables de color del sistema de diseño de acuerdo con el **Manual de Normas Gráficas de la Universidad Técnica Federico Santa María** (`docs/Manual-de-Normas-USM.pdf`), garantizando consistencia cromática en las vistas públicas, paneles operativos y versiones incrementales (`v1`, `v2`, `v3`).

### 2.1 Tabla de Correspondencia Cromática USM

| Color Institucional | Código HEX | Referencia Pantone | Rol en la Interfaz S.I.G.T.E |
| :--- | :--- | :--- | :--- |
| **Azul USM Primario** | `#004B85` | Pantone DS 207-1 C | Color primario de marca, barras superiores, acentos activos, botones principales y cabeceras |
| **Azul USM Profundo** | `#002B4D` | Tono sombra 900 | Fondo de barra lateral administrativa (`Sidebar`), gradientes de autenticación y footer institucional |
| **Azul USM Claro** | `#E8F0F6` | Tono pastel 050 | Fondos de elementos interactivos secundarios, contenedores de CAPTCHA y chips de versión |
| **Rojo USM** | `#D60019` | Pantone DS 86-1 C | Estados destructivos, infracciones vehiculares graves, accesos denegados y alerta crítica de expiración QR |
| **Verde USM** | `#008452` | Pantone DS 268-1 C | Estados de éxito, vehículos autorizados, usuario activo y vigencia óptima de códigos QR |
| **Amarillo USM** | `#F7AE00` | Pantone DS 18-1 C | Advertencias de ocupación, vehículos pendientes de validación, transiciones y alertas preventivas |
| **Gris USM** | `#9A999E` | Process Black C 50% | Bordes sutiles, textos secundarios e iconografía deshabilitada |
| **Blanco USM** | `#FFFFFF` | N/A | Superficies base, tarjetas limpias y lienzo de códigos QR para escaneo óptico |
| **Negro USM** | `#000000` | Process Black | Tipografías de máximo contraste y modo lectura |

---

## 3. Política de Modo Claro por Defecto y Modo Oscuro Selectivo

### 3.1 Requisito Institucional: Modo Claro Obligatorio
Por directriz institucional de la USM, las plataformas digitales oficiales deben proyectar una imagen limpia, legible y luminosa sobre fondos claros institucionales. Por ello:
- **Modo Claro por Defecto**: Todo usuario nuevo o sesión sin preferencia previa almacenada inicia estrictamente en **Modo Claro** (`light`).
- **Aislamiento de la Preferencia del Sistema Operativo**: Se configuró la aplicación para ignorar la preferencia de color del sistema operativo (`prefers-color-scheme: dark`) mediante `enableSystem={false}`. Esto evita que computadores o celulares configurados en modo oscuro fuercen un renderizado oscuro no deseado al ingresar al portal universitario.
- **Alternancia Manual Intencionada**: El usuario puede cambiar a **Modo Oscuro** en cualquier momento mediante el botón de alternancia (`ThemeToggle`) presente en el encabezado. Su elección se persiste en `localStorage`.

### 3.2 Refinamiento del Modo Oscuro
Para las sesiones donde el operador o usuario active el tema oscuro (por ejemplo, en turnos nocturnos de garita):
- Los fondos utilizan tonalidades profundas (`#06121C` y `#0E2030`) que eliminan la fatiga visual sin perder contraste.
- Los badges amarillos (`.badge.wait`) ajustan su color tipográfico a `#ffd479` para evitar problemas de legibilidad sobre fondos oscuros.
- Los códigos QR conservan obligatoriamente un contenedor con fondo blanco puro (`#FFFFFF`) con margen de seguridad (padding), asegurando que los lectores de barras y cámaras de smartphones puedan decodificarlos en la oscuridad sin fallo de contraste óptico.

---

## 4. Tipografía Oficial USM y Desbloqueo Visual

### 4.1 Familia Tipográfica Roboto
Se integró la tipografía corporativa USM definida en el manual gráfico:
- **Roboto (Sans)**: Utilizada para todo el texto de cuerpo, formularios, etiquetas y descripciones funcionales.
- **Roboto Condensed (Display)**: Utilizada en títulos, cabeceras de módulos, encabezados de tablas y números destacados de métricas ejecutivas.
- **Roboto Mono (Monospace)**: Utilizada para placas patentes vehiculares (`.plate`), identificadores únicos (`USR-XXXX`, `ACC-XXXX`), tokens de sesión y temporizadores.

### 4.2 Desbloqueo de Content Security Policy (CSP)
Se ajustaron las cabeceras de seguridad CSP en `next.config.ts`, habilitando la carga legítima de las fuentes desde `fonts.googleapis.com` y `fonts.gstatic.com`. Con esto se erradicó el fallback a fuentes genéricas del sistema y se eliminaron los errores de consola, otorgando al sitio un acabado visual pulido y consistente con las demás plataformas USM.

---

## 5. Mejoras Visuales Específicas por Módulo

### 5.1 Portal de Autenticación y Registro (`/login`, `/register`, `/forgot-password`)
1. **Composición Split-Screen Balanceada**: 
   - Pantalla dividida en escritorio: formulario accesible a la izquierda y panel de marca institucional con degradado azul USM (`#002B4D` a `#004B85`) a la derecha.
   - En pantallas móviles (`< 820px`), el panel derecho se oculta de forma limpia para concentrar la atención del usuario en el inicio de sesión.
2. **Ergonomía de Formularios y Padding Táctil**:
   - Se redujo el relleno exterior en móviles de 40px a 20px, logrando que el formulario completo y los botones de demostración queden visibles sobre el pliegue inicial de pantalla (*above the fold*).
3. **Visor de Contraseña Interactivo (`Show/Hide Password`)**:
   - Se agregaron íconos de visibilidad (`eye` y `eyeOff`) en los campos de contraseña de Login y Registro, reduciendo errores de tipeo en dispositivos móviles sin comprometer la seguridad.
4. **Desafío CAPTCHA Visualmente Integrado**:
   - El contenedor del desafío matemático antibot utiliza un fondo suave `--usm-azul-050` con borde institucional `--usm-azul`, destacando la instrucción con un distintivo de seguridad claro.

### 5.2 Panel de Administración (`/admin/*`)
1. **Corrección de Íconos de Acciones en Usuarios (`/admin/users`)**:
   - **Problema previo**: Los botones de acción de cada fila se mostraban erróneamente con íconos "X" debido a un fallback de nombres no encontrados y una asignación confusa para el estado activo.
   - **Solución visual**:
     - Botón de edición: ícono de lápiz institucional (`pencil`) con tooltip descriptivo *"Editar perfil institucional"*.
     - Botón de estado: ícono de usuario verificado (`userCheck`) en verde institucional (`--ok-700`) cuando está activo, e ícono de usuario inhabilitado (`userX`) en gris neutro (`--ink-400`) cuando está inactivo.
     - Botón de borrado: ícono de papelera (`trash`) en rojo destructivo con confirmación modal.
2. **Analítica Visual con Gráficos USM (`ChartsUSM.tsx`)**:
   - Los gráficos de barras, líneas y áreas de Recharts se configuraron con la paleta de 5 tonos oficiales USM:
     - Primario: `#004B85` (Flujo horario de accesos).
     - Secundario: `#008452` (Ocupación permitida).
     - Alerta: `#F7AE00` (Capacidad en riesgo).
     - Infracciones: `#D60019`.
     - Neutral: `#9A999E`.

### 5.3 Consola de Guardia Operativa (`/guard/*`)
1. **Contraste Inmediato para Decisiones en Garita**:
   - Indicadores visuales de alto contraste: tarjeta de vehículo verde esmeralda para vehículos autorizados y roja para accesos no autorizados o sancionados.
2. **Eliminación del Flash de Contenido (Hydration Mismatch)**:
   - Se solucionó el parpadeo de renderizado en la vista de ocupación en vivo (`/guard/occupancy`), asegurando que las marcas temporales se muestren de forma estable.
3. **Señalización Visual del Atajo de Teclado**:
   - Los botones de registrar ingreso y salida incluyen la pista visual `(Enter ↵)` para permitir que los guardias operen la barrera ágilmente.

### 5.4 Portal del Conductor y Código QR (`/user/qr`)
1. **Semáforo Cromático en Cuenta Regresiva de QR**:
   - El indicador del temporizador dinámico cambia de color según el tiempo restante de vigencia del token HMAC:
     - **Verde USM (`#008452`)**: Más de 60 segundos restantes (vigencia segura).
     - **Amarillo USM (`#F7AE00`)**: Entre 20 y 60 segundos (aviso de próxima renovación).
     - **Rojo USM (`#D60019`)**: Menos de 20 segundos (renovación inminente).
2. **Barra de Progreso Suave**:
   - La barra lineal situada bajo el código QR cuenta con transiciones CSS continuas (`transition: width .5s linear, background 0.3s ease`), brindando una referencia visual intuitiva del tiempo de validez.

---

## 6. Verificación y Resultados

- **Auditoría de Navegación**: Realizada con Playwright en resoluciones de 375px, 768px y 1440px, certificando ausencia de desbordamientos horizontales, legibilidad de textos y correcta respuesta táctil.
- **Cumplimiento de Marca**: Se valida la presencia de los colores oficiales del Manual de Normas USM en todas las pantallas y versiones del aplicativo.
