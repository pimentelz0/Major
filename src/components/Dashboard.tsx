import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Smartphone,
  Phone,
  Clock,
  MessageCircle,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  Database,
  CheckCircle2,
  Calendar,
  DollarSign,
  Camera,
  Pencil,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import type { OSWithDetails, OSStatus } from '../types';
import { fetchServiceOrders, deleteServiceOrder } from '../lib/supabase';

interface DashboardProps {
  onOpenNewOS: () => void;
  onSelectOS: (os: OSWithDetails) => void;
  onOpenSqlModal: () => void;
  lastUpdated: number;
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

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewOS,
  onSelectOS,
  onOpenSqlModal,
  lastUpdated,
}) => {
  const [orders, setOrders] = useState<OSWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'todas'>('todas');
  const [dbError, setDbError] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OSWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setDbError(null);
    const { data, error } = await fetchServiceOrders();
    if (error) {
      console.error('Error loading OS list:', error);
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        setDbError('Tabelas do Supabase ainda não foram criadas. Clique abaixo para ver o script SQL.');
      } else {
        setDbError(error.message);
      }
      setOrders([]);
    } else {
      setOrders(data);
    }
    setLoading(false);
  };

  const handleDeleteConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!orderToDelete) return;
    setDeletingId(orderToDelete.id);
    try {
      const { error } = await deleteServiceOrder(orderToDelete.id);
      if (error) {
        alert(`Erro ao excluir: ${error.message}`);
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
        setOrderToDelete(null);
      }
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [lastUpdated]);

  // Filtered list
  const filteredOrders = orders.filter((os) => {
    const matchesSearch =
      os.client?.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.device?.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.device?.modelo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'todas' || os.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count summaries
  const counts = {
    total: orders.length,
    recebido: orders.filter((o) => o.status === 'recebido').length,
    em_reparo: orders.filter((o) => o.status === 'em_reparo').length,
    pronto: orders.filter((o) => o.status === 'pronto').length,
    entregue: orders.filter((o) => o.status === 'entregue').length,
  };

  const handleDirectWhatsApp = (e: React.MouseEvent, os: OSWithDetails) => {
    e.stopPropagation();
    if (!os.client?.telefone) return;
    const cleanPhone = os.client.telefone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const shortId = os.id.substring(0, 8).toUpperCase();

    const text = `Olá *${os.client.nome}*, aqui é da *MAJOR Assistência Técnica* referente ao seu *${os.device?.marca} ${os.device?.modelo}* (OS #${shortId}).`;
    window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Database Setup Warning if tables are missing */}
      {dbError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Banco de Dados Supabase</h3>
              <p className="text-xs text-amber-800 mt-0.5">{dbError}</p>
            </div>
          </div>
          <button
            onClick={onOpenSqlModal}
            className="px-4 py-2 bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold rounded-xl shadow transition-all shrink-0 flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-white" />
            <span>Executar Script SQL</span>
          </button>
        </div>
      )}

      {/* Top Controls: Search Bar & Filters */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, aparelho ou #ID..."
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

          {/* Quick Refresh & New OS */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1.5 border border-slate-200/60"
              title="Atualizar lista do Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0B1B4A]' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={onOpenNewOS}
              className="py-3 px-4 bg-[#0B1B4A] hover:bg-[#142866] text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nova OS</span>
            </button>
          </div>
        </div>

        {/* Status Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('todas')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'todas'
                ? 'bg-[#0B1B4A] text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            Todas ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('recebido')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'recebido'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-amber-50/60 text-amber-800 hover:bg-amber-100/70 border border-amber-200/70'
            }`}
          >
            Recebidos ({counts.recebido})
          </button>
          <button
            onClick={() => setStatusFilter('em_reparo')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'em_reparo'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-blue-50/60 text-blue-800 hover:bg-blue-100/70 border border-blue-200/70'
            }`}
          >
            Em Reparo ({counts.em_reparo})
          </button>
          <button
            onClick={() => setStatusFilter('pronto')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'pronto'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/70'
            }`}
          >
            Prontos ({counts.pronto})
          </button>
          <button
            onClick={() => setStatusFilter('entregue')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              statusFilter === 'entregue'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            Entregues ({counts.entregue})
          </button>
        </div>
      </div>

      {/* OS List Table/Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-3">
            <div className="w-8 h-8 border-3 border-[#0B1B4A]/20 border-t-[#0B1B4A] rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Carregando Ordens de Serviço do Supabase...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl md:rounded-3xl p-12 text-center border border-slate-100 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Smartphone className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery
                  ? 'Nenhuma OS encontrada para a busca'
                  : 'Nenhuma Ordem de Serviço cadastrada'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tente buscar com outro nome de cliente ou modelo de aparelho.'
                  : 'Comece registrando a primeira entrada de aparelho para conserto.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={onOpenNewOS}
                className="px-5 py-2.5 bg-[#0B1B4A] hover:bg-[#142866] text-white text-xs font-bold rounded-xl shadow transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Registrar Nova OS</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredOrders.map((os) => {
              const statusCfg = STATUS_CONFIG[os.status] || STATUS_CONFIG.recebido;
              const shortId = os.id.substring(0, 8).toUpperCase();
              const formattedDate = new Date(os.data_entrada).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });

              return (
                <div
                  key={os.id}
                  onClick={() => onSelectOS(os)}
                  className="bg-white hover:bg-slate-50/70 rounded-2xl md:rounded-3xl p-4 sm:p-5 border border-slate-100 hover:border-[#0B1B4A]/30 shadow-sm hover:shadow transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Left info: OS ID, Device, Client */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Device Icon / Avatar */}
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 text-[#0B1B4A] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#0B1B4A] group-hover:text-white transition-all shadow-inner">
                      <Smartphone className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-[#0B1B4A] bg-slate-100 px-1.5 py-0.5 rounded tracking-wider">
                          #{shortId}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                          {os.device?.marca} {os.device?.modelo}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                        <span className="font-semibold text-slate-800">
                          {os.client?.nome || 'Cliente não identificado'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formattedDate}
                        </span>
                        {os.photos && os.photos.length > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 flex items-center gap-1">
                              <Camera className="w-3 h-3 text-slate-400" />
                              {os.photos.length} foto(s)
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Status Tag, Price, Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Status Badge */}
                    <div
                      className={`px-3 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </div>

                    {/* Price */}
                    <div className="text-right pl-1 sm:pl-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Valor</span>
                      <span className="text-sm font-extrabold text-[#0B1B4A]">
                        R$ {os.valor.toFixed(2)}
                      </span>
                    </div>

                    {/* Actions Group: WhatsApp, Edit, Delete */}
                    <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
                      {/* WhatsApp Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDirectWhatsApp(e, os)}
                        className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-colors"
                        title="Chamar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectOS(os);
                        }}
                        className="p-2 sm:p-2.5 rounded-xl bg-slate-50 hover:bg-[#0B1B4A] text-slate-700 hover:text-white border border-slate-200 transition-colors"
                        title="Editar Serviço"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(os);
                        }}
                        className="p-2 sm:p-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 transition-colors"
                        title="Apagar Serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Chevron Arrow */}
                    <div className="text-slate-300 group-hover:text-[#0B1B4A] transition-colors hidden sm:block">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Modal for Dashboard */}
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Ordem de Serviço?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja apagar a OS <strong>#{orderToDelete.id.slice(0, 8).toUpperCase()}</strong> ({orderToDelete.device?.marca} {orderToDelete.device?.modelo})? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  disabled={!!deletingId}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={!!deletingId}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  {deletingId ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <span>Excluir</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
