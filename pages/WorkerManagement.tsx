import React, { useState, useMemo } from 'react';
import type { WorkerRecord } from '../types';

interface WorkerGroup {
    [jobField: string]: WorkerRecord[];
}

const getSafetyLevelClass = (level: '초급' | '중급' | '고급') => {
    switch (level) {
        case '고급': return { text: 'text-green-700', bg: 'bg-green-100', progress: 'stroke-green-500' };
        case '중급': return { text: 'text-yellow-700', bg: 'bg-yellow-100', progress: 'stroke-yellow-500' };
        case '초급': return { text: 'text-red-700', bg: 'bg-red-100', progress: 'stroke-red-500' };
        default: return { text: 'text-slate-700', bg: 'bg-slate-100', progress: 'stroke-slate-500' };
    }
};

const WorkerCard: React.FC<{ worker: WorkerRecord; onClick: () => void; }> = ({ worker, onClick }) => {
    const levelClass = getSafetyLevelClass(worker.safetyLevel);
    const circumference = 2 * Math.PI * 18; // radius = 18
    const offset = circumference - (worker.safetyScore / 100) * circumference;

    return (
        <button 
            onClick={onClick}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center space-x-4 hover:shadow-lg hover:border-blue-500 transition-all duration-200 text-left w-full"
        >
            <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full" viewBox="0 0 40 40">
                    <circle
                        className="stroke-current text-slate-200"
                        strokeWidth="4"
                        fill="transparent"
                        r="18"
                        cx="20"
                        cy="20"
                    />
                    <circle
                        className={`transform -rotate-90 origin-center ${levelClass.progress}`}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        fill="transparent"
                        r="18"
                        cx="20"
                        cy="20"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">{worker.safetyScore}</span>
                     <span className={`text-xs font-bold ${levelClass.text}`}>{worker.safetyLevel}</span>
                </div>
            </div>
            <div className="flex-1">
                <p className="font-bold text-lg text-slate-900">{worker.name}</p>
                <p className="text-sm text-slate-500">{worker.nationality}</p>
                <p className="text-xs text-slate-400 mt-1">최근 기록: {worker.date}</p>
            </div>
        </button>
    );
};

const AccordionItem: React.FC<{ title: string; count: number; children: React.ReactNode }> = ({ title, count, children }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="mb-4">
                <button
                    type="button"
                    className="flex items-center justify-between w-full font-semibold text-left text-slate-800"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                >
                    <span className="text-xl font-bold">{title} ({count}명)</span>
                    <svg className={`w-6 h-6 transform transition-transform text-slate-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
            </h2>
            {isOpen && (
                <div className="pt-4 border-t border-slate-200">
                    {children}
                </div>
            )}
        </div>
    );
};

interface WorkerManagementProps {
    workerRecords: WorkerRecord[];
    onViewDetails: (record: WorkerRecord) => void;
}


const WorkerManagement: React.FC<WorkerManagementProps> = ({ workerRecords, onViewDetails }) => {
    
    const [searchTerm, setSearchTerm] = useState('');
    const [nationalityFilter, setNationalityFilter] = useState('전체');
    const [safetyLevelFilter, setSafetyLevelFilter] = useState('전체');
    const [sortOrder, setSortOrder] = useState('점수 낮은 순');

    const nationalities = useMemo(() => ['전체', ...new Set(workerRecords.map(r => r.nationality))], [workerRecords]);

    const latestRecordsByName = useMemo(() => {
        const recordMap = new Map<string, WorkerRecord>();
        workerRecords.forEach(record => {
            if (!recordMap.has(record.name) || new Date(record.date) > new Date(recordMap.get(record.name)!.date)) {
                recordMap.set(record.name, record);
            }
        });
        return Array.from(recordMap.values());
    }, [workerRecords]);

    const filteredAndSortedWorkers = useMemo(() => {
        let filtered = latestRecordsByName.filter(worker =>
            worker.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (nationalityFilter === '전체' || worker.nationality === nationalityFilter) &&
            (safetyLevelFilter === '전체' || worker.safetyLevel === safetyLevelFilter)
        );

        return filtered.sort((a, b) => {
            switch (sortOrder) {
                case '점수 높은 순':
                    return b.safetyScore - a.safetyScore;
                case '점수 낮은 순':
                    return a.safetyScore - b.safetyScore;
                case '이름 오름차순':
                    return a.name.localeCompare(b.name);
                default:
                    return 0;
            }
        });
    }, [latestRecordsByName, searchTerm, nationalityFilter, safetyLevelFilter, sortOrder]);


    const groupedWorkers = useMemo(() => {
        return filteredAndSortedWorkers.reduce((acc, record) => {
            const { jobField } = record;
            if (!acc[jobField]) {
                acc[jobField] = [];
            }
            acc[jobField].push(record);
            return acc;
        }, {} as WorkerGroup);
    }, [filteredAndSortedWorkers]);

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <input type="text" placeholder="이름으로 검색..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                    <select value={nationalityFilter} onChange={e => setNationalityFilter(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        {nationalities.map(n => <option key={n} value={n}>{n === '전체' ? '전체 국적' : n}</option>)}
                    </select>
                    <select value={safetyLevelFilter} onChange={e => setSafetyLevelFilter(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="전체">전체 안전 수준</option>
                        <option value="고급">고급</option>
                        <option value="중급">중급</option>
                        <option value="초급">초급</option>
                    </select>
                    <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option>점수 낮은 순</option>
                        <option>점수 높은 순</option>
                        <option>이름 오름차순</option>
                    </select>
                </div>
            </div>

            {Object.keys(groupedWorkers).sort().map((jobField) => {
                const workers = groupedWorkers[jobField];
                return (
                    <AccordionItem key={jobField} title={jobField} count={workers.length}>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {workers.map(worker => (
                                <WorkerCard key={worker.id} worker={worker} onClick={() => onViewDetails(worker)} />
                            ))}
                        </div>
                    </AccordionItem>
                );
            })}
             {workerRecords.length === 0 && (
                <div className="bg-white p-8 rounded-lg shadow-sm text-center text-slate-500">
                    <p>표시할 근로자 데이터가 없습니다.</p>
                    <p className="text-sm">OCR 분석 페이지에서 위험성 평가 기록지를 분석해주세요.</p>
                </div>
            )}
            {workerRecords.length > 0 && Object.keys(groupedWorkers).length === 0 && (
                 <div className="bg-white p-8 rounded-lg shadow-sm text-center text-slate-500">
                    <p>필터 조건에 맞는 근로자 데이터가 없습니다.</p>
                    <p className="text-sm">검색 또는 필터 조건을 변경해보세요.</p>
                </div>
            )}
        </div>
    );
};

export default WorkerManagement;