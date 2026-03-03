import React from "react";

interface IconProps {
  active: boolean;
  className?: string;
}

export const AIChatIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    {active && (
      <>
        <circle cx="8" cy="11.5" r="1" fill="currentColor" />
        <circle cx="12" cy="11.5" r="1" fill="currentColor" />
        <circle cx="16" cy="11.5" r="1" fill="currentColor" />
      </>
    )}
  </svg>
);

export const AIContactsIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="7"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AIAgentIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <rect
      x="3"
      y="8"
      width="18"
      height="12"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 4V8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="12" cy="3" r="1.5" fill="currentColor" />
    <circle cx="8" cy="14" r="1.5" fill="currentColor" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" />
    {active && (
      <path
        d="M9 17h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    )}
  </svg>
);

export const AINotificationIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AIShopIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M3 6h18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M16 10a4 4 0 0 1-8 0"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const AISocialIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <circle
      cx="12"
      cy="12"
      r="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);

export const AIDiscoverIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <polygon
      points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const AIWalletIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <rect
      x="2"
      y="6"
      width="20"
      height="14"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M2 10h20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="17" cy="14" r="1.5" fill="currentColor" />
  </svg>
);

export const AICreationIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M12 2l2 4 4.5 0.5-3.25 3 0.75 4.5L12 12l-4 2 0.75-4.5-3.25-3L10 6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 14v8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8 18l4-4 4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AICloudIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AIShortVideoIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <rect
      x="2"
      y="4"
      width="20"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <polygon
      points="10,8 16,12 10,16"
      fill={active ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const AIToolsIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
  </svg>
);

export const AITerminalIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M7 9l4 3-4 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13 15h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const AISettingsIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <circle
      cx="12"
      cy="12"
      r="3"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <path
      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export const AIAppStoreIcon = ({ active, className = "" }: IconProps) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    className={`transition-all duration-200 ${active ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"} ${className}`}
  >
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="4"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={active ? "currentColor" : "none"}
      fillOpacity={active ? 0.1 : 0}
    />
    <rect x="8" y="8" width="3" height="3" rx="1" fill="currentColor" />
    <rect x="13" y="8" width="3" height="3" rx="1" fill="currentColor" />
    <rect x="8" y="13" width="3" height="3" rx="1" fill="currentColor" />
    <rect x="13" y="13" width="3" height="3" rx="1" fill="currentColor" />
  </svg>
);

