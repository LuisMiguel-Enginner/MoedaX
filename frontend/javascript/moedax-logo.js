let logoInstance = 0;

export function moedaxLogoSvg({ title = 'MoedaX', hidden = false } = {}) {
  const id = ++logoInstance;
  const ribbonGrad = `ribbonGradient-${id}`;
  const barGrad = `barGradient-${id}`;
  const xGrad = `xGradient-${id}`;
  const a11y = hidden
    ? 'aria-hidden="true" focusable="false"'
    : `role="img" aria-label="${title}"`;

  return `<svg class="moedax-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 62" ${a11y}>
  <defs>
    <linearGradient id="${ribbonGrad}" x1="8" y1="88" x2="100" y2="5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B6BF0"/>
      <stop offset="55%" stop-color="#1499E0"/>
      <stop offset="80%" stop-color="#1ECFAC"/>
      <stop offset="100%" stop-color="#22E0A0"/>
    </linearGradient>
    <linearGradient id="${barGrad}" x1="0" y1="1" x2="0.3" y2="0">
      <stop offset="0%" stop-color="#16B8B0"/>
      <stop offset="100%" stop-color="#2FE8A8"/>
    </linearGradient>
    <linearGradient id="${xGrad}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1470E8"/>
      <stop offset="100%" stop-color="#22E0A0"/>
    </linearGradient>
  </defs>
  <g transform="translate(0,0) scale(0.6)">
    <rect x="46" y="70" width="11" height="25" rx="1.5" fill="url(#${barGrad})"/>
    <rect x="61" y="55" width="11" height="40" rx="1.5" fill="url(#${barGrad})"/>
    <rect x="76" y="38" width="11" height="57" rx="1.5" fill="url(#${barGrad})"/>
    <rect x="91" y="20" width="11" height="75" rx="1.5" fill="url(#${barGrad})"/>
    <polyline points="12,88 12,22 50,60 92,10" fill="none" stroke="white" stroke-width="19" stroke-linejoin="miter" stroke-linecap="butt"/>
    <polyline points="12,88 12,22 50,60 92,10" fill="none" stroke="url(#${ribbonGrad})" stroke-width="15" stroke-linejoin="miter" stroke-linecap="butt"/>
    <polygon points="92,10 109,4 99,26 94,15" fill="#22E0A0"/>
  </g>
  <text x="70" y="42" font-family="'Baloo 2', 'Poppins', 'Segoe UI', Arial, sans-serif" font-size="34" font-weight="700" fill="#16233E">Moeda<tspan fill="url(#${xGrad})">X</tspan></text>
</svg>`;
}

export function mountMoedaxLogos() {
  document.querySelectorAll('[data-moedax-logo]').forEach((node) => {
    const hidden = node.dataset.moedaxLogo === 'decorative';
    const title = node.dataset.logoTitle || 'MoedaX';
    node.innerHTML = moedaxLogoSvg({ title, hidden });
  });
}
