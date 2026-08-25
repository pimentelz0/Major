import React, { useState } from 'react';
import {
  Check,
  X,
  Pencil,
  ClipboardCheck,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { DEFAULT_CHECKLIST_ITEMS, type DeviceChecklist } from '../types';

interface ChecklistEditorProps {
  checklist: DeviceChecklist;
  onChange: (updated: DeviceChecklist) => void;
  readOnly?: boolean;
}

export const ChecklistEditor: React.FC<ChecklistEditorProps> = ({
  checklist,
  onChange,
  readOnly = false,
}) => {
  // Track which item has the observation input open
  const [openObsItems, setOpenObsItems] = useState<Record<string, boolean>>({});

  const toggleStatus = (item: string, targetStatus: 'ok' | 'nok') => {
    if (readOnly) return;
    const current = checklist[item]?.status;
    const newStatus = current === targetStatus ? null : targetStatus;
    
    onChange({
      ...checklist,
      [item]: {
        ...checklist[item],
        status: newStatus,
      },
    });

    // If marked as NOK and obs is empty, automatically open obs input to encourage noting the defect
    if (newStatus === 'nok' && !openObsItems[item]) {
      setOpenObsItems((prev) => ({ ...prev, [item]: true }));
    }
  };

  const handleObsChange = (item: string, obsText: string) => {
    if (readOnly) return;
    onChange({
      ...checklist,
      [item]: {
        ...checklist[item],
        obs: obsText,
      },
    });
  };

  const toggleObsInput = (item: string) => {
    setOpenObsItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleMarkAllOk = () => {
    if (readOnly) return;
    const newChecklist: DeviceChecklist = { ...checklist };
    DEFAULT_CHECKLIST_ITEMS.forEach((item) => {
      newChecklist[item] = {
        status: 'ok',
        obs: newChecklist[item]?.obs || '',
      };
    });
    onChange(newChecklist);
  };

  const handleClearAll = () => {
    if (readOnly) return;
    onChange({});
    setOpenObsItems({});
  };

  // Compute counts
  const totalItems = DEFAULT_CHECKLIST_ITEMS.length;
  let okCount = 0;
  let nokCount = 0;
  let obsCount = 0;

  DEFAULT_CHECKLIST_ITEMS.forEach((item) => {
    const itemData = checklist[item];
    if (itemData?.status === 'ok') okCount++;
    if (itemData?.status === 'nok') nokCount++;
    if (itemData?.obs?.trim()) obsCount++;
  });

  return (
    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-3">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0B1B4A] text-white flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0B1B4A] block leading-tight">
              Checklist de Testes do Aparelho
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Avaliação de componentes e funcionamento
            </span>
          </div>
        </div>

        {/* Action buttons (Tudo OK / Limpar) */}
        {!readOnly && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleMarkAllOk}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tudo OK ✅</span>
            </button>
            {(okCount > 0 || nokCount > 0 || obsCount > 0) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium transition-colors"
                title="Limpar checklist"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary indicators */}
      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 overflow-x-auto pb-0.5">
        <span className="bg-slate-200/80 px-2 py-0.5 rounded-md text-slate-700 whitespace-nowrap">
          {totalItems} Itens
        </span>
        {okCount > 0 && (
          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap">
            <Check className="w-3 h-3 text-emerald-600" />
            {okCount} OK
          </span>
        )}
        {nokCount > 0 && (
          <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap font-bold">
            <X className="w-3 h-3 text-rose-600" />
            {nokCount} Defeito(s)
          </span>
        )}
        {obsCount > 0 && (
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap">
            <Pencil className="w-3 h-3 text-amber-700" />
            {obsCount} Obs
          </span>
        )}
      </div>

      {/* Checklist Items Grid: Simple, subtle, responsive 2 columns on sm+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {DEFAULT_CHECKLIST_ITEMS.map((item) => {
          const itemState = checklist[item] || {};
          const status = itemState.status;
          const obs = itemState.obs || '';
          const isObsOpen = openObsItems[item] || Boolean(obs.trim());
          const hasObs = Boolean(obs.trim());

          const isOk = status === 'ok';
          const isNok = status === 'nok';

          return (
            <div
              key={item}
              className={`p-2.5 rounded-xl border transition-all ${
                isNok
                  ? 'bg-rose-50/70 border-rose-200/80 shadow-2xs'
                  : isOk
                  ? 'bg-emerald-50/40 border-emerald-200/60'
                  : hasObs
                  ? 'bg-amber-50/40 border-amber-200/60'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Row with Item Name and Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold select-none truncate ${
                    isNok
                      ? 'text-rose-900 font-bold'
                      : isOk
                      ? 'text-emerald-900 font-semibold'
                      : 'text-slate-700'
                  }`}
                >
                  {item}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Button OK (✅) */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggleStatus(item, 'ok')}
                    title="Funcionando / OK"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all active:scale-90 ${
                      isOk
                        ? 'bg-emerald-600 text-white font-black shadow-sm scale-105 ring-2 ring-emerald-400/40'
                        : 'bg-slate-100 hover:bg-emerald-100 text-slate-400 hover:text-emerald-700'
                    } ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <Check className={`w-3.5 h-3.5 stroke-[3] ${isOk ? 'text-white' : ''}`} />
                  </button>

                  {/* Button Defect (❌) */}
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => toggleStatus(item, 'nok')}
                    title="Com Defeito / Avariado"
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all active:scale-90 ${
                      isNok
                        ? 'bg-rose-600 text-white font-black shadow-sm scale-105 ring-2 ring-rose-400/40'
                        : 'bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-700'
                    } ${readOnly ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <X className={`w-3.5 h-3.5 stroke-[3] ${isNok ? 'text-white' : ''}`} />
                  </button>

                  {/* Button Observation (✏️) */}
                  <button
                    type="button"
                    onClick={() => toggleObsInput(item)}
                    title={hasObs ? `Obs: ${obs}` : 'Adicionar observação'}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all relative ${
                      hasObs
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : isObsOpen
                        ? 'bg-[#0B1B4A] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {hasObs && !isObsOpen && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-600 ring-2 ring-white" />
                    )}
                  </button>
                </div>
              </div>

              {/* Observation Input (Expands inline upon clicking pencil or if text exists) */}
              {isObsOpen && (
                <div className="mt-2 pt-1.5 border-t border-slate-200/60 animate-fadeIn">
                  {readOnly ? (
                    <p className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200 font-medium">
                      <strong>Obs:</strong> {obs || 'Nenhuma observação'}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        autoFocus={!obs}
                        placeholder={`Obs sobre ${item} (ex: trinco, falhando, etc)...`}
                        value={obs}
                        onChange={(e) => handleObsChange(item, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-[11px] rounded-lg border border-slate-300 focus:border-[#0B1B4A] focus:ring-1 focus:ring-[#0B1B4A]/20 outline-none bg-white text-slate-800 font-medium shadow-2xs"
                      />
                      {obs && (
                        <button
                          type="button"
                          onClick={() => handleObsChange(item, '')}
                          title="Limpar observação"
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
