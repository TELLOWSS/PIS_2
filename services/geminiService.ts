import { GoogleGenAI, Type } from "@google/genai";
import type { WorkerRecord, SafetyBriefing, HighRiskWorker } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const workerRecordSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "근로자 이름" },
            jobField: { type: Type.STRING, description: "공종 (Type of work/trade)" },
            date: { type: Type.STRING, description: "작성일 (YYYY-MM-DD)" },
            nationality: { type: Type.STRING, description: "국적 (예: '베트남', '한국')" },
            language: { type: Type.STRING, description: "작성된 언어 ('ko', 'vi', 'en')" },
            handwrittenAnswers: {
                type: Type.ARRAY,
                description: "수기로 작성된 답변 목록",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionNumber: { type: Type.STRING },
                        answerText: { type: Type.STRING, description: "답변 원문" },
                        koreanTranslation: { type: Type.STRING, description: "답변 한국어 번역" }
                    },
                    required: ["questionNumber", "answerText", "koreanTranslation"]
                }
            },
            fullText: { type: Type.STRING, description: "OCR로 추출된 전체 텍스트" },
            koreanTranslation: { type: Type.STRING, description: "수기 답변들을 종합한 한국어 번역본" },
            safetyScore: { type: Type.NUMBER, description: "AI가 평가한 안전 점수 (0-100). 업무-위험 연관성 검증 페널티가 반영됨." },
            safetyLevel: { type: Type.STRING, description: "AI가 평가한 안전 수준 ('초급', '중급', '고급')" },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 분석한 강점 분야 (한국어)" },
            strengths_native: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 분석한 강점 분야 (모국어 번역)" },
            weakAreas: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 분석한 취약 분야 (한국어)" },
            weakAreas_native: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 분석한 취약 분야 (모국어 번역)" },
            improvement: { type: Type.STRING, description: "AI가 제안하는 가장 시급한 핵심 개선점 (한국어)" },
            improvement_native: { type: Type.STRING, description: "AI가 제안하는 가장 시급한 핵심 개선점 (모국어 번역)" },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 제안하는 구체적인 개선 방안 목록 (한국어)" },
            suggestions_native: { type: Type.ARRAY, items: { type: Type.STRING }, description: "AI가 제안하는 구체적인 개선 방안 목록 (모국어 번역)" },
            aiInsights: { type: Type.STRING, description: "작성 내용에 대한 AI의 종합적인 평가 및 인사이트 (한국어)" },
            aiInsights_native: { type: Type.STRING, description: "작성 내용에 대한 AI의 종합적인 평가 및 인사이트 (모국어 번역)" },
            selfAssessedRiskLevel: { type: Type.STRING, description: "근로자가 스스로 평가한 위험 등급 ('상', '중', '하')." }
        },
        required: ["name", "jobField", "date", "nationality", "language", "handwrittenAnswers", "fullText", "koreanTranslation", "safetyScore", "safetyLevel", "strengths", "weakAreas", "improvement", "suggestions", "aiInsights", "strengths_native", "weakAreas_native", "improvement_native", "suggestions_native", "aiInsights_native", "selfAssessedRiskLevel"]
    }
};

const safetyBriefingSchema = {
    type: Type.OBJECT,
    properties: {
        greeting: { type: Type.STRING, description: "안전 브리핑을 위한 간결하고 격려하는 아침 인사말." },
        focus_area: {
            type: Type.OBJECT,
            properties: {
                korean: { type: Type.STRING, description: "오늘의 주요 안전 중점 사항 (한국어)." }
            },
            required: ["korean"]
        },
        priority_workers: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "고위험 근로자 이름." },
                    reason_korean: { type: Type.STRING, description: "고위험 상태의 이유 (예: '안전 점수 65점')." }
                },
                required: ["name", "reason_korean"]
            }
        },
        encouragement: {
            type: Type.OBJECT,
            properties: {
                korean: { type: Type.STRING, description: "전체 팀을 위한 마지막 격려 안전 메시지 (한국어)." }
            },
            required: ["korean"]
        }
    },
    required: ["greeting", "focus_area", "priority_workers", "encouragement"]
};


