import React from 'react';
import { X, Printer, MessageCircle, ShieldCheck, Phone } from 'lucide-react';
import type { OSWithDetails, ChecklistItemState } from '../types';

interface ReceiptModalProps {
  os: OSWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ os, isOpen, onClose }) => {
  if (!isOpen || !os) return null;

  const shortId = os.id.substring(0, 8).toUpperCase();
  const entryDate = new Date(os.data_entrada).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const exitDate = os.data_saida
    ? new Date(os.data_saida).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Em andamento';

  const warrantyDate = os.garantia_fim
    ? new Date(os.garantia_fim + 'T00:00:00').toLocaleDateString('pt-BR')
    : 'Não especificada';

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!os.client?.telefone) return;
    const cleanPhone = os.client.telefone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Build checklist summary if present
    let checklistText = '';
    if (os.checklist && Object.keys(os.checklist).length > 0) {
      const entries = Object.entries(os.checklist as Record<string, ChecklistItemState>).filter(
        ([_, v]) => v?.status || (v?.obs && v.obs.trim())
      );
      if (entries.length > 0) {
        checklistText = '\n\n📝 *Checklist de Entrada:*';
        entries.forEach(([key, val]) => {
          const icon = val?.status === 'ok' ? '✅' : val?.status === 'nok' ? '❌' : '⚪';
          const obsSuffix = val?.obs && val.obs.trim() ? ` _(Obs: ${val.obs.trim()})_` : '';
          checklistText += `\n• ${key}: ${icon}${obsSuffix}`;
        });
      }
    }

    const text = `*MAJOR ASSISTÊNCIA TÉCNICA* 📱
Olá *${os.client.nome}*, segue o comprovante da sua Ordem de Serviço:

📋 *OS Nº:* #${shortId}
📱 *Aparelho:* ${os.device?.marca} ${os.device?.modelo} ${os.device?.imei ? `(IMEI: ${os.device.imei})` : ''}
⚡ *Status:* ${os.status.toUpperCase()}
🔧 *Serviço:* ${os.descricao_servico || 'Manutenção e reparo especializado'}
💰 *Valor:* R$ ${os.valor.toFixed(2)}
📅 *Entrada:* ${entryDate}
🛡️ *Garantia até:* ${warrantyDate} ${os.garantia_cobertura ? `(${os.garantia_cobertura})` : ''}${checklistText}

Agradecemos a preferência!
*MAJOR - Assistência Técnica para Smartphones*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-100 animate-fadeIn">
        {/* Header - Hidden during print */}
        <div className="bg-[#0B1B4A] px-6 py-4 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#0B1B4A] flex items-center justify-center font-bold text-xs shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm leading-tight block">Comprovante Digital da OS</span>
              <span className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">MAJOR Assistência</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Document (Target for print and screen) */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800 text-sm font-sans bg-white print:p-0">
          {/* Header Branding */}
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-xl bg-[#0B1B4A] text-white flex items-center justify-center font-black text-xs">
                M
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1B4A]">
                MAJOR
              </h1>
            </div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">
              Assistência Técnica para Smartphones
            </p>
            <div className="mt-2 inline-block px-3 py-1 bg-slate-50 rounded-full font-mono text-xs font-bold text-[#0B1B4A] border border-slate-200/80">
              ORDEM DE SERVIÇO #{shortId}
            </div>
          </div>

          {/* Client & Device Box */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5 tracking-wider">
                Cliente
              </span>
              <p className="font-bold text-slate-900 text-sm">{os.client?.nome || '—'}</p>
              <p className="text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                <Phone className="w-3 h-3 text-slate-400" />
                {os.client?.telefone || '—'}
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5 tracking-wider">
                Aparelho
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {os.device?.marca} {os.device?.modelo}
              </p>
              {os.device?.imei && (
                <p className="text-slate-500 font-mono text-[11px]">
                  IMEI: {os.device.imei}
                </p>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Data de Entrada:</span>
              <span className="font-semibold text-slate-800">{entryDate}</span>
            </div>
            {os.data_saida && (
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Data de Saída:</span>
                <span className="font-semibold text-slate-800">{exitDate}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Status Atual:</span>
              <span className="font-bold text-[#0B1B4A] uppercase bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/80">
                {os.status}
              </span>
            </div>

            <div className="pt-2">
              <span className="text-slate-500 font-semibold block mb-1">
                Serviço Realizado / Laudo:
              </span>
              <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-slate-900 font-medium">
                {os.descricao_servico || 'Manutenção e reparo especializado em smartphone.'}
              </div>
            </div>

            {/* Checklist do Aparelho (se houver itens preenchidos) */}
            {os.checklist && (
              (() => {
                const filledItems = Object.entries(
                  os.checklist as Record<string, ChecklistItemState>
                ).filter(([_, it]) => Boolean(it?.status || (it?.obs && it.obs.trim())));

                if (filledItems.length === 0) return null;

                return (
                  <div className="pt-2">
                    <span className="text-slate-500 font-semibold block mb-1">
                      Checklist de Entrada do Aparelho:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                      {filledItems.map(([name, item]) => (
                        <div key={name} className="flex flex-col text-[11px]">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            {item.status === 'ok'
                              ? '✅'
                              : item.status === 'nok'
                              ? '❌'
                              : '⚪'}{' '}
                            {name}
                          </span>
                          {item.obs && item.obs.trim() ? (
                            <span className="text-slate-500 italic text-[10px] pl-4">
                              Obs: {item.obs.trim()}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Financial & Warranty Summary */}
          <div className="bg-[#0B1B4A] text-white p-5 rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Valor Total:</span>
              <span className="text-xl font-extrabold text-white">
                R$ {os.valor.toFixed(2)}
              </span>
            </div>

            <div className="pt-1 text-xs">
              <div className="flex items-center gap-1.5 text-white font-bold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Termo de Garantia:</span>
              </div>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                {os.garantia_fim ? (
                  <>
                    Válida até: <strong className="text-white">{warrantyDate}</strong>. Cobertura: {os.garantia_cobertura || 'Peça trocada e serviço de mão de obra efetuado.'}
                  </>
                ) : (
                  'Garantia legal de 90 dias referente às peças substituídas e serviço realizado. Não cobre danos por queda, água ou mau uso.'
                )}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-4 grid grid-cols-2 gap-6 text-center text-[10px] text-slate-500">
            <div>
              <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-700">
                Assinatura do Técnico
              </div>
              <span>MAJOR Assistência</span>
            </div>
            <div>
              <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-700">
                Assinatura do Cliente
              </div>
              <span>{os.client?.nome || 'Cliente'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons (WhatsApp & Print) - Hidden during print */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row gap-2 print:hidden">
          <button
            onClick={handleSendWhatsApp}
            className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Enviar comprovante pro cliente</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-3 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
