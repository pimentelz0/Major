import React, { useState, useRef, useEffect } from 'react';
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
  MessageCircle,
  Calendar,
  UserPlus,
  Check,
  Search,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createServiceOrder, fetchClients, uploadChecklistPhoto, fileToDataUrl } from '../lib/supabase';
import type { OSWithDetails, DeviceChecklist, ClientWithDetails } from '../types';
import { ChecklistEditor } from './ChecklistEditor';
import { sendWhatsAppOSWithPhotos } from '../utils/whatsapp';

interface NewOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOS: OSWithDetails) => void;
  initialClient?: { id?: string; nome: string; telefone: string; data_nascimento?: string | null } | null;
}

interface PhotoItem {
  id: string;
  file?: File;
  previewUrl: string;
  categoria: string;
  observacao: string;
}

const COMMON_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Motorola', 'Outro'];

export const NewOSModal: React.FC<NewOSModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialClient,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clients from database for quick selection
  const [savedClients, setSavedClients] = useState<ClientWithDetails[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const clientPickerRef = useRef<HTMLDivElement>(null);

  // Form State
  const [clienteNome, setClienteNome] = useState(initialClient?.nome || '');
  const [clienteTelefone, setClienteTelefone] = useState(initialClient?.telefone || '');
  const [clienteDataNascimento, setClienteDataNascimento] = useState(initialClient?.data_nascimento || '');
  const [aparelhoMarca, setAparelhoMarca] = useState('Apple');
  const [aparelhoModelo, setAparelhoModelo] = useState('');
  const [aparelhoImei, setAparelhoImei] = useState('');
  const [showImei, setShowImei] = useState(false);
  const [valor, setValor] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');

  // Device Test Checklist
  const [checklist, setChecklist] = useState<DeviceChecklist>({});

  // Checklist Photos (Entrada)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<string>('entrada');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientPickerRef.current && !clientPickerRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load clients when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadExistingClients = async () => {
      setLoadingClients(true);
      try {
        const { data } = await fetchClients(user?.id);
        if (data) {
          setSavedClients(data);
          // If initial client was provided, match it
          if (initialClient) {
            const matched = data.find(
              (c) =>
                (initialClient.id && c.id === initialClient.id) ||
                (c.telefone && initialClient.telefone && c.telefone.replace(/\D/g, '') === initialClient.telefone.replace(/\D/g, '')) ||
                c.nome.trim().toLowerCase() === initialClient.nome.trim().toLowerCase()
            );
            if (matched) {
              setSelectedClientId(matched.id);
              setClienteNome(matched.nome);
              setClienteTelefone(handlePhoneFormat(matched.telefone));
              if (matched.data_nascimento) {
                setClienteDataNascimento(matched.data_nascimento);
              }
            } else {
              setSelectedClientId(initialClient.id || null);
              setClienteNome(initialClient.nome);
              setClienteTelefone(handlePhoneFormat(initialClient.telefone));
              if (initialClient.data_nascimento) {
                setClienteDataNascimento(initialClient.data_nascimento);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar clientes para o seletor:', err);
      } finally {
        setLoadingClients(false);
      }
    };

    loadExistingClients();
  }, [isOpen, user?.id, initialClient]);

  if (!isOpen) return null;

  const handlePhoneFormat = (val: string) => {
    const cleaned = (val || '').replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length > 6 && cleaned.length <= 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    return formatted;
  };

  const handlePhoneChange = (val: string) => {
    setClienteTelefone(handlePhoneFormat(val));
  };

  // Handle selecting an existing client from dropdown
  const handleSelectClient = (clientId: string) => {
    if (!clientId) {
      // Clear selection to create new
      setSelectedClientId(null);
      setSelectedDeviceId(null);
      return;
    }

    const client = savedClients.find((c) => c.id === clientId);
    if (client) {
      setSelectedClientId(client.id);
      setClienteNome(client.nome);
      setClienteTelefone(handlePhoneFormat(client.telefone));
      setClienteDataNascimento(client.data_nascimento || '');
      setSelectedDeviceId(null);

      // If client has only 1 device, preselect it
      if (client.devices && client.devices.length === 1) {
        const dev = client.devices[0];
        setSelectedDeviceId(dev.id);
        setAparelhoMarca(dev.marca || 'Apple');
        setAparelhoModelo(dev.modelo || '');
        if (dev.imei) {
          setAparelhoImei(dev.imei);
          setShowImei(true);
        }
      }
    }
  };

  // Handle selecting an existing device of the selected client
  const handleSelectDevice = (devId: string) => {
    if (!devId) {
      setSelectedDeviceId(null);
      setAparelhoModelo('');
      setAparelhoImei('');
      return;
    }

    const client = savedClients.find((c) => c.id === selectedClientId);
    const dev = client?.devices?.find((d) => d.id === devId);
    if (dev) {
      setSelectedDeviceId(dev.id);
      setAparelhoMarca(dev.marca || 'Apple');
      setAparelhoModelo(dev.modelo || '');
      if (dev.imei) {
        setAparelhoImei(dev.imei);
        setShowImei(true);
      }
    }
  };

  // Reset client selection to manual entry
  const handleResetToNewClient = () => {
    setSelectedClientId(null);
    setSelectedDeviceId(null);
    setClienteNome('');
    setClienteTelefone('');
    setClienteDataNascimento('');
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

  const handleSubmit = async (e?: React.FormEvent, sendWhatsApp: boolean = false) => {
    if (e) e.preventDefault();
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

      // 2. Insert into Supabase (reusing client/device if selected)
      const numericVal = parseFloat(valor.replace(',', '.')) || 0;

      const { data: createdOS, error: createError } = await createServiceOrder(
        {
          clienteId: selectedClientId || undefined,
          clienteNome: clienteNome.trim(),
          clienteTelefone: clienteTelefone.trim(),
          clienteDataNascimento: clienteDataNascimento || undefined,
          aparelhoId: selectedDeviceId || undefined,
          aparelhoMarca,
          aparelhoModelo: aparelhoModelo.trim(),
          aparelhoImei: showImei && aparelhoImei ? aparelhoImei.trim() : undefined,
          valor: numericVal,
          descricaoServico: descricaoServico.trim() || undefined,
          checklist: Object.keys(checklist).length > 0 ? checklist : undefined,
          fotosEntrada: uploadedPhotos,
        },
        user?.id
      );

      if (createError || !createdOS) {
        throw new Error(createError?.message || 'Falha ao gravar Ordem de Serviço no Supabase');
      }

      // 3. Send full OS message with checklist and photos via WhatsApp if requested
      if (sendWhatsApp) {
        await sendWhatsAppOSWithPhotos(createdOS);
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

  const selectedClientObj = savedClients.find((c) => c.id === selectedClientId);

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
            <div className="flex items-center justify-between gap-2 pb-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0B1B4A]" />
                Dados do Cliente
              </span>
              {selectedClientId ? (
                <button
                  type="button"
                  onClick={handleResetToNewClient}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3 h-3" />
                  Digitar Novo Cliente
                </button>
              ) : savedClients.length > 0 ? (
                <span className="text-[11px] text-slate-500 font-medium">
                  {savedClients.length} cliente{savedClients.length > 1 ? 's' : ''} cadastrado{savedClients.length > 1 ? 's' : ''}
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nome do Cliente com Autocomplete e Seletor Integrado */}
              <div className="relative" ref={clientPickerRef}>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nome do Cliente *
                  </label>
                  {savedClients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowClientSuggestions((prev) => !prev)}
                      className="text-[10px] text-blue-600 hover:text-[#0B1B4A] font-bold flex items-center gap-0.5"
                    >
                      <span>Ver clientes</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome ou selecione..."
                    value={clienteNome}
                    onFocus={() => {
                      if (savedClients.length > 0) setShowClientSuggestions(true);
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      setClienteNome(val);
                      setShowClientSuggestions(true);
                      if (selectedClientId) {
                        const sel = savedClients.find((c) => c.id === selectedClientId);
                        if (!sel || sel.nome.trim().toLowerCase() !== val.trim().toLowerCase()) {
                          setSelectedClientId(null);
                          setSelectedDeviceId(null);
                        }
                      }
                    }}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white font-medium shadow-xs"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowClientSuggestions((prev) => !prev)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0B1B4A] hover:bg-slate-100 rounded-lg transition-colors"
                    title="Alternar lista de clientes cadastrados"
                  >
                    {showClientSuggestions ? (
                      <ChevronUp className="w-4 h-4 text-[#0B1B4A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Floating Autocomplete Dropdown */}
                {showClientSuggestions && savedClients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 animate-fadeIn">
                    <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600 sticky top-0 z-10">
                      <span className="flex items-center gap-1">
                        <Search className="w-3 h-3 text-slate-400" />
                        Clientes na Base ({
                          savedClients.filter((c) => {
                            if (!clienteNome.trim()) return true;
                            const q = clienteNome.toLowerCase().trim();
                            const phoneClean = (c.telefone || '').replace(/\D/g, '');
                            const searchClean = q.replace(/\D/g, '');
                            return (
                              c.nome.toLowerCase().includes(q) ||
                              (searchClean && phoneClean.includes(searchClean))
                            );
                          }).length
                        })
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Clique para selecionar</span>
                    </div>

                    {(() => {
                      const filtered = savedClients.filter((c) => {
                        if (!clienteNome.trim()) return true;
                        const q = clienteNome.toLowerCase().trim();
                        const phoneClean = (c.telefone || '').replace(/\D/g, '');
                        const searchClean = q.replace(/\D/g, '');
                        return (
                          c.nome.toLowerCase().includes(q) ||
                          (searchClean && phoneClean.includes(searchClean))
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-3 text-center text-xs text-slate-500">
                            Nenhum cliente cadastrado com "{clienteNome}".
                            <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                              ✓ Será cadastrado automaticamente na base ao salvar esta OS!
                            </p>
                          </div>
                        );
                      }

                      return filtered.slice(0, 30).map((c) => {
                        const isSelected = selectedClientId === c.id;
                        const bdayFormatted = c.data_nascimento
                          ? c.data_nascimento.split('-').reverse().join('/')
                          : null;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleSelectClient(c.id);
                              setShowClientSuggestions(false);
                            }}
                            className={`w-full text-left p-2.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-2.5 ${
                              isSelected ? 'bg-blue-50/80 text-[#0B1B4A]' : 'text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-[#0B1B4A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                                {c.nome.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                  {c.nome}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>{handlePhoneFormat(c.telefone)}</span>
                                  {bdayFormatted && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-600 font-medium flex items-center gap-0.5">
                                        <Calendar className="w-2.5 h-2.5 text-[#0B1B4A]" />
                                        Nasc: {bdayFormatted}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {c.devices && c.devices.length > 0 && (
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md hidden sm:inline">
                                  {c.devices.length} aparelho{c.devices.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-600" />
                              )}
                            </div>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
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
                    onChange={(e) => {
                      handlePhoneChange(e.target.value);
                      if (selectedClientId) setSelectedClientId(null);
                    }}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white font-medium"
                  />
                </div>
              </div>

              {/* Data de Nascimento */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#0B1B4A]" />
                  Data de Nascimento (Opcional)
                </label>
                <input
                  type="date"
                  value={clienteDataNascimento}
                  onChange={(e) => setClienteDataNascimento(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white text-slate-700 font-medium"
                />
              </div>
            </div>

            {/* Informative Status Badge */}
            {selectedClientId ? (
              <div className="flex items-center justify-between gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Cliente da base vinculado: {selectedClientObj?.nome}
                </span>
                <button
                  type="button"
                  onClick={handleResetToNewClient}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline hover:no-underline"
                >
                  Novo / Desvincular
                </button>
              </div>
            ) : clienteNome.trim().length > 0 ? (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200/80">
                <UserPlus className="w-3.5 h-3.5 text-[#0B1B4A] shrink-0" />
                <span>Novo cliente: será cadastrado automaticamente na base ao salvar esta OS.</span>
              </div>
            ) : null}
          </div>

          {/* Grupo 2: Aparelho */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#0B1B4A]" />
                Dados do Aparelho
              </span>
              {selectedClientObj?.devices && selectedClientObj.devices.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {selectedClientObj.devices.length} aparelho{selectedClientObj.devices.length > 1 ? 's' : ''} deste cliente
                </span>
              )}
            </div>

            {/* Quick selector for existing client's devices */}
            {selectedClientObj?.devices && selectedClientObj.devices.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Aparelhos já registrados deste cliente:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectDevice('')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
                      !selectedDeviceId
                        ? 'bg-[#0B1B4A] text-white border-[#0B1B4A] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    + Novo Aparelho
                  </button>
                  {selectedClientObj.devices.map((dev) => {
                    const isDevSelected = selectedDeviceId === dev.id;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => handleSelectDevice(dev.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all border ${
                          isDevSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {dev.marca} {dev.modelo}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-white font-medium"
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

          {/* Checklist de Testes do Aparelho */}
          <ChecklistEditor
            checklist={checklist}
            onChange={setChecklist}
          />

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

          {/* Submit Actions - Compact & App Blue Theme */}
          <div className="pt-3 flex flex-col gap-2">
            <button
              type="button"
              id="btn-submit-whatsapp"
              onClick={() => handleSubmit(undefined, true)}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-semibold rounded-xl shadow transition-all flex items-center justify-center gap-2 text-xs sm:text-sm disabled:opacity-50 active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processando e enviando...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>Registrar e Enviar pro Cliente (OS + Checklist)</span>
                </span>
              )}
            </button>

            <button
              type="button"
              id="btn-submit-only"
              onClick={() => handleSubmit(undefined, false)}
              disabled={loading}
              className="w-full py-1.5 px-3 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Apenas salvar (sem enviar WhatsApp)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

