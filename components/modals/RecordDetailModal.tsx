import React, { useState, useEffect } from 'react';
import type { WorkerRecord } from '../../types';
import { CircularProgress } from '../shared/CircularProgress';
import { CollapsibleSection } from '../shared/CollapsibleSection';
import { Spinner } from '../Spinner';

interface RecordDetailModalProps {
    record: WorkerRecord;
    onClose: () => void;
    onBack: () => void;
    onUpdateRecord: (record: WorkerRecord) => void;
    onOpenReport: (record: WorkerRecord) => void;
    onReanalyze: (record: WorkerRecord) => Promise<void>;
    isReanalyzing: boolean;
}

export const RecordDetailModal: React.FC<RecordDetailModalProps> = ({ record: initialRecord, onClose, onBack, onUpdateRecord, onOpenReport, onReanalyze, isReanalyzing }) => {
    const [record, setRecord] = useState<WorkerRecord>(initialRecord);

    useEffect(() => {
        setRecord(initialRecord);
    }, [initialRecord]);

    const handleSave = () => {
        onUpdateRecord(record);
        alert("저장 완료!");
    };

    const handleTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            window.speechSynthesis.cancel(); // Cancel any previous speech
            window.speechSynthesis.speak(utterance);
        } else {
            alert('이 브라우저에서는 음성 재생을 지원하지 않습니다.');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-full max-h-[95vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0">
                    <div className="flex items-center space-x-2">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 flex items-center text-sm font-semibold text-slate-600">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                             기록 히스토리
                        </button>
                    </div>
                    <h2 className="text-base font-bold text-slate-800">기록 상세 정보 / {record.name} / {record.date}</h2>
                    <div className="flex items-center space-x-2">
                         <button onClick={() => onOpenReport(record)} className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">PDF 생성</button>
                         <button 
                            onClick={() => onReanalyze(record)}
                            disabled={isReanalyzing}
                            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center disabled:bg-slate-400"
                        >
                            {isReanalyzing && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isReanalyzing ? '분석 중...' : 'AI 재분석'}
                        </button>
                         <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">저장</button>
                         <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Image */}
                    <div className="w-1/2 p-4 bg-slate-100">
                        <div className="w-full h-full bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden">
                            {record.originalImage ? (
                                <img 
                                    src={`data:image/jpeg;base64,${record.originalImage}`} 
                                    alt="위험성 평가 기록지 원본" 
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <p className="text-slate-500 font-semibold">[위험성 평가 기록지 원본 이미지 없음]</p>
                            )}
                        </div>
                    </div>
                    {/* Right: Details */}
                    <div className="w-1/2 p-6 overflow-y-auto space-y-4">
                        <CollapsibleSection title="기본 정보" defaultOpen>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <label className="font-medium text-slate-500">이름</label>
                                    <input type="text" value={record.name} onChange={e => setRecord(prev => ({...prev, name: e.target.value}))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" />
                                </div>
                                 <div>
                                    <label className="font-medium text-slate-500">공종</label>
                                    <input type="text" value={record.jobField} onChange={e => setRecord(prev => ({...prev, jobField: e.target.value}))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" />
                                </div>
                                <div>
                                    <label className="font-medium text-slate-500">날짜</label>
                                    <input type="date" value={record.date} onChange={e => setRecord(prev => ({...prev, date: e.target.value}))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" />
                                </div>
                                 <div>
                                    <label className="font-medium text-slate-500">국적</label>
                                    <input type="text" value={record.nationality} onChange={e => setRecord(prev => ({...prev, nationality: e.target.value}))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" />
                                </div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="AI 종합 분석" defaultOpen>
                            <div className="flex items-center space-x-6">
                                <CircularProgress score={record.safetyScore} level={record.safetyLevel} />
                                <div className="flex-1">
                                    <label className="font-medium text-slate-500 text-sm">안전 수준 (수정 가능)</label>
                                    <select value={record.safetyLevel} onChange={e => setRecord(prev => ({...prev, safetyLevel: e.target.value as any}))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm">
                                        <option>초급</option>
                                        <option>중급</option>
                                        <option>고급</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 text-sm">
                                <h5 className="font-semibold text-slate-600 mb-2">강점 및 취약 분야</h5>
                                <ul className="space-y-1">
                                    {record.strengths.map((s,i) => <li key={`str-${i}`} className="flex items-center text-green-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>{s}</li>)}
                                    {record.weakAreas.map((w,i) => <li key={`weak-${i}`} className="flex items-center text-red-700"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>{w}</li>)}
                                </ul>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="수기 답변 (원문/번역)">
                            <div className="space-y-4">
                                {record.handwrittenAnswers.map((ans, index) => (
                                    <div key={index} className="text-sm">
                                        <h5 className="font-semibold text-slate-600 mb-1">질문 {ans.questionNumber}</h5>
                                        <p className="p-2 bg-slate-100 rounded-md text-slate-500 italic">"{ans.answerText}"</p>
                                        <div className="flex items-center mt-1">
                                            <button onClick={() => handleTTS(ans.koreanTranslation)} className="p-1 text-slate-500 hover:text-blue-600" aria-label="번역 듣기">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a1 1 0 000 2v10a1 1 0 001 1h1a1 1 0 100-2H6V5h1a1 1 0 100-2H6a1 1 0 00-1-1H5zM12 3a1 1 0 000 2v10a1 1 0 102 0V5a1 1 0 10-2 0zM10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" /></svg>
                                            </button>
                                            <p className="ml-1 text-slate-800">{ans.koreanTranslation}</p>
                                        </div>
                                        <div className="mt-2">
                                            <label className="font-medium text-slate-500 text-xs">번역 수정</label>
                                            <input 
                                                type="text" 
                                                value={ans.koreanTranslation} 
                                                onChange={(e) => {
                                                    const newAnswers = [...record.handwrittenAnswers];
                                                    newAnswers[index] = { ...newAnswers[index], koreanTranslation: e.target.value };
                                                    setRecord(prev => ({ ...prev, handwrittenAnswers: newAnswers }));
                                                }}
                                                className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="AI 개선 제안">
                            <div className="text-sm space-y-3">
                                <div>
                                    <h5 className="font-semibold text-slate-600 mb-1">주요 개선점</h5>
                                    <p className="text-slate-800 p-2 bg-yellow-50 rounded-md">{record.improvement}</p>
                                </div>
                                 <div>
                                    <h5 className="font-semibold text-slate-600 mb-1">AI 제안</h5>
                                    <ul className="list-disc list-inside text-slate-800 space-y-1">
                                        {record.suggestions.map((s, i) => <li key={`sugg-${i}`}>{s}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>
                </div>
            </div>
        </div>
    );
};