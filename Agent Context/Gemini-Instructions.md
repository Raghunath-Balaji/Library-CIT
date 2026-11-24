# Library Navigator App: Agent Implementation Brief

Build a mobile app (React Native, Expo, Tailwind CSS) for a college library. Students search for a book and see where it is on a blocky, isometric 3D map of the library. Library staff run the catalog, borrowing and returns by scanning a QR code on each book. This brief is the single source of truth for business rules, implementation approach, platform limits and edge cases.

---

## 0. How to use this brief

**Status tags.** Every rule carries one of these:

| Tag | Meaning | What the agent does |
|---|---|---|
| **[DECIDED]** | The product owner stated it explicitly. | Implement exactly. Do not change it. |
| **[RECOMMENDED]** | Proposed during design review and not contradicted. | Implement as the default, behind a setting or a single code path so it is cheap to change. |
| **[OPEN]** | Needs the product owner's answer (section 13). | Do not guess. Build the code so either answer is a config change, use the stated default, and list it in your final report. |

**Working rules for the agent**

1. All business rules live in server code (Python FastAPI backend), never only in the app. The app is a client that can be modified by anyone.
2. Every state change is one transaction. No multi-step writes that can leave a half-finished state.
3. Nothing is hard-deleted. Copies, titles and members are retired, archived or deactivated, and every change is written to the audit log.
4. A scan only reads. A scan never changes a record. A signed-in staff member confirms every action.
5. When a rule here conflicts with what seems convenient, the rule wins. When the brief is silent, choose the simpler option, note the choice in a `DECISIONS.md`, and continue.
6. Verify platform limits against current Firebase, Expo, and React Native documentation before depending on them. Section 3.3 lists the ones already checked.

---

## 1. Product summary

- **One mobile app, two role-based UIs.** After sign-in, the UI is chosen from a server-assigned role. **[DECIDED]**
- **Student side:** browse an isometric 3D map, tap a section to see its books, search by title, author, category or a free-text description, see a path line from the entrance to the book's shelf, see their own borrowed books and due dates. **[DECIDED]**
- **Admin side:** add books and copies, print QR labels, issue and return books by scanning, see who has which copy and when it is due, retire lost or damaged copies, manage members, shelves and categories. **[DECIDED]**
- **Look:** blocky and light. Walls, cabinets and shelves are boxes. Fixed diagonal camera like a mobile base-building game, slightly 3D, not a top-down plan. **[DECIDED]**

**Out of scope for now:** indoor positioning (GPS does not work indoors), public (non-college) users, multiple libraries, online payment of fines.

---

## 2. Decisions register

| # | Decision | Status |
|---|---|---|
| D1 | One app. Student UI or admin UI depends on the signed-in account. | DECIDED |
| D2 | Sign-in with Firebase Auth, Google account, college email address. | DECIDED |
| D3 | The role is decided on the server (custom claim) and checked by security rules, not decided by the app from the email string. | RECOMMENDED |
| D4 | The college email is the unique member key. A member has a name and a college email. | DECIDED |
| D5 | Roll number, department and year are optional member fields. | RECOMMENDED |
| D6 | 3D map: fixed-angle isometric view, bird's-eye feel, tap a section to open its books. | DECIDED |
| D7 | Section view is a flat shelf-front elevation ("pseudo 3D"), not 3D books. | RECOMMENDED |
| D8 | Searching a book draws a path line from the entrance to the book's location. | DECIDED |
| D9 | Free-text description search returns related books; category and keyword search also work. | DECIDED |
| D10 | A title has numbered copies 1..N. A copy number is never reused. A replacement for a thrown-away copy 6 gets the next number (11). | DECIDED |
| D11 | Retired copies are recorded in a separate retired-books log. The QR does not carry a retired reason. | DECIDED |
| D12 | QR payload: the owner first specified title, category, author, optional description and copy id. This brief recommends an ID-only payload (section 4.4). | OPEN |
| D13 | The system suggests a shelf and row from the book's category. Where the librarian keeps a book somewhere else, the librarian must state the exact shelf and row. | DECIDED |
| D14 | The development team labels existing books in bulk. The librarian enters new books. | DECIDED |
| D15 | Borrowing: the student picks the book, staff scan the QR at the desk, create a borrow ticket with a return date, and the ticket is emailed to the student. | DECIDED |
| D16 | Returning: the student gives the book to staff. Staff scan the QR and approve. A student never returns a book on their own. | DECIDED |
| D17 | Staff can see availability, number of copies, who has each copy and when it is due. | DECIDED |
| D18 | A reminder email goes to the student one day before the due date. Overdue books are reported to staff. | DECIDED |
| D19 | Backend: Python FastAPI (with JSON mock storage in Phase 1, migrating to DB/Firebase in Phase 2/3). | DECIDED |
| D20 | Map renderer: Three.js in a WebView with an orthographic camera, with a 2D fallback. | RECOMMENDED |
| D21 | Loan period, borrow limit, fines, reference-only books, renewals, reservations. | OPEN |
| D22 | Roles: `student`, `staff` (desk work, add books) and `admin` (settings, members, roles, layout). | RECOMMENDED |

---

## 3. Architecture

### 3.1 Components

```
Mobile app (React Native, Expo, Tailwind CSS / NativeWind)
 |- React Native UI (Tailwind CSS / NativeWind): student screens, admin screens
 |- react-native-webview + Three.js bundle: isometric map, section view, path line
 |- QR scanning (admin): expo-camera (or ML Kit / VisionCamera)
 |- Local catalog index (offline & instant search): expo-sqlite with FTS5
 |- Firebase SDKs: Auth, Firestore (offline cache on), Messaging, App Check
        |
        v
Firebase / Backend
 |- Authentication (Google provider, Phase 3)
 |- Backend API: Python FastAPI (endpoints for state changes, placement suggestions, CRUD)
 |- Cloud Messaging: push notifications
 |- Secret Manager: API keys
        |
        v
External: transactional email provider; embedding model API (similarity search)
```

**Principle:** clients interact with the backend API under security validation and role checks. Direct client tampering is prevented on the server.

### 3.2 Technology choices

| Concern | Choice | Why |
|---|---|---|
| UI | React Native, Expo, Tailwind CSS (NativeWind) | Modern cross-platform stack with rapid styling |
| 3D map | Three.js bundled with esbuild or Vite into one script, loaded in `react-native-webview` via local asset/HTML | Camera control and 3D tap picking out of the box. A single bundle avoids asset loading and ES-module issues in mobile WebViews. |
| QR scanning | `expo-camera` (`CameraView` barcode scanner) or `@react-native-ml-kit/barcode-scanning` | On-device, fast, no network |
| Local search | `expo-sqlite` with FTS5 | Fast offline and local instant search |
| Backend | Python FastAPI | High-performance asynchronous REST API with Pydantic validation |
| Email | Transactional email API (SendGrid, Brevo, SES or similar) called from backend | Delivery logs, retries, sender authentication |
| Similarity search | Embeddings queried server-side | See feature F4 |

### 3.3 Platform limits already checked (verify again before launch)

- **Blocking auth functions** (`beforeUserCreated`, `beforeUserSignedIn`) require upgrading the project to *Firebase Authentication with Identity Platform*. They can reject a sign-up when the email domain is wrong and can set custom claims. If the college does not want the upgrade, use the fallback in F1.
- **Scheduled functions** use Cloud Scheduler (the API must be enabled) and are billed. Confirm the billing plan needed for Cloud Functions and Cloud Scheduler in the current Firebase pricing page before committing, because a free-tier-only plan may not allow them.
- **Firestore vector search** needs a vector index, supports embeddings up to 2048 dimensions, and should be run from a Cloud Function (server-side). Do not assume the mobile client can run nearest-neighbour queries.
- **Firestore has no substring or full-text search.** Search is done against a local index on the device, or an external search service.
- **Firestore writes:** one batch holds at most 500 operations, so bulk imports are chunked.
- **Custom claims** reach a client only when its ID token refreshes (up to an hour). The app forces a token refresh after sign-in and when a role changes.
- **`WebView` JS bridge:** communicate between React Native and the WebView using `window.ReactNativeWebView.postMessage(JSON.stringify(data))` and React Native's `onMessage` handler. State updates in React Native trigger normal re-renders.
- **GPS does not work indoors.** The navigation start point is the entrance by default, chosen manually, or set by scanning an aisle QR.

