import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Cake,
  MessageCircle,
  Calendar,
  Phone,
  Sparkles,
  ChevronRight,
  User,
  PartyPopper,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchClients } from '../lib/supabase';
import type { ClientWithDetails } from '../types';
import { sendWhatsAppBirthdayGreeting } from '../utils/whatsapp';

interface BirthdayItem {
  client: ClientWithDetails;
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  formattedDate: string;
  turningAge: number;
  isToday: boolean;
  daysUntil: number;
}

interface BirthdayNotificationBellProps {
  lastUpdated?: number;
}

export const BirthdayNotificationBell: React.FC<BirthdayNotificationBellProps> = ({
  lastUpdated,
}) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'hoje' | 'proximos' | 'todos'>('hoje');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load clients
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (!user?.id) return;
      try {
        const { data } = await fetchClients(user.id);
        if (isMounted && data) {
          setClients(data);
        }
      } catch (err) {
        console.error('Error fetching clients for birthday bell:', err);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user?.id, lastUpdated]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Compute birthday items
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate(); // 1-31
  const currentYear = now.getFullYear();
  const todayStart = new Date(currentYear, now.getMonth(), currentDay);

  const birthdayList: BirthdayItem[] = [];

  clients.forEach((c) => {
    if (!c.data_nascimento) return;
    const parts = c.data_nascimento.split('-');
    if (parts.length !== 3) return;

    const bYear = parseInt(parts[0], 10);
    const bMonth = parseInt(parts[1], 10);
    const bDay = parseInt(parts[2], 10);

    if (isNaN(bYear) || isNaN(bMonth) || isNaN(bDay)) return;

    const isToday = bMonth === currentMonth && bDay === currentDay;
    const turningAge = currentYear - bYear;

    let targetBday = new Date(currentYear, bMonth - 1, bDay);
    if (targetBday < todayStart) {
      targetBday = new Date(currentYear + 1, bMonth - 1, bDay);
    }

    const diffTime = targetBday.getTime() - todayStart.getTime();
    const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

    birthdayList.push({
      client: c,
      birthDay: bDay,
      birthMonth: bMonth,
      birthYear: bYear,
      formattedDate: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}/${bYear}`,
      turningAge,
      isToday,
      daysUntil,
    });
  });

  // Sort by days until birthday
  birthdayList.sort((a, b) => a.daysUntil - b.daysUntil);

  const todayList = birthdayList.filter((b) => b.isToday);
  const upcomingList = birthdayList.filter((b) => !b.isToday && b.daysUntil <= 15);

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const handleSendGreeting = (client: ClientWithDetails) => {
    sendWhatsAppBirthdayGreeting(client);
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="btn-birthday-notification"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all flex items-center justify-center ${
          isOpen
            ? 'bg-white/20 text-white'
            : todayList.length > 0
            ? 'text-amber-300 hover:text-white hover:bg-white/10'
            : 'text-slate-300 hover:text-white hover:bg-white/10'
        }`}
        title={
          todayList.length > 0
            ? `${todayList.length} cliente(s) fazendo aniversário hoje!`
            : 'Notificações de Aniversário'
        }
        aria-label="Notificações de Aniversário"
      >
        <Bell className="w-5 h-5" />

        {/* Badge for Today's Birthdays */}
        {todayList.length > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-amber-500 text-slate-950 text-[11px] font-black rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50 border-2 border-[#0B1B4A] animate-bounce">
            {todayList.length}
          </span>
        ) : upcomingList.length > 0 ? (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-[#0B1B4A]" />
        ) : null}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[330px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 text-slate-800 z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="bg-[#0B1B4A] text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white leading-tight">
                    Aniversariantes
                  </h3>
                  <p className="text-[11px] text-white/70">
                    Felicitações e lembretes via WhatsApp
                  </p>
                </div>
              </div>

              {todayList.length > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-sm">
                  <PartyPopper className="w-3 h-3" />
                  {todayList.length} Hoje
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-white/10 p-1 rounded-xl mt-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveFilter('hoje')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  activeFilter === 'hoje'
                    ? 'bg-white text-[#0B1B4A] shadow-xs font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Hoje ({todayList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('proximos')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  activeFilter === 'proximos'
                    ? 'bg-white text-[#0B1B4A] shadow-xs font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Próximos ({upcomingList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('todos')}
                className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                  activeFilter === 'todos'
                    ? 'bg-white text-[#0B1B4A] shadow-xs font-bold'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Todos ({birthdayList.length})
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
            {/* Filter: HOJE */}
            {activeFilter === 'hoje' && (
              <>
                {todayList.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Cake className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      Nenhum aniversariante hoje
                    </p>
                    <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
                      Quando um cliente cadastrado fizer aniversário, você verá o alerta aqui!
                    </p>
                  </div>
                ) : (
                  todayList.map((item) => (
                    <div
                      key={item.client.id}
                      className="pt-2.5 first:pt-0 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80 transition-all hover:bg-amber-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900">
                              {item.client.nome}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 text-[10px] font-black rounded-md uppercase tracking-wide">
                              Hoje! 🎂
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {formatPhone(item.client.telefone)}
                          </div>

                          <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1 mt-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            {item.turningAge > 0
                              ? `Completando ${item.turningAge} anos`
                              : `Nascido em ${item.formattedDate}`}
                          </div>
                        </div>

                        {/* WhatsApp Greeting Button */}
                        <button
                          type="button"
                          onClick={() => handleSendGreeting(item.client)}
                          className="px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                          title="Enviar Mensagem de Parabéns no WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
                          <span>Parabenizar</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Filter: PRÓXIMOS */}
            {activeFilter === 'proximos' && (
              <>
                {upcomingList.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      Nenhum nos próximos 15 dias
                    </p>
                    <p className="text-xs text-slate-400">
                      Confira a aba "Todos" para ver todas as datas cadastradas.
                    </p>
                  </div>
                ) : (
                  upcomingList.map((item) => (
                    <div
                      key={item.client.id}
                      className="pt-2.5 first:pt-0 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-800">
                            {item.client.nome}
                          </div>
                          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {formatPhone(item.client.telefone)}
                          </div>
                          <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 mt-1">
                            <Calendar className="w-3 h-3 text-blue-500" />
                            {item.daysUntil === 1
                              ? 'Amanhã'
                              : `Em ${item.daysUntil} dias (${String(item.birthDay).padStart(2, '0')}/${String(item.birthMonth).padStart(2, '0')})`}
                          </div>
                        </div>

                        {/* WhatsApp Action Button */}
                        <button
                          type="button"
                          onClick={() => handleSendGreeting(item.client)}
                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-[#25D366] hover:text-white text-slate-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1 shrink-0"
                          title="Enviar Mensagem no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* Filter: TODOS */}
            {activeFilter === 'todos' && (
              <>
                {birthdayList.length === 0 ? (
                  <div className="py-8 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <User className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      Nenhuma data cadastrada
                    </p>
                    <p className="text-xs text-slate-400">
                      Preencha o campo "Data de Nascimento" ao cadastrar clientes para acompanhar os aniversários.
                    </p>
                  </div>
                ) : (
                  birthdayList.map((item) => (
                    <div
                      key={item.client.id}
                      className="pt-2.5 first:pt-0 p-2.5 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {item.client.nome}
                          </span>
                          {item.isToday && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase">
                              Hoje!
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span>{item.formattedDate}</span>
                          <span>•</span>
                          <span>{formatPhone(item.client.telefone)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendGreeting(item.client)}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-[#25D366] hover:text-white transition-all"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400 font-medium">
              Notificações calculadas automaticamente com base no cadastro de clientes
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
