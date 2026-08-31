import React, { useState, useEffect } from 'react';
import { Menu, X, Smartphone, Users, Database, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BirthdayNotificationBell } from './BirthdayNotificationBell';

interface NavbarProps {
  activeTab: 'os' | 'clientes';
  onTabChange: (tab: 'os' | 'clientes') => void;
  onOpenSqlModal: () => void;
  lastUpdated?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onOpenSqlModal,
  lastUpdated,
}) => {
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const handleSelectTab = (tab: 'os' | 'clientes') => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="bg-[#0B1B4A] text-white sticky top-0 z-30 shadow-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Hamburger Button (3 lines - Bare Icon) + Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-menu-drawer"
              onClick={() => setIsMenuOpen(true)}
              className="p-1 -ml-1 text-white hover:text-white/80 active:scale-90 transition-transform flex items-center justify-center"
              title="Abrir Menu de Navegação"
              aria-label="Abrir Menu de Navegação"
            >
              <Menu className="w-7 h-7 text-white" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none text-white">
                  MAJOR
                </span>
                <span className="hidden xs:inline-block px-2 py-0.5 rounded-md bg-white/15 text-[10px] font-bold text-slate-200 tracking-wide uppercase">
                  {activeTab === 'os' ? 'Ordens de Serviço' : 'Clientes'}
                </span>
              </div>
              <span className="text-[10px] text-white/70 uppercase font-bold tracking-[0.18em] block leading-tight mt-0.5">
                Assistência Técnica
              </span>
            </div>
          </div>

          {/* Right: Quick Actions & Technician Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* SQL Setup Script Viewer */}
            <button
              onClick={onOpenSqlModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-all border border-white/10"
              title="Ver/Copiar Script SQL do Banco Supabase"
            >
              <Database className="w-3.5 h-3.5 text-white" />
              <span>SQL Supabase</span>
            </button>

            {/* Technician / Notifications / Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-white/15">
              <div className="hidden md:block text-right pr-1">
                <div className="text-xs font-semibold leading-tight truncate max-w-[140px] text-white">
                  {user?.email?.split('@')[0] || 'Técnico'}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold tracking-wide flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </div>
              </div>

              {/* Birthday Notification Bell */}
              <BirthdayNotificationBell lastUpdated={lastUpdated} />

              {/* Logout */}
              <button
                onClick={() => signOut()}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Sair do sistema"
                id="btn-logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-Over Drawer Navigation Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar Drawer Container */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#0B1B4A] text-white shadow-2xl z-10 flex flex-col h-full border-r border-white/15 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="p-5 border-b border-white/15 flex items-center justify-between bg-black/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white text-[#0B1B4A] flex items-center justify-center font-black text-lg shadow-md">
                  M
                </div>
                <div>
                  <h2 className="font-extrabold text-base tracking-tight leading-tight text-white">
                    MAJOR
                  </h2>
                  <p className="text-[10px] font-bold text-white/70 tracking-wider uppercase">
                    Menu do Sistema
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Options */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 px-3 py-1">
                Módulos de Gestão
              </div>

              {/* Tab 1: Ordens de Serviço */}
              <button
                type="button"
                id="menu-tab-os"
                onClick={() => handleSelectTab('os')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === 'os'
                    ? 'bg-white text-[#0B1B4A] shadow-lg shadow-black/20'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      activeTab === 'os' ? 'bg-[#0B1B4A]/10 text-[#0B1B4A]' : 'bg-white/10 text-white'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Ordens de Serviço</div>
                    <div
                      className={`text-[11px] font-normal ${
                        activeTab === 'os' ? 'text-[#0B1B4A]/70' : 'text-white/60'
                      }`}
                    >
                      Aparelhos, triagens & reparos
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    activeTab === 'os' ? 'translate-x-0.5 text-[#0B1B4A]' : 'text-white/40'
                  }`}
                />
              </button>

              {/* Tab 2: Clientes */}
              <button
                type="button"
                id="menu-tab-clientes"
                onClick={() => handleSelectTab('clientes')}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === 'clientes'
                    ? 'bg-white text-[#0B1B4A] shadow-lg shadow-black/20'
                    : 'text-white/85 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      activeTab === 'clientes' ? 'bg-[#0B1B4A]/10 text-[#0B1B4A]' : 'bg-white/10 text-white'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight">Clientes</div>
                    <div
                      className={`text-[11px] font-normal ${
                        activeTab === 'clientes' ? 'text-[#0B1B4A]/70' : 'text-white/60'
                      }`}
                    >
                      Base de contatos e histórico
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${
                    activeTab === 'clientes' ? 'translate-x-0.5 text-[#0B1B4A]' : 'text-white/40'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