---

## 4. Data model

Firestore collections. Timestamps are UTC server timestamps. Day boundaries are computed in `Asia/Kolkata`.

### 4.1 Collections

**`titles/{titleId}`** (`titleId` such as `T0042`, from a transactional sequence)
`title`, `titleNorm` (lowercase, punctuation and diacritics stripped), `author`, `authorNorm`, `category`, `subcategory?`, `tags[]`, `description`, `isbn?`, `edition?`, `nextCopyNo` (int, starts at 1), `totalEver`, `activeCount`, `availableCount`, `nextDueAt?`, `embedding?` (vector, phase 2), `archived` (bool), `updatedAt`, `createdBy`.

**`copies/{copyId}`** (`copyId` = `{titleId}-{copyNo}`, such as `T0042-6`)
`titleId`, `copyNo`, `status` (4.2), `shelfId?`, `row?`, `specialLocation?`, `currentLoanId?`, `replacesCopyNo?`, `lendable` (false for reference-only), `lastVerifiedAt?`, `createdAt`.

**`retiredLog/{id}`** (append-only)
`type` (`retired` | `reinstated`), `titleId`, `copyNo`, `titleName`, `reason` (`lost` | `damaged` | `withdrawn` | `stolen` | `other`), `note?`, `at`, `by`, `replacedByCopyNo?`, `snapshot` (copy fields at retirement, so it can be restored).

**`members/{uid}`**
`email` (lowercase, unique), `name`, `department?`, `year?`, `rollNo?`, `role` (mirror of the claim), `status` (`active` | `graduated` | `suspended`), `emailBounced?`, `fcmTokens[]`, `createdAt`.

**`loans/{loanId}`**
`copyId`, `titleId`, `titleName`, `memberId`, `memberEmail`, `issuedAt`, `dueAt`, `returnedAt?` (the physical return time), `recordedAt?` (when staff scanned it), `status` (`active` | `returned` | `lost`), `issuedBy`, `returnedTo?`, `conditionOnReturn?` (`ok` | `damaged`), `renewals`, `reminderSentAt?`, `overdueNotifiedAt?`, `idempotencyKey`.
"Overdue" is a computed state (`status == active && dueAt < now`), not a stored status.

**`shelves/{shelfId}`**
`label`, `mapBoxId` (the id of the box in the layout), `facing` (`north` | `south` | `east` | `west`), `rows[]` (`{n, capacity, filled}`), `active`, `lastAuditedAt?`. Shelf ids are stable and never change when the layout is edited.

**`categoryMap/{category}`**
`shelfIds[]` (ordered by preference), `note?`.

**`specialLocations/{id}`**
`label`, `mapBoxId` (reference desk, staff room, display stand, new arrivals).

**`config/layout`**
The layout JSON (4.5) and its `version`. A copy is also bundled in the app assets.

**`config/rules`**
`loanDays`, `borrowLimit`, `reminderLeadWorkingDays` (1), `weeklyOffDays` (for example `[0]`), `holidays[]` (ISO dates), `reminderHourIST`, `overdueDigestHourIST`, `staffDigestEmails[]`, `blockBorrowIfOverdue`, `finePerDay?`, `notifyStudentOnOverdue`, `afterHoursDropEnabled`. Values come from the product owner (D21). Ship these defaults and mark them as unconfirmed in the admin Settings screen: `loanDays: 14`, `borrowLimit: 3`, `blockBorrowIfOverdue: true`, `finePerDay: 0` (no fines until decided).

**`notifications/{id}`**: `memberId`, `type`, `loanId?`, `createdAt`, `readAt?`.
**`mailLog/{id}`**: `to`, `template`, `loanId?`, `status` (`queued` | `sent` | `failed` | `bounced`), `attempts`, `lastError?`, `sentAt?`.
**`auditLog/{id}`** (append-only): `actorUid`, `action`, `target`, `before`, `after`, `reason?`, `at`.
**`stats/{yyyy-mm}`**: monthly aggregates written by a scheduled function (phase 3).

### 4.2 Copy status and allowed transitions

```
on_shelf ──issue──▶ borrowed ──return──▶ in_returns_cart ──reshelve──▶ on_shelf
   ▲                    │                      │
   │                    ├──mark lost──▶ retire(lost)
   └──reinstate─────────┴──────────────────────┴──damaged/withdrawn──▶ retire(reason)
```

| From | To | Triggered by |
|---|---|---|
| (new) | `on_shelf` | Add copies (confirmed by scanning at the shelf) |
| `on_shelf` | `borrowed` | Issue |
| `borrowed` | `in_returns_cart` | Return (condition OK) |
| `in_returns_cart` | `on_shelf` | Reshelve scan |
| `borrowed` or `in_returns_cart` or `on_shelf` | retired (moves to `retiredLog`) | Retire, or mark lost |
| retired | `on_shelf` | Reinstate (writes a `reinstated` log row) |
| `reserved`, `returned_unverified` | | Only if reservations or the after-hours drop box are adopted (D21, section 13) |

Any other transition is rejected by the server with a clear error.

### 4.3 Counters and denormalized counts

- `titles.nextCopyNo` is a counter. The next copy number is read and incremented inside one transaction. Never compute it as "highest existing number plus one", because retiring the highest copy would let the number come back.
- `titles.activeCount` and `titles.availableCount` are updated inside the same transaction as every status change. The student app reads these instead of counting copies.
- `titles.totalEver` equals `nextCopyNo - 1`. Active copies are `totalEver` minus the number of retired log rows. The staff screen shows all three, plus how many are available now.
- `titles.nextDueAt` (the earliest due date among active loans) is refreshed by a trigger after a loan changes, so a student can see "back on 24 Nov" without seeing who has it.
- A nightly function recomputes the counts from the source records and writes any mismatch to the audit log, so drift is found early.

### 4.4 QR code format

Recommended payload (**D12, OPEN**): a versioned, ID-only string.

```
LIB1:T0042-6
```

- The prefix lets the scanner ignore any other QR with "Not a library code".
- Everything else (title, author, category, status, borrower) is looked up on the server by `copyId`. Printed codes cannot be edited. A title typo fix, a category change or a shelf move must not make a sticker wrong.
- Short payloads give a sparse QR that scans from a worn label.
- The server, not the printed text, is the truth. A forged QR with fake data changes nothing.

**If the product owner insists on the rich payload** (title, category, author, optional description, copy id), implement it as `LIB1:{copyId}|{title}` at most, treat everything except `copyId` as a display hint, never act on it, and keep the total under about 100 characters. A long description inside the QR makes it dense and hard to scan and cannot be corrected after printing.

**Printed label** (identical for batch and new books):
- QR at least 20 mm square, quiet zone of 4 modules, error correction level M.
- Printed next to it in plain text: the title (shortened if needed) and `Copy 6`. Do not print "of N" because N changes.
- Laminated or polyester label stock, placed in the same position on every book.

### 4.5 Layout JSON

Authored once from the blueprint with the tracer tool (F2), stored in `config/layout` and bundled in the app.

```json
{
  "version": 3,
  "floor": { "id": "F1", "w": 20, "d": 12 },
  "entrance": { "x": 10, "z": 11.5 },
  "items": [
    { "id": "W-N-1", "type": "wall",  "x": 10, "z": 0,   "w": 20, "d": 0.3, "h": 3, "rot": 0,
      "title": "North wall", "topics": ["Fiction A-L", "Poetry"] },
    { "id": "SH-A1", "type": "shelf", "x": 4,  "z": 3,   "w": 4,  "d": 0.6, "h": 2, "rot": 0,
      "shelfId": "A1", "facing": "south", "title": "Aisle A, left", "topics": ["Physics"] },
    { "id": "SP-REF", "type": "special", "x": 15, "z": 8, "w": 2, "d": 1, "h": 1,
      "title": "Reference desk" }
  ]
}
```

