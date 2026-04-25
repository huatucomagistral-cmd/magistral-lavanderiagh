import { create } from "zustand";

interface User {
  uid: string;
  email: string;
  role: "ADMIN" | "PERSONAL";
  storeId: string;
}

interface LaundryStore {
  id: string;
  name: string;
  storeName?: string;
  slug: string;
  logoUrl?: string;
  yapeNumber?: string;
  yapeName?: string;
  themeColor?: string;
  address?: string;
  ruc?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AppState {
  user: User | null;
  authError: string | null;
  currentStore: LaundryStore | null;
  cart: CartItem[];
  isCajaOpen: boolean;
  initialCash: number;
  cajaOpenedAt: string | null;
  hasLicense: boolean | null;
  setUser: (user: User | null) => void;
  setAuthError: (error: string | null) => void;
  setHasLicense: (has: boolean | null) => void;
  setStore: (store: LaundryStore | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  setCajaStatus: (isOpen: boolean, initialCash?: number, openedAt?: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  authError: null,
  hasLicense: null,
  currentStore: null,
  cart: [],
  isCajaOpen: false,
  initialCash: 0,
  cajaOpenedAt: null,
  setUser: (user) => set({ user }),
  setAuthError: (error) => set({ authError: error }),
  setHasLicense: (has) => set({ hasLicense: has }),
  setStore: (store) => set({ currentStore: store }),
  addToCart: (item) =>
    set((state) => ({
      cart: [...state.cart, item],
    })),
  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),
  setCajaStatus: (isOpen, initialCash = 0, openedAt = null) => set({ isCajaOpen: isOpen, initialCash: initialCash, cajaOpenedAt: openedAt }),
}));
