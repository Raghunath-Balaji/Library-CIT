import React, { useMemo, useEffect, useRef } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LayoutConfig, ShelfItem } from '../types';
import { CUSTOM_WALL_LOGO_DATA_URI } from '../services/logoData';

interface Map3DViewProps {
  layout: LayoutConfig | null;
  selectedShelfId: string | null;
  onSelectShelf: (shelf: ShelfItem) => void;
  onSelectLibrarian?: () => void;
}

export const Map3DView: React.FC<Map3DViewProps> = ({
  layout,
  selectedShelfId,
  onSelectShelf,
  onSelectLibrarian
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const webViewRef = useRef<any>(null);
  const initialSelectedRef = useRef<string | null>(selectedShelfId);

  useEffect(() => {
    const payload = JSON.stringify({
      type: 'SELECT_SHELF',
      shelfId: selectedShelfId
    });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(payload, '*');
    } else if (webViewRef.current?.injectJavaScript) {
      webViewRef.current.injectJavaScript(
        `window.postMessage(${JSON.stringify(payload)}, '*'); true;`
      );
    }
  }, [selectedShelfId]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'SHELF_SELECTED' && data.item) {
          onSelectShelf(data.item);
        } else if (data?.type === 'LIBRARIAN_SELECTED') {
          onSelectLibrarian?.();
        }
      } catch {
        // Ignore non-json window messages
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => window.removeEventListener('message', handleWebMessage);
  }, [onSelectShelf, onSelectLibrarian]);

  const htmlContent = useMemo(() => {
    if (!layout) return '';

    const serializedLayout = JSON.stringify(layout);
    const activeShelfId = initialSelectedRef.current
      ? JSON.stringify(initialSelectedRef.current)
      : 'null';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
          <style>
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #d5dde6; user-select: none; -webkit-user-select: none; }
            #canvas-container { width: 100%; height: 100%; cursor: grab; }
            #canvas-container:active { cursor: grabbing; }

            /* True Progressive Optical Frost Blur Overlays (No opaque white wash!) */
            .frost-blur-top {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 120px;
              pointer-events: none;
              backdrop-filter: blur(22px);
              -webkit-backdrop-filter: blur(22px);
              background: linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 45%, rgba(255, 255, 255, 0) 100%);
              mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 35%, rgba(0, 0, 0, 0.25) 75%, transparent 100%);
              -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.85) 35%, rgba(0, 0, 0, 0.25) 75%, transparent 100%);
              z-index: 10;
            }
            .frost-blur-bottom {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 220px;
              pointer-events: none;
              backdrop-filter: blur(24px);
              -webkit-backdrop-filter: blur(24px);
              background: linear-gradient(to top, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.2) 48%, rgba(255, 255, 255, 0) 100%);
              mask-image: linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 45%, rgba(0, 0, 0, 0.3) 78%, transparent 100%);
              -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.9) 45%, rgba(0, 0, 0, 0.3) 78%, transparent 100%);
              z-index: 10;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        </head>
        <body>
          <div class="frost-blur-top"></div>
          <div id="canvas-container"></div>
          <div class="frost-blur-bottom"></div>
          <script>
            (function() {
              const layoutData = ${serializedLayout};
              const initiallySelectedShelfId = ${activeShelfId};
              const customLogoUri = ${JSON.stringify(CUSTOM_WALL_LOGO_DATA_URI)};
              const container = document.getElementById('canvas-container');

              const scene = new THREE.Scene();
              scene.background = new THREE.Color(0xd5dde6);

              const aspect = window.innerWidth / window.innerHeight;
              let viewSize = 14.5;

              const camera = new THREE.OrthographicCamera(
                -viewSize * aspect,
                viewSize * aspect,
                viewSize,
                -viewSize,
                1,
                1000
              );

              // Standard Isometric Camera Angle
              const roomCenter = new THREE.Vector3(11.0, 1.2, 11.0);
              const isoOffset = new THREE.Vector3(-24, 27, 24);
              const cameraTarget = roomCenter.clone();
              camera.position.copy(cameraTarget).add(isoOffset);
              camera.lookAt(cameraTarget);

              const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
              renderer.setSize(window.innerWidth, window.innerHeight);
              renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
              renderer.shadowMap.enabled = true;
              renderer.shadowMap.type = THREE.PCFSoftShadowMap;
              container.appendChild(renderer.domElement);

              // -------------------------------------------------------------
              // BALANCED LIGHTING - PREVENTS OVEREXPOSURE & ENHANCES SHADOWS
              // -------------------------------------------------------------
              const ambientLight = new THREE.AmbientLight(0xe2e8f0, 0.45);
              scene.add(ambientLight);

              const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
              dirLight.position.set(-24, 42, -14);
              dirLight.castShadow = true;
              dirLight.shadow.mapSize.width = 1024;
              dirLight.shadow.mapSize.height = 1024;
              dirLight.shadow.bias = -0.0006;
              scene.add(dirLight);

              const softFill = new THREE.DirectionalLight(0x94a3b8, 0.25);
              softFill.position.set(24, 25, 24);
              scene.add(softFill);

              // -------------------------------------------------------------
              // TONAL MATERIALS - HIGH CONTRAST & VISUAL SEPARATION
              // -------------------------------------------------------------
              // Hero Library Materials
              const whiteArchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.05 });
              const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, metalness: 0.05 });
              const darkAccMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
              const tableTopMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
              const metalLegMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
              const chairShellMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
              const chairLegMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
              const screenGlowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, emissive: 0x0284c7, emissiveIntensity: 0.4 });

              // Modular Classroom Props: Pale, desaturated, soft architectural concrete
              // (Muted and pale so the central library pops vividly!)
              const roomSlabMat = new THREE.MeshStandardMaterial({ color: 0xc8d1da, roughness: 0.9 });       // Soft muted concrete plinth
              const roomFloorMat = new THREE.MeshStandardMaterial({ color: 0xe6ebf0, roughness: 0.85 });     // Pale matte floor
              const roomWallMat = new THREE.MeshStandardMaterial({ color: 0xd4dbe2, roughness: 0.8 });       // Soft pale stone wall
              const wallCopingMat = new THREE.MeshStandardMaterial({ color: 0xbac5d0, roughness: 0.75 });    // Subtle muted top coping
              const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b5, roughness: 0.8 });        // Soft desaturated desk surface
              const deskFrameMat = new THREE.MeshStandardMaterial({ color: 0x7c8a99, roughness: 0.8 });      // Subtle desaturated frame
              const benchMat = new THREE.MeshStandardMaterial({ color: 0x8e9ca8, roughness: 0.85 });         // Soft pale bench (not dark!)
              const chalkboardMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });     // Muted matte slate chalkboard
              const boardFrameMat = new THREE.MeshStandardMaterial({ color: 0xbac5d0, roughness: 0.6 });     // Soft aluminum frame

              // Dark Paved Campus Corridor / Pathway (Significantly darker than the rest!)
              const pathwayMat = new THREE.MeshStandardMaterial({
                color: 0x242e3d, // Deep dark slate/asphalt
                roughness: 0.85,
                metalness: 0.1
              });
              const curbMat = new THREE.MeshStandardMaterial({
                color: 0x111827, // Dark slate curb edges
                roughness: 0.9
              });
              const pathMarkingMat = new THREE.MeshStandardMaterial({
                color: 0x475569, // Paver cross divider lines
                roughness: 0.7
              });

              const roomW = 22.0;
              const roomD = 22.0;

              // -------------------------------------------------------------
              // 1. CAMPUS CORRIDOR NETWORK WITH NATURAL CLASSROOM BRANCHES
              // -------------------------------------------------------------
              // Helper: creates a dark paved pathway segment with side curbs
              function createPathway(cx, cz, w, len, isHorizontal = false) {
                const pGeo = new THREE.PlaneGeometry(isHorizontal ? len : w, isHorizontal ? w : len);
                const pMesh = new THREE.Mesh(pGeo, pathwayMat);
                pMesh.rotation.x = -Math.PI / 2;
                pMesh.position.set(cx, 0.015, cz);
                pMesh.receiveShadow = true;
                scene.add(pMesh);

                const curbW = 0.14;
                const curbH = 0.12;

                if (isHorizontal) {
                  const topCurb = new THREE.Mesh(new THREE.BoxGeometry(len, curbH, curbW), curbMat);
                  topCurb.position.set(cx, curbH / 2 + 0.01, cz - w / 2 + curbW / 2);
                  scene.add(topCurb);

                  const botCurb = new THREE.Mesh(new THREE.BoxGeometry(len, curbH, curbW), curbMat);
                  botCurb.position.set(cx, curbH / 2 + 0.01, cz + w / 2 - curbW / 2);
                  scene.add(botCurb);
                } else {
                  const lCurb = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, len), curbMat);
                  lCurb.position.set(cx - w / 2 + curbW / 2, curbH / 2 + 0.01, cz);
                  scene.add(lCurb);

                  const rCurb = new THREE.Mesh(new THREE.BoxGeometry(curbW, curbH, len), curbMat);
                  rCurb.position.set(cx + w / 2 - curbW / 2, curbH / 2 + 0.01, cz);
                  scene.add(rCurb);
                }
              }

              // A. Main West Corridor along library entrance (length 56m, width 3.6m)
              const corrWidth = 3.6;
              const corrZStart = -18.0;
              const corrZEnd = 38.0;
              const corrZLen = corrZEnd - corrZStart;
              const corrCenterX = -corrWidth / 2 - 0.1;
              const corrCenterZ = (corrZStart + corrZEnd) / 2;

              createPathway(corrCenterX, corrCenterZ, corrWidth, corrZLen, false);

              // Paved cross stripes along Main West corridor every 4 meters
              for (let pz = corrZStart + 2; pz < corrZEnd; pz += 4) {
                const stripe = new THREE.Mesh(new THREE.PlaneGeometry(corrWidth - 0.35, 0.12), pathMarkingMat);
                stripe.rotation.x = -Math.PI / 2;
                stripe.position.set(corrCenterX, 0.02, pz);
                scene.add(stripe);
              }

              // B. 5 West Branches connecting Main Corridor directly into West Classrooms
              // Classroom 100 entrance branch
              createPathway(-5.0, -15.5, 2.4, 2.6, true);
              // Classroom 101 entrance branch
              createPathway(-5.0, -4.0, 2.4, 2.6, true);
              // Classroom 102 entrance branch (Directly opposite library door!)
              createPathway(-5.0, 7.5, 2.8, 2.6, true);
              // Classroom 103 entrance branch
              createPathway(-5.0, 19.0, 2.4, 2.6, true);
              // Classroom 104 entrance branch
              createPathway(-5.0, 30.5, 2.4, 2.6, true);

              // C. North Cross-Corridor & Branches into North Classrooms
              // Horizontal breezeway along North of library
              createPathway(12.0, -1.0, 2.4, 24.6, true);
              // North branch into Classroom 201
              createPathway(5.5, -3.2, 2.2, 2.0, false);
              // North branch into Classroom 202
              createPathway(16.5, -3.2, 2.2, 2.0, false);
              // North walkway heading up to Classrooms 203 & 204
              createPathway(11.0, -9.5, 2.4, 14.0, false);
              createPathway(11.0, -15.5, 2.2, 7.5, true);

              // D. East Perimeter Walkway & Branches into East Labs
              createPathway(23.5, 15.4, 2.4, 33.2, false);
              createPathway(25.8, -4.0, 2.2, 2.4, true);  // into East Lab 300
              createPathway(25.8, 7.5, 2.2, 2.4, true);   // into East Lab 301
              createPathway(25.8, 19.0, 2.2, 2.4, true);  // into East Lab 302
              createPathway(25.8, 30.5, 2.2, 2.4, true);  // into East Lab 303

              // E. South Courtyard Promenade & Branches into South Pavilions
              createPathway(11.65, 23.5, 2.4, 23.7, true);
              createPathway(5.5, 25.8, 2.2, 2.4, false);   // into South Pavilion 401
              createPathway(16.5, 25.8, 2.2, 2.4, false);  // into South Pavilion 402

              // -------------------------------------------------------------
              // 2. NEAT, GRID-ORGANIZED MONOCHROMATIC CLASSROOMS & ADJACENT BUILDINGS
              // -------------------------------------------------------------
              // Helper: Generates a perfectly square, organized classroom with desks in neat rows
              function createOrganizedClassroom(cx, cz, w, d) {
                const group = new THREE.Group();
                group.position.set(cx, 0, cz);

                // Base slab (pale muted concrete foundation)
                const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), roomSlabMat);
                slab.position.y = -0.15;
                slab.receiveShadow = true;
                group.add(slab);

                // Interior floor (pale matte floor)
                const flr = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roomFloorMat);
                flr.rotation.x = -Math.PI / 2;
                flr.position.y = 0.01;
                flr.receiveShadow = true;
                group.add(flr);

                // Floor grid tiles
                const flrGrid = new THREE.GridHelper(Math.min(w, d), 6, 0xc8d1da, 0xdfe5ec);
                flrGrid.position.set(0, 0.015, 0);
                group.add(flrGrid);

                // Perimeter Walls (Pale stone with subtle coping rim on top)
                const wallH = 3.6;
                const bWall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.25), roomWallMat);
                bWall.position.set(0, wallH / 2, -d / 2 + 0.125);
                bWall.castShadow = true;
                bWall.receiveShadow = true;
                group.add(bWall);

                const bWallCoping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.12, 0.32), wallCopingMat);
                bWallCoping.position.set(0, wallH + 0.06, -d / 2 + 0.125);
                group.add(bWallCoping);

                const sWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, wallH, d), roomWallMat);
                sWall.position.set(-w / 2 + 0.125, wallH / 2, 0);
                sWall.castShadow = true;
                sWall.receiveShadow = true;
                group.add(sWall);

                const sWallCoping = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, d + 0.05), wallCopingMat);
                sWallCoping.position.set(-w / 2 + 0.125, wallH + 0.06, 0);
                group.add(sWallCoping);

                // Chalkboard centered on back wall with aluminum frame
                const boardBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.58, 1.36, 0.06), boardFrameMat);
                boardBack.position.set(0, 1.9, -d / 2 + 0.26);
                group.add(boardBack);

                const board = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.3, 0.04), chalkboardMat);
                board.position.set(0, 1.9, -d / 2 + 0.29);
                group.add(board);

                // Teacher Desk at front with subtle frame
                const tDeskTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), deskTopMat);
                tDeskTop.position.set(0, 0.8, -d * 0.25);
                tDeskTop.castShadow = true;
                group.add(tDeskTop);

                const tDeskBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.74, 0.84), deskFrameMat);
                tDeskBase.position.set(0, 0.37, -d * 0.25);
                tDeskBase.castShadow = true;
                group.add(tDeskBase);

                // Neat Rows & Columns of Student Desks and Benches (3 rows x 2 columns)
                const rows = 3;
                const cols = 2;
                const startZ = -d * 0.05;
                const rowSpacing = (d * 0.7) / rows;

                for (let r = 0; r < rows; r++) {
                  for (let c = 0; c < cols; c++) {
                    const dx = (c === 0 ? -w * 0.24 : w * 0.24);
                    const dz = startZ + r * rowSpacing;

                    // Student Desk top (pale muted slate)
                    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.06, 0.75), deskTopMat);
                    deskTop.position.set(dx, 0.74, dz);
                    deskTop.castShadow = true;
                    group.add(deskTop);

                    // Student Desk legs (subtle frame)
                    const deskLegs = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.7, 0.7), deskFrameMat);
                    deskLegs.position.set(dx, 0.35, dz);
                    deskLegs.castShadow = true;
                    group.add(deskLegs);

                    // Attached Bench seat (soft pale bench - never heavy/dark!)
                    const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.05, 0.32), benchMat);
                    benchSeat.position.set(dx, 0.42, dz + 0.6);
                    benchSeat.castShadow = true;
                    group.add(benchSeat);

                    const benchLegs = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.4, 0.28), deskFrameMat);
                    benchLegs.position.set(dx, 0.2, dz + 0.6);
                    benchLegs.castShadow = true;
                    group.add(benchLegs);
                  }
                }

                scene.add(group);
              }

              // Row 1: Organized Classrooms along the West Corridor
              // Placed directly across the corridor, running parallel along Z!
              const westRoomW = 11.0;
              const westRoomD = 10.0;
              const westRoomX = corrCenterX - corrWidth / 2 - westRoomW / 2 - 0.4;

              createOrganizedClassroom(westRoomX, -15.5, westRoomW, westRoomD); // Classroom 100 (Far North-West)
              createOrganizedClassroom(westRoomX, -4.0, westRoomW, westRoomD);  // Classroom 101 (North wing)
              createOrganizedClassroom(westRoomX, 7.5, westRoomW, westRoomD);   // Classroom 102 (Directly opposite library door!)
              createOrganizedClassroom(westRoomX, 19.0, westRoomW, westRoomD);  // Classroom 103 (South wing)
              createOrganizedClassroom(westRoomX, 30.5, westRoomW, westRoomD);  // Classroom 104 (Far South-West)

              // Row 2: Organized Classrooms behind the North Bookshelf Wall
              const northRoomW = 10.0;
              const northRoomD = 9.0;
              const northRoomZ = -northRoomD / 2 - 0.8;

              createOrganizedClassroom(5.5, northRoomZ, northRoomW, northRoomD);         // Classroom 201
              createOrganizedClassroom(16.5, northRoomZ, northRoomW, northRoomD);        // Classroom 202
              createOrganizedClassroom(5.5, northRoomZ - 10.5, northRoomW, northRoomD);  // Classroom 203 (Upper North)
              createOrganizedClassroom(16.5, northRoomZ - 10.5, northRoomW, northRoomD); // Classroom 204 (Upper North)

              // Row 3: Organized Labs along the East Perimeter
              createOrganizedClassroom(roomW + 6.0, -4.0, 10.0, 10.0);  // East Lab 300
              createOrganizedClassroom(roomW + 6.0, 7.5, 10.0, 10.0);   // East Lab 301
              createOrganizedClassroom(roomW + 6.0, 19.0, 10.0, 10.0);  // East Lab 302
              createOrganizedClassroom(roomW + 6.0, 30.5, 10.0, 10.0);  // East Lab 303

              // Row 4: Organized Study Pavilions along the South Courtyard
              createOrganizedClassroom(5.5, 30.5, 10.0, 9.0);   // South Pavilion 401
              createOrganizedClassroom(16.5, 30.5, 10.0, 9.0);  // South Pavilion 402

              // -------------------------------------------------------------
              // 3. HERO LIBRARY: ELEVATED WHITE SLAB & VIVID POWDER-BLUE TILES
              // -------------------------------------------------------------
              const plinthGeo = new THREE.BoxGeometry(roomW + 0.6, 0.6, roomD + 0.6);
              const plinth = new THREE.Mesh(plinthGeo, whiteArchMat);
              plinth.position.set(roomW / 2, -0.3, roomD / 2);
              plinth.receiveShadow = true;
              scene.add(plinth);

              const floorGeo = new THREE.PlaneGeometry(roomW, roomD);
              const floorMat = new THREE.MeshStandardMaterial({
                color: 0x7eb5f0, // Hero vivid powder-blue floor (library pops!)
                roughness: 0.5,
                metalness: 0.05
              });
              const floor = new THREE.Mesh(floorGeo, floorMat);
              floor.rotation.x = -Math.PI / 2;
              floor.position.set(roomW / 2, 0.01, roomD / 2);
              floor.receiveShadow = true;
              scene.add(floor);

              const tileGrid = new THREE.GridHelper(roomW, 14, 0xffffff, 0xcbe1fd);
              tileGrid.position.set(roomW / 2, 0.02, roomD / 2);
              scene.add(tileGrid);

              // -------------------------------------------------------------
              // 4. CUTAWAY WALLS & ENTRANCE DOORWAY
              // -------------------------------------------------------------
              const wallHeight = 5.2;
              const wallThick = 0.5;

              // North Wall (Behind Bookshelf)
              const wallNorthGeo = new THREE.BoxGeometry(roomW + wallThick, wallHeight, wallThick);
              const wallNorth = new THREE.Mesh(wallNorthGeo, wallMat);
              wallNorth.position.set(roomW / 2, wallHeight / 2, -wallThick / 2);
              wallNorth.castShadow = true;
              wallNorth.receiveShadow = true;
              scene.add(wallNorth);

              // West Wall with Entrance Doorway opening onto the parallel corridor
              const wallWest1Geo = new THREE.BoxGeometry(wallThick, wallHeight, 6.0);
              const wallWest1 = new THREE.Mesh(wallWest1Geo, wallMat);
              wallWest1.position.set(-wallThick / 2, wallHeight / 2, 3.0);
              scene.add(wallWest1);

              const wallWestDoorTopGeo = new THREE.BoxGeometry(wallThick, wallHeight - 3.2, 3.2);
              const wallWestDoorTop = new THREE.Mesh(wallWestDoorTopGeo, wallMat);
              wallWestDoorTop.position.set(-wallThick / 2, 3.2 + (wallHeight - 3.2) / 2, 7.6);
              scene.add(wallWestDoorTop);

              const wallWest2Geo = new THREE.BoxGeometry(wallThick, wallHeight, roomD - 9.2);
              const wallWest2 = new THREE.Mesh(wallWest2Geo, wallMat);
              wallWest2.position.set(-wallThick / 2, wallHeight / 2, 9.2 + (roomD - 9.2) / 2);
              scene.add(wallWest2);

              // Clean white door frame
              const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 });
              const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), doorFrameMat);
              doorLeft.position.set(0.06, 1.6, 6.0);
              scene.add(doorLeft);

              const doorRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), doorFrameMat);
              doorRight.position.set(0.06, 1.6, 9.2);
              scene.add(doorRight);

              const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.2), doorFrameMat);
              doorTop.position.set(0.06, 3.2, 7.6);
              scene.add(doorTop);

              // East Wall (Right Wall - matching architectural wall color)
              const wallEastGeo = new THREE.BoxGeometry(wallThick, wallHeight, roomD + wallThick);
              const wallEast = new THREE.Mesh(wallEastGeo, wallMat);
              wallEast.position.set(roomW + wallThick / 2, wallHeight / 2, roomD / 2);
              wallEast.castShadow = true;
              wallEast.receiveShadow = true;
              scene.add(wallEast);

              // -------------------------------------------------------------
              // 5. CONTINUOUS OPEN WALL BOOKSHELF
              // -------------------------------------------------------------
              const interactiveBays = [];
              const bayMeshesMap = {};

              const bookColors = [
                0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xf97316,
                0x8b5cf6, 0x06b6d4, 0x1e3a8a, 0xf8fafc, 0xb91c1c
              ];

              const shelfBays = layoutData.items.filter(it => it.type === 'shelf');
              const shelfDepth = 0.9;
              const shelfHeight = 4.4;
              const numRows = 5;
              const rowHeight = shelfHeight / numRows;

              const crownGeo = new THREE.BoxGeometry(roomW, 0.28, shelfDepth + 0.15);
              const crown = new THREE.Mesh(crownGeo, whiteArchMat);
              crown.position.set(roomW / 2, shelfHeight + 0.14, shelfDepth / 2);
              crown.castShadow = true;
              scene.add(crown);

              const baseGeo = new THREE.BoxGeometry(roomW, 0.18, shelfDepth + 0.1);
              const base = new THREE.Mesh(baseGeo, whiteArchMat);
              base.position.set(roomW / 2, 0.09, shelfDepth / 2);
              scene.add(base);

              shelfBays.forEach((bay, bIndex) => {
                const bayGroup = new THREE.Group();
                bayGroup.position.set(bay.x, 0, shelfDepth / 2);

                const bayWidth = bay.w || 2.6;
                const isSelected = bay.shelfId === initiallySelectedShelfId;

                const postGeo = new THREE.BoxGeometry(0.1, shelfHeight, shelfDepth);
                const leftPost = new THREE.Mesh(postGeo, whiteArchMat);
                leftPost.position.set(-bayWidth / 2, shelfHeight / 2, 0);
                bayGroup.add(leftPost);

                const rightPost = new THREE.Mesh(postGeo, whiteArchMat);
                rightPost.position.set(bayWidth / 2, shelfHeight / 2, 0);
                bayGroup.add(rightPost);

                const backboardGeo = new THREE.BoxGeometry(bayWidth, shelfHeight, 0.06);
                const backboard = new THREE.Mesh(backboardGeo, whiteArchMat);
                backboard.position.set(0, shelfHeight / 2, -shelfDepth / 2 + 0.03);
                bayGroup.add(backboard);

                for (let r = 0; r < numRows; r++) {
                  const plankY = 0.18 + r * rowHeight;

                  const plankGeo = new THREE.BoxGeometry(bayWidth - 0.02, 0.08, shelfDepth - 0.04);
                  const plank = new THREE.Mesh(plankGeo, whiteArchMat);
                  plank.position.set(0, plankY, 0);
                  bayGroup.add(plank);

                  const booksInRow = 14;
                  const bookSlotWidth = (bayWidth - 0.24) / booksInRow;
                  const startX = -bayWidth / 2 + 0.14 + bookSlotWidth / 2;

                  for (let b = 0; b < booksInRow; b++) {
                    const seed = (bIndex * 37 + r * 19 + b * 7);
                    const bookColor = bookColors[seed % bookColors.length];
                    const bHeight = (rowHeight * 0.65) + ((seed % 5) * 0.035);
                    const bThickness = bookSlotWidth * 0.88;
                    const bDepth = shelfDepth * 0.68 + ((seed % 3) * 0.03);

                    const bookGeo = new THREE.BoxGeometry(bThickness, bHeight, bDepth);
                    const bookMat = new THREE.MeshStandardMaterial({
                      color: bookColor,
                      roughness: 0.6,
                      metalness: 0.05
                    });
                    const bookMesh = new THREE.Mesh(bookGeo, bookMat);
                    bookMesh.position.set(
                      startX + b * bookSlotWidth,
                      plankY + 0.04 + bHeight / 2,
                      0.04
                    );
                    bookMesh.castShadow = true;
                    bayGroup.add(bookMesh);
                  }
                }

                // Interactive target hit box
                const hitGeo = new THREE.BoxGeometry(bayWidth, shelfHeight + 0.3, shelfDepth + 0.3);
                const hitMat = new THREE.MeshBasicMaterial({
                  color: 0x0284c7,
                  transparent: true,
                  opacity: isSelected ? 0.25 : 0.0
                });
                const hitMesh = new THREE.Mesh(hitGeo, hitMat);
                hitMesh.position.set(0, shelfHeight / 2, 0);
                hitMesh.userData = bay;
                bayGroup.add(hitMesh);

                interactiveBays.push(hitMesh);
                bayMeshesMap[bay.shelfId] = hitMesh;

                scene.add(bayGroup);
              });

              // -------------------------------------------------------------
              // 6. LIBRARY STUDY TABLES & WORK COUNTERS
              // -------------------------------------------------------------
              function createChair() {
                const chairGroup = new THREE.Group();
                const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.05, 0.52), chairShellMat);
                seat.position.y = 0.58;
                seat.castShadow = true;
                chairGroup.add(seat);

                const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.05), chairShellMat);
                back.position.set(0, 0.88, -0.23);
                back.castShadow = true;
                chairGroup.add(back);

                [
                  [-0.22, 0.29, -0.22], [0.22, 0.29, -0.22],
                  [-0.22, 0.29, 0.22], [0.22, 0.29, 0.22]
                ].forEach(([lx, ly, lz]) => {
                  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.58, 0.04), chairLegMat);
                  leg.position.set(lx, ly, lz);
                  leg.castShadow = true;
                  chairGroup.add(leg);
                });
                return chairGroup;
              }

              function createStudyTable(x, z) {
                const group = new THREE.Group();
                group.position.set(x, 0, z);

                const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 2.2), tableTopMat);
                tableTop.position.y = 0.95;
                tableTop.castShadow = true;
                tableTop.receiveShadow = true;
                group.add(tableTop);

                [
                  [-1.7, 0.45, -1.0], [1.7, 0.45, -1.0],
                  [-1.7, 0.45, 1.0], [1.7, 0.45, 1.0]
                ].forEach(([lx, ly, lz]) => {
                  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), metalLegMat);
                  leg.position.set(lx, ly, lz);
                  leg.castShadow = true;
                  group.add(leg);
                });

                [
                  [-0.8, -1.6, 0], [0.8, -1.6, 0],
                  [-0.8, 1.6, Math.PI], [0.8, 1.6, Math.PI]
                ].forEach(([cx, cz, rotY]) => {
                  const chair = createChair();
                  chair.position.set(cx, 0, cz);
                  chair.rotation.y = rotY;
                  group.add(chair);
                });

                scene.add(group);
              }

              createStudyTable(5.5, 6.5);
              createStudyTable(5.5, 11.5);
              createStudyTable(5.5, 16.5);

              createStudyTable(11.5, 9.5);
              createStudyTable(11.5, 14.5);
              createStudyTable(11.5, 19.5);

              // =============================================================
              // EAST WALL BOOKSHELVES (Mounted along East wall, leaving top-right open)
              // =============================================================
              const eastShelfDepth = 0.8;
              const eastShelfZStart = 7.5;
              const eastShelfZEnd = 21.0;
              const eastShelfZLen = eastShelfZEnd - eastShelfZStart; // 13.5m length
              const eastBayCount = 4;
              const eastBayWidth = eastShelfZLen / eastBayCount;

              // Crown molding for East shelves
              const eastCrown = new THREE.Mesh(
                new THREE.BoxGeometry(eastShelfDepth + 0.1, 0.28, eastShelfZLen + 0.1),
                whiteArchMat
              );
              eastCrown.position.set(roomW - eastShelfDepth / 2, shelfHeight + 0.14, (eastShelfZStart + eastShelfZEnd) / 2);
              eastCrown.castShadow = true;
              scene.add(eastCrown);

              // Baseboard for East shelves
              const eastBase = new THREE.Mesh(
                new THREE.BoxGeometry(eastShelfDepth + 0.08, 0.18, eastShelfZLen),
                whiteArchMat
              );
              eastBase.position.set(roomW - eastShelfDepth / 2, 0.09, (eastShelfZStart + eastShelfZEnd) / 2);
              scene.add(eastBase);

              for (let eIdx = 0; eIdx < eastBayCount; eIdx++) {
                const bayCenterZ = eastShelfZStart + (eIdx + 0.5) * eastBayWidth;
                const bayId = 'SH-EST-' + (eIdx + 1);

                // Vertical divider posts
                const postZ = eastShelfZStart + eIdx * eastBayWidth;
                const postMesh = new THREE.Mesh(new THREE.BoxGeometry(eastShelfDepth, shelfHeight, 0.1), whiteArchMat);
                postMesh.position.set(roomW - eastShelfDepth / 2, shelfHeight / 2, postZ);
                scene.add(postMesh);

                // 5 shelf tiers with colorful books
                for (let r = 1; r <= numRows; r++) {
                  const tierY = r * rowHeight;
                  const shelfPlank = new THREE.Mesh(new THREE.BoxGeometry(eastShelfDepth, 0.06, eastBayWidth), whiteArchMat);
                  shelfPlank.position.set(roomW - eastShelfDepth / 2, tierY, bayCenterZ);
                  scene.add(shelfPlank);

                  // Book spines along Z
                  const bookZSpan = eastBayWidth - 0.24;
                  const bookCount = Math.floor(bookZSpan / 0.11);
                  for (let bi = 0; bi < bookCount; bi++) {
                    const bz = bayCenterZ - bookZSpan / 2 + (bi + 0.5) * 0.11;
                    const bColor = bookColors[(eIdx * 5 + r * 3 + bi) % bookColors.length];
                    const bMat = new THREE.MeshStandardMaterial({ color: bColor, roughness: 0.6 });
                    const bH = rowHeight * (0.62 + ((bi * 7) % 5) * 0.06);
                    const bThick = 0.08;
                    const bDepth = eastShelfDepth * 0.72;

                    const bookMesh = new THREE.Mesh(new THREE.BoxGeometry(bDepth, bH, bThick), bMat);
                    bookMesh.position.set(roomW - eastShelfDepth / 2, tierY - rowHeight + bH / 2 + 0.04, bz);
                    bookMesh.castShadow = true;
                    scene.add(bookMesh);
                  }
                }

                // Interactive bay target
                const bayBox = new THREE.Mesh(
                  new THREE.BoxGeometry(eastShelfDepth + 0.2, shelfHeight, eastBayWidth),
                  new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0 })
                );
                bayBox.position.set(roomW - eastShelfDepth / 2, shelfHeight / 2, bayCenterZ);
                bayBox.userData = { shelfId: bayId, category: 'General Reference', aisle: 'East Wall', title: 'East Stacks ' + (eIdx + 1) };
                scene.add(bayBox);
                interactiveBays.push(bayBox);
                bayMeshesMap[bayId] = bayBox;
              }

              // Final end post
              const endPost = new THREE.Mesh(new THREE.BoxGeometry(eastShelfDepth, shelfHeight, 0.1), whiteArchMat);
              endPost.position.set(roomW - eastShelfDepth / 2, shelfHeight / 2, eastShelfZEnd);
              scene.add(endPost);

              // =============================================================
              // CUSTOM INSTITUTIONAL WALL LOGO PLAQUE & GALLERY DOWNLIGHT
              // (East Feature Wall: x = 21.94, y = 3.0, z = 3.8, facing into library)
              // =============================================================
              const logoGroup = new THREE.Group();
              const logoAspect = 327 / 227;
              const logoW = 3.2;
              const logoH = logoW / logoAspect;
              const logoZ = 3.8;
              const logoY = 3.0;

              // 1. Architectural Backing Plaque (Stately matte dark slate frame)
              const plaqueFrameMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                roughness: 0.6,
                metalness: 0.2
              });
              const plaqueFrame = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, logoH + 0.22, logoW + 0.22),
                plaqueFrameMat
              );
              plaqueFrame.position.set(roomW - 0.03, logoY, logoZ);
              plaqueFrame.castShadow = true;
              plaqueFrame.receiveShadow = true;
              logoGroup.add(plaqueFrame);

              // 2. Beveled Inset Rim
              const plaqueRimMat = new THREE.MeshStandardMaterial({
                color: 0xe2e8f0,
                roughness: 0.3,
                metalness: 0.4
              });
              const plaqueRim = new THREE.Mesh(
                new THREE.BoxGeometry(0.065, logoH + 0.08, logoW + 0.08),
                plaqueRimMat
              );
              plaqueRim.position.set(roomW - 0.035, logoY, logoZ);
              logoGroup.add(plaqueRim);

              // 3. High-Resolution Texture Plane
              const logoTexLoader = new THREE.TextureLoader();
              const logoTexture = logoTexLoader.load(customLogoUri, () => {
                renderer.render(scene, camera);
              });
              logoTexture.anisotropy = 8;
              logoTexture.generateMipmaps = true;
              logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
              logoTexture.magFilter = THREE.LinearFilter;

              const logoMeshMat = new THREE.MeshStandardMaterial({
                map: logoTexture,
                roughness: 0.4,
                metalness: 0.05
              });
              const logoMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(logoW, logoH),
                logoMeshMat
              );
              logoMesh.position.set(roomW - 0.07, logoY, logoZ);
              logoMesh.rotation.y = -Math.PI / 2;
              logoGroup.add(logoMesh);

              // 4. Modern Architectural Gallery Sconce Light
              const sconceMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.5,
                metalness: 0.5
              });
              const sconceBar = new THREE.Mesh(
                new THREE.BoxGeometry(0.12, 0.06, logoW * 0.75),
                sconceMat
              );
              sconceBar.position.set(roomW - 0.22, logoY + logoH / 2 + 0.25, logoZ);
              logoGroup.add(sconceBar);

              [-logoW * 0.25, logoW * 0.25].forEach((armZ) => {
                const arm = new THREE.Mesh(
                  new THREE.BoxGeometry(0.22, 0.04, 0.04),
                  sconceMat
                );
                arm.position.set(roomW - 0.11, logoY + logoH / 2 + 0.25, logoZ + armZ);
                logoGroup.add(arm);
              });

              // Soft Warm Gallery Accent Light
              const logoAccentLight = new THREE.PointLight(0xfffaed, 0.6, 7.0);
              logoAccentLight.position.set(roomW - 0.45, logoY + logoH / 2 + 0.22, logoZ);
              logoGroup.add(logoAccentLight);

              scene.add(logoGroup);

              // =============================================================
              // VIRTUAL LIBRARIAN CONSULTATION DESK & PASTEL RED FLOATING ARROW
              // (Top-Right Zone: x = 18.0, z = 3.6, facing into library)
              // =============================================================
              const librarianInteractiveMeshes = [];
              const librarianGroup = new THREE.Group();
              librarianGroup.position.set(18.0, 0, 3.6);
              librarianGroup.rotation.y = -Math.PI / 2; // Facing straight West (-X) towards the left wall & entrance
              librarianGroup.userData = { type: 'librarian' };

              // Consultation Desk Counter
              const libDeskMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
              const libDeskWood = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
              const libTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 1.2), libDeskMat);
              libTop.position.set(0, 0.95, 0);
              libTop.userData = { type: 'librarian' };
              librarianGroup.add(libTop);
              librarianInteractiveMeshes.push(libTop);

              // Desk Legs
              [
                [-1.05, 0.45, -0.5], [1.05, 0.45, -0.5],
                [-1.05, 0.45, 0.5], [1.05, 0.45, 0.5]
              ].forEach(([lx, ly, lz]) => {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), libDeskWood);
                leg.position.set(lx, ly, lz);
                leg.userData = { type: 'librarian' };
                librarianGroup.add(leg);
                librarianInteractiveMeshes.push(leg);
              });

              // Modesty front privacy panel
              const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.65, 0.04), libDeskWood);
              frontPanel.position.set(0, 0.5, 0.5);
              frontPanel.userData = { type: 'librarian' };
              librarianGroup.add(frontPanel);
              librarianInteractiveMeshes.push(frontPanel);

              // Laptop & catalog console
              const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 0.32), darkAccMat);
              laptopBase.position.set(0, 1.01, 0.05);
              laptopBase.userData = { type: 'librarian' };
              librarianGroup.add(laptopBase);
              librarianInteractiveMeshes.push(laptopBase);

              const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.02), darkAccMat);
              laptopScreen.position.set(0, 1.15, -0.1);
              laptopScreen.rotation.x = 0.2;
              laptopScreen.userData = { type: 'librarian' };
              librarianGroup.add(laptopScreen);
              librarianInteractiveMeshes.push(laptopScreen);

              // Virtual Librarian Character (Seated behind desk at z = -0.6)
              const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.6 });
              const clothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
              const hairMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

              // Torso
              const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.35), clothMat);
              torso.position.set(0, 1.05, -0.55);
              torso.userData = { type: 'librarian' };
              librarianGroup.add(torso);
              librarianInteractiveMeshes.push(torso);

              // Head
              const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skinMat);
              head.position.set(0, 1.55, -0.55);
              head.userData = { type: 'librarian' };
              librarianGroup.add(head);
              librarianInteractiveMeshes.push(head);

              // Hair
              const hair = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.34), hairMat);
              hair.position.set(0, 1.74, -0.56);
              hair.userData = { type: 'librarian' };
              librarianGroup.add(hair);
              librarianInteractiveMeshes.push(hair);

              // Arms resting on desk
              const armLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), clothMat);
              armLeft.position.set(-0.32, 1.05, -0.3);
              armLeft.userData = { type: 'librarian' };
              librarianGroup.add(armLeft);
              librarianInteractiveMeshes.push(armLeft);

              const armRight = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.45), clothMat);
              armRight.position.set(0.32, 1.05, -0.3);
              armRight.userData = { type: 'librarian' };
              librarianGroup.add(armRight);
              librarianInteractiveMeshes.push(armRight);

              // BIG PASTEL RED FLOATING ARROW (Bobbing & rotating above librarian)
              const pastelRedMat = new THREE.MeshStandardMaterial({
                color: 0xf87171,
                roughness: 0.2,
                emissive: 0x7f1d1d,
                emissiveIntensity: 0.4
              });

              const librarianArrowGroup = new THREE.Group();
              librarianArrowGroup.position.set(0, 3.2, -0.55);

              // Arrow Shaft
              const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.65, 16), pastelRedMat);
              arrowShaft.position.y = 0.5;
              arrowShaft.userData = { type: 'librarian' };
              librarianArrowGroup.add(arrowShaft);
              librarianInteractiveMeshes.push(arrowShaft);

              // Arrow Head Pointing Down
              const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.65, 16), pastelRedMat);
              arrowHead.position.y = 0;
              arrowHead.rotation.x = Math.PI; // Point downwards towards the librarian
              arrowHead.userData = { type: 'librarian' };
              librarianArrowGroup.add(arrowHead);
              librarianInteractiveMeshes.push(arrowHead);

              librarianGroup.add(librarianArrowGroup);
              scene.add(librarianGroup);

              // =============================================================
              // MATHEMATICALLY TRUE SCREEN-SPACE PANNING (1:1 TRUE DRAG MATH)
              // =============================================================
              let isDragging = false;
              let hasMoved = false;
              let prevTouchX = 0;
              let prevTouchY = 0;
              let initialPinch = null;
              let initialViewSize = viewSize;

              const panSpeed = 0.024;
              const minZoom = 9.0;
              const maxZoom = 18.5;

              // Camera world basis vectors for true screen-to-world projection
              const camRight = new THREE.Vector3();
              const camUp = new THREE.Vector3();

              function updateCamera() {
                const currentAspect = window.innerWidth / window.innerHeight;
                camera.left = -viewSize * currentAspect;
                camera.right = viewSize * currentAspect;
                camera.top = viewSize;
                camera.bottom = -viewSize;
                camera.updateProjectionMatrix();

                camera.position.copy(cameraTarget).add(isoOffset);
                camera.lookAt(cameraTarget);
                camera.updateMatrixWorld();

                // Compute true camera screen axes projected onto the horizontal ground
                camRight.setFromMatrixColumn(camera.matrixWorld, 0); // Local X
                camRight.y = 0;
                camRight.normalize();

                camUp.setFromMatrixColumn(camera.matrixWorld, 1); // Local Y
                camUp.y = 0;
                camUp.normalize();
              }

              // Initial update
              updateCamera();

              function clampTarget() {
                const marginX = 14.0;
                const marginZ = 16.0;
                cameraTarget.x = Math.max(-marginX, Math.min(roomW + marginX, cameraTarget.x));
                cameraTarget.z = Math.max(-marginZ, Math.min(roomD + marginZ, cameraTarget.z));
              }

              // True screen-space translation:
              // Dragging finger right (dx > 0) moves the scene right -> target moves -camRight
              // Dragging finger up (dy < 0 in screen coords) moves the scene up -> target moves -camUp
              function applyScreenDelta(dx, dy) {
                const factor = (viewSize / 16.0) * panSpeed;
                cameraTarget.addScaledVector(camRight, -dx * factor);
                cameraTarget.addScaledVector(camUp, dy * factor);
                clampTarget();
                updateCamera();
              }

              const raycaster = new THREE.Raycaster();
              const pointer = new THREE.Vector2();

              function handleItemClick(clientX, clientY) {
                pointer.x = (clientX / window.innerWidth) * 2 - 1;
                pointer.y = -(clientY / window.innerHeight) * 2 + 1;

                raycaster.setFromCamera(pointer, camera);
                const allInteractive = [...interactiveBays, ...librarianInteractiveMeshes];
                const intersects = raycaster.intersectObjects(allInteractive, true);

                if (intersects.length > 0) {
                  let hitObj = intersects[0].object;
                  // Traverse up to find userData
                  while (hitObj && !hitObj.userData?.shelfId && hitObj.userData?.type !== 'librarian' && hitObj.parent) {
                    hitObj = hitObj.parent;
                  }

                  const uData = hitObj ? hitObj.userData : null;

                  if (uData && uData.type === 'librarian') {
                    const message = JSON.stringify({ type: 'LIBRARIAN_SELECTED' });
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                      window.ReactNativeWebView.postMessage(message);
                    }
                    if (window.parent) {
                      window.parent.postMessage(message, '*');
                    }
                    return;
                  }

                  const selectedBay = uData && uData.shelfId ? uData : null;
                  if (selectedBay && selectedBay.shelfId) {
                    Object.keys(bayMeshesMap).forEach(sId => {
                      const mesh = bayMeshesMap[sId];
                      if (mesh) {
                        mesh.material.opacity = (sId === selectedBay.shelfId) ? 0.35 : 0.0;
                      }
                    });

                    const message = JSON.stringify({
                      type: 'SHELF_SELECTED',
                      item: selectedBay
                    });

                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                      window.ReactNativeWebView.postMessage(message);
                    }
                    if (window.parent) {
                      window.parent.postMessage(message, '*');
                    }
                  }
                }
              }

              window.addEventListener('mousedown', (e) => {
                isDragging = true;
                hasMoved = false;
                prevTouchX = e.clientX;
                prevTouchY = e.clientY;
              });

              window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                const dx = e.clientX - prevTouchX;
                const dy = e.clientY - prevTouchY;

                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                  hasMoved = true;
                }

                applyScreenDelta(dx, dy);

                prevTouchX = e.clientX;
                prevTouchY = e.clientY;
              });

              window.addEventListener('mouseup', (e) => {
                if (isDragging && !hasMoved) {
                  handleItemClick(e.clientX, e.clientY);
                }
                isDragging = false;
              });

              window.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
                viewSize = Math.max(minZoom, Math.min(maxZoom, viewSize * zoomFactor));
                updateCamera();
              }, { passive: false });

              let touchStartX = 0;
              let touchStartY = 0;

              window.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                  isDragging = true;
                  hasMoved = false;
                  prevTouchX = e.touches[0].clientX;
                  prevTouchY = e.touches[0].clientY;
                  touchStartX = prevTouchX;
                  touchStartY = prevTouchY;
                  initialPinch = null;
                } else if (e.touches.length === 2) {
                  isDragging = false;
                  hasMoved = true;
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  initialPinch = Math.hypot(dx, dy);
                  initialViewSize = viewSize;
                }
              }, { passive: false });

              window.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && isDragging) {
                  const dx = e.touches[0].clientX - prevTouchX;
                  const dy = e.touches[0].clientY - prevTouchY;

                  const totalMove = Math.hypot(
                    e.touches[0].clientX - touchStartX,
                    e.touches[0].clientY - touchStartY
                  );
                  if (totalMove > 8) {
                    hasMoved = true;
                  }

                  applyScreenDelta(dx, dy);

                  prevTouchX = e.touches[0].clientX;
                  prevTouchY = e.touches[0].clientY;
                  e.preventDefault();
                } else if (e.touches.length === 2 && initialPinch) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const curDist = Math.hypot(dx, dy);
                  const scale = initialPinch / curDist;

                  viewSize = Math.max(minZoom, Math.min(maxZoom, initialViewSize * scale));
                  updateCamera();
                  e.preventDefault();
                }
              }, { passive: false });

              window.addEventListener('touchend', (e) => {
                if (e.changedTouches.length === 1 && !hasMoved) {
                  handleItemClick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                }
                if (e.touches.length === 0) {
                  isDragging = false;
                  initialPinch = null;
                }
              });

              function animate() {
                requestAnimationFrame(animate);
                if (librarianArrowGroup) {
                  const t = Date.now() * 0.003;
                  librarianArrowGroup.position.y = 3.2 + Math.sin(t * 2.8) * 0.18;
                  librarianArrowGroup.rotation.y += 0.018;
                }
                renderer.render(scene, camera);
              }
              animate();

              window.addEventListener('message', (event) => {
                try {
                  const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                  if (data && data.type === 'SELECT_SHELF') {
                    const targetId = data.shelfId || null;
                    Object.keys(bayMeshesMap).forEach(sId => {
                      const mesh = bayMeshesMap[sId];
                      if (mesh) {
                        mesh.material.opacity = (targetId && sId === targetId) ? 0.35 : 0.0;
                      }
                    });
                  }
                } catch {}
              });

              window.addEventListener('resize', () => {
                updateCamera();
                renderer.setSize(window.innerWidth, window.innerHeight);
              });
            })();
          </script>
        </body>
      </html>
    `;
  }, [layout]);

  if (!layout) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-100">
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 w-full h-full bg-slate-100 overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="3D Library Map"
        />
      </View>
    );
  }

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SHELF_SELECTED' && data.item) {
        onSelectShelf(data.item);
      } else if (data.type === 'LIBRARIAN_SELECTED') {
        onSelectLibrarian?.();
      }
    } catch (err) {
      console.warn('Failed to parse WebView message:', err);
    }
  };

  return (
    <View className="flex-1 bg-slate-100 overflow-hidden">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        className="flex-1"
      />
    </View>
  );
};
