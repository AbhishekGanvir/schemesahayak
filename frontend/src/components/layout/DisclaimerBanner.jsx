import React from 'react';

export default function DisclaimerBanner({ onAccept }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 px-1 sm:px-3 pb-1 sm:pb-3">
  <div
    className="
      relative
      mx-auto
      w-full
      max-w-7xl
      overflow-hidden
      rounded-t-2xl sm:rounded-2xl
      border border-blue-400/30
      bg-[#071735]/[0.98]
      backdrop-blur-xl
      shadow-[0_-8px_35px_rgba(15,23,42,0.45)]
    "
  >

    {/* Tricolor top border */}
    <div className="absolute top-0 left-0 right-0 h-1 flex">
      <div className="w-1/3 bg-[#ff9933]" />
      <div className="w-1/3 bg-white" />
      <div className="w-1/3 bg-[#138808]" />
    </div>

    <div
      className="
        relative
        px-4 py-4
        sm:px-6 sm:py-5
        lg:px-8 lg:py-6
      "
    >

      <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-7">

        {/* Icon */}
        <div className="hidden sm:flex shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white/10 border border-white/10 items-center justify-center">
          <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-full bg-blue-500/20 border border-blue-300/20 flex items-center justify-center">
            <i className="fa-solid fa-landmark text-xl lg:text-2xl text-blue-200"></i>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 w-full">

          {/* Heading */}
          <div className="flex items-center gap-2 mb-2">
            <i className="fa-solid fa-shield-halved text-yellow-400 text-base sm:text-lg"></i>

            <h3 className="text-white font-bold text-base sm:text-lg lg:text-xl">
              Important Disclaimer
            </h3>
          </div>

          {/* Main disclaimer */}
          <p className="text-slate-300 text-[11px] sm:text-xs lg:text-sm leading-[1.55]">
            <strong className="text-white">Scheme Sahayak</strong> is an
            open-source, AI-powered information platform designed to help
            citizens discover and understand Indian Government Schemes.
            <span className="text-white font-semibold">
              {" "}We are NOT affiliated with the Government of India, department, or public-sector organization.
            </span>
          </p>

          {/* Secondary text */}
          <p className="text-slate-400 text-[10px] sm:text-xs lg:text-sm leading-[1.5] mt-2">
            Scheme information is compiled and cross-checked using official
            government portals and publicly available sources. Users are
            advised to verify eligibility, documents, deadlines, benefits,
            and application requirements on the official portal before applying.
          </p>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">

            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-300">
              <i className="fa-solid fa-circle-check text-green-400"></i>
              Source Verified
            </span>

            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-300">
              <i className="fa-solid fa-building-columns text-blue-400"></i>
              Official Portals Referenced
            </span>

            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-300">
              <i className="fa-solid fa-user-shield text-emerald-400"></i>
              Citizen First
            </span>

          </div>

        </div>

        {/* Desktop divider */}
        <div className="hidden lg:block w-px h-24 bg-white/10 shrink-0"></div>

        {/* Button section */}
        <div className="w-full lg:w-[235px] shrink-0">

          <button
            onClick={onAccept}
            className="
              group
              w-full
              px-4 py-3
              sm:px-5 sm:py-3.5
              rounded-xl
              bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600
              hover:from-blue-400 hover:via-blue-500 hover:to-indigo-500
              text-white
              font-bold
              text-xs sm:text-sm
              border border-blue-300/30
              shadow-[0_6px_20px_rgba(37,99,235,0.3)]
              hover:shadow-[0_8px_25px_rgba(37,99,235,0.45)]
              transition-all duration-200
              flex items-center justify-center gap-2 cursor-pointer
            "
          >
            <i className="fa-solid fa-circle-check"></i>
            I Understand &amp; Accept
          </button>

          {/* Mobile / desktop helper */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-[9px] sm:text-[10px] text-slate-500">
            <i className="fa-solid fa-lock"></i>
            <span>By continuing, you acknowledge this disclaimer</span>
          </div>

          <a
            href="https://india.gov.in"
            target="_blank"
            rel="noreferrer"
            className="
              block
              mt-1.5
              text-center
              text-[10px] sm:text-[11px]
              text-blue-400
              hover:text-blue-300
              underline
              underline-offset-2
            "
          >
            Verify information at india.gov.in ↗
          </a>

        </div>

      </div>
    </div>
  </div>
</div>
  );
}
