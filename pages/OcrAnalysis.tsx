import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Spinner } from '../components/Spinner';
import { analyzeWorkerRiskAssessment } from '../services/geminiService';
import type { WorkerRecord } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

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
    existingRecords: WorkerRecord[];
    onDeleteAll: () => void;
    onImport: (records: WorkerRecord[]) => void;
    onViewDetails: (record: WorkerRecord) => void;
    onDeleteRecord: (recordId: string) => void;
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


const OcrAnalysis: React.FC<OcrAnalysisProps> = ({ onAnalysisComplete, existingRecords, onDeleteAll, onImport, onViewDetails, onDeleteRecord }) => {
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

    const uniqueJobFields = useMemo(() => ['전체', ...new Set(existingRecords.map(r => r.jobField))], [existingRecords]);

    const sortedAndFilteredRecords = useMemo(() => {
        let records = [...existingRecords];

        if (jobFieldFilter !== '전체') {
            records = records.filter(r => r.jobField === jobFieldFilter);
        }

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
    }, [existingRecords, jobFieldFilter, sortConfig]);

    const requestSort = (key: keyof WorkerRecord) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleExport = (format: 'json' | 'csv') => {
        if (existingRecords.length === 0) {
            alert('내보낼 데이터가 없습니다.');
            return;
        }

        const date = new Date().toISOString().slice(0, 10);
        let dataStr: string;
        let fileName: string;
        let mimeType: string;

        if (format === 'json') {
            dataStr = JSON.stringify(existingRecords, null, 2);
            fileName = `psi_backup_${date}.json`;
            mimeType = 'application/json';
        } else {
            const headers = ['이름', '공종', '국적', '날짜', '안전 점수', '안전 수준', '취약 분야'];
            const rows = existingRecords.map(r => [
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                     <FileUpload 
                        onFilesChange={handleFilesChange}
                        onAnalyze={handleAnalyze}
                        isAnalyzing={isAnalyzing}
                        fileCount={files.length}
                    />
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
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                     <h3 className="text-lg font-semibold mb-4">처리 상태</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">근로자 국적</label>
                            <select 
                                id="nationality" 
                                name="nationality" 
                                value={nationality}
                                onChange={(e) => setNationality(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                disabled={isAnalyzing}
                            >
                                {nationalites.map(nat => <option key={nat} value={nat}>{nat}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || files.length === 0}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? <Spinner /> : `AI 분석 시작 (${files.length}개 파일)`}
                        </button>

                         {isAnalyzing && (
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                                <p className="text-sm font-semibold text-blue-600">{analysisProgress}</p>
                                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(analyzedCount / files.length) * 100}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{analyzedCount} / {files.length} 완료</p>
                            </div>
                        )}
                         {error && (
                            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
                                <p className="text-sm"><strong className="font-bold">오류: </strong>{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <div className="flex items-center space-x-4">
                         <h3 className="text-lg font-semibold">분석 기록 ({sortedAndFilteredRecords.length}건)</h3>
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
                        <button onClick={() => alert('수동 추가 기능은 준비 중입니다.')} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            + 수동 추가
                        </button>
                         <button onClick={() => handleExport('csv')} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50">CSV 내보내기</button>
                         <button onClick={() => handleExport('json')} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50">JSON 백업</button>
                         <button onClick={handleTriggerImport} className="px-3 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md hover:bg-slate-50">JSON 불러오기</button>
                         <button onClick={() => alert('전체 재분석 기능은 준비 중입니다.')} className="px-3 py-2 text-sm font-medium text-yellow-900 bg-yellow-400 border border-yellow-500 rounded-md hover:bg-yellow-500 hover:text-white">전체 재분석</button>
                         <button onClick={onDeleteAll} className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200">전체 삭제</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <SortableHeader columnKey="name" title="이름" sortConfig={sortConfig} requestSort={requestSort} />
                                <th scope="col" className="px-6 py-3">공종</th>
                                <th scope="col" className="px-6 py-3">국적</th>
                                <SortableHeader columnKey="date" title="날짜" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader columnKey="safetyScore" title="안전 점수" sortConfig={sortConfig} requestSort={requestSort} className="text-center" />
                                <th scope="col" className="px-6 py-3 text-center">안전 수준</th>
                                <th scope="col" className="px-6 py-3">상태</th>
                                <th scope="col" className="px-6 py-3 text-center">작업</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredRecords.length > 0 ? (
                                sortedAndFilteredRecords.map((record) => (
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
                                        <td className="px-6 py-4 flex space-x-2 justify-center">
                                            <button onClick={() => onViewDetails(record)} className="text-blue-600 hover:underline">보기</button>
                                            <button onClick={() => onDeleteRecord(record.id)} className="text-red-600 hover:underline">삭제</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-500">
                                        <p className="font-semibold">표시할 기록이 없습니다.</p>
                                        <p className="text-sm mt-1">{existingRecords.length > 0 ? '필터 조건을 변경해보세요.' : '위험성 평가 기록지를 업로드하여 분석을 시작하세요.'}</p>
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