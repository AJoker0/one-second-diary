// main.js - diary app logic
const calendarEl = document.getElementById('calendar');
const fileInput = document.getElementById('file-input');
const takePhotoBtn = document.getElementById('take-photo-btn');
const previewEl = document.getElementById('preview');
const gifBtn = document.getElementById('generate-gif-btn');
const gifResultEl = document.getElementById('gif-result');

let selectedDate = new Date();
let photosByDate = {};

function formatDate(dt) {
  //return dt.toISOString().slice(0,10);
  // Returns YYYY-MM-DD in local time, not UTC!
  const year = dt.getFullYear();
  const month = (dt.getMonth() + 1).toString().padStart(2, '0');
  const day = dt.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthDays(year, month) {
  // Returns array of Date objects for visible days in calendar grid
  const res = [];
  const first = new Date(year, month, 1);
  const firstDay = first.getDay() || 7; // Monday=1
  let d = new Date(first);
  d.setDate(1 - (firstDay - 1));
  for (let i=0; i<42; ++i) {
    res.push(new Date(d));
    d.setDate(d.getDate()+1);
  }
  return res;
}

function renderCalendar(date = new Date()) {
  const year = date.getFullYear(), month = date.getMonth();
  const days = getMonthDays(year, month);
  let html = `<div class="calendar-grid">`;
  days.forEach(d => {
    const dstr = formatDate(d);
    let classes = 'day-cell';
    if (d.getMonth() !== month) classes += ' other-month';
    if (dstr === formatDate(selectedDate)) classes += ' selected';
    if (dstr === formatDate(new Date())) classes += ' today';
    if (photosByDate[dstr]) classes += ' has-photo';
    html += `<div class="${classes}" data-date="${dstr}">${d.getDate()}</div>`;
  });
  html += `</div>`;
  calendarEl.innerHTML = html;
  // Click handler
  document.querySelectorAll('.day-cell').forEach(cell => {
    cell.onclick = () => {
      selectedDate = new Date(cell.dataset.date);
      renderCalendar(selectedDate);
      showPreview();
    };
  });
}
async function loadPhotos() {
  const entries = await window.idb.getAllPhotoEntries();
  photosByDate = {};
  entries.forEach(([date, dataURL]) => photosByDate[date] = dataURL);
}
async function showPreview() {
  const dateStr = formatDate(selectedDate);
  const dataURL = photosByDate[dateStr];
  previewEl.innerHTML = dataURL
    ? `<img src="${dataURL}" alt="Photo for ${dateStr}"><br><button onclick="deletePhoto()">🗑️ Delete</button>`
    : "";
}
window.deletePhoto = async function() {
  /*const dateStr = formatDate(selectedDate);
  const db = await window.idb.openDB();
  const tx = db.transaction('photos', 'readwrite');
  tx.objectStore('photos').delete(dateStr);
  tx.oncomplete = async () => {
    await loadPhotos();
    renderCalendar(selectedDate);
    showPreview();*/
    const dateStr = formatDate(selectedDate);
  await window.idb.deletePhoto(dateStr);           // ось тут зміна!
  await loadPhotos();
  renderCalendar(selectedDate);
  showPreview();
};

takePhotoBtn.onclick = () => fileInput.click();
fileInput.onchange = async e => {
  const f = e.target.files[0];
  if (!f) return;
  // Downscale/compress photo for storage
  const reader = new FileReader();
  reader.onload = async e2 => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      // Resize to max 360x360
      if (w > 360) h = Math.round(h * 360/w), w = 360;
      if (h > 360) w = Math.round(w * 360/h), h = 360;
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataURL = canvas.toDataURL('image/jpeg', 0.8);
      await window.idb.savePhoto(formatDate(selectedDate), dataURL);
      await loadPhotos();
      renderCalendar(selectedDate);
      showPreview();
    };
    img.src = e2.target.result;
  };
  reader.readAsDataURL(f);
};

gifBtn.onclick = async () => {
  gifResultEl.innerHTML = "Generating GIF...";
  // Get all photos, sort by date
  const entries = await window.idb.getAllPhotoEntries();
  entries.sort(([a], [b]) => a.localeCompare(b));
  if (entries.length < 2) {
    gifResultEl.innerHTML = "Need at least 2 photos for a montage!";
    return;
  }
  // Dynamically load GIF.js if needed
  const waitForGif = () => new Promise(r => {
    if (window.GIF) return r();
    const int = setInterval(() => { if (window.GIF) clearInterval(int), r(); }, 100);
  });
  await waitForGif();
  const gif = new window.GIF({
    workers: 2,
    quality: 10,
    workerScript: 'gif.worker.js', // Вкажіть явно шлях до воркера!
    width: 240, height: 240
  });
  for (const [date, dataURL] of entries) {
    const img = document.createElement('img');
    img.src = dataURL;
    await new Promise(res => img.onload = res);
    // Draw to canvas to resize/crop square
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,240,240);
    let w = img.width, h = img.height;
    // Center crop
    let sx=0, sy=0, sw=w, sh=h;
    if (w > h) sx = (w-h)/2, sw = sh = h;
    else sy = (h-w)/2, sh = sw = w;
    ctx.drawImage(img, sx, sy, sw, sh, 0,0,240,240);
    gif.addFrame(canvas, {delay: 500, copy:true});
  }
  gif.on('finished', blob => {
    const url = URL.createObjectURL(blob);
    gifResultEl.innerHTML = `<img src="${url}" alt="GIF"><br><a href="${url}" download="diary.gif">Download GIF</a>`;
  });
  gif.render();
};

async function init() {
  await loadPhotos();
  selectedDate = new Date();
  renderCalendar(selectedDate);
  showPreview();
}
window.onload = init;