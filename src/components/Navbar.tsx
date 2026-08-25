import React from 'react';
import { LogOut, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenNewOS: () => void;
  onOpenSqlModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSqlModal }) => {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-[#0B1B4A] text-white sticky top-0 z-30 shadow-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none text-white">
                MAJOR
              </span>
            </div>
            <span className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em] block leading-tight mt-0.5">
              Assistência Técnica
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* SQL Setup Script Viewer */}
          <button
            onClick={onOpenSqlModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white transition-all border border-white/10"
            title="Ver/Copiar Script SQL do Banco Supabase"
          >
            <Database className="w-3.5 h-3.5 text-white" />
            <span>SQL Supabase</span>
          </button>

          {/* Technician / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/15">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-semibold leading-tight truncate max-w-[120px] text-white">
                {user?.email?.split('@')[0] || 'Técnico'}
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold tracking-wide">Online</div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Sair do sistema"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
