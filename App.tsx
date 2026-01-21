
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardCopy, 
  Trash2, 
  FileText, 
  History, 
  Plus, 
  Sparkles,
  ChevronRight,
  Download,
  CheckCircle,
  RefreshCw,
  Key,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { LogTemplate, InterviewLog } from './types';
import { organizeInterviewNotes } from './services/geminiService';
import Button from './components/Button';

const STORAGE_KEY = 'interview_logs_history';

// Define AIStudio interface to resolve type mismatch and use it in Window augmentation.
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    readonly aistudio: AIStudio;
  }
}

const App: React.FC = () => {
  const [isKeySelected, setIsKeySelected] = useState<boolean | null>(null);
  const [inputText, setInputText] = useState('');
  const [organizedContent, setOrganizedContent] = useState('');
  const [template, setTemplate] = useState<LogTemplate>(LogTemplate.PROFESSIONAL);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<InterviewLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(hasKey);
      } catch (e) {
        setIsKeySelected(false);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeySelector = async () => {
    await window.aistudio.openSelectKey();
    // Proceed to app immediately after triggering selection to avoid race condition.
    setIsKeySelected(true); 
  };

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = useCallback((newLog: InterviewLog) => {
    const updated = [newLog, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [history]);

  const handleNewLog = useCallback(() => {
    setInputText('');
    setOrganizedContent('');
    setSelectedLogId(null);
    setTemplate(LogTemplate.PROFESSIONAL);
  }, []);

  const handleOrganize = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      const result = await organizeInterviewNotes(inputText, template);
      setOrganizedContent(result);
      
      const newLog: InterviewLog = {
        id: Date.now().toString(),
        title: inputText.slice(0, 25).trim() + (inputText.length > 25 ? '...' : ''),
        date: new Date().toLocaleDateString('ko-KR'),
        originalText: inputText,
        organizedText: result,
        template: template
      };
      
      saveToHistory(newLog);
      setSelectedLogId(newLog.id);
    } catch (error: any) {
      if (error.message === "API_KEY_ERROR") {
        setIsKeySelected(false);
        alert("선택된 API 키에 문제가 있습니다. 다시 선택해주세요.");
      } else {
        alert(error instanceof Error ? error.message : "오류가 발생했습니다.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmClear = () => {
    if (inputText.trim() || organizedContent) {
      if (confirm("작성 중인 내용과 결과를 모두 지우고 새로 시작할까요?")) {
        handleNewLog();
      }
    } else {
      handleNewLog();
    }
  };

  const copyToClipboard = () => {
    if (!organizedContent) return;
    navigator.clipboard.writeText(organizedContent);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 2000);
  };

  const downloadAsMarkdown = () => {
    const blob = new Blob([organizedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `면담일지_${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectHistoryItem = (log: InterviewLog) => {
    setInputText(log.originalText);
    setOrganizedContent(log.organizedText);
    setTemplate(log.template);
    setSelectedLogId(log.id);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("이 기록을 영구적으로 삭제하시겠습니까?")) {
      const updated = history.filter(h => h.id !== id);
      setHistory(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (selectedLogId === id) {
        handleNewLog();
      }
    }
  };

  // Render Setup Gate
  if (isKeySelected === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Orbs */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px]"></div>
        
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10 border border-white/20 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-xl shadow-blue-500/30 rotate-3">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 text-center mb-4 tracking-tight">
            스마트 면담일지 <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-slate-500 text-center mb-10 leading-relaxed font-medium">
            두서없이 작성한 메모를 AI가 깔끔한 보고서로 변환해드립니다.<br/>
            시작하려면 개인 API 키를 선택해주세요.
          </p>

          <div className="space-y-4">
            <Button 
              onClick={handleOpenKeySelector}
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-blue-600/20 transition-transform active:scale-[0.98]"
            >
              <Key className="w-5 h-5 mr-3" /> API 키 선택하기
            </Button>
            
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-slate-400 font-semibold hover:text-blue-500 transition-colors py-2"
            >
              <ExternalLink className="w-4 h-4" /> 결제 및 API 키 안내 가이드
            </a>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">보안 유지</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RefreshCw className="w-5 h-5 text-blue-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">실시간 정리</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Loader while checking key
  if (isKeySelected === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">초기화 중...</p>
      </div>
    );
  }

  // Main App Content
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900">
      {/* Sidebar - History */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col h-auto md:h-screen shrink-0">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">스마트 면담일지</h1>
          </div>
          <Button 
            variant="ghost" 
            className="p-2 hover:bg-blue-50 hover:text-blue-600 transition-colors" 
            onClick={handleNewLog}
            title="새 일지 작성"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            <History className="w-3 h-3" />
            최근 기록
          </div>
          
          {history.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">저장된 기록이 없습니다</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => selectHistoryItem(item)}
                className={`group p-3 rounded-xl cursor-pointer transition-all border ${
                  selectedLogId === item.id 
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-100' 
                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                    {item.template}
                  </span>
                  <button 
                    onClick={(e) => deleteHistoryItem(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-gray-800 line-clamp-1">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.date}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-100 space-y-3">
          <div 
            onClick={handleOpenKeySelector}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Key className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">API Status</p>
              <p className="text-xs font-bold text-slate-700">키 설정됨</p>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-4 text-white shadow-lg shadow-blue-200/50">
            <p className="text-xs font-medium opacity-80 mb-1">AI 팁</p>
            <p className="text-sm font-semibold mb-3 leading-snug">
              메모가 길어도 괜찮아요. AI가 핵심만 쏙쏙 뽑아 정리해드립니다.
            </p>
            <div className="flex items-center text-xs font-bold gap-1 cursor-pointer hover:translate-x-1 transition-transform">
              사용 가이드 <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2.5">
               <span className="text-sm font-semibold text-gray-500">템플릿 선택</span>
               <select 
                value={template} 
                onChange={(e) => setTemplate(e.target.value as LogTemplate)}
                className="bg-gray-100 border-none rounded-xl text-sm font-bold px-4 py-2 focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-200 transition-colors"
               >
                 {Object.values(LogTemplate).map(t => (
                   <option key={t} value={t}>{t}</option>
                 ))}
               </select>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="secondary" onClick={confirmClear} className="text-gray-500 border-none hover:bg-red-50 hover:text-red-600 transition-all">
               <RefreshCw className="w-4 h-4 mr-2" /> 초기화
             </Button>
             <Button 
              onClick={handleOrganize} 
              isLoading={isProcessing}
              disabled={!inputText.trim() || isProcessing}
              className="shadow-lg shadow-blue-100 px-6"
             >
               <Sparkles className="w-4 h-4 mr-2" /> 정리하기
             </Button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden">
          {/* Input Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h2 className="font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide text-xs">
                <FileText className="w-4 h-4 text-blue-500" /> Input: 원문 메모
              </h2>
              <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${inputText.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {inputText.length > 0 ? `${inputText.length}자 입력됨` : '비어 있음'}
              </span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="여기에 면담 내용을 자유롭게 메모하세요.&#10;&#10;예: 오늘 김대리 상담. 최근 프로젝트 마무리 후 좀 지쳐보임. 연봉 얘기 살짝 나왔고 다음 주에 연차 쓰기로 함."
              className="flex-1 p-8 text-gray-700 resize-none focus:outline-none text-base leading-relaxed placeholder:text-gray-300 font-sans"
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 flex flex-col min-w-0 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <h2 className="font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide text-xs">
                <CheckCircle className="w-4 h-4 text-green-500" /> Result: 정리된 결과
              </h2>
              {organizedContent && !isProcessing && (
                <div className="flex gap-2">
                  <Button variant="secondary" className="px-3 py-1.5 text-xs font-bold border-gray-200" onClick={copyToClipboard}>
                    <ClipboardCopy className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> 복사
                  </Button>
                  <Button variant="secondary" className="px-3 py-1.5 text-xs font-bold border-gray-200" onClick={downloadAsMarkdown}>
                    <Download className="w-3.5 h-3.5 mr-1.5 text-green-600" /> 저장
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-white relative">
              {!organizedContent && !isProcessing && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 transition-opacity duration-300">
                  <div className="p-6 bg-gray-50 rounded-full mb-4 border border-gray-100">
                    <Sparkles className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-sm font-medium">메모를 입력하고 '정리하기'를 누르면</p>
                  <p className="text-xs mt-1">이곳에 깔끔한 보고서가 나타납니다.</p>
                </div>
              )}
              
              {isProcessing && (
                <div className="h-full flex flex-col items-center justify-center space-y-6">
                  <div className="w-full max-w-[280px] space-y-4">
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-full"></div>
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-5/6"></div>
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-4/6"></div>
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse w-full"></div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    <p className="text-sm text-blue-500 font-bold animate-pulse">
                      AI가 일지를 구조화하고 있습니다...
                    </p>
                  </div>
                </div>
              )}

              {organizedContent && !isProcessing && (
                <article className="max-w-none text-gray-800 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="whitespace-pre-wrap font-sans text-base leading-relaxed tracking-tight border-l-4 border-blue-100 pl-6 py-2">
                    {organizedContent}
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Copy Toast */}
      {showCopyToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-6 z-50">
          <div className="bg-green-500 p-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          </div>
          클립보드에 복사되었습니다
        </div>
      )}
    </div>
  );
};

export default App;
