# S.I.G.T.E — UI/UX Evaluation and Responsiveness Audit Report

## 1. Executive Summary

This report documents an end-to-end visual, layout, and UX evaluation of the **S.I.G.T.E** (Sistema Inteligente de Gestión de Tránsito y Estacionamiento - UTFSM) application running locally at `http://localhost:3000`.

The evaluation was conducted using automated browser navigation via **Playwright** across multiple viewport form factors:
- **Desktop**: 1440 × 900 px (standard laptop / workstation monitor)
- **Tablet**: 768 × 1024 px (iPad / medium tablet in portrait orientation)
- **Mobile**: 375 × 812 px (iPhone X/13 mini / narrow mobile screen)

The audit systematically navigated through all major view hierarchies across incremental versions (**v1**, **v2**, and **v3**) and role perspectives (**Administrator**, **Guard**, and **User / Driver**). The goal is to provide concrete, actionable recommendations to elevate the aesthetic quality, layout responsiveness, and user experience while preserving the official Universidad Técnica Federico Santa María (USM) visual identity.

---

## 2. Methodology and Testing Matrix

| Viewport Profile | Dimensions | Evaluated Target Surfaces |
| :--- | :--- | :--- |
| **Desktop** | 1440 × 900 px | Full layout, grid charts, sidebar shell, multi-column metrics, horizontal tab navigation |
| **Tablet** | 768 × 1024 px | Drawer menu threshold (< 820px), responsive data tables, parking lot block cards |
| **Mobile** | 375 × 812 px | Drawer sidebars, topbar crowding, mobile hamburger menus, single-column lot grids, QR code display |

### Tested Views and Workflows:
1. **Public & Authentication**:
   - `/` (System Root Landing)
   - `/[version]` (Version-specific Landings for v1, v2, v3)
   - `/[version]/login` (Split screen authentication with credential switcher & security CAPTCHA)
   - `/[version]/register` (Student vs. Staff role registration forms)
   - `/[version]/forgot-password` (Password reset recovery)
2. **Administrator Portal (`/[version]/admin/*`)**:
   - `/[version]/admin` (Executive Dashboard, occupancy indicators, Recharts visual analytics)
   - `/[version]/admin/users` (Institutional user list with role badges and filtering)
   - `/[version]/admin/vehicles` (Vehicle inventory, authorization toggles, license plate badges)
   - `/[version]/admin/parking` (Parking block manager, default block settings, real-time occupancy)
   - `/[version]/admin/access` (Forensic access log and live check-in stream)
   - `/[version]/admin/infractions` (Sanctions tracking and status badges)
3. **Guard Panel (`/[version]/guard/*`)**:
   - `/[version]/guard` (Gate operational console, plate search, quick access registration)
   - `/[version]/guard/occupancy` (Real-time lot status & available quota)
   - `/[version]/guard/search` (Plate and RUT lookup)
   - `/[version]/guard/infractions` (Violation issuance form and records)
   - `/[version]/guard/history` (Historical gate movements)
4. **User / Driver Portal (`/[version]/user/*`)**:
   - `/[version]/user` (Driver dashboard and summary metrics)
   - `/[version]/user/qr` (Dynamic cryptographic HMAC QR generation with 5-minute countdown and fallback token copy)
   - `/[version]/user/vehicles` (Personal registered vehicles)
   - `/[version]/user/access` (Personal vehicle entry/exit history)
   - `/[version]/user/infractions` (Personal infraction notices)
   - `/[version]/user/notifications` (System notices)

---

## 3. Critical Technical & Visual Findings

### 3.1 Content Security Policy (CSP) Blocking Official USM Typography
- **Severity**: High (Visual Degradation)
- **Observed Behavior**: The browser console repeatedly flags:
  ```
  Loading the stylesheet 'https://fonts.googleapis.com/css2?...' violates the following
  Content Security Policy directive: "style-src 'self' 'unsafe-inline'".
  ```
- **Impact**: Google Fonts (`Roboto`, `Roboto Condensed`, `Roboto Mono`), which form the core typographical identity specified in the USM graphic manual, are blocked from loading over CDN. The interface falls back to system fonts (e.g., standard sans-serif / monospace), causing slight layout shifts and losing the crisp institutional character intended for headers, patente plates, and metrics.
- **Recommended Solution**:
  1. Either update the CSP header in `src/proxy.ts` (middleware) to allow `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` and `font-src 'self' https://fonts.gstatic.com data:`.
  2. Or, even better for performance and offline reliability: use Next.js built-in `next/font/google` (`Roboto`, `Roboto_Condensed`, `Roboto_Mono`) in `src/app/layout.tsx`. Next.js downloads and self-hosts font files at build time, eliminating external network requests and CSP font violations entirely.

