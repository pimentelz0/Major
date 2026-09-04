import React, { useState, useEffect } from 'react';
import { X, Share2, PlusSquare, Download, CheckCircle2, Smartphone, Monitor } from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if running standalone
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B1B4A] text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-white/15 relative animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* App Icon & Identity */}
        <div className="flex items-center gap-4 mb-6">
          <img
            src="/pwa-192x192.png"
            alt="Ícone MAJOR"
            className="w-16 h-16 rounded-2xl shadow-xl border border-white/20 flex-shrink-0"
          />
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/15 text-slate-200 mb-1">
              App na Tela Inicial
            </span>
            <h2 className="text-xl font-black tracking-tight leading-tight text-white">
              MAJOR
            </h2>
            <p className="text-xs text-slate-300">Assistência Técnica de Smartphones</p>
          </div>
        </div>

        {isStandalone ? (
          <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">Aplicativo já instalado!</p>
            <p className="text-xs text-slate-300 mt-1">
              Você já está utilizando a MAJOR em modo tela cheia na sua tela inicial.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Native prompt button if available */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-white hover:bg-slate-100 text-[#0B1B4A] rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98]"
              >
                <Download className="w-5 h-5" />
                <span>Instalar Aplicativo no Dispositivo</span>
              </button>
            )}

            {/* iOS Safari Guide */}
            {isIOS ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Como adicionar no iPhone (Safari):</span>
                </div>
                <ol className="text-xs text-slate-200 space-y-2.5 pl-1">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Toque no botão <strong>Compartilhar</strong> no Safari{' '}
                      <Share2 className="w-3.5 h-3.5 inline mx-1 text-sky-300" /> (na barra inferior).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Role a lista para baixo e toque em{' '}
                      <strong className="text-white">"Adicionar à Tela de Início"</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-sky-300" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Confirme tocando em <strong className="text-white">"Adicionar"</strong> no canto superior direito.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              /* Android / Chrome Guide */
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Monitor className="w-4 h-4 text-emerald-400" />
                  <span>Instalação no Android ou Computador (Chrome/Edge):</span>
                </div>
                <ol className="text-xs text-slate-200 space-y-2.5 pl-1">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Selecione <strong className="text-white">"Instalar aplicativo"</strong> ou{' '}
                      <strong className="text-white">"Adicionar à tela inicial"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/15 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      O app será instalado com o ícone oficial da MAJOR e funcionará como aplicativo nativo.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-300 leading-relaxed text-center">
              💡 <strong>Dica:</strong> Após adicionar à tela inicial, o app abre direto sem barras de endereço do navegador.
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
