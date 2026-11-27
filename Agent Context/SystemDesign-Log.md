# System Design Log

This log tracks every architectural and component design decision, the user requirement that prompted it, the solution implemented, and the files affected across `frontend` and `backend`.

---

## Log Template

```markdown
### [YYYY-MM-DD] Entry Name
- **Domain**: frontend | backend | root
- **Requirement**: Brief description of user request
- **Files Touched / Created**:
  - `path/to/file`
- **Solution & Architecture**:
  - Detailed explanation of implementation and trade-offs
- **Verification**: How it was tested or verified
```

---

## Design Entries

### [2026-11-23] Initial Architecture & Conventions Setup
- **Domain**: root / agent context
- **Requirement**:
  - Establish development guidelines: React Native + Expo + Tailwind CSS (NativeWind) for Frontend; Python FastAPI for Backend.
  - Pure functional components, zero `StyleSheet.create` blocks.
  - Phased roadmap (Phase 1: Three.js 3D library centerpiece, JSON mock storage, direct role bypass buttons, shelf constraints, eye-level shelf popups, Admin book CRUD + QR generation).
  - Pre-execution notification rule before modifying code.
- **Files Touched / Created**:
  - `Agent Context/User-Instructions.md`
  - `Agent Context/SystemDesign-Log.md`
  - `Agent Context/Gemini-Instructions.md`
- **Solution & Architecture**:
  - Codified standards in `User-Instructions.md`.
  - Initialized `SystemDesign-Log.md` for ongoing architectural tracking.
  - Updated `Gemini-Instructions.md` to reflect cross-platform Expo + Python FastAPI stack.
- **Verification**: Files verified on disk with accurate Markdown schemas.

### [2026-11-23] Baseline Scaffolding: Frontend (Expo + NativeWind) & Backend (FastAPI)
- **Domain**: frontend & backend
- **Requirement**:
  - Scaffold `backend/` and `frontend/` directory structure and baseline code.
  - Backend: Python FastAPI with Pydantic schemas, layout, categories, and book CRUD with JSON mock persistence.
  - Frontend: React Native Expo with NativeWind (pure functional components, zero `StyleSheet.create`), Three.js WebView isometric map component, eye-level shelf elevation modal, QR display modal, and direct Student/Admin mode toggle.
- **Files Touched / Created**:
  - `backend/requirements.txt`
  - `backend/main.py`
  - `backend/app/config.py`
  - `backend/app/models/schemas.py`
  - `backend/app/api/endpoints.py`
  - `backend/app/data/{categories.json, layout.json, books.json}`
  - `frontend/package.json`
  - `frontend/tsconfig.json`
  - `frontend/app.json`
  - `frontend/tailwind.config.js`
  - `frontend/metro.config.js`
  - `frontend/global.css`
  - `frontend/nativewind-env.d.ts`
  - `frontend/App.tsx`
  - `frontend/src/types/index.ts`
  - `frontend/src/config/env.ts`
  - `frontend/src/services/api.ts`
  - `frontend/src/screens/{HomeScreen.tsx, StudentMapScreen.tsx, AdminCatalogScreen.tsx}`
  - `frontend/src/components/{Map3DView.tsx, ShelfElevationModal.tsx, QRCodeModal.tsx}`
  - `frontend/assets/data/{categories.json, layout.json, books.json}`
- **Solution & Architecture**:
  - Built an inline HTML template for Three.js in `Map3DView.tsx` with an orthographic camera, flat isometric materials, and raycasting touch events piped to React Native via `window.ReactNativeWebView.postMessage`.
  - Built `ShelfElevationModal.tsx` showing rows and clickable physical book spines for the eye-level shelf view.
  - Built `AdminCatalogScreen.tsx` with book filtering, CRUD, and QR code modal dialogs (`LIB1:{id}`).
  - Built `api.ts` supporting both offline mock JSON mode and live FastAPI mode via `APP_CONFIG.USE_MOCK_DATA`.
  - Verified 0 occurrences of `StyleSheet.create` and 0 class components.
- **Verification**:
  - Python AST syntax validation on all backend files passed.
  - Verified 0 occurrences of `StyleSheet` and 0 class components across all `.ts`/`.tsx` files.

### [2026-11-23] TypeScript Config Modernization (TS 5.x Standards)
- **Domain**: frontend
- **Requirement**: Address deprecation warnings for `moduleResolution: "node"` and `baseUrl`.
- **Files Touched / Created**:
  - `frontend/tsconfig.json`
- **Solution & Architecture**:
  - Upgraded `moduleResolution` to `"bundler"` (standard for modern Metro / Vite / Expo in TS 5+).
  - Removed deprecated `baseUrl`, configuring path aliases directly relative to project root (`"@/*": ["./src/*"]`).
  - Added `customConditions: ["react-native"]` to support React Native conditional exports.
- **Verification**: Validated `tsconfig.json` schema without deprecation flags.

### [2026-11-23] Expo Metro & Asset Dependency Resolution
- **Domain**: frontend
- **Requirement**: Fix `Error: The required package 'expo-asset' cannot be found` thrown by `@expo/metro-config`.
- **Files Touched / Created**:
  - `frontend/package.json`
  - `frontend/babel.config.js`
- **Solution & Architecture**:
  - Added `"expo-asset": "~11.0.4"` to `package.json` dependencies (required by Expo SDK 52 Metro asset plugins).
  - Created `frontend/babel.config.js` configuring NativeWind v4 preset (`jsxImportSource: "nativewind"`, `nativewind/babel`) and `react-native-reanimated/plugin`.
- **Verification**: Verified valid config files.

### [2026-11-23] Expo SDK 58 Upgrade, Web Support & Tailwind CSS Fix
- **Domain**: frontend
- **Requirement**:
  - Fix Tailwind CSS not loading (white canvas, unstyled elements).
  - Fix `React Native WebView does not support this platform` when running on web.
  - Upgrade from Expo SDK 52 to latest stable Expo SDK 58 with React 19 and React Native 0.88.
- **Files Touched / Created**:
  - `frontend/package.json`
  - `frontend/App.tsx`
  - `frontend/src/components/Map3DView.tsx`
- **Solution & Architecture**:
  - Upgraded dependencies to Expo `~58.0.26`, React `19.3.0`, React Native `0.88.1`, `react-native-web: ~0.21.4`, `react-dom: 19.3.0`.
  - Added required `import './global.css'` in `frontend/App.tsx` for NativeWind v4 stylesheet injection.
  - Added cross-platform web support in `Map3DView.tsx`: renders HTML5 `<iframe>` with mouse-click raycasting and `window.parent.postMessage` bridge on Web (`Platform.OS === 'web'`), while preserving native `WebView` on Android/iOS.
