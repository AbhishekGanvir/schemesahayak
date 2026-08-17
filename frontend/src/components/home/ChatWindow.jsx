import React from 'react';
import ChatMessage from './ChatMessage.jsx';

export default function ChatWindow({
  chatMessages,
  chatMessagesEndRef,
  userInputRef,
  inputText,
  setInputText,
  inputHighlighted,
  isListening,
  isSending,
  voiceLang,
  onToggleVoiceLang,
  onSend,
  onReset,
  onExploreScheme,
  onSpeak,
  onToggleVoice,
  onStopVoice,
  onPopulatePrompt
}) {
  return (
    <div className="lg:col-span-8 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 min-h-[560px]">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow">
              <i className="fa-solid fa-robot"></i>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">AI Scheme Advisor</h3>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          title="Reset Chat"
          className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-all text-xs flex items-center gap-1 font-semibold"
        >
          <i className="fa-solid fa-rotate-right text-xs"></i>
          <span>Reset Chat</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-5 overflow-y-auto max-h-[460px] space-y-4 bg-slate-50/30">
        {chatMessages.map((msg) => (
          <ChatMessage key={msg.id} msg={msg} onExploreScheme={onExploreScheme} onSpeak={onSpeak} />
        ))}
        {isSending && (
          <div className="flex gap-3 items-start max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-sm">
              <i className="fa-solid fa-robot"></i>
            </div>
            <div className="rounded-2xl rounded-tl-none p-4 bg-slate-50 border border-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={chatMessagesEndRef} />
      </div>

      {/* Active Voice Bar */}
      {isListening && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center justify-between animate-pulse">
          <span className="flex items-center gap-2 font-bold">
            <i className="fa-solid fa-microphone text-red-600 text-sm"></i>
            Listening... Speak clearly now
          </span>
          <button onClick={onStopVoice} className="text-xs text-red-800 underline font-extrabold">
            Cancel
          </button>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
        <span className="text-[11px] text-slate-400 font-bold uppercase shrink-0">Try Asking:</span>
        <button
          onClick={() => onPopulatePrompt('What government schemes and financial benefits are available for farmers? Please explain the eligibility criteria and benefits.')}
          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-full transition-all text-xs font-medium shadow-2xs"
        >
          🌾 Farmer Schemes
        </button>
        <button
          onClick={() => onPopulatePrompt('What government health schemes and healthcare benefits are available? Please explain the eligibility criteria and benefits.')}
          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-full transition-all text-xs font-medium shadow-2xs"
        >
          🏥 Health Benefits
        </button>
        <button
          onClick={() => onPopulatePrompt('What government scholarships and financial assistance are available for students? Please explain the eligibility criteria, benefits, and application process.')}
          className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded-full transition-all text-xs font-medium shadow-2xs"
        >
          🎓 Student Scholarships
        </button>
      </div>

      {/* Input Box with Mic Icon Beside Send Icon */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSend();
          }}
          className="relative flex items-center"
        >
          <textarea
            ref={userInputRef}
            rows="1"
            value={inputText}
            disabled={isSending}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isSending ? 'Waiting for a response...' : 'Type your query or click a profile on the right...'}
            className={`w-full pl-4 pr-32 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none transition-all disabled:opacity-60 ${
              inputHighlighted ? 'ring-2 ring-blue-600 bg-white' : ''
            }`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />

          {/* Mic Icon placed beside Send Icon */}
          <div className="absolute right-2.5 flex items-center gap-1.5">
            

            <button
              type="button"
              onClick={onToggleVoice}
              title="Click to Speak"
              className={`w-8  cursor-pointer h-8 rounded-lg flex items-center justify-center text-xs transition-all ${
                isListening
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-600'
              }`}
            >
              <i className="fa-solid  fa-microphone"></i>
            </button>

            <button
              type="submit"
              title="Send Question"
              disabled={isSending}
              className="w-8 h-8 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-xs shadow-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className={`fa-solid ${isSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
