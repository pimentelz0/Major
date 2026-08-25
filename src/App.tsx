import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { LoginScreen } from './components/LoginScreen';
import { NewOSModal } from './components/NewOSModal';
import { OSDetailModal } from './components/OSDetailModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SqlSetupModal } from './components/SqlSetupModal';
import type { OSWithDetails } from './types';

function MainApp() {
  const { user, loading } = useAuth();

  // Modals state
  const [isNewOSOpen, setIsNewOSOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [selectedOS, setSelectedOS] = useState<OSWithDetails | null>(null);
  const [receiptOS, setReceiptOS] = useState<OSWithDetails | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1B4A] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white font-black text-xl animate-pulse">
          M
        </div>
        <div className="text-center">
          <h2 className="text-xl font-extrabold tracking-wider">MAJOR</h2>
          <p className="text-xs text-slate-300">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login Screen
  if (!user) {
    return (
      <>
        <LoginScreen onOpenSqlModal={() => setIsSqlModalOpen(true)} />
        <SqlSetupModal
          isOpen={isSqlModalOpen}
          onClose={() => setIsSqlModalOpen(false)}
        />
      </>
    );
  }

  // Logged in -> Show Full Major Technical Assistance Workspace
  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col text-slate-800 font-sans selection:bg-[#0B1B4A] selection:text-white">
      {/* Header Bar */}
      <Navbar
        onOpenNewOS={() => setIsNewOSOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        <Dashboard
          onOpenNewOS={() => setIsNewOSOpen(true)}
          onSelectOS={(os) => setSelectedOS(os)}
          onOpenSqlModal={() => setIsSqlModalOpen(true)}
          lastUpdated={lastUpdated}
        />
      </main>

      {/* Modals */}
      <NewOSModal
        isOpen={isNewOSOpen}
        onClose={() => setIsNewOSOpen(false)}
        onSuccess={() => {
          setLastUpdated(Date.now());
        }}
      />

      <OSDetailModal
        os={selectedOS}
        isOpen={!!selectedOS}
        onClose={() => setSelectedOS(null)}
        onUpdate={(updated) => {
          setSelectedOS(updated);
          setLastUpdated(Date.now());
        }}
        onDelete={() => {
          setSelectedOS(null);
          setLastUpdated(Date.now());
        }}
        onOpenReceipt={(os) => {
          setReceiptOS(os);
        }}
      />

      <ReceiptModal
        os={receiptOS}
        isOpen={!!receiptOS}
        onClose={() => setReceiptOS(null)}
      />

      <SqlSetupModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
