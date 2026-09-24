import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, Trash2, Plus, Minus, ArrowRight, 
  Check, Copy, AlertCircle, ShoppingCart, X, MessageSquare, Clock, PackageOpen
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { isNativeCapacitorApp } from '../../utils/platform'

export default function MemberStoreTab({ profile, membership, setActiveTab }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Navigation inside store: 'shop' | 'orders'
  const [storeTab, setStoreTab] = useState('shop')

  // Shopping Cart state
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [orderNotes, setOrderNotes] = useState('')
  
  // Member Orders log state
  const [myOrders, setMyOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Checkout & Success state
  const [placingOrder, setPlacingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [copiedText, setCopiedText] = useState(false)

  // Selected product for detailed modal popup
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Fetch active products
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
      setError('Failed to load store products.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch member's past orders
  const fetchMyOrders = async () => {
    setOrdersLoading(true)
    try {
      const { data, error: dbError } = await supabase
        .from('store_orders')
        .select('*')
        .eq('member_id', membership.id)
        .order('created_at', { ascending: false })

      if (dbError) throw dbError
      setMyOrders(data || [])
    } catch (err) {
      console.error('Error fetching past orders:', err)
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (membership?.gym_id) {
      fetchProducts()
    }
    if (membership?.id) {
      fetchMyOrders()
    }
  }, [membership?.gym_id, membership?.id])

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

  // Place order
  const handleCheckout = async () => {
    if (cart.length === 0 || placingOrder) return
    setPlacingOrder(true)
    setError('')

    try {
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

      // Fetch owner contact
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

      // Format WhatsApp order message
      const itemsListText = cart.map(item => `- ${item.quantity}x ${item.name} (Rs. ${item.price} each)`).join('\n')
      const messageText = `Hello! I am ${profile.full_name || 'Member'} from ${gymData.gym_name || 'Gym'}.\n\n` +
                          `I would like to order:\n${itemsListText}\n\n` +
                          `*Total:* Rs. ${cartTotal}\n` +
                          (orderNotes.trim() ? `*Notes:* ${orderNotes.trim()}\n` : '') +
                          `*Order ID:* ${newOrder.id.slice(0, 8)}\n\n` +
                          `Please keep my order ready. Thanks!`;

      let formattedPhone = ownerPhone.replace(/[^\d]/g, '')
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone
      }

      setOrderSuccess({
        orderId: newOrder.id,
        phone: formattedPhone,
        message: messageText
      })

      if (formattedPhone) {
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
        const target = isNativeCapacitorApp() ? '_system' : '_blank'
        window.open(waUrl, target)
      }

      toast.success('Order placed successfully! 📦')
      clearCart()
      setIsCartOpen(false)
      fetchMyOrders() // Refresh orders history
    } catch (err) {
      console.error('Error placing order:', err)
      setError('Failed to place order. Please try again.')
    } finally {
      setPlacingOrder(false)
    }
  }

  // Trigger WhatsApp for previous orders
  const handleReorderWhatsApp = async (order) => {
    try {
      const { data: gymData } = await supabase
        .from('gyms')
        .select('owner_user_id, gym_name')
        .eq('id', membership.gym_id)
        .single()

      let ownerPhone = ''
      if (gymData?.owner_user_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', gymData.owner_user_id)
          .single()

        ownerPhone = ownerProfile?.phone_number || ''
      }

      const itemsListText = order.items.map(item => `- ${item.quantity}x ${item.name} (Rs. ${item.price} each)`).join('\n')
      const messageText = `Hello! I am ${profile.full_name || 'Member'} from ${gymData?.gym_name || 'Gym'}.\n\n` +
                          `Re-sending details for my order:\n${itemsListText}\n\n` +
                          `*Total:* Rs. ${order.total_amount}\n` +
                          (order.notes ? `*Notes:* ${order.notes}\n` : '') +
                          `*Order ID:* ${order.id.slice(0, 8)}\n\n` +
                          `Please let me know when it's ready. Thanks!`;

      let formattedPhone = ownerPhone.replace(/[^\d]/g, '')
      if (formattedPhone.length === 10) {
        formattedPhone = '91' + formattedPhone
      }

      if (formattedPhone) {
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
        const target = isNativeCapacitorApp() ? '_system' : '_blank'
        window.open(waUrl, target)
      } else {
        navigator.clipboard.writeText(messageText)
        toast.success('Order details copied to clipboard!')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to open WhatsApp redirection.')
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
      className="space-y-5 pb-10 text-slate-900 dark:text-slate-100"
    >
      {/* Sleek Minimal Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800 flex-shrink-0">
        {/* Toggle Pills: Shop Catalog vs Orders Log - Clean Floating Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStoreTab('shop')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              storeTab === 'shop' 
                ? 'bg-violet-600 text-white' 
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700'
            }`}
          >
            Shop
          </button>
          <button
            onClick={() => {
              setStoreTab('orders');
              fetchMyOrders();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer flex items-center gap-1.5 ${
              storeTab === 'orders' 
                ? 'bg-violet-600 text-white' 
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700'
            }`}
          >
            <span>My Orders</span>
            {myOrders.filter(o => ['pending', 'ready'].includes(o.status)).length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-300 animate-pulse" />
            )}
          </button>
        </div>

        {/* Small Minimal Cart Icon Button on Top-Right */}
        {storeTab === 'shop' && (
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl text-slate-700 dark:text-zinc-200 transition-all active:scale-90 cursor-pointer flex items-center justify-center"
            title="Open Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold leading-none">
                {totalItemsCount}
              </span>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Switcher Panels */}
      {storeTab === 'shop' ? (
        /* SHOP CATALOG PANEL */
        loading ? (
          /* Amazon-style 2-column grid skeletons on mobile */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <ShoppingBag className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h4 className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">No Products Found</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
              Supplement catalog is empty. Please check back later!
            </p>
          </div>
        ) : (
          /* Amazon App Style: Compact 2-column grid on mobile */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {products.map((product) => {
              const inCart = cart.find(item => item.id === product.id)
              
              return (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-violet-500/40 transition-all text-left relative cursor-pointer group"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Image Frame with Aspect-[4/3] for ultra compactness */}
                  <div className="relative aspect-[4/3] w-full bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <ShoppingBag className="w-8 h-8 text-slate-400 dark:text-zinc-600" />
                    )}
                    
                    {/* Out of stock label */}
                    {product.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[8px] font-black uppercase tracking-wider scale-90">
                          Sold Out
                        </span>
                      </div>
                    )}

                    {/* Amazon-style Floating Action Button in the bottom-right of image frame! */}
                    {product.stock_quantity > 0 && (
                      <div className="absolute bottom-2 right-2 z-10">
                        {inCart ? (
                          /* Floating Quantity Selector pill */
                          <div className="flex items-center gap-1.5 bg-violet-600 text-white rounded-full p-0.5 border border-violet-400/25">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(product.id, -1);
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                            >
                              <Minus className="w-3 h-3 text-white" />
                            </button>
                            <span className="text-[10px] font-black w-4 text-center">{inCart.quantity}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-90 transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          /* Simple elegant Floating Plus Button */
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            className="w-7.5 h-7.5 rounded-full bg-violet-600 hover:bg-violet-500 border border-violet-400/20 flex items-center justify-center text-white active:scale-90 transition-all cursor-pointer"
                            title="Add to Cart"
                          >
                            <Plus className="w-4 h-4 text-white" strokeWidth={3} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Info details under image */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">
                        {product.name}
                      </h4>
                      {product.description ? (
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                          {product.description}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic">In Stock</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 font-mono">
                        ₹ {product.price}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* MY ORDERS HISTORY LOG PANEL */
        ordersLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : myOrders.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
            <Clock className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
            <h4 className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">No Orders Logged</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
              Any products you order from the store will be permanently tracked here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {myOrders.map((order) => (
              <div 
                key={order.id} 
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 text-left flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Product details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                      ID: #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700 text-[10px]">•</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold uppercase">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-slate-300 dark:text-zinc-700 text-[10px]">•</span>
                    
                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      order.status === 'pending' ? 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400' :
                      order.status === 'ready' ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400' :
                      order.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' :
                      'bg-rose-500/10 border-rose-500/25 text-rose-600 dark:text-rose-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        order.status === 'pending' ? 'bg-violet-500' :
                        order.status === 'ready' ? 'bg-amber-500' :
                        order.status === 'completed' ? 'bg-emerald-500' :
                        'bg-rose-500'
                      }`} />
                      <span>{order.status}</span>
                    </span>
                  </div>

                  {/* Items brief */}
                  <div className="text-xs text-slate-700 dark:text-zinc-300 font-medium space-y-0.5">
                    {order.items.map((item, idx) => (
                      <div key={idx}>
                        <span className="text-violet-600 dark:text-violet-400 font-bold font-mono">{item.quantity}x</span> {item.name}
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 italic">Note: "{order.notes}"</p>
                  )}
                </div>

                {/* Amount and WhatsApp sync button */}
                <div className="flex sm:flex-col justify-between sm:items-end w-full sm:w-auto border-t sm:border-t-0 border-slate-100 dark:border-zinc-800 pt-2.5 sm:pt-0 gap-3">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase block tracking-wider">Total Amount</span>
                    <span className="text-sm font-mono font-bold text-slate-900 dark:text-white block">Rs. {order.total_amount}</span>
                  </div>
                  
                  <button
                    onClick={() => handleReorderWhatsApp(order)}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold tracking-wide rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Send details on WhatsApp again"
                  >
                    <svg viewBox="0 0 175.216 175.552" className="w-3.5 h-3.5 flex-shrink-0">
                      <path fill="#FFF" d="M90.134 162.138c-12.084 0-23.941-3.142-34.404-9.083L14.316 163.66l10.829-39.517c-6.523-11.309-9.957-24.15-9.953-37.309C15.209 46.262 48.7 12.766 89.28 12.766c19.664 0 38.15 7.66 52.039 21.558 13.889 13.896 21.539 32.388 21.531 52.046-.017 40.579-33.518 73.768-72.716 75.768z" />
                      <path fill="#25D366" d="M90.134 23.99c-33.82 0-61.341 27.525-61.353 61.347a61.1 61.1 0 0 0 9.37 32.61l1.458 2.318-6.195 22.61 23.136-6.068 2.241 1.33A61.05 61.05 0 0 0 89.92 146.47h.023c33.81 0 61.332-27.524 61.348-61.348a61.13 61.13 0 0 0-17.951-43.375C121.849 30.197 106.524 23.99 90.134 23.99z" />
                      <path fill="#FFF" d="M118.91 103.88c-1.58-.79-9.35-4.61-10.79-5.14-1.44-.53-2.5-.79-3.56.79-1.06 1.58-4.09 5.14-5.01 6.2-.92 1.06-1.84 1.18-3.42.39-1.58-.79-6.67-2.46-12.71-7.85-4.7-4.19-7.87-9.37-8.79-10.95-.92-1.58-.1-2.44.69-3.22.71-.7 1.58-1.84 2.37-2.76.79-.92 1.06-1.58 1.58-2.63.53-1.06.26-1.97-.13-2.76-.39-.79-3.56-8.58-4.88-11.77-1.28-3.11-2.59-2.69-3.56-2.74-.92-.05-1.97-.05-3.03-.05-1.06 0-2.77.39-4.22 1.97-1.45 1.58-5.54 5.41-5.54 13.19s5.67 15.29 6.46 16.34c.79 1.06 11.16 17.04 27.04 23.9 3.78 1.63 6.72 2.61 9.02 3.35 3.8 1.21 7.26 1.04 10 0.63 3.05-.46 9.35-3.82 10.66-7.51 1.32-3.69 1.32-6.85 0.92-7.51-.39-.66-1.44-1.06-3.03-1.85z" />
                    </svg>
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Cart Drawer / Slide-Over Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[150] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs cursor-pointer"
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-md h-full bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Your Cart</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-400 dark:text-zinc-600" />
                    <h5 className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">Cart is Empty</h5>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2.5">
                      {cart.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-900 flex-shrink-0 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-zinc-700">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-slate-400 dark:text-zinc-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</h5>
                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Rs. {item.price}</span>
                          </div>

                          <div className="flex items-center gap-1 border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg p-0.5">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-slate-900 dark:text-white">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Add Pickup Notes (Optional)
                      </label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        rows={2}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-medium focus:outline-none focus:border-violet-500 transition-all resize-none"
                        placeholder="E.g., Keep it ready by 6 PM..."
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Drawer Footer */}
              {cart.length > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-900 dark:text-white">
                    <span className="uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total:</span>
                    <span className="text-violet-600 dark:text-violet-400 font-mono text-sm">Rs. {cartTotal}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={clearCart}
                      className="py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleCheckout}
                      disabled={placingOrder}
                      className="py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
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

      {/* Success Modal */}
      <AnimatePresence>
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-sm bg-[#151922] border border-white/10 rounded-2xl p-5 space-y-5 relative"
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
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Order Recorded!</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    ID: #{orderSuccess.orderId.slice(0, 8)}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your order has been logged in the gym system!
                </p>

                {orderSuccess.phone ? (
                  <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/15 text-left space-y-2.5">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      We have prefilled your order details for WhatsApp. Click below to notify the reception desk:
                    </p>
                    <button
                      onClick={() => {
                        const waUrl = `https://wa.me/${orderSuccess.phone}?text=${encodeURIComponent(orderSuccess.message)}`
                        const target = isNativeCapacitorApp() ? '_system' : '_blank'
                        window.open(waUrl, target)
                      }}
                      className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      Open WhatsApp Chat
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-left space-y-2.5">
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      WhatsApp phone number is not linked. We have copied the complete order details to your clipboard:
                    </p>
                    <button
                      onClick={handleCopyOrderText}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                    >
                      {copiedText ? 'Copied!' : 'Copy Order Text'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Details Popup Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'tween', duration: 0.18, ease: 'easeOut' }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <div className="absolute top-4 right-4 z-20">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100/80 dark:bg-zinc-800/80 backdrop-blur-xs border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Large Product Image Frame */}
              <div className="relative h-64 sm:h-72 w-full bg-slate-50 dark:bg-zinc-950/60 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ShoppingBag className="w-16 h-16 text-slate-400 dark:text-zinc-600" />
                )}
                
                {/* Out of stock tag */}
                {selectedProduct.stock_quantity === 0 && (
                  <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                    <span className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/35 text-rose-500 dark:text-rose-400 text-xs font-bold uppercase tracking-wider">
                      Sold Out
                    </span>
                  </div>
                )}
              </div>

              {/* Content body */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4 text-left hide-scrollbar">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Supplement Store</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    {selectedProduct.name}
                  </h3>
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-violet-600 dark:text-violet-400 font-mono">
                    ₹ {selectedProduct.price}
                  </span>
                  <span className="text-xs font-semibold">
                    {selectedProduct.stock_quantity > 0 ? (
                      selectedProduct.stock_quantity <= 5 ? (
                        <span className="text-amber-600 dark:text-amber-400 uppercase tracking-wider">Only {selectedProduct.stock_quantity} left in stock!</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">In Stock</span>
                      )
                    ) : (
                      <span className="text-rose-500 uppercase tracking-wider">Out of Stock</span>
                    )}
                  </span>
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Product Description</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line font-medium">
                    {selectedProduct.description || "No detailed description provided for this supplement. Rest assured, this is a verified gym product of pristine quality."}
                  </p>
                </div>
              </div>

              {/* Action footer */}
              <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex-shrink-0">
                {selectedProduct.stock_quantity > 0 ? (
                  (() => {
                    const inCart = cart.find(item => item.id === selectedProduct.id)
                    return (
                      <div className="flex items-center gap-4">
                        {inCart ? (
                          <>
                            {/* Quantity Controls inside popup */}
                            <div className="flex items-center gap-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-1.5">
                              <button
                                onClick={() => updateQuantity(selectedProduct.id, -1)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-all cursor-pointer active:scale-90"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-bold w-6 text-center text-slate-900 dark:text-white font-mono">{inCart.quantity}</span>
                              <button
                                onClick={() => addToCart(selectedProduct)}
                                className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-200 transition-all cursor-pointer active:scale-90"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedProduct(null)
                                setIsCartOpen(true)
                              }}
                              className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                            >
                              <span>View Cart</span>
                              <ShoppingCart className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => addToCart(selectedProduct)}
                            className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95"
                          >
                            Add to Cart
                          </button>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <button
                    disabled
                    className="w-full py-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500/50 text-xs font-semibold uppercase tracking-wider rounded-xl cursor-not-allowed"
                  >
                    Sold Out
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
