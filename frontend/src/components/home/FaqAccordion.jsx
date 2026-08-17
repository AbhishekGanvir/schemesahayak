import React, { useState } from 'react';

const FAQ_ITEMS = [
  {
    id: 'faq1',
    question: 'How does Voice Search work in Scheme Sahayak AI?',
    answer:
      'Click the microphone icon beside the send button and speak your question naturally. Scheme Sahayak AI converts your voice into text and instantly finds matching scheme details.'
  },
  {
    id: 'faq2',
    question: 'How do I download crisp scheme summary sheets in PDF?',
    answer:
      'Open any scheme detail page by clicking "Explore Scheme →" or "View Details", then click the "Download Scheme Details " button. A formatted print sheet will be securely generated on your device.'
  },
  {
    id: 'faq3',
    question: 'How do I know if I am fully eligible for a scheme?',
    answer:
      'Every scheme detail page clearly lists the "Eligibility Criteria" and "Required Documents." You can also directly ask the AI Assistant, "Am I eligible for [Scheme Name] if I earn [Income]?" for a precise answer.'
  },
  {
    id: 'faq4',
    question: 'Is my personal data safe with Scheme Sahayak?',
    answer:
      'Yes. We only provide public information about schemes. We never ask for your Aadhaar, bank details, or passwords, and all official applications happen on government portals, not on our site.'
  },
  {
    id: 'faq5',
    question: 'Can I apply for schemes directly through this app?',
    answer:
      'We guide you through the process, but you must apply on the official government website. Click the "Apply on Official Portal" button inside any scheme to securely redirect to the real application page.'
  }
];

export default function FaqAccordion() {
  const [activeFaq, setActiveFaq] = useState(null);

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 my-14">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-6 tracking-tight text-center sm:text-left">
        Frequently Asked Questions
      </h2>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <button
              onClick={() => setActiveFaq(activeFaq === item.id ? null : item.id)}
              className="w-full p-4 sm:p-5 text-left font-semibold text-xs sm:text-sm text-slate-800 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <span>{item.question}</span>
              <i
                className={`fa-solid cursor-pointer fa-chevron-down text-xs text-slate-400 transition-transform duration-200 ${
                  activeFaq === item.id ? 'rotate-180' : ''
                }`}
              ></i>
            </button>
            {activeFaq === item.id && (
              <div className="px-4 sm:px-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40 py-4">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
