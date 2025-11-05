export type Page = 
    'dashboard' | 
    'ocr-analysis' | 
    'worker-management' | 
    'predictive-analysis' |
    'performance-analysis' |
    'safety-checks' |
    'site-issue-management' |
    'reports' |
    'feedback' |
    'introduction' |
    'individual-report';

export type ModalState = {
    type: 'workerHistory' | 'recordDetail' | null;
    record?: WorkerRecord;
    workerName?: string;
};

export interface HandwrittenAnswer {
    questionNumber: string;
    answerText: string;
    koreanTranslation: string;
}

export interface WorkerRecord {
    id: string; // Unique ID for each record
    name: string;
    jobField: string;
    date: string;
    nationality: string;
    language: string;
    handwrittenAnswers: HandwrittenAnswer[];
    fullText: string;
    koreanTranslation: string;
    safetyScore: number;
    safetyLevel: '초급' | '중급' | '고급';
    strengths: string[];
    strengths_native: string[];
    weakAreas: string[];
    weakAreas_native: string[];
    improvement: string;
    improvement_native: string;
    suggestions: string[];
    suggestions_native: string[];
    aiInsights: string;
    aiInsights_native: string;
    selfAssessedRiskLevel: '상' | '중' | '하';
    originalImage?: string; // Base64 encoded image string
}

export interface HighRiskWorker {
    name: string;
    score: number;
}

export interface SafetyBriefing {
    greeting: string;
    focus_area: {
        korean: string;
    };
    priority_workers: {
        name:string;
        reason_korean: string;
    }[];
    encouragement: {
        korean: string;
    };
}

export interface SafetyCheckRecord {
    id: string;
    workerName: string;
    date: string;
    type: 'unsafe_action' | 'unsafe_condition';
    reason: string;
    details: string;
}