- **Verification**: Verified valid JSON in `package.json`, proper import in `App.tsx`, and cross-platform handling in `Map3DView.tsx`.

### [2026-11-23] Peer Dependency Alignment for React Native 0.88 & Expo 58
- **Domain**: frontend
- **Requirement**: Resolve npm ERESOLVE peer dependency conflict on `react-native@0.88.1`.
- **Files Touched / Created**:
  - `frontend/package.json`
- **Solution & Architecture**:
  - Aligned `@types/react` to `^19.1.1` as required by `react-native@0.88.1` peer requirements (replacing `~19.0.0`).
- **Verification**: Verified dependency match with npm registry metadata.

### [2026-11-23] Babel Reanimated 4 Worklets Plugin Cleanup
- **Domain**: frontend
- **Requirement**: Fix `Error: [BABEL]: Cannot find module 'react-native-worklets/plugin'` during Metro bundling.
- **Files Touched / Created**:
  - `frontend/babel.config.js`
- **Solution & Architecture**:
  - Removed `"react-native-reanimated/plugin"` from Babel plugins. In Reanimated v4, the Babel plugin was extracted into `react-native-worklets/plugin`. Since Reanimated worklets are not utilized in the app, removing this legacy plugin configuration resolves the transformer failure.
- **Verification**: Verified clean `babel.config.js` with NativeWind presets.

### [2026-11-23] Explicit SDK 58 Manifest Definition
- **Domain**: frontend
- **Requirement**: Ensure mobile devices and Expo Go detect project strictly as Expo SDK 58.
- **Files Touched / Created**:
  - `frontend/app.json`
- **Solution & Architecture**:
  - Added explicit `"sdkVersion": "58.0.0"` in `frontend/app.json` to prevent client manifest caching from displaying legacy SDK 52.
- **Verification**: Verified JSON schema and `sdkVersion: "58.0.0"`.

### [2026-11-23] Reanimated Elimination & Worklets Babel Neutralization
- **Domain**: frontend
- **Requirement**: Permanently eliminate `Cannot find module 'react-native-worklets/plugin'` on Android bundling.
- **Files Touched / Created**:
  - `frontend/package.json`
  - `frontend/babel.config.js`
  - `frontend/node_modules/react-native-reanimated/plugin/index.js`
- **Solution & Architecture**:
  - Removed unused `"react-native-reanimated"` dependency from `frontend/package.json`.
  - Configured `babel-preset-expo` with `reanimated: false, worklets: false` so Babel never attempts automatic Reanimated plugin injection.
  - Neutralized `react-native-reanimated/plugin/index.js` to a safe no-op Babel visitor, preventing any cached transformer errors.
- **Verification**: Verified file edits across config and node_modules.

### [2026-11-23] CSS Interop Reanimated Purge & Worklets Resolution
- **Domain**: frontend
- **Requirement**: Resolve `Unable to resolve "react-native-worklets" from "node_modules\react-native-reanimated\src\initializers.native.ts"` during Android bundling.
- **Files Touched / Created**:
  - `frontend/node_modules/`
  - `frontend/package.json`
- **Solution & Architecture**:
  - `react-native-css-interop` dynamically checks for `react-native-reanimated`. The leftover `react-native-reanimated` directory in `node_modules` was causing NativeWind to attempt importing uninstalled worklets.
  - Installed `react-native-worklets@0.13.1` and cleanly purged leftover `node_modules/react-native-reanimated`.
- **Verification**: Verified `node_modules/react-native-reanimated` is completely removed and `react-native-worklets` is available.

### [2026-11-23] Neumorphic 3D Map, Clash of Clans Navigation, Split Viewport & Aisle Architecture
- **Domain**: full-stack (frontend, backend, data)
- **Requirement**:
  - Upgrade 3D library centerpiece to a dark greyish neumorphic theme with softer, squarer geometries.
  - Add practical library elements: an entrance with doorway mat and turnstiles, a reception/register desk with a small 3D person sitting behind it typing on a terminal.
  - Upgrade shelves: dark grey bodies with multi-tier simulated book slots and floating category color dots instead of solid garish box colors.
  - Add realistic multi-shelf groupings/aisles per department (Computing, Circuits, Mechanics, Pure Sciences, Perimeter Reference and Periodicals) with multiple books per shelf (30 books total).
  - Implement Clash of Clans-style touch navigation (1-finger/mouse drag to pan across the floor plane, 2-finger pinch/wheel to zoom in/out with clamped bounds, locked isometric tilt).
  - Split viewport (~58% top / 42% bottom):
    - Bottom shows category directory/legend with color dots initially.
    - When a shelf or category dot is tapped, bottom shows the category aisle name, shelf specs, and horizontal pills for all other shelves in that section.
    - Top map view is replaced by the eye-level shelf contents view with physical spines and rows, with an easy toggle back to the 3D map.
  - Regressive testing: verified zero `StyleSheet.create`, verified Admin catalog book management and QR modal integrity.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/components/ShelfElevationView.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/src/screens/HomeScreen.tsx`
  - `frontend/App.tsx`
  - `frontend/assets/data/{layout.json, categories.json, books.json}`
  - `backend/app/data/{layout.json, categories.json, books.json}`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - In `Map3DView.tsx`, implemented procedural Three.js geometry for the reception desk and animated staff member (torso, skin tone, hair, desk arms, laptop display).
  - Implemented 1-finger screen-space isometric panning and 2-finger pinch-to-zoom math, with drag vs tap thresholding (`> 8px` drag = pan, `< 8px` = select shelf).
  - Built `ShelfElevationView.tsx` to mount directly in the top 58% viewport when a shelf is active, providing an eye-level book browsing experience before toggling back to 3D.
  - Expanded data catalogs to 18 shelves and 30 books, synchronizing frontend mock assets and backend JSON.
- **Verification**: Verified via `python -c` AST & JSON integrity check and `npx tsc --noEmit` with zero errors. Zero `StyleSheet.create` instances found.

### [2026-11-24] Architectural Alignment with Reference Mockup, Open Bookshelves & Safe-Area Protection
- **Domain**: full-stack (frontend, backend, data)
- **Requirement**:
  - Mimic visual architecture from reference screenshot (`assets/Screenshot 2026-11-24 010148.png`):
    - Full-length, continuous open wall-pinned bookshelf along the North wall.
    - Multiple open horizontal rows (5 tiers per bay) packed with individual colorful 3D book spines (not a closed glowing box).
    - Open interior room filled with study tables (6 tables with 4 chairs each), 3 computer counters along the wall, front circulation desk with laptop & paper stack, and an entrance archway.
    - Elevated floor plinth with powder-blue tiled floor and white grid lines.
    - Cutaway architecture (only Back-Left and North walls tall, front walls open).
  - Remove gesture hint overlay ("1-Finger Drag to Slide • Pinch to Zoom").
  - Account for mobile safe area window using `useSafeAreaInsets` from `react-native-safe-area-context` so Back buttons and top headers are fully accessible and never cut off by device notches or status bars.
- **Files Touched / Created**:
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/src/screens/HomeScreen.tsx`
  - `frontend/assets/data/{layout.json, categories.json, books.json}`
  - `backend/app/data/{layout.json, categories.json, books.json}`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - In `Map3DView.tsx`, implemented exact geometry from the screenshot: elevated white slab, powder blue tiles (`#a9c8e8`) with white grid, 7-bay open bookshelf with white uprights/planks and colorful vertical book meshes, 3 work counters with laptops/books, 6 study tables with 4 chairs each, back-left doorway with white door frame, and upright entrance security archway.
  - Removed `#nav-hint` banner element from Three.js HTML.
  - Replaced native `SafeAreaView` with `useSafeAreaInsets()` in `StudentMapScreen`, `AdminCatalogScreen`, and `HomeScreen`, ensuring dynamic `paddingTop` and `paddingBottom` protection across iOS and Android.
  - Mapped catalog books to the 7 wall bays (`SH-CS-1` through `SH-REF-1`).
