import React from 'react';

export default function Header({ currentView, navigateTo }) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[82px] flex items-center justify-between">

    {/* ================= BRAND ================= */}
    <button
      onClick={() => navigateTo('home')}
      className="group flex items-center text-left"
    >

      {/* LOGO */}
      <div className="
        w-12 h-12
        sm:w-14 sm:h-14
        lg:w-15 lg:h-15
        flex items-center justify-center
        shrink-0
        mr-2.5 sm:mr-3
      ">
        <img
          src="/schemesahayak.svg"
          alt="Scheme Sahayak"
          className="
            w-full
            h-full
            object-contain
            scale-[1.08]
            drop-shadow-[0_3px_5px_rgba(15,23,42,0.16)]
            transition-all
            duration-300
            group-hover:scale-[1.14]
            group-hover:drop-shadow-[0_5px_10px_rgba(37,99,235,0.22)]
          "
        />
      </div>


      {/* ================= WORDMARK ================= */}
      <div className="flex flex-col justify-center">

        {/* Main title */}
        <div className="
          flex
          items-baseline
          whitespace-nowrap
          leading-none
        ">

          <span className="
            text-[27px]
            sm:text-[30px]
            lg:text-[33px]
            font-black
            tracking-[-1.8px]
            text-[#0b1f3a]
            transition-colors
            duration-200
            group-hover:text-[#102b52]
          ">
            Scheme
          </span>

          <span className="
            text-[27px]
            sm:text-[30px]
            lg:text-[33px]
            font-black
            tracking-[-1.8px]
            text-blue-800
            ml-[6px]
            sm:ml-[7px]
            lg:ml-[8px]
            transition-colors
            duration-200
            
          ">
            Sahayak
          </span>

        </div>


        {/* Subtitle */}
        <span className="
          mt-[5px]
          text-[8px]
          sm:text-[9px]
          lg:text-[10px]
          font-bold
          uppercase
          tracking-[2.2px]
          text-slate-500
          whitespace-nowrap
        ">
          Your Guide to Government Schemes
        </span>


        {/* Tricolor accent */}
        <div className="
          flex
          h-[3px]
          w-[115px]
          sm:w-[135px]
          lg:w-[155px]
          mt-[7px]
          overflow-hidden
        ">
          <div className="w-1/3 bg-[#ff9933]" />
          <div className="w-1/3 bg-slate-200" />
          <div className="w-1/3 bg-[#138808]" />
        </div>

      </div>

    </button>


    {/* ================= SEARCH ================= */}
    <div className="flex  items-center">

      <button
        onClick={() =>
          navigateTo(
            currentView === 'search'
              ? 'home'
              : 'search'
          )
        }
        title={
          currentView === 'search'
            ? 'Go to AI Home'
            : 'Search Scheme Directory'
        }
        className="
          group
          w-11 h-11
          cursor-pointer
          sm:w-12 sm:h-12
        
          rounded-full

          bg-slate-50
          hover:bg-blue-50

          border
          border-slate-200
          hover:border-blue-300

          text-slate-700
          hover:text-blue-600

          flex
          items-center
          justify-center

          shadow-sm
          hover:shadow-md

          transition-all
          duration-200

          hover:-translate-y-0.5
        "
      >

        <i
          className={`
            fa-solid
            ${
              currentView === 'search'
                ? 'fa-robot'
                : 'fa-magnifying-glass'
            }
            text-[17px]
            transition-transform
            duration-200
            group-hover:scale-110
          `}
        />

      </button>

    </div>

  </div>
</header>
  );
}
