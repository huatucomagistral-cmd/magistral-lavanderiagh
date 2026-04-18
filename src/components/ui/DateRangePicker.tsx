import { X } from "lucide-react";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onClear: () => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: DateRangePickerProps) {
  const hasDates = startDate || endDate;

  return (
    <div className="flex flex-row gap-2 items-center">
      <div className="relative">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="block w-full sm:w-auto px-3 py-2.5 border border-black/10 rounded-xl leading-5 bg-white/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
          title="Fecha de inicio"
        />
        <label className="absolute -top-2 left-2 bg-white/80 px-1 text-[10px] font-bold text-foreground/50 uppercase tracking-wider backdrop-blur-sm">
          Desde
        </label>
      </div>

      <div className="relative">
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate}
          className="block w-full sm:w-auto px-3 py-2.5 border border-black/10 rounded-xl leading-5 bg-white/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
          title="Fecha de fin"
        />
        <label className="absolute -top-2 left-2 bg-white/80 px-1 text-[10px] font-bold text-foreground/50 uppercase tracking-wider backdrop-blur-sm">
          Hasta
        </label>
      </div>

      {/* Clear button */}
      {hasDates && (
        <button
          type="button"
          onClick={onClear}
          className="p-3 bg-error/10 text-error hover:bg-error/20 active:scale-95 rounded-xl transition-all flex items-center justify-center shrink-0"
          title="Limpiar fechas"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
