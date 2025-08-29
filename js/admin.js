const PASSWORD = 'Yy654321##';
const loginSection = document.getElementById('adminLogin');
const panelSection = document.getElementById('adminPanel');
const adminContent = document.getElementById('adminContent');

// Supabase client
let supabaseClient;
(async () => {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const supabaseUrl = 'https://zgfdmnsrqqfvwpdghgeu.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnZmRtbnNycXFmdndwZGdoZ2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjA5MDQsImV4cCI6MjA2OTg5NjkwNH0.WCf-YCNlFPpXo5LpVYpLNRwNg7XtZvp5n9mlmlRWR_g';
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
})();

// Login
document.getElementById('adminLoginBtn').addEventListener('click', () => {
  const pwd = document.getElementById('adminPassword').value;
  if (pwd === PASSWORD) {
    loginSection.classList.add('hidden');
    panelSection.classList.remove('hidden');
    loadProducts();
  } else {
    document.getElementById('adminError').textContent = 'Wrong password';
  }
});

panelSection.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    if (section === 'products') loadProducts();
    if (section === 'theme') loadTheme();
    if (section === 'offers') loadOffers();
    if (section === 'orders') loadOrders();
  });
});

async function loadProducts() {
  let { data, error } = await supabaseClient.from('products').select('*');
  if (error) {
    data = JSON.parse(localStorage.getItem('products') || '[]');
  } else {
    localStorage.setItem('products', JSON.stringify(data));
  }
  adminContent.innerHTML = `<h3>Products</h3>
    <form id="addProduct">
      <input required placeholder="Name" id="pName">
      <input required type="number" placeholder="Price" id="pPrice">
      <input placeholder="Image URL" id="pImage">
      <input placeholder="Category" id="pCategory">
      <input type="number" placeholder="Stock" id="pStock">
      <textarea placeholder="Description" id="pDesc"></textarea>
      <button type="submit">Add</button>
    </form>
    <div id="productList"></div>`;
  const list = document.getElementById('productList');
  data.forEach(p => {
    const div = document.createElement('div');
    div.textContent = `${p.name} - $${p.price}`;
    const toggle = document.createElement('button'); toggle.textContent = p.enabled? 'Disable':'Enable';
    toggle.onclick = async () => {
      const newVal = !p.enabled;
      const { error } = await supabaseClient.from('products').update({enabled:newVal}).eq('id', p.id);
      if (error) {
        const products = JSON.parse(localStorage.getItem('products') || '[]');
        const idx = products.findIndex(pr=>pr.id===p.id); if(idx>-1) products[idx].enabled=newVal; localStorage.setItem('products', JSON.stringify(products));
      }
      loadProducts();
    };
    const del = document.createElement('button'); del.textContent = 'Delete';
    del.onclick = async () => {
      const { error } = await supabaseClient.from('products').delete().eq('id', p.id);
      if (error) {
        let products = JSON.parse(localStorage.getItem('products') || '[]');
        products = products.filter(pr => pr.id !== p.id);
        localStorage.setItem('products', JSON.stringify(products));
      }
      loadProducts();
    };
    div.appendChild(toggle);
    div.appendChild(del);
    list.appendChild(div);
  });
  document.getElementById('addProduct').addEventListener('submit', async e => {
    e.preventDefault();
    const product = { name: pName.value, price: Number(pPrice.value), image: pImage.value, category: pCategory.value, stock: Number(pStock.value), description: pDesc.value, enabled: true };
    const { error } = await supabaseClient.from('products').insert(product);
    if (error) {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      product.id = Date.now();
      products.push(product); localStorage.setItem('products', JSON.stringify(products));
    }
    loadProducts();
  });
}

function loadTheme() {
  adminContent.innerHTML = `<h3>Theme</h3>
    <label>Primary <input type="color" id="primaryColor" value="${getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()}"></label>
    <label>Accent <input type="color" id="accentColor" value="${getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()}"></label>`;
  document.getElementById('primaryColor').addEventListener('input', e => {
    document.documentElement.style.setProperty('--primary', e.target.value);
    localStorage.setItem('primary', e.target.value);
  });
  document.getElementById('accentColor').addEventListener('input', e => {
    document.documentElement.style.setProperty('--accent', e.target.value);
    localStorage.setItem('accent', e.target.value);
  });
}

function loadOffers() {
  const offers = JSON.parse(localStorage.getItem('offers') || '[]');
  adminContent.innerHTML = `<h3>Offers</h3>
    <form id="addOffer"><input id="offerText" placeholder="Offer text"><button>Add</button></form>
    <ul id="offerList"></ul>`;
  const list = document.getElementById('offerList');
  offers.forEach((o,i) => {
    const li = document.createElement('li');
    li.textContent = o;
    const del = document.createElement('button'); del.textContent = 'x';
    del.onclick = () => { offers.splice(i,1); localStorage.setItem('offers', JSON.stringify(offers)); loadOffers(); };
    li.appendChild(del); list.appendChild(li);
  });
  document.getElementById('addOffer').addEventListener('submit', e => {
    e.preventDefault();
    offers.push(offerText.value); localStorage.setItem('offers', JSON.stringify(offers)); loadOffers();
  });
}

async function loadOrders() {
  let { data, error } = await supabaseClient.from('orders').select('*');
  if (error) {
    data = JSON.parse(localStorage.getItem('orders') || '[]');
  }
  adminContent.innerHTML = '<h3>Orders</h3>';
  data.forEach(o => {
    const div = document.createElement('div');
    div.textContent = `${o.name} - $${o.total}`;
    adminContent.appendChild(div);
  });
}

// Apply saved theme colors
(function(){
  const p = localStorage.getItem('primary');
  const a = localStorage.getItem('accent');
  if (p) document.documentElement.style.setProperty('--primary', p);
  if (a) document.documentElement.style.setProperty('--accent', a);
})();
