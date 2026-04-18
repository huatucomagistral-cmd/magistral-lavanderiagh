"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store/useStore";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, Download, Calendar, DollarSign, Loader2, BarChart2, Activity } from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { DateRangePicker } from "@/components/ui/DateRangePicker";

const OrderStatusObj: any = {
  RECIBIDO: "Recibido",
  EN_PROCESO: "En Proceso",
  LISTO: "Listo",
  ENTREGADO: "Entregado",
};

type ReportFilter = "HOY" | "SEMANA" | "MES" | "CUSTOM";

export default function ReportesPage() {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<ReportFilter>("MES");

  // Rango personalizado
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const calculateDateRange = (type: ReportFilter) => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (type === "HOY") {
      // ya seteado
    } else if (type === "SEMANA") {
      start.setDate(start.getDate() - 7);
    } else if (type === "MES") {
      start.setDate(1); // Primer día del mes
    }
    return { start, end };
  };

  const fetchReportData = async () => {
    if (!user?.storeId) return;
    setLoading(true);

    try {
      let start, end;
      if (filterType === "CUSTOM") {
        if (!startDate || !endDate) {
          toast.error("Selecciona fecha de inicio y fin para el filtro personalizado.");
          setLoading(false);
          return;
        }
        start = new Date(`${startDate}T00:00:00-05:00`);
        end = new Date(`${endDate}T23:59:59-05:00`);
      } else {
        const range = calculateDateRange(filterType);
        start = range.start;
        end = range.end;
      }

      const q = query(
        collection(db, `stores/${user.storeId}/orders`),
        where("date", ">=", start.toISOString()),
        where("date", "<=", end.toISOString()),
        orderBy("date", "desc")
      );

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data);
    } catch (e) {
      console.error("Error fetching report data", e);
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar búsqueda al cambiar filtro (excepto CUSTOM que requiere click manual)
  useEffect(() => {
    if (filterType !== "CUSTOM") {
      fetchReportData();
    }
  }, [filterType, user]);


  // ---- CÁLCULOS FINANCIEROS ----
  const ingresosReales = orders.filter(o => o.paymentStatus === 'PAID');

  const totalEfectivo = ingresosReales.filter(o => o.payMethod === 'EFECTIVO').reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalYape = ingresosReales.filter(o => o.payMethod === 'YAPE').reduce((acc, o) => acc + Number(o.total || 0), 0);
  const totalPagado = totalEfectivo + totalYape;

  const totalCuentasCobrar = orders.filter(o => o.paymentStatus !== 'PAID').reduce((acc, o) => acc + Number(o.total || 0), 0);

  // Ranking de Servicios Vendidos
  const getTopServices = () => {
    const services = new Map<string, { qty: number, revenue: number, type: string }>();

    orders.forEach(o => {
      if (o.items && Array.isArray(o.items)) {
        o.items.forEach((c: any) => {
          const name = c.item.name;
          const current = services.get(name) || { qty: 0, revenue: 0, type: c.item.type };
          current.qty += Number(c.qty) || 0;
          current.revenue += (Number(c.qty) || 0) * (Number(c.item.price) || 0);
          services.set(name, current);
        });
      }
    });

    return Array.from(services.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  };
  const topServices = getTopServices();

  // Exportar a Excel usando XLSX
  const handleExportExcel = () => {
    if (orders.length === 0) return toast.error("No hay datos para exportar en este rango.");

    const excelData = orders.map(o => {
      const dateObj = new Date(o.date);
      return {
        "Ticket": o.ticketNumber || o.id.slice(0, 6),
        "Fecha": dateObj.toLocaleDateString(),
        "Hora": dateObj.toLocaleTimeString(),
        "Cliente": o.customerName || "Sin Nombre",
        "DNI": o.customerDni !== "0" ? o.customerDni : "-",
        "Total (S/)": Number(o.total).toFixed(2),
        "Servicios Llevados": o.items?.map((i: any) => `${i.qty}x ${i.item.name}`).join(", ") || "",
        "Estado Entrega": OrderStatusObj[o.status as keyof typeof OrderStatusObj] || o.status,
        "Estado Pago": o.paymentStatus === "PAID" ? "PAGADO" : "DEBE",
        "Método Pago": o.payMethod || "-"
      };
    });

    // Crear el libro y la hoja
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte_Magistral");

    // Anchos de columna agradables
    worksheet["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 10 },
      { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
    ];

    // Exportar el archivo
    XLSX.writeFile(workbook, `Reporte_Magistral_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-500 pb-10">

      {/* Header y Exportar */}
      {/* Header y Exportar */}
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="text-primary w-6 h-6 sm:w-8 sm:h-8" />
            Ganancias
          </h1>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={orders.length === 0}
          className="bg-success hover:bg-success-hover active:scale-95 disabled:opacity-50 text-white font-black rounded-xl p-3 sm:px-4 sm:py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-success/20 shrink-0"
        >
          <Download size={20} />
          <span className="hidden sm:inline">Descargar</span>
        </button>
      </div>

      {/* Controladores de Filtro */}
      <div className="glass-card p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">

          <div className="flex bg-white/40 p-1 rounded-xl border border-black/5 w-full md:w-auto overflow-x-auto">
            {["HOY", "SEMANA", "MES", "CUSTOM"].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilterType(f as ReportFilter);
                  if (f !== "CUSTOM") {
                    setStartDate("");
                    setEndDate("");
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filterType === f ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground hover:bg-black/5'}`}
              >
                {f === "CUSTOM" ? "Personalizado" : f}
              </button>
            ))}
          </div>

          {filterType === "CUSTOM" && (
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              />
              <button
                onClick={fetchReportData}
                disabled={!startDate || !endDate || loading}
                className="bg-primary px-6 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 hover:bg-primary-hover transition-colors w-full sm:w-auto tracking-widest"
              >
                FILTRAR
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-foreground/40">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p>Calculando reportes y leyendo base de datos...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Tarjetas Financieras */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-t-4 border-t-success flex flex-col gap-2 bg-white/60">
              <span className="text-sm font-medium text-foreground/50">Total Real Ingresado (Pagado)</span>
              <h3 className="text-4xl font-black text-foreground">S/ {totalPagado.toFixed(2)}</h3>
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/5 text-xs font-medium">
                <span className="text-white/70">Efectivo: <b className="text-white">S/ {totalEfectivo.toFixed(2)}</b></span>
                <span className="text-[#742284] px-2 py-0.5 rounded bg-[#742284]/10">Yape: <b>S/ {totalYape.toFixed(2)}</b></span>
              </div>
            </div>

            <div className="glass-card p-6 border-t-4 border-t-error flex flex-col gap-2 bg-white/60">
              <span className="text-sm font-medium text-foreground/50">Cuentas por Cobrar (Deuda)</span>
              <h3 className="text-4xl font-black text-error">S/ {totalCuentasCobrar.toFixed(2)}</h3>
              <p className="text-xs text-foreground/40 mt-auto">Dinero bloqueado en órdenes pendientes de pago.</p>
            </div>

            <div className="glass-card p-6 border-t-4 border-t-primary flex flex-col gap-2 bg-white/60">
              <span className="text-sm font-medium text-foreground/50">Volumen Operativo</span>
              <h3 className="text-4xl font-black text-foreground">{orders.length}</h3>
              <p className="text-xs text-foreground/40 mt-auto">Órdenes gestionadas en este rango de tiempo.</p>
            </div>
          </div>

          {/* Ranking de Servicios */}
          <div className="glass-card p-6 bg-white/60">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart2 className="text-primary" /> Servicios Más Vendidos
            </h2>

            {topServices.length === 0 ? (
              <div className="text-center py-8 text-foreground/30 text-sm italic">
                No hay ventas registradas en este periodo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-black/5 text-xs font-bold text-foreground/50 uppercase">
                      <th className="pb-3 pl-2">Servicio</th>
                      <th className="pb-3 text-center">Tipo</th>
                      <th className="pb-3 text-right">Cantidad Vendida</th>
                      <th className="pb-3 text-right pr-2">Ingreso Generado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {topServices.map((srv, i) => (
                      <tr key={i} className="hover:bg-black/5">
                        <td className="py-3 pl-2 text-sm font-medium text-foreground">{srv.name}</td>
                        <td className="py-3 text-center text-[10px] text-foreground/40 uppercase tracking-widest">{srv.type}</td>
                        <td className="py-3 text-right font-mono text-sm text-foreground/80">{srv.qty} <span className="text-[10px] text-foreground/30">{srv.type === 'KG' ? 'Kilos' : 'Unids'}</span></td>
                        <td className="py-3 text-right pr-2 font-mono font-bold text-primary">S/ {srv.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
