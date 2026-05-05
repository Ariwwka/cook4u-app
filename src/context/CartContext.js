import React, { createContext, useContext, useState } from 'react'

const CartContext = createContext({})

export function CartProvider({ children }) {
  const [cartChefId, setCartChefId] = useState(null)
  const [cartChefName, setCartChefName] = useState(null)
  const [items, setItems] = useState([])

  function addItem(menuItem, chefId, chefName) {
    if (cartChefId && cartChefId !== chefId) {
      return { conflict: true, existingChefName: cartChefName }
    }
    if (!cartChefId) {
      setCartChefId(chefId)
      setCartChefName(chefName)
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItem.id)
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: Number(menuItem.price),
          quantity: 1,
        },
      ]
    })
    return { conflict: false }
  }

  function removeItem(menuItemId) {
    setItems((prev) => {
      const updated = prev
        .map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
        .filter((i) => i.quantity > 0)
      if (updated.length === 0) {
        setCartChefId(null)
        setCartChefName(null)
      }
      return updated
    })
  }

  function clearCart() {
    setItems([])
    setCartChefId(null)
    setCartChefName(null)
  }

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const serviceFee = subtotal * 0.1
  const total = subtotal + serviceFee

  return (
    <CartContext.Provider
      value={{
        cartChefId,
        cartChefName,
        items,
        addItem,
        removeItem,
        clearCart,
        itemCount,
        subtotal,
        serviceFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
