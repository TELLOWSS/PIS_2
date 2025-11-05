import React, { useState, useMemo, useEffect } from 'react';
import type { WorkerRecord } from '../../types';

interface WorkerHistoryModalProps {
    workerName: string;
    allRecords: WorkerRecord[];
    initialSelectedRecord: WorkerRecord;
    onClose: () => void;
    onViewDetails: (record: WorkerRecord) => void;
    onUpdateRecord: (record: WorkerRecord) => void;
    onDeleteRecord: (recordId: string) => void;
}

const getSafetyLevelClass = (level: '초급' | '중급' | '고급') => {
    switch (level) {
        case '고급': return { text: 'text-green-800', border: 'border-green-500' };
        case '중급': return { text: 'text-yellow-800', border: 'border-yellow-500' };
        case '초급': return { text: 'text-red-800', border: 'border-red-500' };
        default: return { text: 'text-slate-800', border: 'border-slate-500' };
    }
};

export const WorkerHistoryModal: React.FC<WorkerHistoryModalProps> = ({ workerName, allRecords, initialSelectedRecord, onClose, onViewDetails, onUpdateRecord, onDeleteRecord }) => {
    const [selectedRecord, setSelectedRecord] = useState<WorkerRecord>(initialSelectedRecord);
    const [editableRecord, setEditableRecord] = useState<WorkerRecord>(initialSelectedRecord);

    useEffect(() => {
        setSelectedRecord(initialSelectedRecord);
        setEditableRecord(initialSelectedRecord);
    }, [initialSelectedRecord]);

    const workerHistory = useMemo(() => {
        return allRecords
            .filter(r => r.name === workerName)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allRecords, workerName]);

    const { scoreDifference, previousScore } = useMemo(() => {
        const currentIndex = workerHistory.findIndex(r => r.id === selectedRecord.id);
        if (currentIndex > -1 && currentIndex < workerHistory.length - 1) {
            const previousRecord = workerHistory[currentIndex + 1];
            return {
                scoreDifference: selectedRecord.safetyScore - previousRecord.safetyScore,
                previousScore: previousRecord.safetyScore
            };
        }
        return { scoreDifference: null, previousScore: null };
    }, [selectedRecord, workerHistory]);

    const handleRecordSelect = (record: WorkerRecord) => {
        setSelectedRecord(record);
        setEditableRecord(record);
    };

    const handleFieldChange = (field: keyof WorkerRecord, value: any) => {
        setEditableRecord(prev => ({...prev, [field]: value}));
    }

    const handleSave = () => {
        onUpdateRecord(editableRecord);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">
                        <span className="text-blue-600">{workerName}</span> 근로자 기록 히스토리
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: History List */}
                    <aside className="w-1/3 border-r border-slate-200 overflow-y-auto p-2 space-y-2">
                        {workerHistory.map(record => (
                            <button 
                                key={record.id} 
                                onClick={() => handleRecordSelect(record)}
                                className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${record.id === selectedRecord.id ? 'bg-blue-100 shadow' : 'hover:bg-slate-100'}`}
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-slate-200 flex items-center justify-center">
                                        {record.originalImage ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8v10a2 2 0 002 2h12a2 2 0 002-2V8m-6 4l-3-3m0 0l-3 3m3-3v11" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <p className={`font-semibold ${record.id === selectedRecord.id ? 'text-blue-700' : 'text-slate-700'}`}>{record.date}</p>
                                        <p className="text-xs text-slate-500">{record.jobField}</p>
                                    </div>
                                </div>
                                <div className={`text-lg font-bold ${getSafetyLevelClass(record.safetyLevel).text}`}>{record.safetyScore}점</div>
                            </button>
                        ))}
                    </aside>

                    {/* Right Panel: Record Details */}
                    <main className="w-2/3 overflow-y-auto p-6 space-y-6">
                        <div className="flex justify-between items-start">
                             <div>
                                <p className="text-sm text-slate-500">기록 ID: {selectedRecord.id}</p>
                                <h3 className="text-2xl font-bold text-slate-800 mt-1">{selectedRecord.date}</h3>
                            </div>
                            <div className="text-right">
                                <p className={`text-4xl font-bold ${getSafetyLevelClass(selectedRecord.safetyLevel).text}`}>{selectedRecord.safetyScore}점</p>
                                {scoreDifference !== null && (
                                     <p className={`text-sm font-semibold ${scoreDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {scoreDifference >= 0 ? '▲' : '▼'} {Math.abs(scoreDifference).toFixed(1)} (이전 {previousScore}점)
                                    </p>
                                )}
                            </div>
                        </div>

                        <button onClick={() => onViewDetails(selectedRecord)} className="w-full text-center py-2 px-4 bg-white border border-slate-300 rounded-md text-sm font-semibold text-blue-600 hover:bg-slate-50">
                            상세 보기
                        </button>
                        
                        {/* Editable sections */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-slate-700 mb-2">기본 정보 (수정 가능)</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200">
                                    <div><span className="font-medium text-slate-500">이름:</span> <span className="text-slate-800 font-semibold">{editableRecord.name}</span></div>
                                    <div><span className="font-medium text-slate-500">공종:</span> <span className="text-slate-800 font-semibold">{editableRecord.jobField}</span></div>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-slate-700 mb-2">AI 분석 결과 (수정 가능)</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border border-slate-200">
                                    <div>
                                        <label className="font-medium text-slate-500">안전 점수</label>
                                        <input type="number" value={editableRecord.safetyScore} onChange={e => handleFieldChange('safetyScore', parseInt(e.target.value))} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm" />
                                    </div>
                                    <div>
                                         <label className="font-medium text-slate-500">안전 수준</label>
                                         <select value={editableRecord.safetyLevel} onChange={e => handleFieldChange('safetyLevel', e.target.value)} className="mt-1 w-full border-slate-300 rounded-md shadow-sm text-sm">
                                            <option>초급</option>
                                            <option>중급</option>
                                            <option>고급</option>
                                         </select>
                                    </div>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-semibold text-slate-700 mb-2">종합 인사이트</h4>
                                 <p className="text-sm text-slate-600 bg-white p-4 rounded-lg border border-slate-200">{editableRecord.aiInsights}</p>
                            </div>
                        </div>
                    </main>
                </div>
                <footer className="flex items-center justify-end p-4 border-t border-slate-200 bg-slate-100 shrink-0 space-x-3">
                    <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">저장</button>
                    <button onClick={() => onDeleteRecord(selectedRecord.id)} className="px-5 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-lg hover:bg-red-200">이 기록 삭제</button>
                </footer>
            </div>
        </div>
    );
};