- **Verification**: Verified via `python -c` AST & JSON check, zero `StyleSheet.create` instances, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Root SafeAreaProvider Injection
- **Domain**: frontend
- **Requirement**: Fix runtime error `No safe area value available. Make sure you are rendering '<SafeAreaProvider>' at the top of your app`.
- **Files Touched / Created**:
  - `frontend/App.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Wrapped root app tree inside `<SafeAreaProvider>` in `frontend/App.tsx` so `useSafeAreaInsets()` correctly accesses native window insets across all child screens.
- **Verification**: `npx tsc --noEmit` passed with 0 errors.

### [2026-11-24] Architectural Light Theme Overhaul & Emoji Purge
- **Domain**: frontend
- **Requirement**:
  - Shift entire application UI from dark theme to cohesive, modern, crisp architectural light theme matching the 3D model's clean aesthetic.
  - Remove all emojis across all screens and components.
  - Harmonize color palette: slate-100 backgrounds, crisp white card surfaces, slate-900 primary text, sky-700 accents, and light studio diorama canvas in Three.js.
  - Set status bar to dark icons.
- **Files Touched / Created**:
  - `frontend/App.tsx`
  - `frontend/src/screens/HomeScreen.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/components/ShelfElevationView.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/src/components/QRCodeModal.tsx`
  - `frontend/src/components/ShelfElevationModal.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Replaced dark backgrounds with `bg-slate-100` and cards with `bg-white border-slate-200 shadow-sm`.
  - In `Map3DView.tsx`, set canvas and Three.js background to studio off-white (`#f1f5f9`), letting the raised white slab and powder-blue floor diorama blend seamlessly.
  - Completely purged all emojis from all components (replaced with typographic badges, clean text navigation buttons, and minimal geometry).
  - Configured `<StatusBar style="dark" />` in `App.tsx`.
- **Verification**: Verified via `python -c` regex check confirming 0 emojis in `frontend/src`, zero `StyleSheet.create` instances, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Student Workflow Overhaul: 90% Shelf Sheet, Similarity Search, Floating Nav & QR Checkout
- **Domain**: frontend & services
- **Requirement**:
  - Replace the CSS shelf elevation view with a 90% screen-filling animated bottom sheet (`ShelfBooksModal.tsx`).
  - Traditional list view: colored vector book icons on the left, primary bold title, secondary greyed-out category & shelf hierarchy, and green/red availability dots on the far right.
  - Implement word-order-independent fuzzy similarity searching in `frontend/src/services/searchService.ts` so terms like "Algorithms Introduction" or "Cormen Algorithms" find "Introduction to Algorithms".
  - Eliminate the static bottom legend; the 3D map is the hero screen with top and bottom frosted gradient feathering overlays.
  - In Three.js: Add surrounding monochromatic clay classrooms (uncolored benches and chalkboards matching the isometric orientation) and an entrance hallway corridor leading out from the library door. The library remains the only vivid, colored space.
  - Remove all text and back buttons from the top bar, replacing it with a minimal frosted glassmorphic overlay.
  - Add a floating, circular, white bottom navigation bar with clean SVG icons (zero emojis) for:
    1. `Home` (3D Map)
    2. `Collections` (Digital bill receipts, active loans, return countdowns)
    3. `Scanner` (Camera/QR checkout workflow sending approval requests to Admin)
    4. `Profile` (Student ID pass, borrowing metrics, switch to Admin Console button)
  - Admin Console receives pending student QR scan checkout requests, with one-tap approval and digital bill receipt generation.
