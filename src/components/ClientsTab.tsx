import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  MessageCircle,
  Smartphone,
  Calendar,
  DollarSign,
  ChevronRight,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clock,
  X,
  FileText,
  ShieldCheck,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { ClientWithDetails, OSWithDetails, OSStatus } from '../types';
import {
  fetchClients,
  createDirectClient,
  updateDirectClient,
  deleteDirectClient,
} from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface ClientsTabProps {
  onNewOSForClient: (client: { id?: string; nome: string; telefone: string; data_nascimento?: string | null }) => void;
  onSelectOS: (os: OSWithDetails) => void;
  lastUpdated: number;
  onRefreshAll: () => void;
}

const STATUS_CONFIG: Record<
  OSStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  recebido: {
    label: 'Recebido',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
  },
  em_reparo: {
    label: 'Em Reparo',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200/80',
  },
  pronto: {
    label: 'Pronto',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
  },
  entregue: {
    label: 'Entregue',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
};

export const ClientsTab: React.FC<ClientsTabProps> = ({
  onNewOSForClient,
  onSelectOS,
  lastUpdated,
  onRefreshAll,
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'com_ativas' | 'com_concluidas'>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'nome' | 'valor' | 'qtd_os'>('recentes');

  // Client modals
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithDetails | null>(null);
  const [selectedClientHistory, setSelectedClientHistory] = useState<ClientWithDetails | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientWithDetails | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formBirthDate, setFormBirthDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadClients = async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await fetchClients(user.id);
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadClients();
  }, [lastUpdated, user?.id]);

  const handlePhoneFormat = (val: string) => {
    const cleaned = val.replace(/\D/g, '');
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

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Por favor, informe o nome do cliente.');
      return;
    }
    if (!formPhone.trim()) {
      setFormError('Por favor, informe o telefone/WhatsApp.');
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      if (editingClient) {
        // Update client
        const { error } = await updateDirectClient(editingClient.id, {
          nome: formName.trim(),
          telefone: formPhone.trim(),
          data_nascimento: formBirthDate || null,
        });
        if (error) throw error;
      } else {
        // Create new client
        const { error } = await createDirectClient(
          formName.trim(),
          formPhone.trim(),
          formBirthDate || undefined,
          user?.id
        );
        if (error) throw error;
      }

      setIsNewClientOpen(false);
      setEditingClient(null);
      setFormName('');
      setFormPhone('');
      setFormBirthDate('');
      await loadClients();
      onRefreshAll();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar cliente');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setDeletingId(clientToDelete.id);
    try {
      const { error } = await deleteDirectClient(clientToDelete.id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
        setClientToDelete(null);
        onRefreshAll();
      }
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(
      `Olá ${name}! Tudo bem? Sou da MAJOR Assistência Técnica. Como posso ajudar com seu smartphone hoje?`
    );
    window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
  };

  // Metrics
  const totalClients = clients.length;
  const clientsWithActiveOS = clients.filter((c) => (c.active_os_count || 0) > 0).length;
  const totalRevenue = clients.reduce((acc, c) => acc + (c.total_spent || 0), 0);
  const totalServices = clients.reduce((acc, c) => acc + (c.total_os_count || 0), 0);

  // Filter and sort clients
  const filteredClients = clients
    .filter((c) => {
      const matchesSearch =
        c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.telefone.includes(searchQuery.replace(/\D/g, '')) ||
        (c.devices || []).some(
          (d) =>
            d.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.modelo.toLowerCase().includes(searchQuery.toLowerCase())
        );

      let matchesFilter = true;
      if (filterType === 'com_ativas') {
        matchesFilter = (c.active_os_count || 0) > 0;
      } else if (filterType === 'com_concluidas') {
        matchesFilter = (c.total_os_count || 0) > 0 && (c.active_os_count || 0) === 0;
      }

      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'nome') {
        return a.nome.localeCompare(b.nome);
      }
      if (sortBy === 'valor') {
        return (b.total_spent || 0) - (a.total_spent || 0);
      }
      if (sortBy === 'qtd_os') {
        return (b.total_os_count || 0) - (a.total_os_count || 0);
      }
      // 'recentes'
      return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Clientes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 text-[#0B1B4A] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Total de Clientes
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {totalClients}
            </div>
          </div>
        </div>

        {/* Metric 2: Com OS Ativa */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Com OS Ativa
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 leading-tight">
              {clientsWithActiveOS}
            </div>
          </div>
        </div>

        {/* Metric 3: Total de Serviços */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Serviços Criados
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
              {totalServices}
            </div>
          </div>
        </div>

        {/* Metric 4: Faturamento */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0B1B4A]/5 border border-[#0B1B4A]/10 text-[#0B1B4A] flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Total Faturado
            </span>
            <div className="text-lg sm:text-xl font-black text-[#0B1B4A] leading-tight">
              R$ {totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar & Controls */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente por nome, telefone ou aparelho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200/80 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm text-slate-800 placeholder:text-slate-400 bg-slate-50/70 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadClients}
              disabled={loading}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 border border-slate-200/60"
              title="Atualizar lista de clientes"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0B1B4A]' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={() => {
                setEditingClient(null);
                setFormName('');
                setFormPhone('');
                setFormBirthDate('');
                setFormError(null);
                setIsNewClientOpen(true);
              }}
              className="py-3 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>

        {/* Filter Chips & Sorting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterType === 'todos'
                  ? 'bg-[#0B1B4A] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              Todos ({clients.length})
            </button>
            <button
              onClick={() => setFilterType('com_ativas')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterType === 'com_ativas'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100/70 border border-amber-200/70'
              }`}
            >
              Com OS Ativa ({clientsWithActiveOS})
            </button>
            <button
              onClick={() => setFilterType('com_concluidas')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                filterType === 'com_concluidas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/70'
              }`}
            >
              Serviços Concluídos
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl px-2.5 py-1.5 outline-none focus:border-[#0B1B4A] text-xs"
            >
              <option value="recentes">Mais Recentes</option>
              <option value="nome">Nome (A-Z)</option>
              <option value="valor">Maior Faturamento</option>
              <option value="qtd_os">Mais Ordens de Serviço</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
            <div className="w-8 h-8 border-3 border-[#0B1B4A]/20 border-t-[#0B1B4A] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Carregando lista de clientes do Supabase...
            </p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery
                  ? 'Nenhum cliente encontrado para a busca'
                  : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Verifique a digitação do nome ou número do telefone.'
                  : 'Cadastre seus clientes diretamente ou registre uma nova Ordem de Serviço.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => {
                  setEditingClient(null);
                  setFormName('');
                  setFormPhone('');
                  setFormBirthDate('');
                  setIsNewClientOpen(true);
                }}
                className="px-5 py-2.5 bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold rounded-xl shadow transition-all inline-flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>Cadastrar Primeiro Cliente</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredClients.map((client) => {
              const formattedPhone = handlePhoneFormat(client.telefone);
              const initials = client.nome
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const createdDate = new Date(client.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              const birthDateFormatted = client.data_nascimento
                ? client.data_nascimento.split('-').reverse().join('/')
                : null;

              return (
                <div
                  key={client.id}
                  className="bg-white hover:bg-slate-50/70 rounded-2xl md:rounded-3xl p-4 sm:p-5 border border-slate-100 hover:border-[#0B1B4A]/30 shadow-sm hover:shadow transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Avatar + Client Name & Phone */}
                    <div className="flex items-start sm:items-center gap-3.5">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-[#0B1B4A] text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                        {initials || 'CL'}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900 leading-tight">
                            {client.nome}
                          </h4>
                          {(client.active_os_count || 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {client.active_os_count} OS Ativa{client.active_os_count! > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {formattedPhone}
                          </span>
                          {birthDateFormatted && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1 text-slate-600 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                                <Calendar className="w-3 h-3 text-[#0B1B4A]" />
                                Nasc: {birthDateFormatted}
                              </span>
                            </>
                          )}
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            Cliente desde {createdDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Create New OS for this Client */}
                      <button
                        type="button"
                        onClick={() =>
                          onNewOSForClient({
                            id: client.id,
                            nome: client.nome,
                            telefone: client.telefone,
                            data_nascimento: client.data_nascimento,
                          })
                        }
                        className="py-2 px-3 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                        title="Abrir Nova OS para este cliente"
                      >
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span>Nova OS</span>
                      </button>

                      {/* WhatsApp Button */}
                      <button
                        type="button"
                        onClick={() => openWhatsApp(client.telefone, client.nome)}
                        className="p-2 sm:py-2 sm:px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span className="hidden md:inline">WhatsApp</span>
                      </button>

                      {/* History Details Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedClientHistory(client)}
                        className="p-2 sm:py-2 sm:px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold"
                        title="Ver histórico de Ordens de Serviço"
                      >
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="hidden md:inline">Histórico ({client.total_os_count || 0})</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClient(client);
                          setFormName(client.nome);
                          setFormPhone(client.telefone);
                          setFormBirthDate(client.data_nascimento || '');
                          setFormError(null);
                          setIsNewClientOpen(true);
                        }}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                        title="Editar dados do cliente"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setClientToDelete(client)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 transition-colors"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Bar: Total OS, Spent, Devices summary */}
                  <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {/* Registered Devices chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-slate-500" />
                        Aparelhos:
                      </span>
                      {client.devices && client.devices.length > 0 ? (
                        client.devices.map((dev) => (
                          <span
                            key={dev.id}
                            className="bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 font-medium text-[11px]"
                          >
                            {dev.marca} {dev.modelo}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Nenhum aparelho registrado</span>
                      )}
                    </div>

                    {/* Financial & OS stats */}
                    <div className="flex items-center gap-3 text-slate-600 shrink-0 font-medium">
                      <span>
                        <strong className="text-slate-900">{client.total_os_count || 0}</strong> OS realizada{(client.total_os_count || 0) !== 1 ? 's' : ''}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Total:{' '}
                        <strong className="text-[#0B1B4A]">
                          R$ {(client.total_spent || 0).toFixed(2)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New / Edit Client */}
      {isNewClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="bg-[#0B1B4A] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-[#0B1B4A] flex items-center justify-center font-black text-sm shadow">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">
                    Cadastro de Cliente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewClientOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveClient} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Silva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={handlePhoneFormat(formPhone)}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Data de Nascimento (Opcional)
                </label>
                <input
                  type="date"
                  value={formBirthDate}
                  onChange={(e) => setFormBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#0B1B4A] focus:ring-2 focus:ring-[#0B1B4A]/10 outline-none text-sm bg-slate-50/50 focus:bg-white text-slate-700 font-medium"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewClientOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  {formLoading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </span>
                  ) : (
                    <span>{editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client History / Detailed OS View */}
      {selectedClientHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            {/* Header */}
            <div className="bg-[#0B1B4A] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white text-[#0B1B4A] flex items-center justify-center font-black text-sm shadow">
                  {selectedClientHistory.nome.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {selectedClientHistory.nome}
                  </h3>
                  <p className="text-[10px] text-white/80 uppercase font-bold tracking-[0.18em]">
                    Histórico de Serviços e Aparelhos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientHistory(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* History Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Client Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    WhatsApp
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {handlePhoneFormat(selectedClientHistory.telefone)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Nascimento
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedClientHistory.data_nascimento
                      ? selectedClientHistory.data_nascimento.split('-').reverse().join('/')
                      : 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total de OS
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedClientHistory.total_os_count || 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Total Investido
                  </span>
                  <span className="text-xs font-extrabold text-[#0B1B4A]">
                    R$ {(selectedClientHistory.total_spent || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Service Orders List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ordens de Serviço do Cliente:
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const c = selectedClientHistory;
                      setSelectedClientHistory(null);
                      onNewOSForClient({
                        id: c.id,
                        nome: c.nome,
                        telefone: c.telefone,
                        data_nascimento: c.data_nascimento,
                      });
                    }}
                    className="text-xs font-bold text-[#0B1B4A] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nova OS para este cliente</span>
                  </button>
                </div>

                {(!selectedClientHistory.service_orders ||
                  selectedClientHistory.service_orders.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                    <p className="text-xs text-slate-500">
                      Nenhuma Ordem de Serviço registrada para este cliente ainda.
                    </p>
                  </div>
                ) : (
                  selectedClientHistory.service_orders.map((os) => {
                    const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.recebido;
                    const dateStr = new Date(os.data_entrada).toLocaleDateString('pt-BR');
                    const shortId = os.id.slice(0, 8).toUpperCase();

                    return (
                      <div
                        key={os.id}
                        onClick={() => {
                          setSelectedClientHistory(null);
                          onSelectOS(os);
                        }}
                        className="p-3.5 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-[#0B1B4A]/40 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold bg-slate-100 text-[#0B1B4A] px-1.5 py-0.5 rounded">
                              #{shortId}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              {os.device?.marca} {os.device?.modelo}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {os.descricao_servico || 'Sem descrição cadastrada'}
                          </p>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Entrada em {dateStr}
                          </span>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <div
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider inline-block ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            {statusCfg.label}
                          </div>
                          <div className="text-xs font-bold text-[#0B1B4A]">
                            R$ {Number(os.valor || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Client Confirmation */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Excluir Cliente?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tem certeza que deseja apagar o cadastro de <strong>{clientToDelete.nome}</strong>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                disabled={!!deletingId}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={!!deletingId}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {deletingId ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </span>
                ) : (
                  <span>Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
