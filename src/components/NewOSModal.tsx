import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Smartphone,
  Camera,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createServiceOrder, uploadChecklistPhoto, fileToDataUrl } from '../lib/supabase';
import type { OSWithDetails } from '../types';

interface NewOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOS: OSWithDetails) => void;
}

interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  categoria: string;
  observacao: string;
}

const COMMON_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Outro'];

export const NewOSModal: React.FC<NewOSModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [aparelhoMarca, setAparelhoMarca] = useState('Apple');
  const [aparelhoModelo, setAparelhoModelo] = useState('');
  const [aparelhoImei, setAparelhoImei] = useState('');
  const [showImei, setShowImei] = useState(false);
  const [valor, setValor] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');

  // Checklist Photos (Entrada)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<string>('entrada');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhoneChange = (val: string) => {
    // Keep numbers and format as (XX) XXXXX-XXXX if possible
    const cleaned = val.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length > 6 && cleaned.length <= 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    setClienteTelefone(formatted);
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files) as File[];
    const newItems: PhotoItem[] = [];

    for (const file of files) {
      const previewUrl = await fileToDataUrl(file);
      newItems.push({
        id: `local-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        categoria: selectedPhotoCategory,
        observacao: '',
      });
    }

    setPhotos((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!clienteNome.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }
    if (!clienteTelefone.trim()) {
      setError('Por favor, informe o WhatsApp do cliente.');
      return;
    }
    if (!aparelhoModelo.trim()) {
      setError('Por favor, informe o modelo do smartphone.');
      return;
    }

    setLoading(true);

    try {
      // 1. Process and upload photos (or get URLs)
      const uploadedPhotos: Array<{ url: string; categoria: string; observacao?: string }> = [];

      for (const p of photos) {
        let finalUrl = p.previewUrl;
        if (p.file) {
          finalUrl = await uploadChecklistPhoto(p.file, 'temp-new', 'entrada');
        }
        uploadedPhotos.push({
          url: finalUrl,
          categoria: p.categoria,
          observacao: p.observacao || undefined,
        });
      }

      // 2. Insert into Supabase (clients + devices + service_orders + checklist_photos)
      const numericVal = parseFloat(valor.replace(',', '.')) || 0;

      const { data: createdOS, error: createError } = await createServiceOrder(
        {
          clienteNome,
          clienteTelefone,
          aparelhoMarca,
          aparelhoModelo,
          aparelhoImei: showImei && aparelhoImei ? aparelhoImei : undefined,
          valor: numericVal,
          descricaoServico: descricaoServico || undefined,
          fotosEntrada: uploadedPhotos,
        },
        user?.id
      );

      if (createError || !createdOS) {
        throw new Error(createError?.message || 'Falha ao gravar Ordem de Serviço no Supabase');
      }

      onSuccess(createdOS);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro inesperado ao registrar OS no Supabase');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-100 animate-fadeIn">
        {/* Header */}
        <div className="bg-[#0B1B4A] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white text-[#0B1B4A] flex items-center justify-center font-black text-sm shadow">
              OS
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">
                Nova Ordem de Serviço
              </h2>
              <p className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">
                Registro de entrada do aparelho
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Grupo 1: Cliente */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#0B1B4A]" />
              Dados do Cliente
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={clienteTelefone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Grupo 2: Aparelho */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#0B1B4A]" />
              Dados do Aparelho
            </span>

            {/* Quick Brand Selector Chips */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Marca
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_BRANDS.map((brand) => {
                  const isSelected = aparelhoMarca === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setAparelhoMarca(brand)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
                        isSelected
                          ? 'bg-[#0B1B4A] text-white border-[#0B1B4A] shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: iPhone 13 / Galaxy S23"
                  value={aparelhoModelo}
                  onChange={(e) => setAparelhoModelo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor Combinado (R$)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white font-semibold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Collapsed IMEI toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowImei(!showImei)}
                className="text-xs font-semibold text-[#0B1B4A] flex items-center gap-1 hover:underline pt-1"
              >
                <span>{showImei ? 'Ocultar IMEI' : '+ Adicionar IMEI (opcional)'}</span>
                {showImei ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showImei && (
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Ex: 356872091234567"
                    value={aparelhoImei}
                    onChange={(e) => setAparelhoImei(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#0B1B4A] outline-none text-xs bg-white font-mono"
                  />
                </div>
              )}
            </div>

            {/* Problema / Serviço Relatado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-500" />
                Problema relatado / O que será feito (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Troca de tela frontal quebrada + película"
                value={descricaoServico}
                onChange={(e) => setDescricaoServico(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-[#0B1B4A] outline-none text-xs bg-white"
              />
            </div>
          </div>

          {/* Grupo 3: Checklist de Entrada & Fotos */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-[#0B1B4A]" />
                Checklist de Entrada (Fotos)
              </span>
              <span className="text-[11px] text-slate-500">
                {photos.length} foto(s) anexada(s)
              </span>
            </div>

            {/* Category selection for next photo */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-600 font-medium">Tipo da foto:</span>
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#0B1B4A] text-white">
                (entrada)
              </span>
            </div>

            {/* Photo Picker Trigger */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleAddPhotos}
                className="hidden"
                id="entry-photo-input"
              />
              <label
                htmlFor="entry-photo-input"
                className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-[#0B1B4A] bg-white hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 transition-all"
              >
                <Camera className="w-4 h-4 text-[#0B1B4A]" />
                <span>Tirar Foto ou Escolher Imagem do Aparelho (Entrada)</span>
              </label>
            </div>

            {/* Photos Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                {photos.map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white aspect-square shadow-sm"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.categoria}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                      (entrada)
                    </span>
                    <button
                      type="button"
                      onClick={() => removePhoto(item.id)}
                      className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-md opacity-80 hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando imagem...</span>
                </div>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Registrar Ordem de Serviço</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
