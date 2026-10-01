import React from 'react';

interface DealScoutLogoProps {
  className?: string;
  size?: number;
}

export const DealScoutLogo: React.FC<DealScoutLogoProps> = ({
  className = 'w-9 h-9',
  size = 36,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-[28%] bg-[#FFB800] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${className}`}
    >
      {/* Exact tag icon from dee.JPG */}
      <svg
        viewBox="0 0 512 512"
        className="w-[62%] h-[62%]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 146 256
             L 228 174
             C 235 167, 245 164, 256 164
             L 362 164
             C 380 164, 396 180, 396 198
             L 396 314
             C 396 332, 380 348, 362 348
             L 256 348
             C 245 348, 235 345, 228 338
             L 146 256
             Z"
          fill="none"
          stroke="#0A0A0A"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="214" cy="256" r="18" fill="#0A0A0A" />
      </svg>
    </div>
  );
};
