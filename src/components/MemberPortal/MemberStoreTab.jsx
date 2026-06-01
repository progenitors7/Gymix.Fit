import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, 
  Check, Copy, AlertCircle, ShoppingCart, X, MessageSquare 
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function MemberStoreTab({ profile, membership, setActiveTab }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Shopping Cart state
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  
  // Checkout & Modal state
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [copiedText, setCopiedText] = useState(false)

  // Fetch active products for connected gym
  const fetchProducts = async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: dbError } = await supabase
        .from('store_products')
        .select('*')
        .eq('gym_id', membership.gym_id)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (dbError) throw dbError
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching gym products:', err)
      setError('Failed to load store products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (membership?.gym_id) {
      fetchProducts()
    }
  }, [membership?.gym_id])

  // Cart operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId, change) => {
    setCart(prev => 
      prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + change
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean)
    )
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  const clearCart = () => {
    setCart([])
    setOrderNotes('')
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Handle checkout and place order
  const handleCheckout = async () => {
    if (cart.length === 0 || placingOrder) return
    setPlacingOrder(true)
    setError('')

    try {
      // 1. Save the order in Supabase store_orders
      const orderItems = cart.map(item => ({
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))

      const { data: newOrder, error: orderError } = await supabase
        .from('store_orders')
        .insert({
          gym_id: membership.gym_id,
          member_id: membership.id,
          total_amount: cartTotal,
          items: orderItems,
          notes: orderNotes.trim() || null,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 2. Fetch the Gym Owner's profile to retrieve their phone number
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .select('owner_user_id, gym_name')
        .eq('id', membership.gym_id)
        .single()

      if (gymError) throw gymError

      let ownerPhone = ''
      if (gymData?.owner_user_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', gymData.owner_user_id)
          .single()

        ownerPhone = ownerProfile?.phone_number || ''
      }

      // 3. Format prefilled order message
      const itemsListText = cart.map(item => `- ${item.quantity}x ${item.name} (Rs. ${item.price} each)`).join('\n')
      const messageText = `Hello! I am ${profile.full_name || 'Member'} from ${gymData.gym_name || 'Gym'}.\n\n` +
                          `I would like to order the following products:\n${itemsListText}\n\n` +
                          `*Total Amount:* Rs. ${cartTotal}\n` +
                          (orderNotes.trim() ? `*Notes:* ${orderNotes.trim()}\n` : '') +
                          `*Order ID:* ${newOrder.id.slice(0, 8)}\n\n` +
                          `Please keep my order ready. Thank you! ✨`;

      // Clean owner phone number
      let formattedPhone = ownerPhone.replace(/[^\d]/g, '')
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone // Add India country code fallback
      }

      // 4. Record order success
      setOrderSuccess({
        orderId: newOrder.id,
        phone: formattedPhone,
        message: messageText
      })

      // 5. Open WhatsApp if phone is configured
      if (formattedPhone) {
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
        window.open(waUrl, '_blank')
      }

      // Clear local cart
      clearCart()
      setIsCartOpen(false)
    } catch (err) {
      console.error('Error placing order:', err)
      setError(err.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacingOrder(false)
    }
  }

  const handleCopyOrderText = () => {
    if (!orderSuccess) return
    navigator.clipboard.writeText(orderSuccess.message)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  return (
    <motion.div
      key="store-tab"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-900/10 to-indigo-900/10 border border-blue-500/15">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/25 text-blue-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[8px] font-black uppercase text-blue-400 tracking-widest leading-none">Gym Store</span>
            <h3 className="text-sm font-bold text-white uppercase mt-0.5">White-Label Product Shop</h3>
          </div>
        </div>
        
        {/* Floating Cart Trigger inside header for easy reach */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md self-start sm:self-center cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Cart</span>
          {totalItemsCount > 0 && (
            <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-blue-600 text-[9px] font-black leading-none">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#1A1F2B] border border-white/5 rounded-2xl h-72 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-[#1A1F2B] border border-white/5 rounded-2xl space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-white text-sm font-bold uppercase tracking-wider">No Products Available</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your gym owner has not added any products to the store yet. Please check back later!
          </p>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products.map((product) => {
            const inCart = cart.find(item => item.id === product.id)
            
            return (
              <div 
                key={product.id} 
                className="bg-[#1A1F2B] border border-white/5 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/10 transition-all duration-200 group text-left"
              >
                {/* Product Image Frame */}
                <div className="relative aspect-square w-full bg-slate-950/40 border-b border-white/5 flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <ShoppingBag className="w-12 h-12 text-slate-700" />
                  )}
                  {product.stock_quantity === 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors leading-tight">
                        {product.name}
                      </h4>
                      <span className="text-xs font-black text-blue-400 tracking-tight whitespace-nowrap">
                        Rs. {product.price}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    {product.stock_quantity === 0 ? (
                      <button
                        disabled
                        className="w-full py-2.5 bg-white/5 border border-white/5 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                      >
                        Unavailable
                      </button>
                    ) : inCart ? (
                      <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="flex-1 text-center font-bold text-xs text-white">
                          {inCart.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-blue-400 hover:bg-blue-500/10 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] cursor-pointer"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cart Drawer / Slide-Over Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black cursor-pointer"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-md h-full bg-[#151922] shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Your Shopping Cart</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body / Items List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                    <ShoppingCart className="w-10 h-10 text-slate-700 animate-bounce" />
                    <h5 className="text-white text-xs font-bold uppercase tracking-wider">Cart is Empty</h5>
                    <p className="text-[10px] text-slate-500 max-w-xs">
                      Browse your gym store products and add items to your cart to checkout.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-slate-950 flex-shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-slate-700" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-white uppercase truncate">{item.name}</h5>
                            <span className="text-[10px] font-bold text-slate-500">Rs. {item.price} each</span>
                          </div>

                          {/* Cart Quantity Editor */}
                          <div className="flex items-center gap-1 border border-white/5 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-white">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Remove button */}
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 transition-all cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Order Notes Field */}
                    <div className="space-y-2 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">
                        Add Order Pickup Notes (Optional)
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        rows={3}
                        className="w-full p-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                        placeholder="E.g., Please keep it ready by 6 PM, or cold temperature..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer / Subtotal Panel */}
              {cart.length > 0 && (
                <div className="p-5 border-t border-white/5 bg-[#1A1F2B] space-y-4">
                  <div className="flex justify-between items-center text-sm font-bold text-white">
                    <span className="uppercase text-xs tracking-wider text-slate-400">Total Amount:</span>
                    <span className="text-blue-400 font-mono text-base">Rs. {cartTotal}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={clearCart}
                      className="py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 text-center"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={placingOrder}
                      className="py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {placingOrder ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Checkout</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Order Integration Modal */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#151922] border border-white/10 rounded-2xl p-6 space-y-6 shadow-2xl relative"
            >
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setOrderSuccess(null)}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Order Saved & Logged!</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Order ID: #{orderSuccess.orderId.slice(0, 8)}
                  </p>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Your white-label order has been successfully recorded in the gym server database!
                </p>

                {orderSuccess.phone ? (
                  <div className="p-4.5 rounded-xl bg-blue-500/5 border border-blue-500/15 text-left space-y-3.5">
                    <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" />
                      <span>WhatsApp Redirection</span>
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      We have redirected you to WhatsApp to send the order details straight to the Gym Owner's phone. If the chat window did not open automatically, click the button below:
                    </p>
                    <button
                      onClick={() => {
                        const waUrl = `https://wa.me/${orderSuccess.phone}?text=${encodeURIComponent(orderSuccess.message)}`
                        window.open(waUrl, '_blank')
                      }}
                      className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      Open WhatsApp Chat
                    </button>
                  </div>
                ) : (
                  <div className="p-4.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-left space-y-3.5">
                    <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Owner Contact Number Missing</span>
                    </span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Your gym owner has not linked their WhatsApp phone number inside Gymix. We have copied the complete order details text to your clipboard. Please paste and send it to them manually, or share it at the reception counter!
                    </p>
                    <button
                      onClick={handleCopyOrderText}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Order Text
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
