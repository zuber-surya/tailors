import React from 'react';
import { useAuth } from '../lib/AuthContext';
import { Users, UserPlus, LogOut, Search, Settings, House } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { logout, user } = useAuth();

  const tabs = [
    { id: 'home', icon: House, label: 'Home' },
    { id: 'customers', icon: Users, label: 'Customers' },
    { id: 'sync', icon: UserPlus, label: 'Sync' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  if (!user) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">{children}</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 flex flex-col">
      <header className="bg-white border-bottom border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">TailorMate</h1>
          <button onClick={logout} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="max-w-xl mx-auto flex items-center justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all duration-200",
                activeTab === tab.id ? "text-blue-600" : "text-gray-400"
              )}
            >
              <tab.icon size={24} className={cn(activeTab === tab.id && "scale-110")} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