- **Files Touched / Created**:
  - `frontend/src/services/searchService.ts`
  - `frontend/src/services/lendingService.ts`
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/components/ShelfBooksModal.tsx`
  - `frontend/src/components/BottomNavBar.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/QRScannerScreen.tsx`
  - `frontend/src/screens/ProfileScreen.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `frontend/App.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Rebuilt the student UX around mobile-first library operations.
  - Created tokenized Levenshtein + Jaccard similarity algorithms in `searchService.ts`.
  - Built `lendingService.ts` managing scan-to-checkout, admin approval, and digital receipt generation.
  - Re-rendered Three.js scene with surrounding clay classroom blocks, corridor pathway, and gradient feathering.
  - Zero emojis across all screens and components.
- **Verification**: Verified via Python AST, JSON check, zero emojis regex audit, zero `StyleSheet.create`, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] 1:1 Orthogonal Panning Fix, Parallel West Corridor, Modular Campus Grid & Native Frosted Gradients
- **Domain**: full-stack (frontend UI, 3D engine, layout)
- **Requirement**:
  - Fix skewed scrolling/panning axis: dragging up was moving right, down moving left, right moving top.
  - Re-orient the corridor so it runs parallel/adjacent along the West wall (like a campus road/hallway with the library entrance door opening directly onto it, and classrooms across the corridor).
  - Clean up classroom props: replace arbitrary placement with a strictly organized campus grid with desks and benches in neat rows and columns.
  - Expand the campus with more adjacent buildings surrounding the library.
  - Fix frosted UI design: make the top and bottom gradients prominent and smooth across mobile devices using native SVG linear gradients.
- **Files Touched / Created**:
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **1:1 Screen-Space Basis Panning Math**: Extracted camera world matrix basis vectors (`camRight` from column 0, `camUp` from column 1) and projected them onto the horizontal ground plane ($y = 0$). Finger drag deltas ($dx, dy$) are mapped directly through these basis vectors ($-\text{dx} \cdot \vec{\text{camRight}} + \text{dy} \cdot \vec{\text{camUp}}$), guaranteeing dragging in any direction tracks the user's finger 1:1 without skew or rotation.
  - **Parallel West Campus Corridor**: Positioned the corridor parallel along the West wall from $z = -18$ to $z = 38$ (length 56m, width 3.6m), running directly outside the West entrance doorway.
  - **13-Building Organized Campus Grid**: Constructed 13 modular monochromatic clay buildings (Classrooms 100-104 along the West corridor, Classrooms 201-204 along the North wing, Labs 300-303 along the East perimeter, and Pavilions 401-402 along the South courtyard), each featuring raised clay plinths, north chalkboard walls, teacher desks, and 3x2 student desk/bench matrices.
  - **Expanded Panning Clamp**: Increased `cameraTarget` clamp boundary margin to 28m to allow full exploration of the campus buildings.
  - **Native SVG Frosted Gradients**: Implemented multi-stop SVG `LinearGradient` overlays (`react-native-svg`) at the top (height `insets.top + 72`) and bottom (height `insets.bottom + 115`) of `StudentMapScreen.tsx` with `pointerEvents="none"`, producing a seamless, slow frost fade behind the status bar and circular floating navbar.
- **Verification**: Verified via Python AST, JSON check, zero emojis regex check, zero `StyleSheet.create`, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Android Touch Dispatch, Hardware Elevation & Keyboard Handling Resolution
- **Domain**: navigation & touch input
- **Requirement**:
  - Fix issue where tapping the floating bottom navigation bar ("Home" tab) from the Scan QR screen failed to navigate on Android, despite working properly on Web.
- **Files Touched / Created**:
  - `frontend/src/components/BottomNavBar.tsx`
  - `frontend/src/screens/QRScannerScreen.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/ProfileScreen.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Native `pointerEvents="box-none"` Prop**: Replaced Tailwind CSS `pointer-events-box-none` class with the native React Native JSX prop `pointerEvents="box-none"` on the outer absolute container in `BottomNavBar.tsx`. This ensures Android correctly passes through touches outside the pill without creating an invisible touch barrier.
  - **Hardware `elevation: 40` Layering**: Added explicit `style={{ elevation: 40, zIndex: 40 }}` to both outer and inner navigation containers, ensuring Android's native `ViewGroup` touch dispatch honors the floating navigation bar above all underlying `ScrollView` components.
  - **Touch Hit Target Expansion (`hitSlop`)**: Attached `hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}` to each navigation `TouchableOpacity` button, preventing missed taps on mobile touchscreens.
  - **Keyboard & Tap Persistence**: Configured `keyboardShouldPersistTaps="handled"` on scrollable screens (`QRScannerScreen`, `CollectionsScreen`, `ProfileScreen`) and added generous `contentContainerStyle={{ paddingBottom: 130 }}` to prevent Android soft keyboards from discarding navigation taps or obscuring bottom content.
- **Verification**: Verified via Python AST, JSON check, zero emojis regex check, zero `StyleSheet.create`, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Cross-Platform Camera Scanner Unification, Touch-Freeze Root Cause Elimination & Lending Lifecycle Reset
- **Domain**: camera scanner, navigation touch responder, lending service
- **Requirement**:
  - Resolve camera viewport loading failure and touch freeze on mobile devices.
  - Eliminate the inconsistency where buttons existed only on laptop while mobile had a frozen screen.
  - Fix the issue where laptop had a prewritten book permanently in an "approved" state and mobile could not view or scroll to the test scanner.
  - Ensure the bottom navbar remains 100% responsive and clickable across all screens on both Android and Web.
- **Files Touched / Created**:
  - `frontend/src/components/CameraQRScanner.tsx`
  - `frontend/src/components/BottomNavBar.tsx`
  - `frontend/src/screens/QRScannerScreen.tsx`
  - `frontend/src/services/lendingService.ts`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Eliminated Problematic Native Android WebView**: Replaced the native Android `<WebView>` in `CameraQRScanner.tsx`, which was causing permission crashes (`NotAllowedError` in `getUserMedia`), swallowing all Android gesture events, and freezing the parent `ScrollView` and `BottomNavBar`.
  - **Unified Cross-Platform Scanner UI**: Both mobile and web now share the exact same responsive layout:
    - Sleek 224px viewport with four-corner target reticle and cross-platform native React Native `Animated.timing` continuous sweeping laser beam.
    - Live video stream toggle with dual-camera fallback (`facingMode: 'environment'` with fallback to `video: true` for laptop webcams).
    - Native mobile camera photo capture trigger (`capture="environment"`) invoking the device's native camera app for instant QR decoding without requiring native module compilation.
  - **Android Touch Responder Optimization**: Refactored `BottomNavBar.tsx` to use standard Android `elevation: 10` (eliminating `elevation: 99999` touch-layer masking) with proper touch hit boundaries and generous `hitSlop`, restoring instant navigation on Android.
  - **Lending Lifecycle Initial State Reset**: In `lendingService.ts`, cleared hardcoded active requests so books like `LIB1:CS01-1` start fresh and available in the catalog.
  - **Instant End-to-End Simulation**: In `QRScannerScreen.tsx`, added a one-tap "Simulate Instant Admin Approval" button on pending loan cards, allowing testing of the complete lifecycle: Available on Shelf -> Send Borrow Request to Admin -> Pending Approval -> Loan Approved with Pass ID & Due Date -> View in Collections.
### [2026-11-24] Production-Grade Native `expo-camera` Hardware Integration & Web Video Mount Race Fix
- **Domain**: camera scanner, native hardware integration, touch dispatch
- **Requirement**:
  - Completely fix camera viewport blank / jam issue across both Android mobile (Expo Go) and Laptop (Web).
  - Provide real, functional hardware scanning on Android mobile device without WebView permission hangs.
  - Guarantee seamless bottom navbar tab switching from the Scan QR screen on Android.
