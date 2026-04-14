import React, { useState } from 'react';
import {
    USE_CATEGORIES,
    EUI_TABLE,
    ES_TABLE,
    CLIMATE_REGIONS,
    getDisplayName,
    UseCategoryId,
} from '../data/bersnConfig';
import { ExemptArea, ExemptReason } from '../types';

interface ProjectSettingsPanelProps {
    lang: 'zh' | 'en';
    projectName: string;
    onProjectNameChange: (name: string) => void;
    selectedRegion: string;
    onRegionChange: (id: string) => void;
    selectedUseCategory: UseCategoryId;
    onUseCategoryChange: (id: UseCategoryId) => void;
    totalFloorArea: number;
    onTotalFloorAreaChange: (area: number) => void;
    exemptAreas: ExemptArea[];
    onExemptAreasChange: (areas: ExemptArea[]) => void;
}

const EXEMPT_REASONS: { id: ExemptReason; zh: string; en: string }[] = [
    { id: 'outdoor', zh: '室外樓地板', en: 'Outdoor Floor' },
    { id: 'shelter', zh: '防空避難', en: 'Civil Defense Shelter' },
    { id: 'parking', zh: '室內停車', en: 'Indoor Parking' },
    { id: 'storage', zh: '儲藏/設備空間 (≥100m², 無空調)', en: 'Storage/Equipment (≥100m², No AC)' },
];

