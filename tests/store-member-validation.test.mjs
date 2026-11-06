import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function handler(path, name, dependencies) {
  const source = fs.readFileSync(path, 'utf8')
  const start = source.indexOf(`  const ${name} =`)
  const closingStart = source.indexOf('\n  }', start)
  const closingEnd = source.indexOf('\n', closingStart + 1)
  const end = closingEnd === -1 ? source.length : closingEnd
  const context = { console: { error() {} }, useCallback: callback => callback, ...dependencies }
  vm.runInNewContext(`${source.slice(start, end)}\nglobalThis.handler = ${name}`, context)
  return context.handler
}

const storePath = 'src/components/MemberPortal/MemberStoreTab.jsx'

for (const [path, name, scope] of [
  ['src/pages/StoreManagerPage.jsx', 'fetchInventory', 'gym'],
  ['src/pages/StoreManagerPage.jsx', 'fetchOrders', 'gym'],
  [storePath, 'fetchProducts', 'gym'],
  [storePath, 'fetchMyOrders', 'member']
]) {
  test(`${name} only displays successful data from the current store scope`, async () => {
    const updates = []
    let finishQuery
    let response = new Promise(resolve => { finishQuery = resolve })
    const query = {
      select() { return query }, eq() { return query }, order() { return response }
    }
    const fetch = handler(path, name, {
      gym: { id: 'gym' }, gymId: 'gym', memberId: 'member',
      membership: { gym_id: 'gym', id: 'member' },
      setProducts: data => updates.push(data), setOrders: data => updates.push(data),
      setMyOrders: data => updates.push(data), setLoading() {}, setProductsLoading() {},
      setOrdersLoading() {}, setError() {}, setLoadedGymId() {}, setLoadedMemberId() {},
      setInventoryGymId() {}, setOrdersGymId() {},
      toast: { error() {} }, supabase: { from: () => query }
    })
    let current = true
    const request = fetch(() => current)
    current = false
    finishQuery({ data: [{ id: `${scope}-old` }], error: null })
    await request
    assert.equal(updates.length, 0)
    current = true
    await fetch(() => current)
    assert.equal(updates.at(-1)[0].id, `${scope}-old`)
    response = Promise.resolve({ data: null, error: new Error('Unavailable') })
    await fetch(() => current)
    assert.equal(updates.at(-1).length, 0)
  })
}

test('catalog add keeps cart quantity within the available stock', () => {
  let cart = []
  const add = handler(storePath, 'addToCart', {
    setCart: update => { cart = update(cart) }
  })
  const product = { id: 'protein', name: 'Protein', price: 200, stock_quantity: 2 }
  add(product)
  add(product)
  add(product)
  assert.equal(cart[0].quantity, 2)
})

test('sold-out products cannot enter the cart', () => {
  let cart = []
  const add = handler(storePath, 'addToCart', {
    setCart: update => { cart = update(cart) }
  })
  add({ id: 'protein', stock_quantity: 0 })
  assert.equal(cart.length, 0)
})

test('cart quantity controls enforce stock and still allow removing the last unit', () => {
  let cart = [{ id: 'protein', stock_quantity: 1, quantity: 1 }]
  const updateQuantity = handler(storePath, 'updateQuantity', {
    setCart: update => { cart = update(cart) }
  })
  updateQuantity('protein', 1)
  assert.equal(cart[0].quantity, 1)
  updateQuantity('protein', -1)
  assert.equal(cart.length, 0)
})

for (const value of ['', '0', '-1', 'Infinity', '85kg']) {
  test(`progress rejects invalid weight ${JSON.stringify(value)} before saving`, async () => {
    let inserts = 0
    const errors = []
    const add = handler('src/components/MemberPortal/MemberProgressTab.jsx', 'handleAddProgressLog', {
      membership: { id: 'member' }, newValue: value, newNotes: '',
      newLogType: 'BODYWEIGHT', newExerciseName: 'Body Weight',
      setLoggingProgress() {}, setNewValue() {}, setNewNotes() {},
      fetchProgressLogs: async () => {},
      toast: { error: error => errors.push(error), success() {} },
      supabase: { from: () => ({ insert: async () => { inserts++; return { error: null } } }) }
    })
    await add({ preventDefault() {} })
    assert.equal(inserts, 0)
    assert.equal(errors.length, 1)
  })
}

test('progress saves a valid decimal weight and refreshes member history', async () => {
  let saved
  let refreshed
  const add = handler('src/components/MemberPortal/MemberProgressTab.jsx', 'handleAddProgressLog', {
    membership: { id: 'member' }, newValue: '85.5', newNotes: ' Morning ',
    newLogType: 'BODYWEIGHT', newExerciseName: 'Body Weight',
    setLoggingProgress() {}, setNewValue() {}, setNewNotes() {},
    fetchProgressLogs: async id => { refreshed = id },
    toast: { error() {}, success() {} },
    supabase: { from: () => ({ insert: async payload => { saved = payload; return { error: null } } }) }
  })
  await add({ preventDefault() {} })
  assert.equal(saved.value, 85.5)
  assert.equal(saved.log_type, 'weight')
  assert.equal(saved.notes, 'Morning')
  assert.equal(refreshed, 'member')
})

for (const [price, stock] of [['-1', '10'], ['Infinity', '10'], ['100', '-1'], ['100', '1.5'], ['100', ''], ['100', '1e3x']]) {
  test(`product rejects invalid price ${price} or stock ${JSON.stringify(stock)} before saving`, async () => {
    let writes = 0
    const errors = []
    const save = handler('src/pages/StoreManagerPage.jsx', 'handleSaveProduct', {
      gym: { id: 'gym' }, prodName: 'Protein', prodDesc: '', prodPrice: price,
      prodStock: stock, prodImage: '', prodActive: true, editingProduct: null,
      setProcessingProduct() {}, setShowProductModal() {}, fetchInventory() {},
      toast: { error: error => errors.push(error), success() {} },
      supabase: { from: () => ({ insert: async () => { writes++; return { error: null } } }) }
    })
    await save({ preventDefault() {} })
    assert.equal(writes, 0)
    assert.equal(errors.length, 1)
  })
}

test('product saves zero price and zero stock without substituting defaults', async () => {
  let saved
  const save = handler('src/pages/StoreManagerPage.jsx', 'handleSaveProduct', {
    gym: { id: 'gym' }, prodName: ' Sample ', prodDesc: '', prodPrice: '0',
    prodStock: '0', prodImage: '', prodActive: true, editingProduct: null,
    setProcessingProduct() {}, setShowProductModal() {}, fetchInventory() {},
    toast: { error() {}, success() {} },
    supabase: { from: () => ({ insert: async payload => { saved = payload; return { error: null } } }) }
  })
  await save({ preventDefault() {} })
  assert.equal(saved.price, 0)
  assert.equal(saved.stock_quantity, 0)
  assert.equal(saved.name, 'Sample')
})
