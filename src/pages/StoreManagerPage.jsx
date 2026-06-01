import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Store, Plus, Edit, Eye, EyeOff, Trash2, 
  Check, X, Clipboard, ArrowRight, ShieldCheck, 
  Package, ShoppingCart, Image as ImageIcon, AlertTriangle, Info, Clock, CheckCircle
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
  const [compressedSizeKB, setCompressedSizeKB] = useState(null)

  // Orders states
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all' | 'pending' | 'ready' | 'completed' | 'cancelled'
  
  // Limits
  const PRODUCT_LIMIT = 15

  // Fetch inventory products
  const fetchInventory = async () => {
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
  }

  // Fetch orders log
  const fetchOrders = async () => {
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
  }

  useEffect(() => {
    if (gym?.id) {
      fetchInventory()
      fetchOrders()
    }
  }, [gym?.id])

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

        // Compress JPEG to 0.5 quality
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5)
        setProdImage(compressedBase64)
        
        // Calculate size
        const stringLength = compressedBase64.length - 'data:image/jpeg;base64,'.length
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633
        setCompressedSizeKB((sizeInBytes / 1024).toFixed(1))
        
        toast.success('Product image compressed successfully! ⚡')
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  // Open Add Product Modal
  const openAddModal = () => {
    if (products.length >= PRODUCT_LIMIT) {
      toast.error(`Free Beta tier limit reached! You can list a maximum of ${PRODUCT_LIMIT} products.`)
      return
    }
    setEditingProduct(null)
    setProdName('')
    setProdDesc('')
    setProdPrice('')
    setProdStock('10')
    setProdImage('')
    setProdActive(true)
    setCompressedSizeKB(null)
    setShowProductModal(true)
  }

  // Open Edit Product Modal
  const openEditModal = (product) => {
    setEditingProduct(product)
    setProdName(product.name)
    setProdDesc(product.description || '')
    setProdPrice(product.price.toString())
    setProdStock(product.stock_quantity.toString())
    setProdImage(product.image_url || '')
    setProdActive(product.is_active)
    setCompressedSizeKB(null)
    setShowProductModal(true)
  }

  // Save/Update product
  const handleSaveProduct = async (e) => {
    e.preventDefault()
    if (!prodName.trim() || !prodPrice.trim()) return
    setProcessingProduct(true)

    try {
      const payload = {
        gym_id: gym.id,
        name: prodName.trim(),
        description: prodDesc.trim() || null,
        price: parseFloat(prodPrice),
        stock_quantity: parseInt(prodStock) || 0,
        image_url: prodImage || null,
        is_active: prodActive
      }

      if (editingProduct) {
        // Update product
        const { error } = await supabase
          .from('store_products')
          .update(payload)
          .eq('id', editingProduct.id)

        if (error) throw error
        toast.success('Product updated successfully! ✨')
      } else {
        // Double check limit before insert
        if (products.length >= PRODUCT_LIMIT) {
          throw new Error(`Cannot add product. Product limit of ${PRODUCT_LIMIT} reached on Free Beta tier.`)
        }
        
        // Insert product
        const { error } = await supabase
          .from('store_products')
          .insert(payload)

        if (error) throw error
        toast.success('Product added to inventory! 📦')
      }

      setShowProductModal(false)
      fetchInventory()
    } catch (err) {
      console.error('[Store] Error saving product:', err)
      toast.error(err.message || 'Failed to save product details.')
    } finally {
      setProcessingProduct(false)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) return
    
    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', productId)

      if (error) throw error
      toast.success('Product deleted from inventory.')
      fetchInventory()
    } catch (err) {
      console.error('[Store] Error deleting product:', err)
      toast.error('Failed to delete product.')
    }
  }

  // Toggle active status quickly
  const handleToggleActive = async (product) => {
    try {
      const { error } = await supabase
        .from('store_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id)

      if (error) throw error
      toast.success(product.is_active ? 'Product deactivated.' : 'Product activated!')
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
      toast.success(`Order status updated to "${newStatus.toUpperCase()}"!`)
      fetchOrders()
    } catch (err) {
      console.error('[Store] Error updating order:', err)
      toast.error('Failed to update order status.')
    }
  }

  // Grouped/filtered orders
  const filteredOrders = orders.filter(order => {
    if (orderStatusFilter === 'all') return true
    return order.status === orderStatusFilter
  })

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-100">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#3B82F6] to-[#6366F1] flex items-center justify-center shadow-lg text-white">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-none">Store Manager</h1>
            <p className="text-slate-400 text-xs mt-1.5 uppercase tracking-widest font-semibold">Manage Gym Catalog & Orders Log</p>
          </div>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex bg-[#1A1F2B] p-1.5 rounded-2xl border border-white/5 self-start">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'inventory' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catalog ({products.length}/{PRODUCT_LIMIT})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'orders' 
                ? 'bg-blue-500 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Orders Log ({orders.filter(o => o.status === 'pending').length} New)</span>
          </button>
        </div>
      </div>

      {/* Premium Beta Warning notice card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-500/15 flex flex-col md:flex-row items-start md:items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 flex-shrink-0">
          <Info className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 space-y-1">
          <h5 className="text-xs font-black text-white uppercase tracking-wider">Gymix Store White-Label Beta</h5>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Your store is currently running in <strong>Free Beta Mode</strong>. In this tier, active catalog listings are capped at <strong>{PRODUCT_LIMIT} items max</strong>. Uploaded product photos are automatically compressed on-device to under 50KB to keep your storage footprint minimal. Future updates may introduce premium billing options.
          </p>
        </div>
      </div>

      {/* Primary Tab Panels */}
      {activeSubTab === 'inventory' ? (
        // INVENTORY SECTION
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Active Inventory</h3>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                List products for members to buy
              </p>
            </div>
            
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1A1F2B] border border-white/5 rounded-2xl h-60 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-[#1A1F2B] border border-white/5 rounded-2xl space-y-4">
              <Package className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-white text-sm font-bold uppercase tracking-wider">No Products Found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Get started by adding gym supplements, shakes, or merchandise to list them on the member store.
                </p>
              </div>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Create First Product
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div 
                  key={product.id}
                  className={`bg-[#1A1F2B] border rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/10 transition-all text-left ${
                    product.is_active ? 'border-white/5' : 'border-rose-500/20 opacity-60'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-square w-full bg-slate-950/40 border-b border-white/5 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-700" />
                    )}
                    
                    {/* Floating Status Badges */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {!product.is_active && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[8px] font-black uppercase tracking-wider">
                          Inactive
                        </span>
                      )}
                      {product.stock_quantity === 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[8px] font-black uppercase tracking-wider">
                          Out of Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-1.5">
                        <h4 className="text-xs font-black text-white uppercase truncate">{product.name}</h4>
                        <span className="text-xs font-mono font-black text-blue-400">Rs. {product.price}</span>
                      </div>
                      {product.description && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                        Stock Remaining: <span className="text-slate-300">{product.stock_quantity} units</span>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                          product.is_active 
                            ? 'bg-slate-950/30 text-slate-400 border border-white/5 hover:bg-white/5 hover:text-white' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                        }`}
                        title={product.is_active ? 'Deactivate Listing' : 'Activate Listing'}
                      >
                        {product.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="py-2 bg-slate-950/30 text-slate-400 border border-white/5 hover:bg-white/5 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                        title="Edit Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="py-2 bg-rose-500/5 text-rose-400 border border-rose-500/10 hover:bg-rose-500/10 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // ORDERS LOG SECTION
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-left">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Fulfillment Logs</h3>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                Process placed orders
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {['all', 'pending', 'ready', 'completed', 'cancelled'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setOrderStatusFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    orderStatusFilter === filter 
                      ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold' 
                      : 'bg-slate-950/30 border border-white/5 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {ordersLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="bg-[#1A1F2B] border border-white/5 rounded-2xl h-36 animate-pulse" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-[#1A1F2B] border border-white/5 rounded-2xl space-y-3">
              <ShoppingCart className="w-12 h-12 text-slate-700 mx-auto" />
              <h4 className="text-white text-sm font-bold uppercase tracking-wider">No Orders Logged</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No orders match your selected filter. Placed orders from member storefront will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`bg-[#1A1F2B] border rounded-2xl p-5 flex flex-col md:flex-row justify-between gap-6 text-left hover:border-white/10 transition-colors ${
                    order.status === 'pending' ? 'border-[#3B82F6]/25 bg-blue-950/5' : 'border-white/5'
                  }`}
                >
                  {/* Order info details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Avatar & Name */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center font-bold text-[10px] text-white overflow-hidden border border-white/10">
                          {order.members?.avatar_url ? (
                            <img src={order.members.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            order.members?.full_name?.slice(0,2).toUpperCase() || 'M'
                          )}
                        </div>
                        <span className="text-xs font-black text-white uppercase">{order.members?.full_name || 'Anonymous Athlete'}</span>
                      </div>
                      
                      {/* Divider */}
                      <span className="hidden sm:inline text-slate-700">|</span>
                      
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                        ID: #{order.id.slice(0, 8)}
                      </span>
                      
                      <span className="text-slate-700 hidden sm:inline">|</span>

                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        {new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Items stack */}
                    <div className="p-4.5 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Ordered Items</span>
                      <div className="space-y-1.5">
                        {Array.isArray(order.items) && order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-300">
                              <span className="text-blue-400 font-bold font-mono mr-1.5">{item.quantity}x</span> 
                              <span className="font-semibold uppercase">{item.name}</span>
                            </span>
                            <span className="font-mono text-slate-400">Rs. {item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.notes && (
                      <div className="text-xs">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Member Pickup Notes</span>
                        <p className="mt-1 text-slate-400 font-semibold italic">"{order.notes}"</p>
                      </div>
                    )}
                  </div>

                  {/* Order Total & Fulfillment Actions */}
                  <div className="md:w-64 flex flex-col justify-between items-start md:items-end gap-4 md:border-l md:border-white/5 md:pl-6">
                    <div className="text-left md:text-right space-y-1.5">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Order Subtotal</span>
                      <span className="text-blue-400 font-mono text-lg font-black block leading-none">Rs. {order.total_amount}</span>
                      
                      {/* Active Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mt-1.5 ${
                        order.status === 'pending' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/25 text-[#3B82F6]' :
                        order.status === 'ready' ? 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400' :
                        order.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                        'bg-rose-500/10 border-rose-500/25 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          order.status === 'pending' ? 'bg-[#3B82F6]' :
                          order.status === 'ready' ? 'bg-yellow-400' :
                          order.status === 'completed' ? 'bg-emerald-400' :
                          'bg-rose-400'
                        }`} />
                        <span>{order.status}</span>
                      </span>
                    </div>

                    {/* Progress Control Panel */}
                    <div className="w-full space-y-2">
                      <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block text-left md:text-right">Fulfillment Action</span>
                      <div className="flex gap-1.5 w-full">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                          >
                            Mark Picked Up
                          </button>
                        )}
                        {['pending', 'ready'].includes(order.status) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="py-2 px-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border border-rose-500/10 hover:border-rose-500/25 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center active:scale-95"
                            title="Cancel Order"
                          >
                            Cancel
                          </button>
                        )}
                        {['completed', 'cancelled'].includes(order.status) && (
                          <span className="text-[10px] text-slate-500 font-semibold italic text-left md:text-right w-full block">
                            Order is finalized.
                          </span>
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

      {/* CREATE & EDIT PRODUCT DIALOG OVERLAY */}
      <AnimatePresence>
        {showProductModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#151922] border border-white/10 rounded-2xl p-6 relative shadow-2xl flex flex-col gap-6"
            >
              <div className="absolute top-4 right-4 z-[10]">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Modal Title */}
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">
                  <Package className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {editingProduct ? 'Edit Catalog Product' : 'Add Catalog Product'}
                  </h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    {editingProduct ? 'Configure product listing settings' : 'Create new white label store listing'}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProduct} className="space-y-4 text-left">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Details */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Product Title</label>
                      <input 
                        type="text" 
                        required
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="E.g., Whey Protein 1KG"
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Selling Price (Rs.)</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="E.g., 2999"
                      />
                    </div>

                    {/* Stock */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Stock Quantity</label>
                      <input 
                        type="number" 
                        required
                        min="0"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="E.g., 10"
                      />
                    </div>
                  </div>

                  {/* Right Column: Image and Status */}
                  <div className="space-y-4 flex flex-col justify-between">
                    {/* Image Upload box */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Product Photo</label>
                      <div className="relative border border-dashed border-white/10 rounded-xl p-4 bg-slate-950/20 hover:bg-slate-950/40 hover:border-white/20 transition-all flex flex-col items-center justify-center min-h-[140px] text-center gap-2">
                        {prodImage ? (
                          <>
                            <img src={prodImage} alt="Preview" className="max-h-[110px] object-contain rounded-lg border border-white/5" />
                            <button
                              type="button"
                              onClick={() => {
                                setProdImage('');
                                setCompressedSizeKB(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-all active:scale-95 cursor-pointer"
                              title="Clear Image"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            {compressedSizeKB && (
                              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 absolute bottom-2 left-2">
                                JPEG {compressedSizeKB} KB
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <ImageIcon className="w-7 h-7 text-slate-700" />
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-bold text-slate-400 block">Select Image File</span>
                              <span className="text-[8px] font-semibold text-slate-500 block uppercase tracking-wider">Resizes to &lt;50KB Automatically</span>
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

                    {/* Active Toggle Switch */}
                    <div className="flex justify-between items-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider block">Listing Status</span>
                        <span className="text-[10px] font-bold text-slate-300 block">
                          {prodActive ? 'Visible to members' : 'Hidden from store'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProdActive(!prodActive)}
                        className={`w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer outline-none ${
                          prodActive ? 'bg-blue-500' : 'bg-slate-800'
                        }`}
                      >
                        <div className={`w-5.5 h-5.5 rounded-full bg-white transition-transform ${
                          prodActive ? 'translate-x-5.5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest ml-1">Short Description (Optional)</label>
                  <textarea 
                    value={prodDesc}
                    onChange={(e) => setProdDesc(e.target.value)}
                    rows={2.5}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/5 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all resize-none"
                    placeholder="E.g., High quality Whey Isolate, 24g protein per serving."
                  />
                </div>

                {/* Submit action */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProductModal(false)}
                    className="py-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingProduct}
                    className="py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
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
