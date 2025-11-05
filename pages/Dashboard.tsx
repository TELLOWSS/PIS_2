import React, { useMemo } from 'react';
import type { WorkerRecord, SafetyCheckRecord, Page } from '../types';
import { StatCard } from '../components/StatCard';
import { NationalityChart } from '../components/charts/NationalityChart';
import { TopWeaknessesChart } from '../components/charts/TopWeaknessesChart';
import { SafetyCheckDonutChart } from '../components/charts/SafetyCheckDonutChart';
import { AIDailyBriefing } from '../components/AIDailyBriefing';
import { Tooltip } from '../components/shared/Tooltip';

interface DashboardProps {
    workerRecords: WorkerRecord[];
    safetyCheckRecords: SafetyCheckRecord[];
    setCurrentPage: (page: Page) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ workerRecords, safetyCheckRecords, setCurrentPage }) => {
    const stats = useMemo(() => {
        const uniqueWorkers = new Set(workerRecords.map(r => r.name));
        const totalWorkers = uniqueWorkers.size;
        
        const latestRecords = Array.from(uniqueWorkers).map(name => {
            return workerRecords
                .filter(r => r.name === name)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        });

        const averageScore = latestRecords.length > 0
            ? latestRecords.reduce((acc, r) => acc + r.safetyScore, 0) / latestRecords.length
            : 0;
            
        const highRiskWorkers = latestRecords.filter(r => r.safetyLevel === '초급').length;
        const totalChecks = safetyCheckRecords.length;
        
        return { totalWorkers, averageScore, highRiskWorkers, totalChecks };
    }, [workerRecords, safetyCheckRecords]);
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="총 근로자" 
                    value={`${stats.totalWorkers}명`} 
                    iconType="users" 
                />
                <StatCard 
                    title="평균 안전 점수" 
                    value={`${stats.averageScore.toFixed(1)}점`} 
                    iconType="chart" 
                />
                 <StatCard 
                    title="고위험 근로자" 
                    value={`${stats.highRiskWorkers}명`} 
                    iconType="warning"
                    onClick={() => setCurrentPage('predictive-analysis')}
                />
                <StatCard 
                    title="안전 점검" 
                    value={`${stats.totalChecks}건`} 
                    iconType="check"
                    onClick={() => setCurrentPage('safety-checks')}
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <AIDailyBriefing workerRecords={workerRecords} />
                </div>
                <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">국적별 근로자 현황</h3>
                    <div className="h-64">
                       <NationalityChart records={workerRecords} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-slate-800">주요 취약 분야 Top 3</h3>
                         <Tooltip text="지난 1개월간 AI가 분석한 기록 중 가장 자주 발견된 취약 분야 Top 3입니다.">
                            <div className="flex items-center text-sm text-slate-500 cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                <span>도움말</span>
                            </div>
                        </Tooltip>
                    </div>
                    <div className="h-auto min-h-[15rem]">
                       <TopWeaknessesChart records={workerRecords} />
                    </div>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">최근 2주간 안전 점검 동향</h3>
                    <div className="h-60">
                        <SafetyCheckDonutChart records={safetyCheckRecords} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;