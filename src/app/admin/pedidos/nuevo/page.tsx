"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, Minus, CreditCard, DollarSign, PackageSearch, Trash2, Camera, Mic, StopCircle, ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { toast } from "react-hot-toast";
import { searchDNI } from "@/app/actions/reniec";
import { collection, onSnapshot, addDoc, runTransaction, doc, getDoc, getDocs, query, where, setDoc, increment, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export type CatalogItem = {
  id: string;
  name: string;
  price: number;
  type: "KG" | "UNIT";
};

export default function NuevaOrdenPage() {
  const router = useRouter();
  const { isCajaOpen, user } = useStore();

  const [dni, setDni] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isSearchingDNI, setIsSearchingDNI] = useState(false);
  const [cart, setCart] = useState<{ item: CatalogItem, qty: number }[]>([]);
  const [payMethod, setPayMethod] = useState<"EFECTIVO" | "YAPE" | "LUEGO">("EFECTIVO");
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

  // Evidences State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoFiles, setPhotoFiles] = useState<{file: File, preview: string}[]>([]);
  const [audioBlob, setAudioBlob] = useState<{blob: Blob, url: string} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
    if (dni.length !== 8) return toast.error("DNI inválido");
    setIsSearchingDNI(true);

    const result = await searchDNI(dni);
    let tempName = "";
    if (result.success && result.name) {
      tempName = result.name;
    } else {
      toast.error(result.error || "No se encontró el DNI en RENIEC.");
    }

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
    if (existing) {
      // Para KG no incrementamos, el usuario escribe el peso manualmente
      if (item.type === "UNIT") {
        setCart(cart.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
    } else {
      setCart([...cart, { item, qty: item.type === "KG" ? 1 : 1 }]);
    }
  };

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.item.id === id) {
        // Redondear a 2 decimales para evitar errores de punto flotante de JS
        const newQty = Math.max(0, Number((c.qty + delta).toFixed(2)));
        return { ...c, qty: newQty };
      }
      return c;
    }).filter(c => c.qty > 0));
  };

  // Para ítems KG: permite escribir el peso exacto con decimales
  const setQty = (id: string, value: string) => {
    const parsed = parseFloat(value);
    if (value === "" || value === "0") {
      setCart(cart.filter(c => c.item.id !== id));
      return;
    }
    if (!isNaN(parsed) && parsed > 0) {
      setCart(cart.map(c => c.item.id === id ? { ...c, qty: parsed } : c));
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(c => c.item.id !== id));
  };

  // Cálculos de Totales
  const subtotal = cart.reduce((acc, current) => acc + (current.item.price * current.qty), 0);

  // Calcular deducciones (Loyalty)
  let rewardDiscount = 0;
  if (useReward && clientProfile && clientProfile.totalKgAccumulated >= 10) {
    const kgItem = catalogDb.find(c => c.type === "KG");
    if (kgItem) rewardDiscount = kgItem.price;
  }

  // Calcular deducciones (Cupones)
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "PERCENTAGE") {
      couponDiscount = subtotal * (appliedCoupon.value / 100);
    } else {
      couponDiscount = appliedCoupon.value;
    }
  }

  let total = subtotal - rewardDiscount - couponDiscount;
  if (total < 0) total = 0;

  const handleValidateCoupon = async () => {
    if (!couponCode) return;
    if (!user?.storeId) return;
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
    } catch (e) {
      console.error(e);
      toast.error("Error verificando cupón.");
    }
    setIsValidatingCoupon(false);
  };

  // Adicional: Contador Total de Piezas
  const [totalPieces, setTotalPieces] = useState<number | null>(null);

  // Lógica de Evidencias (Fotos y Audio)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Basic compression before storing
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              const preview = URL.createObjectURL(compressedFile);
              setPhotoFiles(prev => [...prev, { file: compressedFile, preview }]);
            }
            setIsCompressing(false);
          }, "image/jpeg", 0.7);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlobLocal = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlobLocal);
        setAudioBlob({ blob: audioBlobLocal, url: audioUrl });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo acceder al micrófono.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteAudio = () => {
    setAudioBlob(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateOrder = async () => {
    if (!isCajaOpen) return toast.error("Debes ABRIR CAJA primero para procesar órdenes.");
    if (cart.length === 0) return toast.error("Agrega servicios a la orden.");
    if (!customerName) return toast.error("Busca o ingresa el nombre del cliente.");

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
        totalPieces: totalPieces || 0,
        payMethod,
        status: "RECIBIDO",
        paymentStatus: payMethod === "LUEGO" ? "UNPAID" : (payMethod === "YAPE" ? "PENDING_VERIFICATION" : "PAID"),
        ...(payMethod === "EFECTIVO" ? { paymentDate: new Date().toISOString() } : {}),
        createdByEmail: user?.email || "Desconocido"
      };

      const docRef = await addDoc(ordersRef, orderData);
      newDocId = docRef.id;

      // Subir evidencias si existen
      const evidencesLinks: { url: string, type: 'image' | 'audio', date: string }[] = [];
      
      // Upload process
      for (let i = 0; i < photoFiles.length; i++) {
        const pf = photoFiles[i];
        const fileName = `photo_${i}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `stores/${user.storeId}/orders/${newDocId}/evidences/${fileName}`);
        await uploadBytes(storageRef, pf.file);
        const url = await getDownloadURL(storageRef);
        evidencesLinks.push({ url, type: 'image', date: new Date().toISOString() });
      }

      if (audioBlob) {
        const ext = audioBlob.blob.type.includes('mp4') ? 'm4a' : 'webm';
        const fileName = `audio_${Date.now()}.${ext}`;
        const storageRef = ref(storage, `stores/${user.storeId}/orders/${newDocId}/evidences/${fileName}`);
        await uploadBytes(storageRef, audioBlob.blob);
        const url = await getDownloadURL(storageRef);
        evidencesLinks.push({ url, type: 'audio', date: new Date().toISOString() });
      }

      if (evidencesLinks.length > 0) {
        await setDoc(docRef, { evidences: evidencesLinks }, { merge: true });
      }

      // Actualizar CRM del Cliente
      if (dni && dni.length === 8 && user?.storeId) {
        const clientRef = doc(db, `stores/${user.storeId}/clients/${dni}`);
        const kgsInThisOrder = cart.filter(c => c.item.type === "KG").reduce((acc, c) => acc + c.qty, 0);
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
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error al guardar la orden en la nube.");
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10" onClick={() => setShowSuggestions(false)}>
      <div className="flex items-center gap-4">
        <Link href="/admin/pedidos" className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nueva Orden</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Columna Izquierda: Cliente & Catálogo */}
        <div className="space-y-6">

          <div className="glass-card p-6 border-l-4 border-l-primary/50 overflow-visible relative z-10" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">1. Datos del Cliente</h2>
            <form onSubmit={handleSearchDNI} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input type="text" maxLength={8} value={dni}
                    onChange={e => {
                      setDni(e.target.value.replace(/[^0-9]/g, ""));
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="DNI" className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center shadow-sm"
                  />
                </div>
                <button type="submit" disabled={isSearchingDNI || dni.length !== 8} className="bg-black/5 hover:bg-black/10 text-foreground font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-50 shrink-0">
                  {isSearchingDNI ? <span className="animate-spin border border-black/30 border-t-black rounded-full w-4 h-4 inline-block" /> : <Search size={18} />}
                </button>
                <input type="text" maxLength={9} value={customerPhone} onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Celular" className="flex-1 min-w-0 bg-white/50 border border-black/10 rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-center shadow-sm"
                />
              </div>

              <div className="relative">
                <input type="text" value={customerName}
                  onChange={e => {
                    setCustomerName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Nombre Completo" className="w-full bg-white/50 border border-black/10 rounded-xl px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />

                {/* Lista Desplegable de Sugerencias */}
                {showSuggestions && (customerName.length > 1 || dni.length > 2) && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-black/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {filteredSuggestions.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full px-4 py-3 text-left hover:bg-primary/10 border-b border-black/5 last:border-0 transition-colors group"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-foreground font-bold text-sm group-hover:text-primary transition-colors">{client.name}</p>
                            <p className="text-foreground/40 text-xs mt-0.5">DNI: {client.dni} • Tel: {client.phone || "---"}</p>
                          </div>
                          <div className="bg-black/5 px-2 py-0.5 rounded text-[10px] text-foreground/40 font-mono">
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
                  <p className="text-foreground/60 text-xs">Kilos Acumulados: <span className="font-bold text-foreground">{clientProfile.totalKgAccumulated} kg</span></p>
                </div>
                {clientProfile.totalKgAccumulated >= 10 && (
                  <button
                    onClick={() => setUseReward(!useReward)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useReward ? "bg-success text-white" : "bg-black/5 text-foreground hover:bg-black/10"}`}
                  >
                    {useReward ? "Recompensa Aplicada ✓" : "🎁 Canjear 1KG Gratis"}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">2. Agregar Servicios</h2>

            {loadingServices ? (
              <div className="flex justify-center p-6"><span className="animate-spin border-4 border-black/10 border-t-primary rounded-full w-8 h-8" /></div>
            ) : catalogDb.length === 0 ? (
              <div className="text-center py-6 text-foreground/50 text-sm">No hay servicios (Agrégalos en Tarifario)</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {catalogDb.map(item => (
                  <button key={item.id} onClick={() => addToCart(item)}
                    className="flex flex-col items-center justify-center p-4 border border-black/10 rounded-xl bg-white/50 hover:bg-white active:scale-95 transition-all group shadow-sm"
                  >
                    <span className="text-foreground/80 font-medium text-sm text-center mb-1 group-hover:text-primary">{item.name}</span>
                    <span className="text-primary font-mono font-bold text-lg">S/ {item.price.toFixed(2)}</span>
                    <span className="text-[10px] text-foreground/40 uppercase bg-black/5 px-2 rounded-full mt-2">x {item.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card p-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">3. Evidencias Opcionales</h2>
            
            <div className="space-y-4">
              {/* Fotos */}
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={fileInputRef} 
                  onChange={handlePhotoCapture} 
                  className="hidden" 
                />
                
                {photoFiles.length === 0 && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-black/20 rounded-xl text-foreground/50 hover:bg-black/5 hover:text-foreground transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isCompressing ? <span className="animate-spin border-2 border-black/30 border-t-black rounded-full w-4 h-4" /> : <Camera size={18} />}
                    {isCompressing ? "Procesando..." : "Tomar/Añadir Foto"}
                  </button>
                )}

                {photoFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photoFiles.map((pf, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-black/10 aspect-square bg-black/5">
                        <img src={pf.preview} alt="evidencia" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-error hover:bg-error hover:text-white transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing || photoFiles.length >= 3}
                      className="flex flex-col items-center justify-center gap-1 border border-dashed border-black/20 rounded-lg text-foreground/50 hover:bg-black/5 transition-all aspect-square disabled:opacity-50"
                    >
                      {isCompressing ? <span className="animate-spin border border-black/30 border-t-black rounded-full w-4 h-4" /> : <Plus size={16} />}
                      <span className="text-[10px]">Añadir</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Audio */}
              <div>
                {!audioBlob ? (
                  !isRecording ? (
                    <button 
                      onClick={startRecording}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-black/10 rounded-xl text-foreground font-medium hover:bg-black/5 transition-all active:scale-95"
                    >
                      <Mic size={18} className="text-primary" />
                      Grabar Nota de Voz
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecording}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-error/10 border border-error/50 rounded-xl text-error font-bold animate-pulse transition-all"
                    >
                      <StopCircle size={18} />
                      Grabando... ({formatTime(recordingTime)}) Detener
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-3 bg-black/5 p-3 rounded-xl border border-black/10">
                    <audio src={audioBlob.url} controls className="flex-1 h-8 max-w-full" />
                    <button onClick={deleteAudio} className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-foreground/40 mt-3 text-center">Estas evidencias se subirán ocultas como uso exclusivo de control y calidad.</p>
          </div>

        </div>

        {/* Columna Derecha: Resumen (Cart) y Pago */}
        <div className="space-y-6">
          <div className="glass-card p-0 overflow-hidden border-primary/20 sticky top-24">
            <div className="bg-white p-4 border-b border-black/5 flex justify-between items-center">
              <h2 className="font-bold text-foreground flex items-center gap-2"><CreditCard size={18} className="text-primary" /> Resumen de Venta</h2>
              <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase">Pre-Ticket</span>
            </div>

            <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto space-y-3">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-foreground/30 py-10">
                  <PackageSearch size={40} className="mb-2 opacity-50" />
                  <p className="text-sm">Agrega servicios para empezar.</p>
                </div>
              ) : (
                cart.map(c => (
                  <div key={c.item.id} className="flex items-center justify-between border-b border-black/5 pb-3">
                    <div className="flex-1">
                      <p className="text-foreground font-medium text-sm mb-1">{c.item.name}</p>

                      {c.item.type === "KG" ? (
                        /* Input de peso exacto para servicios por Kg con botones siempre visibles */
                        <div className="flex items-center bg-black/5 w-fit rounded-lg border border-primary/30 overflow-hidden shadow-sm">
                          <button 
                            type="button"
                            onClick={() => updateQty(c.item.id, -0.1)} 
                            className="p-2 text-primary hover:bg-primary/10 active:scale-95 transition-all outline-none"
                          >
                            <Minus size={14} />
                          </button>
                          
                          <div className="flex items-center px-1 border-x border-primary/20">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={c.qty}
                              onChange={e => setQty(c.item.id, e.target.value)}
                              className="w-12 bg-transparent text-primary font-mono font-bold text-sm text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-1"
                            />
                            <span className="text-foreground/40 text-[9px] font-bold uppercase pr-1">KG</span>
                          </div>

                          <button 
                            type="button"
                            onClick={() => updateQty(c.item.id, 0.1)} 
                            className="p-2 text-primary hover:bg-primary/10 active:scale-95 transition-all outline-none"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        /* Stepper +/- para servicios por unidad */
                        <div className="flex items-center gap-2 bg-black/5 w-fit rounded-lg border border-black/10">
                          <button onClick={() => updateQty(c.item.id, -1)} className="p-1 text-foreground/50 hover:text-foreground"><Minus size={14} /></button>
                          <span className="text-foreground font-mono text-sm w-6 text-center">{c.qty}</span>
                          <button onClick={() => updateQty(c.item.id, 1)} className="p-1 text-foreground/50 hover:text-foreground"><Plus size={14} /></button>
                          <span className="text-foreground/40 text-[10px] pr-2">UNIT</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-foreground font-mono font-bold text-sm">S/ {(c.item.price * c.qty).toFixed(2)}</p>
                        <p className="text-foreground/30 text-[10px]">(S/ {c.item.price.toFixed(2)} c/u)</p>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(c.item.id)}
                        className="p-2 text-error/30 hover:text-error hover:bg-error/10 rounded-lg transition-all active:scale-90"
                        title="Eliminar del resumen"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-black/5 border-t border-b border-black/5 flex flex-col gap-3">
              <div className="flex gap-2 flex-wrap">
                <div className="flex flex-1 gap-2 min-w-[140px]">
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Cupón" className="flex-1 min-w-0 bg-white/50 border border-black/10 text-foreground text-sm px-3 py-1.5 rounded-lg uppercase placeholder:normal-case shadow-sm" />
                  <button onClick={handleValidateCoupon} disabled={isValidatingCoupon || !couponCode} className="bg-black/5 hover:bg-black/10 text-foreground text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shrink-0">Validar</button>
                </div>
                
                {/* Contador de piezas compacto */}
                <div className="flex items-center gap-2 bg-white/50 px-2 py-1 rounded-lg border border-black/10 shadow-sm shrink-0">
                  <PackageSearch size={14} className="text-foreground/50" />
                  <span className="text-[11px] font-bold text-foreground/70 uppercase">Piezas:</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTotalPieces(prev => Math.max(0, (prev || 0) - 1))} className="w-6 h-6 bg-white border border-black/10 rounded flex justify-center items-center hover:bg-black/5 active:scale-95 text-foreground"><Minus size={12} /></button>
                    <input type="number" min="0" placeholder="0" value={totalPieces || ""} onChange={e => setTotalPieces(e.target.value ? parseInt(e.target.value) : null)} className="w-8 bg-transparent text-center font-mono font-bold text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => setTotalPieces(prev => (prev || 0) + 1)} className="w-6 h-6 bg-white border border-black/10 rounded flex justify-center items-center hover:bg-black/5 active:scale-95 text-foreground"><Plus size={12} /></button>
                  </div>
                </div>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between items-center bg-success/10 border border-success/30 px-3 py-2 rounded-lg">
                  <span className="text-success text-xs font-bold flex items-center gap-1">🏷️ {appliedCoupon.code}</span>
                  <button onClick={() => setAppliedCoupon(null)} className="text-success/50 hover:text-success text-xs underline">Quitar</button>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/50 border-t border-black/5">
              <div className="space-y-1 mb-4 border-b border-black/5 pb-4">
                <div className="flex justify-between text-foreground/40 text-sm">
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

              <div className="flex justify-between items-center mb-6">
                <span className="text-foreground/70">Total a Pagar</span>
                <span className="text-3xl font-black text-primary font-mono">S/ {total.toFixed(2)}</span>
              </div>



              <div className="grid grid-cols-2 gap-2 mb-6 text-sm font-bold">
                <button onClick={() => setPayMethod("EFECTIVO")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border ${payMethod === "EFECTIVO" ? "bg-black/10 text-foreground border-black/20" : "bg-transparent text-foreground/50 border-black/5 hover:border-black/10"}`}>
                  <DollarSign size={16} /> Efectivo
                </button>
                <button onClick={() => setPayMethod("YAPE")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border ${payMethod === "YAPE" ? "bg-[#742284]/20 text-[#742284] border-[#742284]/50" : "bg-transparent text-foreground/50 border-black/5 hover:border-[#742284]/30"}`}>
                  Yape / Plin
                </button>
                <button onClick={() => setPayMethod("LUEGO")} className={`py-3 rounded-lg flex justify-center items-center gap-2 transition-colors border col-span-2 ${payMethod === "LUEGO" ? "bg-error/20 text-error border-error/50" : "bg-transparent text-foreground/50 border-black/5 hover:border-error/30"}`}>
                  Pagar al Recoger (Pendiente)
                </button>
              </div>

              {!isCajaOpen && (
                <div className="bg-error/10 border border-error/20 text-error text-center p-3 rounded-xl text-sm font-medium mb-4">
                  La caja registradora está cerrada. Abre turno para cobrar.
                </div>
              )}

              <button onClick={handleCreateOrder} disabled={total === 0 || isSaving || !isCajaOpen}
                className={`w-full ${payMethod === "LUEGO" ? "bg-white border border-black/10 text-foreground" : "bg-primary text-white"} hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all font-extrabold rounded-xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20`}>
                {isSaving ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-5 h-5 mx-auto" /> : (payMethod === "LUEGO" ? "📝 Generar Orden sin Cobrar" : "💰 Terminar y Cobrar")}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
