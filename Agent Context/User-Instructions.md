# User Instructions & Project Constraints

This document records the user-defined rules, coding standards, architecture requirements, communication protocols, and phased implementation pipeline.

---

## 1. Architecture Split

The project repository is split into two primary roots:
- `frontend/`: Mobile app built with **React Native**, **Expo**, and **Tailwind CSS (NativeWind)**.
- `backend/`: API and server services built with **Python FastAPI** (scrapping any previously suggested serverless/Functions-only backend).

---

## 2. Coding & Implementation Standards

1. **Strictly Functional**: Use functional components and React hooks exclusively. No switching between class-based and functional components.
2. **Strict Tailwind CSS**: All styling must be done using Tailwind CSS utility classes (via NativeWind). **No `StyleSheet.create()` blocks** under `.ts`/`.tsx` files.
3. **Frontend Folder Structure**:
   ```
   frontend/
     ├── src/
     │    ├── screens/       # Standalone screens
     │    ├── components/    # Reusable UI components
     │    ├── services/      # API calls & backend client services
     │    ├── config/        # Environment preferences, DB/Firebase initialization
     │    ├── types/         # TypeScript interfaces & types
     │    └── utils/         # Helper functions
     ├── assets/             # 3D models, mock data, static assets
     ├── app.json
     ├── package.json
     └── tailwind.config.js
   ```
4. **Configuration (`src/config`)**:
   - Centralizes environment variables, global app preferences, and initialization of external databases/services (Firebase, API endpoints).
5. **Phase 1 Data Storage**:
   - Store blueprints, categories, shelves, and book catalogs in **JSON files** for fast, friction-free edits before migrating to a persistent database.

---

## 3. Communication & Workflow Protocol

1. **Pre-Execution Notice**: Before touching or writing any code, state:
   - What action is going to be taken.
   - Exact files to be created/modified.
   - Target domain (`frontend` or `backend`).
2. **System Design Logging**: Every component and architectural decision must be logged in `Agent Context/SystemDesign-Log.md` (covering user requirement, technical solution, files touched, and verification).
3. **CLI Brevity**: Keep conversations concise and focused strictly on the prompt. Avoid fluff.
4. **Proactive Advisory**: If a critical technical consideration or omission is identified that the user did not explicitly ask for, append a short note at the very end of the response with a concise recommendation.

---

## 4. Phase Pipeline (Phase 1 to Phase 3)

### Phase 1: Core 3D Centerpiece, Mock JSON Data, & Direct Role Access
- **3D Isometric Centerpiece**: Minimalist, blocky, Three.js layout loaded inside a WebView from blueprint-derived specifications.
- **Top-Down & Eye-Level View**:
  - Interactive top-down/isometric map.
  - Tapping a category or shelf triggers an eye-level elevation/bookshelf modal popup showing books on that shelf.
- **Shelf Model Constraints**:
  - Fixed coordinates `(x, z)` for each shelf in the 3D space.
  - Configurable `maxBooksPerShelf` and `maxShelves`.
- **Initial Categories**: Electronics, Computer Science, Physics, Mechanical Engineering, Civil Engineering.
- **No Auth Gateway**: Bypass login screens with two direct launch buttons: `[Student Mode]` and `[Admin Mode]`.
- **Admin Workflow (Phase 1)**:
  - Book catalog intake.
  - Full CRUD operations on books (stored locally in JSON).
  - Unique QR code generation with standard reference payload (`LIB1:{copyId}`).
- **Student Workflow (Phase 1)**:
  - Browse 3D isometric layout.
  - Tap shelves to open the eye-level shelf-front view with real-time JSON catalog data.

### Phase 2: Python FastAPI Backend, Live QR Scanner, & Desk Workflows
- **FastAPI Backend**: Replace local mock JSON with FastAPI REST endpoints (running Python backend with Pydantic schemas).
- **Scanner Integration**: Live camera QR scanning on the Admin side (`expo-camera` / barcode scanning).
- **Desk Operations**: Issue, Return, and Reshelve workflows with live status changes (`on_shelf`, `borrowed`, `in_returns_cart`).
- **Navigation Path**: A* pathfinding showing entrance-to-shelf path on the 3D floor map.
- **Instant Search**: Fast search over titles, categories, and authors.

### Phase 3: Firebase Auth, Cloud Persistence, & Operational Governance
- **Authentication**: Replace bypass buttons with Firebase Google Auth restricted to college domain custom claims (`student`, `staff`, `admin`).
- **Cloud Database**: Migrate JSON/local records to production database (Cloud Firestore / PostgreSQL).
- **Audit & History**: Append-only retired log, shelf audit verification flow, and automated reminder alerts.
