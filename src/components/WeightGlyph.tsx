import React from 'react';
import { RelicId, ToolId, WeightId } from '../types/game';

interface WeightGlyphProps {
  defId: WeightId;
  className?: string;
}

export const WeightGlyph: React.FC<WeightGlyphProps> = ({
  defId,
  className = 'w-8 h-8',
}) => {
  switch (defId) {
    case 'w_lead':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M8 12L12 8H24L28 12V28H8V12Z" fill="#3b4048" stroke="#9ca3af" strokeWidth="1.5" />
          <path d="M8 12H28" stroke="#6b7280" strokeWidth="1.2" />
          <circle cx="18" cy="20" r="3" fill="#1f2328" stroke="#9ca3af" strokeWidth="1" />
        </svg>
      );
    case 'w_cast':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <circle cx="18" cy="9" r="3" stroke="#9ca3af" strokeWidth="1.8" />
          <path d="M11 14H25L28 29H8L11 14Z" fill="#27272a" stroke="#a1a1aa" strokeWidth="1.5" />
          <path d="M13 21H23" stroke="#71717a" strokeWidth="1.4" />
        </svg>
      );
    case 'w_iron':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <polygon points="10,12 22,9 29,17 24,28 9,26" fill="#475569" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M14 14L22 22" stroke="#94a3b8" strokeWidth="1.2" />
        </svg>
      );
    case 'w_copper':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <circle cx="18" cy="18" r="10" fill="#92400e" stroke="#f59e0b" strokeWidth="1.6" />
          <rect x="14.5" y="14.5" width="7" height="7" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
        </svg>
      );
    case 'w_feather':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M27 7C18 8 11 15 9 27C15 24 23 19 27 7Z" fill="#cbd5e1" stroke="#f8fafc" strokeWidth="1.4" />
          <path d="M7 29L25 9" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'w_fallen':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M27 7C17 9 11 16 9 28C16 25 24 19 27 7Z" fill="#3f1d2b" stroke="#f43f5e" strokeWidth="1.5" />
          <path d="M7 29L24 10" stroke="#fb7185" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M15 17L19 19" stroke="#fda4af" strokeWidth="1.1" />
        </svg>
      );
    case 'w_helium':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M18 5L22 14L30 10L24 22L18 28L12 22L6 10L14 14L18 5Z" fill="#0f766e" stroke="#5eead4" strokeWidth="1.5" />
          <path d="M18 31V11" stroke="#99f6e4" strokeWidth="1.4" />
        </svg>
      );
    case 'w_gold':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M18 29C18 29 7 21.5 7 13.5C7 9.8 9.8 7 13.3 7C15.6 7 17.3 8.2 18 9.8C18.7 8.2 20.4 7 22.7 7C26.2 7 29 9.8 29 13.5C29 21.5 18 29 18 29Z"
            fill="#b45309"
            stroke="#fde047"
            strokeWidth="1.7"
          />
          <path d="M13 13L16 16L22 11" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'w_crystal':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <polygon points="18,4 27,13 24,29 12,29 9,13" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.5" />
          <polygon points="18,4 22,15 18,29 14,15" fill="#60a5fa" fillOpacity="0.45" />
        </svg>
      );
    case 'w_mirror':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <ellipse cx="18" cy="17" rx="9" ry="11" fill="#334155" stroke="#e2e8f0" strokeWidth="1.8" />
          <path d="M14 12L21 20M16 10L22 16" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M15 28H21V31H15V28Z" fill="#d97706" />
        </svg>
      );
    case 'w_twin':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M7 15H17L19 27H5L7 15Z" fill="#4f46e5" stroke="#c7d2fe" strokeWidth="1.4" />
          <path d="M19 15H29L31 27H17L19 15Z" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.4" />
          <path d="M12 15C12 10 24 10 24 15" stroke="#e0e7ff" strokeWidth="1.5" />
        </svg>
      );
    case 'w_mercury':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M15 6H21V11L27 21C28.5 24 26.5 29 22 29H14C9.5 29 7.5 24 9 21L15 11V6Z" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.5" />
          <path d="M10.5 22C13 20 23 24 25.5 22C26.5 25 25 27.5 22 27.5H14C11 27.5 9.5 25 10.5 22Z" fill="#38bdf8" />
        </svg>
      );
    case 'w_slime':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M7 24C7 15 12 9 18 9C24 9 29 15 29 24C29 27.5 25 29 18 29C11 29 7 27.5 7 24Z"
            fill="#15803d"
            stroke="#86efac"
            strokeWidth="1.6"
          />
          <circle cx="14" cy="19" r="2" fill="#dcfce7" />
          <circle cx="22" cy="19" r="2" fill="#dcfce7" />
        </svg>
      );
    case 'w_soul':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M18 5C22 10 26 14 26 21C26 26 22.5 30 18 30C13.5 30 10 26 10 21C10 15 14 11 16 8C16 11 18 12 18 5Z"
            fill="#7e22ce"
            stroke="#e9d5ff"
            strokeWidth="1.5"
          />
          <circle cx="15.5" cy="20" r="1.5" fill="#fef08a" />
          <circle cx="20.5" cy="20" r="1.5" fill="#fef08a" />
        </svg>
      );
    case 'w_crown':
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M6 26L8 12L14 18L18 9L22 18L28 12L30 26H6Z"
            fill="#b45309"
            stroke="#fde047"
            strokeWidth="1.6"
          />
          <circle cx="18" cy="21" r="2" fill="#ef4444" />
        </svg>
      );
  }
};

