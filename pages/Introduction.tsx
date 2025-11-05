import React from 'react';

const Introduction: React.FC = () => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-slate-500">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">PSI 시스템 소개</h1>
            <p>이 페이지는 현재 개발 중입니다.</p>
            <p className="text-sm mt-2">Proactive Safety Intelligence 시스템의 배경, 철학, 기능에 대한 상세한 소개가 추가될 예정입니다.</p>
        </div>
    );
};

export default Introduction;
