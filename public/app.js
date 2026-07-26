/* =========================================================================
   PeriphTrack — Peripheral Inventory Tracker (front-end)
   Talks to the Express + MongoDB API running on this same server
   (see server.js / routes/items.js / routes/transactions.js).
   ========================================================================= */

const API_BASE = '/api';

/* ---------------------------------------------------------------------
   1. API LAYER — real fetch() calls to the Express backend
   --------------------------------------------------------------------- */
async function handleResponse(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { const body = await res.json(); if (body.error) msg = body.error; } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

const api = {
  async listItems() {
    return handleResponse(await fetch(`${API_BASE}/items`));
  },
  async listTransactions() {
    return handleResponse(await fetch(`${API_BASE}/transactions`));
  },
  async createItem(item) {
    return handleResponse(await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }));
  },
  async updateItem(id, patch) {
    return handleResponse(await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }));
  },
  async deleteItem(id) {
    return handleResponse(await fetch(`${API_BASE}/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }));
  },
  async stockMove(id, { action, qty, note }) {
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
let inventory = [];
let transactions = [];
let sortKey = 'id';
let sortDir = 1;
let currentView = 'inventory';

async function refreshData({ silent = false } = {}) {
  try {
    const [items, txs] = await Promise.all([api.listItems(), api.listTransactions()]);
    inventory = items;
    transactions = txs;
    renderAll();
  } catch (err) {
    console.error(err);
    if (!silent) {
      showToast('Could not reach the server. Is `npm start` running and is MongoDB up?');
    }
  }
}

/* ---------------------------------------------------------------------
   3. HELPERS
   --------------------------------------------------------------------- */
function statusOf(item) {
  if (item.qty <= 0) return 'Out of Stock';
  if (item.qty <= item.minStock) return 'Low Stock';
  return 'In Stock';
}
function statusBadgeClass(status) {
  if (status === 'Out of Stock') return 'badge-out';
  if (status === 'Low Stock') return 'badge-low';
  return 'badge-instock';
}

function showToast(msg) {
  document.getElementById('appToastBody').textContent = msg;
  new bootstrap.Toast(document.getElementById('appToast'), { delay: 2600 }).show();
}
function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/* ---------------------------------------------------------------------
   4. RENDER: STAT CARDS
   --------------------------------------------------------------------- */
function renderStats() {
  const totalItems = inventory.length;
  const totalUnits = inventory.reduce((s, i) => s + i.qty, 0);
  const low = inventory.filter(i => statusOf(i) === 'Low Stock').length;
  const out = inventory.filter(i => statusOf(i) === 'Out of Stock').length;

  document.getElementById('statTotalItems').textContent = totalItems;
  document.getElementById('statTotalUnits').textContent = totalUnits.toLocaleString();
  document.getElementById('statLow').textContent = low;
  document.getElementById('statOut').textContent = out;
}

/* ---------------------------------------------------------------------
   5. RENDER: CHARTS
   --------------------------------------------------------------------- */
let categoryChart, statusChart;
function renderCharts() {
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js did not load (likely blocked by the network/CDN) — skipping charts.');
    return;
  }
  const catTotals = {};
  inventory.forEach(i => { catTotals[i.category] = (catTotals[i.category] || 0) + i.qty; });
  const catLabels = Object.keys(catTotals);
  const catValues = Object.values(catTotals);

  const statusCounts = { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0 };
  inventory.forEach(i => statusCounts[statusOf(i)]++);

  const gridColor = 'rgba(255,255,255,.06)';
  const textColor = '#8B96A5';

  if (categoryChart) categoryChart.destroy();
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
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: textColor, font: { family: 'Inter' } }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });

  if (statusChart) statusChart.destroy();
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
   6. RENDER: FILTER DROPDOWNS
   --------------------------------------------------------------------- */
function renderFilterOptions() {
  const catSel = document.getElementById('filterCategory');
  const locSel = document.getElementById('filterLocation');
  const catList = document.getElementById('categoryList');
  const locList = document.getElementById('locationList');

  const cats = uniqueSorted(inventory.map(i => i.category));
  const locs = uniqueSorted(inventory.map(i => i.location));

  const prevCat = catSel.value, prevLoc = locSel.value;
  catSel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  locSel.innerHTML = '<option value="">All Locations</option>' + locs.map(l => `<option value="${l}">${l}</option>`).join('');
  catSel.value = cats.includes(prevCat) ? prevCat : '';
  locSel.value = locs.includes(prevLoc) ? prevLoc : '';

  catList.innerHTML = cats.map(c => `<option value="${c}">`).join('');
  locList.innerHTML = locs.map(l => `<option value="${l}">`).join('');
}

/* ---------------------------------------------------------------------
   7. RENDER: TABLE
   --------------------------------------------------------------------- */
function getFilteredSorted() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const fCat = document.getElementById('filterCategory').value;
  const fLoc = document.getElementById('filterLocation').value;
  const fStatus = document.getElementById('filterStatus').value;

  let rows = inventory.filter(i => {
    const matchesQ = !q || i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
    const matchesCat = !fCat || i.category === fCat;
    const matchesLoc = !fLoc || i.location === fLoc;
    const matchesStatus = !fStatus || statusOf(i) === fStatus;
    return matchesQ && matchesCat && matchesLoc && matchesStatus;
  });

  rows.sort((a, b) => {
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
