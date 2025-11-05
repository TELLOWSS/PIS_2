import type { WorkerRecord, SafetyCheckRecord, HandwrittenAnswer } from './types';

const jobFields = ['시스템', '용역', '철근', '분석', '배체정리', '형틀'];
const nationalities = ['베트남', '중국', '한국', '태국', '캄보디아', '몽골', '카자흐스탄'];
const namesByNationality: { [key: string]: string[] } = {
    '베트남': ['응우옌 반 A', '레 티 B', '쩐 반 C', '팜 티 D', '호앙 반 E'],
    '중국': ['왕웨이', '리나', '장민', '류양', '첸징'],
    '한국': ['김민준', '이서연', '박도윤', '최지우', '정시우'],
    '태국': ['솜삭', '말리', '아농', '프라슷', '수난'],
    '캄보디아': ['소카', '찬타', '나리', '반나', '소피'],
    '몽골': ['바트바야르', '오윤치멕', '간바타르', '나랑게렐', '테무진'],
    '카자흐스탄': ['아르만', '아이누르', '누르술탄', '굴나라', '예르잔'],
};
const weakAreasData = {
    ko: ['고소작업', '구체적인 안전 계획 부족', '기타', '업무와 무관한 위험성 평가', '화재위험', '안전장비 미착용'],
    vi: ['Làm việc trên cao', 'Thiếu kế hoạch an toàn cụ thể', 'Khác', 'Đánh giá rủi ro không liên quan đến công việc', 'Nguy cơ cháy nổ', 'Không đeo thiết bị bảo hộ']
};
const strengthsData = {
    ko: ['정리정돈 우수', '안전 절차 이해도 높음', '동료와의 협업 능력', '위험 요소 사전 파악'],
    vi: ['Giữ gìn vệ sinh tốt', 'Hiểu rõ quy trình an toàn', 'Kỹ năng hợp tác với đồng nghiệp', 'Nhận biết trước các yếu tố nguy hiểm']
};

const sampleAnswers: { [key: string]: HandwrittenAnswer[] } = {
    vi: [
        { questionNumber: '1', answerText: 'Làm việc trên cao, lắp đặt giàn giáo', koreanTranslation: '고소 작업, 비계 설치' },
        { questionNumber: '2', answerText: 'Rơi ngã, vật rơi, điện giật', koreanTranslation: '추락, 낙하물, 감전' },
        { questionNumber: '3', answerText: 'Đeo đai an toàn, đội mũ, đi giày bảo hộ', koreanTranslation: '안전벨트 착용, 안전모, 안전화 착용' },
        { questionNumber: '4', answerText: 'Kiểm tra tình trạng giàn giáo trước khi làm việc', koreanTranslation: '작업 전 비계 상태 확인' },
        { questionNumber: '5', answerText: 'Luôn ghi nhớ an toàn là trên hết', koreanTranslation: '항상 안전을 최우선으로 생각하겠습니다' }
    ],
    ko: [
        { questionNumber: '1', answerText: '철근 가공 및 조립', koreanTranslation: '철근 가공 및 조립' },
        { questionNumber: '2', answerText: '철근에 찔림, 무거운 자재 운반 시 허리 부상, 넘어짐', koreanTranslation: '철근에 찔림, 무거운 자재 운반 시 허리 부상, 넘어짐' },
        { questionNumber: '3', answerText: '안전화, 안전모, 안전장갑 착용', koreanTranslation: '안전화, 안전모, 안전장갑 착용' },
        { questionNumber: '4', answerText: '작업장 주변 정리정돈 및 자재 정렬', koreanTranslation: '작업장 주변 정리정돈 및 자재 정렬' },
        { questionNumber: '5', answerText: '동료와 함께 안전하게 작업하겠습니다', koreanTranslation: '동료와 함께 안전하게 작업하겠습니다' }
    ],
    vi_2: [
        { questionNumber: '1', answerText: 'Hàn điện, cắt kim loại', koreanTranslation: '전기 용접, 금속 절단' },
        { questionNumber: '2', answerText: 'Bỏng, cháy nổ, điện giật', koreanTranslation: '화상, 화재 폭발, 감전' },
        { questionNumber: '3', answerText: 'Sử dụng mặt nạ hàn, găng tay cách điện', koreanTranslation: '용접 마스크, 절연 장갑 사용' },
        { questionNumber: '4', answerText: 'Chuẩn bị bình cứu hỏa gần khu vực làm việc', koreanTranslation: '작업 구역 근처에 소화기 준비' },
        { questionNumber: '5', answerText: 'Cẩn thận trong công việc', koreanTranslation: '작업 시 주의하겠습니다' }
    ],
    ko_2: [
        { questionNumber: '1', answerText: '자재 정리 및 현장 청소', koreanTranslation: '자재 정리 및 현장 청소' },
        { questionNumber: '2', answerText: '못에 찔림, 폐기물에 베임', koreanTranslation: '못에 찔림, 폐기물에 베임' },
        { questionNumber: '3', answerText: '코팅장갑, 안전화 착용', koreanTranslation: '코팅장갑, 안전화 착용' },
        { questionNumber: '4', answerText: '폐기물 분리수거 및 지정 장소에 적재', koreanTranslation: '폐기물 분리수거 및 지정 장소에 적재' },
        { questionNumber: '5', answerText: '깨끗한 현장을 만들겠습니다', koreanTranslation: '깨끗한 현장을 만들겠습니다' }
    ]
};


