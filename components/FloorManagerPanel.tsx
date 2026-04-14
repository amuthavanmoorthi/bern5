import React, { useState } from 'react';
import { Floor, FloorShape, GeometryType, LShapeDirection, TShapeWingPosition, PolylinePoint } from '../types';

interface FloorManagerPanelProps {
  floors: Floor[];
  onFloorsChange: (floors: Floor[]) => void;
  selectedFloorId: string | null;
  onSelectFloor: (floorId: string | null) => void;
  selectedShapeId: string | null;
  onSelectShape: (shapeId: string | null) => void;
  onEnterTopView?: (floorId: string) => void;
  lang: 'zh' | 'en';
}

const GEOMETRY_LABELS: Record<GeometryType, { zh: string; en: string }> = {
  box: { zh: '長方體', en: 'Box' },
  lShape: { zh: 'L形複合體', en: 'L-Shape' },
  tShape: { zh: 'T形複合體', en: 'T-Shape' },
  cylinder: { zh: '圓柱體', en: 'Cylinder' },
  arc: { zh: '圓弧拉伸體', en: 'Arc' },
  ellipse: { zh: '橢圓柱', en: 'Ellipse' },
  fan: { zh: '扇形拉伸', en: 'Fan' },
  polygon: { zh: '多邊形棱柱', en: 'Polygon' },
  polyline: { zh: '自訂輪廓', en: 'Polyline' },
};

let shapeCounter = 100;
let floorCounter = 100;

const createDefaultShape = (): FloorShape => ({
  id: `shape-${Date.now()}-${shapeCounter++}`,
  type: 'box',
  params: { width: 40, length: 30, wwr: 0.35, glassType: 'Double', shadingType: 'None' },
  position: { x: 0, y: 0 },
  rotation: 0,
});

// Helpers for polyline shapes
const calcPolyArea = (pts: PolylinePoint[]): number => {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
};

