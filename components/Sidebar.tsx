import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bird, ThermometerSun, Stethoscope, Calculator, MessageSquareText, TrendingUp, ReceiptIndianRupee, Package, X, Trash2, Download, Upload, Briefcase, ScanLine, FileText } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { dataService } from '../services/db';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const navItems = [
    { to: "/", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
    { to: "/scanner", icon: <ScanLine size={20} />, label: "Smart Bird Scanner" },
    { to: "/planning", icon: <Briefcase size={20} />, label: "Business Planner" },
    { to: "/chicks", icon: <Bird size={20} />, label: "Flock Manager" },
    { to: "/resources", icon: <Package size={20} />, label: "Inventory & Resources" },
    { to: "/transactions", icon: <ReceiptIndianRupee size={20} />, label: "Sales & Expenses" },
    { to: "/invoices", icon: <FileText size={20} />, label: "Invoices & Billing" },
    { to: "/health", icon: <Stethoscope size={20} />, label: "Vaccine & Health" },
    { to: "/guides", icon: <ThermometerSun size={20} />, label: "Guides & Brooding" },
    { to: "/analytics", icon: <TrendingUp size={20} />, label: "Breed Analytics" },
    { to: "/sales", icon: <Calculator size={20} />, label: "Profit Calculator" },
    { to: "/ai-expert", icon: <MessageSquareText size={20} />, label: "Ask AI Expert" },
  ];

  const handleBackup = () => {
      dataService.exportDatabase();
      if(window.innerWidth < 768) onClose();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              dataService.importDatabase(json);
          } catch (error) {
              alert("Invalid backup file format.");
          }
      };
      reader.readAsText(file);
      if(window.innerWidth < 768) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-orange-900 text-orange-50 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0
      `}>
        <div className="p-6 border-b border-orange-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                  <h1 className="text-lg font-bold text-white leading-none">PoultryMitra</h1>
                  <p className="text-[10px] text-orange-300 uppercase tracking-wider font-semibold mt-1">Farm Manager</p>
              </div>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-orange-200 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => onClose()} // Close sidebar on mobile when link clicked
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-yellow-500 text-orange-950 font-bold' : 'hover:bg-orange-800 text-orange-100'
                }`
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <div className="border-t border-orange-800 my-2 pt-2 space-y-2">
             <NavLink
              to="/trash"
              onClick={() => onClose()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-red-900/50 text-white font-bold' : 'hover:bg-red-900/30 text-orange-200 hover:text-white'
                }`
              }
            >
              <Trash2 size={20} />
              <span>Trash & Recovery</span>
            </NavLink>

            <button
                onClick={handleBackup}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-orange-800 text-orange-200 hover:text-white text-left"
            >
                <Download size={20} />
                <span>Backup Data</span>
            </button>

            <div className="relative">
                <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    title="Restore Data from Backup"
                />
                <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-orange-800 text-orange-200 hover:text-white text-left pointer-events-none"
                >
                    <Upload size={20} />
                    <span>Restore Data</span>
                </button>
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-orange-800 text-xs text-center text-orange-300">
          v1.2.0 | Built for India 🇮🇳
        </div>
      </div>
    </>
  );
};

export default Sidebar;