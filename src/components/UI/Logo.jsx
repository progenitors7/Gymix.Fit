import React from 'react';

const Logo = ({ className = "w-12 h-12", ...props }) => {
  const pathD = "M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z";

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="-12 -12 72 70" /* Expanded viewBox padding to prevent SVG boundary clipping */
      width="48"
      height="46"
      className={className}
      {...props}
    >
      <defs>
        {/* Core Premium Violet-Amethyst Metallic Gradient */}
        <linearGradient id="gymix-metallic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#863BFF" />
          <stop offset="50%" stopColor="#A770FF" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        {/* Ambient Glow Filter - coordinates expanded to 200% to prevent internal filter clipping */}
        <filter id="gymix-premium-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#863BFF" floodOpacity="0.4" />
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#A770FF" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Subtle offset backup path for depth */}
      <path 
        d={pathD}
        fill="#863BFF"
        opacity="0.12"
        transform="translate(1, 1)"
      />

      {/* Primary Glowing Brand Shape */}
      <path 
        d={pathD}
        fill="url(#gymix-metallic-grad)"
        filter="url(#gymix-premium-glow)"
      />
    </svg>
  );
};

export default Logo;