export const ToolGlyph: React.FC<{ defId: ToolId; className?: string }> = ({
  defId,
  className = 'w-6 h-6',
}) => {
  switch (defId) {
    case 't_glass':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="12" cy="12" r="7" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="3" stroke="#38bdf8" strokeWidth="1.2" />
          <path d="M17 17L24 24" stroke="#d97706" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 't_tweezers':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M22 6L9 19L6 23" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M22 6L12 22L6 23" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 't_file':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M10 18L22 6L24 8L12 20L10 18Z" fill="#94a3b8" stroke="#f8fafc" strokeWidth="1.3" />
          <path d="M5 23L10 18" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 't_glue':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M11 6H17L19 14V23H9V14L11 6Z" fill="#7f1d1d" stroke="#fca5a5" strokeWidth="1.5" />
          <path d="M12 6V4H16V6" stroke="#fbbf24" strokeWidth="1.5" />
        </svg>
      );
  }
};

export const RelicGlyph: React.FC<{ defId: RelicId; className?: string }> = ({
  defId,
  className = 'w-6 h-6',
}) => {
  switch (defId) {
    case 'r_fulcrum':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <polygon points="14,5 23,23 5,23" fill="#78350f" stroke="#f59e0b" strokeWidth="1.6" />
          <circle cx="14" cy="17" r="2.2" fill="#fde047" />
        </svg>
      );
    case 'r_pendulum':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M14 4V17" stroke="#e5e7eb" strokeWidth="1.6" />
          <circle cx="14" cy="20" r="4.5" fill="#d97706" stroke="#fde047" strokeWidth="1.6" />
          <path d="M7 18C9 21 19 21 21 18" stroke="#fbbf24" strokeWidth="1.1" strokeDasharray="2 2" />
        </svg>
      );
    case 'r_miracle':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="14" cy="14" r="9" fill="#451a03" stroke="#facc15" strokeWidth="1.6" />
          <path d="M14 7L16 12L21 14L16 16L14 21L12 16L7 14L12 12L14 7Z" fill="#fef08a" />
        </svg>
      );
    case 'r_zero':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <circle cx="14" cy="14" r="8" stroke="#5eead4" strokeWidth="1.7" />
          <path d="M9 19L19 9" stroke="#2dd4bf" strokeWidth="1.6" />
        </svg>
      );
    case 'r_altar':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <path d="M6 12H22L20 23H8L6 12Z" fill="#4c0519" stroke="#fb7185" strokeWidth="1.5" />
          <path d="M14 5C16 8 17 10 14 12C11 10 12 8 14 5Z" fill="#f97316" />
        </svg>
      );
    case 'r_scale':
      return (
        <svg viewBox="0 0 28 28" className={className} fill="none">
          <rect x="4" y="10" width="20" height="8" rx="1.5" fill="#1e293b" stroke="#fbbf24" strokeWidth="1.5" />
          <path d="M9 10V14M14 10V15M19 10V14" stroke="#fde047" strokeWidth="1.4" />
        </svg>
      );
  }
};