const FloorManagerPanel: React.FC<FloorManagerPanelProps> = ({
  floors,
  onFloorsChange,
  selectedFloorId,
  onSelectFloor,
  selectedShapeId,
  onSelectShape,
  onEnterTopView,
  lang,
}) => {
  const t = lang === 'zh';
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set(floors.map(f => f.id)));

  const inputClass = "p-1.5 bg-white/10 border border-white/10 rounded-lg text-[11px] font-bold text-white focus:bg-white focus:text-slate-900 outline-none transition-all text-center w-full";
  const labelClass = "text-[8px] font-black text-slate-400 uppercase tracking-wide";
  const btnSmClass = "w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all hover:scale-105 active:scale-95";

  // Floor operations
  const addFloor = () => {
    const newFloor: Floor = {
      id: `floor-${Date.now()}-${floorCounter++}`,
      name: `${floors.length + 1}F`,
      floorHeight: 3.5,
      wwr: 0.35,
      shapes: [createDefaultShape()],
    };
    const updated = [...floors, newFloor];
    onFloorsChange(updated);
    onSelectFloor(newFloor.id);
    setExpandedFloors(prev => new Set([...prev, newFloor.id]));
  };

  const deleteFloor = (floorId: string) => {
    if (floors.length <= 1) return;
    const updated = floors.filter(f => f.id !== floorId);
    onFloorsChange(updated);
    if (selectedFloorId === floorId) {
      onSelectFloor(updated[0]?.id || null);
      onSelectShape(null);
    }
  };

  const duplicateFloor = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;
    const newId = `floor-${Date.now()}-${floorCounter++}`;
    const newFloor: Floor = {
      ...floor,
      id: newId,
      name: `${floors.length + 1}F`,
      shapes: floor.shapes.map(s => ({
        ...s,
        id: `shape-${Date.now()}-${shapeCounter++}`,
        params: { ...s.params },
        position: { ...s.position },
      })),
    };
    const idx = floors.findIndex(f => f.id === floorId);
    const updated = [...floors];
    updated.splice(idx + 1, 0, newFloor);
    // Re-name floors
    updated.forEach((f, i) => {
      if (!f.name.startsWith('B')) f.name = `${i + 1}F`;
    });
    onFloorsChange(updated);
    onSelectFloor(newId);
    setExpandedFloors(prev => new Set([...prev, newId]));
  };

  // Copy all shapes & params from this floor to the floor above
  const copyShapesToFloorAbove = (floorId: string) => {
    const idx = floors.findIndex(f => f.id === floorId);
    if (idx < 0 || idx >= floors.length - 1) return; // No floor above
    const sourceFloor = floors[idx];
    const targetFloorId = floors[idx + 1].id;

    const copiedShapes = sourceFloor.shapes.map(s => ({
      ...s,
      id: `shape-${Date.now()}-${shapeCounter++}`,
      params: { ...s.params },
      position: { ...s.position },
    }));

    const updated = floors.map(f =>
      f.id === targetFloorId
        ? { ...f, wwr: sourceFloor.wwr, shapes: copiedShapes }
        : f
    );
    onFloorsChange(updated);
    onSelectFloor(targetFloorId);
    setExpandedFloors(prev => new Set([...prev, targetFloorId]));
  };

  const updateFloor = (floorId: string, updates: Partial<Floor>) => {
    onFloorsChange(floors.map(f => f.id === floorId ? { ...f, ...updates } : f));
  };

  const moveFloor = (floorId: string, direction: 'up' | 'down') => {
    const idx = floors.findIndex(f => f.id === floorId);
    if (direction === 'up' && idx > 0) {
      const updated = [...floors];
      [updated[idx], updated[idx - 1]] = [updated[idx - 1], updated[idx]];
      onFloorsChange(updated);
    } else if (direction === 'down' && idx < floors.length - 1) {
      const updated = [...floors];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      onFloorsChange(updated);
    }
  };

  // Shape operations
  const addShape = (floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    const shape = createDefaultShape();
    // Inherit floor-level wwr
    shape.params.wwr = floor?.wwr || 0.35;
    onFloorsChange(floors.map(f =>
      f.id === floorId ? { ...f, shapes: [...f.shapes, shape] } : f
    ));
    onSelectShape(shape.id);
  };

  const deleteShape = (floorId: string, shapeId: string) => {
    onFloorsChange(floors.map(f => {
      if (f.id !== floorId) return f;
      if (f.shapes.length <= 1) return f; // Keep at least one shape
      return { ...f, shapes: f.shapes.filter(s => s.id !== shapeId) };
    }));
    if (selectedShapeId === shapeId) onSelectShape(null);
  };

  const duplicateShape = (floorId: string, shapeId: string) => {
    const floor = floors.find(f => f.id === floorId);
    const shape = floor?.shapes.find(s => s.id === shapeId);
    if (!shape) return;
    const newShape: FloorShape = {
      ...shape,
      id: `shape-${Date.now()}-${shapeCounter++}`,
      params: { ...shape.params },
      position: { x: shape.position.x + 5, y: shape.position.y + 5 },
    };
    onFloorsChange(floors.map(f =>
      f.id === floorId ? { ...f, shapes: [...f.shapes, newShape] } : f
    ));
    onSelectShape(newShape.id);
  };

  const updateShape = (floorId: string, shapeId: string, updates: Partial<FloorShape>) => {
    onFloorsChange(floors.map(f =>
      f.id === floorId ? {
        ...f,
        shapes: f.shapes.map(s =>
          s.id === shapeId ? { ...s, ...updates } : s
        )
      } : f
    ));
  };

  const updateShapeParams = (floorId: string, shapeId: string, paramUpdates: Partial<FloorShape['params']>) => {
    onFloorsChange(floors.map(f =>
      f.id === floorId ? {
        ...f,
        shapes: f.shapes.map(s =>
          s.id === shapeId ? { ...s, params: { ...s.params, ...paramUpdates } } : s
        )
      } : f
    ));
  };

  const toggleExpand = (floorId: string) => {
    setExpandedFloors(prev => {
      const next = new Set(prev);
      if (next.has(floorId)) next.delete(floorId);
      else next.add(floorId);
      return next;
    });
  };

  // Render shape-specific parameter inputs
  const renderShapeParams = (floorId: string, shape: FloorShape) => {
    const p = shape.params;
    const update = (u: Partial<FloorShape['params']>) => updateShapeParams(floorId, shape.id, u);

    const numInput = (label: string, value: number, key: string, min?: number, max?: number, step?: number) => (
      <div className="space-y-0.5">
        <label className={labelClass}>{label}</label>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step || 1}
          onChange={(e) => update({ [key]: parseFloat(e.target.value) || 0 })}
          className={inputClass}
        />
      </div>
    );

    switch (shape.type) {
      case 'box':
        return (
          <>
            {numInput(t ? '長度 (L)' : 'Length', p.length || 30, 'length', 1)}
            {numInput(t ? '寬度 (W)' : 'Width', p.width || 40, 'width', 1)}
          </>
        );
      case 'cylinder':
        return numInput(t ? '半徑 (R)' : 'Radius', p.radius || 15, 'radius', 1);
      case 'lShape':
        return (
          <>
            {numInput(t ? '主體長度 L1' : 'L1', p.l1 || 40, 'l1', 1)}
            {numInput(t ? '主體寬度 W1' : 'W1', p.w1 || 20, 'w1', 1)}
            {numInput(t ? '次體長度 L2' : 'L2', p.l2 || 20, 'l2', 1)}
            {numInput(t ? '次體寬度 W2' : 'W2', p.w2 || 15, 'w2', 1)}
            <div className="space-y-0.5">
              <label className={labelClass}>{t ? '轉折方向' : 'Direction'}</label>
              <select
                value={p.lDirection || 'right'}
                onChange={(e) => update({ lDirection: e.target.value as LShapeDirection })}
                className={inputClass}
              >
                <option value="left">{t ? '左' : 'Left'}</option>
                <option value="right">{t ? '右' : 'Right'}</option>
              </select>
            </div>
          </>
        );
      case 'tShape':
        return (
          <>
            {numInput(t ? '主幹長度 L1' : 'L1', p.l1 || 40, 'l1', 1)}
            {numInput(t ? '主幹寬度 W1' : 'W1', p.w1 || 15, 'w1', 1)}
            {numInput(t ? '翼部長度 L2' : 'L2', p.l2 || 30, 'l2', 1)}
            {numInput(t ? '翼部寬度 W2' : 'W2', p.w2 || 20, 'w2', 1)}
            <div className="space-y-0.5">
              <label className={labelClass}>{t ? '翼部位置' : 'Wing Pos'}</label>
              <select
                value={p.wingPosition || 'center'}
                onChange={(e) => update({ wingPosition: e.target.value as TShapeWingPosition })}
                className={inputClass}
              >
                <option value="center">{t ? '中央' : 'Center'}</option>
                <option value="left">{t ? '左側' : 'Left'}</option>
                <option value="right">{t ? '右側' : 'Right'}</option>
              </select>
            </div>
          </>
        );
      case 'arc':
        return (
          <>
            {numInput(t ? '圓弧半徑' : 'Arc R', p.arcRadius || 30, 'arcRadius', 1)}
            {numInput(t ? '圓弧角度°' : 'Arc Angle°', p.arcAngle || 90, 'arcAngle', 1, 360)}
            {numInput(t ? '拉伸深度' : 'Depth', p.depth || 20, 'depth', 1)}
          </>
        );
      case 'ellipse':
        return (
          <>
            {numInput(t ? '長軸半徑' : 'Major R', p.majorRadius || 25, 'majorRadius', 1)}
            {numInput(t ? '短軸半徑' : 'Minor R', p.minorRadius || 15, 'minorRadius', 1)}
          </>
        );
      case 'fan':
        return (
          <>
            {numInput(t ? '內半徑' : 'Inner R', p.innerRadius || 10, 'innerRadius', 0)}
            {numInput(t ? '外半徑' : 'Outer R', p.outerRadius || 30, 'outerRadius', 1)}
            {numInput(t ? '扇形角度°' : 'Angle°', p.fanAngle || 90, 'fanAngle', 1, 360)}
          </>
        );
      case 'polygon':
        return (
          <>
            <div className="space-y-0.5">
              <label className={labelClass}>{t ? '邊數' : 'Sides'}</label>
              <select
                value={p.sides || 6}
                onChange={(e) => update({ sides: parseInt(e.target.value) })}
                className={inputClass}
              >
                {[4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={n}>{n}{t ? '邊' : ' sides'}</option>
                ))}
              </select>
            </div>
            {numInput(t ? '外接圓R' : 'Circumradius', p.circumradius || 20, 'circumradius', 1)}
            {numInput(t ? '起始角度°' : 'Start Angle°', p.startAngle || 0, 'startAngle', 0, 360)}
          </>
        );
      case 'polyline':
        return (
          <>
            {p.points && p.isClosed && (
              <div className="col-span-3 space-y-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-emerald-400 font-bold">{t ? '面積' : 'Area'}: {calcPolyArea(p.points).toFixed(1)} m²</span>
                  <span className="text-slate-400 font-bold">{p.points.length} {t ? '節點' : 'nodes'}</span>
                </div>
              </div>
            )}
            {numInput(t ? '擠出高度' : 'Extrude H', p.extrudeHeight || 3.5, 'extrudeHeight', 0.5)}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="text-white overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-black tracking-tight">
            {t ? '🏢 樓層建模' : '🏢 Floor Modeling'}
          </h3>
          <p className="text-[9px] text-slate-400 font-bold">
            {t ? `${floors.length} 層 · ${floors.reduce((s, f) => s + f.shapes.length, 0)} 形狀` : `${floors.length} floors · ${floors.reduce((s, f) => s + f.shapes.length, 0)} shapes`}
          </p>
        </div>
        <button
          onClick={addFloor}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/30"
        >
          + {t ? '新增樓層' : 'Add Floor'}
        </button>
      </div>

      {/* Floor List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {[...floors].reverse().map((floor, reverseIdx) => {
          const floorIdx = floors.length - 1 - reverseIdx;
          const isExpanded = expandedFloors.has(floor.id);
          const isSelected = floor.id === selectedFloorId;

          return (
            <div
              key={floor.id}
              className={`rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              }`}
            >
              {/* Floor Header */}
              <div
                className="p-2.5 flex items-center gap-2 cursor-pointer select-none"
                onClick={() => {
                  onSelectFloor(floor.id);
                  onSelectShape(null);
                  toggleExpand(floor.id);
                }}
              >
                {/* Expand arrow */}
                <span className={`text-[10px] text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>

                {/* Floor name */}
                <input
                  value={floor.name}
                  onChange={(e) => updateFloor(floor.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-transparent border-none text-sm font-black text-white w-16 outline-none focus:bg-white/10 rounded px-1 transition-all"
                />

                {/* Floor height */}
                <div className="flex items-center gap-1 ml-auto mr-2">
                  <span className="text-[8px] text-slate-500 font-bold">H:</span>
                  <input
                    type="number"
                    value={floor.floorHeight}
                    step={0.1}
                    min={2}
                    max={10}
                    onChange={(e) => updateFloor(floor.id, { floorHeight: parseFloat(e.target.value) || 3.5 })}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white/5 border border-white/10 rounded text-[10px] font-bold text-white w-12 text-center outline-none focus:bg-white/10 py-0.5"
                  />
                  <span className="text-[8px] text-slate-500">m</span>
                </div>

                {/* Floor WWR compact */}
                <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[8px] text-orange-400 font-bold">{((floor.wwr || 0.35) * 100).toFixed(0)}%</span>
                </div>

                {/* Floor actions */}
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => moveFloor(floor.id, 'up')} className={`${btnSmClass} bg-white/5 text-slate-400 hover:bg-white/10 ${floorIdx === 0 ? 'opacity-30 pointer-events-none' : ''}`} title={t ? '下移' : 'Move Down'}>↓</button>
                  <button onClick={() => moveFloor(floor.id, 'down')} className={`${btnSmClass} bg-white/5 text-slate-400 hover:bg-white/10 ${floorIdx === floors.length - 1 ? 'opacity-30 pointer-events-none' : ''}`} title={t ? '上移' : 'Move Up'}>↑</button>
                  <button onClick={() => duplicateFloor(floor.id)} className={`${btnSmClass} bg-white/5 text-blue-400 hover:bg-blue-600/20`} title={t ? '複製樓層' : 'Duplicate Floor'}>⧉</button>
                  <button onClick={() => deleteFloor(floor.id)} className={`${btnSmClass} bg-white/5 text-red-400 hover:bg-red-600/20 ${floors.length <= 1 ? 'opacity-30 pointer-events-none' : ''}`} title={t ? '刪除樓層' : 'Delete Floor'}>✕</button>
                  {/* Top View button */}
                  {onEnterTopView && (
                    <button
                      onClick={() => onEnterTopView(floor.id)}
                      className={`${btnSmClass} bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 !w-auto !px-2 text-[9px] font-black`}
                      title={t ? '俯視畫圖' : 'Top View'}
                    >
                      📐
                    </button>
                  )}
                </div>
              </div>

              {/* Shapes List (Expanded) */}
              {isExpanded && (
                <div className="px-2.5 pb-2.5 space-y-2 animate-in slide-in-from-top-1 duration-200">
                  {/* Floor-level WWR control */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <span className="text-[9px] font-black text-orange-400 shrink-0">{t ? '開窗率' : 'WWR'}</span>
                    <input
                      type="range"
                      min={5}
                      max={90}
                      step={1}
                      value={(floor.wwr || 0.35) * 100}
                      onChange={(e) => {
                        const newWwr = parseInt(e.target.value) / 100;
                        // Update floor wwr AND all shapes' wwr on this floor
                        const updatedFloors = floors.map(f =>
                          f.id === floor.id
                            ? {
                                ...f,
                                wwr: newWwr,
                                shapes: f.shapes.map(s => ({
                                  ...s,
                                  params: { ...s.params, wwr: newWwr }
                                }))
                              }
                            : f
                        );
                        onFloorsChange(updatedFloors);
                      }}
                      className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-orange-500"
                    />
                    <span className="text-[10px] font-black text-orange-300 min-w-[32px] text-right">
                      {((floor.wwr || 0.35) * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Copy shapes to floor above */}
                  {floorIdx < floors.length - 1 && (
                    <button
                      onClick={() => copyShapesToFloorAbove(floor.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-amber-400"
                    >
                      <span className="text-sm">⬆</span>
                      <span className="text-[9px] font-black uppercase tracking-wide">
                        {t ? `複製形狀至 ${floors[floorIdx + 1]?.name}` : `Copy shapes to ${floors[floorIdx + 1]?.name}`}
                      </span>
                    </button>
                  )}

                  {floor.shapes.map((shape, shapeIdx) => {
                    const isShapeSelected = shape.id === selectedShapeId;
                    return (
                      <div
                        key={shape.id}
                        className={`rounded-lg border p-2.5 transition-all cursor-pointer ${
                          isShapeSelected
                            ? 'border-blue-400/40 bg-blue-900/20'
                            : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                        }`}
                        onClick={() => {
                          onSelectFloor(floor.id);
                          onSelectShape(shape.id);
                        }}
                      >
                        {/* Shape header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-500">#{shapeIdx + 1}</span>
                            <select
                              value={shape.type}
                              onChange={(e) => updateShape(floor.id, shape.id, { type: e.target.value as GeometryType })}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white px-2 py-1 outline-none focus:bg-white/10 cursor-pointer"
                            >
                              {Object.entries(GEOMETRY_LABELS).map(([val, lbl]) => (
                                <option key={val} value={val}>{t ? lbl.zh : lbl.en}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => duplicateShape(floor.id, shape.id)} className={`${btnSmClass} bg-white/5 text-blue-400 hover:bg-blue-600/20 !w-6 !h-6 text-[10px]`} title={t ? '複製' : 'Copy'}>⧉</button>
                            <button onClick={() => deleteShape(floor.id, shape.id)} className={`${btnSmClass} bg-white/5 text-red-400 hover:bg-red-600/20 !w-6 !h-6 text-[10px] ${floor.shapes.length <= 1 ? 'opacity-30 pointer-events-none' : ''}`} title={t ? '刪除' : 'Del'}>✕</button>
                          </div>
                        </div>

                        {/* Shape params grid */}
                        {isShapeSelected && (
                          <div className="space-y-2 animate-in fade-in duration-200">
                            {/* Geometry params */}
                            <div className="grid grid-cols-3 gap-2">
                              {renderShapeParams(floor.id, shape)}
                            </div>

                            {/* Position & Rotation */}
                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-purple-400 uppercase">X</label>
                                <input
                                  type="number"
                                  value={shape.position.x}
                                  onChange={(e) => updateShape(floor.id, shape.id, {
                                    position: { ...shape.position, x: parseFloat(e.target.value) || 0 }
                                  })}
                                  onClick={(e) => e.stopPropagation()}
                                  className={inputClass}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-purple-400 uppercase">Y</label>
                                <input
                                  type="number"
                                  value={shape.position.y}
                                  onChange={(e) => updateShape(floor.id, shape.id, {
                                    position: { ...shape.position, y: parseFloat(e.target.value) || 0 }
                                  })}
                                  onClick={(e) => e.stopPropagation()}
                                  className={inputClass}
                                />
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-orange-400 uppercase">{t ? '旋轉°' : 'Rot°'}</label>
                                <input
                                  type="number"
                                  value={shape.rotation}
                                  onChange={(e) => updateShape(floor.id, shape.id, {
                                    rotation: parseFloat(e.target.value) || 0
                                  })}
                                  onClick={(e) => e.stopPropagation()}
                                  className={inputClass}
                                />
                              </div>
                            </div>


                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add shape button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); addShape(floor.id); }}
                    className="w-full py-2 border border-dashed border-white/10 rounded-lg text-[10px] font-black text-slate-400 hover:text-white hover:border-blue-500/30 hover:bg-blue-600/5 transition-all uppercase tracking-wide"
                  >
                    + {t ? '新增形狀' : 'Add Shape'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FloorManagerPanel;
