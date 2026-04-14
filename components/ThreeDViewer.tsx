
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeometryObject, Floor, FloorShape, ShadingType } from '../types';

interface ThreeDViewerProps {
  objects: GeometryObject[];
  floors?: Floor[];
  selectedFloorId?: string | null;
  selectedShapeId?: string | null;
  editingFloorId?: string | null;
  lang: 'zh' | 'en';
  showCompass?: boolean;
  onSelectFloor?: (floorId: string) => void;
  onSelectShape?: (shapeId: string) => void;
  onAddFloor?: () => void;
  onMoveShape?: (floorId: string, shapeId: string, x: number, y: number) => void;
  onEnterEditMode?: (floorId: string) => void;
  onExitEditMode?: () => void;
}

const ThreeDViewer: React.FC<ThreeDViewerProps> = ({
  objects, floors, selectedFloorId, selectedShapeId, editingFloorId, lang, showCompass = true,
  onSelectFloor, onSelectShape, onAddFloor, onMoveShape, onEnterEditMode, onExitEditMode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const hoverOverlayRef = useRef<THREE.Mesh | null>(null);
  const addButtonSpriteRef = useRef<THREE.Sprite | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Drag state refs
  const isDraggingRef = useRef(false);
  const dragShapeRef = useRef<{ floorId: string; shapeId: string; startX: number; startZ: number; origX: number; origZ: number } | null>(null);
  const dragPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragIntersectRef = useRef(new THREE.Vector3());
  const dragStartWorldRef = useRef(new THREE.Vector3());
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Refs for callbacks to avoid stale closures
  const onSelectFloorRef = useRef(onSelectFloor);
  const onSelectShapeRef = useRef(onSelectShape);
  const onAddFloorRef = useRef(onAddFloor);
  const onMoveShapeRef = useRef(onMoveShape);
  const onEnterEditModeRef = useRef(onEnterEditMode);
  const onExitEditModeRef = useRef(onExitEditMode);
  const editingFloorIdRef = useRef(editingFloorId);
  onSelectFloorRef.current = onSelectFloor;
  onSelectShapeRef.current = onSelectShape;
  onAddFloorRef.current = onAddFloor;
  onMoveShapeRef.current = onMoveShape;
  onEnterEditModeRef.current = onEnterEditMode;
  onExitEditModeRef.current = onExitEditMode;
  editingFloorIdRef.current = editingFloorId;

  const createFacadeTexture = (wwr: number = 0.3, shadingType: string = 'None') => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Wall base color
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 1024, 1024);

    // Single row of windows — column count driven by WWR
    // Low WWR (0.1) → 2 cols, High WWR (0.9) → 8 cols
    const cols = Math.max(2, Math.min(8, Math.round(2 + wwr * 7)));

    // Window band occupies the middle portion of the facade
    const S = 1024; // texture size
    const bandHeight = S * 0.55;
    const bandY = (S - bandHeight) / 2;
    const margin = 40;
    const gap = 24;
    const usableWidth = S - margin * 2;
    const cellW = usableWidth / cols;
    const winW = cellW - gap;
    const winH = bandHeight * Math.min(1, wwr * 1.4 + 0.2);
    const winY = bandY + (bandHeight - winH) / 2;

    for (let c = 0; c < cols; c++) {
      const x = margin + c * cellW + gap / 2;

      // Window glass
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, winY, winW, winH);

      // Window frame
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, winY, winW, winH);

      // Center mullion (vertical divider)
      if (winW > 60) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + winW / 2, winY);
        ctx.lineTo(x + winW / 2, winY + winH);
        ctx.stroke();
      }

      // Shading elements
      if (shadingType !== 'None') {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 6;
        if (shadingType === 'Horizontal') {
          // Overhang above window
          ctx.beginPath();
          ctx.moveTo(x - 4, winY - 2);
          ctx.lineTo(x + winW + 4, winY - 2);
          ctx.stroke();
        } else if (shadingType === 'Vertical') {
          // Fins on both sides
          ctx.beginPath();
          ctx.moveTo(x - 2, winY - 4);
          ctx.lineTo(x - 2, winY + winH + 4);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + winW + 2, winY - 4);
          ctx.lineTo(x + winW + 2, winY + winH + 4);
          ctx.stroke();
        } else if (shadingType === 'Eggcrate') {
          ctx.strokeRect(x - 3, winY - 3, winW + 6, winH + 6);
        } else if (shadingType === 'Louver') {
          // Horizontal louver lines across window
          const louverCount = 3;
          for (let l = 1; l <= louverCount; l++) {
            const ly = winY + (winH * l) / (louverCount + 1);
            ctx.beginPath();
            ctx.moveTo(x, ly);
            ctx.lineTo(x + winW, ly);
            ctx.stroke();
          }
        }
      }
    }

    // Subtle floor line at bottom
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 1022);
    ctx.lineTo(1024, 1022);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 8;
    texture.generateMipmaps = false;
    return texture;
  };

  const createCompass = () => {
    const group = new THREE.Group();
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0.5, 0),
      20,
      0xef4444,
      5,
      3
    );
    group.add(arrow);
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(18, 20, 32),
      new THREE.MeshBasicMaterial({ color: 0x94a3b8, side: THREE.DoubleSide })
    );
    circle.rotation.x = -Math.PI / 2;
    group.add(circle);
    return group;
  };

  // Build shape mesh for a given shape + height
  const buildShapeMesh = (
    shape: { type: string; params: Record<string, any> },
    height: number,
    facadeMat: THREE.Material,
    roofMat: THREE.Material,
    floorMat: THREE.Material,
    isTopFloor: boolean
  ): THREE.Group => {
    const group = new THREE.Group();
    const p = shape.params;

    switch (shape.type) {
      case 'box': {
        const geo = new THREE.BoxGeometry(p.width || 40, height, p.length || 30);
        // [+X, -X, +Y(top), -Y(bottom), +Z, -Z]
        const materials = [facadeMat, facadeMat, isTopFloor ? roofMat : floorMat, floorMat, facadeMat, facadeMat];
        const mesh = new THREE.Mesh(geo, materials);
        mesh.position.y = height / 2;
        group.add(mesh);
        break;
      }

      case 'cylinder': {
        const geo = new THREE.CylinderGeometry(p.radius || 15, p.radius || 15, height, 32);
        // [side, top, bottom]
        const mesh = new THREE.Mesh(geo, [facadeMat, isTopFloor ? roofMat : floorMat, floorMat]);
        mesh.position.y = height / 2;
        group.add(mesh);
        break;
      }

      case 'lShape': {
        const l1 = p.l1 || 40, w1 = p.w1 || 20;
        const l2 = p.l2 || 20, w2 = p.w2 || 15;
        const dir = p.lDirection === 'left' ? -1 : 1;

        const mainGeo = new THREE.BoxGeometry(w1, height, l1);
        const mainMesh = new THREE.Mesh(mainGeo, [facadeMat, facadeMat, isTopFloor ? roofMat : floorMat, floorMat, facadeMat, facadeMat]);
        mainMesh.position.set(0, height / 2, 0);
        group.add(mainMesh);

        const extGeo = new THREE.BoxGeometry(w2, height, l2);
        const extMesh = new THREE.Mesh(extGeo, [facadeMat, facadeMat, isTopFloor ? roofMat : floorMat, floorMat, facadeMat, facadeMat]);
        extMesh.position.set(dir * (w1 / 2 + w2 / 2), height / 2, (l1 - l2) / 2);
        group.add(extMesh);
        break;
      }

      case 'tShape': {
        const l1 = p.l1 || 40, w1 = p.w1 || 15;
        const l2 = p.l2 || 30, w2 = p.w2 || 20;
        const wingPos = p.wingPosition || 'center';

        const stemGeo = new THREE.BoxGeometry(w1, height, l1);
        const stemMesh = new THREE.Mesh(stemGeo, [facadeMat, facadeMat, isTopFloor ? roofMat : floorMat, floorMat, facadeMat, facadeMat]);
        stemMesh.position.set(0, height / 2, 0);
        group.add(stemMesh);

        const wingGeo = new THREE.BoxGeometry(l2, height, w2);
        const wingMesh = new THREE.Mesh(wingGeo, [facadeMat, facadeMat, isTopFloor ? roofMat : floorMat, floorMat, facadeMat, facadeMat]);
        let wingZ = 0;
        if (wingPos === 'left') wingZ = l1 / 2 - w2 / 2;
        else if (wingPos === 'right') wingZ = -l1 / 2 + w2 / 2;
        wingMesh.position.set(0, height / 2, wingZ);
        group.add(wingMesh);
        break;
      }

      case 'arc': {
        const arcR = p.arcRadius || 30;
        const arcAngle = (p.arcAngle || 90) * Math.PI / 180;
        const depth = p.depth || 20;

        const arcShape = new THREE.Shape();
        arcShape.moveTo(arcR - depth, 0);
        arcShape.lineTo(arcR, 0);
        arcShape.absarc(0, 0, arcR, 0, arcAngle, false);
        const endX = arcR * Math.cos(arcAngle);
        const endY = arcR * Math.sin(arcAngle);
        arcShape.lineTo(endX * (arcR - depth) / arcR, endY * (arcR - depth) / arcR);
        arcShape.absarc(0, 0, arcR - depth, arcAngle, 0, true);

        const geo = new THREE.ExtrudeGeometry(arcShape, { depth: height, bevelEnabled: false });
        // ExtrudeGeometry groups: 0 = caps (top/bottom), 1 = sides (walls)
        const mesh = new THREE.Mesh(geo, [isTopFloor ? roofMat : floorMat, facadeMat]);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        break;
      }

      case 'ellipse': {
        const majorR = p.majorRadius || 25;
        const minorR = p.minorRadius || 15;

        const ellipseShape = new THREE.Shape();
        ellipseShape.ellipse(0, 0, majorR, minorR, 0, Math.PI * 2, false, 0);
        const geo = new THREE.ExtrudeGeometry(ellipseShape, { depth: height, bevelEnabled: false });
        // ExtrudeGeometry groups: 0 = caps, 1 = sides
        const mesh = new THREE.Mesh(geo, [isTopFloor ? roofMat : floorMat, facadeMat]);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        break;
      }

      case 'fan': {
        const innerR = p.innerRadius || 10;
        const outerR = p.outerRadius || 30;
        const fanAngle = (p.fanAngle || 90) * Math.PI / 180;

        const fanShape = new THREE.Shape();
        fanShape.moveTo(innerR, 0);
        fanShape.lineTo(outerR, 0);
        fanShape.absarc(0, 0, outerR, 0, fanAngle, false);
        fanShape.lineTo(innerR * Math.cos(fanAngle), innerR * Math.sin(fanAngle));
        fanShape.absarc(0, 0, innerR, fanAngle, 0, true);

        const geo = new THREE.ExtrudeGeometry(fanShape, { depth: height, bevelEnabled: false });
        // ExtrudeGeometry groups: 0 = caps, 1 = sides
        const mesh = new THREE.Mesh(geo, [isTopFloor ? roofMat : floorMat, facadeMat]);
        mesh.rotation.x = -Math.PI / 2;
        group.add(mesh);
        break;
      }

      case 'polygon': {
        const sides = p.sides || 6;
        const circumR = p.circumradius || 20;
        const startAng = (p.startAngle || 0) * Math.PI / 180;

        const geo = new THREE.CylinderGeometry(circumR, circumR, height, sides);
        // [side, top, bottom]
        const mesh = new THREE.Mesh(geo, [facadeMat, isTopFloor ? roofMat : floorMat, floorMat]);
        mesh.position.y = height / 2;
        mesh.rotation.y = startAng;
        group.add(mesh);
        break;
      }

      case 'polyline': {
        const pts = p.points;
        if (pts && pts.length >= 3) {
          const polyShape = new THREE.Shape();
          // polyline points are in XY 2D space, map to XZ in Three.js (X → X, Y → -Z)
          polyShape.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            polyShape.lineTo(pts[i].x, pts[i].y);
          }
          polyShape.closePath();

          const extH = p.extrudeHeight || height;
          const geo = new THREE.ExtrudeGeometry(polyShape, {
            depth: extH,
            bevelEnabled: false,
          });
          // ExtrudeGeometry groups: 0 = caps, 1 = sides
          const mesh = new THREE.Mesh(geo, [isTopFloor ? roofMat : floorMat, facadeMat]);
          // ExtrudeGeometry extrudes along Z by default, rotate so it goes along Y
          mesh.rotation.x = -Math.PI / 2;
          group.add(mesh);
        }
        break;
      }

      default: {
        const geo = new THREE.BoxGeometry(30, height, 30);
        const mesh = new THREE.Mesh(geo, facadeMat);
        mesh.position.y = height / 2;
        group.add(mesh);
      }
    }

    return group;
  };

  // Create a floor slab
  const createFloorSlab = (width: number, depth: number, yPos: number, isSelected: boolean) => {
    const geo = new THREE.BoxGeometry(width + 1, 0.3, depth + 1);
    const mat = new THREE.MeshPhongMaterial({
      color: isSelected ? 0x3b82f6 : 0x64748b,
      transparent: true,
      opacity: isSelected ? 0.6 : 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = yPos;
    return mesh;
  };

  // Create the "+" add floor overlay on top
  const createAddFloorOverlay = (width: number, depth: number, yPos: number) => {
    // Transparent hover plane on top of building
    const geo = new THREE.PlaneGeometry(width + 6, depth + 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yPos + 0.5;
    mesh.userData = { isAddFloorZone: true };
    return mesh;
  };

  // Create "+" sprite
  const createAddButtonSprite = (yPos: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Circle background
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Plus sign
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', 64, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(0, yPos + 4, 0);
    sprite.scale.set(8, 8, 1);
    sprite.userData = { isAddFloorButton: true };
    return sprite;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const initScene = () => {
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(initScene, 100);
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);
      sceneRef.current = scene;

      const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 2000);
      camera.position.set(100, 80, 100);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      rendererRef.current = renderer;
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.target.set(0, 22, 0);
      controls.update();
      controlsRef.current = controls;

      if (showCompass) {
        scene.add(createCompass());
      }
      scene.add(new THREE.GridHelper(200, 20, 0xcbd5e1, 0xe2e8f0));
      scene.add(new THREE.AmbientLight(0xffffff, 0.7));
      const sun = new THREE.DirectionalLight(0xffffff, 0.8);
      sun.position.set(50, 150, 50);
      scene.add(sun);

      const group = new THREE.Group();
      scene.add(group);
      objectsGroupRef.current = group;

      setSceneReady(true);

      // ===== Mouse interaction =====
      const getMouseNDC = (event: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      };

      let isHoveringRoof = false;
      const DRAG_THRESHOLD = 5; // pixels before drag starts

      const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return; // left click only
        getMouseNDC(event);
        mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
        if (!cameraRef.current || !objectsGroupRef.current) return;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);

        for (const hit of intersects) {
          // Skip add-floor zone
          if (hit.object.userData?.isAddFloorZone || hit.object.userData?.isAddFloorButton) continue;

          // Find shape data in hierarchy
          let current: THREE.Object3D | null = hit.object;
          while (current) {
            if (current.userData?.shapeId && current.userData?.floorId) {
              const floorId = current.userData.floorId;
              const shapeId = current.userData.shapeId;

              // In edit mode, only allow drag on the editing floor
              if (editingFloorIdRef.current && floorId !== editingFloorIdRef.current) {
                break; // Skip shapes not on editing floor
              }
              // In view mode (no editingFloorId), don't allow drag at all
              if (!editingFloorIdRef.current) {
                break;
              }

              // Found a shape on the editing floor - prepare for potential drag
              const hitPoint = hit.point.clone();
              dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -hitPoint.y);
              dragStartWorldRef.current.copy(hitPoint);

              let origX = 0, origZ = 0;
              const floorsData = onMoveShapeRef.current ? floors : undefined;
              if (floorsData) {
                const floor = floorsData.find(f => f.id === floorId);
                const shape = floor?.shapes.find(s => s.id === shapeId);
                if (shape) {
                  origX = shape.position.x;
                  origZ = shape.position.y;
                }
              }

              dragShapeRef.current = {
                floorId,
                shapeId,
                startX: hitPoint.x,
                startZ: hitPoint.z,
                origX,
                origZ,
              };
              return;
            }
            current = current.parent;
          }
        }
      };

      const handleMouseMove = (event: MouseEvent) => {
        getMouseNDC(event);
        if (!cameraRef.current || !objectsGroupRef.current) return;

        // === Drag logic ===
        if (dragShapeRef.current && !isDraggingRef.current) {
          // Check if mouse moved enough to start drag
          const dx = event.clientX - mouseDownPosRef.current.x;
          const dy = event.clientY - mouseDownPosRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
            isDraggingRef.current = true;
            // Disable orbit controls during drag
            if (controlsRef.current) controlsRef.current.enabled = false;
            container.style.cursor = 'grabbing';

            // Select the shape being dragged
            onSelectFloorRef.current?.(dragShapeRef.current.floorId);
            onSelectShapeRef.current?.(dragShapeRef.current.shapeId);
          }
        }

        if (isDraggingRef.current && dragShapeRef.current) {
          // Project mouse onto drag plane
          raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
          if (raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, dragIntersectRef.current)) {
            const deltaX = dragIntersectRef.current.x - dragShapeRef.current.startX;
            const deltaZ = dragIntersectRef.current.z - dragShapeRef.current.startZ;

            const newX = Math.round((dragShapeRef.current.origX + deltaX) * 10) / 10;
            const newY = Math.round((dragShapeRef.current.origZ + deltaZ) * 10) / 10; // z in 3D → y in FloorShape

            onMoveShapeRef.current?.(
              dragShapeRef.current.floorId,
              dragShapeRef.current.shapeId,
              newX,
              newY
            );
          }
          return; // Don't process hover logic during drag
        }

        // === Normal hover logic ===
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);

        let hoveringAdd = false;

        for (const hit of intersects) {
          const obj = hit.object;
          if (obj.userData?.isAddFloorZone || obj.userData?.isAddFloorButton) {
            hoveringAdd = true;
            break;
          }
        }

        if (hoveringAdd && !isHoveringRoof) {
          isHoveringRoof = true;
          container.style.cursor = 'pointer';
          if (hoverOverlayRef.current) {
            (hoverOverlayRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15;
          }
          if (addButtonSpriteRef.current) {
            (addButtonSpriteRef.current.material as THREE.SpriteMaterial).opacity = 1;
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '1';
            tooltipRef.current.style.left = `${event.clientX - container.getBoundingClientRect().left}px`;
            tooltipRef.current.style.top = `${event.clientY - container.getBoundingClientRect().top - 40}px`;
          }
        } else if (!hoveringAdd && isHoveringRoof) {
          isHoveringRoof = false;
          container.style.cursor = 'default';
          if (hoverOverlayRef.current) {
            (hoverOverlayRef.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (addButtonSpriteRef.current) {
            (addButtonSpriteRef.current.material as THREE.SpriteMaterial).opacity = 0;
          }
          if (tooltipRef.current) {
            tooltipRef.current.style.opacity = '0';
          }
        }

        if (isHoveringRoof && tooltipRef.current) {
          tooltipRef.current.style.left = `${event.clientX - container.getBoundingClientRect().left}px`;
          tooltipRef.current.style.top = `${event.clientY - container.getBoundingClientRect().top - 40}px`;
        }

        // Check for floor/shape hover for cursor
        if (!hoveringAdd) {
          let foundShape = false;
          let foundClickable = false;
          for (const hit of intersects) {
            let current: THREE.Object3D | null = hit.object;
            while (current) {
              if (current.userData?.shapeId && current.userData?.floorId) {
                // Only show grab cursor for shapes on the editing floor
                if (editingFloorIdRef.current && current.userData.floorId === editingFloorIdRef.current) {
                  foundShape = true;
                }
                foundClickable = true;
                break;
              }
              if (current.userData?.floorId) {
                foundClickable = true;
                break;
              }
              current = current.parent;
            }
            if (foundClickable) break;
          }
          container.style.cursor = foundShape ? 'grab' : (foundClickable ? 'pointer' : 'default');
        }
      };

      const handleMouseUp = (event: MouseEvent) => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          container.style.cursor = 'default';
          // Re-enable orbit controls
          if (controlsRef.current) controlsRef.current.enabled = true;
        } else {
          // Only treat as click if mouse didn't move much (not an orbit rotation)
          const dx = event.clientX - mouseDownPosRef.current.x;
          const dy = event.clientY - mouseDownPosRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) {
            handleClickLogic(event);
          }
        }
        dragShapeRef.current = null;
      };

      const handleClickLogic = (event: MouseEvent) => {
        getMouseNDC(event);
        if (!cameraRef.current || !objectsGroupRef.current) return;

        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(objectsGroupRef.current.children, true);

        for (const hit of intersects) {
          const obj = hit.object;

          // Add floor button (only in view mode)
          if (!editingFloorIdRef.current && (obj.userData?.isAddFloorZone || obj.userData?.isAddFloorButton)) {
            onAddFloorRef.current?.();
            return;
          }

          let current: THREE.Object3D | null = obj;
          while (current) {
            if (current.userData?.shapeId && current.userData?.floorId) {
              const clickedFloorId = current.userData.floorId;

              if (editingFloorIdRef.current) {
                // In edit mode: only select shapes on the editing floor
                if (clickedFloorId === editingFloorIdRef.current) {
                  onSelectShapeRef.current?.(current.userData.shapeId);
                  onSelectFloorRef.current?.(clickedFloorId);
                }
              } else {
                // In view mode: click enters edit mode for that floor
                onSelectFloorRef.current?.(clickedFloorId);
                onSelectShapeRef.current?.(current.userData.shapeId);
                onEnterEditModeRef.current?.(clickedFloorId);
              }
              return;
            }
            if (current.userData?.floorId) {
              const clickedFloorId = current.userData.floorId;
              if (editingFloorIdRef.current) {
                // In edit mode: ignore clicks on non-editing floors
                if (clickedFloorId !== editingFloorIdRef.current) break;
              } else {
                // In view mode: click enters edit mode
                onSelectFloorRef.current?.(clickedFloorId);
                onEnterEditModeRef.current?.(clickedFloorId);
              }
              return;
            }
            current = current.parent;
          }
        }

        // Clicked on empty space in edit mode → exit edit mode
        if (editingFloorIdRef.current) {
          // Don't exit on empty click, user must click the exit button
        }
      };

      renderer.domElement.addEventListener('mousedown', handleMouseDown);
      renderer.domElement.addEventListener('mousemove', handleMouseMove);
      renderer.domElement.addEventListener('mouseup', handleMouseUp);

      const animate = () => {
        requestAnimationFrame(animate);
        if (controlsRef.current) controlsRef.current.update();
        if (rendererRef.current && sceneRef.current && cameraRef.current) rendererRef.current.render(sceneRef.current, cameraRef.current);
      };
      animate();

      const handleResize = () => {
        if (!container || !rendererRef.current || !cameraRef.current) return;
        cameraRef.current.aspect = container.clientWidth / container.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener('resize', handleResize);
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    };

    const timer = setTimeout(initScene, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', () => { });
      if (rendererRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(rendererRef.current.domElement);
        } catch (e) { }
        rendererRef.current.dispose();
      }
    };
  }, [showCompass]);

  const [sceneReady, setSceneReady] = React.useState(false);

  // Render floors-based building
  useEffect(() => {
    if (!sceneReady || !objectsGroupRef.current) return;
    objectsGroupRef.current.clear();
    hoverOverlayRef.current = null;
    addButtonSpriteRef.current = null;

    if (floors && floors.length > 0) {
      let yOffset = 0;
      let maxBuildingW = 40, maxBuildingD = 30;

      floors.forEach((floor, floorIndex) => {
        const isSelectedFloor = floor.id === selectedFloorId;
        const isTopFloor = floorIndex === floors.length - 1;
        const isEditingFloor = editingFloorId === floor.id;
        const isNonEditingInEditMode = editingFloorId != null && !isEditingFloor;
        const floorGroup = new THREE.Group();
        floorGroup.position.y = yOffset;
        floorGroup.userData = { floorId: floor.id };

        let maxW = 0, maxD = 0;
        floor.shapes.forEach(shape => {
          const p = shape.params;
          const w = p.width || p.l1 || (p.radius ? p.radius * 2 : 0) || (p.majorRadius ? p.majorRadius * 2 : 0) || (p.outerRadius ? p.outerRadius * 2 : 0) || 40;
          const d = p.length || p.w1 || (p.radius ? p.radius * 2 : 0) || (p.minorRadius ? p.minorRadius * 2 : 0) || (p.outerRadius ? p.outerRadius * 2 : 0) || 30;
          maxW = Math.max(maxW, w);
          maxD = Math.max(maxD, d);
        });
        if (maxW === 0) maxW = 40;
        if (maxD === 0) maxD = 30;
        maxBuildingW = Math.max(maxBuildingW, maxW);
        maxBuildingD = Math.max(maxBuildingD, maxD);

        // Floor slab
        const slab = createFloorSlab(maxW, maxD, 0, isSelectedFloor && !isNonEditingInEditMode);
        slab.userData = { floorId: floor.id };
        if (isNonEditingInEditMode) {
          slab.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshPhongMaterial;
              mat.transparent = true;
              mat.opacity = 0.12;
              mat.depthWrite = false;
            }
          });
        }
        floorGroup.add(slab);

        // Shapes
        floor.shapes.forEach(shape => {
          const wwr = floor.wwr || shape.params.wwr || 0.3;
          const shadingType = shape.params.shadingType || 'None';
          const texture = createFacadeTexture(wwr, shadingType);
          const isSelectedShape = shape.id === selectedShapeId;

          const facadeColor = isSelectedFloor
            ? (isSelectedShape ? 0xbfdbfe : 0xdbeafe)
            : 0xffffff;
          const facadeMat = new THREE.MeshPhongMaterial({ map: texture, color: facadeColor });
          const roofMat = new THREE.MeshPhongMaterial({ color: isTopFloor ? 0x94a3b8 : 0xadb5bd, flatShading: true });
          const floorMat = new THREE.MeshPhongMaterial({ color: isSelectedFloor ? 0xdbeafe : 0xe2e8f0, flatShading: true });

          const shapeGroup = buildShapeMesh({ type: shape.type, params: shape.params }, floor.floorHeight, facadeMat, roofMat, floorMat, isTopFloor);
          shapeGroup.userData = { floorId: floor.id, shapeId: shape.id };

          // Tag all children with userData for raycasting
          shapeGroup.traverse((child) => {
            child.userData = { ...child.userData, floorId: floor.id, shapeId: shape.id };
          });

          shapeGroup.position.x = shape.position.x;
          shapeGroup.position.z = shape.position.y;
          shapeGroup.rotation.y = -(shape.rotation * Math.PI) / 180;

          // Make non-editing floor shapes transparent
          if (isNonEditingInEditMode) {
            shapeGroup.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach((mat: THREE.Material) => {
                  if (mat instanceof THREE.MeshPhongMaterial) {
                    mat.transparent = true;
                    mat.opacity = 0.12;
                    mat.depthWrite = false;
                  }
                });
              }
            });
          }

          // Wireframe for selected shape (only on editing floor or in view mode)
          if (isSelectedShape && !isNonEditingInEditMode) {
            shapeGroup.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                const wireGeo = new THREE.EdgesGeometry(child.geometry);
                const wireMat = new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 });
                const wireframe = new THREE.LineSegments(wireGeo, wireMat);
                wireframe.position.copy(child.position);
                wireframe.rotation.copy(child.rotation);
                shapeGroup.add(wireframe);
              }
            });
          }

          floorGroup.add(shapeGroup);
        });

        // Floor label
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        const ctx = labelCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = isSelectedFloor ? '#3b82f6' : '#64748b';
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(floor.name, 64, 32);
          const labelTex = new THREE.CanvasTexture(labelCanvas);
          const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
          const sprite = new THREE.Sprite(labelMat);
          sprite.position.set(-(maxW / 2 + 8), floor.floorHeight / 2, 0);
          sprite.scale.set(12, 6, 1);
          floorGroup.add(sprite);
        }

        objectsGroupRef.current?.add(floorGroup);
        yOffset += floor.floorHeight;
      });

      // Add floor overlay on top of building (interactive "+" zone)
      const totalHeight = yOffset;
      const overlay = createAddFloorOverlay(maxBuildingW, maxBuildingD, totalHeight);
      objectsGroupRef.current.add(overlay);
      hoverOverlayRef.current = overlay;

      const addBtn = createAddButtonSprite(totalHeight);
      if (addBtn) {
        objectsGroupRef.current.add(addBtn);
        addButtonSpriteRef.current = addBtn;
      }

      // Update camera target
      if (controlsRef.current) {
        controlsRef.current.target.set(0, totalHeight / 2, 0);
        controlsRef.current.update();
      }

    } else {
      // Legacy mode
      objects.forEach(obj => {
        const p = obj.params;
        const wwr = p.wwr || 0.3;
        const shadingType = p.shadingType || 'None';
        const texture = createFacadeTexture(wwr, shadingType);
        const facadeMat = new THREE.MeshPhongMaterial({ map: texture, color: 0xffffff });
        const roofMat = new THREE.MeshPhongMaterial({ color: 0x94a3b8, flatShading: true });
        const floorMat = new THREE.MeshPhongMaterial({ color: 0xe2e8f0, flatShading: true });

        const shapeGroup = buildShapeMesh({ type: obj.type, params: obj.params }, obj.params.height, facadeMat, roofMat, floorMat, true);
        shapeGroup.rotation.y = -(p.azimuth * Math.PI) / 180;
        objectsGroupRef.current?.add(shapeGroup);
      });
    }
  }, [objects, floors, selectedFloorId, selectedShapeId, editingFloorId, sceneReady]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-50">
      {/* Orientation label */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-[10px] font-black text-slate-500 border border-slate-200 shadow-sm pointer-events-none z-10">
        {lang === 'zh' ? '方位：指北向上' : 'ORIENTATION: NORTH UP'}
      </div>
      {/* Hover tooltip for add floor */}
      <div
        ref={tooltipRef}
        className="absolute z-30 pointer-events-none transition-opacity duration-150"
        style={{ opacity: 0, transform: 'translateX(-50%)' }}
      >
        <div className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-black shadow-xl whitespace-nowrap flex items-center gap-1.5">
          <span className="text-base">+</span>
          <span>{lang === 'zh' ? '點擊新增樓層' : 'Click to add floor'}</span>
        </div>
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-blue-600 mx-auto" />
      </div>

      {/* Edit Mode indicator + exit button */}
      {editingFloorId && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          <div className="bg-blue-600/90 backdrop-blur-xl text-white px-4 py-2 rounded-xl shadow-xl border border-blue-500/30 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wide">
                {lang === 'zh' ? '編輯模式' : 'EDIT MODE'}
              </span>
              <span className="text-[10px] font-bold text-blue-200">
                {floors?.find(f => f.id === editingFloorId)?.name || ''}
              </span>
            </div>
            <div className="w-px h-5 bg-white/20" />
            <span className="text-[9px] text-blue-200">
              {lang === 'zh' ? '可拖曳移動形狀位置' : 'Drag shapes to reposition'}
            </span>
            <button
              onClick={onExitEditMode}
              className="ml-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-black uppercase tracking-wide transition-all border border-white/20"
            >
              {lang === 'zh' ? '✓ 完成編輯' : '✓ Done'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDViewer;
