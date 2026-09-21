// Kunci ini memang kunci publik dan baca-saja. Kunci kasir tidak boleh masuk ke sini.
const API_BASE = 'https://script.google.com/macros/s/AKfycbx8WwD2U5j29scP6NsoGmIW-fq5XZpgAhNT9nLNkY-RAJ8f3iH-OnxjuVdCa6WvTJAP9A/exec';
const API_KEY = 'utc_pub_k7m2xq9vz4n8b3rf';

const WA_UMUM = 'https://wa.me/6285143111146?text=Halo%20Utama%20Computer.%20saya%20dari%20Sosmed%20mau%20tanya%20produknya.%20Mohon%20dibantu%20ya';

async function apiGet(params) {
  const url = new URL(API_BASE);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const ctrl = new AbortController();
  const batas = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(batas);
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function formatHarga(nilai) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka) || angka <= 0) return 'Hubungi kami';
  return 'Mulai Rp ' + new Intl.NumberFormat('id-ID').format(angka);
}

function sumberGambar(url) {
  return /^https?:\/\//i.test(String(url || '')) ? url : 'img/placeholder.svg';
}

function kartuProduk(item) {
  const kartu = el('article', 'card produk');

  const gambar = el('img', 'photo');
  gambar.src = sumberGambar(item.gambar);
  gambar.alt = item.judul ? `Foto ${item.judul}` : '';
  gambar.loading = 'lazy';
  gambar.width = 800;
  gambar.height = 600;
  kartu.append(gambar);

  if (item.badge) kartu.append(el('p', 'badge', item.badge));
  kartu.append(el('h3', null, item.judul || 'Tanpa judul'));
  if (item.spek) kartu.append(el('p', 'spek mono', item.spek));
  kartu.append(el('p', 'harga mono', formatHarga(item.hargaMulai)));
  if (item.catatan) kartu.append(el('p', 'catatan', item.catatan));

  return kartu;
}

function pesanEtalase(teks) {
  const bungkus = el('div', 'etalase-pesan');
  bungkus.append(el('p', 'mono', teks));
  const tombol = el('a', 'btn btn-primary', 'Chat admin buat tanya stok');
  tombol.href = WA_UMUM;
  tombol.target = '_blank';
  tombol.rel = 'noopener';
  const baris = el('p', 'cta-row');
  baris.append(tombol);
  bungkus.append(baris);
  return bungkus;
}

function gambarEtalase(items, wadah) {
  wadah.replaceChildren();

  if (!items.length) {
    wadah.append(pesanEtalase('Daftar rakitan sedang kami susun. Sebutkan saja budget dan kebutuhanmu, kami susunkan speknya.'));
    return;
  }

  // Server sudah mengurutkan. Kelompokkan tanpa mengubah urutan aslinya.
  const kelompok = new Map();
  for (const item of items) {
    const kategori = item.kategori || 'Lainnya';
    if (!kelompok.has(kategori)) kelompok.set(kategori, []);
    kelompok.get(kategori).push(item);
  }

  for (const [kategori, daftar] of kelompok) {
    const blok = el('div', 'etalase-kelompok');
    blok.append(el('h3', 'kategori', kategori));
    const grid = el('div', 'grid');
    for (const item of daftar) grid.append(kartuProduk(item));
    blok.append(grid);
    wadah.append(blok);
  }
}

async function muatEtalase() {
  const wadah = document.getElementById('etalase-isi');
  if (!wadah) return;

  try {
    const data = await apiGet({ action: 'etalase' });
    if (!data.ok) throw new Error(data.error || 'Gagal memuat');
    gambarEtalase(Array.isArray(data.items) ? data.items : [], wadah);
  } catch (err) {
    wadah.replaceChildren(pesanEtalase('Daftar rakitan belum bisa dimuat sekarang. Chat saja admin, speknya kami susunkan langsung.'));
  }
}

muatEtalase();