- **Files Touched / Created**:
  - `frontend/package.json`
  - `frontend/src/components/CameraQRScanner.native.tsx`
  - `frontend/src/components/CameraQRScanner.web.tsx`
  - `frontend/src/components/CameraQRScanner.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Native `expo-camera` (v58.0.14) Integration**: Installed official `expo-camera` package. Built `CameraQRScanner.native.tsx` for Android/iOS running natively inside Expo Go. Leverages `CameraView` with `useCameraPermissions()`, requesting native camera permission and decoding physical QR codes in real-time via native MLKit (`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`). Zero WebView, zero touch-thread blocking.
  - **Web Video Element Mount Fix (`CameraQRScanner.web.tsx`)**: Resolved the DOM mount race condition where `<video>` was conditionally unmounted when `isLiveActive` was false, causing `videoRef.current` to be null during stream acquisition. The `<video>` element is now persistently in the DOM with a ref callback that binds `srcObject` immediately upon stream arrival, with automatic dual-camera fallback (`environment` -> `user`/front webcam).
  - **Universal Re-Export (`CameraQRScanner.tsx`)**: Clean re-exporting shim ensuring Metro and TypeScript cleanly bundle the native camera for mobile and HTML5 video for web.
- **Verification**: Verified via Babel parser (22 files scanned, 0 errors), TypeScript compiler (`npx tsc --noEmit`, 0 errors), and automated audit (0 emojis, 0 `StyleSheet.create`).

### [2026-11-25] Firestore-Ready Two-Step Borrowing & Return Architecture with Book Custody & Audit Trail
- **Domain**: full-stack (frontend, backend, architecture)
- **Requirement**:
  - Eliminate auto-approval upon scanning: borrowing must forward a pending request to the Admin circulation desk for physical authorization.
  - Implement strict 2-step returns: students initiate returns from Collections, which enter a pending return verification queue for Admin inspection and physical sign-off.
  - Establish Firestore-ready JSON architecture:
    - Primary Key `id` on each Book, with `currentOwner` ({ studentId, studentName, borrowedDate, dueDate, loanId }) tracking who currently holds it.
    - Append-only `history` audit trail on each Book tracking lifetime owners, issue dates, due dates, returned dates, and desk staff signatures to prevent theft.
    - Shared `activeRequests` collection modeling Firestore queryable queues for pending borrows and returns.
    - User borrowing history tracking all lifetime books borrowed by a student.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/services/lendingService.ts`
  - `frontend/src/services/api.ts`
  - `frontend/src/screens/QRScannerScreen.native.tsx`
  - `frontend/src/screens/QRScannerScreen.web.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/assets/data/books.json`
  - `backend/app/models/schemas.py`
  - `backend/app/api/endpoints.py`
  - `backend/app/data/books.json`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Re-architected `lendingService.ts` to mirror Cloud Firestore collections (`books`, `activeRequests`, `loans`) 1:1.
  - Built dual-queue Admin Desk Approvals (Pending Borrow Requests & Pending Return Verifications) in `AdminCatalogScreen.tsx`.
  - Added dedicated Book Audit History modal in `AdminCatalogScreen.tsx` displaying the complete chronological borrower chain for any copy ID.
  - Rebuilt `CollectionsScreen.tsx` into 3 sections: Active Loans, Desk Operations in Progress, and Borrowing History.
- **Verification**: Verified via `npx tsc --noEmit` (0 errors), Python AST verification (0 errors), and automated audit (0 emojis, 0 `StyleSheet.create`).

### [2026-11-25] LendingService Backwards-Compatibility Aliases & Stale HMR Cache Protection
- **Domain**: frontend / services & types
- **Requirement**:
  - Fix `TypeError: _servicesLendingService.LendingService.getPendingRequests is not a function` occurring on web and during live Fast Refresh.
  - Provide complete backward-compatible surface for `LendingService` methods and type signatures during the Firestore 2-step approval migration.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/services/lendingService.ts`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Exported type aliases `LendingRequest = ActiveRequest` and `BillReceipt = StudentLoan` in `types/index.ts`.
  - Added backward-compatible alias methods to `LendingManager`:
    - `getPendingRequests()` -> proxies to `getPendingBorrowRequests()`
    - `getAllRequests()` -> proxies to `getAllActiveRequests()`
    - `getUserCollections()` -> proxies to user loans
    - `submitLendingRequest()`, `approveLendingRequest()`, `declineLendingRequest()`, `returnBook()`
- **Verification**: TypeScript check (`npx tsc --noEmit`) passes with 0 errors. Zero `StyleSheet.create` and zero emojis.

### [2026-11-25] Custom 3D Wall Logo Plaque with Texture Mapping & Gallery Accent Downlight
- **Domain**: frontend / 3D Visualization
- **Requirement**:
  - Add the user's custom screenshot logo (`Screenshot 2026-11-25 010431.png`) onto a wall in the Three.js 3D library scene.
- **Files Touched / Created**:
  - `frontend/assets/logo.png`
  - `frontend/src/services/logoData.ts`
  - `frontend/src/components/Map3DView.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Encoded `Screenshot 2026-11-25 010431.png` into a high-fidelity Base64 data URI in `logoData.ts` for instantaneous, zero-latency, cross-platform loading across Web `srcDoc` iframes and native Android/iOS WebViews.
  - Positioned the logo on the **East Feature Wall** ($x = 21.94, y = 3.0, z = 3.8$), the premier open architectural alcove facing directly into the isometric camera with zero bookshelf obstruction.
  - Preserved the image's native $327 \times 227$ aspect ratio ($1.44 : 1$) as a $3.2\text{m} \times 2.22\text{m}$ high-resolution texture mapped plane.
  - Framed with an architectural dark slate backing plaque ($3.42\text{m} \times 2.44\text{m} \times 0.06\text{m}$) and beveled metallic inset rim.
  - Mounted an architectural gallery sconce bar overhead with a dedicated warm point light ($0xfffaed$, $6.0\text{m}$ radius) washing down across the plaque surface.
- **Verification**: TypeScript check (`npx tsc --noEmit`) passed with 0 errors. Zero `StyleSheet.create`, zero emojis.

### [2026-11-24] True Optical Gradient Frost, Lighting Calibration, Darker Pathway & Tonal Contrast Overhaul
- **Domain**: 3D scene, frontend UI & styling
- **Requirement**:
  - Replace solid white color sweep gradients with true gradient frosted glass blur.
  - Fix overexposure where walls, floors, and tables shared the same white/clay tone and lacked detail.
  - Make classrooms and furniture distinctly greyer in parts to display highlights and form.
  - Make the pathway significantly darker than the rest.
  - Fix washed-out overexposed UI elements with proper contrast and border definitions.
