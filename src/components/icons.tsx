import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

/** 뚜껑 열린 냄비 + 김 */
export function PotIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 10.5h16" />
      <path d="M5 10.5V16a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-5.5" />
      <path d="M2.5 13h2M19.5 13h2" />
      <path d="M9 7.5q1.2-1.4 0-3M15 7.5q1.2-1.4 0-3" />
    </svg>
  );
}

export function DiceIcon(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** 펼쳐진 메뉴판 */
export function BookIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 6.5C10 4.8 6.8 4.5 4 5v13.5c2.8-.5 6-.2 8 1.5 2-1.7 5.2-2 8-1.5V5c-2.8-.5-6-.2-8 1.5Z" />
      <path d="M12 6.5V20" />
      <path d="M6.5 9h2.5M6.5 12.5h2.5M15 9h2.5M15 12.5h2.5" />
    </svg>
  );
}

export function CalendarIcon(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 2.8V6.5M16 2.8V6.5" />
      <path d="M7.5 14h3M7.5 17h5.5" />
    </svg>
  );
}

export function ChartIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 4v16h16" />
      <path d="M8 16v-5M12.5 16V7.5M17 16v-3" />
      <circle cx="17" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FlameIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3.5c.6 2.6-3.4 4.6-3.4 8.2a3.4 3.4 0 0 0 6.8.1c0-1.4-.6-2.4-.6-2.4s2.2 1 2.7 3.6a5.9 5.9 0 1 1-11.7-1.2C6.3 8.5 10.8 7 12 3.5Z" />
    </svg>
  );
}

export function ClockIcon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function StarIcon({ filled = false, ...p }: P & { filled?: boolean }) {
  return (
    <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
      <path d="M12 3.6l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8L12 3.6Z" />
    </svg>
  );
}

export function HeartIcon({ filled = false, ...p }: P & { filled?: boolean }) {
  return (
    <svg {...base(p)} fill={filled ? "currentColor" : "none"}>
      <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 3c0 5.4-7.5 10-7.5 10Z" />
    </svg>
  );
}

export function PlusIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4.5 6.5h15M9.5 6V4.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V6" />
      <path d="M6.5 6.5l.8 12A2 2 0 0 0 9.3 20.5h5.4a2 2 0 0 0 2-1.9l.8-12.1" />
      <path d="M10 10.5v6M14 10.5v6" />
    </svg>
  );
}

export function PencilIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 20l.9-3.8L16.4 4.7a1.9 1.9 0 0 1 2.7 0l.2.2a1.9 1.9 0 0 1 0 2.7L7.8 19.1 4 20Z" />
      <path d="M14.5 6.6l2.9 2.9" />
    </svg>
  );
}

export function DownloadIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 4v10.5M8 11l4 4 4-4" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

export function UploadIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 15V4.5M8 8l4-4 4 4" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

export function CheckIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function RefreshIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
      <path d="M19.8 3.5v3.7h-3.7" />
    </svg>
  );
}

export function SearchIcon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15.2 15.2L20 20" />
    </svg>
  );
}

export function XIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** 손가락으로 찜 — 직접 고르기 */
export function HandIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M9 11.5V5a1.5 1.5 0 0 1 3 0v5.5" />
      <path d="M12 10.5V7.8a1.5 1.5 0 0 1 3 0v3.7" />
      <path d="M15 11.5v-1a1.5 1.5 0 0 1 3 0V15a5.5 5.5 0 0 1-5.5 5.5H12a5.5 5.5 0 0 1-4.6-2.4l-2.6-4a1.4 1.4 0 0 1 2.2-1.8L9 14.5" />
    </svg>
  );
}

/** 밥그릇 */
export function BowlIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 12.5a8 8 0 0 0 16 0Z" />
      <path d="M9.5 9q1.3-1.6 0-3.4M14 9q1.3-1.6 0-3.4" />
      <path d="M8.5 20.5h7" />
    </svg>
  );
}

export function PhoneIcon(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.8" />
      <path d="M10.5 18.3h3" />
    </svg>
  );
}

export function HelpIcon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.4 9.3a2.7 2.7 0 1 1 3.8 2.5c-.75.3-1.2.85-1.2 1.7" />
      <circle cx="12" cy="16.6" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.4-2.4a4.5 4.5 0 1 0-6.4-6.4l-1.3 1.3" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-2.4 2.4a4.5 4.5 0 1 0 6.4 6.4l1.3-1.3" />
    </svg>
  );
}

/** 공유 노드 — 같이 쓰기 */
export function ShareIcon(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="17.5" cy="5.5" r="2.6" />
      <circle cx="17.5" cy="18.5" r="2.6" />
      <path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4" />
    </svg>
  );
}

export function CopyIcon(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
      <path d="M15.5 5.5v-1a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" />
    </svg>
  );
}

export function CloudIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M7 18.5a4.5 4.5 0 0 1-.6-8.96 5.5 5.5 0 0 1 10.7 1.2A3.9 3.9 0 0 1 16.5 18.5Z" />
      <path d="M9.5 14.5l2 2 3-3.5" />
    </svg>
  );
}

export function SparkIcon(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z" />
      <path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
