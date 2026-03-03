import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { WindowControls } from "./WindowControls";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary">
      <WindowControls showTitleBar={false} style="macos" className="absolute right-2 top-2 w-auto" />
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-bg-secondary">{children}</main>
    </div>
  );
}

export default MainLayout;
