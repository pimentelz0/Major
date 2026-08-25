import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Smartphone,
  User,
  Phone,
  Clock,
  CheckCircle,
  MessageCircle,
  Camera,
  FileText,
  Shield,
  Trash2,
  Receipt,
  Save,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import type { OSWithDetails, OSStatus, DeviceChecklist } from '../types';
import { ChecklistEditor } from './ChecklistEditor';
import {
  updateServiceOrderStatus,
  updateFullServiceOrder,
  deleteServiceOrder,
  addChecklistPhoto,
  uploadChecklistPhoto,
  fileToDataUrl,
} from '../lib/supabase';

interface OSDetailModalProps {
  os: OSWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedOS: OSWithDetails) => void;
  onDelete?: (orderId: string) => void;
  onOpenReceipt: (os: OSWithDetails) => void;
}

const STATUS_STEPS: Array<{ id: OSStatus; label: string; color: string; activeBg: string }> = [
  { id: 'recebido', label: 'Recebido', color: 'text-amber-700', activeBg: 'bg-amber-500 text-white' },
  { id: 'em_reparo', label: 'Em Reparo', color: 'text-blue-700', activeBg: 'bg-blue-600 text-white' },
  { id: 'pronto', label: 'Pronto', color: 'text-emerald-700', activeBg: 'bg-emerald-600 text-white' },
  { id: 'entregue', label: 'Entregue', color: 'text-slate-700', activeBg: 'bg-[#0B1B4A] text-white' },
];

