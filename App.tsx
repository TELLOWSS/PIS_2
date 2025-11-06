

import React, { useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import OcrAnalysis from './pages/OcrAnalysis';
import WorkerManagement from './pages/WorkerManagement';
import PredictiveAnalysis from './pages/PredictiveAnalysis';
import SafetyChecks from './pages/SafetyChecks';
import PerformanceAnalysis from './pages/PerformanceAnalysis';
import SiteIssueManagement from './pages/SiteIssueManagement';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import Introduction from './pages/Introduction';
import IndividualReport from './pages/IndividualReport';
import type { WorkerRecord, SafetyCheckRecord, Page, ModalState } from './types';
import { WorkerHistoryModal } from './components/modals/WorkerHistoryModal';
import { RecordDetailModal } from './components/modals/RecordDetailModal';
import { analyzeWorkerRiskAssessment } from './services/geminiService';


const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [workerRecords, setWorkerRecords] = useState<WorkerRecord[]>([]);
    const [safetyCheckRecords, setSafetyCheckRecords] = useState<SafetyCheckRecord[]>([]);
    const [modalState, setModalState] = useState<ModalState>({ type: null });
    const [recordForReport, setRecordForReport] = useState<WorkerRecord | null>(null);
    const [isReanalyzing, setIsReanalyzing] = useState<string | null>(null);
    const [isReanalyzingAll, setIsReanalyzingAll] = useState(false);
    const [reanalyzeAllProgress, setReanalyzeAllProgress] = useState({ current: 0, total: 0 });

    const updateWorkerRecord = (updatedRecord: WorkerRecord) => {
        setWorkerRecords(prevRecords =>
            prevRecords.map(record =>
                record.id === updatedRecord.id ? updatedRecord : record
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
         if (modalState.record && modalState.record.id === updatedRecord.id) {
            setModalState(prev => ({...prev, record: updatedRecord}));
        }
    };

    const deleteWorkerRecord = (recordId: string) => {
        if (window.confirm('정말로 이 "기록"을 삭제하시겠습니까? 이 근로자의 다른 기록은 유지됩니다.')) {
            setWorkerRecords(prevRecords =>
                prevRecords.filter(record => record.id !== recordId)
            );
            if(modalState.record && modalState.record.id === recordId) {
                closeModal();
            }
        }
    };
    
    const deleteWorkerAndRecords = (workerName: string) => {
        if (window.confirm(`정말로 '${workerName}' 근로자의 "모든 기록"을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
            setWorkerRecords(prevRecords =>
                prevRecords.filter(record => record.name !== workerName)
            );
        }
    }

    const addSafetyCheckRecord = (newRecord: Omit<SafetyCheckRecord, 'id'>) => {
        setSafetyCheckRecords(prev => [{ ...newRecord, id: Date.now().toString() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const deleteAllWorkerRecords = () => {
        if (window.confirm('정말로 모든 분석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            setWorkerRecords([]);
        }
    };
    
    const isBase64Like = (str: string): boolean => {
        if (typeof str !== 'string' || str.length < 500) return false;
        return str.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/) !== null;
    }

    const importWorkerRecords = (importedRecords: any[]) => {
        if (!Array.isArray(importedRecords) || importedRecords.length === 0) {
            alert('파일 형식이 올바르지 않거나 데이터가 없습니다.');
            return;
        }
    
        const migratedRecords = importedRecords.map(record => {
            const newRecord: any = { ...record };

            if (!newRecord.originalImage) {
                const legacyFieldNames = ['image', 'imageData', 'base64', 'image_data', 'original_image', 'img_base64', 'img', 'photo', 'picture'];
                for (const fieldName of legacyFieldNames) {
                    if (newRecord[fieldName] && typeof newRecord[fieldName] === 'string' && newRecord[fieldName].length > 100) {
                        newRecord.originalImage = newRecord[fieldName];
                        break;
                    }
                }

                if (!newRecord.originalImage) {
                    for (const key in newRecord) {
                        const value = newRecord[key];
                        const knownTextFields = ['fullText', 'koreanTranslation', 'aiInsights', 'improvement'];
                        if (typeof value === 'string' && !knownTextFields.includes(key) && isBase64Like(value)) {
                             newRecord.originalImage = value;
                             break;
                        }
                    }
                }
            }

            if (newRecord.originalImage && typeof newRecord.originalImage === 'string' && newRecord.originalImage.startsWith('data:')) {
                newRecord.originalImage = newRecord.originalImage.split(',')[1];
            }
            
            // Ensure every record has a deterministic ID
            newRecord.id = `${newRecord.date}-${newRecord.name}`;

            return newRecord as WorkerRecord;
        });

        setWorkerRecords(prevRecords => {
            const recordMap = new Map<string, WorkerRecord>();
            prevRecords.forEach(r => recordMap.set(r.id, r));
            migratedRecords.forEach(newRecord => recordMap.set(newRecord.id, newRecord));
            
            const updatedRecords = Array.from(recordMap.values());
            return updatedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        alert(`${migratedRecords.length}개의 기록을 성공적으로 불러오고 병합했습니다.`);
    };
    
    const reanalyzeAllRecords = useCallback(async () => {
        if (!window.confirm(`총 ${workerRecords.length}개의 기록 전체를 AI로 재분석하시겠습니까? 상당한 시간이 소요될 수 있습니다.`)) {
            return;
        }
        setIsReanalyzingAll(true);
        const recordsToAnalyze = workerRecords.filter(r => r.originalImage);
        setReanalyzeAllProgress({ current: 0, total: recordsToAnalyze.length });

        for (let i = 0; i < recordsToAnalyze.length; i++) {
            const record = recordsToAnalyze[i];
            setReanalyzeAllProgress({ current: i + 1, total: recordsToAnalyze.length });
            try {
                // We reuse the single-record reanalysis logic
                await reanalyzeRecord(record, false); // `false` to suppress individual alerts
            } catch (e) {
                console.error(`Failed to reanalyze record ${record.id}:`, e);
                // Continue to the next record
            }
        }
        
        setIsReanalyzingAll(false);
        alert('전체 재분석이 완료되었습니다.');
    }, [workerRecords]);


    const reanalyzeRecord = useCallback(async (recordToReanalyze: WorkerRecord, showAlerts = true) => {
        if (!recordToReanalyze.originalImage) {
            if (showAlerts) alert('재분석할 원본 이미지가 없습니다.');
            return;
        }
        
        setIsReanalyzing(recordToReanalyze.id);
        try {
            const results = await analyzeWorkerRiskAssessment(recordToReanalyze.originalImage, 'image/jpeg', recordToReanalyze.nationality);
            
            if (results && results.length > 0) {
                const newRecordData = results[0];
                const updatedRecord = {
                    ...recordToReanalyze,
                    ...newRecordData,
                    id: `${newRecordData.date}-${newRecordData.name}`, // Use new deterministic ID
                    originalImage: recordToReanalyze.originalImage,
                };
                updateWorkerRecord(updatedRecord);
                if (showAlerts) alert('재분석이 완료되었습니다.');
            } else {
                 throw new Error("AI 분석 결과가 비어있습니다.");
            }
        } catch (e) {
            console.error("Re-analysis failed:", e);
            if (showAlerts) alert(`AI 재분석에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
            else throw e; // Re-throw for batch processing to catch
        } finally {
            setIsReanalyzing(null);
        }
    }, []);

    const openWorkerHistory = (record: WorkerRecord) => {
        setModalState({ type: 'workerHistory', record: record, workerName: record.name });
    };
    
    const openRecordDetail = (record: WorkerRecord) => {
        setModalState({ type: 'recordDetail', record: record });
    };

    const openIndividualReport = (record: WorkerRecord) => {
        setRecordForReport(record);
        setCurrentPage('individual-report');
    };

    const handleBackToApp = () => {
        setRecordForReport(null);
        setCurrentPage('ocr-analysis'); 
    }
    
    const closeModal = () => {
        setModalState({ type: null });
    };
    
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard workerRecords={workerRecords} safetyCheckRecords={safetyCheckRecords} setCurrentPage={setCurrentPage} />;
            case 'ocr-analysis':
                return <OcrAnalysis 
                            allRecords={workerRecords}
                            onAnalysisComplete={(newRecords) => importWorkerRecords([...workerRecords, ...newRecords])} 
                            onDeleteAll={deleteAllWorkerRecords}
                            onImport={importWorkerRecords}
                            onViewHistory={openWorkerHistory}
                            onViewDetail={openRecordDetail}
                            onDeleteWorker={deleteWorkerAndRecords}
                            onReanalyzeAll={reanalyzeAllRecords}
                            isReanalyzingAll={isReanalyzingAll}
                            reanalyzeAllProgress={reanalyzeAllProgress}
                        />;
            case 'worker-management':
                return <WorkerManagement 
                            workerRecords={workerRecords} 
                            onViewDetails={openWorkerHistory}
                        />;
            case 'predictive-analysis':
                return <PredictiveAnalysis workerRecords={workerRecords} />;
            case 'safety-checks':
                return <SafetyChecks 
                            workerRecords={workerRecords} 
                            checkRecords={safetyCheckRecords} 
                            onAddCheck={addSafetyCheckRecord} 
                        />;
            case 'performance-analysis':
                return <PerformanceAnalysis workerRecords={workerRecords}/>;
            case 'site-issue-management':
                return <SiteIssueManagement />;
            case 'reports':
                return <Reports />;
            case 'feedback':
                return <Feedback />;
            case 'introduction':
                return <Introduction />;
            case 'individual-report':
                if (recordForReport) {
                    return <IndividualReport record={recordForReport} onBack={handleBackToApp} />;
                }
                setCurrentPage('ocr-analysis'); // Fallback if no record is selected
                return null;
            default:
                return <Dashboard workerRecords={workerRecords} safetyCheckRecords={safetyCheckRecords} setCurrentPage={setCurrentPage} />;
        }
    };

    return (
        <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
            {renderPage()}
            
            {modalState.type === 'workerHistory' && modalState.record && modalState.workerName && (
                <WorkerHistoryModal
                    workerName={modalState.workerName}
                    allRecords={workerRecords}
                    initialSelectedRecord={modalState.record}
                    onClose={closeModal}
                    onViewDetails={openRecordDetail}
                    onUpdateRecord={updateWorkerRecord}
                    onDeleteRecord={deleteWorkerRecord}
                />
            )}
            {modalState.type === 'recordDetail' && modalState.record && (
                <RecordDetailModal
                    record={modalState.record}
                    onClose={closeModal}
                    onBack={() => openWorkerHistory(modalState.record)}
                    onUpdateRecord={updateWorkerRecord}
                    onOpenReport={openIndividualReport}
                    onReanalyze={reanalyzeRecord}
                    isReanalyzing={isReanalyzing === modalState.record.id}
                />
            )}
        </Layout>
    );
};

export default App;
