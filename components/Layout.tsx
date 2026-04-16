import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { LogOut, Menu } from 'lucide-react';
import { authService } from '../services/db';
import { useData } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onLogout }) => {
  const navigate = useNavigate();
  const { user } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    onLogout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-900">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-64 transition-all duration-300">
        
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center z-30 sticky top-0" role="banner">
            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
                  aria-label="Open Sidebar Menu"
                >
                  <Menu size={24} />
                </button>
                
                <div>
                  <h2 className="font-bold text-gray-800 text-sm md:text-base">{user?.farmName || 'My Farm'}</h2>
                  <p className="text-[10px] md:text-xs text-gray-500 hidden md:block">Welcome, {user?.name}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div id="google_translate_element" className="hidden md:block"></div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                    aria-label="Logout"
                >
                    <LogOut size={16} /> <span className="hidden md:inline">Logout</span>
                </button>
            </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 scroll-smooth" role="main">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;