import React from 'react';
import {
    HVAC_SYSTEMS,
    LIGHTING_SYSTEMS,
    ELEVATOR_TYPES,
    DHW_SYSTEMS,
    getDisplayName,
} from '../data/bersnConfig';

interface MEPSettingsPanelProps {
    lang: 'zh' | 'en';
    selectedHVAC: string;
    onHVACChange: (id: string) => void;
    selectedLighting: string;
    onLightingChange: (id: string) => void;
    selectedElevator: string;
    onElevatorChange: (id: string) => void;
    selectedDHW: string;
    onDHWChange: (id: string) => void;
    elevatorCount: number;
    onElevatorCountChange: (count: number) => void;
}

const MEPSettingsPanel: React.FC<MEPSettingsPanelProps> = ({
    lang,
    selectedHVAC,
    onHVACChange,
    selectedLighting,
    onLightingChange,
    selectedElevator,
    onElevatorChange,
    selectedDHW,
    onDHWChange,
    elevatorCount,
    onElevatorCountChange,
}) => {
    const t = lang === 'zh';
    const sectionClass = "bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2";
    const titleClass = "text-[10px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-2";
    const labelClass = "text-[8px] font-black text-slate-400 uppercase";
    const selectClass = "w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-400";

    return (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)] pr-1 custom-scrollbar">
            {/* HVAC System Section */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    {t ? '空調系統' : 'HVAC System'}
                </h3>
                <select
                    value={selectedHVAC}
                    onChange={(e) => onHVACChange(e.target.value)}
                    className={selectClass}
                >
                    {HVAC_SYSTEMS.map(sys => (
                        <option key={sys.id} value={sys.id}>
                            {getDisplayName(sys, lang)}
                        </option>
                    ))}
                </select>
                <div className="flex justify-between items-center p-1.5 bg-cyan-50 rounded-lg">
                    <span className="text-[8px] font-black text-cyan-600">EAC</span>
                    <span className="text-[10px] font-black text-cyan-700">
                        {HVAC_SYSTEMS.find(s => s.id === selectedHVAC)?.defaultEAC || 1.0}
                    </span>
                </div>
            </section>

            {/* Lighting System Section */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    {t ? '照明系統' : 'Lighting System'}
                </h3>
                <select
                    value={selectedLighting}
                    onChange={(e) => onLightingChange(e.target.value)}
                    className={selectClass}
                >
                    {LIGHTING_SYSTEMS.map(sys => (
                        <option key={sys.id} value={sys.id}>
                            {getDisplayName(sys, lang)}
                        </option>
                    ))}
                </select>
                <div className="flex justify-between items-center p-1.5 bg-yellow-50 rounded-lg">
                    <span className="text-[8px] font-black text-yellow-600">EL</span>
                    <span className="text-[10px] font-black text-yellow-700">
                        {LIGHTING_SYSTEMS.find(s => s.id === selectedLighting)?.defaultEL || 1.0}
                    </span>
                </div>
            </section>

            {/* Elevator Section */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    {t ? '電梯系統' : 'Elevator System'}
                </h3>
                <div className="space-y-2">
                    <div>
                        <label className={labelClass}>{t ? '電梯類型' : 'Type'}</label>
                        <select
                            value={selectedElevator}
                            onChange={(e) => onElevatorChange(e.target.value)}
                            className={selectClass}
                        >
                            {ELEVATOR_TYPES.map(type => (
                                <option key={type.id} value={type.id}>
                                    {getDisplayName(type, lang)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>{t ? '電梯數量' : 'Count'}</label>
                        <input
                            type="number"
                            min="0"
                            value={elevatorCount}
                            onChange={(e) => onElevatorCountChange(parseInt(e.target.value) || 0)}
                            className={selectClass}
                        />
                    </div>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-purple-50 rounded-lg">
                    <span className="text-[8px] font-black text-purple-600">Et</span>
                    <span className="text-[10px] font-black text-purple-700">
                        {ELEVATOR_TYPES.find(t => t.id === selectedElevator)?.EtValue || 1.0}
                    </span>
                </div>
            </section>

            {/* DHW Section */}
            <section className={sectionClass}>
                <h3 className={titleClass}>
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    {t ? '熱水系統' : 'DHW System'}
                </h3>
                <select
                    value={selectedDHW}
                    onChange={(e) => onDHWChange(e.target.value)}
                    className={selectClass}
                >
                    {DHW_SYSTEMS.map(sys => (
                        <option key={sys.id} value={sys.id}>
                            {getDisplayName(sys, lang)}
                        </option>
                    ))}
                </select>
                <div className="flex justify-between items-center p-1.5 bg-red-50 rounded-lg">
                    <span className="text-[8px] font-black text-red-600">EHW</span>
                    <span className="text-[10px] font-black text-red-700">
                        {DHW_SYSTEMS.find(s => s.id === selectedDHW)?.EHW || 0}
                    </span>
                </div>
            </section>

            {/* MEP Summary */}
            <section className={sectionClass + " bg-gradient-to-br from-slate-800 to-slate-900 text-white border-slate-700"}>
                <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-300">
                    {t ? 'MEP 參數摘要' : 'MEP Summary'}
                </h3>
                <div className="space-y-1">
                    {[
                        { label: 'EAC', value: HVAC_SYSTEMS.find(s => s.id === selectedHVAC)?.defaultEAC || 1.0, color: 'text-cyan-400' },
                        { label: 'EL', value: LIGHTING_SYSTEMS.find(s => s.id === selectedLighting)?.defaultEL || 1.0, color: 'text-yellow-400' },
                        { label: 'Et', value: ELEVATOR_TYPES.find(t => t.id === selectedElevator)?.EtValue || 1.0, color: 'text-purple-400' },
                        { label: 'EHW', value: DHW_SYSTEMS.find(s => s.id === selectedDHW)?.EHW || 0, color: 'text-red-400' },
                    ].map(item => (
                        <div key={item.label} className="flex justify-between items-center text-[9px]">
                            <span className="text-slate-400 font-bold">{item.label}</span>
                            <span className={`font-black ${item.color}`}>
                                {item.value.toFixed(2)}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default MEPSettingsPanel;