const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomScore = () => Math.floor(Math.random() * 60) + 40; // 40 to 99
const getSafetyLevel = (score: number): '초급' | '중급' | '고급' => {
    if (score >= 85) return '고급';
    if (score >= 65) return '중급';
    return '초급';
};

const createMockWorkerRecord = (id: number): WorkerRecord => {
    const nationality = getRandomElement(nationalities);
    const langKey = nationality === '베트남' ? 'vi' : 'ko';
    const answersKey = Math.random() > 0.5 ? `${langKey}_2` : langKey;
    const answers = sampleAnswers[answersKey as keyof typeof sampleAnswers] || sampleAnswers[langKey];
    
    const name = getRandomElement(namesByNationality[nationality]);
    const score = getRandomScore();
    const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weakArea = getRandomElement(weakAreasData.ko);
    const weakAreaNative = weakAreasData.vi[weakAreasData.ko.indexOf(weakArea)];
    const strength = getRandomElement(strengthsData.ko);
    const strengthNative = strengthsData.vi[strengthsData.ko.indexOf(strength)];

    return {
        id: `w-${id}-${date}-${name.replace(/\s/g, '')}`,
        name: name,
        jobField: getRandomElement(jobFields),
        date: date,
        nationality: nationality,
        language: langKey,
        handwrittenAnswers: answers,
        fullText: 'OCR로 추출된 원본 텍스트입니다. 여기에는 근로자가 작성한 모든 내용이 포함됩니다.',
        koreanTranslation: '수기로 작성된 모든 답변을 종합하여 자연스럽게 번역한 내용입니다.',
        safetyScore: score,
        safetyLevel: getSafetyLevel(score),
        strengths: [strength],
        strengths_native: [strengthNative],
        weakAreas: [weakArea],
        weakAreas_native: [weakAreaNative],
        improvement: `가장 시급한 개선점은 '${weakArea}' 관련 안전 교육을 강화하는 것입니다.`,
        improvement_native: `Điểm cần cải thiện cấp bách nhất là tăng cường đào tạo an toàn liên quan đến '${weakAreaNative}'.`,
        suggestions: ['TBM 시 관련 내용 집중 교육', '주기적인 안전 장비 점검'],
        suggestions_native: ['Tập trung đào tạo nội dung liên quan trong giờ TBM', 'Kiểm tra định kỳ thiết bị an toàn'],
        aiInsights: 'AI가 종합적으로 분석한 결과, 해당 근로자는 전반적인 안전 인식은 갖추고 있으나, 특정 취약 분야에 대한 이해도가 부족한 것으로 보입니다. 맞춤형 교육을 통해 개선이 필요합니다.',
        aiInsights_native: 'Theo kết quả phân tích tổng hợp của AI, người lao động này có nhận thức chung về an toàn, nhưng thiếu hiểu biết về lĩnh vực yếu kém cụ thể. Cần cải thiện thông qua đào tạo phù hợp.',
        selfAssessedRiskLevel: getRandomElement(['상', '중', '하']),
        originalImage: undefined, // No image for mock data
    };
};

const createMockSafetyCheckRecord = (id: number, workers: WorkerRecord[]): SafetyCheckRecord => {
     const date = new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
     const type = Math.random() > 0.4 ? 'unsafe_action' : 'unsafe_condition'; // 60% actions, 40% conditions
     return {
        id: `sc-${id}`,
        workerName: getRandomElement(workers).name,
        date: date,
        type: type,
        reason: type === 'unsafe_action' ? '개인보호구' : '작업환경',
        details: type === 'unsafe_action' ? '안전모 턱끈 미착용' : '작업발판 고정 불량',
     };
}

// Create records ensuring some workers have multiple entries
const tempRecords: WorkerRecord[] = [];
for (let i = 0; i < 60; i++) { // Increased record count for more data
    const record = createMockWorkerRecord(i + 1);
    tempRecords.push(record);
    // Add more records for some workers
    if (Math.random() > 0.6 && tempRecords.length > 1) {
        const existingRecord = getRandomElement(tempRecords);
        const newRecordForExistingWorker = createMockWorkerRecord(i + 100);
        newRecordForExistingWorker.name = existingRecord.name;
        newRecordForExistingWorker.nationality = existingRecord.nationality;
        newRecordForExistingWorker.date = new Date(new Date(existingRecord.date).getTime() - (Math.random() * 10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        tempRecords.push(newRecordForExistingWorker);
    }
}


export const mockWorkerRecords: WorkerRecord[] = tempRecords
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

export const mockSafetyCheckRecords: SafetyCheckRecord[] = Array.from({ length: 20 }, (_, i) => createMockSafetyCheckRecord(i + 1, mockWorkerRecords))
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());