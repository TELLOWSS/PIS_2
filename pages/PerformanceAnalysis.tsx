import React from 'react';
import type { WorkerRecord } from '../types';

const PerformanceAnalysis: React.FC<{ workerRecords: WorkerRecord[] }> = ({ workerRecords }) => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-slate-500">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">성과 추이 분석</h1>
            <p>이 페이지는 현재 개발 중입니다.</p>
            <p className="text-sm mt-2">근로자 및 공종별 성과 추이를 분석하는 기능이 추가될 예정입니다.</p>
        </div>
    );
};

export default PerformanceAnalysis;