- **Files Touched / Created**:
  - `frontend/src/components/Map3DView.tsx`
  - `frontend/src/screens/StudentMapScreen.tsx`
  - `frontend/src/components/ShelfBooksModal.tsx`
  - `frontend/src/components/BottomNavBar.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Optical Gradient Frost**: Removed opaque SVG `#f1f5f9` color wipes from `StudentMapScreen.tsx`. Implemented true optical frosted glass inside the WebGL WebView using CSS `backdrop-filter: blur(22px)` combined with `-webkit-mask-image: linear-gradient(...)` and a subtle translucent shimmer, blurring the 3D scene underneath without washing it out in solid white.
  - **Lighting Calibration**: Lowered ambient light from `0.9` to `0.45` to prevent flat overexposure; increased directional key light to `0.85` and added a cool fill light (`0.25`) to produce distinct shadows and sharp edge highlights across all geometries. Changed scene background to studio architectural grey (`#d5dde6`).
  - **Dark Paved Pathway**: Re-engineered the corridor into deep dark slate asphalt (`0x242e3d`), bordered by raised curbs (`0x111827`) with entrance cutouts and paver cross-stripes (`0x475569`), making it dramatically darker and unmistakable from the surrounding architecture.
  - **Classroom Tonal Hierarchy**: Separated classroom elements into distinct materials: Slate-400 foundation slabs (`0x8896a6`), concrete grey floors (`0xd4dce4`) with tile grid lines, stone grey walls (`0xb0bcc7`) with dark coping rims (`0x64748b`), slate-500 desk tops (`0x64748b`) with slate-700 legs (`0x334155`), slate-600 benches (`0x475569`), and deep charcoal chalkboards (`0x1e293b`) with aluminum frames (`0x94a3b8`).
  - **Library Furniture Contrast**: Study tables now feature clean white tops with dark slate legs (`0x475569`), surrounded by dark charcoal chairs (`0x334155`) with deep legs (`0x1e293b`); computer work counters have illuminated cyan screens (`0x38bdf8`).
  - **UI Contrast Boost**: Modal sheets set against `bg-slate-100` with clean `bg-white border border-slate-200` cards, defined search input borders (`border-slate-300`), and higher-contrast navigation icons/pills.
- **Verification**: Verified via Python AST, JSON check, zero emojis regex check, zero `StyleSheet.create`, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Android Touch Dispatch, Hardware Elevation & Keyboard Handling Resolution
- **Domain**: navigation & touch input
- **Requirement**:
  - Fix issue where tapping the floating bottom navigation bar ("Home" tab) from the Scan QR screen failed to navigate on Android, despite working properly on Web.
- **Files Touched / Created**:
  - `frontend/src/components/BottomNavBar.tsx`
  - `frontend/src/screens/QRScannerScreen.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/ProfileScreen.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Native `pointerEvents="box-none"` Prop**: Replaced Tailwind CSS `pointer-events-box-none` class with the native React Native JSX prop `pointerEvents="box-none"` on the outer absolute container in `BottomNavBar.tsx`. This ensures Android correctly passes through touches outside the pill without creating an invisible touch barrier.
  - **Hardware `elevation: 40` Layering**: Added explicit `style={{ elevation: 40, zIndex: 40 }}` to both outer and inner navigation containers, ensuring Android's native `ViewGroup` touch dispatch honors the floating navigation bar above all underlying `ScrollView` components.
  - **Touch Hit Target Expansion (`hitSlop`)**: Attached `hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}` to each navigation `TouchableOpacity` button, preventing missed taps on mobile touchscreens.
  - **Keyboard & Tap Persistence**: Configured `keyboardShouldPersistTaps="handled"` on scrollable screens (`QRScannerScreen`, `CollectionsScreen`, `ProfileScreen`) and added generous `contentContainerStyle={{ paddingBottom: 130 }}` to prevent Android soft keyboards from discarding navigation taps or obscuring bottom content.
- **Verification**: Verified via Python AST, JSON check, zero emojis regex check, zero `StyleSheet.create`, and `npx tsc --noEmit` with 0 errors.

### [2026-11-24] Cross-Platform Camera Scanner Unification, Touch-Freeze Root Cause Elimination & Lending Lifecycle Reset
- **Domain**: camera scanner, navigation touch responder, lending service
- **Requirement**:
  - Resolve camera viewport loading failure and touch freeze on mobile devices.
  - Eliminate the inconsistency where buttons existed only on laptop while mobile had a frozen screen.
  - Fix the issue where laptop had a prewritten book permanently in an "approved" state and mobile could not view or scroll to the test scanner.
  - Ensure the bottom navbar remains 100% responsive and clickable across all screens on both Android and Web.
- **Files Touched / Created**:
  - `frontend/src/components/CameraQRScanner.tsx`
  - `frontend/src/components/BottomNavBar.tsx`
  - `frontend/src/screens/QRScannerScreen.tsx`
  - `frontend/src/services/lendingService.ts`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Eliminated Problematic Native Android WebView**: Replaced the native Android `<WebView>` in `CameraQRScanner.tsx`, which was causing permission crashes (`NotAllowedError` in `getUserMedia`), swallowing all Android gesture events, and freezing the parent `ScrollView` and `BottomNavBar`.
  - **Unified Cross-Platform Scanner UI**: Both mobile and web now share the exact same responsive layout:
    - Sleek 224px viewport with four-corner target reticle and cross-platform native React Native `Animated.timing` continuous sweeping laser beam.
    - Live video stream toggle with dual-camera fallback (`facingMode: 'environment'` with fallback to `video: true` for laptop webcams).
    - Native mobile camera photo capture trigger (`capture="environment"`) invoking the device's native camera app for instant QR decoding without requiring native module compilation.
  - **Android Touch Responder Optimization**: Refactored `BottomNavBar.tsx` to use standard Android `elevation: 10` (eliminating `elevation: 99999` touch-layer masking) with proper touch hit boundaries and generous `hitSlop`, restoring instant navigation on Android.
  - **Lending Lifecycle Initial State Reset**: In `lendingService.ts`, cleared hardcoded active requests so books like `LIB1:CS01-1` start fresh and available in the catalog.
  - **Instant End-to-End Simulation**: In `QRScannerScreen.tsx`, added a one-tap "Simulate Instant Admin Approval" button on pending loan cards, allowing testing of the complete lifecycle: Available on Shelf -> Send Borrow Request to Admin -> Pending Approval -> Loan Approved with Pass ID & Due Date -> View in Collections.
### [2026-11-24] Production-Grade Native `expo-camera` Hardware Integration & Web Video Mount Race Fix
- **Domain**: camera scanner, native hardware integration, touch dispatch
- **Requirement**:
  - Completely fix camera viewport blank / jam issue across both Android mobile (Expo Go) and Laptop (Web).
  - Provide real, functional hardware scanning on Android mobile device without WebView permission hangs.
  - Guarantee seamless bottom navbar tab switching from the Scan QR screen on Android.
- **Files Touched / Created**:
  - `frontend/package.json`
  - `frontend/src/components/CameraQRScanner.native.tsx`
  - `frontend/src/components/CameraQRScanner.web.tsx`
  - `frontend/src/components/CameraQRScanner.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - **Native `expo-camera` (v58.0.14) Integration**: Installed official `expo-camera` package. Built `CameraQRScanner.native.tsx` for Android/iOS running natively inside Expo Go. Leverages `CameraView` with `useCameraPermissions()`, requesting native camera permission and decoding physical QR codes in real-time via native MLKit (`barcodeScannerSettings={{ barcodeTypes: ['qr'] }}`). Zero WebView, zero touch-thread blocking.
  - **Web Video Element Mount Fix (`CameraQRScanner.web.tsx`)**: Resolved the DOM mount race condition where `<video>` was conditionally unmounted when `isLiveActive` was false, causing `videoRef.current` to be null during stream acquisition. The `<video>` element is now persistently in the DOM with a ref callback that binds `srcObject` immediately upon stream arrival, with automatic dual-camera fallback (`environment` -> `user`/front webcam).
  - **Universal Re-Export (`CameraQRScanner.tsx`)**: Clean re-exporting shim ensuring Metro and TypeScript cleanly bundle the native camera for mobile and HTML5 video for web.
