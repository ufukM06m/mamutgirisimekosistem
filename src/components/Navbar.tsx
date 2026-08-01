import React from 'react';
import { ActiveTab } from '../types';
import { LayoutGrid, Database, Cpu, Eye } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  entityCount: number;
  isEmbedMode: boolean;
  onToggleEmbedMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  entityCount,
  isEmbedMode,
  onToggleEmbedMode
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('directory')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/20 font-black text-xl">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  mamuthub.com
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Girişimcilik Dizini
                </span>
              </div>
              <p className="text-xs text-slate-400">Türkiye Girişimci & Yatırımcı Veritabanı</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'directory'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Dizin ({entityCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('scraper')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scraper'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="hidden sm:inline">Scraper & Sync</span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">Veri Yönetimi</span>
            </button>

            <button
              onClick={onToggleEmbedMode}
              className="ml-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-all shadow-sm"
              title="Mamuthub.com sayfasında görünecek olan Header'sız Temiz Embed Modunu Önizle"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Embed Testi</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