- Units are meters. `x` and `z` are box centres. `rot` is degrees about the vertical axis for diagonal walls.
- A wall that has several cabinets along it is split into one box per cabinet, because each box is one tappable segment.
- `shelfId` links a box to the `shelves` collection. The `topics` shown when a box is tapped come from the category map, with `topics` here as a fallback.
- Doors and windows are gaps in the walls, not objects.
- Bump `version` on every change. The app downloads a newer layout when `config/layout.version` is higher than the bundled one.

---

## 5. Features, part A: access, map, search

Each feature lists the business rule, how to build it, platform limits and their workarounds, edge cases, and acceptance checks.

### F1. Sign-in and roles

**Rule.** One login screen. Only college-email Google accounts can sign in. The role (`student`, `staff`, `admin`) decides which UI opens. **[DECIDED D1, D2; RECOMMENDED D3, D22]**

**Implementation**
1. Sign in with Google (via `@react-native-google-signin/google-signin` or `expo-auth-session`) and exchange the Google ID token with Firebase Auth.
2. Restrict sign-up to the college domain (`COLLEGE_DOMAIN` is a config value). Do this in three layers:
   - `beforeUserCreated` blocking function rejects any email outside the domain or with `email_verified != true`. (Needs the Identity Platform upgrade, section 3.3.)
   - Fallback if the upgrade is declined: an `onCreate`/first-login callable function that checks the domain, disables the account and signs the user out if it does not match.
   - Firestore rules also require `request.auth.token.email_verified == true` and an email ending with the college domain. The Google `hd` parameter is only a client hint and is never trusted.
3. Role assignment: admins are listed in a `roles` allowlist managed by an admin. The server sets a custom claim `role`. After sign-in the app force-refreshes its ID token, reads the claim and opens the matching UI.
4. A student must exist in `members` with `status == active` (imported by an admin, F13). A signed-in account that is not in `members` sees the "Access blocked" screen with a message to contact the library. **[OPEN: import-only, or self sign-up with staff approval, section 13]**
5. Role changes and deactivation: revoke refresh tokens, and have callable functions check the claim and member status on every call, so a removed admin loses power immediately even though the old token may live up to an hour.

**Limits and workarounds**
- A claim is not seen until the token refreshes: force a refresh at login and when a "role changed" notification arrives.
- Hiding admin screens is only convenience. The real protection is security rules plus function checks.

**Edge cases**
- Student graduates: status becomes `graduated`, sign-in is blocked, history is kept (F13).
- College reissues an address: rare, handled by a manual edit of the member record.
- Two accounts for one person: the unique email stops duplicates. Staff can merge by changing the email on the member record.
- Offline at launch: a valid cached session opens the cached map and catalog. Issue and return need a connection.

**Acceptance.** A non-college account cannot get past login. A student cannot open an admin screen or read another student's loans, tested by calling Firestore directly. An admin demoted mid-session cannot complete a callable function.

---

### F2. Library layout and the isometric map

**Rule.** The map is a light, blocky 3D model drawn from a list of boxes traced from the library blueprint. The first view is a diagonal bird's-eye view that can be panned and zoomed. Tapping a segment selects it. **[DECIDED D6; RECOMMENDED D20]**

**2a. Creating the layout (one-time, development team)**
1. Build a single-file **tracer tool** (an HTML page used on a PC, not shipped to students): load the blueprint image, set the scale by clicking two points and typing the real distance, draw rectangles over every wall and cabinet, set `id`, `type`, `title`, `topics`, `rot`, `shelfId`, `facing`, then export `layout.json`.
2. Pixel to metre conversion: `scale = realLength / pixelLength`, and for a rectangle at pixel (px, py) of size (pw, ph): `x = (px + pw/2) * scale`, `z = (py + ph/2) * scale`, `w = pw * scale`, `d = ph * scale`.
3. Heights are measured on site (wall about 3 m, shelf about 2 m). Exaggeration is not needed, and shelves may be drawn lower for readability.
4. Add a **layout validator** to the tool: ids unique, no overlapping boxes, every shelf has at least one walkable access cell reachable from the entrance (a breadth-first search over the walkable grid). Fail the export if not.
5. Multiple floors: one layout per floor (`floor.id`) and a floor selector. **[OPEN: number of floors, section 13]**

**2b. Rendering**
- Three.js bundled locally (pin an exact version). Page loaded in `react-native-webview` using bundled local assets/HTML or an inline HTML string. No remote scripts at runtime.
- **Camera:** `OrthographicCamera`, positioned diagonally (equal X and Z offset, for example `(cx+20, 22, cz+20)`) and looking at the floor centre. Equal X and Z gives the diamond look, and the height sets the tilt (test several values on a real phone). Rotation disabled. Optional 90 degree snap buttons.
- **Controls:** pan with one finger, pinch to zoom (`camera.zoom` between about 0.6 and 3), damping on, `screenSpacePanning`, pan clamped so the building cannot leave the screen, resize recomputes the frustum from the new aspect ratio.
- **Look:** flat colours with `MeshLambertMaterial`, no textures, no shadows. One ambient plus one directional light. A lighter top face and darker sides come from the lighting. Zone colours per category (for example Physics blue, Electronics orange) make the map readable at a glance.
- **Selection:** tap a box and it pops up slightly and takes a highlight colour while others dim. Tap detection uses a raycaster and ignores gestures that moved more than about 8 px so panning never selects.
- **Hidden objects:** tall boxes hide what is behind them in an isometric view. Keep heights modest, fade or hide the two walls nearest the camera (dollhouse style), and show a label for each shelf (HTML overlay or text sprites).
- **Thin targets:** walls are hard to tap. Raycast against invisible proxy boxes with a minimum thickness of about 0.6 m for picking only.
- **Render on demand:** redraw only when the camera moves, a selection changes or an animation runs. Cap pixel ratio at 2.

**2c. Bridge between app and map**

| Direction | Call | Purpose |
|---|---|---|
| App to map | `setLayout(json)`, `highlight(ids)`, `showPath(points)`, `focus(id)`, `resetView()`, `setZoneColors(map)` | Drive the scene |
| Map to app | `onReady()`, `onSegmentTapped(id)`, `onError(msg)` | Events |

- Pass data as JSON built with a proper serializer (never string-concatenate book titles into script).
- WebView bridge calls: the page sends messages via `window.ReactNativeWebView.postMessage(JSON.stringify(event))` and the React Native app responds via `onMessage`, updating component state.
- Safety settings: JavaScript on, allowFileAccess/origin restrictions as needed, no navigation to external URLs.

**Limits and workarounds**
- Old or outdated WebView environments can lack WebGL or modern JavaScript: detect failure (`onError` or a WebGL context test) and fall back to a **2D map** drawn with React Native Canvas / SVG (`react-native-svg`) from the same layout JSON. Show a prompt to update system WebView if WebGL is unsupported.
- Low-end phones: merge all non-interactive static boxes into one mesh, use instancing for repeated shelves, target 30 fps and a draw-call count in the tens. Test on the oldest phone the students use.
- Memory: dispose geometries and materials when the screen leaves.

**Edge cases**
- Layout changes after books are placed (F14): shelf ids are stable. A removed box makes its shelf `active: false` and creates a "needs relocation" worklist, so books never point at nothing.
- A tap that hits several overlapping boxes picks the nearest.
- Rotation or backgrounding the app: restore camera and selection.

**Acceptance.** The map opens from cache with no network in under 2 seconds, pans and zooms smoothly on the lowest test device, and tapping any shelf selects it every time. If WebGL is disabled, the 2D fallback appears and everything else still works.

---

### F3. Section view (tap a segment to see its books)

**Rule.** Tapping a section zooms toward it and shows everything stored there. **[DECIDED]** The books are shown as a flat shelf-front picture, not 3D books. **[RECOMMENDED D7]**

**Implementation**
- On tap, ease the camera toward the segment and dim the rest. A bottom sheet (React Native bottom sheet, e.g. `@gorhom/bottom-sheet` or Tailwind-styled modal sheet) slides up with:
  - the segment title and the topics it holds (from `categoryMap` and the layout);
  - the shelf as horizontal bands, one per row, and each book as a coloured block. Order matches the real shelf order (call number if used, otherwise author then title). Block width comes from an optional `thickness` field with a default.
  - tap a block to open Book detail (S5). The searched book is highlighted.
