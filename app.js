// Kunci ini memang kunci publik dan baca-saja. Kunci kasir tidak boleh masuk ke sini.
const API_BASE = 'https://script.google.com/macros/s/AKfycbx8WwD2U5j29scP6NsoGmIW-fq5XZpgAhNT9nLNkY-RAJ8f3iH-OnxjuVdCa6WvTJAP9A/exec';
const API_KEY = 'utc_pub_k7m2xq9vz4n8b3rf';

// Halaman ada di subfolder (/servis/, /cek/, ...), dan situsnya bisa disajikan
// dari akar domain maupun dari subfolder seperti github.io/utcomp12345/. Akar
// dihitung dari alamat app.js sendiri supaya aset tetap ketemu di keduanya.
const skripIni = document.currentScript || document.querySelector('script[src$="app.js"]');
const AKAR = new URL('.', skripIni ? skripIni.src : location.href).href;

// Nomor bawaan. Bisa ditimpa dari tab TEKS lewat kunci "wa".
let NOMOR_WA = '6285143111146';
const PESAN_UMUM = 'Halo Utama Computer. saya dari Sosmed mau tanya produknya. Mohon dibantu ya';

function waUrl(pesan) {
  return `https://wa.me/${NOMOR_WA}?text=${encodeURIComponent(pesan)}`;
}

// Apps Script perlu 2-3 detik saat dingin. Batas ini memberi ruang untuk itu
// tapi tetap menyerah sebelum pengunjung mengira halamannya mati.
const BATAS_TUNGGU = 15000;
const PESAN_LAMBAT = 'Jaringan lambat, coba lagi sebentar.';

const LANGKAH = ['Diterima', 'Diperiksa', 'Dikerjakan', 'Selesai'];

async function apiGet(params) {
  const url = new URL(API_BASE);
  url.searchParams.set('key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const ctrl = new AbortController();
  const batas = setTimeout(() => ctrl.abort(), BATAS_TUNGGU);
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

function tombolWa(teks) {
  const a = el('a', 'btn btn-primary', teks);
  a.href = waUrl(PESAN_UMUM);
  a.target = '_blank';
  a.rel = 'noopener';
  const baris = el('p', 'cta-row');
  baris.append(a);
  return baris;
}

function blokMemuat(teks) {
  const bungkus = el('p', 'memuat mono');
  bungkus.append(el('span', 'spinner'));
  bungkus.append(el('span', null, teks));
  return bungkus;
}

// ---------- Teks dari tab TEKS ----------

// Sheet ini penimpa, bukan sumber satu-satunya. Nilai bawaan yang benar sudah
// ada di HTML, jadi kalau API gagal, lambat, atau selnya kosong, halaman tetap
// menampilkan teks yang betul.

function terapkanNomorWa(nilai) {
  const digit = nilai.replace(/\D/g, '');
  // Nomor yang jelas salah ketik diabaikan seluruhnya, tampilan maupun tautan,
  // karena satu sel keliru di spreadsheet bisa mematikan semua tombol WhatsApp
  // di halaman ini. Menampilkan nomor rusak tapi menautkan yang benar justru
  // lebih membingungkan daripada tidak berubah sama sekali.
  if (digit.length < 9 || digit.length > 15) return false;

  NOMOR_WA = digit.startsWith('0') ? '62' + digit.slice(1) : digit;

  for (const a of document.querySelectorAll('a[href^="tel:"]')) {
    a.href = 'tel:+' + NOMOR_WA;
  }
  for (const a of document.querySelectorAll('a[href*="wa.me/"]')) {
    const url = new URL(a.href);
    url.pathname = '/' + NOMOR_WA;
    a.href = url.toString();
  }
  return true;
}

function terapkanTeks(teks) {
  if (!teks || typeof teks !== 'object') return;

  for (const [kunci, nilai] of Object.entries(teks)) {
    if (typeof nilai !== 'string') continue;
    const bersih = nilai.trim();
    if (!bersih) continue;

    if (kunci === 'wa' && !terapkanNomorWa(bersih)) continue;

    // textContent, bukan innerHTML: isinya diketik manusia di spreadsheet.
    for (const node of document.querySelectorAll(`[data-teks="${CSS.escape(kunci)}"]`)) {
      node.textContent = bersih;
    }
  }
}

// ---------- Etalase ----------

function formatHarga(nilai) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka) || angka <= 0) return 'Hubungi kami';
  return 'Mulai Rp ' + new Intl.NumberFormat('id-ID').format(angka);
}