- **Verification**: Verified via Babel parser (22 files scanned, 0 errors), TypeScript compiler (`npx tsc --noEmit`, 0 errors), and automated audit (0 emojis, 0 `StyleSheet.create`).

### [2026-11-25] Firestore-Ready Two-Step Borrowing & Return Architecture with Book Custody & Audit Trail
- **Domain**: full-stack (frontend, backend, architecture)
- **Requirement**:
  - Eliminate auto-approval upon scanning: borrowing must forward a pending request to the Admin circulation desk for physical authorization.
  - Implement strict 2-step returns: students initiate returns from Collections, which enter a pending return verification queue for Admin inspection and physical sign-off.
  - Establish Firestore-ready JSON architecture:
    - Primary Key `id` on each Book, with `currentOwner` ({ studentId, studentName, borrowedDate, dueDate, loanId }) tracking who currently holds it.
    - Append-only `history` audit trail on each Book tracking lifetime owners, issue dates, due dates, returned dates, and desk staff signatures to prevent theft.
    - Shared `activeRequests` collection modeling Firestore queryable queues for pending borrows and returns.
    - User borrowing history tracking all lifetime books borrowed by a student.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/services/lendingService.ts`
  - `frontend/src/services/api.ts`
  - `frontend/src/screens/QRScannerScreen.native.tsx`
  - `frontend/src/screens/QRScannerScreen.web.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/assets/data/books.json`
  - `backend/app/models/schemas.py`
  - `backend/app/api/endpoints.py`
  - `backend/app/data/books.json`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Re-architected `lendingService.ts` to mirror Cloud Firestore collections (`books`, `activeRequests`, `loans`) 1:1.
  - Built dual-queue Admin Desk Approvals (Pending Borrow Requests & Pending Return Verifications) in `AdminCatalogScreen.tsx`.
  - Added dedicated Book Audit History modal in `AdminCatalogScreen.tsx` displaying the complete chronological borrower chain for any copy ID.
  - Rebuilt `CollectionsScreen.tsx` into 3 sections: Active Loans, Desk Operations in Progress, and Borrowing History.
- **Verification**: Verified via `npx tsc --noEmit` (0 errors), Python AST verification (0 errors), and automated audit (0 emojis, 0 `StyleSheet.create`).

### [2026-11-25] LendingService Backwards-Compatibility Aliases & Stale HMR Cache Protection
- **Domain**: frontend / services & types
- **Requirement**:
  - Fix `TypeError: _servicesLendingService.LendingService.getPendingRequests is not a function` occurring on web and during live Fast Refresh.
  - Provide complete backward-compatible surface for `LendingService` methods and type signatures during the Firestore 2-step approval migration.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/services/lendingService.ts`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Exported type aliases `LendingRequest = ActiveRequest` and `BillReceipt = StudentLoan` in `types/index.ts`.
  - Added backward-compatible alias methods to `LendingManager`:
    - `getPendingRequests()` -> proxies to `getPendingBorrowRequests()`
    - `getAllRequests()` -> proxies to `getAllActiveRequests()`
    - `getUserCollections()` -> proxies to user loans
    - `submitLendingRequest()`, `approveLendingRequest()`, `declineLendingRequest()`, `returnBook()`
- **Verification**: TypeScript check (`npx tsc --noEmit`) passes with 0 errors. Zero `StyleSheet.create` and zero emojis.

### [2026-11-25] Custom 3D Wall Logo Plaque with Texture Mapping & Gallery Accent Downlight
- **Domain**: frontend / 3D Visualization
- **Requirement**:
  - Add the user's custom screenshot logo (`Screenshot 2026-11-25 010431.png`) onto a wall in the Three.js 3D library scene.