- Query copies with `shelfId == X`, grouped by row, paged (limit about 50 per row, load more on scroll). Never load a whole shelf blindly.
- Wall segments with no shelf show only their topic list.
- Borrowed copies are shown dimmed so a student sees what is actually there.

**Limits and workarounds**
- A hundred-plus books in a row become unreadable on a phone: use a horizontal list with paging inside each row.
- The picture is schematic. Say so in a small caption. Do not imply that the blocks match the physical books one to one.

**Edge cases**: empty shelf; a shelf holding several topics or a topic split across shelves (show topics per shelf and per row); copies in a special location (shown on the special-location box); a title with copies on different shelves.

**Acceptance.** Tapping a shelf opens its sheet in under a second from cache. A shelf with 400 books scrolls without lag.

---

### F4. Search

**Rule.** A search bar for title, author, category and free text. If the student does not know the name, a description returns related books and the map points at them. **[DECIDED D9]**

**4a. Keyword and filter search (phase 1)**
- Firestore cannot do substring or fuzzy search. Sync the `titles` collection to a **local SQLite FTS5 index** via `expo-sqlite` on the device (delta sync by `updatedAt`, a cursor stored locally; titles are archived, never deleted, so no tombstones are needed). Search runs locally: instant, free and works offline.
- Normalize both sides: lowercase, strip punctuation and diacritics, collapse spaces, and compare authors without dots and spaces so "S.L. Arora", "SL Arora" and "S L Arora" match. Add typo tolerance (trigram or small edit-distance fallback).
- Filters: category, author, availability (`availableCount > 0`). These are plain queries and still work when similarity search does not.
- Availability is live: when a result is opened, read the title document and show "updated hh:mm".
- Results show title, author, category, "N of M available", the nearest available copy's location, and if none is available, "back on <nextDueAt>".

**4b. Similarity search (phase 2, in scope)**
- When a title is created or edited, a Cloud Function builds an embedding from `title + author + category + description` and stores it (at most 2048 dimensions) with a Firestore vector index.
- A callable `searchSimilar(queryText, category?)` embeds the query, runs the nearest-neighbour query server-side (top 20), drops archived titles, applies a similarity threshold, and returns ranked results.
- The app shows **Matches** (keyword hits) first and **Related books** below. Mixing them loses the book the student typed. Only a limited set (top 5 to 10) is highlighted on the map, and only when the student taps "Show on map".
- Cost and safety: minimum query length, per-user rate limit, short cache of recent query embeddings, API key only in Secret Manager.
- Descriptions drive quality. Require a short description when a title is created (F6) and prefill it from the ISBN where a public lookup returns one. Titles without a description fall back to title, author and category and are marked low quality.
- If the call fails or the phone is offline, fall back to keyword search with a clear message.

**Edge cases**: zero results (suggest categories and the nearest category zone); misspellings; two editions (separate titles, shown together by author); a title with all copies out; a title whose only copy is retired (hidden from search); very short or very long queries; non-English titles (normalize but do not strip non-Latin letters).

**Acceptance.** A keyword search over 20,000 titles returns in under 300 ms with no network. "A book about circuits for beginners" returns electronics titles, with exact matches above related ones and availability on every row.

---

### F5. Navigation path (entrance to book)

**Rule.** Searching a book shows a line from the entrance to the book's location. **[DECIDED D8]**

**Implementation**
- Build a walkable grid from the layout once per layout version (cell about 0.5 m). Cells under walls and shelves are blocked. Door gaps are walkable. Inflate blocked cells slightly so paths keep clear of furniture.
- Target: the walkable cell on the shelf's `facing` side, at the position for the book's row.
- Run A\* (8-way) on the grid, then smooth the path (remove needless turns). Cache by (start, target).
- Draw the path as a flat ribbon just above the floor (`y = 0.05`) with an animated dot. In an orthographic view it keeps a constant width.
- **Start point:** default entrance; tap the map to set "I am here"; later (phase 2) scan an aisle QR (`LIB1:LOC:<nodeId>`).
- **Text directions** are always shown as well ("Aisle B, second shelf on the left, row 3"), generated from the turns on the path and the shelf's facing side, for accessibility and for when the map is slow.
- Several copies: show the nearest available copy first (shortest path), list the others.
- Multiple floors: stairs and lifts are nodes joining two grids and the instructions say which floor to go to first. **[OPEN: floors]**

**Edge cases**: target unreachable (fall back to highlighting the shelf and text directions, and report a layout error to admins); the start cell inside a blocked cell (snap to the nearest walkable cell); book in a special location (path to its box); borrowed book (offer the path only if the student asks, with a clear "currently out" notice).

**Acceptance.** For every shelf in the real layout a path exists from the entrance. Walk five random paths on site and confirm they are physically walkable.

---

### F6. Adding books and suggesting where they go

**Rule.** The librarian enters a new book. The system suggests a section and row from the category and generates a unique QR for each copy. If the librarian keeps the book elsewhere, the librarian must state the exact shelf and row. **[DECIDED D13, D14]**

**Implementation**
1. Form: title, author, category (a dropdown from the admin-managed list, never free text), description (required), ISBN (optional, validated by checksum for ISBN-10 and ISBN-13), edition, number of copies, location.
2. **Duplicate check first.** As the librarian types, search existing titles by normalized title plus author and by ISBN. When there is a match, the default action is "Add a copy to this title". Near-duplicates ("SL Aurora" vs "S.L. Arora") show a warning. A new edition is a new title or has an `edition` field.
3. `suggestLocation` (callable), in this order:
   1. If the title already has copies on a shelf with free room, suggest that shelf and row.
   2. Otherwise the first shelf mapped to the category (`categoryMap`) with free capacity.
   3. Otherwise no suggestion: show "No space left for <category>, choose a location" and let the librarian pick.
4. The librarian accepts the suggestion or overrides it. An override must have a shelf and row, or a special location from the fixed list (reference desk, staff room, display stand, new arrivals). **Free-text locations are not allowed** because the map cannot point at them. Overrides are written to the audit log.
5. `addCopies(titleId, n, location, idempotencyKey)` runs in one transaction: read `nextCopyNo`, create `n` copy documents numbered sequentially, increase `nextCopyNo`, `totalEver`, `activeCount`, `availableCount`, update the row's `filled`, write the audit entry. The client sends a UUID as the idempotency key so a retry never creates duplicates.
6. After saving, open Print labels (A11). The location is confirmed physically later by scanning the copy at its shelf (reshelve scan in F10, shelf audit in F15), so the stored location is a promise that gets verified.
7. Adding a replacement for a retired copy: ask "Is this replacing a retired copy?" and store `replacesCopyNo` for the history link.

**Limits and workarounds**
- Category too coarse (hundreds of books in "Physics"): support a `subcategory` mapping and keep books in order inside the category (author or title).
- A book that fits two categories: one primary category for placement, extra `tags[]` for search. A copy can only be in one place.
- Capacity is an estimate per row and is editable by admins. Warn at 90 percent.
- A category not in the mapping: show "No shelf assigned" and offer to create the mapping so the next book is covered.

**Edge cases**: two librarians adding copies of the same title at once (the transaction serializes them); double tap on Save (idempotency key); different copies of one title in different places (location is per copy, and a new copy prefers where most copies already are); category renamed later (batch update, never a free rename); editing a title never moves its copies automatically, it only suggests a relocation list.

**Acceptance.** Adding 3 copies gives numbers 1 to 3 and three labels. Retiring copy 2 then adding one gives copy 4, never 2. Two simultaneous adds never produce the same number.

---

## 6. Features, part B: the library desk

### F7. Existing collection: import and labelling (development team)

**Rule.** The development team labels the books the library already owns. The librarian only enters new books afterwards. **[DECIDED D14]**

