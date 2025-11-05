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
import { mockWorkerRecords, mockSafetyCheckRecords } from './mockData';
import { WorkerHistoryModal } from './components/modals/WorkerHistoryModal';
import { RecordDetailModal } from './components/modals/RecordDetailModal';
import { analyzeWorkerRiskAssessment } from './services/geminiService';


const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [workerRecords, setWorkerRecords] = useState<WorkerRecord[]>(mockWorkerRecords);
    const [safetyCheckRecords, setSafetyCheckRecords] = useState<SafetyCheckRecord[]>(mockSafetyCheckRecords);
    const [modalState, setModalState] = useState<ModalState>({ type: null });
    const [recordForReport, setRecordForReport] = useState<WorkerRecord | null>(null);
    const [isReanalyzing, setIsReanalyzing] = useState<string | null>(null);

    const addWorkerRecords = (newRecords: WorkerRecord[]) => {
        setWorkerRecords(prev => [...prev, ...newRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const updateWorkerRecord = (updatedRecord: WorkerRecord) => {
        setWorkerRecords(prevRecords =>
            prevRecords.map(record =>
                record.id === updatedRecord.id ? updatedRecord : record
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
         // If the record being updated is in the modal, update the modal state too
        if (modalState.record && modalState.record.id === updatedRecord.id) {
            setModalState(prev => ({...prev, record: updatedRecord}));
        }
    };

    const deleteWorkerRecord = (recordId: string) => {
        if (window.confirm('정말로 이 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            setWorkerRecords(prevRecords =>
                prevRecords.filter(record => record.id !== recordId)
            );
            // Close modal if the deleted record was open
            if(modalState.record && modalState.record.id === recordId) {
                closeModal();
            }
        }
    };

    const addSafetyCheckRecord = (newRecord: Omit<SafetyCheckRecord, 'id'>) => {
        setSafetyCheckRecords(prev => [{ ...newRecord, id: Date.now().toString() }, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    };

    const deleteAllWorkerRecords = () => {
        if (window.confirm('정말로 모든 분석 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            setWorkerRecords([]);
        }
    };
    
    const importWorkerRecords = (importedRecords: any[]) => {
        if (!Array.isArray(importedRecords) || importedRecords.length === 0) {
            alert('파일 형식이 올바르지 않거나 데이터가 없습니다.');
            return;
        }
    
        const migratedRecords = importedRecords.map(record => {
            const newRecord: any = { ...record };

            // [Compatibility Layer] Check for various legacy image fields and migrate to 'originalImage'
            const legacyFieldNames = ['image', 'imageData', 'base64', 'image_data', 'original_image', 'img_base64'];
            let foundLegacyImage = null;

            for (const fieldName of legacyFieldNames) {
                if (newRecord[fieldName]) {
                    foundLegacyImage = newRecord[fieldName];
                    break; 
                }
            }

            if (foundLegacyImage && !newRecord.originalImage) {
                newRecord.originalImage = foundLegacyImage;
            }

            // Clean up all potential legacy fields
            for (const fieldName of legacyFieldNames) {
                delete newRecord[fieldName];
            }
            
            // [Data Standardization] Standardize the base64 string format by removing the data URI prefix
            if (newRecord.originalImage && typeof newRecord.originalImage === 'string' && newRecord.originalImage.startsWith('data:')) {
                newRecord.originalImage = newRecord.originalImage.split(',')[1];
            }

            return newRecord as WorkerRecord;
        });

        // Merge imported records with existing records
        setWorkerRecords(prevRecords => {
            const recordMap = new Map<string, WorkerRecord>();
            // Add existing records to the map first, keyed by a unique identifier (name + date)
            prevRecords.forEach(r => recordMap.set(`${r.name}-${r.date}`, r));
            // Add/update with new (migrated) records
            migratedRecords.forEach(newRecord => recordMap.set(`${newRecord.name}-${newRecord.date}`, newRecord));
            
            const updatedRecords = Array.from(recordMap.values());
            return updatedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        });

        alert(`${migratedRecords.length}개의 기록을 성공적으로 불러오고 병합했습니다.`);
    };

    const reanalyzeRecord = useCallback(async (recordToReanalyze: WorkerRecord) => {
        if (!recordToReanalyze.originalImage) {
            alert('재분석할 원본 이미지가 없습니다.');
            return;
        }
        
        setIsReanalyzing(recordToReanalyze.id);
        try {
            // Assume mimeType is jpeg for now, as we don't store it.
            const results = await analyzeWorkerRiskAssessment(recordToReanalyze.originalImage, 'image/jpeg', recordToReanalyze.nationality);
            
            if (results && results.length > 0) {
                const newRecordData = results[0];
                const updatedRecord = {
                    ...recordToReanalyze, // keep original id, image etc.
                    ...newRecordData, // overwrite with new analysis data
                    id: recordToReanalyze.id, // ensure ID is preserved
                    originalImage: recordToReanalyze.originalImage, // ensure original image is preserved
                };
                updateWorkerRecord(updatedRecord);
                alert('재분석이 완료되었습니다.');
            } else {
                 throw new Error("AI 분석 결과가 비어있습니다.");
            }
        } catch (e) {
            console.error("Re-analysis failed:", e);
            alert(`AI 재분석에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`);
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
                            onAnalysisComplete={addWorkerRecords} 
                            existingRecords={workerRecords}
                            onDeleteAll={deleteAllWorkerRecords}
                            onImport={importWorkerRecords}
                            onViewDetails={openWorkerHistory}
                            onDeleteRecord={deleteWorkerRecord}
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
            // `individual-report` is handled outside this function
            default:
                return <Dashboard workerRecords={workerRecords} safetyCheckRecords={safetyCheckRecords} setCurrentPage={setCurrentPage} />;
        }
    };

    if (currentPage === 'individual-report' && recordForReport) {
        return <IndividualReport record={recordForReport} onBack={handleBackToApp} />;
    }

    return (
        <>
            <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
                {renderPage()}
            </Layout>

            {modalState.type === 'workerHistory' && modalState.record && (
                <WorkerHistoryModal
                    workerName={modalState.workerName!}
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
                    onBack={() => openWorkerHistory(modalState.record!)}
                    onUpdateRecord={updateWorkerRecord}
                    onOpenReport={openIndividualReport}
                    onReanalyze={reanalyzeRecord}
                    isReanalyzing={isReanalyzing === modalState.record.id}
                />
            )}
        </>
    );
};

export default App;