const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');

const contentTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain'
};

const seedData = {
  categories: [
    { id: 1, name: 'PC ใส', icon: '🔵', label: 'PC ใส (แผ่นใส)' },
    { id: 2, name: 'สต็อคกลาง', icon: '🟡', label: 'สต็อคกลาง' },
    { id: 3, name: 'กึ่งสำเร็จ', icon: '🟠', label: 'กึ่งสำเร็จรูป' },
    { id: 4, name: 'อาลู่', icon: '🔷', label: 'อาลู่' },
    { id: 5, name: 'ผ้าเช็ดแว่น', icon: '🟣', label: 'ผ้าเช็ดแว่น' },
    { id: 6, name: 'รองเท้า', icon: '👟', label: 'รองเท้า' },
    { id: 7, name: 'กล่องพัสดุ', icon: '📫', label: 'กล่องพัสดุ' }
  ],
  items: [
    { id: 1, name: 'PC ใส ขาว', category: 'PC ใส', unit: 'ใบ', qty: 5076, min: 1000, max: 20000, lastIn: '2026-02-01', lastOut: '2026-02-03', threshHigh: null, threshLow: null },
    { id: 2, name: 'PC ใส เทา', category: 'PC ใส', unit: 'ใบ', qty: 5341, min: 1000, max: 20000, lastIn: '2026-02-01', lastOut: '2026-02-03', threshHigh: null, threshLow: null },
    { id: 3, name: 'A02/1', category: 'สต็อคกลาง', unit: 'โหล', qty: 213, min: 50, max: 500, lastIn: '2026-01-15', lastOut: '2026-01-20', threshHigh: null, threshLow: null },
    { id: 4, name: 'A15', category: 'สต็อคกลาง', unit: 'โหล', qty: 120, min: 50, max: 400, lastIn: '2026-01-15', lastOut: '2026-01-18', threshHigh: null, threshLow: null },
    { id: 5, name: 'A04 ดำ (กึ่งสำเร็จ)', category: 'กึ่งสำเร็จ', unit: 'ใบ', qty: 1800, min: 500, max: 5000, lastIn: '2026-01-15', lastOut: '2026-01-20', threshHigh: null, threshLow: null },
    { id: 6, name: 'A02/1 Moris (อาลู่)', category: 'อาลู่', unit: 'โหล', qty: 179, min: 30, max: 300, lastIn: '2026-01-15', lastOut: '2026-01-20', threshHigh: null, threshLow: null },
    { id: 7, name: 'ผ้าสักหลาด 15x18 คละสี', category: 'ผ้าเช็ดแว่น', unit: 'กล่อง', qty: 320, min: 50, max: 500, lastIn: '2026-01-15', lastOut: '2026-02-05', threshHigh: null, threshLow: null },
    { id: 8, name: 'รองเท้าบำรุงราษฎร์ XXL', category: 'รองเท้า', unit: 'คู่', qty: 641, min: 100, max: 2000, lastIn: '2026-01-15', lastOut: '2026-01-25', threshHigh: null, threshLow: null },
    { id: 9, name: 'ลัง SC สั้น', category: 'กล่องพัสดุ', unit: 'ใบ', qty: 20, min: 50, max: 500, lastIn: '2026-01-15', lastOut: '2026-02-05', threshHigh: null, threshLow: null }
  ],
  transactions: [
    { id: 1, date: '2026-02-05', type: 'in', itemId: 9, qty: 750, recorder: 'ระบบ', party: 'PD904037', note: 'รับเข้าจากซัพพลายเออร์' },
    { id: 2, date: '2026-02-05', type: 'out', itemId: 7, qty: 10, recorder: 'ออนไลน์', party: 'ออนไลน์', note: 'จ่ายให้ออนไลน์' },
    { id: 3, date: '2026-02-05', type: 'out', itemId: 8, qty: 150, recorder: 'ระบบ', party: 'พี่เชษร์', note: 'พี่เชษร์เบิก' }
  ],
  settings: { high: 80, low: 30, stale: 90 }
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(seedData, null, 2), 'utf8');
  }
}

function loadData() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end(text);
}

