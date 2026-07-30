
const API_BASE = '/api'; // base path for the API endpoints (matches the Express routes in server.js)

/* ---------------------------------------------------------------------
   1. API LAYER — real fetch() calls to the Express backend
   --------------------------------------------------------------------- */
   //checks if server response is ok, 
   // if not throws an error with the status code and any error message from the server, otherwise returns the parsed JSON response
async function handleResponse(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { 
      const body = await res.json(); 
      if (body.error) msg = body.error; 
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const api = { //api object containing methods for interacting with the backend API endpoints for items and transactions

  async listItems() { //retrieves all inventory items from database
    return handleResponse(await fetch(`${API_BASE}/items`));
  },

  async listTransactions() { //retrieves all transaction records from database
    return handleResponse(await fetch(`${API_BASE}/transactions`));
  },

  async createItem(item) { //creates a new inventory item in the database, expects an object with item details (name, category, location, qty, minStock)
    return handleResponse(await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item), //converts the item object to a JSON string for the request body
    }));
  },

  async updateItem(id, patch) { //updates an existing inventory item in the database, expects the item's unique id and an object with the fields to update (patch)
    return handleResponse(await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }));
  },

  async deleteItem(id) { //deletes an existing inventory item from the database, expects the item's unique id
    return handleResponse(await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }));
  },

  async stockMove(id, { action, qty, note }) { //records a stock movement (addition or removal) for an inventory item, expects the item's unique id and an object with the action ('in' or 'out'), quantity, and optional note
    return handleResponse(await fetch(`${API_BASE}/items/${encodeURIComponent(id)}/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, qty, note }),
    }));
  },

};

/* ---------------------------------------------------------------------
   2. STATE
   --------------------------------------------------------------------- */

//
let inventory = []; // array to hold the current inventory items fetched from the server
let transactions = []; // array to hold the current transaction records fetched from the server
let sortKey = 'id'; // default sort key for the inventory table (can be changed by clicking on table headers)
let sortDir = 1; // default sort direction for the inventory table (1 for ascending, -1 for descending)
let currentView = 'inventory'; // current view of the app, either 'inventory' or 'log', controlled by the tab buttons

// loads the latest inventory and transaction data from the server, updates the local state, and re-renders the UI. If silent is true, it suppresses error messages to the user.
async function refreshData({ silent = false } = {}) {
  try {
    const [items, txs] = await Promise.all([api.listItems(), api.listTransactions()]);
    inventory = items;
    transactions = txs;
    renderAll();
  } catch (err) {
    console.error(err);
    if (!silent) {
      showToast('Could not reach the server.');
    }
  }
}

/* ---------------------------------------------------------------------
   3. HELPER FUNCTIONS
   --------------------------------------------------------------------- */
// determines inventory status based on quantity levels
function statusOf(item) {
  if (item.qty <= 0) 
    return 'Out of Stock';
  if (item.qty <= item.minStock) 
    return 'Low Stock';
  return 'In Stock';
}
// returns the appropriate CSS class for a status badge based on its value
function statusBadgeClass(status) {
  if (status === 'Out of Stock') 
    return 'badge-out';
  if (status === 'Low Stock') 
    return 'badge-low';
  return 'badge-instock';
}
// displays bootstrap notifcation message
function showToast(msg) {
  document.getElementById('appToastBody').textContent = msg;
  new bootstrap.Toast(document.getElementById('appToast'), { delay: 2600 }).show();
}
// formats a date string into a more readable format Ex.) "Jan 1, 2024"
function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
// removes duplicates from an array and sorts the values alphabetically
function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/* ---------------------------------------------------------------------
   4. Dashboard Stats — total items, total units, low stock, out of stock
   --------------------------------------------------------------------- */
function renderStats() {
  const totalItems = inventory.length; //total # of unique items in inventory
  const totalUnits = inventory.reduce( //total # of units across all items in inventory
    (s, i) => s + i.qty, 0);
  const low = inventory.filter(i => statusOf(i) === 'Low Stock').length; //total # of items that are low in stock
  const out = inventory.filter(i => statusOf(i) === 'Out of Stock').length; //total # of items that are out of stock
//update dashboard stats
  document.getElementById('statTotalItems').textContent = totalItems; //update total items stat
  document.getElementById('statTotalUnits').textContent = totalUnits.toLocaleString(); //update total units stat with comma separators for thousands
  document.getElementById('statLow').textContent = low; //update low stock stat
  document.getElementById('statOut').textContent = out; //update out of stock stat
}

/* ---------------------------------------------------------------------
   5. CHARTS — category distribution, stock status distribution
   --------------------------------------------------------------------- */
let categoryChart, statusChart; // references to the Chart.js chart instances for category distribution and stock status distribution

function renderCharts() { //creates and updates dashboard charts
  if (typeof Chart === 'undefined') { //checks if Chart.js is loaded, if not logs a warning and skips chart rendering
    console.warn('Chart.js did not load (likely blocked by the network/CDN) — skipping charts.');
    return;
  }

  const catTotals = {}; //object to hold the total quantity of items per category
// iterate through the inventory and accumulate the total quantity for each category
  inventory.forEach(i => { 
    catTotals[i.category] = 
    (catTotals[i.category] || 0) + i.qty; 
  });
// convert category totals object into arrays of labels and values for Chart.js
  const catLabels = Object.keys(catTotals); //
  const catValues = Object.values(catTotals);
// calculate the counts of items in each stock status category (In Stock, Low Stock, Out of Stock)
  const statusCounts = { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0 };
  // iterate through the inventory and increment the count for each item's stock status
  inventory.forEach(i => statusCounts[statusOf(i)]++);

  const gridColor = 'rgba(255,255,255,.06)';
  const textColor = '#8B96A5';

  if (categoryChart) categoryChart.destroy(); //remove old chart before creating a new one preventing duplicates
// create a new bar chart for category distribution using Chart.js
  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'bar',
    data: { 
      labels: catLabels,
      datasets: [{ 
        data: catValues,
        backgroundColor: '#3FB8AF',
        borderRadius: 6,
        maxBarThickness: 42,
      }]
    },
    options: {
      responsive: true, //automatically adjusts chart size
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { display: false } }, // displays category 
        y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true } // displays quantity 
      }
    }
  });

  if (statusChart) statusChart.destroy(); // remove old chart before creating a new one preventing duplicates

  statusChart = new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#49B47D', '#F2A93B', '#E2574C'],
        borderColor: '#171D26',
        borderWidth: 3,
      }]
    },
    options: {
      responsive: true,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Inter', size: 12 }, boxWidth: 10, padding: 14 } }
      }
    }
  });
}

/* ---------------------------------------------------------------------
   6. FILTER OPTIONS — category, location, status
   --------------------------------------------------------------------- */
//creates and updates the filter dropdowns for category, location, and status based on the current inventory data
function renderFilterOptions() {
  //dropdown elements for category and location filters, and datalist elements for autocomplete suggestions
  const catSel = document.getElementById('filterCategory');
  const locSel = document.getElementById('filterLocation');
  const catList = document.getElementById('categoryList');
  const locList = document.getElementById('locationList');
 // get unique categories and locations from the inventory data, sorted alphabetically
  const cats = uniqueSorted(inventory.map(i => i.category));
  const locs = uniqueSorted(inventory.map(i => i.location));

  const prevCat = catSel.value, prevLoc = locSel.value;
  //build category and location filter dropdowns with an "All" option and the unique values from the inventory
  catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  locSel.innerHTML = '<option value="">All Locations</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');
//
  catSel.value = cats.includes(prevCat) ? prevCat : '';
  locSel.value = locs.includes(prevLoc) ? prevLoc : '';
 //
  catList.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  locList.innerHTML = locs.map(l => `<option value="${l}">`).join('');
}

/* ---------------------------------------------------------------------
   7. Inventory Table — filtering, sorting, rendering
   --------------------------------------------------------------------- */
//applies search,filters, and sorting to the inventory data and returns the resulting array of items to be displayed in the table
function getFilteredSorted() {
  // search query and filter values from the input fields
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  // filter values for category, location, and status from the dropdowns
  const fCat = document.getElementById('filterCategory').value;
  const fLoc = document.getElementById('filterLocation').value;
  const fStatus = document.getElementById('filterStatus').value;
//filter the inventory based on the search query and selected filters
  let rows = inventory.filter(i => { 
    //search by item name or ID, and filter by category, location, and status if specified
    const matchesQ = !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    const matchesCat = !fCat || i.category === fCat;
    const matchesLoc = !fLoc || i.location === fLoc;
    const matchesStatus = !fStatus || statusOf(i) === fStatus;
    return matchesQ && matchesCat && matchesLoc && matchesStatus;
  });
  //sort the filtered rows based on the selected sort key and direction
  rows.sort((a, b) => {
    //if 
    let av = sortKey === 'status' ? statusOf(a) : a[sortKey];
    let bv = sortKey === 'status' ? statusOf(b) : b[sortKey];
    if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
    if (av < bv) return -1 * sortDir;
    if (av > bv) return 1 * sortDir;
    return 0;
  });

  return rows;
}

function renderTable() {
  const rows = getFilteredSorted();
  const tbody = document.getElementById('inventoryBody');
  const empty = document.getElementById('emptyState');

  document.getElementById('resultCount').textContent = `${rows.length} item${rows.length === 1 ? '' : 's'}`;

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  tbody.innerHTML = rows.map(item => {
    const status = statusOf(item);
    return `
      <tr>
        <td>${item.id}</td>
        <td>
          <div class="item-name">${item.name}</div>
          <div class="item-cat">${item.category}</div>
        </td>
        <td>${item.location}</td>
        <td class="text-end qty-num">${item.qty}</td>
        <td class="text-end qty-num" style="color:var(--text-muted);">${item.minStock}</td>
        <td><span class="badge-status ${statusBadgeClass(status)}">${status}</span></td>
        <td class="text-end row-actions">
          <div class="btn-group">
            <button class="btn btn-outline-soft" title="Stock in" data-action="in" data-id="${item.id}"><i class="bi bi-box-arrow-in-down"></i></button>
            <button class="btn btn-outline-soft" title="Stock out" data-action="out" data-id="${item.id}"><i class="bi bi-box-arrow-up"></i></button>
            <button class="btn btn-outline-soft" title="Edit" data-action="edit" data-id="${item.id}"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-soft" title="Remove" data-action="delete" data-id="${item.id}"><i class="bi bi-trash3"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ---------------------------------------------------------------------
   8. RENDER: TRANSACTION LOG
   --------------------------------------------------------------------- */
function renderLog() {
  const list = document.getElementById('logList');
  const empty = document.getElementById('logEmpty');
  if (!transactions.length) {
    list.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');
  list.innerHTML = transactions.slice(0, 100).map(tx => `
    <div class="log-item ${tx.action === 'Removed' ? 'action-removed' : ''}">
      <div class="log-date">${formatDate(tx.date)}</div>
      <div><strong>${tx.action === 'Removed' ? '−' : '+'}${tx.qty}</strong> · ${tx.itemName}
        <span >(${tx.itemId})</span> at ${tx.location || '—'}
      </div>
      ${tx.note ? `<div class="log-note"><i class="bi bi-sticky"></i>${tx.note}</div>` : ''}
    </div>
  `).join('');
}

/* ---------------------------------------------------------------------
   9. MASTER RENDER
   --------------------------------------------------------------------- */
function renderAll() {
  try { renderStats(); } catch (e) { console.error('renderStats failed:', e); }
  try { renderCharts(); } catch (e) { console.error('renderCharts failed:', e); }
  try { renderFilterOptions(); } catch (e) { console.error('renderFilterOptions failed:', e); }
  try { renderTable(); } catch (e) { console.error('renderTable failed:', e); }
  try { renderLog(); } catch (e) { console.error('renderLog failed:', e); }
}

/* ---------------------------------------------------------------------
   10. EVENTS — filters / search / sort
   --------------------------------------------------------------------- */
['searchInput', 'filterCategory', 'filterLocation', 'filterStatus'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderTable);
  document.getElementById(id).addEventListener('change', renderTable);
});

document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) { sortDir *= -1; } else { sortKey = key; sortDir = 1; }
    renderTable();
  });
});

