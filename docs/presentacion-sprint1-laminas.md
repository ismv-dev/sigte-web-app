# S.I.G.T.E — Láminas faltantes (cierre Sprint 1)

Contenido listo para pegar en el deck. Orden sugerido del deck final:

1. Portada *(ya está)*
2. Equipo + **roles con aporte del sprint** *(ampliar lámina 2)*
3. ¿Qué es S.I.G.T.E? *(ya está)*
4. Usuarios *(ya está)*
5. 🆕 **Objetivo de la iteración (Sprint Backlog)**
6. 🆕 **Maqueta vs. Nuevo**
7. 🆕 **Demo del MVP** (en vivo)
8. 🆕 **Reflexión ágil**
9. 🆕 **Bitácora de feedback + plan de mejoras** *(evoluciona "Recomendaciones")*
10. Muchas gracias *(ya está)*

> ⚠️ **Entregable aparte de la rúbrica:** "Avance del MVP (video)" se evalúa por separado.
> Hay que **grabar y subir un video** (2–3 min) del MVP además de la demo en vivo.

---

## Lámina 2 (ampliar) — Equipo y roles del sprint

> Junto a cada nombre, una línea de **qué hizo en esta iteración**.
> ⚠️ AJUSTAR a lo real — esta es una propuesta basada en los roles y lo construido.

- **Ismael Galindo — Product Owner:** priorización del Sprint Backlog, definición de criterios de aceptación del MVP de gestión.
- **Juan Pablo González — Scrum Master:** coordinación del equipo, cierre del sprint, gestión del repositorio y despliegue.
- **Nicolás Sepúlveda — Back-end:** API de accesos, reglas de autorización/capacidad, QR firmado (HMAC) y trazabilidad de infracciones.
- **José-Luis Hidalgo — Front-end:** vistas de guardia y conductor, escáner de QR por cámara, panel responsive.
- **Alejandro Vera — Diseñador UX:** identidad visual USM, layouts de los tres paneles, validación de vistas.
- **Pedro Fernández — Tester:** pruebas de los flujos de ingreso/salida, validación de QR y casos de acceso denegado.

---

## Lámina 5 — Objetivo de la iteración (Sprint Backlog)

**Título:** Objetivo del Sprint 1

**Bajada:**
Llevar S.I.G.T.E a un **MVP honesto y demostrable de punta a punta** en la gestión
de accesos y estacionamiento — sin depender aún de hardware (cámaras LPR, barrera,
RFID), app móvil nativa ni SSO institucional. Eso queda en el roadmap.

**Sprint Backlog comprometido:**
- Autenticación con roles (Administración / Guardia / Conductor)
- QR de acceso **firmado y con expiración** (validación real, anti-falsificación)
- **Escaneo de QR por cámara** en la vista de guardia
- Reglas de acceso: autoriza / deniega + control de capacidad por bloque
- Infracciones: emisión, trazabilidad de resolución y reconocimiento del conductor
- "Mis accesos": historial del conductor
- Exportar bitácora de accesos a CSV (administración)
- Despliegue en producción (Vercel + PostgreSQL/Neon)

**Notas del orador:** "Nuestra meta no era prometer todo, sino tener un núcleo
funcional real y demostrable. Definimos explícitamente qué quedaba fuera para no
vender humo."

---

## Lámina 6 — Maqueta vs. Nuevo

**Título:** Qué viene de la maqueta y qué es nuevo

**🎨 De la maqueta (diseño UX):**
- Landing, login y registro
- Layouts de los tres paneles (administración / guardia / conductor)
- Identidad visual USM y gráficos

**⚙️ Nuevo este sprint (funcional):**
- Autenticación JWT real con roles
- **QR firmado (HMAC) con expiración + escaneo por cámara** → resuelve la
  validación de identidad en el acceso
- **Reglas de acceso** (autoriza/deniega + capacidad) → resuelve el control de ingreso
- Registro IN/OUT que libera el bloque → ocupación en **tiempo real**
- Trazabilidad de infracciones (quién resolvió, reconocimiento del conductor)
- Exportar bitácora a CSV → **trazabilidad de alta fidelidad** para la universidad
- Panel **responsive** + desplegado en producción (HTTPS, usable desde el celular)

