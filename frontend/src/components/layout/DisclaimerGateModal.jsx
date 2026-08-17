import React from 'react';

// Shown whenever the user tries to use the AI assistant (send a
// message, use the microphone, tap a suggested question, or open the
// assistant from a scheme) before accepting the disclaimer. This is
// deliberately a separate, attention-grabbing overlay rather than an
// API/chat error, per the disclaimer requirement.
export default function DisclaimerGateModal({ onAccept, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-4">
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">Please accept the disclaimer before using the AI assistant.</h3>
        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          Scheme Sahayak is a privately owned information platform and is not affiliated with the Government of India.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onAccept}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-all"
          >
            I Understand &amp; Accept
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg text-xs transition-all"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}
