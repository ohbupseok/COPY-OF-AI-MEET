
import { GoogleGenAI } from "@google/genai";
import { LogTemplate } from "../types";

export const organizeInterviewNotes = async (text: string, template: LogTemplate): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const systemInstructions = {
    [LogTemplate.PROFESSIONAL]: "이 노트를 전문적인 비즈니스 면담 일지 형식으로 정리하세요. 포함할 내용: 면담 제목, 날짜, 참석자, 주요 논의 사항, 결정 사항, 향후 액션 아이템.",
    [LogTemplate.HR]: "이 노트를 인사 기록용으로 정리하세요: 대상자 성명, 면담 목적, 주요 강점 및 성과, 개선 필요 사항, 본인 피드백, 후속 일정.",
    [LogTemplate.COUNSELING]: "이 노트를 상담 요약서 형식으로 정리하세요: 주요 고민/이슈, 정서적 상태, 핵심 인사이트, 제공된 조언/개입, 차기 상담 계획.",
    [LogTemplate.CASUAL]: "이 일반 미팅 노트를 가볍게 요약하세요: 대화 주제, 주요 결과물, 다음에 할 일."
  };

  const prompt = `
    당신은 전문 비서이자 조직 전문가입니다.
    사용자가 제공하는 두서없고 정돈되지 않은 면담 메모를 깔끔하고 구조화된 한국어 보고서 형식으로 다시 작성하는 것이 임무입니다.
    
    요청된 템플릿 스타일: ${template}
    지침: ${systemInstructions[template]}
    
    **중요 제약 사항:**
    1. 반드시 한국어로 작성하세요.
    2. 개조식(bullet points)을 사용하여 가독성을 높이세요.
    3. **어떤 경우에도 별표(**)나 언더바(__)를 사용한 굵게 하기, 강조 표시를 하지 마세요.** 복사 붙여넣기가 쉽도록 순수 텍스트 위주로 작성해야 합니다.
    4. 항목 구분은 줄바꿈과 대시(-), 번호(1, 2, 3) 등 표준 기호만 사용하세요.
    5. 메모에 언급된 이름이나 날짜가 있다면 정확히 추출하여 상단에 배치하세요.
    
    정리할 원문 메모:
    """
    ${text}
    """
    
    불필요한 강조 기호 없이 깔끔하게 텍스트로만 출력하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.5, // 가독성과 일관성을 위해 온도를 약간 낮춤
      }
    });

    return response.text || "내용을 정리하는 데 실패했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("노트를 정리할 수 없습니다. 연결 상태를 확인하거나 잠시 후 다시 시도해주세요.");
  }
};