function sumberGambar(url) {
  return /^https?:\/\//i.test(String(url || '')) ? url : AKAR + 'img/placeholder.svg';
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
  kartu.append(el('h4', null, item.judul || 'Tanpa judul'));
  if (item.spek) kartu.append(el('p', 'spek', item.spek));
  kartu.append(el('p', 'harga mono', formatHarga(item.hargaMulai)));
  if (item.catatan) kartu.append(el('p', 'catatan', item.catatan));

  return kartu;
}

function pesanEtalase(teks) {
  const bungkus = el('div', 'etalase-pesan');
  bungkus.append(el('p', 'mono', teks));
  bungkus.append(tombolWa('Chat admin buat tanya stok'));
  return bungkus;
}

function gambarEtalase(items, wadah) {
  wadah.replaceChildren();

  if (!items.length) {
    wadah.append(pesanEtalase('Daftar rakitan sedang kami susun. Sebutkan saja budget dan kebutuhanmu, kami susunkan speknya.'));
    return;
  }

  // Beranda cuma memajang pratinjau; daftar lengkapnya di /etalase/.
  const batas = Number(wadah.dataset.batas);
  if (Number.isFinite(batas) && batas > 0) items = items.slice(0, batas);

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

// Teks dan etalase datang dari satu panggilan. Apps Script perlu 2-3 detik
// saat dingin, jadi dua panggilan berarti pengunjung menunggu dua kali.
async function muatBeranda() {
  const wadah = document.getElementById('etalase-isi');
  if (!wadah) return;

  wadah.replaceChildren(blokMemuat('Memuat daftar rakitan…'));

  try {
    const data = await apiGet({ action: 'etalase' });
    if (!data.ok) throw new Error(data.error || 'Gagal memuat');
    terapkanTeks(data.teks);
    gambarEtalase(Array.isArray(data.items) ? data.items : [], wadah);
  } catch (err) {
    const teks = err.name === 'AbortError'
      ? PESAN_LAMBAT
      : 'Daftar rakitan belum bisa dimuat sekarang. Chat saja admin, speknya kami susunkan langsung.';
    wadah.replaceChildren(pesanEtalase(teks));
  }
}

// ---------- Cek status servis ----------

function barisDetail(label, nilai) {
  if (!nilai) return null;
  const baris = el('div', 'detail-baris');
  baris.append(el('dt', null, label));
  baris.append(el('dd', null, nilai));
  return baris;
}

function garisWaktu(langkah) {
  const daftar = el('ol', 'timeline');
  LANGKAH.forEach((nama, i) => {
    const nomor = i + 1;
    const item = el('li', nomor < langkah ? 'lewat' : nomor === langkah ? 'aktif' : null);
    item.append(el('span', 'tl-num', String(nomor).padStart(2, '0')));
    item.append(el('span', 'tl-nama', nama));
    if (nomor === langkah) item.append(el('span', 'tl-tanda', 'sekarang'));
    daftar.append(item);
  });
  return daftar;
}

function hasilServis(servis) {
  const kotak = el('div', 'servis-hasil');

  kotak.append(el('p', 'servis-kode mono', servis.kode || ''));

  const langkah = Number(servis.langkah);
  if (langkah === 0) {
    kotak.append(el('p', 'servis-batal', 'Servis ini dibatalkan.'));
  } else if (Number.isFinite(langkah) && langkah >= 1 && langkah <= LANGKAH.length) {
    kotak.append(garisWaktu(langkah));
  }

  if (servis.pesan) kotak.append(el('p', 'servis-pesan', servis.pesan));

  const detail = el('dl', 'servis-detail');
  for (const [label, nilai] of [
    ['Perangkat', servis.perangkat],
    ['Merk', servis.merk],
    ['Keluhan', servis.keluhan],
    ['Status', servis.status],
    ['Teknisi', servis.teknisi],
    ['Masuk', servis.tglMasuk],
    ['Selesai', servis.tglSelesai],
  ]) {
    const baris = barisDetail(label, nilai);
    if (baris) detail.append(baris);
  }
  if (detail.childElementCount) kotak.append(detail);

  kotak.append(tombolWa('Tanya lewat WhatsApp'));
  return kotak;
}

function pesanServis(teks) {
  const kotak = el('div', 'servis-gagal');
  kotak.append(el('p', null, teks));
  return kotak;
}

function siapkanCekServis() {
  const form = document.getElementById('form-servis');
  if (!form) return;

  const wadah = document.getElementById('servis-hasil');
  const tombol = form.querySelector('button[type="submit"]');

  // Alamat halaman ini dicetak di nota servis, jadi ?srv=UT260809002 boleh
  // mengisi kolom kodenya. Empat digit WhatsApp TIDAK pernah diisi otomatis:
  // justru itu yang membuktikan yang membuka adalah pemilik barangnya.
  const srvParam = new URLSearchParams(location.search).get('srv');
  if (srvParam) {
    const kode = srvParam.trim().toUpperCase();
    // Parameter ngawur diabaikan diam-diam, tanpa pesan error.
    if (/^[A-Z0-9-]{4,20}$/.test(kode)) {
      form.elements.srv.value = kode;
      form.elements.wa.focus();
    }
  }

  const labelTombol = tombol.textContent;
  let berjalan = false;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (berjalan) return;

    const kode = form.elements.srv.value.trim().toUpperCase();
    const wa = form.elements.wa.value.trim();

    // Dicegat di sini supaya percobaan yang jelas belum lengkap tidak ikut
    // menghabiskan jatah 5 percobaan di server.
    if (!kode || !/^\d{4}$/.test(wa)) {
      wadah.replaceChildren(pesanServis('Isi nomor servis dan 4 digit terakhir nomor WhatsApp kamu dulu.'));
      return;
    }

    berjalan = true;
    tombol.disabled = true;
    tombol.textContent = 'Mengecek…';
    wadah.replaceChildren(blokMemuat('Mengecek status servis…'));

    try {
      const data = await apiGet({ action: 'cekServis', srv: kode, wa });
      if (data.ok && data.servis) {
        wadah.replaceChildren(hasilServis(data.servis));
      } else {
        // Pesan gagal dari server sengaja seragam. Tampilkan apa adanya.
        wadah.replaceChildren(pesanServis(data.error || 'Data tidak ditemukan. Cek lagi nomor servis dan nomor WhatsApp kamu.'));
      }
    } catch (err) {
      wadah.replaceChildren(pesanServis(
        err.name === 'AbortError' ? PESAN_LAMBAT : 'Gagal menghubungi server. Coba lagi sebentar.'
      ));
    } finally {
      berjalan = false;
      tombol.disabled = false;
      tombol.textContent = labelTombol;
    }
  });
}

// ---------- Formulir yang menyusun pesan WhatsApp ----------

// Tidak ada server di balik formulir ini. Isinya dirangkai jadi teks, lalu
// dibuka lewat wa.me supaya pengunjung sendiri yang menekan kirim.
function siapkanFormWa() {
  const form = document.getElementById('form-wa');
  if (!form) return;

  const galat = document.getElementById('wa-galat');

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();

    const nama = form.elements.nama.value.trim();
    const topik = form.elements.topik.value;
    const pesan = form.elements.pesan.value.trim();

    if (!nama || !pesan) {
      galat.textContent = 'Isi nama dan ceritakan keperluanmu dulu.';
      galat.hidden = false;
      return;
    }
    galat.hidden = true;

    window.open(waUrl(`Halo Utama Computer, saya ${nama}.\nKeperluan: ${topik}\n\n${pesan}`), '_blank', 'noopener');
  });
}

muatBeranda();
siapkanCekServis();
siapkanFormWa();
