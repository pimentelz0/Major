import React, { useRef, useState } from 'react';
import { X, MessageCircle, ShieldCheck, Phone, Image as ImageIcon, Check } from 'lucide-react';
import type { OSWithDetails, ChecklistItemState } from '../types';
import { toPng } from 'html-to-image';
import { sendWhatsAppReceipt } from '../utils/whatsapp';

interface ReceiptModalProps {
  os: OSWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ os, isOpen, onClose }) => {
  const export916Ref = useRef<HTMLDivElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

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

  // Extract filled checklist items
  const filledChecklist = os.checklist
    ? Object.entries(os.checklist as Record<string, ChecklistItemState>).filter(
        ([_, it]) => Boolean(it?.status || (it?.obs && it.obs.trim()))
      )
    : [];

  const handleSendImageToClient = async () => {
    if (!export916Ref.current) return;
    setGeneratingImage(true);

    try {
      // Generate ultra clean high-definition 9:16 (1080x1920) image with zero shadow artifacts
      const dataUrl = await toPng(export916Ref.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#FFFFFF',
        cacheBust: true,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const clientFileName = (os.client?.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
      const imageFile = new File([blob], `Comprovante_OS_${shortId}_${clientFileName}.png`, {
        type: 'image/png',
      });

      // Try native share (e.g. directly to WhatsApp on mobile or supported desktop)
      if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: `Comprovante OS #${shortId} - MAJOR Assistência`,
          text: `Comprovante da Ordem de Serviço #${shortId} (${os.device?.marca} ${os.device?.modelo})`,
        });
        setSuccessNotice(true);
        setTimeout(() => setSuccessNotice(false), 3000);
      } else {
        // Direct download of the clean 9:16 image
        const downloadLink = document.createElement('a');
        downloadLink.download = `Comprovante_OS_${shortId}_9x16.png`;
        downloadLink.href = dataUrl;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        setSuccessNotice(true);
        setTimeout(() => setSuccessNotice(false), 3000);

        // Also trigger WhatsApp if phone number exists
        if (os.client?.telefone) {
          sendWhatsAppReceipt(os);
        }
      }
    } catch (err) {
      console.error('Erro ao gerar imagem 9:16:', err);
      // Fallback to text WhatsApp
      sendWhatsAppReceipt(os);
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSendWhatsAppText = () => {
    sendWhatsAppReceipt(os);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Visual Modal Dialog */}
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-fadeIn">
        {/* Modal Topbar */}
        <div className="bg-[#0B1B4A] px-5 py-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-[#0B1B4A] flex items-center justify-center font-bold text-xs shadow">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm leading-tight block">Comprovante Digital da OS</span>
              <span className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">
                MAJOR Assistência
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content Preview */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-sm font-sans bg-slate-50/60">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            {/* Header */}
            <div className="text-center pb-3 border-b border-slate-100">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-[#0B1B4A] text-white flex items-center justify-center font-black text-xs">
                  M
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#0B1B4A]">MAJOR</h1>
              </div>
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
                Assistência Técnica para Smartphones
              </p>
              <div className="mt-2.5 inline-block px-3.5 py-1 bg-slate-50 rounded-full font-mono text-xs font-bold text-[#0B1B4A] border border-slate-200">
                ORDEM DE SERVIÇO #{shortId}
              </div>
            </div>

            {/* Client & Device Box */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5 tracking-wider">
                  Cliente
                </span>
                <p className="font-bold text-slate-900 text-sm truncate">{os.client?.nome || '—'}</p>
                <p className="text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {os.client?.telefone || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-semibold uppercase text-[10px] block mb-0.5 tracking-wider">
                  Aparelho
                </span>
                <p className="font-bold text-slate-900 text-sm truncate">
                  {os.device?.marca} {os.device?.modelo}
                </p>
                {os.device?.imei && (
                  <p className="text-slate-500 font-mono text-[11px] mt-0.5">IMEI: {os.device.imei}</p>
                )}
              </div>
            </div>

            {/* Service & Dates */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Data de Entrada:</span>
                <span className="font-semibold text-slate-800">{entryDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                <span className="text-slate-500">Status Atual:</span>
                <span className="font-bold text-[#0B1B4A] uppercase bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200 text-[11px]">
                  {os.status}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 font-semibold block mb-1">
                  Serviço Realizado / Laudo:
                </span>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium text-xs leading-relaxed">
                  {os.descricao_servico || 'Manutenção e reparo especializado em smartphone.'}
                </div>
              </div>

              {/* Checklist */}
              {filledChecklist.length > 0 && (
                <div className="pt-1">
                  <span className="text-slate-500 font-semibold block mb-1">
                    Checklist de Entrada do Aparelho:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    {filledChecklist.map(([name, item]) => (
                      <div key={name} className="flex items-center gap-1.5 text-[11px]">
                        {item.status === 'ok' ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            ✓
                          </span>
                        ) : item.status === 'nok' ? (
                          <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            ✕
                          </span>
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-300 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                            -
                          </span>
                        )}
                        <span className="text-slate-800 font-medium truncate">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Total & Warranty */}
            <div className="bg-[#0B1B4A] text-white p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-white/15">
                <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">
                  Valor Total:
                </span>
                <span className="text-xl font-extrabold text-white">R$ {os.valor.toFixed(2)}</span>
              </div>

              <div className="pt-0.5 text-xs">
                <div className="flex items-center gap-1 text-white font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Termo de Garantia:</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {os.garantia_fim ? (
                    <>
                      Válida até: <strong className="text-white">{warrantyDate}</strong>. Cobertura:{' '}
                      {os.garantia_cobertura || 'Peça trocada e serviço efetuado.'}
                    </>
                  ) : (
                    'Garantia legal de 90 dias referente às peças substituídas e serviço realizado. Não cobre danos por queda, água ou mau uso.'
                  )}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-2 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
              <div>
                <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-700">
                  Assinatura do Técnico
                </div>
                <span className="text-slate-400">MAJOR Assistência</span>
              </div>
              <div>
                <div className="border-t border-slate-200 pt-1.5 font-semibold text-slate-700">
                  Assinatura do Cliente
                </div>
                <span className="text-slate-400 truncate block">{os.client?.nome || 'Cliente'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSendImageToClient}
            disabled={generatingImage}
            className="w-full py-3 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm active:scale-98 disabled:opacity-60"
          >
            {generatingImage ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gerando Imagem HD (9:16)...</span>
              </span>
            ) : successNotice ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Comprovante Enviado com Sucesso!</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Enviar comprovante para o cliente</span>
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendWhatsAppText}
            className="w-full py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Enviar comprovante em texto</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PERFECT 9:16 DEDICATED HD EXPORT CANVAS (540px × 960px => 1080px × 1920px)  */}
      {/* 100% PURE WHITE, ZERO BOX-SHADOWS, ZERO DIRTY MARGINS, CRISP LINES ONLY   */}
      {/* ========================================================================= */}
      <div
        className="fixed -left-[9999px] top-0 pointer-events-none z-[-1]"
        style={{ width: '540px', height: '960px' }}
        aria-hidden="true"
      >
        <div
          ref={export916Ref}
          style={{ width: '540px', height: '960px', backgroundColor: '#FFFFFF' }}
          className="p-7 flex flex-col justify-between text-slate-900 font-sans box-border"
        >
          {/* Top Section */}
          <div className="space-y-4">
            {/* Header Branding */}
            <div className="text-center pb-4 border-b border-slate-200">
              <div className="flex items-center justify-center gap-2.5 mb-1.5">
                <div
                  style={{ backgroundColor: '#0B1B4A' }}
                  className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-black text-lg"
                >
                  M
                </div>
                <h1 style={{ color: '#0B1B4A' }} className="text-3xl font-extrabold tracking-tight">
                  MAJOR
                </h1>
              </div>
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-slate-500">
                Assistência Técnica para Smartphones
              </p>
              <div
                style={{ color: '#0B1B4A', backgroundColor: '#F8FAFC', borderColor: '#CBD5E1' }}
                className="mt-3 inline-block px-5 py-1.5 rounded-full font-mono text-xs font-bold border"
              >
                ORDEM DE SERVIÇO #{shortId}
              </div>
            </div>

            {/* Client & Device Box */}
            <div
              style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              className="grid grid-cols-2 gap-4 p-4 rounded-2xl border"
            >
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1 tracking-wider">
                  Cliente
                </span>
                <p className="font-extrabold text-slate-900 text-base leading-tight truncate">
                  {os.client?.nome || '—'}
                </p>
                <p className="text-slate-600 flex items-center gap-1.5 mt-1 text-xs font-semibold">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {os.client?.telefone || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1 tracking-wider">
                  Aparelho
                </span>
                <p className="font-extrabold text-slate-900 text-base leading-tight truncate">
                  {os.device?.marca} {os.device?.modelo}
                </p>
                {os.device?.imei && (
                  <p className="text-slate-500 font-mono text-xs mt-1 font-semibold">
                    IMEI: {os.device.imei}
                  </p>
                )}
              </div>
            </div>

            {/* Dates & Status */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-semibold">Data de Entrada:</span>
                <span className="font-bold text-slate-800">{entryDate}</span>
              </div>
              {os.data_saida && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-semibold">Data de Saída:</span>
                  <span className="font-bold text-slate-800">{exitDate}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                <span className="text-slate-500 font-semibold">Status Atual:</span>
                <span
                  style={{ color: '#0B1B4A', backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' }}
                  className="font-extrabold uppercase px-3 py-1 rounded-lg border text-xs"
                >
                  {os.status}
                </span>
              </div>
            </div>

            {/* Service Report */}
            <div>
              <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1 tracking-wider">
                Serviço Realizado / Laudo:
              </span>
              <div
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                className="p-3.5 rounded-xl border text-slate-900 font-medium text-xs leading-relaxed"
              >
                {os.descricao_servico || 'Manutenção e reparo especializado em smartphone.'}
              </div>
            </div>

            {/* Checklist */}
            {filledChecklist.length > 0 && (
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1.5 tracking-wider">
                  Checklist de Entrada do Aparelho:
                </span>
                <div
                  style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
                  className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl border"
                >
                  {filledChecklist.map(([name, item]) => (
                    <div key={name} className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      {item.status === 'ok' ? (
                        <span
                          style={{ backgroundColor: '#10B981' }}
                          className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0"
                        >
                          ✓
                        </span>
                      ) : item.status === 'nok' ? (
                        <span
                          style={{ backgroundColor: '#EF4444' }}
                          className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0"
                        >
                          ✕
                        </span>
                      ) : (
                        <span
                          style={{ backgroundColor: '#94A3B8' }}
                          className="w-4 h-4 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0"
                        >
                          -
                        </span>
                      )}
                      <span className="truncate">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Total, Warranty, Signatures */}
          <div className="space-y-4 pt-2">
            {/* Total & Warranty Box */}
            <div
              style={{ backgroundColor: '#0B1B4A' }}
              className="text-white p-5 rounded-2xl space-y-2.5"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-white/20">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                  Valor Total:
                </span>
                <span className="text-2xl font-black text-white">R$ {os.valor.toFixed(2)}</span>
              </div>

              <div className="pt-0.5 text-xs">
                <div className="flex items-center gap-1.5 text-white font-bold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Termo de Garantia:</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {os.garantia_fim ? (
                    <>
                      Válida até: <strong className="text-white">{warrantyDate}</strong>. Cobertura:{' '}
                      {os.garantia_cobertura || 'Peça trocada e serviço efetuado.'}
                    </>
                  ) : (
                    'Garantia legal de 90 dias referente às peças substituídas e serviço realizado. Não cobre danos por queda, água ou mau uso.'
                  )}
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs text-slate-500 pt-1">
              <div>
                <div className="border-t border-slate-300 pt-2 font-bold text-slate-800">
                  Assinatura do Técnico
                </div>
                <span className="text-[11px] text-slate-500 font-medium">MAJOR Assistência</span>
              </div>
              <div>
                <div className="border-t border-slate-300 pt-2 font-bold text-slate-800 truncate">
                  Assinatura do Cliente
                </div>
                <span className="text-[11px] text-slate-500 font-medium truncate block">
                  {os.client?.nome || 'Cliente'}
                </span>
              </div>
            </div>

            {/* Footer Watermark */}
            <div className="text-center pt-1">
              <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">
                MAJOR ASSISTÊNCIA TÉCNICA ESPECIALIZADA
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