**Notas del orador:** Vincular cada punto al problema del patrocinador:
"esto resuelve…". La maqueta era cómo se veía; esto es lo que ya funciona.

---

## Lámina 7 — Demo del MVP (en vivo)

**Título:** Demo del MVP

**Flujo a mostrar (vinculando cada paso al problema):**
1. **Conductor genera su QR** (en el celular) → credencial de acceso digital.
2. **Guardia escanea el QR con la cámara** y registra el ingreso →
   *resuelve el control de acceso en el pórtico.*
3. **QR vencido / falso es rechazado** →
   *resuelve la seguridad planteada por la profesora Jocelyn.*
4. **Panel de administración**: métricas y ocupación en tiempo real →
   *resuelve la visibilidad para la universidad.*
5. **Infracción** emitida por el guardia y **reconocida por el conductor** →
   *trazabilidad de la fiscalización.*
6. **Exportar CSV** → *bitácora de alta fidelidad.*

**Coreografía:** sobremesa muestra el QR (conductor); el iPhone (guardia) lo escanea.
URL de producción: **https://sigte-web.vercel.app**
Plan B: botón "Copiar token" si la cámara falla.

---

## Lámina 8 — Reflexión ágil

**Título:** Reflexión ágil

**✅ Qué logramos:**
- MVP funcional de punta a punta de la gestión de accesos
- Los tres roles operativos (administración / guardia / conductor)
- QR seguro y **escaneable de verdad** desde un teléfono
- Desplegado en producción y accesible desde el celular

**⏳ Qué quedó pendiente (roadmap):**
- Integración con hardware: cámaras LPR, barrera, RFID
- App móvil nativa y SSO institucional (Azure AD)
- Evidencia real de infracciones (fotos) y tiempo real (websockets)
- Caso "vehículo compartido / robo"

**⚠️ Una dificultad encontrada:**
- El feedback de seguridad/legalidad (robo, familiares que comparten vehículo,
  protección de datos) nos obligó a **firmar criptográficamente los QR** y repensar
  el modelo de acceso.
- Técnica: leer el QR por cámara exige **HTTPS** y la API nativa no sirve en
  Windows → lo resolvimos desplegando en Vercel y usando una librería de
  decodificación en el navegador.

**🔧 Un ajuste para la próxima iteración:**
- Validar cada vista con el diseñador UX **antes** de programar (no depender 100%
  de la IA en el frontend) y priorizar el caso de vehículo compartido / robo.

---

## Lámina 9 — Bitácora de feedback + plan de mejoras

**Título:** Feedback recibido y plan de mejoras

| Origen | Feedback | Acción / Plan |
|---|---|---|
| **Patrocinador** (Franco Jorquera) | Centralizar el proyecto en un solo repositorio para no agregar complejidad y mantener buen control de versiones | ✅ Hecho: un único repo |
| **Profa. Pamela Gatica** | No depender 100% de la IA en el frontend; cada vista validada por UX | 🔄 Ajuste próximo sprint: revisión UX por vista |
| **Profa. Jocelyn González** | Puntos críticos de seguridad y legalidad: robo de vehículos, familiares que comparten vehículo, protección de datos | ✅ QR firmado + reglas de acceso · 📋 Roadmap: caso vehículo compartido/robo |

**Notas del orador:** Esta lámina cubre el criterio "Bitácora de feedback y plan
de mejoras" — feedback organizado + acción concreta para cada punto.

---

## Checklist de la rúbrica (para no perder puntos)

- [ ] Introducción: equipo, proyecto, desafío y **objetivo de la iteración** (lám. 2–5)
- [ ] Demo del MVP señalando **maqueta vs. nuevo** (lám. 6–7)
- [ ] Reflexión ágil: logros, pendientes, dificultad, ajuste (lám. 8)
- [ ] **Bitácora de feedback + plan de mejoras** (lám. 9)
- [ ] **Roles y qué hizo cada uno** en la iteración (lám. 2)
- [ ] **Video del MVP** subido al aula virtual (entregable aparte)
- [ ] Presentación en **PDF**, en plazo, por el aula virtual
- [ ] Duración **10–13 min** (ensayar tiempos por sección)