### 3.2 React Hydration Mismatch (Error #418) in Guard Views
- **Severity**: Medium (Runtime Stability)
- **Observed Behavior**: Navigating to `/[version]/guard/occupancy` triggers a minified React Error `#418` (Hydration mismatch: server-rendered HTML differed from client initial render).
- **Impact**: While React recovers by client-side re-rendering, this causes a noticeable flash of unstyled/re-rendered content and degrades perceived performance.
- **Recommended Solution**: Ensure that dynamic date/time strings or timestamps rendered in `Occupancy` or `History` components are either formatted inside a `useEffect` hook or wrapped with `suppressHydrationWarning`.

---

## 4. Visual Layout & UX Observations by Section

### 4.1 Shell, Topbar & Version Switcher
- **Observation on Mobile (375px)**:
  - In `PanelShell` and `PortalShell`, the top bar is tight when multiple action items coexist: Menu Burger + Brand Title + Version Switcher (`v1`, `v2`, `v3` buttons) + Dark Mode Toggle + User Avatar.
  - On viewports narrower than 400px, the 3 version buttons take up significant horizontal real estate.
- **Recommended Improvements**:
  1. On viewports `< 540px`, collapse the 3 version buttons into a single compact pill button showing only the active version with a dropdown chevron (e.g., `[V3 ▾]`), opening the version list upon click.
  2. Hide the user's full name in topbars below 768px (already implemented in `PanelShell` via `.panel-topbar-user`, but should be uniformly extended to all headers).

### 4.2 Authentication & Onboarding (`/login`, `/register`, `/forgot-password`)
- **Strengths**:
  - The desktop split layout (clean form on the left, USM institutional blue `#004B85` gradient on the right) looks authoritative and well-balanced.
  - Quick-login demo buttons (`Admin`, `Guardia`, `Usuario`) provide an intuitive testing and demo experience.
  - The security CAPTCHA challenge container integrates cleanly with `--usm-azul-050` (`#E8F0F6`) and clear typographic prompts.
- **Identified Improvement Opportunities**:
  1. **Mobile Spacing**: On mobile screens (`375 × 812`), the login card padding (40px) is slightly excessive, pushing the demo credentials below the viewport fold and requiring scrolling. Decreasing padding to `20px` on mobile screens will allow all form elements to fit comfortably above the fold.
  2. **Password Reveal Button**: In login and register forms, adding an eye icon toggle (`Show/Hide Password`) improves touch ergonomics on mobile devices where typing complex passwords is error-prone.

### 4.3 Administrator Dashboard & Management Views
- **Executive Dashboard (`/[version]/admin`)**:
  - The 6-card summary metrics grid wraps nicely across screens.
  - Below 820px, the Recharts grid transitions from 2 columns (`1.4fr 1fr`) to a single column, preventing horizontal squishing.
  - **Chart Date Labels**: On 375px mobile screens, the 7-day X-axis dates (`10-18`, `10-19`, `...`, `10-24`) are slightly crowded. Adding `interval={1}` or rotating labels by -25 degrees on screens under 480px will prevent text collisions.
- **Data Tables (`/admin/users`, `/admin/parking`, `/admin/access`)**:
  - **Mobile Table Ergonomics**: While tables feature `.table-responsive` (allowing horizontal scrolling), data tables with 5+ columns (such as Parking Blocks with Action Buttons: *Ver vehículos*, *Marcar por defecto*, *Renombrar*, *Eliminar*) feel dense on mobile phones.
  - **Recommendation**: For screens `< 640px`, offer an alternate card-based presentation (or collapsible row accordion), or convert the action buttons into a three-dot kebab menu (`⋮`) containing the actions in a dropdown popover.

### 4.4 Guard Console (`/[version]/guard`)
- **Operational Ergonomics**:
  - The quick search input (`Ej: BBCL12 o CF-1234`) and search button are prominently positioned, suitable for tablet and desktop guard posts.
  - High-contrast visual cues (green for authorized, red for unauthorized) provide instantaneous decision-making signals.
- **Identified Improvement Opportunities**:
  1. **Keyboard-First Workflow**: At gate terminals, guards frequently rely on numpads or rapid keyboard inputs. Adding an automatic focus on the search input upon page load and binding the `Enter` key to immediate vehicle check-in will reduce click fatigue.
  2. **Touch Target Size for Gate Operations**: On outdoor touchscreen tablets, primary action buttons should have a minimum height of `48px` to `52px` and generous padding to ensure reliable taps even with gloved hands.

