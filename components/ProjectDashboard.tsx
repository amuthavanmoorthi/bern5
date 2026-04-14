import React, { useState } from 'react';
import { Project, ProjectFormData } from '../types/project';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';

interface ProjectDashboardProps {
    lang: 'zh' | 'en';
    onEnterProject: (projectId: string) => void;
    onLanguageChange: () => void;
    onNavigateToAccounts?: () => void;
    onNavigateToOverview?: () => void;
}

// Sample projects for demo
const SAMPLE_PROJECTS: Project[] = [
    {
        id: 'proj-001',
        name: '綠能大樓原型專案',
        organization: '桃園市政府',
        location: '桃園市中壢區',
        createdAt: '2026-01-15T08:00:00Z',
        updatedAt: '2026-01-20T14:30:00Z',
        status: 'in-progress',
        category: '辦公建築',
        buildingType: 'office',
        totalArea: 5000,
        grade: '1+',
        eei: 0.489,
    },
    {
        id: 'proj-002',
        name: 'A2 PMIS V2',
        organization: '桃園市政府',
        location: '桃園市桃園區',
        createdAt: '2026-01-10T08:00:00Z',
        updatedAt: '2026-01-18T10:00:00Z',
        status: 'in-progress',
        category: '醫院',
        buildingType: 'hospital',
        totalArea: 12000,
        grade: '2',
        eei: 0.682,
    },
    {
        id: 'proj-003',
        name: 'B1 實安強化',
        organization: '桃園市政府',
        location: '桃園市龜山區',
        createdAt: '2026-01-05T08:00:00Z',
        updatedAt: '2026-01-15T09:00:00Z',
        status: 'completed',
        category: '零售',
        buildingType: 'retail',
        totalArea: 8500,
        grade: '3',
        eei: 0.751,
    },
];

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
    lang,
    onEnterProject,
    onLanguageChange,
    onNavigateToAccounts,
    onNavigateToOverview,
}) => {
    const t = lang === 'zh';
    const [projects, setProjects] = useState<Project[]>(SAMPLE_PROJECTS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const handleCreateProject = (formData: ProjectFormData) => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: formData.name,
            organization: formData.organization,
            location: formData.location,
            buildingType: formData.buildingType,
            totalArea: formData.totalArea,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft',
            category: formData.buildingType === 'office' ? '辦公建築' :
                formData.buildingType === 'hospital' ? '醫院' :
                    formData.buildingType === 'retail' ? '零售' : '其他',
        };
        setProjects([newProject, ...projects]);
    };

    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.organization.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || project.status === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="h-screen flex bg-slate-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg cursor-pointer"
                            onClick={onLanguageChange}
                        >
                            {lang === 'zh' ? '中' : 'EN'}
                        </div>
                        <div>
                            <h1 className="font-black text-slate-800">BERSn-Pro</h1>
                            <p className="text-[10px] text-slate-400">{t ? '建築能效平台' : 'Building Energy Platform'}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm">
                        <span>📋</span>
                        {t ? '專案入口網' : 'Project Portal'}
                    </a>
                    <button
                        onClick={onNavigateToOverview}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors text-left"
                    >
                        <span>📊</span>
                        {t ? '儀表板總覽' : 'Dashboard'}
                    </button>
                    <button
                        onClick={onNavigateToAccounts}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors text-left"
                    >
                        <span>👥</span>
                        {t ? '帳號管理' : 'Account Management'}
                    </button>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-medium text-sm transition-colors">
                        <span>⚙️</span>
                        {t ? '系統設定' : 'Settings'}
                    </a>
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                            U
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-800 truncate">{t ? '使用者' : 'User'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{t ? '管理員' : 'Admin'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">
                            {t ? '桃園市建築物能源設計平台' : 'Taoyuan Building Energy Design Platform'}
                        </h2>
                        <p className="text-sm text-slate-400">
                            {t ? `共 ${projects.length} 個專案` : `${projects.length} projects total`}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t ? '搜尋專案...' : 'Search projects...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-64 pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        </div>
                        {/* Filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">{t ? '全部狀態' : 'All Status'}</option>
                            <option value="draft">{t ? '草稿' : 'Draft'}</option>
                            <option value="in-progress">{t ? '進行中' : 'In Progress'}</option>
                            <option value="completed">{t ? '已完成' : 'Completed'}</option>
                        </select>
                        {/* Create Button */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            {t ? '新增專案' : 'New Project'}
                        </button>
                    </div>
                </header>

                {/* Project Grid */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* Create New Card */}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="h-[320px] border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all duration-300 group"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center text-3xl transition-colors">
                                +
                            </div>
                            <span className="font-bold">{t ? '建立新專案' : 'Create New Project'}</span>
                        </button>

                        {/* Project Cards */}
                        {filteredProjects.map(project => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onEnter={onEnterProject}
                                lang={lang}
                            />
                        ))}
                    </div>
                </div>
            </main>

            {/* Create Modal */}
            <CreateProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateProject}
                lang={lang}
            />
        </div>
    );
};

export default ProjectDashboard;
