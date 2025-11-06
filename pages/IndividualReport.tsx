import React from 'react';
import type { WorkerRecord } from '../types';

interface IndividualReportProps {
    record: WorkerRecord;
    onBack: () => void;
}

const getSafetyLevelClass = (level: '초급' | '중급' | '고급') => {
    switch (level) {
        case '고급': return { text: 'text-green-700', bg: 'bg-green-100' };
        case '중급': return { text: 'text-yellow-700', bg: 'bg-yellow-100' };
        case '초급': return { text: 'text-red-700', bg: 'bg-red-100' };
        default: return { text: 'text-slate-700', bg: 'bg-slate-100' };
    }
};

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 h-full flex flex-col">
        <h3 className="text-sm font-bold text-slate-700 flex items-center mb-3 shrink-0">
            <span className="mr-2 text-slate-500">{icon}</span>
            {title}
        </h3>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

const Pill: React.FC<{ text: string; nativeText: string; type: 'strength' | 'weakness' }> = ({ text, nativeText, type }) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center";
    const typeClasses = type === 'strength'
        ? "bg-green-100 text-green-800"
        : "bg-red-100 text-red-800";
    const icon = type === 'strength'
        ? <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;

    return <div className={`${baseClasses} ${typeClasses}`}>{icon}{text} ({nativeText})</div>;
};


const IndividualReport: React.FC<IndividualReportProps> = ({ record, onBack }) => {
    
    const levelClass = getSafetyLevelClass(record.safetyLevel);

    return (
        <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8" id="report-container">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-6 no-print">
                <h1 className="text-xl font-bold text-slate-800">개인별 안전 분석 리포트</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                        목록으로 돌아가기
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        인쇄 / PDF 저장
                    </button>
                </div>
            </header>

            <main className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-6xl mx-auto" id="report-content">
                {/* Report Header */}
                <div className="border-b border-slate-200 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">개인별 안전 분석 리포트</h2>
                    <p className="text-sm text-slate-500">Proactive Safety Intelligence (PSI) System</p>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm text-slate-600">
                        <p><span className="font-semibold">현장명:</span> 용인 푸르지오 원클러스터 2, 3단지 현장</p>
                        <p><span className="font-semibold">작성일:</span> {new Date().toLocaleDateString('ko-KR')}</p>
                    </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
                        <div className="md:border-r md:border-slate-200 md:pr-4"><span className="font-semibold">성명:</span> {record.name}</div>
                        <div className="md:border-r md:border-slate-200 md:pr-4"><span className="font-semibold">공종:</span> {record.jobField}</div>
                        <div className="md:border-r md:border-slate-200 md:pr-4"><span className="font-semibold">평가일:</span> {record.date}</div>
                        <div><span className="font-semibold">국적:</span> {record.nationality}</div>
                    </div>
                </div>

                {/* Report Body */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6 flex flex-col">
                         <Section title="핵심 지표" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>}>
                             <div className="flex justify-around items-center text-center h-full">
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">안전 점수</p>
                                    <p className="text-5xl font-bold text-slate-800">{record.safetyScore}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 mb-1">안전 수준</p>
                                    <span className={`px-4 py-1.5 text-base font-bold rounded-full ${levelClass.bg} ${levelClass.text}`}>{record.safetyLevel}</span>
                                </div>
                            </div>
                        </Section>
                         <Section title="강점 및 취약 분야" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2">강점 분야</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {record.strengths.map((s, i) => <Pill key={s} text={s} nativeText={record.strengths_native[i] || ''} type="strength" />)}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-2">취약 분야</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {record.weakAreas.map((w, i) => <Pill key={w} text={w} nativeText={record.weakAreas_native[i] || ''} type="weakness" />)}
                                    </div>
                                </div>
                            </div>
                        </Section>
                         <Section title="AI 종합 인사이트" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7.586 5H5a1 1 0 000 2h.586l-1.293 1.293a1 1 0 101.414 1.414l5-5a1 1 0 000-1.414l-5-5A1 1 0 007 2zM12 10a1 1 0 011-1h2.586l-1.293-1.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L15.586 13H13a1 1 0 01-1-1z" clipRule="evenodd" /></svg>}>
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{record.aiInsights}
                                <span className="block text-slate-500 mt-2">({record.aiInsights_native})</span>
                            </p>
                        </Section>
                    </div>
                    {/* Middle Column */}
                     <div className="space-y-6 flex flex-col">
                        <Section title="주요 개선점 및 제안" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 14.95a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zM3 10a1 1 0 011-1h1a1 1 0 110 2H4a1 1 0 01-1-1zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM4.343 5.757a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM14.95 14.95a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM10 6a4 4 0 100 8 4 4 0 000-8z" /></svg>}>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-1">핵심 개선점</h4>
                                    <p className="text-sm p-3 bg-yellow-50 text-yellow-800 rounded-md font-medium">{record.improvement}
                                        <span className="block text-yellow-700 mt-1">({record.improvement_native})</span>
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-500 mb-1">AI 추천 개선 방안</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 pl-1">
                                        {record.suggestions.map((s, i) => <li key={s}>{s} <span className="text-slate-500">({record.suggestions_native[i] || ''})</span></li>)}
                                    </ul>
                                </div>
                            </div>
                        </Section>
                        <Section title="수기 답변 및 번역" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>}>
                             <div className="space-y-3 text-xs overflow-y-auto">
                                {record.handwrittenAnswers.map(ans => (
                                    <div key={ans.questionNumber}>
                                        <h5 className="font-bold text-slate-600 mb-0.5">{ans.questionNumber}. {ans.koreanTranslation}</h5>
                                        <p className="text-slate-500 italic">(원문) {ans.answerText}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                     </div>
                    {/* Right Column */}
                    <div>
                         <Section title="위험성 평가서 원본" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>}>
                             <div className="w-full h-full bg-slate-100 rounded-md border border-slate-200 flex items-center justify-center overflow-hidden min-h-[30rem]">
                                {record.originalImage ? (
                                    <img 
                                        src={`data:image/jpeg;base64,${record.originalImage}`} 
                                        alt="위험성 평가 기록지 원본" 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <p className="text-slate-500 font-semibold">[원본 이미지 없음]</p>
                                )}
                            </div>
                        </Section>
                    </div>
                </div>
                 {/* Report Footer */}
                <footer className="text-center mt-8 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-400">본 리포트는 PSI (안전예측 AI 시스템)을 통해 수집된 데이터를 바탕으로 자동 생성되었습니다.</p>
                </footer>
            </main>
        </div>
    );
};

export default IndividualReport;