import { create } from 'zustand'

export interface CartItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  chefId: string
  chefName: string
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => { conflict: boolean }
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
  chefId: () => string | null
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],

  addItem: (item) => {
    const { items } = get()
    const existingChefId = items[0]?.chefId
    if (existingChefId && existingChefId !== item.chefId) {
      return { conflict: true }
    }
    const existing = items.find(i => i.menuItemId === item.menuItemId)
    if (existing) {
      set({ items: items.map(i => i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i) })
    } else {
      set({ items: [...items, { ...item, quantity: 1 }] })
    }
    return { conflict: false }
  },

  removeItem: (menuItemId) =>
    set(s => ({ items: s.items.filter(i => i.menuItemId !== menuItemId) })),

  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId)
      return
    }
    set(s => ({ items: s.items.map(i => i.menuItemId === menuItemId ? { ...i, quantity } : i) }))
  },

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  chefId: () => get().items[0]?.chefId ?? null,
}))
