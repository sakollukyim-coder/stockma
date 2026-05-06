const state = {
  items: [],
  categories: [],
  transactions: [],
  thresholds: { high: 80, low: 30, stale: 90 },
  currentStatusFilter: 'all',
  currentCatFilter: '',
  currentTxFilter: 'all',
  searchQuery: ''
};

function initApp() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => showPage(item.dataset.page));
  });
  window.addEventListener('click', event => {
    if (!event.target.closest('#export-btn') && !event.target.closest('#export-menu')) {
      document.getElementById('export-menu').style.display = 'none';
    }
  });
  loadData();
}

async function loadData() {
  try {
    const [categories, items, transactions, settings] = await Promise.all([
      apiGet('/api/categories'),
      apiGet('/api/items'),
      apiGet('/api/transactions'),
      apiGet('/api/settings')
    ]);
    state.categories = categories;
    state.items = items;
    state.transactions = transactions;
    state.thresholds = settings;
    renderAll();
  } catch (err) {
    showToast('error', 'โหลดข้อมูลไม่สำเร็จ');
    console.error(err);
  }
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPut(url, body) {
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderAll() {
  renderSidebarCategories();
  renderCategorySelect();
  renderDashboard();
  renderStockTable();
  renderTxTable();
  renderAlerts();
  renderThresholds();
  updateLastUpdate();
}

function renderSidebarCategories() {
  const html = state.categories.map(cat => `
    <div class="nav-item" onclick="filterByCategory('${cat.name}')">
      <span class="icon">${cat.icon}</span>${cat.label}
    </div>`).join('');
  document.getElementById('sidebar-cats').innerHTML = html;
  const catManage = state.categories.map(cat => `
    <div class="form-group">
      <label>${cat.icon} ${cat.name}</label>
      <div class="text-sm">${cat.label}</div>
    </div>`).join('');
  document.getElementById('cat-manage-list').innerHTML = catManage || '<div class="empty">ยังไม่มีหมวดหมู่</div>';
}

function renderCategorySelect() {
  const select = document.getElementById('cat-filter');
  select.innerHTML = '<option value="">ทุกหมวดหมู่</option>' + state.categories.map(cat => `<option value="${cat.name}">${cat.label}</option>`).join('');
}

function getStatus(item) {
  if (item.qty === 0) return 'out';
  const high = item.threshHigh ?? state.thresholds.high;
  const low = item.threshLow ?? state.thresholds.low;
  const pct = item.max ? (item.qty / item.max) * 100 : 0;
  if (pct >= high) return 'high';
  if (pct <= low) return 'low';
  return 'ok';
}

function getStatusLabel(status) {
  return { high: 'มากเกินไป', ok: 'ปกติ', low: 'ใกล้หมด', out: 'หมด' }[status] || 'ไม่ระบุ';
}

function daysSince(date) {
  if (!date) return 9999;
  return Math.floor((new Date() - new Date(date)) / 86400000);
}

function isStale(item) {
  if (item.qty === 0) return false;
  return daysSince(item.lastIn) > state.thresholds.stale || daysSince(item.lastOut) > state.thresholds.stale;
}

function filterItems() {
  return state.items.filter(item => {
    const status = getStatus(item);
    if (state.currentStatusFilter !== 'all' && status !== state.currentStatusFilter) return false;
    if (state.currentCatFilter && item.category !== state.currentCatFilter) return false;
    if (state.searchQuery && !item.name.toLowerCase().includes(state.searchQuery.toLowerCase()) && !item.category.toLowerCase().includes(state.searchQuery.toLowerCase())) return false;
    return true;
  });
}

function renderDashboard() {
  const total = state.items.length;
  const counts = state.items.reduce((acc, item) => {
    const status = getStatus(item);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-high').textContent = counts.high || 0;
  document.getElementById('stat-low').textContent = counts.low || 0;
  document.getElementById('stat-out').textContent = counts.out || 0;
  document.getElementById('badge-stock').textContent = total;
  const alerts = state.items.filter(item => item.qty === 0 || getStatus(item) === 'low' || isStale(item));
  document.getElementById('badge-alerts').textContent = alerts.length || '';
  renderRecentMovements();
  renderCategoryChart();
}

function renderCategoryChart() {
  const categoryMap = {};
  state.items.forEach(item => {
    categoryMap[item.category] = (categoryMap[item.category] || 0) + item.qty;
  });
  const data = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1]);
  const max = data[0]?.[1] || 1;
  document.getElementById('category-chart').innerHTML = data.length ? `
    <div class="chart-bar">
      ${data.map(([category, value]) => `
        <div class="bar" style="height:${Math.max(6, (value / max) * 100)}%; background:${getCategoryColor(category)}" title="${category}: ${value}"></div>
      `).join('')}
    </div>
    <div class="text-sm">${data.map(([category, value]) => `${category}: ${value}`).join(' • ')}</div>
  ` : '<div class="empty">ไม่มีข้อมูลหมวดหมู่</div>';
}

function getCategoryColor(category) {
  const mapping = {
    'PC ใส': 'var(--accent2)',
    'สต็อคกลาง': 'var(--yellow)',
    'กึ่งสำเร็จ': 'var(--orange)',
    'อาลู่': 'var(--cyan)',
    'ผ้าเช็ดแว่น': 'var(--purple)',
    'รองเท้า': 'var(--green)',
    'กล่องพัสดุ': 'var(--text2)'
  };
  return mapping[category] || 'var(--surface3)';
}

function renderRecentMovements() {
  const recent = state.transactions.slice(0, 5);
  const html = recent.map(tx => {
    const item = state.items.find(i => i.id === tx.itemId) || { name: 'ไม่ระบุ' };
    return `<tr>
      <td>${tx.date}</td>
      <td class="${tx.type === 'in' ? 'tx-in' : 'tx-out'}">${tx.type === 'in' ? 'เข้า' : 'ออก'}</td>
      <td>${item.name}</td>
      <td>${tx.qty}</td>
      <td>${tx.recorder}</td>
      <td>${tx.note}</td>
    </tr>`;
  }).join('');
  document.getElementById('recent-movements').innerHTML = html || '<tr><td colspan="6" class="empty">ยังไม่มีรายการเคลื่อนไหว</td></tr>';
}

function renderStockTable() {
  const rows = filterItems().map((item, index) => {
    const status = getStatus(item);
    return `<tr>
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${item.unit}</td>
      <td>${item.qty} / ${item.max}</td>
      <td>${item.min}</td>
      <td>${item.max}</td>
      <td><span class="status ${status}">${getStatusLabel(status)}</span></td>
      <td>${isStale(item) ? 'ค้างนาน' : '-'}</td>
      <td class="action-btns">
        <button class="btn sm" onclick="openModal('edit-item', ${item.id})">แก้ไข</button>
        <button class="btn danger sm" onclick="deleteItem(${item.id})">ลบ</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('stock-table').innerHTML = rows || '<tr><td colspan="10" class="empty">ไม่พบสินค้าที่ตรงกับเงื่อนไข</td></tr>';
}

function renderTxTable() {
  const filtered = state.transactions.filter(tx => state.currentTxFilter === 'all' || tx.type === state.currentTxFilter);
  const html = filtered.map(tx => {
    const item = state.items.find(i => i.id === tx.itemId) || { name: 'ไม่ระบุ', category: '-' };
    return `<tr>
      <td>${tx.date}</td>
      <td class="${tx.type === 'in' ? 'tx-in' : 'tx-out'}">${tx.type === 'in' ? 'เข้า' : 'ออก'}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${tx.qty}</td>
      <td>${tx.recorder}</td>
      <td>${tx.party}</td>
      <td>${tx.note}</td>
    </tr>`;
  }).join('');
  document.getElementById('tx-table').innerHTML = html || '<tr><td colspan="8" class="empty">ยังไม่มีรายการเข้า-ออก</td></tr>';
  document.getElementById('tx-summary').textContent = `แสดง ${filtered.length} รายการ`; 
}

function renderAlerts() {
  const alerts = state.items.filter(item => item.qty === 0 || getStatus(item) === 'low' || isStale(item));
  const html = alerts.map(item => `
    <div class="alert ${item.qty === 0 ? 'danger' : isStale(item) ? 'warn' : 'info'}">
      <strong>${item.name}</strong> (${item.category}) - สถานะ ${getStatusLabel(getStatus(item))} ${item.qty === 0 ? 'หมดสต็อคแล้ว' : isStale(item) ? 'ค้างนาน' : ''}
    </div>
  `).join('');
  document.getElementById('alerts-content').innerHTML = html || '<div class="empty">ไม่มีการแจ้งเตือน</div>';
}

function renderThresholds() {
  document.getElementById('thresh-high').value = state.thresholds.high;
  document.getElementById('thresh-low').value = state.thresholds.low;
  document.getElementById('thresh-stale').value = state.thresholds.stale;
  previewThreshold();
}

function updateLastUpdate() {
  document.getElementById('last-update').textContent = new Date().toLocaleString('th-TH');
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(node => node.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(node => node.classList.toggle('active', node.dataset.page === page));
  document.getElementById('page-title').textContent = page === 'dashboard' ? 'Dashboard' : page === 'stock' ? 'รายการสต็อค' : page === 'movements' ? 'เข้า-ออกสต็อค' : page === 'alerts' ? 'การแจ้งเตือน' : 'ตั้งค่าระบบ';
}

function filterStatus(value, buttonIndex) {
  state.currentStatusFilter = value;
  document.querySelectorAll('#status-filter .filter-tab').forEach((btn, index) => btn.classList.toggle('active', index === buttonIndex));
  renderStockTable();
}

function filterTx(type, element) {
  state.currentTxFilter = type;
  document.querySelectorAll('#page-movements .filter-tab').forEach(btn => btn.classList.toggle('active', btn === element));
  renderTxTable();
}

function filterByCategory(category) {
  state.currentCatFilter = category;
  document.getElementById('cat-filter').value = category;
  document.querySelectorAll('#status-filter .filter-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelector('#status-filter .filter-tab:first-child').classList.add('active');
  state.currentStatusFilter = 'all';
  showPage('stock');
  renderStockTable();
}

function globalSearch(value) {
  state.searchQuery = value;
  renderStockTable();
}

function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

function showModal(title, bodyHtml, actions = '') {
  const modalBody = document.getElementById('modal-body');
  modalBody.innerHTML = `
    <div class="modal-title">
      <span>${title}</span>
      <span class="modal-close" onclick="closeModal()">×</span>
    </div>
    ${bodyHtml}
    <div class="modal-actions">${actions}</div>
  `;
  document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

function openModal(type, itemId) {
  if (type === 'add-item' || type === 'edit-item') {
    const item = state.items.find(i => i.id === itemId) || {};
    showModal(`+ เพิ่มรายการใหม่`, `
      <div class="form-group"><label>ชื่อสินค้า</label><input id="item-name" value="${item.name || ''}"></div>
      <div class="form-group"><label>หมวดหมู่</label><select id="item-category">${state.categories.map(cat => `<option value="${cat.name}" ${item.category === cat.name ? 'selected' : ''}>${cat.label}</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>หน่วย</label><input id="item-unit" value="${item.unit || 'ชิ้น'}"></div>
        <div class="form-group"><label>จำนวน</label><input type="number" id="item-qty" value="${item.qty ?? 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Min</label><input type="number" id="item-min" value="${item.min ?? 0}"></div>
        <div class="form-group"><label>Max</label><input type="number" id="item-max" value="${item.max ?? 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Last In</label><input type="date" id="item-last-in" value="${item.lastIn || ''}"></div>
        <div class="form-group"><label>Last Out</label><input type="date" id="item-last-out" value="${item.lastOut || ''}"></div>
      </div>
    `, `
      <button class="btn" onclick="closeModal()">ยกเลิก</button>
      <button class="btn primary" onclick="saveItem(${itemId || 0})">บันทึก</button>
    `);
  }
  if (type === 'in' || type === 'out') {
    const quantityType = type === 'in' ? 'เข้า' : 'ออก';
    showModal(`${quantityType} สต็อค`, `
      <div class="form-group"><label>สินค้า</label><select id="tx-item">${state.items.map(item => `<option value="${item.id}">${item.name} (${item.category})</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="form-group"><label>วันที่</label><input type="date" id="tx-date" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label>จำนวน</label><input type="number" id="tx-qty" value="1"></div>
      </div>
      <div class="form-group"><label>ผู้บันทึก</label><input id="tx-recorder" value="ระบบ"></div>
      <div class="form-group"><label>ผู้จัดส่ง / ร้านค้า</label><input id="tx-party" value=""></div>
      <div class="form-group"><label>หมายเหตุ</label><textarea id="tx-note"></textarea></div>
    `, `
      <button class="btn" onclick="closeModal()">ยกเลิก</button>
      <button class="btn primary" onclick="saveTransaction('${type}')">บันทึก</button>
    `);
  }
  if (type === 'add-cat') {
    showModal('เพิ่มหมวดหมู่ใหม่', `
      <div class="form-group"><label>ชื่อหมวดหมู่</label><input id="cat-name"></div>
      <div class="form-group"><label>ไอคอน</label><input id="cat-icon" placeholder="เช่น 📦"></div>
      <div class="form-group"><label>คำอธิบาย</label><input id="cat-label"></div>
    `, `
      <button class="btn" onclick="closeModal()">ยกเลิก</button>
      <button class="btn primary" onclick="saveCategory()">บันทึก</button>
    `);
  }
}

async function saveItem(itemId) {
  try {
    const item = {
      name: document.getElementById('item-name').value.trim(),
      category: document.getElementById('item-category').value,
      unit: document.getElementById('item-unit').value.trim(),
      qty: Number(document.getElementById('item-qty').value),
      min: Number(document.getElementById('item-min').value),
      max: Number(document.getElementById('item-max').value),
      lastIn: document.getElementById('item-last-in').value || null,
      lastOut: document.getElementById('item-last-out').value || null
    };
    if (!item.name || !item.category) return showToast('error', 'กรุณากรอกชื่อสินค้าและหมวดหมู่');
    if (itemId) {
      await apiPut(`/api/items/${itemId}`, item);
      showToast('success', 'อัปเดตสินค้าสำเร็จ');
    } else {
      await apiPost('/api/items', item);
      showToast('success', 'เพิ่มสินค้าสำเร็จ');
    }
    closeModal();
    await loadData();
  } catch (err) {
    showToast('error', 'บันทึกสินค้าล้มเหลว');
    console.error(err);
  }
}

async function saveTransaction(type) {
  try {
    const transaction = {
      date: document.getElementById('tx-date').value,
      type,
      itemId: Number(document.getElementById('tx-item').value),
      qty: Number(document.getElementById('tx-qty').value),
      recorder: document.getElementById('tx-recorder').value,
      party: document.getElementById('tx-party').value,
      note: document.getElementById('tx-note').value
    };
    if (!transaction.date || !transaction.qty || !transaction.itemId) return showToast('error', 'กรุณากรอกข้อมูลให้ครบ');
    await apiPost('/api/transactions', transaction);
    showToast('success', 'บันทึกการเคลื่อนไหวสำเร็จ');
    closeModal();
    await loadData();
  } catch (err) {
    showToast('error', 'บันทึกการเคลื่อนไหวล้มเหลว');
    console.error(err);
  }
}

async function saveCategory() {
  try {
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim() || '📦';
    const label = document.getElementById('cat-label').value.trim() || name;
    if (!name) return showToast('error', 'กรุณากรอกชื่อหมวดหมู่');
    await apiPost('/api/categories', { name, icon, label });
    showToast('success', 'เพิ่มหมวดหมู่สำเร็จ');
    closeModal();
    await loadData();
  } catch (err) {
    showToast('error', 'เพิ่มหมวดหมู่ล้มเหลว');
    console.error(err);
  }
}

async function deleteItem(id) {
  if (!confirm('ต้องการลบสินค้านี้จริงหรือไม่?')) return;
  try {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    showToast('success', 'ลบสินค้าสำเร็จ');
    await loadData();
  } catch (err) {
    showToast('error', 'ลบสินค้าล้มเหลว');
    console.error(err);
  }
}

function previewThreshold() {
  const high = Number(document.getElementById('thresh-high').value);
  const low = Number(document.getElementById('thresh-low').value);
  const stale = Number(document.getElementById('thresh-stale').value);
  document.getElementById('threshold-preview').textContent = `เกณฑ์ปัจจุบัน: มากเกินไป ≥ ${high}% , ใกล้หมด ≤ ${low}% , ค้างสต็อคนาน > ${stale} วัน`;
}

async function saveThresholds() {
  try {
    const high = Number(document.getElementById('thresh-high').value);
    const low = Number(document.getElementById('thresh-low').value);
    const stale = Number(document.getElementById('thresh-stale').value);
    await apiPut('/api/settings', { high, low, stale });
    showToast('success', 'บันทึกเกณฑ์เรียบร้อย');
    await loadData();
  } catch (err) {
    showToast('error', 'บันทึกเกณฑ์ล้มเหลว');
    console.error(err);
  }
}

function showToast(type, text) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = text;
  document.getElementById('toast-wrap').appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function downloadCSV(type) {
  let rows = [];
  if (type === 'items') {
    rows = [['ID', 'ชื่อสินค้า', 'หมวดหมู่', 'หน่วย', 'qty', 'min', 'max', 'lastIn', 'lastOut']].concat(
      state.items.map(item => [item.id, item.name, item.category, item.unit, item.qty, item.min, item.max, item.lastIn || '', item.lastOut || ''])
    );
  } else {
    rows = [['ID', 'วันที่', 'ประเภท', 'itemId', 'qty', 'recorder', 'party', 'note']].concat(
      state.transactions.map(tx => [tx.id, tx.date, tx.type, tx.itemId, tx.qty, tx.recorder, tx.party, tx.note])
    );
  }
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
