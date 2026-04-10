import { Calendar, X } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Desde */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-foreground/40" />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="block w-full sm:w-auto pl-9 pr-3 py-3 border border-black/10 rounded-xl leading-5 bg-white/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
          title="Fecha de inicio"
        />
        <label className="absolute -top-2 left-2 bg-white/80 px-1 text-[10px] font-bold text-foreground/50 uppercase tracking-wider backdrop-blur-sm">
          Desde
        </label>
      </div>

      {/* Hasta */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-foreground/40" />
        </div>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate} // No se puede seleccionar una fecha final menor a la inicial
          className="block w-full sm:w-auto pl-9 pr-3 py-3 border border-black/10 rounded-xl leading-5 bg-white/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
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
