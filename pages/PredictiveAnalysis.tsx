import React, { useMemo } from 'react';
import type { WorkerRecord } from '../types';

const getSafetyLevelClass = (level: '초급' | '중급' | '고급') => {
    switch (level) {
        case '고급': return { text: 'text-green-800', bg: 'bg-green-100' };
        case '중급': return { text: 'text-yellow-800', bg: 'bg-yellow-100' };
        case '초급': return { text: 'text-red-800', bg: 'bg-red-100' };
        default: return { text: 'text-slate-800', bg: 'bg-slate-100' };
    }
};

const PredictiveAnalysis: React.FC<{ workerRecords: WorkerRecord[] }> = ({ workerRecords }) => {

    const highRiskWorkers = useMemo(() => {
        return workerRecords
            .filter(w => w.safetyLevel === '초급')
            .sort((a, b) => a.safetyScore - b.safetyScore)
            .slice(0, 5);
    }, [workerRecords]);

    const riskByJobField = useMemo(() => {
        const jobFieldStats: { [key: string]: { totalScore: number; count: number; workers: number } } = {};
        workerRecords.forEach(w => {
            if (!jobFieldStats[w.jobField]) {
                jobFieldStats[w.jobField] = { totalScore: 0, count: 0, workers: 0 };
            }
            jobFieldStats[w.jobField].totalScore += w.safetyScore;
            jobFieldStats[w.jobField].count++;
        });
        
        // Count unique workers per job field
        const workersPerField = workerRecords.reduce((acc, w) => {
            if (!acc[w.jobField]) {
                acc[w.jobField] = new Set();
            }
            acc[w.jobField].add(w.name);
            return acc;
        }, {} as Record<string, Set<string>>);

        for(const field in workersPerField){
            if(jobFieldStats[field]){
                jobFieldStats[field].workers = workersPerField[field].size;
            }
        }


        return Object.entries(jobFieldStats)
            .map(([jobField, stats]) => ({
                jobField,
                avgScore: stats.totalScore / stats.count,
                workerCount: stats.workers
            }))
            .sort((a, b) => a.avgScore - b.avgScore);
    }, [workerRecords]);

    const topWorkersByJobField = useMemo(() => {
         const jobFieldStats: { [key: string]: { topWorker: string; topScore: number } } = {};
         workerRecords.forEach(w => {
            if (!jobFieldStats[w.jobField] || w.safetyScore > jobFieldStats[w.jobField].topScore) {
                jobFieldStats[w.jobField] = { topWorker: w.name, topScore: w.safetyScore };
            }
         });
         return Object.entries(jobFieldStats).map(([jobField, data]) => ({jobField, ...data}))
            .sort((a, b) => b.topScore - a.topScore);
    }, [workerRecords]);


    return (
        <div className="space-y-6">
             <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.01-1.742 3.01H4.42c-1.53 0-2.493-1.676-1.743-3.01l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            AI가 분석한 데이터를 기반으로 고위험 근로자 및 위험 공종을 예측합니다. 선제적인 안전 조치를 통해 사고를 예방하세요.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* High Risk Workers */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-red-600">고위험 근로자</h3>
                    <div className="space-y-3">
                        {highRiskWorkers.map((worker, index) => (
                            <div key={worker.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                <div className="flex items-center">
                                    <span className="text-sm font-bold text-slate-600 w-6">{index + 1}.</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">{worker.name} <span className="text-xs text-slate-500">({worker.jobField})</span></p>
                                        <div className="text-xs text-slate-500">{worker.weakAreas.join(', ')}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-red-500">{worker.safetyScore}점</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk by Job Field */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">공종별 위험 순위</h3>
                     <div className="space-y-3">
                        {riskByJobField.map((item, index) => (
                            <div key={item.jobField} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                               <div className="flex items-center">
                                    <span className="text-sm font-bold text-slate-600 w-6">{index + 1}.</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">{item.jobField}</p>
                                        <p className="text-xs text-slate-500">{item.workerCount}명 참여</p>
                                    </div>
                                </div>
                                <div className="text-lg font-bold text-orange-500">{item.avgScore.toFixed(1)}점</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Workers */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 text-green-600">공종별 최우수 근로자</h3>
                     <div className="space-y-3">
                        {topWorkersByJobField.map((item) => (
                            <div key={item.jobField} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                                <div>
                                    <p className="font-semibold text-slate-800">{item.jobField}</p>
                                    <p className="text-xs text-slate-500">{item.topWorker}</p>
                                </div>
                                <div className="text-lg font-bold text-green-500">{item.topScore}점</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PredictiveAnalysis;