**Implementation**
1. Get the existing catalog into one spreadsheet. Columns: `title, author, category, isbn, description, copies, shelf, row, borrowed_now, borrower_email, due_date`.
2. **Clean before importing.** Normalize titles and authors and produce a **duplicate report** (fuzzy matches such as "SL Aurora" and "S.L. Arora"). A human resolves it, because two spellings become two titles with two copy counters.
3. **Dry run** prints what would be created: titles, copies, locations, warnings. Nothing is written.
4. Import with an Admin SDK script that calls the **same shared code the callable functions use** (`createTitle`, `addCopies`, the same transaction). Never insert rows directly, or the import and the librarian can collide on `nextCopyNo`.
5. Idempotent: each run has a batch id and each row a hash, so re-running does not duplicate anything. Chunk writes (500 operations per batch maximum).
6. Generate the label PDF **in shelf order**, so labelling is done by walking along the shelf instead of searching for each book.
7. Physical labelling shelf by shelf, then a **verify pass**: scan every labelled book once. The app compares the scan with the database and flags mismatches. Mark each shelf "verified" and store `lastVerifiedAt`.
8. Keep the library open during the work.

**Edge cases**
- Books that are on loan during the migration: import them with status `borrowed` plus an active loan (with the borrower and due date from the old records), add them to a "needs label" list, and print the label when they come back at the desk.
- Duplicate scans while verifying: ignored with a short debounce.
- A book found with no entry in the catalog: add it through the normal Add flow.
- Label stock: laminated or polyester, same position on every book. Test a sample shelf first to decide the position (front cover corner versus spine) so that audit scanning is fast.

**Acceptance.** The dry run matches the spreadsheet counts. After import and verification, every shelf's scanned count equals the database count, and re-running the import changes nothing.

---

### F8. The scan screen (resolve a QR)

**Rule.** A scan only looks things up. It never changes data. **[Working rule 4]**

**Implementation**
- QR scanning via Expo Camera (`expo-camera` / `CameraView` with barcode scanning) or an ML Kit plugin, QR only, continuous mode with a debounce of about 1.5 seconds per code. Torch toggle. Camera permission screen with an explanation.
- Parse the payload: anything not starting with `LIB1:` shows "Not a library code".
- Call `resolveCopy(copyId)` (callable, staff only). The response decides the next screen:

| Result | Next screen |
|---|---|
| `on_shelf` | Issue (A3) |
| `borrowed` | Return (A4) |
| `in_returns_cart` | Reshelve confirmation (A5) |
| found only in `retiredLog` | Retired-copy warning, with Reinstate (F12) |
| not found | Scan error |

- Manual fallback: type or search the copy id (`T0042-6`) or the title when a label is scratched.
- Issue, return and reshelve need a connection. Do not queue loans offline, because two phones could issue the same copy. Show a clear "no connection" message.

**Edge cases**: unreadable or damaged QR; a QR from another system; the same book scanned twice quickly; low light; a scratched label (manual fallback, then reprint with the same id).

---

### F9. Issuing a book (borrow)

**Rule.** The student chooses the book, then staff scan the QR at the library, identify the student, and create a borrow ticket with the return date. The ticket is emailed to the student's college address. Staff can see availability, copy counts, who borrowed each copy and when it is due. **[DECIDED D15, D17]**

**Implementation**
1. Scan the copy (`on_shelf`). The Issue screen shows the title, copy number and location.
2. Find the student: type-ahead on college email or name from `members`. Show name, email, department, status, current loans and the borrow limit. The email is the unique key, but always show it next to the name because two students can share a name.
3. The server checks (all inside `issueLoan`): member `status == active`; loans below `borrowLimit`; no overdue loan if `blockBorrowIfOverdue`; the copy is `lendable`; the copy is still `on_shelf` with no `currentLoanId`. **[OPEN: actual values, D21]**
4. Due date: default `today + loanDays`, moved to the next working day if it falls on a weekly off day or a holiday. Staff may change it within limits, with a reason that is written to the audit log. Due dates are end-of-day `Asia/Kolkata`.
5. `issueLoan(copyId, memberId, dueAt, idempotencyKey)` runs one transaction: re-read the copy, create the loan, set the copy to `borrowed` with `currentLoanId`, decrement `availableCount`, write the audit entry.
6. A trigger on loan creation writes an in-app notification and queues the **ticket email** (book title, copy number, issue date, due date, loan id). The same data appears on the student's Loan ticket screen (S9).
7. The staff title detail (A8) shows, per copy: status, location, and for borrowed copies the borrower and due date.

**Edge cases**
- The copy was just issued on another phone: the transaction fails, the screen shows the new state and offers the Return flow.
- Student at the limit, overdue, graduated or suspended: blocked with the exact reason. Only an admin can override a limit block, and it is audited.
- A reference-only copy: blocked.
- The same student already holds another copy of this title: warning (configurable).
- Student not in `members`: staff cannot issue. An admin adds the member first (F13). **[OPEN]**
- Email fails or the address bounces: the loan still exists, the in-app ticket exists, `mailLog` shows `failed`, and staff see a "resend" action.
- Book leaves the library without a desk scan: the system cannot know. The shelf audit (F15) catches copies that are `on_shelf` in the database but missing from the shelf. State the rule to students: the desk scan must happen first.
- Double tap on Confirm: the idempotency key returns the first result.

**Acceptance.** Two staff phones issuing the same copy at the same moment produce exactly one loan. The ticket email arrives with the correct due date, and the due date never falls on a holiday.

---

### F10. Returning a book and reshelving

**Rule.** A student always hands the book to staff, who scan the QR and approve. If a student keeps the book themselves, the library cannot track it, which is why a return is a person-to-person act. **[DECIDED D16]**

**Implementation**
1. Scan the copy (`borrowed`). The Return screen shows the borrower, the due date and days late.
2. Staff choose the condition: **OK** or **damaged**. The return time is now. Staff can change it with a reason (for a late approval or a drop-box return), and the change is audited.
3. `returnLoan(loanId, condition, returnedAt, idempotencyKey)` in one transaction:
   - set `returnedAt` (physical time), `recordedAt` (now), `returnedTo` (staff), `status = returned`;
   - copy goes to `in_returns_cart` and `availableCount` is incremented;
   - if the book is late and `finePerDay > 0`, compute the fine from the physical return time (not the scan time) and store it;
   - if the condition is `damaged`, prompt the staff to retire the copy or keep it with a note (F12).
4. A **return receipt email** goes to the student at the moment of the scan. It is the student's proof and removes "I returned it" disputes.
5. **Reshelve (A5):** the returns cart lists copies in `in_returns_cart`. Staff take the book to its shelf and scan it there. The screen confirms the recorded shelf and row, or lets staff pick the actual place. Then the status becomes `on_shelf` and `lastVerifiedAt` is set. Until then, search shows the copy as "returned, being reshelved" with its location marked as unconfirmed.
6. Someone other than the borrower may hand the book over. Allow it. The loan record decides who gets the receipt.

**Edge cases**
- The copy is not borrowed: if it is in the returns cart, show "already returned at <time>" and change nothing. If it is `on_shelf`, show "not on loan, check the shelf audit".
- Return on a closed day or after hours: staff record the actual physical return time. Students are never fined for staff delay. **[OPEN: whether a drop box is allowed, D21. If it is, add a `returned_unverified` status with the drop time and process it the next morning.]**
- The loan is overdue: show the days late and the fine if any. Do not block the return.
- A lost book that turns up: scanning a copy that was marked lost opens the retired-copy warning, where staff can reinstate it (F12).
- Same QR scanned twice: ignored by the debounce and by idempotency.

**Acceptance.** A returned copy is never shown as available until it is reshelved and scanned at the shelf (or the policy says otherwise). A student scanning nothing cannot return anything.

---

### F11. Reminders, overdue alerts and email

**Rule.** The student gets an email a day before the due date. Overdue books are reported to staff. **[DECIDED D18]**

