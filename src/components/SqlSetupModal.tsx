import React, { useState } from 'react';
import { Copy, Check, Terminal, Database, X, ExternalLink } from 'lucide-react';
import { SUPABASE_SETUP_SQL } from '../lib/sqlScript';

interface SqlSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlSetupModal: React.FC<SqlSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        {/* Header */}
        <div className="bg-[#0B1B4A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Configuração do Banco Supabase</h2>
              <p className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">
                Script SQL completo para tabelas, RLS e Storage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
          <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl text-sm space-y-2">
            <p className="font-semibold text-amber-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-700" />
              Como aplicar no Supabase:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-amber-800">
              <li>Clique no botão <strong>Copiar Script SQL</strong> abaixo.</li>
              <li>
                Acesse o painel do seu projeto no{' '}
                <a
                  href="https://supabase.com/dashboard/project/zchqmfalscdakqdwknwl/sql"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-[#0B1B4A] hover:text-[#142866] inline-flex items-center gap-1"
                >
                  SQL Editor do Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Cole o código no editor e clique em <strong>Run</strong> (Executar).</li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                SQL DDL + RLS + Storage Bucket (major-photos)
              </span>
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado com sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white" />
                    Copiar Script SQL
                  </>
                )}
              </button>
            </div>

            <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
            <div className="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl">
              <span className="font-bold text-slate-900 block">clients</span>
              <span className="text-slate-500 text-[11px]">Clientes & Whats</span>
            </div>
            <div className="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl">
              <span className="font-bold text-slate-900 block">devices</span>
              <span className="text-slate-500 text-[11px]">Aparelhos & IMEI</span>
            </div>
            <div className="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl">
              <span className="font-bold text-slate-900 block">service_orders</span>
              <span className="text-slate-500 text-[11px]">Ordens de Serviço</span>
            </div>
            <div className="p-2.5 bg-slate-50/80 border border-slate-200/60 rounded-xl">
              <span className="font-bold text-slate-900 block">checklist_photos</span>
              <span className="text-slate-500 text-[11px]">Fotos Entrada/Saída</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Bucket: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded-lg font-mono text-[#0B1B4A] font-semibold">major-photos</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200/80 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
