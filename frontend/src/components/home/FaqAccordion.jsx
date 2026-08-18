import React, { useState } from 'react';

const FAQ_ITEMS = [
  {
    id: 'faq1',
    question: 'How reliable is the information provided by Scheme Sahayak AI?',
    answer:
      'Scheme Sahayak AI simplifies scheme information for easy understanding. Always confirm important details with the relevant official government source.'
  },
  {
    id: 'faq2',
    question: 'How can I understand a scheme’s eligibility and benefits?',
    answer:
      'Scheme Sahayak AI explains the key eligibility criteria, benefits, required documents, and application process in simple language. Always verify the final eligibility requirements with the official scheme source.'
  },
  {
    id: 'faq3',
    question: 'How can I compare different government schemes?',
    answer:
      'You can compare schemes based on key factors such as benefits, eligibility, required documents, and application process to find the option that best suits your needs.'
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