**Implementation (scheduled Cloud Functions, timezone `Asia/Kolkata`)**
- **`dueReminders`, daily at `reminderHourIST`:** find active loans due on the next working day (`dueAt` between tomorrow 00:00 and 23:59:59 IST), skipping loans whose `reminderSentAt` is already set. Send the email, create an in-app notification, send a push, then set `reminderSentAt`. A rerun never double-sends.
- **`overdueDigest`, daily at `overdueDigestHourIST`:** find active loans with `dueAt < start of today`, group by student, and send **one digest email** to the staff list (`staffDigestEmails`). The Overdue list screen (A6) shows the same data live. Flag loans overdue more than 7 days. Optionally send the student an overdue notice (`notifyStudentOnOverdue`). **[RECOMMENDED; the owner only asked for staff]**
- Holidays and weekly off days come from `config/rules`. A helper `nextWorkingDay(date)` is used for due dates, and reminders go out on the last working day before the due date.
- **Email provider:** a transactional email API with a verified sender domain (SPF and DKIM set up). Do not send from a personal mailbox. A shared mailbox on the college's own mail system has daily sending limits, so batch with rate limiting. Every message is recorded in `mailLog` (`queued`, `sent`, `failed`, `bounced`) with retries (3 attempts, exponential backoff).
- Templates: borrow ticket, return receipt, due reminder, overdue notice, staff digest.
- **Second channel:** in-app notifications (S10) and a push through Firebase Cloud Messaging, because college mail can land in spam or bounce.

**Edge cases**: a reminder that falls on a holiday; a student who returns the book after the reminder job read the list but before it sent (re-check the loan is still active right before sending); a bounced address (mark `emailBounced`, show it to staff); a graduated student with an unreturned book (staff flag, F13); the job failing for a day (the next run catches loans that were missed, using the "not yet sent" flag rather than the exact date); clock and timezone mistakes (store UTC, compute days in IST, test around midnight).

**Acceptance.** A loan due on 25 Nov produces exactly one reminder on 24 Nov (or the previous working day), and no second one on a rerun. The staff digest lists each overdue student once.

---

### F12. Retiring copies, the retired log and reinstating

**Rule.** A thrown-away or lost copy is never deleted. It goes into a separate retired-books log, and its copy number is never reused. **[DECIDED D10, D11]**

**Implementation**
1. `retireCopy(copyId, reason, note?, replacementCopyNo?)` runs one transaction: create the `retiredLog` document with a full snapshot, delete the live `copies` document (or mark it removed), update `activeCount`, `availableCount` and the shelf row's `filled`, write the audit entry. `nextCopyNo` is untouched.
2. **Blocked while the copy has an open loan**, unless the action is "mark lost" (F10 path), which closes the loan as `lost`, flags the borrower for staff follow-up and retires the copy with reason `lost`.
3. The log is **append-only**. Nothing, including functions and admins, updates or deletes a row. A mistake is corrected by appending a new row that references the old one, and the correction is audited.
4. **Scanning a retired copy's QR** (a "lost" book that reappears, or a withdrawn copy that was shelved by mistake) finds the row in `retiredLog` and shows "Copy 6 was retired on <date> (<reason>)". Staff choose **Reinstate** (recreates the copy from the snapshot, writes a `reinstated` log row, restores the counts) or keep it retired.
5. The staff screens show three counts per title: total ever owned, active, and available now. "Total ever owned" is `nextCopyNo - 1`, and "active" is total minus retired.
6. A reports query ("copies lost per year") reads from the log.

**Edge cases**: retiring the last active copy of a title (the title stays, shows "no copies", and stays searchable by admins); retiring a copy in the returns cart; reinstating a copy whose shelf no longer exists (ask for a new location); a replacement added later (the add dialog asks which retired copy it replaces).

**Acceptance.** Copies 1 to 10 exist, copy 6 is retired, the next copy is 11, the title shows total 11, active 10, and the log has one row for copy 6.

---

## 7. Features, part C: people, shelves, audit, offline

### F13. Members and year-end

**Rule.** A member is a student or staff user identified by a unique college email. **[DECIDED D4]**

**Implementation**
- Members arrive by **CSV import** (A15): `name, email, department?, year?, rollNo?`. Validation: email must be on the college domain, no duplicate emails in the file, required fields present. Show a preview with row-level errors, then confirm. Import is an upsert by email and is audited.
- Member list and detail (A14): current loans, history, status. Status values: `active`, `graduated`, `suspended`. Only staff and admins can see who borrowed what. A student only ever sees their own loans, enforced by rules and by the function layer.
- The desk screens always show name, email and department together, so two students with the same name are never confused.
- **Year-end flow:** an admin selects a batch to mark `graduated`. The screen first lists the members in that batch who still hold unreturned books, so staff can collect them before access ends. Graduated members cannot sign in, and their history stays (so old loans and the audit log still make sense).
- **Never delete members.** After the retention period (**[OPEN: how long]**) anonymize the personal fields and keep the loan statistics.

**Edge cases**: a college address deactivated at graduation (reminders bounce: the status check and the bounce flag cover it); a student missing from the import (staff cannot issue until an admin adds them); an email reissued to a different person (rare, handled by hand); a student who is also staff (one account, highest role wins).

**Acceptance.** Importing the same CSV twice changes nothing. A graduated student cannot sign in. The desk screen never shows a member without their email.

---

### F14. Shelves, categories and layout changes

**Rule.** Categories map to shelves. The mapping drives the placement suggestion and the zone colours on the map. **[DECIDED D13]**

**Implementation**
- Admin screen A17: the category list (a fixed set, never free text), the ordered shelves for each category, and the capacity and filled count per row. Full shelves are flagged.
- Renaming a category batch-updates its titles and mappings in one controlled job. Deleting a category is blocked while titles use it.
- Shelf ids never change. When the layout changes (a shelf is moved, split or removed), publish a new layout version, keep the shelf documents, and for removed boxes set `active: false` and generate a **needs-relocation list** of the copies affected. Books never point at a shelf that does not exist.
- The layout viewer (A18) is read-only for now. The tracer tool (F2) is the editing path. An in-app editor is phase 3.

**Edge cases**: a shelf split in two (the admin moves a range of rows to a new shelf id, with a bulk move that is audited); a category that outgrows its shelves (the capacity warning and the "no space" suggestion path); a shelf of mixed categories.

---

### F15. Shelf audit

**Rule.** The stored location is a promise that gets verified. Audits find missing, misplaced and unrecorded books. This also catches students keeping books themselves or taking books without a desk scan.

**Implementation**
1. Staff pick a shelf (and optionally a row). The app loads the copies expected there.
2. Staff scan every book physically on the shelf. Scans are held in the session and submitted at the end.
3. The result groups:
   - **Found OK**: expected and scanned;
   - **Missing**: expected `on_shelf` but not scanned;
   - **Misplaced**: scanned, but it belongs to another shelf (offer to move the record or to move the book);
   - **On loan but present**: the database says `borrowed` but the book is on the shelf (flag it, staff decide: this may be an unrecorded return);
   - **Retired or unknown**: scanned codes that are retired or not in the catalog.
4. Every suggested fix needs a staff confirmation and is audited. `lastAuditedAt` is stored on the shelf.

**Edge cases**: a very large shelf (audit by row); the app closing mid-audit (keep the session locally and resume); the same book scanned twice (ignored).

---

### F16. Offline behaviour and sync

- **Works offline:** the map (from the bundled or cached layout), keyword search (from the local index), the student's cached loans, cached category list.
- **Needs a connection:** issue, return, reshelve, add book, member changes, similarity search, availability refresh. The app says so clearly and does not queue these.
- **Sync:** first launch downloads titles in pages and builds the local index. After that only changes since the last sync cursor are fetched. Availability is not trusted from the cache: it is refreshed when a book is opened and labelled with "updated hh:mm".
- Firestore offline persistence stays on for read caching. Listeners exist only on the screen that needs them and are detached when it leaves.
- Library Wi-Fi may be weak: all list screens have loading, empty and error states.

---

### F17. Reports (phase 3)

- A scheduled function writes monthly aggregates (`stats/{yyyy-mm}`): loans per month, most borrowed titles, copies lost per year, overdue counts and categories most in demand.
- The Reports screen (A21) reads aggregates only. It never scans all loans on the client.

---

### F18. Reservations and renewals **[OPEN: not decided, D21]**

Build the data model so these can be added without rework (a `reservations` collection keyed by title and member, a `reserved` copy status, a `renewals` counter on loans). Do not build the screens until the owner decides. Default design if approved:

