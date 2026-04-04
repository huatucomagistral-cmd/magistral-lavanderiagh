"use client";

import { useState, useEffect, useRef } from "react";
import { Ticket, Trash2, Plus, QrCode, Download, Tag, Zap } from "lucide-react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import { useStore } from "@/store/useStore";

type CouponType = "PERCENTAGE" | "FIXED";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  type: CouponType;
  isActive: boolean;
  createdAt: string;
}

export default function MarketingPage() {
  const { user } = useStore();

  // --- Cupones ---
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newVal, setNewVal] = useState("10");
  const [newType, setNewType] = useState<CouponType>("PERCENTAGE");
  const [isAdding, setIsAdding] = useState(false);

  // --- QR ---
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [storeName, setStoreName] = useState("");
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://magistral.app";
  const qrUrl = `${siteUrl}/${slug}`;
  const qrRef = useRef<SVGSVGElement>(null);

  // Listener de cupones + fetch de config de tienda (slug, color)
  useEffect(() => {
    if (!user?.storeId) return;

    const unsub = onSnapshot(collection(db, `stores/${user.storeId}/coupons`), (snap) => {
      setCoupons(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Coupon)));
    });

    const fetchStore = async () => {
      const snap = await getDoc(doc(db, "stores", user.storeId));
      if (snap.exists()) {
        const data = snap.data();
        setSlug(data.slug || "");
        setColor(data.color || "#3b82f6");
        setStoreName(data.storeName || "");
      }
    };
    fetchStore();

    return () => unsub();
  }, [user?.storeId]);

  const handleAddCoupon = async () => {
    if (!newCode || !user?.storeId) return;
    setIsAdding(true);
    try {
      await addDoc(collection(db, `stores/${user.storeId}/coupons`), {
        code: newCode.trim().toUpperCase(),
        discount: Number(newVal),
        type: newType,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      setNewCode("");
      setNewVal("10");
    } catch {
      alert("Error creando cupón");
    }
    setIsAdding(false);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!user?.storeId || !confirm("¿Seguro que deseas eliminar este cupón?")) return;
    await deleteDoc(doc(db, `stores/${user.storeId}/coupons`, id));
  };

  // Descargar QR como SVG
  const handleDownloadQR = () => {
    const svg = document.getElementById("store-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${slug || "tienda"}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap size={28} className="text-primary" /> Marketing & Growth
        </h1>
        <p className="text-white/60">Gestiona tus cupones de descuento y el QR de vitrina para captar clientes.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">

        {/* ─── CUPONES (col-span 3) ─── */}
        <div className="xl:col-span-3 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <Ticket size={20} className="text-primary" /> Cupones de Descuento
            </h2>
            <p className="text-sm text-white/50 mb-6">
              Crea códigos promocionales para campañas de retención o bienvenida.
            </p>

            {/* Formulario nuevo cupón */}
            <div className="space-y-2 mb-6">
              {/* Fila 1: Código (ancho completo) */}
              <input
                type="text"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="CÓDIGO (ej. VERANO24)"
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {/* Fila 2: Tipo + Valor + Botón */}
              <div className="flex gap-2">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as CouponType)}
                  className="flex-1 bg-background border border-white/10 rounded-xl px-3 py-2.5 text-white min-w-0"
                >
                  <option value="PERCENTAGE">% Porcentaje</option>
                  <option value="FIXED">S/ Monto fijo</option>
                </select>
                <input
                  type="number"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  placeholder="Valor"
                  className="w-20 shrink-0 bg-background border border-white/10 rounded-xl px-3 py-2.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleAddCoupon}
                  disabled={isAdding || !newCode}
                  className="shrink-0 bg-primary hover:bg-primary-hover active:scale-95 text-white font-bold disabled:opacity-50 px-5 rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={18} /> Crear
                </button>
              </div>
            </div>

            {/* Lista de cupones */}
            {coupons.length === 0 ? (
              <div className="text-center py-12 bg-white/3 rounded-2xl border border-dashed border-white/10">
                <Tag size={32} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No hay cupones activos aún.</p>
                <p className="text-white/25 text-xs mt-1">Crea tu primer cupón arriba para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between bg-white/5 border border-white/5 hover:border-white/10 rounded-xl px-4 py-3 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Ticket size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white tracking-wider">{c.code}</p>
                        <p className="text-xs text-white/40 uppercase mt-0.5">
                          {c.type === "PERCENTAGE"
                            ? `${c.discount}% de descuento`
                            : `S/ ${c.discount.toFixed(2)} de descuento`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCoupon(c.id)}
                      className="w-8 h-8 rounded-lg bg-transparent text-white/20 hover:bg-error/10 hover:text-error flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tip de estrategia */}
          <div className="glass-card p-6 border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
            <h3 className="font-bold text-white mb-2 flex items-center gap-2">💡 Estrategia Recomendada</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Crea el cupón <span className="font-mono font-bold text-primary">BIENVENIDO20</span> con un 20% de descuento y
              compártelo en tu WhatsApp al momento de entregar el ticket al cliente. Según métricas de la industria,
              los clientes que usan un cupón en su primera visita tienen <strong className="text-white">3× más probabilidades</strong> de regresar.
            </p>
          </div>
        </div>

        {/* ─── QR DE VITRINA (col-span 2) ─── */}
        <div className="xl:col-span-2">
          <div className="glass-card p-6 flex flex-col items-center text-center sticky top-24">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <QrCode size={20} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">QR de Vitrina</h2>
            <p className="text-xs text-white/50 mb-6 max-w-[240px]">
              Imprime este código y ponlo en tu mostrador. Tus clientes lo escanearán para ver el tarifario y calcular su precio.
            </p>

            {slug ? (
              <>
                <div className="bg-white p-5 rounded-2xl shadow-2xl mb-4">
                  <QRCodeSVG
                    id="store-qr-svg"
                    value={qrUrl}
                    size={180}
                    fgColor={color}
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] text-white/25 font-mono break-all mb-6">{qrUrl}</p>
                <button
                  onClick={handleDownloadQR}
                  className="bg-primary hover:bg-primary-hover active:scale-95 transition-all text-white font-bold rounded-xl px-6 py-3 flex items-center gap-2 w-full justify-center"
                >
                  <Download size={16} /> Descargar SVG
                </button>
                <p className="text-[10px] text-white/30 mt-3">
                  El SVG es perfecto para imprimir en cualquier tamaño sin pérdida de calidad.
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-white/40">
                  Configura el <strong className="text-white">Slug de tu tienda</strong> en la sección de{" "}
                  <span className="text-primary">Configuración</span> para generar el QR.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
