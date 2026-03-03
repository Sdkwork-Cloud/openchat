import { memo, useCallback, useEffect, useState, type ReactNode } from "react";

interface WindowControlsProps {
  showTitleBar?: boolean;
  title?: ReactNode;
  className?: string;
  style?: "macos" | "windows";
}

type WindowState = "normal" | "maximized" | "minimized";

function isDesktopEnv(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_IPC__" in window;
}

async function callWindowApi(action: "minimize" | "toggleMaximize" | "close") {
  try {
    const { appWindow } = await import("@tauri-apps/api/window");
    if (action === "minimize") {
      await appWindow.minimize();
    } else if (action === "toggleMaximize") {
      await appWindow.toggleMaximize();
    } else {
      await appWindow.close();
    }
  } catch {
    // Ignore non-desktop or unavailable API.
  }
}

export const WindowControls = memo(function WindowControls({
  showTitleBar = true,
  title,
  className = "",
  style = "macos",
}: WindowControlsProps) {
  const [windowState, setWindowState] = useState<WindowState>("normal");
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    setDesktop(isDesktopEnv());
  }, []);

  const handleMinimize = useCallback(async () => {
    await callWindowApi("minimize");
    setWindowState("minimized");
  }, []);

  const handleMaximize = useCallback(async () => {
    await callWindowApi("toggleMaximize");
    setWindowState((prev) => (prev === "maximized" ? "normal" : "maximized"));
  }, []);

  const handleClose = useCallback(async () => {
    await callWindowApi("close");
  }, []);

  if (!desktop) {
    return null;
  }

  return (
    <div
      className={`z-[9999] ${showTitleBar ? "fixed top-0 right-0 h-10 w-full flex items-center bg-bg-secondary/80 backdrop-blur-sm border-b border-border" : "flex items-center"} ${className}`}
      onDoubleClick={showTitleBar ? handleMaximize : undefined}
      data-tauri-drag-region={showTitleBar ? true : undefined}
    >
      {showTitleBar ? (
        <div className="flex-1 h-full flex items-center px-4" data-tauri-drag-region>
          {title ? <span className="text-sm text-text-secondary font-medium select-none">{title}</span> : null}
        </div>
      ) : null}

      <div className={`flex items-center ${showTitleBar ? "h-full px-2" : ""}`}>
        {style === "macos" ? (
          <MacOSControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
          />
        ) : (
          <WindowsControls
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onClose={handleClose}
            windowState={windowState}
          />
        )}
      </div>
    </div>
  );
});

interface MacOSControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  windowState: WindowState;
}

const MacOSControls = memo(function MacOSControls({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
}: MacOSControlsProps) {
  return (
    <div className="flex items-center space-x-2">
      <button onClick={onClose} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]/30" title="Close" />
      <button onClick={onMinimize} className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/30" title="Minimize" />
      <button
        onClick={onMaximize}
        className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]/30"
        title={windowState === "maximized" ? "Restore" : "Maximize"}
      />
    </div>
  );
});

interface WindowsControlsProps {
  onMinimize: () => void;
  onMaximize: () => void;
  onClose: () => void;
  windowState: WindowState;
}

const WindowsControls = memo(function WindowsControls({
  onMinimize,
  onMaximize,
  onClose,
  windowState,
}: WindowsControlsProps) {
  const buttonClass = "w-12 h-10 flex items-center justify-center text-[#94A3B8] hover:text-white transition-colors duration-200";

  return (
    <div className="flex items-center -mr-2">
      <button onClick={onMinimize} className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`} title="Minimize">
        <span className="text-sm">-</span>
      </button>
      <button onClick={onMaximize} className={`${buttonClass} hover:bg-[rgba(255,255,255,0.1)]`} title={windowState === "maximized" ? "Restore" : "Maximize"}>
        <span className="text-sm">□</span>
      </button>
      <button onClick={onClose} className={`${buttonClass} hover:bg-[#E81123] hover:text-white`} title="Close">
        <span className="text-sm">×</span>
      </button>
    </div>
  );
});

export default WindowControls;