const ProjectSettingsPanel: React.FC<ProjectSettingsPanelProps> = ({
    lang,
    projectName,
    onProjectNameChange,
    selectedRegion,
    onRegionChange,
    selectedUseCategory,
    onUseCategoryChange,
    totalFloorArea,
    onTotalFloorAreaChange,
    exemptAreas,
    onExemptAreasChange,
}) => {
    const t = lang === 'zh';
    const euiData = EUI_TABLE[selectedUseCategory];
    const esValue = ES_TABLE[selectedUseCategory];
    const regionData = CLIMATE_REGIONS.find(r => r.id === selectedRegion);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newZone, setNewZone] = useState({ name: '', reason: 'outdoor' as ExemptReason, area: 0 });

    // Calculate AFe = AF - Σ Afk
    const totalExemptArea = exemptAreas.reduce((sum, zone) => sum + zone.area, 0);
    const effectiveFloorArea = totalFloorArea - totalExemptArea;

    const handleAddZone = () => {
        if (newZone.name && newZone.area > 0) {
            // Validate storage must be >= 100m²
            if (newZone.reason === 'storage' && newZone.area < 100) {
                return; // Ignore if storage < 100m²
            }
            const zone: ExemptArea = {
                id: `zone-${Date.now()}`,
                name: newZone.name,
                reason: newZone.reason,
                area: newZone.area,
            };
            onExemptAreasChange([...exemptAreas, zone]);
            setNewZone({ name: '', reason: 'outdoor', area: 0 });
            setShowAddModal(false);
        }
    };

    const handleRemoveZone = (id: string) => {
        onExemptAreasChange(exemptAreas.filter(z => z.id !== id));
    };

    const getReasonLabel = (reason: ExemptReason) => {
        const found = EXEMPT_REASONS.find(r => r.id === reason);
        return found ? (t ? found.zh : found.en) : reason;
    };

    const sectionClass = "bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2";
    const titleClass = "text-[10px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-2";
    const labelClass = "text-[8px] font-black text-slate-400 uppercase";
    const inputClass = "w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-400";

    return (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 custom-scrollbar">
            {/* Project Name */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {t ? '專案名稱' : 'Project Name'}
                </h3>
                <input
                    type="text"
                    value={projectName}
                    onChange={(e) => onProjectNameChange(e.target.value)}
                    className={inputClass}
                    placeholder={t ? '輸入專案名稱' : 'Enter project name'}
                />
            </section>

            {/* Region Selection */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    {t ? '氣候分區' : 'Climate Region'}
                </h3>
                <select
                    value={selectedRegion}
                    onChange={(e) => onRegionChange(e.target.value)}
                    className={inputClass}
                >
                    {CLIMATE_REGIONS.map(region => (
                        <option key={region.id} value={region.id}>
                            {getDisplayName(region, lang)}
                        </option>
                    ))}
                </select>
                <div className="flex justify-between items-center p-1.5 bg-emerald-50 rounded-lg">
                    <span className="text-[8px] font-black text-emerald-600">
                        UR ({t ? '區域係數' : 'Region Coef.'})
                    </span>
                    <span className="text-[10px] font-black text-emerald-700">
                        {regionData?.ur || 1.0}
                    </span>
                </div>
            </section>

            {/* Use Category */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    {t ? '建築用途類別' : 'Building Use Category'}
                </h3>
                <select
                    value={selectedUseCategory}
                    onChange={(e) => onUseCategoryChange(e.target.value as UseCategoryId)}
                    className={inputClass}
                >
                    {USE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {getDisplayName(cat, lang)}
                        </option>
                    ))}
                </select>

                {/* EUI Display */}
                <div className="grid grid-cols-3 gap-1 mt-2">
                    <div className="text-center p-1.5 bg-blue-50 rounded-lg">
                        <div className="text-[7px] font-black text-blue-400 uppercase">AEUI</div>
                        <div className="text-[11px] font-black text-blue-600">{euiData.AEUI}</div>
                        <div className="text-[6px] text-blue-400">kWh/m²·yr</div>
                    </div>
                    <div className="text-center p-1.5 bg-emerald-50 rounded-lg">
                        <div className="text-[7px] font-black text-emerald-400 uppercase">LEUI</div>
                        <div className="text-[11px] font-black text-emerald-600">{euiData.LEUI}</div>
                        <div className="text-[6px] text-emerald-400">kWh/m²·yr</div>
                    </div>
                    <div className="text-center p-1.5 bg-orange-50 rounded-lg">
                        <div className="text-[7px] font-black text-orange-400 uppercase">EEUI</div>
                        <div className="text-[11px] font-black text-orange-600">{euiData.EEUI}</div>
                        <div className="text-[6px] text-orange-400">kWh/m²·yr</div>
                    </div>
                </div>

                {/* Es Display */}
                <div className="flex justify-between items-center p-1.5 bg-slate-100 rounded-lg">
                    <span className="text-[8px] font-black text-slate-500">
                        Es ({t ? '水耗標準' : 'Water Standard'})
                    </span>
                    <span className="text-[10px] font-black text-slate-700">{esValue.toFixed(2)}</span>
                </div>
            </section>

            {/* Total Floor Area */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                    {t ? '總樓地板面積 (AF)' : 'Total Floor Area (AF)'}
                    <span className="ml-auto text-[7px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                        {t ? '自動計算' : 'Auto'}
                    </span>
                </h3>
                <div className="flex items-center gap-2">
                    <div className={inputClass + " flex-1 bg-amber-50 border-amber-200 text-amber-700"}>
                        {totalFloorArea.toLocaleString()}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">m²</span>
                </div>
                <p className="text-[7px] text-slate-400 mt-1">
                    {t ? '※ 依據 3D 幾何計算（屋頂面積 × 樓層數）自動更新' : '※ Auto-synced from 3D geometry (roof area × floors)'}
                </p>
            </section>

            {/* Exempt Zone Calculation */}
            <section className={sectionClass + " border-purple-200 bg-purple-50/30"}>
                <div className="flex justify-between items-center">
                    <h3 className={titleClass}>
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        {t ? '免評估分區計算' : 'Exempt Zone Calculation'}
                    </h3>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="text-[8px] font-black text-white bg-purple-500 hover:bg-purple-600 px-2 py-1 rounded-lg transition-colors"
                    >
                        + {t ? '新增分區' : 'Add Zone'}
                    </button>
                </div>

                {/* Formula Display */}
                <div className="p-2 bg-white rounded-lg border border-purple-100">
                    <div className="text-[8px] font-bold text-purple-600 mb-1">
                        AFe = AF − Σ Afk
                    </div>
                    <div className="flex items-center gap-1 text-[9px]">
                        <span className="font-black text-purple-700">{effectiveFloorArea.toLocaleString()}</span>
                        <span className="text-slate-500">=</span>
                        <span className="text-slate-600">{totalFloorArea.toLocaleString()}</span>
                        <span className="text-slate-500">−</span>
                        <span className="text-red-500">{totalExemptArea.toLocaleString()}</span>
                        <span className="text-slate-400 ml-1">m²</span>
                    </div>
                </div>

                {/* Zone Table */}
                {exemptAreas.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-purple-100">
                        <table className="w-full text-[8px]">
                            <thead className="bg-purple-100">
                                <tr>
                                    <th className="text-left p-1.5 font-black text-purple-600">{t ? '分區名稱' : 'Zone Name'}</th>
                                    <th className="text-left p-1.5 font-black text-purple-600">{t ? '免評估原因' : 'Reason'}</th>
                                    <th className="text-right p-1.5 font-black text-purple-600">{t ? '面積' : 'Area'}</th>
                                    <th className="p-1.5 w-6"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-purple-50">
                                {exemptAreas.map(zone => (
                                    <tr key={zone.id} className="hover:bg-purple-50/50">
                                        <td className="p-1.5 font-bold text-slate-700">{zone.name}</td>
                                        <td className="p-1.5 text-slate-500">{getReasonLabel(zone.reason)}</td>
                                        <td className="p-1.5 text-right font-bold text-slate-700">{zone.area.toLocaleString()} m²</td>
                                        <td className="p-1.5">
                                            <button
                                                onClick={() => handleRemoveZone(zone.id)}
                                                className="text-red-400 hover:text-red-600 font-black"
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-purple-100">
                                <tr>
                                    <td colSpan={2} className="p-1.5 font-black text-purple-600">{t ? '合計 Σ Afk' : 'Total Σ Afk'}</td>
                                    <td className="p-1.5 text-right font-black text-purple-700">{totalExemptArea.toLocaleString()} m²</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {exemptAreas.length === 0 && (
                    <div className="text-center py-3 text-[9px] text-slate-400">
                        {t ? '尚未設定免評估分區' : 'No exempt zones defined'}
                    </div>
                )}
            </section>

            {/* Summary */}
            <section className={sectionClass + " bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-blue-700"}>
                <h3 className="text-[10px] font-black uppercase tracking-wide text-blue-300">
                    {t ? '專案參數摘要' : 'Project Summary'}
                </h3>
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">{t ? '區域' : 'Region'}</span>
                        <span className="font-bold text-emerald-400">{regionData?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">UR</span>
                        <span className="font-bold text-emerald-400">{regionData?.ur || 1.0}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">{t ? '用途' : 'Use'}</span>
                        <span className="font-bold text-indigo-400">
                            {USE_CATEGORIES.find(c => c.id === selectedUseCategory)?.name || '-'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">{t ? '總面積 AF' : 'Total AF'}</span>
                        <span className="font-bold text-amber-400">{totalFloorArea.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400">{t ? '免評估 Σ Afk' : 'Exempt Σ Afk'}</span>
                        <span className="font-bold text-red-400">−{totalExemptArea.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] pt-1 border-t border-white/20">
                        <span className="text-white font-black">{t ? '評估面積 AFe' : 'Effective AFe'}</span>
                        <span className="font-black text-purple-300">{effectiveFloorArea.toLocaleString()} m²</span>
                    </div>
                    <div className="border-t border-white/10 pt-1 mt-1">
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400">AEUI</span>
                            <span className="font-bold text-blue-400">{euiData.AEUI}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400">LEUI</span>
                            <span className="font-bold text-emerald-400">{euiData.LEUI}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400">EEUI</span>
                            <span className="font-bold text-orange-400">{euiData.EEUI}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400">Es</span>
                            <span className="font-bold text-slate-300">{esValue.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Add Zone Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
                        <h3 className="text-sm font-black text-slate-800 mb-4">
                            {t ? '新增免評估分區' : 'Add Exempt Zone'}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className={labelClass}>{t ? '分區名稱' : 'Zone Name'}</label>
                                <input
                                    type="text"
                                    value={newZone.name}
                                    onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1"
                                    placeholder={t ? '例：地下停車場' : 'e.g., Basement Parking'}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t ? '免評估原因' : 'Exempt Reason'}</label>
                                <select
                                    value={newZone.reason}
                                    onChange={(e) => setNewZone({ ...newZone, reason: e.target.value as ExemptReason })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1"
                                >
                                    {EXEMPT_REASONS.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {t ? r.zh : r.en}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>{t ? '面積 (m²)' : 'Area (m²)'}</label>
                                <input
                                    type="number"
                                    value={newZone.area || ''}
                                    onChange={(e) => setNewZone({ ...newZone, area: parseFloat(e.target.value) || 0 })}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm mt-1"
                                    placeholder="0"
                                />
                                {newZone.reason === 'storage' && newZone.area > 0 && newZone.area < 100 && (
                                    <p className="text-[9px] text-red-500 mt-1">
                                        {t ? '儲藏/設備空間需 ≥100m² 才可免評估' : 'Storage must be ≥100m² to be exempt'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg"
                            >
                                {t ? '取消' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleAddZone}
                                disabled={!newZone.name || newZone.area <= 0 || (newZone.reason === 'storage' && newZone.area < 100)}
                                className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t ? '新增' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSettingsPanel;