export async function analyzeWorkerRiskAssessment(base64Image: string, mimeType: string, nationality: string): Promise<WorkerRecord[]> {
    const model = 'gemini-2.5-pro';
    
    const prompt = `
**역할**: 당신은 건설 현장 안전 관리 전문가 AI입니다. 당신의 주 임무는 근로자가 작성한 '일일 위험성 평가서'를 분석하고, 제공된 JSON 스키마에 따라 포괄적인 안전 분석 결과를 생성하는 것입니다. 근로자의 국적은 '${nationality}'입니다.

**핵심 지침 (CRITICAL INSTRUCTION)**:
1.  **데이터 추출**: 이미지에서 근로자 이름, 공종, 작성일, 수기 답변을 정확하게 OCR 및 추출합니다.
2.  **언어 감지 및 번역**: 수기 답변의 언어를 감지하고, 모든 답변을 자연스러운 한국어로 번역합니다.
3.  **AI 분석 및 점수 산정 (핵심 노하우)**:
    *   **업무-위험 연관성 검증 (CRITICAL)**: 안전 전문가로서, 답변 #2("가장 큰 위험요소")가 답변 #1("수행하는 작업")과 논리적으로 관련되어 있는지 **반드시** 확인해야 합니다.
        *   **중대한 불일치(예: 공종: '유도원', 위험: '감전')가 발견되면, 'safetyScore'에 20점의 페널티를 적용합니다.**
        *   'weakAreas' 배열에 **"업무와 무관한 위험성 평가"**를 추가합니다.
        *   'aiInsights'에 이 논리적 불일치로 인해 점수가 감점되었음을 명시해야 합니다.
    *   **안전 점수 (0-100)**: 위험성 평가의 품질을 기준으로 점수를 부여합니다.
        *   **고급 (85-100)**: 구체적인 위험과 실행 가능한 대책이 명확하게 식별됨.
        *   **중급 (65-84)**: 기본적인 위험은 식별되었으나, 설명이 추상적이거나 대책이 일반적임.
        *   **초급 (0-64)**: 위험이 제대로 식별되지 않았거나, 내용이 무관하거나, 부실하게 작성됨.
    *   **안전 수준**: 점수에 따라 '초급', '중급', '고급'으로 분류합니다.
4.  **이중 언어 출력 (MANDATORY & CRITICAL)**: AI가 생성하는 모든 분석 필드(strengths, weakAreas, improvement, suggestions, aiInsights)에 대해 **한국어 버전**과 **근로자의 모국어('${nationality}') 번역 버전**을 **반드시 함께** 제공해야 합니다. 예를 들어, \`strengths\` 필드에 한국어 분석 결과를 제공했다면, \`strengths_native\` 필드에는 해당 내용을 근로자의 모국어로 번역한 결과를 반드시 제공해야 합니다. 이 규칙은 모든 분석 필드에 예외 없이 적용됩니다.

**입력 데이터**:
-   **이미지**: [아래 첨부된 위험성 평가 기록지 이미지]
-   **추가 정보**: 근로자 국적: ${nationality}

**출력 형식**: 제공된 JSON 스키마를 따릅니다.
`;

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType
        }
    };

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [{ text: prompt }, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: workerRecordSchema,
        }
    });

    const jsonText = response.text.trim();
    try {
        const parsedResult = JSON.parse(jsonText) as Omit<WorkerRecord, 'id' | 'originalImage'>[];
        return parsedResult.map(record => ({
            ...record, 
            id: `${record.date}-${record.name}-${Math.random()}`,
            originalImage: base64Image
        }));
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("AI로부터 유효하지 않은 형식의 응답을 받았습니다.");
    }
}

export async function generateSafetyBriefing(topWeaknessArea: string, highRiskWorkers: HighRiskWorker[]): Promise<SafetyBriefing> {
    const model = 'gemini-2.5-flash';
    const highRiskWorkersString = highRiskWorkers.map(w => `${w.name} (${w.score}점)`).join(', ');

    const prompt = `
**역할**: 당신은 건설 현장 안전 관리자 AI입니다. 제공된 데이터를 기반으로 간결하고 명확하며 격려하는 어조의 일일 안전 브리핑 스크립트를 한국어로 생성해야 합니다.

**핵심 지침**:
1.  **데이터 기반**: 'Top Weakness Area'를 오늘의 주요 안전 중점 사항으로 설정합니다.
2.  **고위험 근로자 지정**: 'High-Risk Workers' 목록을 언급하며, 이들에게 특별한 주의가 필요함을 알립니다.
3.  **구조화**: 인사말, 중점 사항, 고위험 근로자 언급, 격려 메시지의 4단계 구조를 따릅니다.

**입력 데이터**:
-   **Top Weakness Area**: "${topWeaknessArea}"
-   **High-Risk Workers**: [${highRiskWorkersString}]

**출력 형식**: 제공된 JSON 스키마를 따릅니다.
`;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: safetyBriefingSchema,
        }
    });
    
    const jsonText = response.text.trim();
    try {
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse JSON response:", jsonText);
        throw new Error("AI로부터 유효하지 않은 형식의 응답을 받았습니다.");
    }
}