

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Spinner } from '../components/Spinner';
import { analyzeWorkerRiskAssessment } from '../services/geminiService';
import type { WorkerRecord } from '../types';
import { fileToBase64 } from '../utils/fileUtils';
import { Tooltip } from '../components/shared/Tooltip';

const getSafetyLevelClass = (level: '초급' | '중급' | '고급') => {
    switch (level) {
        case '고급': return 'bg-green-100 text-green-800';
        case '중급': return 'bg-yellow-100 text-yellow-800';
        case '초급': return 'bg-red-100 text-red-800';
        default: return 'bg-slate-100 text-slate-800';
    }
};

interface OcrAnalysisProps {
    onAnalysisComplete: (records: WorkerRecord[]) => void;
    allRecords: WorkerRecord[];
    onDeleteAll: () => void;
    onImport: (records: WorkerRecord[]) => void;
    onViewHistory: (record: WorkerRecord) => void;
    onViewDetail: (record: WorkerRecord) => void;
    onDeleteWorker: (workerName: string) => void;
    onReanalyzeAll: () => void;
    isReanalyzingAll: boolean;
    reanalyzeAllProgress: { current: number; total: number };
}

const SortableHeader: React.FC<{
    columnKey: keyof WorkerRecord;
    title: string;
    sortConfig: { key: any; direction: string };
    requestSort: (key: any) => void;
    className?: string;
}> = ({ columnKey, title, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig.key === columnKey;
    const sortIcon = isSorted ? (sortConfig.direction === 'ascending' ? '▲' : '▼') : '';
    
    return (
        <th scope="col" className={`px-6 py-3 cursor-pointer hover:bg-slate-100 ${className}`} onClick={() => requestSort(columnKey)}>
            {title} <span className="text-xs">{sortIcon}</span>
        </th>
    );
};


const OcrAnalysis: React.FC<OcrAnalysisProps> = ({ 
    onAnalysisComplete, 
    allRecords, 
    onDeleteAll, 
    onImport, 
    onViewHistory,
    onViewDetail,
    onDeleteWorker,
    onReanalyzeAll,
    isReanalyzingAll,
    reanalyzeAllProgress,
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [nationality, setNationality] = useState<string>('베트남');
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisProgress, setAnalysisProgress] = useState<string>('');
    const [analyzedCount, setAnalyzedCount] = useState(0);

    const [jobFieldFilter, setJobFieldFilter] = useState('전체');
    const [sortConfig, setSortConfig] = useState<{ key: keyof WorkerRecord | 'none'; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
    const importInputRef = useRef<HTMLInputElement>(null);

    const nationalites = useMemo(() => ['베트남', '중국', '태국', '필리핀', '인도네시아', '우즈베키스탄', '캄보디아', '네팔', '한국'], []);

    const handleFilesChange = (selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setError(null);
    };
    
    const handleAnalyze = useCallback(async () => {
        if (files.length === 0) {
            setError('분석할 이미지를 먼저 업로드해주세요.');
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalyzedCount(0);
        
        const allNewRecords: WorkerRecord[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setAnalysisProgress(`[${i + 1}/${files.length}] ${file.name} 분석 중...`);
            try {
                const base64Image = await fileToBase64(file);
                const mimeType = file.type;
                const results = await analyzeWorkerRiskAssessment(base64Image, mimeType, nationality);
                allNewRecords.push(...results);
                setAnalyzedCount(prev => prev + 1);
            } catch (err) {
                console.error(`Error analyzing file ${file.name}:`, err);
                setError(`'${file.name}' 파일 분석 중 오류가 발생했습니다. 다음 파일로 넘어갑니다.`);
            }
        }
        
        onAnalysisComplete(allNewRecords);
        setAnalysisProgress('');
        setIsAnalyzing(false);
        setFiles([]);
    }, [files, nationality, onAnalysisComplete]);

    const uniqueJobFields = useMemo(() => ['전체', ...new Set(allRecords.map(r => r.jobField))], [allRecords]);

    const latestRecordsByWorker = useMemo(() => {
        const latestRecordsMap = new Map<string, WorkerRecord>();
        
        let recordsToProcess = allRecords;
        if (jobFieldFilter !== '전체') {
            recordsToProcess = recordsToProcess.filter(r => r.jobField === jobFieldFilter);
        }

        recordsToProcess.forEach(record => {
            if (!latestRecordsMap.has(record.name) || new Date(record.date) > new Date(latestRecordsMap.get(record.name)!.date)) {
                latestRecordsMap.set(record.name, record);
            }
        });

        let records = Array.from(latestRecordsMap.values());

        if (sortConfig.key !== 'none') {
            records.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof WorkerRecord];
                const bValue = b[sortConfig.key as keyof WorkerRecord];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return records;
    }, [allRecords, jobFieldFilter, sortConfig]);

    const requestSort = (key: keyof WorkerRecord) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (allRecords.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const date = new Date().toISOString().slice(0, 10);
        let dataStr: string;
        let fileName: string;
        let mimeType: string;

        if (format === 'json') {
            dataStr = JSON.stringify(allRecords, null, 2);
            fileName = `psi_backup_${date}.json`;
            mimeType = 'application/json';
        } else {
            const headers = ['이름', '공종', '국적', '날짜', '안전 점수', '안전 수준', '취약 분야'];
            const rows = allRecords.map(r => [
                r.name, r.jobField, r.nationality, r.date, r.safetyScore, r.safetyLevel, r.weakAreas.join('; ')
            ]);
            dataStr = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            fileName = `psi_export_${date}.csv`;
            mimeType = 'text/csv;charset=utf-8;';
        }

        const blob = new Blob([dataStr], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleTriggerImport = () => {
        importInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not a string");
                const data = JSON.parse(text);
                onImport(data);
            } catch (err) {
                console.error("Import error:", err);
                alert('파일을 불러오는 데 실패했습니다. 유효한 JSON 백업 파일인지 확인해주세요.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };
    
    return (
        <div className="space-y-6">
            <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <FileUpload 
                            onFilesChange={handleFilesChange}
                            onAnalyze={handleAnalyze}
                            isAnalyzing={isAnalyzing}
                            fileCount={files.length}
                        />
                    </div>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">처리 상태</h3>
                         <div className="p-4 bg-slate-50 rounded-lg text-center">
                            <div className="text-slate-500 text-sm">
                                {isAnalyzing ? `분석 진행 중... (${reanalyzeAllProgress.current}/${reanalyzeAllProgress.total})` 
                                : isReanalyzingAll ? `전체 재분석 진행 중... (${reanalyzeAllProgress.current}/${reanalyzeAllProgress.total})`
                                : `대기 중. 파일을 업로드하면 분석이 시작됩니다.`}
                            </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold mb-1">안전 수준 및 점수 기준</h3>
                    <p className="text-sm text-slate-500 mb-4">안전 이해도 점수는 위험성 평가 기록지의 응답을 기반으로 정확성, 구체성을 종합하여 AI가 산정합니다.</p>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start p-3 bg-green-50 rounded-md">
                            <span className="font-bold text-green-700 w-24 shrink-0">고급 (85점+)</span>
                            <span className="text-slate-600">위험 요인과 대책을 명확히 이해하고, 구체적으로 서술함.</span>
                        </div>
                        <div className="flex items-start p-3 bg-yellow-50 rounded-md">
                             <span className="font-bold text-yellow-700 w-24 shrink-0">중급 (65-84점)</span>
                            <span className="text-slate-600">기본적인 내용은 이해하나, 일부 내용이 추상적이거나 누락됨.</span>
                        </div>
                         <div className="flex items-start p-3 bg-red-50 rounded-md">
                             <span className="font-bold text-red-700 w-24 shrink-0">초급 (64점↓)</span>
                            <span className="text-slate-600">내용 이해도가 부족하거나, 기재 내용이 매우 부실함.</span>
                        </div>
                    </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                     <div className="flex items-center space-x-4">
                         <h3 className="text-lg font-semibold">분석 기록 ({latestRecordsByWorker.length}명)</h3>
                         <select 
                            id="jobFieldFilter" 
                            value={jobFieldFilter}
                            onChange={(e) => setJobFieldFilter(e.target.value)}
                            className="block w-full max-w-xs pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            {uniqueJobFields.map(field => <option key={field} value={field}>{field === '전체' ? '전체 공종' : field}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                        <button onClick={() => alert('수동 추가 기능은 준비 중입니다.')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span>수동 추가</span>
                        </button>
                         <button onClick={handleTriggerImport} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm11.707 5.707a1 1 0 00-1.414-1.414L10 10.586 6.707 7.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4z" /></svg>
                            <span>복원</span>
                         </button>
                         <button onClick={() => handleExport('json')} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                            <span>전체 백업</span>
                        </button>
                         <button onClick={() => handleExport('csv')} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            <span>CSV</span>
                         </button>
                         <button onClick={onReanalyzeAll} disabled={isReanalyzingAll || allRecords.length === 0} className="px-3 py-2 text-sm font-medium text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 hover:text-white disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center space-x-2">
                            {isReanalyzingAll ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 00-6.32 12.905l-1.42 1.42a1 1 0 001.414 1.414l1.42-1.42A8 8 0 1010 2zM8 7a1 1 0 011-1h.01a1 1 0 110 2H9a1 1 0 01-1-1zm4.472 2.053a1 1 0 01-.224 1.394l-2 1.5a1 1 0 01-1.248-.023l-2-2a1 1 0 011.248-1.574l1.23.922.99-1.32a1 1 0 011.394.224z" /></svg>
                            )}
                            <span>전체 재분석</span>
                        </button>
                         <button 
                            onClick={onDeleteAll} 
                            disabled={allRecords.length === 0}
                            className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 flex items-center space-x-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            <span>전체 삭제</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <SortableHeader columnKey="name" title="이름" sortConfig={sortConfig} requestSort={requestSort} />
                                <th scope="col" className="px-6 py-3">공종</th>
                                <th scope="col" className="px-6 py-3">국적</th>
                                <SortableHeader columnKey="date" title="최신 평가일" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader columnKey="safetyScore" title="최신 안전 점수" sortConfig={sortConfig} requestSort={requestSort} className="text-center" />
                                <th scope="col" className="px-6 py-3 text-center">안전 수준</th>
                                <th scope="col" className="px-6 py-3">상태</th>
                                <th scope="col" className="px-6 py-3 text-center">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {latestRecordsByWorker.length > 0 ? (
                                latestRecordsByWorker.map((record) => (
                                    <tr key={record.id} className="bg-white border-b hover:bg-slate-50">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{record.name}</th>
                                        <td className="px-6 py-4">{record.jobField}</td>
                                        <td className="px-6 py-4">{record.nationality}</td>
                                        <td className="px-6 py-4">{record.date}</td>
                                        <td className="px-6 py-4 font-bold text-center text-slate-800">{record.safetyScore}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getSafetyLevelClass(record.safetyLevel)}`}>
                                                {record.safetyLevel}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-green-600 font-semibold">유효</td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-1 justify-center">
                                                <Tooltip text="상세보기">
                                                    <button onClick={() => onViewDetail(record)} className="p-2 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C3.732 4.943 9.522 3 10 3s6.268 1.943 9.542 7c-3.274 5.057-9.064 7-9.542 7S3.732 15.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="히스토리 보기">
                                                    <button onClick={() => onViewHistory(record)} className="p-2 text-slate-500 rounded-full hover:bg-slate-200 hover:text-slate-800 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </Tooltip>
                                                <Tooltip text="근로자 모든 기록 삭제">
                                                    <button onClick={() => onDeleteWorker(record.name)} className="p-2 text-slate-500 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        <p className="font-semibold">표시할 기록이 없습니다.</p>
                                        <p className="text-sm mt-1">{allRecords.length > 0 ? '필터 조건을 변경해보세요.' : '위험성 평가 기록지를 업로드하여 분석을 시작하세요.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OcrAnalysis;