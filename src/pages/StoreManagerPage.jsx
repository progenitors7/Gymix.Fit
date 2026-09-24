import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Edit, Eye, EyeOff, Trash2, 
  Check, X, Package, ShoppingCart, Image as ImageIcon, Info
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useGym } from '../hooks/useGym'
import { toast } from 'react-hot-toast'

export default function StoreManagerPage() {
  const { gym } = useGym()
  const [activeSubTab, setActiveSubTab] = useState('inventory') // 'inventory' | 'orders'
  
  // Products states
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [showProductModal, setShowProductModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  
  // Product Form states
  const [prodName, setProdName] = useState('')
  const [prodDesc, setProdDesc] = useState('')
  const [prodPrice, setProdPrice] = useState('')
  const [prodStock, setProdStock] = useState('10')
  const [prodImage, setProdImage] = useState('')
  const [prodActive, setProdActive] = useState(true)
  const [processingProduct, setProcessingProduct] = useState(false)

  // Orders states
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all' | 'pending' | 'ready' | 'completed' | 'cancelled'
  
  // Limits
  const PRODUCT_LIMIT = 15

  // Fetch inventory products
  const fetchInventory = useCallback(async () => {
    if (!gym?.id) return
    setProductsLoading(true)
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('[Store] Error fetching products:', err)
      toast.error('Failed to load products inventory.')
    } finally {
      setProductsLoading(false)
    }
  }, [gym?.id])

  // Fetch orders log
  const fetchOrders = useCallback(async () => {
    if (!gym?.id) return
    setOrdersLoading(true)
    try {
      const { data, error } = await supabase
        .from('store_orders')
        .select(`
          *,
          members (
            full_name,
            phone_number,
            avatar_url
          )
        `)
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error('[Store] Error fetching orders:', err)
      toast.error('Failed to load orders log.')
    } finally {
      setOrdersLoading(false)
    }
  }, [gym?.id])

  useEffect(() => {
    if (gym?.id) {
      fetchInventory()
      fetchOrders()
    }
    localStorage.setItem('gymix_store_visited', 'true');
  }, [gym?.id, fetchInventory, fetchOrders])

  // Client-side canvas image compression to under 50KB base64
  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 400 // Safe thumbnail resolution
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
        setProdImage(compressedBase64)
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Open add modal
  const openAddModal = () => {
    if (products.length >= PRODUCT_LIMIT) {
      toast.error(`Store limit reached (${PRODUCT_LIMIT} products). Delete or edit existing listings.`)
      return
    }
    setEditingProduct(null)
    setProdName('')
    setProdDesc('')
    setProdPrice('')
    setProdStock('10')
    setProdImage('')
    setProdActive(true)
    setShowProductModal(true)
  }

  // Open edit modal
  const openEditModal = (product) => {
    setEditingProduct(product)
    setProdName(product.name || '')
    setProdDesc(product.description || '')
    setProdPrice(product.price?.toString() || '')
    setProdStock(product.stock_quantity?.toString() || '0')
    setProdImage(product.image_url || '')
    setProdActive(product.is_active ?? true)
    setShowProductModal(true)
  }

  // Save product
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!gym?.id) return

    if (!prodName.trim() || !prodPrice) {
      toast.error('Product title and price are required.')
      return
    }

    setProcessingProduct(true)
    try {
      if (editingProduct) {
        // Update
        const { error } = await supabase
          .from('store_products')
          .update({
            name: prodName.trim(),
            description: prodDesc.trim() || null,
            price: parseFloat(prodPrice),
            stock_quantity: parseInt(prodStock, 10) || 0,
            image_url: prodImage || null,
            is_active: prodActive
          })
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Product updated successfully!')
      } else {
        // Insert
        const { error } = await supabase
          .from('store_products')
          .insert({
            gym_id: gym.id,
            name: prodName.trim(),
            description: prodDesc.trim() || null,
            price: parseFloat(prodPrice),
            stock_quantity: parseInt(prodStock, 10) || 0,
            image_url: prodImage || null,
            is_active: prodActive
          })

        if (error) throw error
        toast.success('Product added to catalog!')
      }

      setShowProductModal(false)
      fetchInventory()
    } catch (err) {
      console.error('[Store] Error saving product:', err)
      toast.error('Failed to save product.')
    } finally {
      setProcessingProduct(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product listing?')) return

    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      toast.success('Product deleted.')
      fetchInventory()
    } catch (err) {
      console.error('[Store] Error deleting product:', err)
      toast.error('Failed to delete product.')
    }
  }

  // Toggle active status
  const handleToggleActive = async (product) => {
    try {
      const { error } = await supabase
        .from('store_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      toast.success(product.is_active ? 'Product hidden from catalog.' : 'Product visible in catalog.')
      fetchInventory()
    } catch (err) {
      console.error('[Store] Error toggling status:', err)
      toast.error('Failed to update product status.')
    }
  }

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('store_orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      toast.success(`Order marked as ${newStatus}!`)
      fetchOrders()
    } catch (err) {
      console.error('[Store] Error updating order:', err)
      toast.error('Failed to update order status.')
    }
  }

  // Filtered orders
  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter === 'all') return true
    return order.status === orderStatusFilter
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Store Manager
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
            Manage supplements, gear, and member orders
          </p>
        </div>

        {/* View Switcher Tabs & Actions - Clean Floating Pills */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('inventory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'inventory' 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Catalog ({products.length}/{PRODUCT_LIMIT})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'orders' 
                  ? 'bg-violet-600 text-white' 
                  : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Orders ({orders.filter(o => o.status === 'pending').length} new)</span>
            </button>
          </div>

          {activeSubTab === 'inventory' && (
            <button
              onClick={openAddModal}
              className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Free Tier Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-start sm:items-center gap-3 text-left">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5 sm:mt-0" />
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed font-medium">
          <strong>Store White-Label Beta:</strong> Active catalog listings are capped at {PRODUCT_LIMIT} items max in this tier. Members can order directly from their athlete app for front-desk pickup.
        </div>
      </div>

      {/* Primary Tab Content */}
      {activeSubTab === 'inventory' ? (
        /* ── INVENTORY CATALOG ── */
        <div className="space-y-4">
          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl h-64 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-slate-900 dark:text-white font-bold text-sm">No Products in Catalog</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                  Add gym supplements, protein bars, shakes, or gym merchandise to sell to your members.
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors text-left ${
                    product.is_active ? 'border-slate-200 dark:border-zinc-800' : 'border-rose-300 dark:border-rose-500/30 opacity-70'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
                    )}
                    
                    {/* Status Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                      {!product.is_active && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] font-bold">
                          Hidden
                        </span>
                      )}
                      {product.stock_quantity === 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={product.name}>
                          {product.name}
                        </h4>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 shrink-0 font-mono">
                          ₹{product.price}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                        Stock: <strong className="text-slate-700 dark:text-zinc-300">{product.stock_quantity} units</strong>
                      </p>
                    </div>

                    {/* Actions Row */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                        title={product.is_active ? 'Hide from store' : 'Make visible in store'}
                      >
                        {product.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{product.is_active ? 'Hide' : 'Show'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── ORDERS LOG ── */
        <div className="space-y-4">
          {/* Order Status Filters - Clean Floating Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['all', 'pending', 'ready', 'completed', 'cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setOrderStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  orderStatusFilter === st
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
              <ShoppingCart className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto" />
              <h4 className="text-slate-900 dark:text-white font-bold text-sm">No Orders Found</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                No orders match your selected filter. Placed orders from member storefront will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-5 text-left hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
                >
                  {/* Order info details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-zinc-300 overflow-hidden border border-slate-200 dark:border-zinc-700">
                          {order.members?.avatar_url ? (
                            <img src={order.members.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            order.members?.full_name?.slice(0, 2).toUpperCase() || 'M'
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{order.members?.full_name || 'Member'}</span>
                      </div>
                      
                      <span className="text-slate-300 dark:text-zinc-700">|</span>
                      
                      <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 font-medium">
                        #{order.id.slice(0, 8)}
                      </span>
                      
                      <span className="text-slate-300 dark:text-zinc-700">|</span>

                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">
                        {new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Items list */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">Ordered Items</span>
                      <div className="space-y-1">
                        {Array.isArray(order.items) && order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700 dark:text-zinc-300">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5">{item.quantity}x</span> 
                              <span>{item.name}</span>
                            </span>
                            <span className="font-mono text-slate-500 dark:text-zinc-400 font-medium">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.notes && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 italic">
                        Notes: "{order.notes}"
                      </p>
                    )}
                  </div>

                  {/* Order Total & Fulfillment Actions */}
                  <div className="md:w-56 flex flex-col justify-between items-start md:items-end gap-3 md:border-l md:border-slate-100 dark:md:border-zinc-800/80 md:pl-5">
                    <div className="text-left md:text-right space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Total Amount</span>
                      <span className="text-slate-900 dark:text-white font-mono text-lg font-bold block leading-none">₹{order.total_amount}</span>
                      
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border mt-1.5 ${
                        order.status === 'pending' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' :
                        order.status === 'ready' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' :
                        order.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                        'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === 'pending' ? 'bg-blue-500' :
                          order.status === 'ready' ? 'bg-amber-500' :
                          order.status === 'completed' ? 'bg-emerald-500' :
                          'bg-rose-500'
                        }`} />
                        <span>{order.status}</span>
                      </span>
                    </div>

                    {/* Progress Control Actions */}
                    <div className="w-full space-y-1.5">
                      <div className="flex gap-1.5 w-full">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-all cursor-pointer text-center active:scale-95"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer text-center active:scale-95"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {['pending', 'ready'].includes(order.status) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="py-1.5 px-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-lg text-xs font-medium transition-all cursor-pointer text-center active:scale-95"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT PRODUCT MODAL */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 relative flex flex-col gap-5 text-slate-900 dark:text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <Package className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {editingProduct ? 'Edit Product' : 'Add Catalog Product'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">
                      Configure details for member storefront
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
                <div className="space-y-3">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Product Title *</label>
                    <input 
                      type="text" 
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-medium focus:border-violet-500 outline-none transition-colors"
                      placeholder="e.g. Whey Protein 1KG, Gym Shaker, BCAA"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Price */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Selling Price (₹) *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-medium focus:border-violet-500 outline-none transition-colors"
                        placeholder="2999"
                      />
                    </div>

                    {/* Stock */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Stock Units *</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-medium focus:border-violet-500 outline-none transition-colors"
                        placeholder="10"
                      />
                    </div>
                  </div>

                  {/* Image Upload box */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Product Image (Optional)</label>
                    <div className="relative border border-dashed border-slate-200 dark:border-zinc-700 rounded-xl p-3 bg-slate-50 dark:bg-zinc-800/40 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center min-h-[90px] text-center gap-2">
                      {prodImage ? (
                        <div className="relative flex items-center gap-3">
                          <img src={prodImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200 dark:border-zinc-700" />
                          <button
                            type="button"
                            onClick={() => setProdImage('')}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-slate-400 dark:text-zinc-500" />
                          <div className="text-left">
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 block">Upload Photo</span>
                            <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">Auto-compressed for fast loading</span>
                          </div>
                          <input 
                            type="file" 
                            accept="image/*"
                            id="owner-product-image-upload"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Description (Optional)</label>
                    <textarea 
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-xs font-medium focus:border-violet-500 outline-none transition-colors resize-none"
                      placeholder="e.g. 24g protein per scoop, rich chocolate flavour."
                    />
                  </div>

                  {/* Active Toggle Switch */}
                  <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white block">Listing Visibility</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                        {prodActive ? 'Visible to athletes in mobile store' : 'Hidden from athlete store'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProdActive(!prodActive)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer outline-none ${
                        prodActive ? 'bg-violet-600' : 'bg-slate-300 dark:bg-zinc-700'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        prodActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Submit actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingProduct}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {processingProduct ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingProduct ? 'Save Changes' : 'Create Listing'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
