
export enum LogTemplate {
  PROFESSIONAL = '전문적 면담',
  HR = '인사/성과 면담',
  COUNSELING = '심리/상담',
  CASUAL = '일반/미팅'
}

export interface InterviewLog {
  id: string;
  title: string;
  date: string;
  originalText: string;
  organizedText: string;
  template: LogTemplate;
}

export interface GeminiResponse {
  text: string;
}
