import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { generateSafetyBriefing } from '../services/geminiService';
import type { WorkerRecord, SafetyBriefing, HighRiskWorker } from '../types';

interface AIDailyBriefingProps {
    workerRecords: WorkerRecord[];
}

const BriefingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-4">
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        </div>
        <div className="h-4 bg-slate-200 rounded w-full"></div>
    </div>
);


export const AIDailyBriefing: React.FC<AIDailyBriefingProps> = ({ workerRecords }) => {
    const [briefing, setBriefing] = useState<SafetyBriefing | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const topWeaknessArea = useMemo(() => {
        if (workerRecords.length === 0) return null;
        const weaknessCounts = workerRecords.flatMap(r => r.weakAreas).reduce((acc, area) => {
            acc[area] = (acc[area] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(weaknessCounts).sort(([, countA], [, countB]) => countB - countA)[0]?.[0] || null;
    }, [workerRecords]);

    const highRiskWorkers = useMemo(() => {
         const uniqueWorkers = new Set(workerRecords.map(r => r.name));
         const latestRecords = Array.from(uniqueWorkers).map(name => {
            return workerRecords
                .filter(r => r.name === name)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        });
        
        return latestRecords
            .filter(w => w.safetyLevel === '초급')
            .sort((a, b) => a.safetyScore - b.safetyScore)
            .slice(0, 3)
            .map(w => ({ name: w.name, score: w.safetyScore }));
    }, [workerRecords]);

    const fetchBriefing = useCallback(async () => {
        if (!topWeaknessArea || highRiskWorkers.length === 0) {
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateSafetyBriefing(topWeaknessArea, highRiskWorkers);
            setBriefing(result);
        } catch (err) {
            setError('AI 브리핑 생성에 실패했습니다.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [topWeaknessArea, highRiskWorkers]);

    useEffect(() => {
        fetchBriefing();
    }, [fetchBriefing]);

    const renderContent = () => {
        if (isLoading) {
            return <BriefingSkeleton />;
        }
        if (error) {
            return <p className="text-red-500">{error}</p>;
        }
        if (!briefing || !topWeaknessArea) {
            return <p className="text-slate-500">브리핑을 생성할 데이터가 충분하지 않습니다. 근로자 기록을 더 추가해주세요.</p>
        }

        return (
            <div className="space-y-5">
                <p className="font-semibold text-slate-800 text-base">{briefing.greeting}</p>
                
                <div className="flex items-start">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                         <span className="text-lg">🎯</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-red-700">금일의 안전 중점 관리 사항</h4>
                        <p className="text-slate-700 font-semibold text-lg">{briefing.focus_area.korean}</p>
                    </div>
                </div>

                <div className="flex items-start">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                         <span className="text-lg">👤</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-yellow-700">특별 관리 대상 근로자</h4>
                        <ul className="text-slate-600 space-y-1 mt-1 text-sm">
                            {briefing.priority_workers.map(worker => (
                                <li key={worker.name}>- <span className="font-semibold">{worker.name}</span>: {worker.reason_korean}으로 특별한 주의가 필요합니다.</li>
                            ))}
                        </ul>
                    </div>
                </div>
                 <div className="flex items-start">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <span className="text-lg">💡</span>
                    </div>
                    <div>
                        <h4 className="font-bold text-green-700">안전 메시지</h4>
                        <p className="text-slate-600">{briefing.encouragement.korean}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-slate-800">AI Daily Briefing</h3>
                    <span className="px-2 py-0.5 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full">BETA</span>
                </div>
                <button 
                    onClick={fetchBriefing} 
                    disabled={isLoading}
                    className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
                    aria-label="브리핑 새로고침"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l1.5 1.5A9 9 0 0120.49 15.51M20 20l-1.5-1.5A9 9 0 003.51 8.49" />
                    </svg>
                </button>
            </div>
            {renderContent()}
        </div>
    );
};