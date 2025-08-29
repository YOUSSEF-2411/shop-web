// Simple pub/sub state management
const events = {};
function pub(event, data) { (events[event] || []).forEach(fn => fn(data)); }
function sub(event, fn) { events[event] = (events[event] || []).concat(fn); }

// Theme management
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';
if (savedTheme === 'dark') document.body.classList.add('dark');
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    pub('theme', theme);
  });
}

// Cart management
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartItemsEl = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartUI();
}

function updateCartUI() {
  if (!cartItemsEl) return;
  cartItemsEl.innerHTML = '';
  let total = 0;
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<span>${item.name} x${item.qty}</span> <span>$${(item.price * item.qty).toFixed(2)}</span>`;
    div.addEventListener('click', () => removeFromCart(item.id));
    cartItemsEl.appendChild(div);
    total += item.price * item.qty;
  });
  cartTotalEl && (cartTotalEl.textContent = total.toFixed(2));
  cartCountEl && (cartCountEl.textContent = cart.reduce((a,b)=>a+b.qty,0));
}

function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);
  if (existing) existing.qty += 1; else cart.push({ ...product, qty: 1 });
  saveCart();
  alert('Added to cart');
}

function removeFromCart(id) {
  cart = cart.filter(p => p.id !== id);
  saveCart();
}

if (cartBtn && cartDrawer) {
  cartBtn.addEventListener('click', () => {
    cartDrawer.classList.toggle('open');
    cartDrawer.classList.toggle('hidden');
    updateCartUI();
  });
}
updateCartUI();

// Supabase setup
let supabaseClient;
(async () => {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabaseUrl = 'https://zgfdmnsrqqfvwpdghgeu.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmRtbnNycXFmdndwZGdoZ2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjA5MDQsImV4cCI6MjA2OTg5NjkwNH0.WCf-YCNlFPpXo5LpVYpLNRwNg7XtZvp5n9mlmlRWR_g';
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  initPage();
})();

// Clerk auth
window.addEventListener('clerkLoad', async () => {
  const user = window.Clerk.user;
  const profile = document.getElementById('userProfile');
  if (user && profile) {
    const img = document.createElement('img');
    img.src = user.imageUrl;
    img.alt = 'profile';
    img.style.width = '32px';
    img.style.borderRadius = '50%';
    profile.appendChild(img);
  } else if(profile) {
    const btn = document.createElement('button');
    btn.textContent = 'Sign in';
    btn.onclick = () => window.Clerk.openSignIn();
    profile.appendChild(btn);
  }
});

// Page initializers
async function initPage() {
  const path = location.pathname.split('/').pop();
  if (path === 'index.html' || path === '') loadHome();
  else if (path === 'products.html') loadProducts();
  else if (path === 'product.html') loadProduct();
  else if (path === 'checkout.html') loadCheckout();
}

async function loadHome() {
  let { data, error } = await supabaseClient.from('products').select('*').eq('enabled', true).limit(4);
  if (error) {
    data = JSON.parse(localStorage.getItem('products') || '[]').filter(p=>p.enabled).slice(0,4);
  } else {
    localStorage.setItem('products', JSON.stringify(data));
  }
  renderProducts(data, document.getElementById('featuredProducts'));
  initCarousel();
}

async function loadProducts() {
  let { data, error } = await supabaseClient.from('products').select('*').eq('enabled', true);
  if (error) {
    data = JSON.parse(localStorage.getItem('products') || '[]').filter(p=>p.enabled);
  } else {
    localStorage.setItem('products', JSON.stringify(data));
  }
  const categories = new Set();
  data.forEach(p => categories.add(p.category));
  const catFilter = document.getElementById('categoryFilter');
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c; catFilter.appendChild(opt);
  });
  renderProducts(data, document.getElementById('productGrid'));
  document.getElementById('searchInput').addEventListener('input', e => applyFilters(data));
  document.getElementById('categoryFilter').addEventListener('change', () => applyFilters(data));
  document.getElementById('priceFilter').addEventListener('change', () => applyFilters(data));
  document.getElementById('ratingFilter').addEventListener('change', () => applyFilters(data));
}

function applyFilters(all) {
  let filtered = all;
  const search = document.getElementById('searchInput').value.toLowerCase();
  const cat = document.getElementById('categoryFilter').value;
  const price = document.getElementById('priceFilter').value;
  const rating = document.getElementById('ratingFilter').value;
  if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
  if (cat) filtered = filtered.filter(p => p.category === cat);
  if (price) {
    const [min, max] = price.split('-').map(Number);
    filtered = filtered.filter(p => p.price >= min && p.price <= max);
  }
  if (rating) filtered = filtered.filter(p => p.rating >= Number(rating));
  renderProducts(filtered, document.getElementById('productGrid'));
}

async function loadProduct() {
  const id = new URLSearchParams(location.search).get('id');
  let { data, error } = await supabaseClient.from('products').select('*').eq('id', id).single();
  if (error) {
    const all = JSON.parse(localStorage.getItem('products') || '[]');
    data = all.find(p => String(p.id) === id);
    if (!data) return;
  }
  const container = document.getElementById('productDetail');
  container.innerHTML = `<h2>${data.name}</h2><img src="${data.image}" alt="${data.name}"><p>${data.description}</p><p>$${data.price}</p><button id="addBtn">Add to Cart</button>`;
  document.getElementById('addBtn').addEventListener('click', () => addToCart({ id: data.id, name: data.name, price: data.price }));
}

function renderProducts(products, container) {
  if (!container) return;
  container.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `<img src="${p.image}" alt="${p.name}"><h3>${p.name}</h3><p>$${p.price}</p><button data-id="${p.id}">Add to Cart</button>`;
    card.querySelector('button').addEventListener('click', () => addToCart({ id: p.id, name: p.name, price: p.price }));
    card.addEventListener('click', e => { if(e.target.tagName!=='BUTTON') location.href = 'product.html?id=' + p.id; });
    container.appendChild(card);
  });
}

function initCarousel() {
  const carousel = document.getElementById('offerCarousel');
  if (!carousel) return;
  const inner = carousel.querySelector('.carousel-inner');
  const offers = JSON.parse(localStorage.getItem('offers') || '[]');
  if (offers.length) {
    inner.innerHTML = '';
    offers.forEach((o,i) => {
      const div = document.createElement('div');
      div.className = 'carousel-item' + (i===0?' active':'');
      div.textContent = o;
      inner.appendChild(div);
    });
  }
  const items = carousel.querySelectorAll('.carousel-item');
  let index = 0;
  function show(i){ inner.style.transform = `translateX(-${i * 100}%)`; }
  carousel.querySelectorAll('.carousel-control').forEach(btn => {
    btn.addEventListener('click', () => {
      index = (index + Number(btn.dataset.direction) + items.length) % items.length;
      show(index);
    });
  });
  setInterval(() => { index = (index + 1) % items.length; show(index); }, 5000);
}

async function loadCheckout() {
  await window.Clerk.load();
  const content = document.getElementById('checkoutContent');
  if (!window.Clerk.user) {
    content.innerHTML = '<p>Please <a href="#" id="loginLink">login</a> to checkout.</p>';
    document.getElementById('loginLink').addEventListener('click', e => { e.preventDefault(); window.Clerk.openSignIn(); });
    return;
  }
  content.innerHTML = `<form id="checkoutForm">
    <input required placeholder="Name" id="shipName"><br>
    <input required placeholder="Address" id="shipAddress"><br>
    <button type="submit">Place Order</button>
  </form>`;
  document.getElementById('checkoutForm').addEventListener('submit', async e => {
    e.preventDefault();
    const order = { user: window.Clerk.user.id, items: cart, total: cart.reduce((a,b)=>a+b.price*b.qty,0), name: shipName.value, address: shipAddress.value };
    const { error } = await supabaseClient.from('orders').insert(order);
    if (error) {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      orders.push(order); localStorage.setItem('orders', JSON.stringify(orders));
    }
    cart = []; saveCart();
    content.innerHTML = '<p>Order placed! Thank you.</p>';
  });
}
