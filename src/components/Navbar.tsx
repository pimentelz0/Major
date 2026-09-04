import React, { useState, useEffect } from 'react';
import { Menu, X, Smartphone, Users, Database, LogOut, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BirthdayNotificationBell } from './BirthdayNotificationBell';
import { InstallAppModal } from './InstallAppModal';

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
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

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

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
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
                <img
                  src="/pwa-192x192.png"
                  alt="Logo MAJOR"
                  className="w-10 h-10 rounded-2xl shadow-md border border-white/20 flex-shrink-0"
                />
                <div>
                  <h2 className="font-extrabold text-base tracking-tight leading-tight text-white">
                    MAJOR
                  </h2>
                  <p className="text-[10px] font-bold text-white/70 tracking-wider uppercase">
                    Assistência Técnica
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

              {/* PWA Section */}
              <div className="pt-3 border-t border-white/10 mt-3 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 px-3 py-1">
                  Aplicativo Móvel
                </div>

                <button
                  type="button"
                  id="menu-btn-install-app"
                  onClick={() => {
                    setIsInstallModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl transition-all font-bold text-sm text-white/90 hover:text-white hover:bg-white/10 border border-white/10 bg-white/5"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/20 text-sky-300 border border-sky-400/30">
                      <Download className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="leading-tight text-white">Instalar Aplicativo</div>
                      <div className="text-[11px] font-normal text-slate-300">
                        Adicionar à Tela Inicial
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>

            {/* Drawer Footer (User Session & Logout) */}
            <div className="p-4 border-t border-white/15 bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.email || 'Técnico'}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">Sessão ativa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  signOut();
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title="Sair do sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Installation Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </>
  );
};