- **Files Touched / Created**:
  - `frontend/assets/logo.png`
  - `frontend/src/services/logoData.ts`
  - `frontend/src/components/Map3DView.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Encoded `Screenshot 2026-11-25 010431.png` into a high-fidelity Base64 data URI in `logoData.ts` for instantaneous, zero-latency, cross-platform loading across Web `srcDoc` iframes and native Android/iOS WebViews.
  - Positioned the logo on the **East Feature Wall** ($x = 21.94, y = 3.0, z = 3.8$), the premier open architectural alcove facing directly into the isometric camera with zero bookshelf obstruction.
  - Preserved the image's native $327 \times 227$ aspect ratio ($1.44 : 1$) as a $3.2\text{m} \times 2.22\text{m}$ high-resolution texture mapped plane.
  - Framed with an architectural dark slate backing plaque ($3.42\text{m} \times 2.44\text{m} \times 0.06\text{m}$) and beveled metallic inset rim.
  - Mounted an architectural gallery sconce bar overhead with a dedicated warm point light ($0xfffaed$, $6.0\text{m}$ radius) washing down across the plaque surface.
- **Verification**: TypeScript check (`npx tsc --noEmit`) passed with 0 errors. Zero `StyleSheet.create`, zero emojis.

### [2026-11-26] Modular Async Repositories, Email/Password Auth, & Pre-Firebase Hardening
- **Domain**: frontend / auth, services, utils, config, screens, 3D map
- **Requirement**:
  - Implement Email/Password authentication (`AuthScreen` + `AuthService`) compatible with Expo Go and Web before switching to Firebase JS SDK (deferring Google OAuth to Expo Development Builds).
  - Refactor book and lending services into async Repository interfaces (`IBookRepository`, `ILendingRepository`, `IAuthRepository`) strictly inside the existing `User-Instructions.md` folder structure.
  - Fix copy ID collision after deletions, replace hardcoded Profile stats with live metrics, and stop reloading the Three.js scene on shelf selection.
- **Files Touched / Created**:
  - `frontend/src/types/index.ts`
  - `frontend/src/utils/bookId.ts` (new)
  - `frontend/src/config/env.ts`
  - `frontend/src/services/authService.ts` (new)
  - `frontend/src/services/api.ts`
  - `frontend/src/services/lendingService.ts`
  - `frontend/src/screens/AuthScreen.tsx` (new)
  - `frontend/App.tsx`
  - `frontend/src/screens/AdminCatalogScreen.tsx`
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/ProfileScreen.tsx`
  - `frontend/src/screens/QRScannerScreen.native.tsx`
  - `frontend/src/screens/QRScannerScreen.web.tsx`
  - `frontend/src/components/Map3DView.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Solution & Architecture**:
  - Created `AuthService` mirroring Firebase Auth (`signInWithEmail`, `registerWithEmail`, `signOut`, `subscribe`) with seeded multi-student (`raghu@college.edu`, `ananya@college.edu`) and admin (`librarian@college.edu`) credentials plus full registration.
  - Added `generateNextBookId()` in `src/utils/bookId.ts` with monotonic high-water marks so deleted copy IDs are never reused.
  - Converted `LibraryApiService` and `LendingService` to async `Promise`-returning methods with authoritative `on_shelf` custody checks preventing race conditions.
  - Updated `ProfileScreen` to show live account info and real loan counters, and updated `Map3DView` to highlight bays via `postMessage` / `injectJavaScript` without rebuilding the 3D scene.
- **Verification**: `npx tsc --noEmit` (0 errors), executable regression suite passing all auth, CRUD/collision-guard, multi-user 2-step borrow/return, and search checks, plus automated audit across 26 files (0 emojis, 0 `StyleSheet.create`).

### [2026-11-26] Firebase SDK Integration, Live Auth & Firestore Porting (`fbconfig.txt`)
- **Domain**: frontend / config, services, metro, gitignore
- **Requirement**:
  - Wire the exact `firebaseConfig` from root `fbconfig.txt` into the application (`projectId: "library-5f8b2"`).
  - Switch `AuthService`, `LibraryApiService`, and `LendingService` from local mock mode to live Firebase Email/Password Auth and Cloud Firestore without altering UI components.
- **Files Touched / Created**:
  - `frontend/package.json` (installed `firebase` `^13.4.0` and `@react-native-async-storage/async-storage` `2.2.0`)
  - `frontend/metro.config.js` (added `.cjs` source extension while preserving package exports required by React Native 0.88.1)
  - `frontend/src/config/firebase.ts` (new — `fbconfig.txt` constants + cross-platform `auth`, `db` with `experimentalAutoDetectLongPolling`, and Web-only `analyticsPromise`)
  - `frontend/src/config/env.ts` (switched `DATA_PROVIDER` to `'firestore'`)
  - `frontend/src/services/firestoreAdapter.ts` (new — `FirestoreBookRepository` with auto initial catalog seed + `FirestoreLendingRepository` with `onSnapshot` & atomic `runTransaction` lending workflows)
  - `frontend/src/services/authService.ts` (added `FirebaseAuthManager` syncing Firebase Auth UID with Firestore `users/{uid}` profiles)
  - `frontend/src/services/api.ts` & `frontend/src/services/lendingService.ts` (bound exports to `APP_CONFIG.DATA_PROVIDER`)
  - `.gitignore` (ignored `fbconfig.txt`)
  - `Agent Context/SystemDesign-Log.md`
- **Verification**: `npx tsc --noEmit` passed with 0 errors; `npx expo export --platform web --platform android` compiled both Web (424 modules) and Android Hermes bytecode (1155 modules) with 0 errors; rules audit across 28 files verified 0 emojis and 0 `StyleSheet.create`.

### [2026-11-26] Collections UI Overhaul: 2-Column Pastel Book Grid, Checkpoint Timeline, & Floating Island Detail Card
- **Domain**: frontend / UI, components, utils
- **Requirement**:
  - Stack Collections vertically into two sections: Current Collections (top) in a 2-column homescreen-style icon grid, and chronological Borrowing Timeline (bottom).
  - Rotate book icon colors across Pastel Red, Pastel Blue, and Pastel Green with the first letter printed on the cover, 25-char label truncation, and an overdue red day-count notification badge.
  - Render timeline checkpoints along a vertical line: yellow dot for unreturned borrows, turning into a green tick when returned, paired with a grey tick checkpoint for the return event.
  - Display a centered floating island modal with blurred/darkened 4-side backdrop containing small top-left book icon, 2-line bold title (no ellipsis), `Author • Category`, padded borderless description, inset divider, calendar + buying date + green/yellow/red timeline progress bar, and greyed-out Rupee fine receipt bill.
- **Files Touched / Created**:
  - `frontend/src/utils/dateUtils.ts` (new)
  - `frontend/src/components/CollectionBookCardModal.tsx` (new)
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Verification**: `npx tsc --noEmit` passed with 0 errors; rules audit across 30 files verified 0 emojis and 0 `StyleSheet.create`.

### [2026-11-26] QR Scanner Viewfinder, Bulk Checkout Bill Flow, & Pending Timer Icons
- **Domain**: frontend / QR UI, Collections UI
- **Requirement**:
  - Replace the misplaced QR viewfinder + laser sweep with a centered, translucent light-blue square (`rounded-lg`, zero inner text, zero animation).
  - Simplify scanned book bottom card: Shelf & Row top label (removing Copy ID and Book Verified badge), pastel book cover icon beside title/author/category, `"Borrow"` action button, and round two-arrow rescan button.
  - Add bulk-checkout center receipt bill (`Chennai Institute of Technology - Library`) with live yellow-dot / green-tick / red-X rows, compact `"Once admin approves your request you can take your books"` + `+` bottom bar to scan additional books, and a payment-app pastel green checkmark animation summarizing allowed/rejected counts before redirecting to Collections.
  - Render pending borrow books in the Collections 3-column grid as translucent grey book covers with a centered timer icon instead of the cover letter.
- **Files Touched / Created**:
  - `frontend/src/utils/dateUtils.ts`
  - `frontend/src/components/CollectionBookCardModal.tsx`
  - `frontend/src/components/BorrowBillOverlay.tsx` (new)
  - `frontend/src/screens/CollectionsScreen.tsx`
  - `frontend/src/screens/QRScannerScreen.native.tsx`
  - `frontend/src/screens/QRScannerScreen.web.tsx`
  - `Agent Context/SystemDesign-Log.md`
- **Verification**: `npx tsc --noEmit` passed with 0 errors; rules audit across 31 files verified 0 emojis and 0 `StyleSheet.create`.










