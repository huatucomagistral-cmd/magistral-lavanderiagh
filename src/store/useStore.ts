import { create } from "zustand";

interface User {
  uid: string;
  email: string;
  role: "OWNER" | "EMPLOYEE" | "DELIVERY";
  storeId: string;
}

interface LaundryStore {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  yapeNumber?: string;
  yapeName?: string;
  themeColor?: string;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface AppState {
  user: User | null;
  currentStore: LaundryStore | null;
  cart: CartItem[];
  isCajaOpen: boolean;
  setUser: (user: User | null) => void;
  setStore: (store: LaundryStore | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  setCajaStatus: (isOpen: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  currentStore: null,
  cart: [],
  isCajaOpen: false,
  setUser: (user) => set({ user }),
  setStore: (store) => set({ currentStore: store }),
  addToCart: (item) =>
    set((state) => ({
      cart: [...state.cart, item],
    })),
  removeFromCart: (id) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== id),
    })),
  setCajaStatus: (isOpen) => set({ isCajaOpen: isOpen }),
}));