export const OSDetailModal: React.FC<OSDetailModalProps> = ({
  os,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onOpenReceipt,
}) => {
  if (!isOpen || !os) return null;

  const exitPhotoInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode toggle
  const [isEditingFull, setIsEditingFull] = useState(false);

  // Editable Client & Device states
  const [editClientName, setEditClientName] = useState(os.client?.nome || '');
  const [editClientPhone, setEditClientPhone] = useState(os.client?.telefone || '');
  const [editDeviceBrand, setEditDeviceBrand] = useState(os.device?.marca || '');
  const [editDeviceModel, setEditDeviceModel] = useState(os.device?.modelo || '');
  const [editDeviceImei, setEditDeviceImei] = useState(os.device?.imei || '');

  // Editable Service states
  const [currentStatus, setCurrentStatus] = useState<OSStatus>(os.status);
  const [descricaoServico, setDescricaoServico] = useState(os.descricao_servico || '');
  const [valor, setValor] = useState(os.valor.toString());
  const [garantiaFim, setGarantiaFim] = useState(os.garantia_fim || '');
  const [garantiaCobertura, setGarantiaCobertura] = useState(
    os.garantia_cobertura || 'Peça trocada e mão de obra'
  );
  const [checklistState, setChecklistState] = useState<DeviceChecklist>(os.checklist || {});

  // Photos state (local + remote)
  const [photosList, setPhotosList] = useState(os.photos || []);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingExitPhoto, setUploadingExitPhoto] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if OS changes
  useEffect(() => {
    if (os) {
      setCurrentStatus(os.status);
      setDescricaoServico(os.descricao_servico || '');
      setValor(os.valor?.toString() || '0');
      setGarantiaFim(os.garantia_fim || '');
      setGarantiaCobertura(os.garantia_cobertura || 'Peça trocada e mão de obra');
      setChecklistState(os.checklist || {});
      setPhotosList(os.photos || []);
      setEditClientName(os.client?.nome || '');
      setEditClientPhone(os.client?.telefone || '');
      setEditDeviceBrand(os.device?.marca || '');
      setEditDeviceModel(os.device?.modelo || '');
      setEditDeviceImei(os.device?.imei || '');
      setIsEditingFull(false);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [os]);

  const shortId = os.id.substring(0, 8).toUpperCase();

  // Handle Quick Status Change
  const handleStatusChange = async (newStatus: OSStatus) => {
    setCurrentStatus(newStatus);
    const exitDateUpdate = newStatus === 'entregue' ? new Date().toISOString() : os.data_saida;

    try {
      const { error: updateErr } = await updateServiceOrderStatus(os.id, {
        status: newStatus,
        data_saida: exitDateUpdate,
      });

      if (updateErr) throw updateErr;

      const updated = {
        ...os,
        status: newStatus,
        data_saida: exitDateUpdate,
      };
      onUpdate(updated);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao atualizar status no banco');
    }
  };

  // Quick 90 Days warranty setter helper
  const handleSetDefault90Days = () => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    const dateStr = d.toISOString().split('T')[0];
    setGarantiaFim(dateStr);
    if (!garantiaCobertura) {
      setGarantiaCobertura('90 dias - Peça trocada e mão de obra');
    }
  };

  // Handle saving details
  const handleSaveDetails = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const numVal = parseFloat(valor.replace(',', '.')) || 0;

      if (isEditingFull) {
        // Full update including client & device
        const { error: err } = await updateFullServiceOrder(os.id, {
          clienteNome: editClientName,
          clienteTelefone: editClientPhone,
          aparelhoMarca: editDeviceBrand,
          aparelhoModelo: editDeviceModel,
          aparelhoImei: editDeviceImei,
          descricaoServico: descricaoServico.trim(),
          valor: numVal,
          garantiaFim: garantiaFim || null,
          garantiaCobertura: garantiaCobertura.trim() || null,
          checklist: checklistState,
          clientId: os.client?.id,
          deviceId: os.device?.id,
        });

        if (err) throw err;

        const updated: OSWithDetails = {
          ...os,
          descricao_servico: descricaoServico.trim(),
          valor: numVal,
          garantia_fim: garantiaFim || null,
          garantia_cobertura: garantiaCobertura.trim() || null,
          checklist: checklistState,
          client: {
            ...os.client,
            id: os.client?.id || '',
            nome: editClientName.trim(),
            telefone: editClientPhone.replace(/\D/g, ''),
          },
          device: {
            ...os.device,
            id: os.device?.id || '',
            marca: editDeviceBrand.trim(),
            modelo: editDeviceModel.trim(),
            imei: editDeviceImei.trim(),
          },
          photos: photosList,
        };

        onUpdate(updated);
        setIsEditingFull(false);
      } else {
        // Standard service details update
        const updates = {
          descricao_servico: descricaoServico.trim(),
          valor: numVal,
          garantia_fim: garantiaFim || null,
          garantia_cobertura: garantiaCobertura.trim() || null,
          checklist: checklistState,
        };

        const { error: err } = await updateServiceOrderStatus(os.id, updates);
        if (err) throw err;

        const updated: OSWithDetails = {
          ...os,
          descricao_servico: descricaoServico.trim(),
          valor: numVal,
          garantia_fim: garantiaFim || null,
          garantia_cobertura: garantiaCobertura.trim() || null,
          checklist: checklistState,
          photos: photosList,
        };

        onUpdate(updated);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  };

  // Handle Deleting OS
  const handleDeleteOS = async () => {
    setDeleting(true);
    setError(null);
    try {
      const { error: delErr } = await deleteServiceOrder(os.id);
      if (delErr) throw delErr;
      if (onDelete) onDelete(os.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir ordem de serviço');
      setDeleting(false);
    }
  };

  // Handle Exit Photo Upload
  const handleAddExitPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploadingExitPhoto(true);
    setError(null);

    try {
      const file = e.target.files[0];
      const previewUrl = await fileToDataUrl(file);
      const storageUrl = await uploadChecklistPhoto(file, os.id, 'saida');

      const photoPayload = {
        service_order_id: os.id,
        tipo: 'saida' as const,
        categoria: 'saida',
        url_foto: storageUrl || previewUrl,
        observacao: 'Checklist de saída / entrega',
      };

      const { error: photoErr } = await addChecklistPhoto(photoPayload);
      if (photoErr) console.warn(photoErr.message);

      const newPhotoObj = {
        id: `exit-${Date.now()}`,
        service_order_id: os.id,
        tipo: 'saida' as const,
        categoria: 'saida',
        url_foto: storageUrl || previewUrl,
        observacao: 'Checklist de saída / entrega',
        criado_em: new Date().toISOString(),
      };

      const updatedPhotos = [...photosList, newPhotoObj];
      setPhotosList(updatedPhotos);
      onUpdate({ ...os, photos: updatedPhotos });
    } catch (err: any) {
      setError('Erro ao enviar foto de saída.');
    } finally {
      setUploadingExitPhoto(false);
      if (exitPhotoInputRef.current) exitPhotoInputRef.current.value = '';
    }
  };

  // WhatsApp quick trigger
  const handleWhatsApp = () => {
    const targetPhone = isEditingFull ? editClientPhone : os.client?.telefone;
    const targetClient = isEditingFull ? editClientName : os.client?.nome;
    const targetDevice = isEditingFull ? `${editDeviceBrand} ${editDeviceModel}` : `${os.device?.marca} ${os.device?.modelo}`;

    if (!targetPhone) return;
    const cleanPhone = targetPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const text = `*MAJOR ASSISTÊNCIA TÉCNICA* 📱
Olá *${targetClient}*, atualização da sua Ordem de Serviço *#${shortId}*:

📱 *Aparelho:* ${targetDevice}
⚡ *Status atual:* ${currentStatus.toUpperCase()}
🔧 *Serviço:* ${descricaoServico || 'Em manutenção'}
💰 *Valor:* R$ ${parseFloat(valor || '0').toFixed(2)}
🛡️ *Garantia:* ${garantiaFim ? `Válida até ${new Date(garantiaFim + 'T00:00:00').toLocaleDateString('pt-BR')}` : '90 dias após entrega'}

Qualquer dúvida estamos à disposição!
*MAJOR Assistência Técnica*`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh] border border-slate-100 animate-fadeIn">
        {/* Header with perfectly framed ID, Edit, Delete, Close */}
        <div className="bg-[#0B1B4A] px-4 sm:px-6 py-4 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* ID Tag - Fully responsive with proper padding */}
            <div className="px-3 py-1.5 rounded-xl bg-white text-[#0B1B4A] font-mono font-black text-xs sm:text-sm tracking-wider shadow shrink-0 whitespace-nowrap">
              #{shortId}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold leading-tight truncate">
                {os.device?.marca} {os.device?.modelo}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Cliente: <strong className="text-white">{os.client?.nome}</strong>
              </p>
            </div>
          </div>

          {/* Action Icons in Header */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Edit Button */}
            <button
              type="button"
              onClick={() => setIsEditingFull(!isEditingFull)}
              title={isEditingFull ? 'Cancelar edição' : 'Editar dados da OS'}
              className={`p-2 rounded-xl transition-all ${
                isEditingFull
                  ? 'bg-white text-[#0B1B4A] font-bold shadow scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Apagar Ordem de Serviço"
              className="p-2 rounded-xl text-rose-300 hover:text-rose-100 hover:bg-rose-900/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              title="Fechar"
              className="text-slate-400 hover:text-white p-2 rounded-xl transition-colors hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="bg-rose-50 border-b border-rose-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-900 text-xs sm:text-sm font-semibold text-center sm:text-left">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Deseja realmente apagar a OS <strong>#{shortId}</strong> permanentemente?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteOS}
                disabled={deleting}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Apagando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Status Stepper */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
              Status da OS (Toque para alterar)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {STATUS_STEPS.map((step) => {
                const isActive = currentStatus === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => handleStatusChange(step.id)}
                    className={`py-2.5 px-2 rounded-xl font-bold text-xs transition-all border ${
                      isActive
                        ? `${step.activeBg} border-transparent shadow-sm scale-[1.02]`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* EDIT FORM (When edit mode is active) */}
          {isEditingFull ? (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-[#0B1B4A]" />
                  Editar Dados do Cliente & Aparelho
                </span>
                <span className="text-[10px] text-[#0B1B4A] font-bold px-2 py-0.5 bg-slate-200 rounded">Modo Edição</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={editClientName}
                    onChange={(e) => setEditClientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={editClientPhone}
                    onChange={(e) => setEditClientPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={editDeviceBrand}
                    onChange={(e) => setEditDeviceBrand(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={editDeviceModel}
                    onChange={(e) => setEditDeviceModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">IMEI (Opcional)</label>
                  <input
                    type="text"
                    value={editDeviceImei}
                    onChange={(e) => setEditDeviceImei(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Client & Device Summary Box */
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">WhatsApp Cliente</span>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#0B1B4A]" />
                  {os.client?.telefone || 'Não informado'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">IMEI</span>
                <p className="font-mono text-slate-700">
                  {os.device?.imei || 'Não informado'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingFull(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Pencil className="w-3 h-3 text-[#0B1B4A]" />
                <span>Editar</span>
              </button>
            </div>
          )}

          {/* O Que Foi Feito & Valor */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0B1B4A] mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0B1B4A]" />
                O Que Foi Feito (Serviço Realizado)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Troca de frontal original + aplicação de película de vidro 3D..."
                value={descricaoServico}
                onChange={(e) => setDescricaoServico(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-xs bg-white text-slate-800 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Total (R$)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm font-bold text-[#0B1B4A] bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Garantia até
                  </label>
                  <button
                    type="button"
                    onClick={handleSetDefault90Days}
                    className="text-[10px] text-[#0B1B4A] font-bold hover:underline"
                  >
                    +90 Dias
                  </button>
                </div>
                <input
                  type="date"
                  value={garantiaFim}
                  onChange={(e) => setGarantiaFim(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-xs bg-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cobertura da Garantia
              </label>
              <input
                type="text"
                placeholder="Ex: Peça substituída e mão de obra"
                value={garantiaCobertura}
                onChange={(e) => setGarantiaCobertura(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] outline-none text-xs bg-white"
              />
            </div>

            {/* Save details button */}
            <div className="flex items-center justify-between pt-1">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Salvo com sucesso!
                </span>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={saving}
                className="px-4 py-2.5 bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-white" />
                <span>{saving ? 'Gravando...' : isEditingFull ? 'Salvar Tudo' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </div>

          {/* Checklist de Testes do Aparelho */}
          <ChecklistEditor
            checklist={checklistState}
            onChange={setChecklistState}
          />

          {/* Checklist Fotos (Entrada & Saída) */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#0B1B4A]" />
                Fotos do Aparelho (Checklist)
              </span>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={exitPhotoInputRef}
                  onChange={handleAddExitPhoto}
                  className="hidden"
                  id="modal-exit-photo-input"
                />
                <label
                  htmlFor="modal-exit-photo-input"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B1B4A] font-bold text-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Foto de Saída</span>
                </label>
              </div>
            </div>

            {uploadingExitPhoto && (
              <div className="flex items-center gap-2 text-xs text-[#0B1B4A] font-semibold animate-pulse">
                <span className="inline-block w-3.5 h-3.5 border-2 border-[#0B1B4A]/30 border-t-[#0B1B4A] rounded-full animate-spin" />
                <span>Enviando imagem...</span>
              </div>
            )}

            {/* Photos Grid */}
            {photosList.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Nenhuma foto registrada para este aparelho.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {photosList.map((p, idx) => {
                  const isSaida = p.tipo === 'saida' || p.categoria === 'saida';
                  return (
                    <div
                      key={p.id || idx}
                      className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-sm"
                    >
                      <img
                        src={p.url_foto}
                        alt={isSaida ? 'saída' : 'entrada'}
                        className="w-full h-full object-cover"
                      />
                      <span
                        className={`absolute bottom-1 left-1 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isSaida ? 'bg-emerald-600' : 'bg-black/80'
                        }`}
                      >
                        {isSaida ? '(saída)' : '(entrada)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons: WhatsApp & Receipt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Enviar comprovante pro cliente</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenReceipt({ ...os, descricao_servico: descricaoServico, valor: parseFloat(valor || '0'), garantia_fim: garantiaFim, garantia_cobertura: garantiaCobertura })}
              className="py-3 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
            >
              <Receipt className="w-4 h-4 text-white" />
              <span>Visualizar Comprovante</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