### 4.5 Driver / User Portal (`/[version]/user/*`)
- **QR Code View (`/[version]/user/qr`)**:
  - **Color & Contrast**: The generated QR code image strictly maintains a crisp white background (`#FFFFFF`) even in dark mode, ensuring optical gate barcode readers and smartphone cameras can scan without contrast failure.
  - **Timer Presentation**: The countdown timer (`292s restantes`) and the fallback "Copiar token" button work smoothly.
  - **Improvement**: Add an animated progress ring or linear countdown bar alongside the numeric seconds so users have an immediate visual sense of remaining validity without reading numbers.
- **Vehicle Registration (`/[version]/user/vehicles`)**:
  - Visual plate badges (`.plate`) give users high confidence that their vehicle is formatted correctly according to Chilean standards.

### 4.6 Theme Modes (Default Light Mode & Dark/High-Contrast Theme)
- **Institutional Requirement — Default to Light Mode**:
  - In alignment with the official USM digital identity (which is primarily white/light-background based as described in `Manual-de-Normas-USM.pdf`), **Light Mode must always be used by default across all views and sessions**.
  - The application must not automatically inherit an OS-level dark theme preference (`prefers-color-scheme: dark`). The interface must load in Light Mode on first visit, and switch to Dark Mode **only when the user explicitly triggers the theme toggle button** (`ThemeToggle`) in the interface.
  - Once manually chosen by the user, the selected theme must persist in `localStorage` across page reloads and navigation.
- **Dark Mode Implementation Quality**:
  - Variables in `globals.css` (`.dark`) cleanly adapt background tones (`#06121C`), cards (`#0E2030`), and border lines (`#1E3242`).
  - Institutional blue accents (`#004B85`) retain sufficient contrast against dark surfaces.
  - Yellow warning elements (`.badge.wait`) transition to readable lighter hues (`#ffd479`) to avoid dark-on-dark legibility issues.
- **Improvement**:
  - Maintain `<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>` in `RootLayout` to guarantee zero system-theme override and eliminate any flash of dark mode (FOUC) on cold loads.

---

## 5. Summary of Recommended UI/UX Enhancements

| Item | Area | Current Behavior | Proposed Enhancement | Priority |
| :---: | :---: | :---: | :---: | :---: |
| **1** | **Typography / CSP** | Google Fonts blocked by CSP; system fonts used as fallback. | Implement `next/font/google` in `layout.tsx` for self-hosted zero-CSP Google Fonts (`Roboto`, `Roboto Condensed`, `Roboto Mono`). | **High** |
| **2** | **Hydration (Guard views)** | React hydration warning #418 on `guard/occupancy`. | Ensure date formatting and client-dependent timestamps run inside `useEffect`. | **High** |
| **3** | **Mobile Version Switcher** | 3 buttons take up horizontal space in header on 375px screens. | Collapse into single dropdown pill button (`[V3 ▾]`) when viewport width is `< 480px`. | **Medium** |
| **4** | **Mobile Data Tables** | 4-5 buttons per row in `/admin/parking` causes horizontal scrolling. | Consolidate secondary row actions (*Renombrar*, *Eliminar*, etc.) into a three-dot kebab menu (`⋮`). | **Medium** |
| **5** | **Login Mobile Padding** | 40px outer padding pushes demo credential buttons below viewport. | Reduce form container padding to 20px on mobile viewports (`< 480px`). | **Medium** |
| **6** | **Guard Quick Actions** | Multiple clicks required to look up and register gate movement. | Add autofocus to plate search field on mount and keyboard shortcuts (`Enter` to open gate). | **Medium** |
| **7** | **QR Countdown Visualizer** | Only numeric seconds displayed (`292s restantes`). | Add a subtle circular or linear progress bar reflecting elapsed time. | **Low** |
| **8** | **Password Visibility Toggle** | Password fields mask input without reveal option. | Add standard eye toggle icon to inspect entered credentials on mobile devices. | **Low** |
| **9** | **Theme Default (Light Mode)** | OS dark mode preference might override institutional white canvas. | Enforce Light Mode as strict initial default (`defaultTheme="light"`, `enableSystem={false}`); Dark Mode active only via explicit user UI toggle. | **High** |

---

## 6. Conclusion

The S.I.G.T.E application demonstrates a solid, coherent design system strictly following the official USM graphic manual (Azul `#004B85`, Rojo `#D60019`, Verde `#008452`, Amarillo `#F7AE00`). The responsive behavior across desktop, tablet, and mobile displays is well-structured with dedicated burger drawers, grid collapsing, and adaptive sizing. 

Implementing the prioritized enhancements—specifically resolving the CSP font loading via `next/font/google`, fixing the hydration mismatch, and streamlining mobile table action menus—will bring the user experience to an institutional production-grade standard.
