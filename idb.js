// idb.js - tiny IndexedDB wrapper for storing photos
const DB_NAME = 'diary-db';
const DB_VER = 1;
const STORE = 'photos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
  });
}

async function savePhoto(date, dataURL) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataURL, date);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function deletePhoto(date) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(date);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

async function getPhoto(date) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    tx.objectStore(STORE).get(date).onsuccess = e => res(e.target.result);
    tx.onerror = () => rej(tx.error);
  });
}

async function getAllPhotos() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function getAllPhotoEntries() {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => {
      const keys = req.result;
      const store = tx.objectStore(STORE);
      Promise.all(keys.map(k => new Promise(r =>
        store.get(k).onsuccess = e => r([k, e.target.result])
      ))).then(res).catch(rej);
    };
    req.onerror = () => rej(req.error);
  });
}

window.idb = { savePhoto, deletePhoto, getPhoto, getAllPhotos, getAllPhotoEntries };