- **Reservation:** when every copy is out, a student taps "Notify me". When a copy is returned and reshelved (or at return time), the first student in the queue is notified and the copy is held for a limited time, then released to the next student.
- **Renewal:** allowed once or twice if nobody has reserved the title, approved at the desk or requested in the app and approved by staff. It moves `dueAt` by `loanDays` and is audited.

---

## 8. Security and privacy

**Security rules (summary)**

| Collection | Student | Staff / admin | Writes |
|---|---|---|---|
| `titles`, `shelves`, `categoryMap`, `specialLocations`, `config/layout` | read | read | functions only |
| `copies` | read (public fields) | read | functions only |
| `loans` | read own (`memberId == uid`) | read all | functions only |
| `members` | read own | read all | functions only |
| `notifications` | read own, mark read | read own | functions, plus own `readAt` |
| `retiredLog`, `auditLog`, `mailLog` | none | read | functions only, append-only |
| `config/rules` | read non-sensitive fields | read | admin through a function |

- Every rule also requires `email_verified` and the college domain. Callable functions verify the claim and the member status again on every call.
- **Enable Firebase App Check** (Play Integrity) so only the genuine app can call the backend.
- Rate-limit callable functions that cost money (similarity search) and the ones that send mail.
- Use server timestamps for every audit and loan time. Never trust the client clock.
- Secrets (email and embedding API keys) live only in Secret Manager. Nothing sensitive is in the app bundle.
- The QR is only an ID and is not a credential. Anyone can print a copy. This is safe because no scan can change anything and staff actions need a signed-in staff account.
- **Audit log:** who changed a location, who approved a return, who overrode a rule, who changed a role, with before and after values. Append-only.

**Privacy**
- Stored personal data: name, college email, optional department, year and roll number, and loan history. Collect nothing more.
- Only staff can see who borrowed what. Never expose a borrower's identity in search results.
- Personal data of Indian students falls under the Digital Personal Data Protection Act: confirm the retention period and the notice wording with the college, support correction and erasure requests (anonymize instead of deleting loan statistics), and keep personal data out of logs where possible.

---

## 9. Efficiency and scale

| Area | Requirement |
|---|---|
| Map | Few draw calls (merge static boxes, instance repeats), no textures, no shadows, render on demand, 30 fps on the lowest test device, opens from cache in under 2 s |
| Search | Local index: results under 300 ms for 20,000 titles, no network needed |
| Reads | Denormalized `availableCount` and `nextDueAt` on titles, so lists never count copies. Section view is paged (about 50 per row). Listeners only on the visible screen. |
| Writes | Every state change is one transaction. Imports chunk at 500 operations. Idempotency keys on every mutating call. |
| Sync | Delta sync by `updatedAt` cursor. Never download the whole catalog twice. |
| Cost | Embeddings are created once per title write. Query embeddings cached briefly. Rate limits on search and email. |
| Consistency | A nightly job recomputes counts and reports drift in the audit log. |
| Indexes | Create composite indexes for: copies by `shelfId`+`row`, loans by `status`+`dueAt`, loans by `memberId`+`status`, titles by `updatedAt`. |

---

## 10. Edge-case master table

| # | Area | Scenario | Handling |
|---|---|---|---|
| 1 | Copies | Highest-numbered copy is retired, then a new copy is added | Counter never reuses the number (F12) |
| 2 | Copies | Two librarians add copies of one title at once | One transaction on `nextCopyNo` serializes them (F6) |
| 3 | Copies | Save pressed twice or a request retried | Idempotency key returns the first result |
| 4 | Titles | "SL Aurora" and "S.L. Arora" entered as two titles | Normalized duplicate check, default to "add a copy" (F6) |
| 5 | Titles | Same title, new edition | New title or `edition` field |
| 6 | Titles | One book fits two categories | One primary category, extra `tags[]` |
| 7 | Placement | Category shelf is full | No suggestion, librarian must choose (F6) |
| 8 | Placement | Librarian keeps a book "somewhere else" | Must give shelf and row or a fixed special location; no free text |
| 9 | Placement | Category has no shelf mapping | Prompt to choose and create the mapping |
| 10 | Placement | Students put books back in the wrong place | Shelf audit flags misplaced copies (F15) |
| 11 | Loans | Two phones issue the same copy | Transaction re-reads status; second one fails with the new state |
| 12 | Loans | Student at limit, overdue, graduated or suspended | Blocked with the reason; only admin can override a limit |
| 13 | Loans | Reference-only copy | `lendable: false`, blocked |
| 14 | Loans | Due date is a holiday or Sunday | `nextWorkingDay` |
| 15 | Loans | Book leaves without a desk scan | Cannot be prevented; shelf audit finds it; state the rule to students |
| 16 | Loans | Borrowed book found on the shelf | Audit flags "on loan but present"; staff resolve |
| 17 | Returns | Scan a copy that is not borrowed | "Already returned" or "not on loan"; nothing changes |
| 18 | Returns | Late approval by staff | Physical return time is editable with a reason; fine uses the physical time |
| 19 | Returns | After-hours drop | Only if the owner enables it; `returned_unverified` (OPEN) |
| 20 | Returns | Someone else hands the book over | Allowed; receipt goes to the borrower |
| 21 | Returns | Damaged on return | Condition flag, prompt to retire or note |
| 22 | Returns | Dispute "I returned it" | Return receipt email and audit log are the evidence |
| 23 | Retired | Retired copy's QR is scanned | Log lookup, warning, optional reinstate |
| 24 | Retired | Retire a copy with an open loan | Blocked, or the "mark lost" path |
| 25 | Retired | Log edited or deleted | Not allowed (append-only) |
| 26 | QR | Scratched or unreadable label | Manual id entry, reprint with the same id |
| 27 | QR | Forged or foreign QR | Prefix check; server lookup; no scan changes data |
| 28 | Email | Mail bounces or goes to spam | `mailLog`, retry, in-app and push as second channel |
| 29 | Email | Daily send limit reached | Batch, rate limit, transactional provider |
| 30 | Reminders | Reminder job misses a day | Next run uses `reminderSentAt` not the exact date |
| 31 | Reminders | Book returned between the query and the send | Re-check the loan before sending |
| 32 | Members | Two students with the same name | Email unique; desk screens show name, email, department |
| 33 | Members | Graduate with an unreturned book | Year-end list shows them first |
| 34 | Members | Student not in the member list | Cannot sign in or be issued a book until added |
| 35 | Auth | Admin removed while signed in | Token revoked, functions re-check the claim |
| 36 | Auth | Account outside the college domain | Rejected at sign-up and by rules |
| 37 | Map | WebGL unavailable or old WebView | 2D fallback from the same layout JSON |
| 38 | Map | Tall shelves hide the ones behind | Low heights, fade near walls, labels |
| 39 | Map | Thin wall is hard to tap | Proxy pick boxes at least 0.6 m thick |
| 40 | Map | Layout changes, shelves move | Stable shelf ids, `active` flag, relocation list, versioned layout |
| 41 | Path | Target unreachable | Highlight shelf, text directions, report a layout error |
| 42 | Path | No GPS indoors | Entrance default, manual pick, aisle QR (phase 2) |
| 43 | Search | Availability shown is stale | Refresh on open, "updated hh:mm" label |
| 44 | Search | No description on a title | Required at entry, ISBN prefill, quality flag |
| 45 | Search | Similarity returns weak matches | Threshold, grouped under "Related", limited map highlight |
| 46 | Sync | Large catalog | Delta sync, local index, paging |
| 47 | Sync | Library Wi-Fi is weak | Offline map and search; loans need a connection and say so |
| 48 | Counts | Counters drift from the data | Nightly recompute and drift report |
| 49 | Privacy | Student sees who borrowed a book | Never; aggregates only (`nextDueAt`) |
| 50 | Accessibility | Map is visual only | Text directions on every path, screen reader accessibility labels (TalkBack/VoiceOver), minimum 48x48 pt touch targets |

---

## 11. Test scenarios the agent must pass

