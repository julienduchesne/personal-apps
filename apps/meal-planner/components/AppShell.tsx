import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-amber-50/50 via-orange-50/30 to-lime-50/20">
      {/* Mobile nav */}
      <MobileSidebar />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