function sendStatic(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return sendText(res, 404, 'Not found');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getNextId(collection) {
  return collection.length ? Math.max(...collection.map(item => item.id)) + 1 : 1;
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/favicon.ico') {
    return sendText(res, 404, 'Not found');
  }

  if (pathname.startsWith('/api/')) {
    if (req.method === 'OPTIONS') {
      return sendJson(res, 204, {});
    }

    try {
      const data = loadData();
      const method = req.method;

      if (pathname === '/api/categories' && method === 'GET') {
        return sendJson(res, 200, data.categories);
      }

      if (pathname === '/api/categories' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name) return sendJson(res, 400, { error: 'ชื่อหมวดหมู่ต้องระบุ' });
        const category = {
          id: getNextId(data.categories),
          name: body.name,
          icon: body.icon || '📦',
          label: body.label || body.name
        };
        data.categories.push(category);
        saveData(data);
        return sendJson(res, 201, category);
      }

      if (pathname === '/api/items' && method === 'GET') {
        return sendJson(res, 200, data.items);
      }

      if (pathname === '/api/items' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.name || !body.category) return sendJson(res, 400, { error: 'ชื่อสินค้าและหมวดหมู่ต้องระบุ' });
        const item = {
          id: getNextId(data.items),
          name: body.name,
          category: body.category,
          unit: body.unit || 'ชิ้น',
          qty: Number(body.qty || 0),
          min: Number(body.min || 0),
          max: Number(body.max || 0),
          lastIn: body.lastIn || null,
          lastOut: body.lastOut || null,
          threshHigh: body.threshHigh == null ? null : Number(body.threshHigh),
          threshLow: body.threshLow == null ? null : Number(body.threshLow)
        };
        data.items.push(item);
        saveData(data);
        return sendJson(res, 201, item);
      }

      if (pathname.match(/^\/api\/items\/\d+$/) && method === 'PUT') {
        const id = Number(pathname.split('/').pop());
        const body = await parseBody(req);
        const item = data.items.find(i => i.id === id);
        if (!item) return sendJson(res, 404, { error: 'ไม่พบสินค้านี้' });
        item.name = body.name || item.name;
        item.category = body.category || item.category;
        item.unit = body.unit || item.unit;
        item.qty = Number(body.qty ?? item.qty);
        item.min = Number(body.min ?? item.min);
        item.max = Number(body.max ?? item.max);
        item.lastIn = body.lastIn || item.lastIn;
        item.lastOut = body.lastOut || item.lastOut;
        item.threshHigh = body.threshHigh == null ? item.threshHigh : Number(body.threshHigh);
        item.threshLow = body.threshLow == null ? item.threshLow : Number(body.threshLow);
        saveData(data);
        return sendJson(res, 200, item);
      }

      if (pathname.match(/^\/api\/items\/\d+$/) && method === 'DELETE') {
        const id = Number(pathname.split('/').pop());
        const index = data.items.findIndex(i => i.id === id);
        if (index === -1) return sendJson(res, 404, { error: 'ไม่พบสินค้านี้' });
        data.items.splice(index, 1);
        saveData(data);
        return sendJson(res, 200, { success: true });
      }

      if (pathname === '/api/transactions' && method === 'GET') {
        const sorted = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));
        return sendJson(res, 200, sorted);
      }

      if (pathname === '/api/transactions' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.date || !body.type || !body.itemId || !body.qty) {
          return sendJson(res, 400, { error: 'ข้อมูลรายการเข้า-ออกไม่ครบ' });
        }
        const item = data.items.find(i => i.id === Number(body.itemId));
        if (!item) return sendJson(res, 404, { error: 'ไม่พบสินค้านี้' });
        const tx = {
          id: getNextId(data.transactions),
          date: body.date,
          type: body.type,
          itemId: Number(body.itemId),
          qty: Number(body.qty),
          recorder: body.recorder || 'ระบบ',
          party: body.party || '',
          note: body.note || ''
        };
        data.transactions.push(tx);
        if (body.type === 'in') {
          item.qty += tx.qty;
          item.lastIn = tx.date;
        } else {
          item.qty -= tx.qty;
          if (item.qty < 0) item.qty = 0;
          item.lastOut = tx.date;
        }
        saveData(data);
        return sendJson(res, 201, tx);
      }

      if (pathname === '/api/settings' && method === 'GET') {
        return sendJson(res, 200, data.settings);
      }

      if (pathname === '/api/settings' && method === 'PUT') {
        const body = await parseBody(req);
        if (body.high !== undefined) data.settings.high = Number(body.high);
        if (body.low !== undefined) data.settings.low = Number(body.low);
        if (body.stale !== undefined) data.settings.stale = Number(body.stale);
        saveData(data);
        return sendJson(res, 200, data.settings);
      }

      return sendJson(res, 404, { error: 'ไม่พบ API นี้' });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, { error: err.message });
    }
  }

  let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendText(res, 403, 'Forbidden');
  }
  sendStatic(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  console.log(`\n✓ Stock manager server running`);
  console.log(`  Local:   http://localhost:${PORT}`);
  if (addresses.length > 0) {
    console.log(`  Network: http://${addresses[0]}:${PORT}`);
  }
  console.log(`\nPort: ${PORT}\n`);
});
