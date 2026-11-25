/**
 * Bespoke Visual SVG Artwork Generator for Featured Intro & 7 Lesson Cards
 * Pure visual storytelling thumbnails — zero walls of text.
 */
(function () {
  const THUMB_SVGS = {
    intro: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gIntroSun" cx="82%" cy="22%" r="55%">
            <stop offset="0%" stop-color="#ff8a5b" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#080b12" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="320" height="180" fill="#080b12"/>
        <rect width="320" height="180" fill="url(#gIntroSun)"/>
        <path d="M0 128 Q90 102 175 122 T320 108 L320 180 L0 180 Z" fill="#1b1418"/>
        <path d="M40 148 C105 142, 165 98, 268 82" stroke="#38bdf8" stroke-width="3" stroke-dasharray="6 5" fill="none"/>
        <polygon points="108,132 192,76 205,128" fill="rgba(56,189,248,0.14)"/>
        <circle cx="268" cy="82" r="9" fill="none" stroke="#34d399" stroke-width="2.5"/>
        <circle cx="268" cy="82" r="3.5" fill="#34d399"/>
        <g transform="translate(88,118) rotate(-12)">
          <rect x="-22" y="-11" width="44" height="20" rx="5" fill="#f4f6fb"/>
          <rect x="8" y="-18" width="10" height="8" rx="2" fill="#38bdf8"/>
          <circle cx="-16" cy="12" r="6.5" fill="#1e293b" stroke="#ff5c35" stroke-width="2"/>
          <circle cx="0" cy="13" r="6.5" fill="#1e293b" stroke="#ff5c35" stroke-width="2"/>
          <circle cx="16" cy="12" r="6.5" fill="#1e293b" stroke="#ff5c35" stroke-width="2"/>
        </g>
      </svg>`,

    big_picture: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#080c14"/>
        <circle cx="160" cy="90" r="56" fill="none" stroke="rgba(56,189,248,0.22)" stroke-width="2" stroke-dasharray="5 5"/>
        <path d="M160 34 A56 56 0 0 1 216 90" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M216 90 A56 56 0 0 1 160 146" fill="none" stroke="#ff5c35" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M160 146 A56 56 0 0 1 104 90" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="160" cy="34" r="14" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
        <circle cx="216" cy="90" r="14" fill="#0f172a" stroke="#ff5c35" stroke-width="2"/>
        <circle cx="160" cy="146" r="14" fill="#0f172a" stroke="#34d399" stroke-width="2"/>
        <circle cx="104" cy="90" r="14" fill="#0f172a" stroke="#fbbf24" stroke-width="2"/>
        <rect x="142" y="80" width="36" height="20" rx="5" fill="#f8fafc"/>
        <circle cx="149" cy="103" r="4.5" fill="#ff5c35"/>
        <circle cx="160" cy="103" r="4.5" fill="#ff5c35"/>
        <circle cx="171" cy="103" r="4.5" fill="#ff5c35"/>
      </svg>`,

    simulation: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gSun2" cx="78%" cy="26%" r="36%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="0.9"/>
            <stop offset="45%" stop-color="#ff5c35" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#080b12" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="320" height="180" fill="#080b12"/>
        <circle cx="250" cy="46" r="64" fill="url(#gSun2)"/>
        <g stroke="rgba(255,92,53,0.22)" stroke-width="1">
          <line x1="20" y1="145" x2="300" y2="145"/>
          <line x1="40" y1="125" x2="280" y2="125"/>
          <line x1="65" y1="108" x2="255" y2="108"/>
          <line x1="70" y1="108" x2="30" y2="160"/>
          <line x1="130" y1="108" x2="110" y2="160"/>
          <line x1="190" y1="108" x2="210" y2="160"/>
          <line x1="250" y1="108" x2="290" y2="160"/>
        </g>
        <polygon points="195,134 214,110 232,134" fill="#fb7185" opacity="0.85"/>
        <polygon points="238,142 252,122 268,142" fill="#f97316" opacity="0.75"/>
        <line x1="250" y1="46" x2="102" y2="118" stroke="#fde047" stroke-width="1.8" stroke-dasharray="4 4"/>
        <rect x="70" y="114" width="42" height="18" rx="4" fill="#e2e8f0"/>
        <path d="M88 114 L98 95 L114 98" stroke="#38bdf8" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      </svg>`,

    perception: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#070b13"/>
        <polygon points="44,96 268,34 268,156" fill="rgba(56,189,248,0.08)" stroke="rgba(56,189,248,0.28)" stroke-width="1.2"/>
        <line x1="88" y1="138" x2="276" y2="116" stroke="#34d399" stroke-width="2" stroke-dasharray="5 4"/>
        <g fill="#38bdf8" opacity="0.75">
          <circle cx="152" cy="96" r="2.5"/><circle cx="160" cy="90" r="2.5"/><circle cx="166" cy="100" r="2.5"/>
          <circle cx="158" cy="104" r="2.5"/><circle cx="171" cy="93" r="2.5"/><circle cx="149" cy="103" r="2.5"/>
        </g>
        <rect x="142" y="82" width="38" height="30" rx="3" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" stroke-width="2"/>
        <g fill="#ff5c35" opacity="0.85">
          <circle cx="222" cy="74" r="2.5"/><circle cx="230" cy="68" r="2.5"/><circle cx="236" cy="79" r="2.5"/>
          <circle cx="226" cy="83" r="2.5"/><circle cx="218" cy="82" r="2.5"/>
        </g>
        <rect x="210" y="60" width="36" height="32" rx="3" fill="rgba(255,92,53,0.12)" stroke="#ff5c35" stroke-width="2"/>
        <rect x="26" y="84" width="22" height="24" rx="4" fill="#f8fafc"/>
      </svg>`,

    localization: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#070b12"/>
        <g stroke="rgba(167,139,250,0.16)" stroke-width="1">
          <rect x="172" y="38" width="116" height="104" rx="8" fill="rgba(15,23,42,0.7)"/>
          <rect x="188" y="54" width="24" height="24" fill="rgba(52,211,153,0.2)"/>
          <rect x="212" y="54" width="24" height="24" fill="rgba(251,191,36,0.32)"/>
          <rect x="236" y="54" width="24" height="24" fill="rgba(244,63,94,0.65)"/>
          <rect x="212" y="78" width="24" height="24" fill="rgba(251,191,36,0.38)"/>
          <rect x="188" y="102" width="24" height="24" fill="rgba(56,189,248,0.2)"/>
        </g>
        <ellipse cx="92" cy="92" rx="48" ry="30" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="1.8" stroke-dasharray="4 4"/>
        <ellipse cx="92" cy="92" rx="22" ry="14" fill="rgba(52,211,153,0.22)" stroke="#34d399" stroke-width="2"/>
        <circle cx="92" cy="92" r="5" fill="#fff"/>
        <line x1="92" y1="92" x2="128" y2="74" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
      </svg>`,

    navigation: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#070a11"/>
        <circle cx="192" cy="88" r="24" fill="rgba(244,63,94,0.2)" stroke="#f43f5e" stroke-width="1.8"/>
        <circle cx="192" cy="88" r="11" fill="#f43f5e"/>
        <g stroke="rgba(56,189,248,0.28)" stroke-width="1.4" fill="none">
          <path d="M62 128 Q120 138 176 112"/>
          <path d="M62 128 Q115 112 168 88"/>
          <path d="M62 128 Q112 82 184 54"/>
          <path d="M62 128 Q105 64 176 40"/>
          <path d="M62 128 Q128 152 212 138"/>
        </g>
        <path d="M62 128 C112 72, 168 42, 268 52" stroke="#fbbf24" stroke-width="3.6" fill="none" stroke-linecap="round"/>
        <circle cx="268" cy="52" r="8" fill="none" stroke="#34d399" stroke-width="2.5"/>
        <circle cx="62" cy="128" r="9" fill="#ff5c35"/>
      </svg>`,

    mission: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#080b13"/>
        <polygon points="62,130 116,58 192,72 256,48 242,132" fill="none" stroke="rgba(52,211,153,0.35)" stroke-width="2" stroke-dasharray="5 4"/>
        <path d="M62 130 L116 58 L192 72 L256 48" fill="none" stroke="#34d399" stroke-width="3"/>
        <circle cx="62" cy="130" r="10" fill="#0ea5e9" stroke="#fff" stroke-width="2"/>
        <circle cx="116" cy="58" r="8" fill="#34d399"/>
        <circle cx="192" cy="72" r="8" fill="#34d399"/>
        <circle cx="256" cy="48" r="8" fill="#fbbf24"/>
        <circle cx="242" cy="132" r="8" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
      </svg>`,

    referee: `
      <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
        <rect width="320" height="180" fill="#080a11"/>
        <circle cx="105" cy="92" r="46" fill="rgba(52,211,153,0.08)" stroke="#34d399" stroke-width="2" stroke-dasharray="5 4"/>
        <circle cx="105" cy="92" r="5" fill="#fbbf24"/>
        <circle cx="88" cy="102" r="17" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" stroke-width="2"/>
        <line x1="88" y1="102" x2="105" y2="92" stroke="#fff" stroke-width="2"/>
        <g transform="translate(178, 44)">
          <rect x="0" y="0" width="108" height="16" rx="4" fill="#34d399"/>
          <rect x="0" y="24" width="92" height="16" rx="4" fill="#38bdf8"/>
          <rect x="0" y="48" width="64" height="16" rx="4" fill="#fbbf24"/>
          <rect x="0" y="72" width="48" height="16" rx="4" fill="#ff5c35"/>
        </g>
      </svg>`
  };

  window.RoarThumbnails = {
    getSvg(kind) {
      return THUMB_SVGS[kind] || THUMB_SVGS.intro;
    }
  };
})();
