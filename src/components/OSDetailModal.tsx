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
  Eye,
  Check,
  RefreshCw,
  Tag,
  Calendar,
} from 'lucide-react';
import type { OSWithDetails, OSStatus, DeviceChecklist, ChecklistPhoto } from '../types';
import { ChecklistEditor } from './ChecklistEditor';
import { sendWhatsAppOS, sendWhatsAppOSWithPhotos, shareSinglePhotoToWhatsApp } from '../utils/whatsapp';
import {
  updateServiceOrderStatus,
  updateFullServiceOrder,
  deleteServiceOrder,
  addChecklistPhoto,
  deleteChecklistPhoto,
  updateChecklistPhoto,
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

  const entryPhotoInputRef = useRef<HTMLInputElement>(null);
  const exitPhotoInputRef = useRef<HTMLInputElement>(null);
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);

  // Edit Mode toggle
  const [isEditingFull, setIsEditingFull] = useState(false);

  // Editable Client & Device states
  const [editClientName, setEditClientName] = useState(os.client?.nome || '');
  const [editClientPhone, setEditClientPhone] = useState(os.client?.telefone || '');
  const [editClientBirthDate, setEditClientBirthDate] = useState(os.client?.data_nascimento || '');
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
  const [photosList, setPhotosList] = useState<ChecklistPhoto[]>(os.photos || []);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'entrada' | 'saida'>('all');

  // Photo Editing / Viewing State
  const [selectedPhotoForEdit, setSelectedPhotoForEdit] = useState<ChecklistPhoto | null>(null);
  const [editPhotoTipo, setEditPhotoTipo] = useState<'entrada' | 'saida'>('entrada');
  const [editPhotoObs, setEditPhotoObs] = useState('');
  const [savingPhotoEdit, setSavingPhotoEdit] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppSuccess, setWhatsAppSuccess] = useState(false);
  const [uploadingEntryPhoto, setUploadingEntryPhoto] = useState(false);
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
      setEditClientBirthDate(os.client?.data_nascimento || '');
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
          clienteDataNascimento: editClientBirthDate || undefined,
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
            data_nascimento: editClientBirthDate || undefined,
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

  // Handle Entry Photo Upload
  const handleAddEntryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploadingEntryPhoto(true);
    setError(null);

    try {
      const files = Array.from(e.target.files) as File[];
      const newItems: ChecklistPhoto[] = [];

      for (const file of files) {
        const previewUrl = await fileToDataUrl(file);
        const storageUrl = await uploadChecklistPhoto(file, os.id, 'entrada');

        const photoPayload = {
          service_order_id: os.id,
          tipo: 'entrada' as const,
          categoria: 'entrada',
          url_foto: storageUrl || previewUrl,
          observacao: 'Checklist de entrada do aparelho',
        };

        const { error: photoErr } = await addChecklistPhoto(photoPayload);
        if (photoErr) console.warn(photoErr.message);

        const newPhotoObj: ChecklistPhoto = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          service_order_id: os.id,
          tipo: 'entrada',
          categoria: 'entrada',
          url_foto: storageUrl || previewUrl,
          observacao: 'Checklist de entrada do aparelho',
          criado_em: new Date().toISOString(),
        };

        newItems.push(newPhotoObj);
      }

      const updatedPhotos = [...photosList, ...newItems];
      setPhotosList(updatedPhotos);
      onUpdate({ ...os, photos: updatedPhotos });
    } catch (err: any) {
      setError('Erro ao enviar foto de entrada.');
    } finally {
      setUploadingEntryPhoto(false);
      if (entryPhotoInputRef.current) entryPhotoInputRef.current.value = '';
    }
  };

  // Handle Exit Photo Upload
  const handleAddExitPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploadingExitPhoto(true);
    setError(null);

    try {
      const files = Array.from(e.target.files) as File[];
      const newItems: ChecklistPhoto[] = [];

      for (const file of files) {
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

        const newPhotoObj: ChecklistPhoto = {
          id: `exit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          service_order_id: os.id,
          tipo: 'saida',
          categoria: 'saida',
          url_foto: storageUrl || previewUrl,
          observacao: 'Checklist de saída / entrega',
          criado_em: new Date().toISOString(),
        };

        newItems.push(newPhotoObj);
      }

      const updatedPhotos = [...photosList, ...newItems];
      setPhotosList(updatedPhotos);
      onUpdate({ ...os, photos: updatedPhotos });
    } catch (err: any) {
      setError('Erro ao enviar foto de saída.');
    } finally {
      setUploadingExitPhoto(false);
      if (exitPhotoInputRef.current) exitPhotoInputRef.current.value = '';
    }
  };

  // Open Edit Modal for a specific photo
  const handleOpenEditPhoto = (photo: ChecklistPhoto) => {
    setSelectedPhotoForEdit(photo);
    setEditPhotoTipo(photo.tipo === 'saida' || photo.categoria === 'saida' ? 'saida' : 'entrada');
    setEditPhotoObs(photo.observacao || '');
  };

  // Save changes to photo (type, observation)
  const handleSavePhotoChanges = async () => {
    if (!selectedPhotoForEdit) return;
    setSavingPhotoEdit(true);
    setError(null);

    try {
      const updatedObj: ChecklistPhoto = {
        ...selectedPhotoForEdit,
        tipo: editPhotoTipo,
        categoria: editPhotoTipo,
        observacao: editPhotoObs.trim() || null,
      };

      // Only attempt remote update if id doesn't start with temporary mock prefix
      if (!selectedPhotoForEdit.id.startsWith('entry-') && !selectedPhotoForEdit.id.startsWith('exit-') && !selectedPhotoForEdit.id.startsWith('temp-')) {
        await updateChecklistPhoto(selectedPhotoForEdit.id, {
          tipo: editPhotoTipo,
          categoria: editPhotoTipo,
          observacao: editPhotoObs.trim() || undefined,
        });
      }

      const updatedList = photosList.map((p) =>
        p.id === selectedPhotoForEdit.id ? updatedObj : p
      );

      setPhotosList(updatedList);
      onUpdate({ ...os, photos: updatedList });
      setSelectedPhotoForEdit(null);
    } catch (err: any) {
      setError('Erro ao salvar alterações da foto.');
    } finally {
      setSavingPhotoEdit(false);
    }
  };

  // Replace photo file
  const handleReplacePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedPhotoForEdit) return;

    setSavingPhotoEdit(true);
    setError(null);

    try {
      const file = e.target.files[0];
      const previewUrl = await fileToDataUrl(file);
      const storageUrl = await uploadChecklistPhoto(file, os.id, editPhotoTipo);
      const finalUrl = storageUrl || previewUrl;

      const updatedObj: ChecklistPhoto = {
        ...selectedPhotoForEdit,
        url_foto: finalUrl,
        tipo: editPhotoTipo,
        categoria: editPhotoTipo,
        observacao: editPhotoObs.trim() || null,
      };

      if (!selectedPhotoForEdit.id.startsWith('entry-') && !selectedPhotoForEdit.id.startsWith('exit-') && !selectedPhotoForEdit.id.startsWith('temp-')) {
        await updateChecklistPhoto(selectedPhotoForEdit.id, {
          url_foto: finalUrl,
          tipo: editPhotoTipo,
          categoria: editPhotoTipo,
          observacao: editPhotoObs.trim() || undefined,
        });
      }

      const updatedList = photosList.map((p) =>
        p.id === selectedPhotoForEdit.id ? updatedObj : p
      );

      setPhotosList(updatedList);
      setSelectedPhotoForEdit(updatedObj);
      onUpdate({ ...os, photos: updatedList });
    } catch (err: any) {
      setError('Erro ao substituir imagem da foto.');
    } finally {
      setSavingPhotoEdit(false);
      if (replacePhotoInputRef.current) replacePhotoInputRef.current.value = '';
    }
  };

  // Delete a single photo
  const handleDeletePhoto = async (photoId: string) => {
    setDeletingPhotoId(photoId);
    setError(null);

    try {
      if (!photoId.startsWith('entry-') && !photoId.startsWith('exit-') && !photoId.startsWith('temp-')) {
        const { error: delErr } = await deleteChecklistPhoto(photoId);
        if (delErr) console.warn(delErr.message);
      }

      const updatedList = photosList.filter((p) => p.id !== photoId);
      setPhotosList(updatedList);
      onUpdate({ ...os, photos: updatedList });

      if (selectedPhotoForEdit?.id === photoId) {
        setSelectedPhotoForEdit(null);
      }
    } catch (err: any) {
      setError('Erro ao excluir foto.');
    } finally {
      setDeletingPhotoId(null);
    }
  };


  const getCurrentOSPayload = (): OSWithDetails => {
    const numVal = parseFloat(valor.replace(',', '.')) || 0;
    return {
      ...os,
      status: currentStatus,
      descricao_servico: descricaoServico.trim(),
      valor: numVal,
      garantia_fim: garantiaFim || null,
      garantia_cobertura: garantiaCobertura.trim() || null,
      checklist: checklistState,
      client: {
        id: os.client?.id || '',
        nome: isEditingFull ? editClientName.trim() : os.client?.nome || '',
        telefone: isEditingFull ? editClientPhone.replace(/\D/g, '') : os.client?.telefone || '',
        criado_em: os.client?.criado_em || new Date().toISOString(),
      },
      device: {
        id: os.device?.id || '',
        client_id: os.device?.client_id || '',
        marca: isEditingFull ? editDeviceBrand.trim() : os.device?.marca || '',
        modelo: isEditingFull ? editDeviceModel.trim() : os.device?.modelo || '',
        imei: isEditingFull ? editDeviceImei.trim() : os.device?.imei || null,
        criado_em: os.device?.criado_em || new Date().toISOString(),
      },
      photos: photosList,
    };
  };

  // WhatsApp quick trigger with complete OS, checklist, and all attached photos
  const handleWhatsApp = async () => {
    setSendingWhatsApp(true);
    setError(null);
    try {
      const currentOSPayload = getCurrentOSPayload();
      await sendWhatsAppOSWithPhotos(currentOSPayload);
      setWhatsAppSuccess(true);
      setTimeout(() => setWhatsAppSuccess(false), 3000);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Erro ao enviar via WhatsApp:', err);
      }
    } finally {
      setSendingWhatsApp(false);
    }
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
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#0B1B4A]" />
                    Data de Nascimento (Opcional)
                  </label>
                  <input
                    type="date"
                    value={editClientBirthDate}
                    onChange={(e) => setEditClientBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#0B1B4A] outline-none bg-white text-slate-700 font-medium"
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
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">WhatsApp Cliente</span>
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#0B1B4A]" />
                  {os.client?.telefone || 'Não informado'}
                </p>
              </div>

              {os.client?.data_nascimento && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">Nascimento</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0B1B4A]" />
                    {os.client.data_nascimento.split('-').reverse().join('/')}
                  </p>
                </div>
              )}

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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#0B1B4A]" />
                <span>Fotos do Aparelho ({photosList.length})</span>
              </span>

              {/* Action Buttons: + Entrada & + Saída */}
              <div className="flex items-center gap-1.5">
                {/* Input + Button for Entry Photo */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  ref={entryPhotoInputRef}
                  onChange={handleAddEntryPhoto}
                  className="hidden"
                  id="modal-entry-photo-input"
                />
                <label
                  htmlFor="modal-entry-photo-input"
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B1B4A] font-bold text-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  title="Adicionar foto do aparelho na entrada"
                >
                  <Camera className="w-3.5 h-3.5 text-[#0B1B4A]" />
                  <span>+ Foto de Entrada</span>
                </label>

                {/* Input + Button for Exit Photo */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  ref={exitPhotoInputRef}
                  onChange={handleAddExitPhoto}
                  className="hidden"
                  id="modal-exit-photo-input"
                />
                <label
                  htmlFor="modal-exit-photo-input"
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  title="Adicionar foto do aparelho na saída / concluído"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Foto de Saída</span>
                </label>
              </div>
            </div>

            {/* Uploading indicator */}
            {(uploadingEntryPhoto || uploadingExitPhoto) && (
              <div className="flex items-center gap-2 text-xs text-[#0B1B4A] font-semibold bg-white p-2.5 rounded-xl border border-slate-200 animate-pulse">
                <span className="inline-block w-4 h-4 border-2 border-[#0B1B4A]/30 border-t-[#0B1B4A] rounded-full animate-spin" />
                <span>
                  {uploadingEntryPhoto ? 'Enviando foto de entrada...' : 'Enviando foto de saída...'}
                </span>
              </div>
            )}

            {/* Filter Tabs if multiple photos exist */}
            {photosList.length > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setPhotoFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    photoFilter === 'all'
                      ? 'bg-[#0B1B4A] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Todas ({photosList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter('entrada')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    photoFilter === 'entrada'
                      ? 'bg-[#0B1B4A] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Entrada ({photosList.filter((p) => p.tipo !== 'saida' && p.categoria !== 'saida').length})
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoFilter('saida')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    photoFilter === 'saida'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Saída ({photosList.filter((p) => p.tipo === 'saida' || p.categoria === 'saida').length})
                </button>
              </div>
            )}

            {/* Photos Grid */}
            {photosList.length === 0 ? (
              <div className="text-center py-5 px-3 bg-white rounded-xl border border-dashed border-slate-200">
                <Camera className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-500 font-medium">
                  Nenhuma foto registrada para este aparelho ainda.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use os botões acima para anexar fotos de Entrada ou Saída.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                {photosList
                  .filter((p) => {
                    if (photoFilter === 'entrada') return p.tipo !== 'saida' && p.categoria !== 'saida';
                    if (photoFilter === 'saida') return p.tipo === 'saida' || p.categoria === 'saida';
                    return true;
                  })
                  .map((p, idx) => {
                    const isSaida = p.tipo === 'saida' || p.categoria === 'saida';
                    const isDeletingThis = deletingPhotoId === p.id;

                    return (
                      <div
                        key={p.id || idx}
                        className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        {/* Clickable Image to view/edit */}
                        <div
                          onClick={() => handleOpenEditPhoto(p)}
                          className="w-full h-full cursor-pointer overflow-hidden relative"
                        >
                          <img
                            src={p.url_foto}
                            alt={isSaida ? 'Foto de saída' : 'Foto de entrada'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Hover Overlay with Eye / Edit */}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                            <span className="p-1.5 rounded-lg bg-white/90 text-slate-800 text-[10px] font-bold flex items-center gap-1 shadow">
                              <Pencil className="w-3 h-3 text-[#0B1B4A]" />
                              <span>Editar</span>
                            </span>
                          </div>
                        </div>

                        {/* Top Actions: WhatsApp & Delete */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          {/* Quick WhatsApp Photo Share Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              shareSinglePhotoToWhatsApp(p, getCurrentOSPayload());
                            }}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow"
                            title="Enviar esta foto no WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </button>

                          {/* Quick Delete Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePhoto(p.id);
                            }}
                            disabled={isDeletingThis}
                            className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors shadow"
                            title="Excluir foto"
                          >
                            {isDeletingThis ? (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>

                        {/* Bottom Label Badge */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 pointer-events-none flex items-center justify-between gap-1">
                          <span
                            className={`text-white text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider shadow ${
                              isSaida ? 'bg-emerald-600' : 'bg-[#0B1B4A]'
                            }`}
                          >
                            {isSaida ? 'Saída' : 'Entrada'}
                          </span>

                          {p.observacao && (
                            <span className="text-white text-[8px] bg-black/70 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                              {p.observacao}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Action Buttons: WhatsApp & Receipt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleWhatsApp}
              disabled={sendingWhatsApp}
              className="py-2.5 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95 disabled:opacity-60"
            >
              {sendingWhatsApp ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparando OS e Anexos...</span>
                </>
              ) : whatsAppSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Enviado com Sucesso!</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>
                    Enviar OS e Checklist {photosList.length > 0 ? `(+${photosList.length} foto${photosList.length > 1 ? 's' : ''})` : ''}
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenReceipt({ ...os, descricao_servico: descricaoServico, valor: parseFloat(valor || '0'), garantia_fim: garantiaFim, garantia_cobertura: garantiaCobertura })}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-95"
            >
              <Receipt className="w-4 h-4 text-slate-600" />
              <span>Visualizar Comprovante</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL EXCLUSIVO DE VISUALIZAÇÃO E EDIÇÃO DA FOTO                          */}
      {/* ========================================================================= */}
      {selectedPhotoForEdit && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#0B1B4A] px-5 py-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">Editar Foto do Aparelho</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoForEdit(null)}
                className="p-1 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {/* Photo High-Res Preview */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video flex items-center justify-center shadow-inner">
                <img
                  src={selectedPhotoForEdit.url_foto}
                  alt="Foto detalhada"
                  className="w-full h-full object-contain"
                />

                <span
                  className={`absolute top-2.5 left-2.5 text-white text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider shadow ${
                    editPhotoTipo === 'saida' ? 'bg-emerald-600' : 'bg-[#0B1B4A]'
                  }`}
                >
                  {editPhotoTipo === 'saida' ? 'Foto de Saída / Concluído' : 'Foto de Entrada'}
                </span>
              </div>

              {/* Change/Replace Photo Image */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-700 font-medium">Trocar arquivo desta imagem:</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={replacePhotoInputRef}
                  onChange={handleReplacePhotoFile}
                  className="hidden"
                  id="replace-photo-modal-input"
                />
                <label
                  htmlFor="replace-photo-modal-input"
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0B1B4A] font-bold text-xs border border-slate-200 cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Escolher Outra Foto</span>
                </label>
              </div>

              {/* Photo Type Toggle (Entrada vs Saída) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider">
                  Tipo da Foto
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditPhotoTipo('entrada')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                      editPhotoTipo === 'entrada'
                        ? 'bg-[#0B1B4A] text-white border-[#0B1B4A] shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>📥 Foto de Entrada</span>
                    {editPhotoTipo === 'entrada' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditPhotoTipo('saida')}
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                      editPhotoTipo === 'saida'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>📤 Foto de Saída</span>
                    {editPhotoTipo === 'saida' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Observation / Note Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 tracking-wider">
                  Observação / Legenda
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tela com trincado superior, tampa riscada, aparelho com película..."
                  value={editPhotoObs}
                  onChange={(e) => setEditPhotoObs(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-xs bg-white text-slate-800"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shareSinglePhotoToWhatsApp(selectedPhotoForEdit, getCurrentOSPayload())}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  title="Enviar esta foto diretamente para o WhatsApp do cliente"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar Foto no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeletePhoto(selectedPhotoForEdit.id)}
                  disabled={savingPhotoEdit}
                  className="px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Excluir</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPhotoForEdit(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 transition-all active:scale-95"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSavePhotoChanges}
                  disabled={savingPhotoEdit}
                  className="px-4 py-2.5 rounded-xl bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 disabled:opacity-50"
                >
                  {savingPhotoEdit ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Foto</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

