"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Minus, CreditCard, DollarSign, PackageSearch, Award } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { searchDNI } from "@/app/actions/reniec";
import { collection, onSnapshot, addDoc, runTransaction, doc, getDoc, getDocs, query, where, setDoc, increment, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  type: "KG" | "UNIT";
};

export default function NuevoPedidoPage() {
  const router = useRouter();
  const { isCajaOpen, user } = useStore();
  
  const [dni, setDni] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSearchingDNI, setIsSearchingDNI] = useState(false);
  const [cart, setCart] = useState<{item: CatalogItem, qty: number}[]>([]);
  const [payMethod, setPayMethod] = useState<"EFECTIVO" | "YAPE" | "TRANSFERENCIA" | "LUEGO">("EFECTIVO");
  const [isSaving, setIsSaving] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [catalogDb, setCatalogDb] = useState<CatalogItem[]>([]);

  // CRM & Rewards State
  const [clientProfile, setClientProfile] = useState<{ dni: string, name: string, phone: string, totalKgAccumulated: number } | null>(null);
  const [useReward, setUseReward] = useState(false);
  
  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, type: string, value: number } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Autocomplete State
  const [allClients, setAllClients] = useState<{ id: string, dni: string, name: string, phone: string, totalKgAccumulated: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Escuchar Servicios Reales de Firebase
  useEffect(() => {
    if (!user?.storeId) return;
    const unsub = onSnapshot(collection(db, `stores/${user.storeId}/services`), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as CatalogItem[];
      setCatalogDb(data);
      setLoadingServices(false);
    });
    return () => unsub();
  }, [user]);

  // Cargar Clientes para Autocomplete
  useEffect(() => {
    if (!user?.storeId) return;
    const q = query(collection(db, `stores/${user.storeId}/clients`), orderBy("name", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setAllClients(data);
    });
    return () => unsub();
  }, [user]);

  const selectClient = (client: any) => {
    setDni(client.dni || "");
    setCustomerName(client.name || "");
    setCustomerPhone(client.phone || "");
    setClientProfile({ 
      dni: client.dni, 
      name: client.name, 
      phone: client.phone, 
      totalKgAccumulated: client.totalKgAccumulated || 0 
    });
    setShowSuggestions(false);
    setUseReward(false);
  };

  const filteredSuggestions = allClients.filter(c => {
    const nameMatch = (c.name || "").toLowerCase().includes(customerName.toLowerCase());
    const dniMatch = (c.dni || "").includes(dni);
    return nameMatch && dniMatch;
  }).slice(0, 5);

  const handleSearchDNI = async (e: React.FormEvent) => {
    e.preventDefault();
    if(dni.length !== 8) return toast.error("DNI inválido");
    setIsSearchingDNI(true);
    
    // Consulta real a la API mediante Server Action (seguro)
    const result = await searchDNI(dni);
    let tempName = "";
    if (result.success && result.name) {
      tempName = result.name;
    } else {
      toast.error(result.error || "No se encontró el DNI en RENIEC.");
    }

    // CRM: Buscar si el cliente ya existe en nuestra DB Local
    if (user?.storeId) {
      const clientRef = doc(db, `stores/${user.storeId}/clients/${dni}`);
      const clientSnap = await getDoc(clientRef);
      if (clientSnap.exists()) {
        const cData = clientSnap.data();
        setClientProfile({ dni, name: cData.name, phone: cData.phone, totalKgAccumulated: cData.totalKgAccumulated || 0 });
        setCustomerName(cData.name || tempName);
        if (cData.phone) setCustomerPhone(cData.phone);
      } else {
        setCustomerName(tempName);
        setClientProfile(null);
      }
    } else {
       setCustomerName(tempName);
    }
    
    setIsSearchingDNI(false);
    setShowSuggestions(false);
  };

  const addToCart = (item: CatalogItem) => {
    const existing = cart.find(c => c.item.id === item.id);
    if(existing) {
      setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { item, qty: 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if(c.item.id === id) {
        return { ...c, qty: Math.max(0, c.qty + delta) };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  // Cálculos de Totales
  const subtotal = cart.reduce((acc, current) => acc + (current.item.price * current.qty), 0);
  
  // Calcular deducciones (Loyalty)
  let rewardDiscount = 0;
  if (useReward && clientProfile && clientProfile.totalKgAccumulated >= 10) {
     const kgItem = catalogDb.find(c => c.type === 'KG');
     if (kgItem) rewardDiscount = kgItem.price;
  }

  // Calcular deducciones (Cupones)
  let couponDiscount = 0;
  if (appliedCoupon) {
     if (appliedCoupon.type === 'PERCENTAGE') {
        couponDiscount = subtotal * (appliedCoupon.value / 100);
     } else {
        couponDiscount = appliedCoupon.value;
     }
  }

  let total = subtotal - rewardDiscount - couponDiscount;
  if (total < 0) total = 0;

  const handleValidateCoupon = async () => {
     if(!couponCode) return;
     if(!user?.storeId) return;
     setIsValidatingCoupon(true);
     try {
       const q = query(collection(db, `stores/${user.storeId}/coupons`), where("code", "==", couponCode.trim().toUpperCase()), where("isActive", "==", true));
       const snap = await getDocs(q);
       if (snap.empty) {
         toast.error("Cupón inválido, expirado o no existe.");
         setAppliedCoupon(null);
       } else {
         const data = snap.docs[0].data();
         setAppliedCoupon({ code: data.code, type: data.type, value: data.discount });
       }
     } catch(e) {
       console.error(e);
       toast.error("Error verificando cupón.");
     }
     setIsValidatingCoupon(false);
  };

  const handleCreateOrder = async () => {
    if(!isCajaOpen) return toast.error("Debes ABRIR CAJA primero para procesar pedidos.");
    if(cart.length === 0) return toast.error("Agrega servicios al pedido.");
    if(!customerName) return toast.error("Busca o ingresa el nombre del cliente.");

    setIsSaving(true);
    try {
      if (!user?.storeId) throw new Error("Store ID missing");
      const counterRef = doc(db, `stores/${user.storeId}/meta/counters`);
      const ordersRef = collection(db, `stores/${user.storeId}/orders`);

      let ticketNumber = "";
      let newDocId = "";

      const now = new Date();
      const yy = String(now.getFullYear()).slice(2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yy}${mm}${dd}`;

      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        let dailyCount = 1;
        if (counterSnap.exists()) {
          const data = counterSnap.data();
          const lastDate = data.lastDate ?? "";
          const currentDailyCount = data.dailyCount ?? 0;
          if (lastDate === todayStr) {
            dailyCount = currentDailyCount + 1;
          } else {
            dailyCount = 1;
          }
        }
        ticketNumber = `${todayStr}-${String(dailyCount).padStart(3, "0")}`;
        transaction.set(counterRef, { 
          lastDate: todayStr, 
          dailyCount,
          ordersCount: (counterSnap.exists() ? (counterSnap.data().ordersCount ?? 0) : 0) + 1
        }, { merge: true });
      });

      const orderData = {
        ticketNumber,
        customerName,
        customerDni: dni || "0",
        customerPhone,
        date: new Date().toISOString(),
        items: cart,
        subtotal,
        discountReward: rewardDiscount,
        discountCoupon: couponDiscount,
        appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
        total,
        payMethod,
        status: "RECIBIDO",
        paymentStatus: payMethod === "LUEGO" ? "UNPAID" : (payMethod === "YAPE" ? "PENDING_VERIFICATION" : "PAID"),
        ...(payMethod === "EFECTIVO" ? { paymentDate: new Date().toISOString() } : {}),
        createdByEmail: user?.email || "Desconocido"
      };

      const docRef = await addDoc(ordersRef, orderData);
      newDocId = docRef.id;

      // Actualizar CRM del Cliente
      if (dni && dni.length === 8 && user?.storeId) {
         const clientRef = doc(db, `stores/${user.storeId}/clients/${dni}`);
         const kgsInThisOrder = cart.filter(c => c.item.type === 'KG').reduce((acc, c) => acc + c.qty, 0);
         const kgsSpent = useReward ? 10 : 0;
         const netKgsChange = kgsInThisOrder - kgsSpent;

         if (clientProfile) {
            await setDoc(clientRef, {
               name: customerName,
               phone: customerPhone,
               totalKgAccumulated: increment(netKgsChange)
            }, { merge: true });
         } else {
            await setDoc(clientRef, {
               dni,
               name: customerName,
               phone: customerPhone,
               totalKgAccumulated: netKgsChange
            }, { merge: true });
         }
      }

      router.push(`/admin/pedidos/ticket/${newDocId}`);
    } catch(err) {
      console.error(err);
      toast.error("Ocurrió un error al guardar el pedido en la nube.");
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" onClick={() => setShowSuggestions(false)}>
      <div className="flex items-center gap-4">
        <Link href="/admin/pedidos" className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nuevo Pedido</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Columna Izquierda: Cliente & Catálogo */}
        <div className="space-y-6">
          
          <div className="glass-card p-6 border-l-4 border-l-primary/50 overflow-visible relative z-10" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">1. Datos del Cliente</h2>
            <form onSubmit={handleSearchDNI} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input type="text" maxLength={8} value={dni} 
                    onChange={e => {
                      setDni(e.target.value.replace(/[^0-9]/g, ''));
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="DNI" className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center"
                  />
                </div>
                <button type="submit" disabled={isSearchingDNI || dni.length !== 8} className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shrink-0">
                   {isSearchingDNI ? <span className="animate-spin border border-white/30 border-t-white rounded-full w-4 h-4 inline-block" /> : <Search size={18} />}
                </button>
                <input type="text" maxLength={9} value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Celular" className="flex-1 min-w-0 bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center"
                />
              </div>
              
              <div className="relative">
                <input type="text" value={customerName} 
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Nombre Completo" className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
                
                {/* Lista Desplegable de Sugerencias */}
                {showSuggestions && (customerName.length > 1 || dni.length > 2) && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {filteredSuggestions.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-white/5 last:border-0 transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-white font-bold text-sm group-hover:text-primary transition-colors">{client.name}</p>
                            <p className="text-white/40 text-xs mt-0.5">DNI: {client.dni} • Tel: {client.phone || "---"}</p>
                          </div>
                          <div className="bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/40 font-mono">
                            {client.totalKgAccumulated || 0} KG
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </form>
            
            {clientProfile && (
              <div className="mt-4 bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between animate-in zoom-in duration-300">
                 <div>
                   <p className="text-primary font-bold text-sm flex items-center gap-1">🎟️ Perfil de Fidelidad</p>
                   <p className="text-white/60 text-xs">Kilos Acumulados: <span className="font-bold text-white">{clientProfile.totalKgAccumulated} kg</span></p>
                 </div>
                 {clientProfile.totalKgAccumulated >= 10 && (
                   <button 
                     onClick={() => setUseReward(!useReward)}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useReward ? 'bg-success text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                   >
                     {useReward ? "Recompensa Aplicada ✓" : "🎁 Canjear 1KG Gratis"}
                   </button>
                 )}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">2. Agregar Servicios</h2>
            
            {loadingServices ? (
               <div className="flex justify-center p-6"><span className="animate-spin border-4 border-white/20 border-t-primary rounded-full w-8 h-8"/></div>
            ) : catalogDb.length === 0 ? (
               <div className="text-center py-6 text-white/50 text-sm">No hay servicios (Agrégalos en Tarifario)</div>
            ) : (
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catalogDb.map(item => (
                    <button key={item.id} onClick={() => addToCart(item)}
                      className="flex flex-col items-center justify-center p-4 border border-white/10 rounded-xl bg-surface hover:bg-white/5 active:scale-95 transition-all group"
                    >
                       <span className="text-white/80 font-medium text-sm text-center mb-1 group-hover:text-white">{item.name}</span>
                       <span className="text-primary font-mono font-bold text-lg">S/ {item.price.toFixed(2)}</span>
                       <span className="text-[10px] text-white/40 uppercase bg-white/5 px-2 rounded-full mt-2">x {item.type}</span>
                    </button>
                  ))}
               </div>
            )}
          </div>

        </div>

        {/* Columna Derecha: Resumen (Cart) y Pago */}
        <div className="space-y-6">
          <div className="glass-card p-0 overflow-hidden border-primary/20 sticky top-24">
             <div className="bg-surface p-4 border-b border-white/5 flex justify-between items-center">
               <h2 className="font-bold text-white flex items-center gap-2"><CreditCard size={18} className="text-primary"/> Resumen de Venta</h2>
               <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">Pre-Ticket</span>
             </div>

             <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/30 py-10">
                     <PackageSearch size={40} className="mb-2 opacity-50"/>
                     <p className="text-sm">Agrega servicios para empezar.</p>
                  </div>
                ) : (
                  cart.map(c => (
                    <div key={c.item.id} className="flex items-center justify-between border-b border-white/5 pb-3">
                       <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-1">{c.item.name}</p>
                          <div className="flex items-center gap-2 bg-[#18181b] w-fit rounded-lg border border-white/10">
                            <button onClick={() => updateQty(c.item.id, -1)} className="p-1 text-white/50 hover:text-white"><Minus size={14}/></button>
                            <span className="text-white font-mono text-sm w-6 text-center">{c.qty}</span>
                            <button onClick={() => updateQty(c.item.id, 1)} className="p-1 text-white/50 hover:text-white"><Plus size={14}/></button>
                            <span className="text-white/40 text-[10px] pr-2">{c.item.type}</span>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-white font-mono font-bold text-sm">S/ {(c.item.price * c.qty).toFixed(2)}</p>
                          <p className="text-white/30 text-[10px]">(S/ {c.item.price.toFixed(2)} c/u)</p>
                       </div>
                    </div>
                  ))
                )}
             </div>

             <div className="p-4 bg-[#18181b] border-t border-b border-white/5 space-y-3">
               <div className="flex gap-2">
                 <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Código de Cupón" className="flex-1 bg-background border border-white/10 text-white text-sm px-3 py-2 rounded-lg uppercase placeholder:normal-case"/>
                 <button onClick={handleValidateCoupon} disabled={isValidatingCoupon || !couponCode} className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">Validar</button>
               </div>
               
               {appliedCoupon && (
                 <div className="flex justify-between items-center bg-success/10 border border-success/30 px-3 py-2 rounded-lg">
                    <span className="text-success text-xs font-bold flex items-center gap-1">🏷️ {appliedCoupon.code}</span>
                    <button onClick={() => setAppliedCoupon(null)} className="text-success/50 hover:text-success text-xs underline">Quitar</button>
                 </div>
               )}
             </div>

             <div className="p-4 bg-background/50 border-t border-white/5">
                <div className="space-y-1 mb-4 border-b border-white/10 pb-4">
                  <div className="flex justify-between text-white/50 text-sm">
                     <span>Subtotal</span>
                     <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  {useReward && (
                    <div className="flex justify-between text-success text-sm font-bold">
                       <span>Recompensa (1KG Gratis)</span>
                       <span>- S/ {rewardDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-success text-sm font-bold">
                       <span>Cupón ({appliedCoupon.code})</span>
                       <span>- S/ {couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/70">Total a Pagar</span>
                  <span className="text-3xl font-black text-primary font-mono">S/ {total.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6 text-sm font-bold">
                   <button onClick={() => setPayMethod("EFECTIVO")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border ${payMethod === "EFECTIVO" ? 'bg-white/10 text-white border-white/20' : 'bg-transparent text-white/50 border-white/5 hover:border-white/10'}`}>
                     <DollarSign size={16}/> Efectivo
                   </button>
                   <button onClick={() => setPayMethod("YAPE")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border ${payMethod === "YAPE" ? 'bg-[#742284]/20 text-white border-[#742284]/50' : 'bg-transparent text-white/50 border-white/5 hover:border-[#742284]/30'}`}>
                     Yape / Plin
                   </button>
                   <button onClick={() => setPayMethod("LUEGO")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border col-span-2 ${payMethod === "LUEGO" ? 'bg-error/20 text-error border-error/50' : 'bg-transparent text-white/50 border-white/5 hover:border-error/30'}`}>
                     Pagar al Recoger (Pendiente)
                   </button>
                </div>

                {!isCajaOpen && (
                  <div className="bg-error/10 border border-error/20 text-error text-center p-3 rounded-xl text-sm font-medium mb-4">
                    La caja registradora está cerrada. Abre turno para cobrar.
                  </div>
                )}

                <button onClick={handleCreateOrder} disabled={total === 0 || isSaving || !isCajaOpen} 
                  className={`w-full ${payMethod === 'LUEGO' ? 'bg-surface border border-white/10' : 'bg-primary'} hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all text-white font-extrabold rounded-xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20`}>
                  {isSaving ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5 mx-auto"/> : (payMethod === 'LUEGO' ? "📝 Generar Orden sin Cobrar" : "💰 Terminar y Cobrar")}
                </button>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