1. Add a title with 10 copies. Retire copy 6. Add one copy. The new copy is 11. The log has one row. Counts are total 11, active 10.
2. Run 20 parallel `addCopies` calls for one title. All numbers are unique and contiguous.
3. Run two parallel `issueLoan` calls for one copy. Exactly one succeeds.
4. Issue, return, reshelve: status moves `on_shelf` to `borrowed` to `in_returns_cart` to `on_shelf`, and `availableCount` ends where it started.
5. Return a copy twice. The second call changes nothing.
6. A loan due on a Sunday is moved to the next working day. The reminder is sent once on the working day before.
7. Re-run `dueReminders` and `overdueDigest` for the same day. No duplicate emails.
8. A student reads another student's loan through the Firestore API. Denied.
9. A non-college Google account signs up. Rejected.
10. A student calls `issueLoan` directly. Denied.
11. Scan a retired QR. The warning shows the log entry. Reinstate restores counts.
12. Import the member CSV twice. No changes the second time.
13. Run the batch import twice with the same batch id. No duplicates. Run a dry run on bad data. Nothing written.
14. Disable WebGL. The 2D map loads and search, navigation text and sections still work.
15. For every shelf in the real layout, a path exists from the entrance.
16. Airplane mode: map, local search and cached loans open. Issue shows "no connection" and writes nothing.
17. Delete a shelf box from the layout. Its books appear on the relocation list and no copy points at a missing shelf.
18. Midnight tests: a loan issued at 23:59 IST and one at 00:01 IST get the right due dates and reminder days.

---

## 12. Build order

**Phase 0: foundation**
Firebase project, Identity Platform upgrade decision, Auth with domain restriction and claims, Firestore schema and rules, callable function skeleton, audit logging, the tracer tool and the first real `layout.json`, the app shell with student and admin navigation.

**Phase 1: first usable version**
Map (isometric view, tap to select, section view), keyword search with the local index, book detail, the path line, admin Scan, Issue, Return, Add book with placement suggestion, Print labels, My books and Loan ticket, ticket and return-receipt emails, due reminders, the data import and labelling of the existing collection.

**Phase 2**
Reshelve, Overdue list and staff digest, Members and import, Shelf audit, Categories and shelf mapping, similarity search ("related books"), year-end flow, aisle QR as a start point, retired log screens, text directions polish.

**Phase 3**
Reservations and renewals (if approved), reports, multi-floor if needed, in-app layout editor, home screen quick actions or deep links if wanted.

---

## 13. Open decisions (need the product owner)

The agent builds each of these as a setting or a single code path with the stated default, and lists them in the final report.

| # | Question | Why it matters | Default until answered |
|---|---|---|---|
| 1 | QR payload: ID only, or title/category/author/description with the copy id? | Printed labels cannot be edited; dense QR scans badly | ID only (`LIB1:T0042-6`), title as an optional display hint |
| 2 | Loan period, borrow limit, fines, block-when-overdue, reference-only books | Decides what the server enforces | 14 days, 3 books, block when overdue, no fines, reference-only flag supported |
| 3 | Are members import-only, or can students sign up and wait for approval? | Who can use the app | Import-only; unknown accounts see "Access blocked" |
| 4 | Is an after-hours drop box allowed? | Needs a `returned_unverified` state | Not allowed |
| 5 | Reservations and renewals? | Data model and screens | Data model ready, screens not built |
| 6 | How many floors? Total titles and copies? | Multi-floor paths, sync sizing | One floor, under 20,000 titles |
| 7 | Is the college email Google Workspace? | Google sign-in works only for Google-backed accounts | Assume yes. If not, use email-link sign-in with the same domain rule |
| 8 | One admin role or `staff` plus `admin`? | Permissions split | Both roles (`staff` can issue, return and add; `admin` can also change settings, members and roles) |
| 9 | Notify the student when a book is overdue (not only staff)? | Extra emails | On, configurable |
| 10 | Data retention after a student leaves | DPDP compliance | Keep history, anonymize after 2 years pending confirmation |
| 11 | College email domain value; sender address for emails | Sign-in rule and mail authentication | Config values `COLLEGE_DOMAIN`, `MAIL_FROM` |
| 12 | Will the library print labels in-house? Label size and printer? | Label layout | A4 sheet of 38 x 21 mm labels |

---

## 14. Screen inventory

Wireframes exist for every screen below. The ids match the flow diagram.

**Shared:** Splash, Login, Role gate (no UI), Access blocked, Profile and settings, Offline or error state.

**Student (bottom tabs: Home, Map, My books, Alerts, plus Profile):** S1 Home, S2 Map, S3 Section view, S4 Search results, S5 Book detail, S6 Navigation, S7 Categories, S8 My books, S9 Loan ticket, S10 Alerts.

**Admin (bottom tabs: Dashboard, Books, Scan in the centre, Members, More):** A1 Dashboard, A2 Scan, A3 Issue, A4 Return, A5 Reshelve, A6 Overdue list, A7 Books, A8 Title detail, A9 Add book, A10 Edit title or copy, A11 Print labels, A12 Retire copy, A13 Retired log, A14 Members, A15 Member import, A16 Shelf audit, A17 Categories and shelves, A18 Layout viewer, A19 Settings and rules, A20 Audit log, A21 Reports. Also: Member detail, More menu, Scan error, Retired-copy warning.

Every list needs a loading, empty and error state. Every risky action (retire, mark lost, manual date change, limit override) needs a confirmation dialog with a reason where the audit log requires one.

---

## 15. Backend function list

**Callable (all re-check the role claim and member status):**
`resolveCopy`, `createTitle`, `addCopies`, `suggestLocation`, `updateTitle`, `updateCopyLocation`, `issueLoan`, `returnLoan`, `reshelveCopy`, `markLost`, `retireCopy`, `reinstateCopy`, `submitShelfAudit`, `importMembers`, `setMemberStatus`, `setRole`, `updateRules`, `searchSimilar`, `resendEmail`, `remapShelf`.

**Triggers:** `beforeUserCreated` and `beforeUserSignedIn` (domain, status, claims), `onTitleWrite` (search fields, embedding, `updatedAt`), `onLoanCreate` (ticket email, notification), `onLoanReturn` (receipt email), `onLoanWrite` (`nextDueAt`).

**Scheduled (`Asia/Kolkata`):** `dueReminders`, `overdueDigest`, `recomputeCounts`, `statsAggregate`, `yearEndCheck` (optional).

---

## 16. Rules sketch (starting point, not final)

```
function signedIn()   { return request.auth != null
                          && request.auth.token.email_verified == true
                          && request.auth.token.email.matches('.*@COLLEGE_DOMAIN$'); }
function isStaff()    { return signedIn() && request.auth.token.role in ['staff','admin']; }
function isAdmin()    { return signedIn() && request.auth.token.role == 'admin'; }

match /titles/{id}        { allow read: if signedIn(); allow write: if false; }
match /copies/{id}        { allow read: if signedIn(); allow write: if false; }
match /loans/{id}         { allow read: if isStaff() || (signedIn() && resource.data.memberId == request.auth.uid);
                            allow write: if false; }
match /members/{id}       { allow read: if isStaff() || (signedIn() && id == request.auth.uid);
                            allow write: if false; }
match /retiredLog/{id}    { allow read: if isStaff(); allow write: if false; }
match /auditLog/{id}      { allow read: if isStaff(); allow write: if false; }
match /mailLog/{id}       { allow read: if isStaff(); allow write: if false; }
match /notifications/{id} { allow read: if signedIn() && resource.data.memberId == request.auth.uid;
                            allow update: if signedIn() && resource.data.memberId == request.auth.uid
                                         && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readAt']); }
```

Write rules tests with the Firebase emulator for every row of the table in section 8.

---

## 17. Definition of done and what to report

The work is done when:
1. Every **DECIDED** item in section 2 is implemented and behaves as written.
2. The test scenarios in section 11 pass, including the concurrency ones.
3. The security rules tests pass in the emulator and a student cannot reach staff data.
4. The map runs on the lowest-spec test phone, and the 2D fallback works.
5. Every **OPEN** item is implemented with its stated default and is listed in the report.

**Final report from the agent** (short): what was built per phase; every deviation from this brief and why; every OPEN default that was used; platform limits found to differ from section 3.3; known gaps and the next step. Keep the decisions in `DECISIONS.md` in the repository.