/* ---------------------------------------------------------------------
   11. EVENTS — tabs
   --------------------------------------------------------------------- */
document.getElementById('viewTabs').addEventListener('click', e => {
  const btn = e.target.closest('.nav-link');
  if (!btn) return;
  document.querySelectorAll('#viewTabs .nav-link').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentView = btn.dataset.view;
  document.getElementById('view-inventory').classList.toggle('d-none', currentView !== 'inventory');
  document.getElementById('view-log').classList.toggle('d-none', currentView !== 'log');
});

/* ---------------------------------------------------------------------
   12. ADD / EDIT ITEM MODAL
   --------------------------------------------------------------------- */
const itemModalEl = document.getElementById('itemModal');
const itemModal = new bootstrap.Modal(itemModalEl);

document.getElementById('openAddBtn').addEventListener('click', () => {
  document.getElementById('itemForm').reset();
  document.getElementById('itemEditId').value = '';
  document.getElementById('itemModalTitle').textContent = 'Add Item';
  document.getElementById('itemSubmitBtn').textContent = 'Add Item';
  document.getElementById('itemQty').value = 0;
  document.getElementById('itemMinStock').value = 10;
});

document.getElementById('itemForm').addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = document.getElementById('itemSubmitBtn');
  const editId = document.getElementById('itemEditId').value;
  const name = document.getElementById('itemName').value.trim();
  const category = document.getElementById('itemCategory').value.trim();
  const location = document.getElementById('itemLocation').value.trim();
  const qty = parseInt(document.getElementById('itemQty').value, 10) || 0;
  const minStock = parseInt(document.getElementById('itemMinStock').value, 10) || 0;

  submitBtn.disabled = true;
  try {
    if (editId) {
      await api.updateItem(editId, { name, category, location, qty, minStock });
      showToast(`${name} updated.`);
    } else {
      await api.createItem({ name, category, location, qty, minStock });
      showToast(`${name} added to inventory.`);
    }
    itemModal.hide();
    await refreshData();
  } catch (err) {
    showToast(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------------
   13. STOCK IN / OUT MODAL
   --------------------------------------------------------------------- */
const stockModalEl = document.getElementById('stockModal');
const stockModal = new bootstrap.Modal(stockModalEl);

function openStockModal(id, action) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  document.getElementById('stockItemId').value = id;
  document.getElementById('stockAction').value = action;
  document.getElementById('stockItemName').textContent = item.name;
  document.getElementById('stockItemQty').textContent = item.qty;
  document.getElementById('stockModalTitle').textContent = action === 'in' ? 'Stock In' : 'Stock Out';
  document.getElementById('stockSubmitBtn').textContent = action === 'in' ? 'Add Stock' : 'Remove Stock';
  document.getElementById('stockForm').reset();
  document.getElementById('stockQty').value = 1;
  stockModal.show();
}

document.getElementById('stockForm').addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = document.getElementById('stockSubmitBtn');
  const id = document.getElementById('stockItemId').value;
  const action = document.getElementById('stockAction').value;
  const qty = parseInt(document.getElementById('stockQty').value, 10) || 0;
  const note = document.getElementById('stockNote').value.trim();
  const item = inventory.find(i => i.id === id);
  if (!item || qty <= 0) return;

  submitBtn.disabled = true;
  try {
    await api.stockMove(id, { action, qty, note });
    showToast(`${action === 'in' ? 'Added' : 'Removed'} ${qty} × ${item.name}.`);
    stockModal.hide();
    await refreshData();
  } catch (err) {
    showToast(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------------
   14. DELETE MODAL
   --------------------------------------------------------------------- */
const deleteModalEl = document.getElementById('deleteModal');
const deleteModal = new bootstrap.Modal(deleteModalEl);
let pendingDeleteId = null;

function openDeleteModal(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  pendingDeleteId = id;
  document.getElementById('deleteItemName').textContent = item.name;
  deleteModal.show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const item = inventory.find(i => i.id === pendingDeleteId);
  try {
    await api.deleteItem(pendingDeleteId);
    showToast(`${item ? item.name : 'Item'} removed.`);
  } catch (err) {
    showToast(err.message);
  } finally {
    pendingDeleteId = null;
    deleteModal.hide();
    await refreshData();
  }
});

/* ---------------------------------------------------------------------
   15. ROW ACTION CLICKS (edit / delete / stock in / stock out)
   --------------------------------------------------------------------- */
document.getElementById('inventoryBody').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'in' || action === 'out') return openStockModal(id, action);
  if (action === 'delete') return openDeleteModal(id);
  if (action === 'edit') {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    document.getElementById('itemEditId').value = item.id;
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('itemSubmitBtn').textContent = 'Save Changes';
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemCategory').value = item.category;
    document.getElementById('itemLocation').value = item.location;
    document.getElementById('itemQty').value = item.qty;
    document.getElementById('itemMinStock').value = item.minStock;
    itemModal.show();
  }
});

/* ---------------------------------------------------------------------
   16. CSV EXPORT
   --------------------------------------------------------------------- */
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const header = ['Item_ID', 'Item_Name', 'Category', 'Location', 'Current_Qty', 'Minimum_Stock', 'Status'];
  const rows = inventory.map(i => [i.id, i.name, i.category, i.location, i.qty, i.minStock, statusOf(i)]);
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `peripheral-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

/* ---------------------------------------------------------------------
   17. AUTO-REFRESH — pick up changes made by other users every 15s
   --------------------------------------------------------------------- */
setInterval(() => refreshData({ silent: true }), 15000);

/* ---------------------------------------------------------------------
   18. INIT
   --------------------------------------------------------------------- */
refreshData();
