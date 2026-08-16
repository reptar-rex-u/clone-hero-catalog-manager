import { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { DifficultyFlags, InstrumentInfo, InstrumentName } from '../../shared/types';
import {
  ALL_INSTRUMENTS,
  INSTRUMENT_LABELS,
  instrumentState,
} from '../../shared/instruments';

interface Props {
  instruments?: InstrumentInfo[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function IconGlyph({ name }: { name: InstrumentName }) {
  switch (name) {
    case 'Guitar':
      return (
        <g fill="currentColor" transform="rotate(38 12 12)">
          {/* Body: Lower bout + upper bout */}
          <path d="M 6.5 14.5 A 3.5 3.5 0 1 0 13.5 14.5 A 3.5 3.5 0 0 0 6.5 14.5 M 8 10.5 A 2.5 2.5 0 1 0 13 10.5 A 2.5 2.5 0 0 0 8 10.5" />
          {/* Neck */}
          <rect x="9.75" y="3.5" width="1.5" height="6" />
          {/* Headstock */}
          <rect x="9" y="1" width="3" height="2.5" rx="0.5" />
          {/* Bridge */}
          <rect x="8.5" y="16.5" width="4" height="1.5" rx="0.3" />
        </g>
      );
    case 'Bass':
      return (
        <>
          <g fill="currentColor" transform="rotate(38 12 12)">
            <path d="M 6.5 14.5 A 3.5 3.5 0 1 0 13.5 14.5 A 3.5 3.5 0 0 0 6.5 14.5 M 8 10.5 A 2.5 2.5 0 1 0 13 10.5 A 2.5 2.5 0 0 0 8 10.5" />
            <rect x="9.75" y="3.5" width="1.5" height="6" />
            <rect x="9" y="1" width="3" height="2.5" rx="0.5" />
            <rect x="8.5" y="16.5" width="4" height="1.5" rx="0.3" />
          </g>
          <text
            x="22"
            y="22"
            fill="currentColor"
            fontSize="10.35"
            fontWeight="700"
            fontFamily="system-ui, Segoe UI, sans-serif"
            textAnchor="end"
          >
            B
          </text>
        </>
      );
    case 'Rhythm':
      return (
        <text
          x="12"
          y="18.5"
          fill="currentColor"
          fontSize="20"
          fontWeight="600"
          fontFamily="Segoe UI Symbol, Segoe UI, system-ui, sans-serif"
          textAnchor="middle"
        >
          ♫
        </text>
      );
    case 'GuitarCoop':
      return (
        <g fill="currentColor">
          <g transform="translate(-2.2 0.2) scale(0.86)">
            <g transform="rotate(38 12 12)">
              <path d="M 6.5 14.5 A 3.5 3.5 0 1 0 13.5 14.5 A 3.5 3.5 0 0 0 6.5 14.5 M 8 10.5 A 2.5 2.5 0 1 0 13 10.5 A 2.5 2.5 0 0 0 8 10.5" />
              <rect x="9.75" y="3.5" width="1.5" height="6" />
              <rect x="9" y="1" width="3" height="2.5" rx="0.5" />
              <rect x="8.5" y="16.5" width="4" height="1.5" rx="0.3" />
            </g>
          </g>
          <g transform="translate(5.4 1.6) scale(0.86)">
            <g transform="rotate(38 12 12)">
              <path d="M 6.5 14.5 A 3.5 3.5 0 1 0 13.5 14.5 A 3.5 3.5 0 0 0 6.5 14.5 M 8 10.5 A 2.5 2.5 0 1 0 13 10.5 A 2.5 2.5 0 0 0 8 10.5" />
              <rect x="9.75" y="3.5" width="1.5" height="6" />
              <rect x="9" y="1" width="3" height="2.5" rx="0.5" />
              <rect x="8.5" y="16.5" width="4" height="1.5" rx="0.3" />
            </g>
          </g>
        </g>
      );
    case 'Keys':
      return (
        <>
          <rect
            x="3"
            y="7"
            width="18"
            height="10"
            rx="1.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M7 7v6M11 7v6M15 7v6M19 7v6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
        </>
      );
    case 'Drums':
      return (
        <>
          <ellipse
            cx="12"
            cy="14"
            rx="7"
            ry="3.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M5 14v2.4c0 1.9 3.1 3.4 7 3.4s7-1.5 7-3.4V14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M8 5.2 9.8 10M16 5.2 14.2 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      );
    case 'Vocals':
      return (
        <>
          <rect
            x="9"
            y="3.5"
            width="6"
            height="10"
            rx="3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M7 11a5 5 0 0 0 10 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M12 16v3.5M9.2 19.5h5.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      );
    default:
      return null;
  }
}

function difficultyLetters(flags: DifficultyFlags): string {
  const parts: string[] = [];
  if (flags.expert) parts.push('E');
  if (flags.hard) parts.push('H');
  if (flags.medium) parts.push('M');
  if (flags.easy) parts.push('Ez');
  return parts.join(', ');
}

function tooltipFor(name: InstrumentName, instruments?: InstrumentInfo[]): string {
  const label = INSTRUMENT_LABELS[name];
  const hit = instruments?.find((i) => i.instrument === name);
  if (!hit) return label;
  const letters = difficultyLetters(hit.difficulties);
  return letters ? `${label} ${letters}` : label;
}

interface TipState {
  text: string;
  x: number;
  y: number;
  place: 'above' | 'below';
}

export function InstrumentIcons({ instruments, size = 'sm', className }: Props) {
  const [tip, setTip] = useState<TipState | null>(null);

  const showTip = (event: MouseEvent<HTMLElement>, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const below = rect.bottom + 8;
    const above = rect.top - 8;
    const place: 'above' | 'below' =
      below + 28 < window.innerHeight || above < 48 ? 'below' : 'above';
    setTip({
      text,
      x: rect.left + rect.width / 2,
      y: place === 'below' ? below : above,
      place,
    });
  };

  return (
    <>
      <div className={`instrument-icons size-${size}${className ? ` ${className}` : ''}`}>
        {ALL_INSTRUMENTS.map((name) => {
          const state = instrumentState(instruments, name);
          const text = tooltipFor(name, instruments);

          return (
            <button
              key={name}
              type="button"
              className={`instrument-icon state-${state}`}
              aria-label={text}
              onMouseEnter={(e) => showTip(e, text)}
              onMouseLeave={() => setTip(null)}
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <IconGlyph name={name} />
              </svg>
            </button>
          );
        })}
      </div>
      {tip &&
        createPortal(
          <div
            className={`instrument-tooltip place-${tip.place}`}
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </>
  );
}
