import React from 'react';
import HeroSection from '../components/home/HeroSection.jsx';
import ChatWindow from '../components/home/ChatWindow.jsx';
import ProfilePanel from '../components/home/ProfilePanel.jsx';
import FaqAccordion from '../components/home/FaqAccordion.jsx';

export default function Home({ navigateTo, openSchemeDetail, chat }) {
  return (
    <div className="view-section">
      <HeroSection navigateTo={navigateTo} />

      {/* AI Assistant + Profile Cards Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-12" id="chat-section">
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 text-white rounded-t-xl p-5 sm:p-6 shadow-md border-b border-blue-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-400 flex items-center justify-center shrink-0 shadow-inner">
                <i className="fa-solid fa-microchip text-2xl"></i>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  Intelligent Scheme Guidance
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm mt-0.5 max-w-2xl leading-relaxed">
                  Discover relevant government schemes using your profile, requirements, and eligibility details.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main App Console */}
        <div className="bg-white rounded-b-xl shadow-md border border-t-0 border-slate-200 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          <ChatWindow
            chatMessages={chat.chatMessages}
            chatMessagesEndRef={chat.chatMessagesEndRef}
            userInputRef={chat.userInputRef}
            inputText={chat.inputText}
            setInputText={chat.setInputText}
            inputHighlighted={chat.inputHighlighted}
            isListening={chat.isListening}
            isSending={chat.isSending}
            voiceLang={chat.voiceLang}
            onToggleVoiceLang={chat.toggleVoiceLang}
            onSend={chat.handleSendMessage}
            onReset={chat.resetChat}
            onExploreScheme={openSchemeDetail}
            onSpeak={chat.speakText}
            onToggleVoice={chat.toggleVoiceRecognition}
            onStopVoice={chat.stopVoiceRecognition}
            onPopulatePrompt={chat.populatePromptOnly}
          />
          <ProfilePanel onSelectProfile={chat.setProfileToInput} />
        </div>
      </section>

      <FaqAccordion />
    </div>
  );
}
