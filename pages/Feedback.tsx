import React from 'react';

const Feedback: React.FC = () => {
    return (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center text-slate-500">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">피드백 및 업데이트</h1>
            <p>이 페이지는 현재 개발 중입니다.</p>
            <p className="text-sm mt-2">시스템 업데이트 내역과 사용자 피드백을 확인할 수 있는 기능이 추가될 예정입니다.</p>
        </div>
    );
};

export default Feedback;
