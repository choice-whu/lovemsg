const DB_NAME = "couple-memory-local-db";
const DB_VERSION = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_LABELS = {
  text: "文本",
  image: "图片",
  sticker: "表情",
  voice: "语音",
  video: "视频",
  file: "文件",
  location: "位置",
  unknown: "消息",
};

const TYPE_ALIASES = {
  文本: "text",
  图片: "image",
  表情: "sticker",
  语音: "voice",
  视频: "video",
  文件: "file",
  位置: "location",
};

const MEDIA_TYPES = new Set(["image", "sticker", "voice", "video", "file"]);
const VISUAL_TYPES = new Set(["image", "sticker"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);
const WORD_STOP_LIST = new Set([
  "我们",
  "你们",
  "他们",
  "这个",
  "那个",
  "就是",
  "然后",
  "可以",
  "不是",
  "没有",
  "什么",
  "一个",
  "一下",
  "还是",
  "已经",
  "因为",
  "所以",
  "但是",
  "如果",
  "今天",
  "明天",
  "昨天",
  "现在",
  "这么",
  "这个",
  "那个",
  "时候",
  "然后",
  "觉得",
  "哈哈",
  "哈哈哈",
  "微信",
  "消息",
  "你已",
  "添加",
  "你已添加",
  "wxid",
  "msgsource",
  "signature",
  "publisher",
  "sequence",
  "tmp",
  "node",
  "view",
  "null",
  "false",
  "true",
  "undefined",
  "choice",
  "eggseed",
  "eggincluded",
  "pua",
  "gt",
  "lt",
  "amp",
  "quot",
  "apos",
]);

const numberFormatter = new Intl.NumberFormat("zh-CN");
const dayFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
});

const state = {
  db: null,
  records: [],
  recordByKey: new Map(),
  filtered: [],
  favorites: new Set(),
  notes: [],
  anniversaries: [],
  assetIndex: new Map(),
  assetFiles: new Map(),
  objectUrls: new Map(),
  activeTab: "timeline",
  pageSize: 180,
  currentStart: 0,
  currentEnd: 0,
  monthDayFilter: "",
  searchTimer: 0,
  scrollTimer: 0,
  dataVersion: 0,
  statsCache: null,
  timelineStickBottom: true,
  cloudMode: false,
  cloudUser: null,
  staticEncryptedMode: false,
  staticManifest: null,
  staticUser: null,
  staticKey: null,
  staticAssetUrls: new Map(),
};

const els = {
  csvInput: document.querySelector("#csvInput"),
  imageInput: document.querySelector("#imageInput"),
  emojiInput: document.querySelector("#emojiInput"),
  videoInput: document.querySelector("#videoInput"),
  importMenu: document.querySelector(".import-menu"),
  cloudAccount: document.querySelector("#cloudAccount"),
  cloudUserLabel: document.querySelector("#cloudUserLabel"),
  clearAssetsBtn: document.querySelector("#clearAssetsBtn"),
  csvStatus: document.querySelector("#csvStatus"),
  assetStatus: document.querySelector("#assetStatus"),
  dbStatus: document.querySelector("#dbStatus"),
  quickStats: document.querySelector("#quickStats"),
  searchInput: document.querySelector("#searchInput"),
  dateInput: document.querySelector("#dateInput"),
  typeSelect: document.querySelector("#typeSelect"),
  todayHistoryBtn: document.querySelector("#todayHistoryBtn"),
  randomBtn: document.querySelector("#randomBtn"),
  resetFiltersBtn: document.querySelector("#resetFiltersBtn"),
  activeFilterNote: document.querySelector("#activeFilterNote"),
  mineNameInput: document.querySelector("#mineNameInput"),
  partnerNameInput: document.querySelector("#partnerNameInput"),
  tabs: document.querySelectorAll(".tab-button"),
  views: document.querySelectorAll(".view"),
  scrollBottomBtn: document.querySelector("#scrollBottomBtn"),
  rangeInfo: document.querySelector("#rangeInfo"),
  timelineList: document.querySelector("#timelineList"),
  highlightInfo: document.querySelector("#highlightInfo"),
  highlightList: document.querySelector("#highlightList"),
  clearHighlightsBtn: document.querySelector("#clearHighlightsBtn"),
  overviewStats: document.querySelector("#overviewStats"),
  typeStats: document.querySelector("#typeStats"),
  wordCloud: document.querySelector("#wordCloud"),
  yearHeatmap: document.querySelector("#yearHeatmap"),
  monthStats: document.querySelector("#monthStats"),
  hourStats: document.querySelector("#hourStats"),
  noteAuthorInput: document.querySelector("#noteAuthorInput"),
  noteInput: document.querySelector("#noteInput"),
  addNoteBtn: document.querySelector("#addNoteBtn"),
  noteBoard: document.querySelector("#noteBoard"),
  anniversaryNameInput: document.querySelector("#anniversaryNameInput"),
  anniversaryDateInput: document.querySelector("#anniversaryDateInput"),
  addAnniversaryBtn: document.querySelector("#addAnniversaryBtn"),
  anniversaryList: document.querySelector("#anniversaryList"),
  lightbox: document.querySelector("#lightbox"),
  closeLightboxBtn: document.querySelector("#closeLightboxBtn"),
  lightboxBody: document.querySelector("#lightboxBody"),
  lightboxCaption: document.querySelector("#lightboxCaption"),
};

bindEvents();
renderAll();
bootApp();

function bindEvents() {
  els.csvInput.addEventListener("change", handleCsvChange);
  els.imageInput.addEventListener("change", (event) => handleAssetChange(event, "图片"));
  els.emojiInput.addEventListener("change", (event) => handleAssetChange(event, "表情"));
  els.videoInput.addEventListener("change", (event) => handleAssetChange(event, "视频/语音/文件"));
  els.clearAssetsBtn.addEventListener("click", clearAssets);

  els.searchInput.addEventListener("input", () => {
    window.clearTimeout(state.searchTimer);
    state.searchTimer = window.setTimeout(() => applyFilters(), 80);
  });

  els.dateInput.addEventListener("change", () => {
    state.monthDayFilter = "";
    applyFilters();
    switchTab("timeline");
  });

  els.typeSelect.addEventListener("change", () => applyFilters());
  els.todayHistoryBtn.addEventListener("click", showTodayHistory);
  els.randomBtn.addEventListener("click", jumpToRandomMoment);
  els.resetFiltersBtn.addEventListener("click", resetFilters);
  els.mineNameInput.addEventListener("input", () => {
    saveNames();
    renderTimeline();
    renderHighlights();
  });
  els.partnerNameInput.addEventListener("input", () => {
    saveNames();
    renderTimeline();
    renderHighlights();
  });

  els.tabs.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  els.scrollBottomBtn.addEventListener("click", scrollTimelineToBottom);
  els.timelineList.addEventListener("scroll", handleTimelineScroll);
  els.timelineList.addEventListener("click", handleRecordAction);
  els.highlightList.addEventListener("click", handleRecordAction);

  els.clearHighlightsBtn.addEventListener("click", clearHighlights);
  els.yearHeatmap.addEventListener("click", handleHeatmapClick);
  els.addNoteBtn.addEventListener("click", addNote);
  els.noteBoard.addEventListener("click", handleNoteBoardClick);
  els.addAnniversaryBtn.addEventListener("click", addAnniversary);
  els.anniversaryList.addEventListener("click", handleAnniversaryClick);

  els.closeLightboxBtn.addEventListener("click", () => closeLightbox());
  els.lightbox.addEventListener("click", (event) => {
    if (event.target === els.lightbox) {
      closeLightbox();
    }
  });

  window.addEventListener("beforeunload", revokeObjectUrls);
}

function closeImportMenu() {
  if (els.importMenu) {
    els.importMenu.open = false;
  }
}

async function bootApp() {
  if (window.__COUPLE_STATIC_ENCRYPTED__) {
    await bootStaticEncryptedMode();
    return;
  }

  const cloudReady = await bootCloudMode();
  if (!cloudReady) {
    bootLocalDatabase();
  }
}

async function bootStaticEncryptedMode() {
  state.staticEncryptedMode = true;
  if (els.importMenu) {
    els.importMenu.hidden = true;
  }
  if (els.cloudAccount) {
    els.cloudAccount.hidden = false;
  }
  if (els.cloudUserLabel) {
    els.cloudUserLabel.textContent = "加密静态版";
  }
  els.csvStatus.textContent = "等待输入私密密码";
  els.assetStatus.textContent = "素材会在浏览器本地解密";
  els.dbStatus.textContent = "密码不会发送给 GitHub";
  showStaticUnlockPanel();

  try {
    const response = await fetch("./encrypted-export/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Encrypted manifest not found");
    state.staticManifest = await response.json();
    showStaticUnlockPanel();
  } catch (error) {
    console.error(error);
    setTimelineEmpty("还没有生成 GitHub Pages 加密包", "先运行 tools/build-github-pages.mjs，再把 gh-pages 文件夹发布到 GitHub Pages。");
  }
}

function showStaticUnlockPanel(message = "") {
  const manifest = state.staticManifest;
  const users = manifest && Array.isArray(manifest.users) ? manifest.users : [];
  const form = document.createElement("form");
  form.className = "unlock-panel";
  form.innerHTML = `
    <div class="unlock-face" aria-hidden="true"></div>
    <h2>输入私密密码</h2>
    <p>聊天记录和照片都已加密放在 GitHub Pages 上，密码只在这个浏览器里用来解锁。</p>
    <label class="field-label" for="staticUserSelect">视角</label>
    <select id="staticUserSelect" class="text-input" ${users.length ? "" : "disabled"}>
      ${users.map((user) => `<option value="${escapeHtml(user.id)}">${escapeHtml(getStaticUserOptionLabel(user))}</option>`).join("")}
    </select>
    <label class="field-label" for="staticPasswordInput">密码</label>
    <input id="staticPasswordInput" class="text-input" type="password" autocomplete="current-password" ${users.length ? "" : "disabled"} />
    <button class="wide-button" type="submit" ${users.length ? "" : "disabled"}>打开回忆</button>
    <div class="unlock-note">${escapeHtml(message || (users.length ? "两个人各自用自己的密码进入，会看到自己的聊天视角。" : "正在读取加密清单..."))}</div>
  `;
  form.addEventListener("submit", unlockStaticExport);
  els.timelineList.replaceChildren(form);
}

function getStaticUserOptionLabel(user) {
  return user.perspective === "partner" ? "乖乖视角" : "我的视角";
}

async function unlockStaticExport(event) {
  event.preventDefault();
  const manifest = state.staticManifest;
  if (!manifest) return;

  const accountId = document.querySelector("#staticUserSelect")?.value || "";
  const password = document.querySelector("#staticPasswordInput")?.value || "";
  const user = (manifest.users || []).find((item) => item.id === accountId);
  if (!user || !password) {
    showStaticUnlockPanel("先选一个视角，再输入密码。");
    return;
  }

  els.csvStatus.textContent = "正在本地解密聊天记录";
  els.assetStatus.textContent = "正在准备加密素材索引";
  await nextFrame();

  try {
    const contentKey = await unwrapStaticContentKey(user, password);
    state.staticKey = await crypto.subtle.importKey("raw", contentKey, "AES-GCM", false, ["decrypt"]);
    const csvText = await decryptStaticText(manifest.data);
    const records = normalizeRows(parseCsv(csvText)).map((record) => applyCloudPerspective(record, user));
    loadStaticAssets(manifest.assets || []);
    setRecords(records);
    state.staticUser = user;
    els.mineNameInput.value = user.displayName || "我";
    els.partnerNameInput.value = user.partnerName || "对方";
    els.noteAuthorInput.value = user.displayName || "我";
    els.mineNameInput.readOnly = true;
    els.partnerNameInput.readOnly = true;
    if (els.cloudUserLabel) {
      els.cloudUserLabel.textContent = `${user.displayName || "我们"} · 加密静态版`;
    }
    els.csvStatus.textContent = `加密记录已打开，${formatNumber(records.length)} 条消息`;
    els.assetStatus.textContent = `加密素材 ${formatNumber(state.assetFiles.size)} 个，滚到哪里解密到哪里`;
    els.dbStatus.textContent = "GitHub 只保存密文，密码没有离开浏览器";
    applyFilters();
    switchTab("timeline");
  } catch (error) {
    console.error(error);
    state.staticKey = null;
    showStaticUnlockPanel("密码不对，或者加密包已经损坏。");
    els.csvStatus.textContent = "没有解锁成功";
  }
}

async function unwrapStaticContentKey(user, password) {
  const salt = base64UrlToBytes(user.kdf.salt);
  const iterations = user.kdf.iterations || state.staticManifest.kdf?.iterations || 250000;
  const passwordKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(user.wrappedKey.iv) },
    wrappingKey,
    base64UrlToBytes(user.wrappedKey.ciphertext),
  );
}

async function decryptStaticText(entry) {
  const bytes = await decryptStaticEntry(entry);
  return new TextDecoder("utf-8").decode(bytes);
}

async function decryptStaticEntry(entry) {
  if (!state.staticKey) throw new Error("Missing static key");
  const response = await fetch(`./${entry.path}`, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Cannot load encrypted entry: ${entry.path}`);
  const encrypted = await response.arrayBuffer();
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(entry.iv) },
    state.staticKey,
    encrypted,
  );
}

function loadStaticAssets(assets) {
  revokeObjectUrls();
  state.assetIndex.clear();
  state.assetFiles.clear();
  state.staticAssetUrls.clear();

  assets.forEach((asset) => {
    if (!asset || !asset.path) return;
    const staticAsset = {
      encrypted: true,
      id: asset.id || asset.path,
      name: asset.name || "",
      type: asset.type || "",
      path: asset.path,
      iv: asset.iv,
    };
    state.assetFiles.set(staticAsset.id, staticAsset);
    (asset.keys || []).forEach((key) => {
      state.assetIndex.set(normalizePath(key), staticAsset);
    });
  });
}

async function getStaticAssetUrl(asset) {
  if (state.staticAssetUrls.has(asset.id)) {
    return state.staticAssetUrls.get(asset.id);
  }
  const bytes = await decryptStaticEntry(asset);
  const blob = new Blob([bytes], { type: asset.type || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  state.staticAssetUrls.set(asset.id, url);
  return url;
}

function base64UrlToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function bootCloudMode() {
  if (!window.__COUPLE_CLOUD_AVAILABLE__) {
    return false;
  }

  try {
    const response = await fetch("/api/me", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (response.status === 401) {
      window.location.href = "/login";
      return true;
    }
    if (!response.ok) return false;

    const payload = await response.json();
    if (!payload || !payload.user) return false;

    state.cloudMode = true;
    state.cloudUser = payload.user;
    applyCloudIdentity(payload.user);
    await loadCloudExport(payload.user);
    return true;
  } catch (error) {
    console.info("Cloud mode is not available, keeping local mode.", error);
    return false;
  }
}

function applyCloudIdentity(user) {
  if (els.importMenu) {
    els.importMenu.hidden = true;
  }
  if (els.cloudAccount) {
    els.cloudAccount.hidden = false;
  }
  if (els.cloudUserLabel) {
    els.cloudUserLabel.textContent = `${user.displayName || "我们"} · 私密云端`;
  }

  els.mineNameInput.value = user.displayName || "我";
  els.partnerNameInput.value = user.partnerName || "对方";
  els.noteAuthorInput.value = user.displayName || "我";
  els.mineNameInput.readOnly = true;
  els.partnerNameInput.readOnly = true;
  els.csvStatus.textContent = "正在从私密云端打开聊天记录";
  els.assetStatus.textContent = "正在从私密云端整理照片和表情";
  els.dbStatus.textContent = "只有登录后的两个人可以访问";
}

async function loadCloudExport(user) {
  state.dataVersion += 1;
  await nextFrame();

  const [csvResponse, assetResponse] = await Promise.all([
    fetch("/api/export/csv", { credentials: "same-origin", cache: "no-store" }),
    fetch("/api/assets", { credentials: "same-origin", cache: "no-store" }),
  ]);

  if (csvResponse.status === 401 || assetResponse.status === 401) {
    window.location.href = "/login";
    return;
  }
  if (!csvResponse.ok) {
    throw new Error("Cloud CSV could not be loaded");
  }
  if (!assetResponse.ok) {
    throw new Error("Cloud assets could not be loaded");
  }

  const csvText = await csvResponse.text();
  const assetManifest = await assetResponse.json();
  const records = normalizeRows(parseCsv(csvText)).map((record) => applyCloudPerspective(record, user));
  loadCloudAssets(assetManifest.assets || []);
  setRecords(records);
  els.csvStatus.textContent = `云端记录，${formatNumber(records.length)} 条消息`;
  els.assetStatus.textContent = `云端素材 ${formatNumber(state.assetFiles.size)} 个`;
  els.dbStatus.textContent = "私密云端已就绪";
  applyFilters();
  switchTab("timeline");
}

function applyCloudPerspective(record, user) {
  if (user && user.perspective === "partner") {
    return { ...record, isMine: !record.isMine };
  }
  return record;
}

function loadCloudAssets(assets) {
  revokeObjectUrls();
  state.assetIndex.clear();
  state.assetFiles.clear();

  assets.forEach((asset) => {
    if (!asset || !asset.url) return;
    const cloudAsset = {
      cloud: true,
      name: asset.name || "",
      type: asset.type || "",
      url: asset.url,
    };
    state.assetFiles.set(asset.id || asset.url, cloudAsset);
    (asset.keys || []).forEach((key) => {
      state.assetIndex.set(normalizePath(key), cloudAsset);
    });
  });
}

async function bootLocalDatabase() {
  if (!("indexedDB" in window)) {
    els.dbStatus.textContent = "这个浏览器暂时不能本地保存";
    return;
  }

  try {
    state.db = await openDatabase();
    els.dbStatus.textContent = "本地保存已准备好";
    await restoreLocalState();
  } catch (error) {
    console.error(error);
    els.dbStatus.textContent = "本地保存暂时不可用";
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) {
        const store = db.createObjectStore("records", { keyPath: "key" });
        store.createIndex("dayKey", "dayKey", { unique: false });
        store.createIndex("time", "time", { unique: false });
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("favorites")) {
        db.createObjectStore("favorites", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("anniversaries")) {
        db.createObjectStore("anniversaries", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        db.createObjectStore("snapshots", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
  });
}

async function getAllFromStore(storeName) {
  if (!state.db) return [];
  const transaction = state.db.transaction(storeName, "readonly");
  return requestToPromise(transaction.objectStore(storeName).getAll());
}

async function getOneFromStore(storeName, key) {
  if (!state.db) return null;
  const transaction = state.db.transaction(storeName, "readonly");
  return requestToPromise(transaction.objectStore(storeName).get(key));
}

async function putOne(storeName, value) {
  if (!state.db) return;
  const transaction = state.db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
}

async function deleteOne(storeName, key) {
  if (!state.db) return;
  const transaction = state.db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

async function clearStore(storeName) {
  if (!state.db) return;
  const transaction = state.db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).clear();
  await transactionDone(transaction);
}

async function getMeta(key) {
  if (!state.db) return null;
  const transaction = state.db.transaction("meta", "readonly");
  const result = await requestToPromise(transaction.objectStore("meta").get(key));
  return result ? result.value : null;
}

async function setMeta(key, value) {
  await putOne("meta", { key, value });
}

async function saveRecordsToDatabase(records, fileName) {
  if (!state.db) return;
  const serialized = records.map(serializeRecord);
  await clearStore("records");
  await putOne("snapshots", {
    key: "records",
    fileName,
    savedAt: new Date().toISOString(),
    records: serialized,
  });

  await setMeta("dataset", {
    fileName,
    count: records.length,
    savedAt: new Date().toISOString(),
  });
  els.dbStatus.textContent = `已在本地收好 ${formatNumber(records.length)} 条消息`;
}

async function restoreLocalState() {
  const restoreVersion = state.dataVersion;
  const [snapshot, favorites, notes, anniversaries, names, dataset] = await Promise.all([
    getOneFromStore("snapshots", "records"),
    getAllFromStore("favorites"),
    getAllFromStore("notes"),
    getAllFromStore("anniversaries"),
    getMeta("names"),
    getMeta("dataset"),
  ]);
  const records = snapshot && Array.isArray(snapshot.records) ? snapshot.records : await getAllFromStore("records");

  applyFixedIdentity("我", "乖乖");

  state.favorites = new Set(favorites.map((item) => item.key));
  state.notes = notes.sort((a, b) => b.createdAt - a.createdAt);
  state.anniversaries = anniversaries.sort((a, b) => a.date.localeCompare(b.date));

  if (records.length && restoreVersion === state.dataVersion && !state.records.length) {
    setRecords(records.map(hydrateRecord));
    const source = dataset && dataset.fileName ? dataset.fileName : "本地保存";
    els.csvStatus.textContent = `从本地找回 ${source}，${formatNumber(state.records.length)} 条消息`;
    applyFilters();
  }

  renderAll();
}

async function handleCsvChange(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  closeImportMenu();

  state.dataVersion += 1;
  els.csvStatus.textContent = `正在打开 ${file.name}`;
  els.dbStatus.textContent = "解析好后会留在本地";
  await nextFrame();

  try {
    const text = await readTextFile(file);
    const parsedRows = parseCsv(text);
    const records = normalizeRows(parsedRows);
    setRecords(records);
    applyFixedIdentity("我", "乖乖");
    els.csvStatus.textContent = `${file.name}，${formatNumber(records.length)} 条消息`;
    applyFilters();
    switchTab("timeline");
    saveRecordsToDatabase(records, file.name).catch((error) => {
      console.error(error);
      els.dbStatus.textContent = "本地保存失败";
    });
  } catch (error) {
    console.error(error);
    setRecords([]);
    state.filtered = [];
    els.csvStatus.textContent = "聊天记录没有读成功，请确认导出格式";
    renderAll();
  }
}

async function handleAssetChange(event, label) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  closeImportMenu();

  els.assetStatus.textContent = `正在整理${label}`;
  await nextFrame();

  const accepted = addAssetFiles(files);
  event.target.value = "";
  els.assetStatus.textContent = `素材已放好 ${formatNumber(state.assetFiles.size)} 个，本次新增 ${formatNumber(accepted)} 个`;
  renderAll();
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  return decodeTextBuffer(buffer);
}

function decodeTextBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  }

  const candidates = ["utf-8", "gb18030", "gbk", "utf-16le"];
  let best = "";
  let bestScore = Number.POSITIVE_INFINITY;
  const seen = new Set();
  for (const encoding of candidates) {
    try {
      const decoded = new TextDecoder(encoding).decode(bytes);
      if (seen.has(decoded)) continue;
      seen.add(decoded);
      const score = scoreDecodedText(decoded);
      if (score < bestScore) {
        best = decoded;
        bestScore = score;
      }
    } catch {
      // Ignore unsupported encodings and keep the best readable candidate.
    }
  }
  return best || new TextDecoder("utf-8").decode(bytes);
}

function scoreDecodedText(text) {
  const head = text.slice(0, 1200);
  const missingHeader = /createtime/i.test(head) ? 0 : 1000;
  return missingHeader +
    countMatches(text, /\uFFFD/g) * 80 +
    countMatches(text, /\u0000/g) * 80 +
    countMatches(text, /[\x00-\x08\x0B\x0C\x0E-\x1F]/g) * 30 +
    countMatches(text, /[\u00C0-\u00FF]/g) * 2;
}

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  rows.push(row);
  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""));
}

function normalizeRows(rows) {
  if (rows.length < 2) {
    throw new Error("CSV is empty");
  }

  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const getCell = (row, name) => {
    const index = headerIndex.get(name.toLowerCase());
    return index === undefined ? "" : row[index] || "";
  };

  if (!headerIndex.has("createtime")) {
    throw new Error("Missing CreateTime column");
  }

  const records = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const rawDate = getCell(row, "CreateTime");
    const date = parseCreateTime(rawDate);
    const type = normalizeType(getCell(row, "type_name"));
    const src = getCell(row, "src").trim();
    const rawMessage = getCell(row, "msg");
    const message = normalizeMessageText(rawMessage, type);
    const talker = getCell(row, "talker").trim();
    const idText = getCell(row, "id").trim();
    const id = Number.parseInt(idText, 10);
    const msgSvrId = getCell(row, "MsgSvrID").trim();
    const key = msgSvrId && msgSvrId !== "0" ? msgSvrId : `${date ? date.getTime() : index}-${Number.isFinite(id) ? id : index}`;
    const isMine = normalizeSender(getCell(row, "is_sender"));
    const dayKey = date ? toDateInputValue(date) : "";

    records.push({
      key,
      id: Number.isFinite(id) ? id : index,
      msgSvrId,
      type,
      isMine,
      talker,
      text: message,
      src,
      date,
      dateIso: date ? date.toISOString() : "",
      time: date ? date.getTime() : index,
      dayKey,
      monthKey: date ? `${date.getFullYear()}-${pad2(date.getMonth() + 1)}` : "",
      monthDay: date ? `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` : "",
      hour: date ? date.getHours() : -1,
      searchText: makeSearchText(message, src, talker, type),
    });
  }

  records.sort((a, b) => a.time - b.time || a.id - b.id);
  return records;
}

function parseCreateTime(rawDate) {
  if (!rawDate) return null;
  const value = String(rawDate).trim();
  if (/^\d{10,13}$/.test(value)) {
    const stamp = Number(value);
    const date = new Date(value.length === 10 ? stamp * 1000 : stamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;

  const fallback = new Date(value.replace(" ", "T"));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function normalizeType(typeName) {
  const value = String(typeName || "").trim().toLowerCase();
  if (TYPE_LABELS[value]) return value;
  return TYPE_ALIASES[typeName] || value || "unknown";
}

function normalizeSender(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function setRecords(records) {
  state.records = records;
  state.recordByKey = new Map(records.map((record) => [record.key, record]));
  state.statsCache = null;
}

function serializeRecord(record) {
  const copy = { ...record };
  delete copy.date;
  copy.dateIso = record.date ? record.date.toISOString() : record.dateIso || "";
  return copy;
}

function hydrateRecord(record) {
  const date = record.dateIso ? new Date(record.dateIso) : parseCreateTime(record.rawDate || "");
  const text = normalizeMessageText(record.text, record.type);
  const hydrated = {
    ...record,
    text,
    date: date && !Number.isNaN(date.getTime()) ? date : null,
  };
  hydrated.time = hydrated.date ? hydrated.date.getTime() : Number(record.time) || 0;
  hydrated.searchText = makeSearchText(hydrated.text, record.src, record.talker, record.type);
  return hydrated;
}

function makeSearchText(message, src, talker, type) {
  return `${normalizeMessageText(message, type)} ${src || ""} ${talker || ""} ${TYPE_LABELS[type] || type || ""}`.toLowerCase();
}

function addAssetFiles(files) {
  let accepted = 0;

  files.forEach((file) => {
    const identity = `${file.webkitRelativePath || file.name}|${file.size}|${file.lastModified}`;
    const isNew = !state.assetFiles.has(identity);
    if (isNew) {
      state.assetFiles.set(identity, file);
      accepted += 1;
    }

    buildAssetKeys(file).forEach((key) => {
      state.assetIndex.set(key, file);
    });
  });

  return accepted;
}

function buildAssetKeys(file) {
  const rawPath = file.webkitRelativePath || file.name;
  const normalized = normalizePath(rawPath);
  const parts = normalized.split("/").filter(Boolean);
  const keys = new Set([normalized, getBaseName(normalized)]);

  for (let index = 0; index < parts.length - 1; index += 1) {
    keys.add(parts.slice(index).join("/"));
  }

  return keys;
}

function normalizePath(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^(\.\.\/|\.\/)+/g, "")
    .replace(/^\/+/g, "")
    .toLowerCase();
}

function getBaseName(path) {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  return parts[parts.length - 1] || normalized;
}

function getExtension(path) {
  const base = getBaseName(path);
  const dotIndex = base.lastIndexOf(".");
  return dotIndex >= 0 ? base.slice(dotIndex + 1).toLowerCase() : "";
}

function findAssetFor(src) {
  if (!src) return null;
  const normalized = normalizePath(src);
  return state.assetIndex.get(normalized) || state.assetIndex.get(getBaseName(normalized)) || null;
}

function getObjectUrl(file) {
  if (!file) return "";
  if (file.cloud && file.url) return file.url;
  if (!state.objectUrls.has(file)) {
    state.objectUrls.set(file, URL.createObjectURL(file));
  }
  return state.objectUrls.get(file);
}

function revokeObjectUrls() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls.clear();
  state.staticAssetUrls.forEach((url) => URL.revokeObjectURL(url));
  state.staticAssetUrls.clear();
}

function clearAssets() {
  if (state.cloudMode) return;
  closeImportMenu();
  revokeObjectUrls();
  state.assetIndex.clear();
  state.assetFiles.clear();
  els.assetStatus.textContent = "素材已经清空";
  renderAll();
}

function applyFilters() {
  const terms = getSearchTerms();
  const day = els.dateInput.value;
  const selectedType = els.typeSelect.value;

  state.filtered = state.records.filter((record) => {
    if (terms.length && !recordContainsTerms(record, terms)) return false;
    if (day && record.dayKey !== day) return false;
    if (state.monthDayFilter && record.monthDay !== state.monthDayFilter) return false;
    if (selectedType !== "all" && record.type !== selectedType) return false;
    return true;
  });

  resetTimelineWindow(terms.length ? 0 : getRenderableFilteredRecords().length - 1);
  state.timelineStickBottom = !terms.length;
  updateFilterNote();
  renderAll();
}

function getSearchTerms() {
  return els.searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function recordContainsTerms(record, terms) {
  const text = `${cleanText(record.text)} ${getSenderName(record)} ${TYPE_LABELS[record.type] || record.type || ""}`.toLowerCase();
  return terms.every((term) => text.includes(term));
}

function updateFilterNote() {
  const notes = [];
  if (state.monthDayFilter) notes.push(`今日历史 ${state.monthDayFilter}`);
  if (els.dateInput.value) notes.push(els.dateInput.value);
  if (els.typeSelect.value !== "all") notes.push(TYPE_LABELS[els.typeSelect.value] || els.typeSelect.value);
  if (els.searchInput.value.trim()) notes.push(`列出 ${formatNumber(getRenderableFilteredRecords().length)} 条关键词结果`);
  els.activeFilterNote.textContent = notes.join(" · ");
}

function resetTimelineWindow(anchorIndex = state.filtered.length - 1) {
  const total = getRenderableFilteredRecords().length;
  if (!total) {
    state.currentStart = 0;
    state.currentEnd = 0;
    return;
  }

  const safeAnchor = clamp(anchorIndex, 0, total - 1);
  state.currentEnd = Math.min(total, Math.max(safeAnchor + 1, state.pageSize));
  state.currentStart = Math.max(0, state.currentEnd - state.pageSize);
}

function showTodayHistory() {
  const today = new Date();
  state.monthDayFilter = `${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
  els.dateInput.value = "";
  applyFilters();
  switchTab("timeline");
}

function jumpToRandomMoment() {
  const records = getRenderableFilteredRecords();
  if (!records.length) return;
  const randomIndex = Math.floor(Math.random() * records.length);
  state.currentStart = clamp(randomIndex - Math.floor(state.pageSize / 2), 0, Math.max(0, records.length - state.pageSize));
  state.currentEnd = Math.min(records.length, Math.max(state.currentStart + state.pageSize, randomIndex + 1));
  state.timelineStickBottom = false;
  switchTab("timeline");
  renderTimeline();
}

function resetFilters() {
  state.monthDayFilter = "";
  els.searchInput.value = "";
  els.dateInput.value = "";
  els.typeSelect.value = "all";
  applyFilters();
}

function switchTab(tab) {
  state.activeTab = tab;

  els.tabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  els.views.forEach((view) => {
    view.hidden = view.dataset.view !== tab;
  });

  renderAll();
}

function renderAll() {
  renderQuickStats();
  if (state.activeTab === "timeline") {
    renderTimeline();
  } else if (state.activeTab === "highlights") {
    renderHighlights();
  } else if (state.activeTab === "stats") {
    renderStats();
  } else if (state.activeTab === "interaction") {
    renderInteraction();
  }
}

function renderQuickStats() {
  const total = state.records.length;
  const mediaRecords = state.records.filter((record) => MEDIA_TYPES.has(record.type) && record.src);
  const matched = mediaRecords.filter((record) => Boolean(findAssetFor(record.src))).length;
  const days = new Set(state.records.map((record) => record.dayKey).filter(Boolean)).size;
  const matchedRate = formatMatchRate(matched, mediaRecords.length);

  const cells = [
    [formatNumber(total), "条消息"],
    [formatNumber(mediaRecords.length), "份媒体"],
    [matchedRate, "素材匹配"],
    [formatNumber(days), "有聊天的日子"],
  ];

  els.quickStats.replaceChildren(...cells.map(([value, label]) => makeMetricCell(value, label)));
}

function renderTimeline() {
  if (!state.records.length) {
    setTimelineEmpty("先把聊天记录放进来", "再补上照片和表情，回忆会自己长成原来的样子。");
    updatePager();
    return;
  }

  const records = getRenderableFilteredRecords();
  if (!records.length) {
    setTimelineEmpty("没有匹配结果", "换个关键词、日期或消息类型试试。");
    updatePager();
    return;
  }

  if (isSearchMode()) {
    renderSearchResults(records);
    return;
  }

  const total = records.length;
  const start = clamp(state.currentStart, 0, Math.max(0, total - 1));
  const end = clamp(state.currentEnd || total, Math.min(start + 1, total), total);
  state.currentStart = start;
  state.currentEnd = end;
  const fragment = document.createDocumentFragment();
  let previousDay = "";

  records.slice(start, end).forEach((record) => {
    if (record.dayKey && record.dayKey !== previousDay) {
      fragment.appendChild(makeDateSeparator(record.date));
      previousDay = record.dayKey;
    }
    fragment.appendChild(makeMessage(record));
  });

  els.timelineList.replaceChildren(fragment);
  updatePager();

  if (state.timelineStickBottom) {
    window.requestAnimationFrame(() => {
      els.timelineList.scrollTop = els.timelineList.scrollHeight;
    });
    state.timelineStickBottom = false;
  }
}

function getRenderableFilteredRecords() {
  return state.filtered.filter(shouldRenderRecord);
}

function shouldRenderRecord(record) {
  if (MEDIA_TYPES.has(record.type) && !findAssetFor(record.src)) {
    return false;
  }
  return true;
}

function isSearchMode() {
  return Boolean(els.searchInput.value.trim());
}

function renderSearchResults(records) {
  const terms = getSearchTerms();
  const total = records.length;
  const start = clamp(state.currentStart, 0, Math.max(0, total - 1));
  const end = clamp(state.currentEnd || Math.min(total, state.pageSize), Math.min(start + 1, total), total);
  state.currentStart = start;
  state.currentEnd = end;

  const fragment = document.createDocumentFragment();
  records.slice(start, end).forEach((record) => {
    fragment.appendChild(makeSearchResultCard(record, terms));
  });
  els.timelineList.replaceChildren(fragment);
  updatePager();
}

function makeSearchResultCard(record, terms) {
  const card = element("article", "search-result-card");
  card.dataset.key = record.key;
  card.appendChild(element("div", "search-result-meta", `${formatDay(record.date)} ${formatTime(record.date)} · ${getSenderName(record)}`));
  const snippets = getMatchingSentences(record, terms);
  snippets.forEach((sentence) => {
    const line = element("p", "search-result-line");
    appendHighlightedText(line, sentence, terms);
    card.appendChild(line);
  });
  return card;
}

function getMatchingSentences(record, terms) {
  const text = cleanPreview(record.text, 600) || getRecordPreview(record, 600);
  if (!text) return [TYPE_LABELS[record.type] || "消息"];
  const sentences = text
    .split(/(?<=[。！？!?；;…])|\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const matches = sentences.filter((sentence) => terms.every((term) => sentence.toLowerCase().includes(term)));
  return (matches.length ? matches : [text]).slice(0, 4);
}

function appendHighlightedText(container, text, terms) {
  const normalizedTerms = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!normalizedTerms.length) {
    container.textContent = text;
    return;
  }

  const lower = text.toLowerCase();
  let index = 0;
  while (index < text.length) {
    const found = normalizedTerms
      .map((term) => ({ term, position: lower.indexOf(term, index) }))
      .filter((item) => item.position >= 0)
      .sort((a, b) => a.position - b.position || b.term.length - a.term.length)[0];
    if (!found) {
      container.appendChild(document.createTextNode(text.slice(index)));
      break;
    }
    if (found.position > index) {
      container.appendChild(document.createTextNode(text.slice(index, found.position)));
    }
    const mark = element("mark", "", text.slice(found.position, found.position + found.term.length));
    container.appendChild(mark);
    index = found.position + found.term.length;
  }
}

function handleTimelineScroll() {
  const records = getRenderableFilteredRecords();
  if (state.activeTab !== "timeline" || !records.length) return;
  window.clearTimeout(state.scrollTimer);
  state.scrollTimer = window.setTimeout(() => {
    const list = els.timelineList;
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    els.scrollBottomBtn.hidden = distanceFromBottom < 240;
    if (list.scrollTop < 18 && state.currentStart > 0) {
      const previousHeight = list.scrollHeight;
      state.currentStart = Math.max(0, state.currentStart - state.pageSize);
      state.timelineStickBottom = false;
      renderTimeline();
      window.requestAnimationFrame(() => {
        list.scrollTop = Math.max(24, list.scrollHeight - previousHeight + 24);
      });
    } else if (distanceFromBottom < 18 && state.currentEnd < records.length) {
      state.currentEnd = Math.min(records.length, state.currentEnd + state.pageSize);
      state.timelineStickBottom = false;
      renderTimeline();
      window.requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight;
      });
    }
  }, 80);
}

function updatePager() {
  const total = getRenderableFilteredRecords().length;
  if (!state.records.length) {
    els.rangeInfo.textContent = "把聊天记录放进来，就能慢慢翻";
    els.scrollBottomBtn.hidden = true;
    return;
  }
  if (!total) {
    els.rangeInfo.textContent = "0 / 0";
    els.scrollBottomBtn.hidden = true;
    return;
  }

  const start = state.currentStart;
  const end = state.currentEnd || total;
  if (isSearchMode()) {
    const suffix = end < total ? " · 下滑继续" : "";
    els.rangeInfo.textContent = `找到 ${formatNumber(total)} 条 · ${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)}${suffix}`;
    return;
  }
  const prefix = start > 0 ? "上滑看看更早 · " : "已经到最早 · ";
  const suffix = end < total ? " · 下滑继续" : " · 最新";
  els.rangeInfo.textContent = `${prefix}${formatNumber(start + 1)}-${formatNumber(end)} / ${formatNumber(total)}${suffix}`;
}

function scrollTimelineToBottom() {
  const total = getRenderableFilteredRecords().length;
  state.currentEnd = total;
  state.currentStart = Math.max(0, state.currentEnd - state.pageSize);
  state.timelineStickBottom = true;
  renderTimeline();
}

function setTimelineEmpty(title, body) {
  const wrapper = makeEmptyBlock(title, body);
  els.timelineList.replaceChildren(wrapper);
}

function makeMessage(record) {
  const side = record.isMine ? "mine" : "theirs";
  const article = element("article", `message ${side} ${record.type}`);
  article.dataset.key = record.key;
  const avatar = element("div", "message-avatar", getAvatarText(record));
  const stack = element("div", "message-stack");
  const meta = element("div", "message-meta");
  meta.appendChild(element("span", "", `${getSenderName(record)} · ${formatTime(record.date)} · ${TYPE_LABELS[record.type] || TYPE_LABELS.unknown}`));
  const favoriteButton = element("button", `favorite-button ${state.favorites.has(record.key) ? "active" : ""}`, state.favorites.has(record.key) ? "已收藏" : "收藏");
  favoriteButton.type = "button";
  favoriteButton.dataset.action = "favorite";
  favoriteButton.dataset.key = record.key;
  meta.appendChild(favoriteButton);

  const bubble = element("div", "bubble");
  appendRecordContent(bubble, record);
  stack.append(meta, bubble);
  article.append(avatar, stack);
  return article;
}

function appendRecordContent(container, record) {
  if (VISUAL_TYPES.has(record.type)) {
    appendVisualMedia(container, record);
  } else if (record.type === "video") {
    appendVideoMedia(container, record);
  } else if (record.type === "voice") {
    appendVoiceMedia(container, record);
  } else if (record.type === "file") {
    appendFileMedia(container, record);
  } else if (record.type === "location") {
    container.textContent = record.text || "位置消息";
  } else {
    container.textContent = record.text || "空消息";
  }
}

function appendVisualMedia(container, record) {
  const file = findAssetFor(record.src);
  if (!file) {
    appendMissingMedia(container, record);
    return;
  }
  if (file.encrypted) {
    appendEncryptedVisualMedia(container, record, file);
    return;
  }

  const image = new Image();
  image.className = "media-img";
  image.loading = "lazy";
  image.alt = `${TYPE_LABELS[record.type] || "图片"} ${record.id}`;
  image.src = getObjectUrl(file);
  image.addEventListener("click", () => openLightbox(record, file));
  container.appendChild(image);
  appendShortCaption(container, record);
}

function appendVideoMedia(container, record) {
  const file = findAssetFor(record.src);
  if (!file) {
    appendMissingMedia(container, record);
    return;
  }
  if (file.encrypted) {
    appendEncryptedVideoMedia(container, record, file);
    return;
  }

  const video = document.createElement("video");
  video.className = "media-video";
  video.controls = true;
  video.preload = "metadata";
  video.src = getObjectUrl(file);
  video.addEventListener("click", () => openLightbox(record, file));
  container.appendChild(video);
  appendShortCaption(container, record);
}

function appendVoiceMedia(container, record) {
  const file = findAssetFor(record.src);
  if (!file) {
    appendMissingMedia(container, record);
    return;
  }
  if (file.encrypted) {
    appendEncryptedVoiceMedia(container, record, file);
    return;
  }

  const extension = getExtension(record.src || file.name);
  if (AUDIO_EXTENSIONS.has(extension)) {
    const audio = document.createElement("audio");
    audio.className = "media-audio";
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = getObjectUrl(file);
    container.appendChild(audio);
  } else {
    const link = element("a", "missing-media", `语音文件：${getBaseName(record.src || file.name)}`);
    link.href = getObjectUrl(file);
    link.target = "_blank";
    container.appendChild(link);
  }
}

function appendFileMedia(container, record) {
  const file = findAssetFor(record.src);
  if (!file) {
    appendMissingMedia(container, record);
    return;
  }
  if (file.encrypted) {
    appendEncryptedFileMedia(container, record, file);
    return;
  }

  const link = element("a", "missing-media", `文件：${getBaseName(record.src || file.name)}`);
  link.href = getObjectUrl(file);
  link.target = "_blank";
  container.appendChild(link);
}

function appendEncryptedVisualMedia(container, record, file) {
  const image = new Image();
  image.className = "media-img";
  image.loading = "lazy";
  image.alt = `${TYPE_LABELS[record.type] || "图片"} ${record.id}`;
  image.addEventListener("click", () => openLightbox(record, file));
  container.appendChild(image);
  getStaticAssetUrl(file)
    .then((url) => {
      image.src = url;
    })
    .catch(() => {
      image.replaceWith(element("div", "missing-media", "解密素材失败"));
    });
  appendShortCaption(container, record);
}

function appendEncryptedVideoMedia(container, record, file) {
  const video = document.createElement("video");
  video.className = "media-video";
  video.controls = true;
  video.preload = "metadata";
  video.addEventListener("click", () => openLightbox(record, file));
  container.appendChild(video);
  getStaticAssetUrl(file)
    .then((url) => {
      video.src = url;
    })
    .catch(() => {
      video.replaceWith(element("div", "missing-media", "解密视频失败"));
    });
  appendShortCaption(container, record);
}

function appendEncryptedVoiceMedia(container, record, file) {
  const extension = getExtension(record.src || file.name);
  if (AUDIO_EXTENSIONS.has(extension)) {
    const audio = document.createElement("audio");
    audio.className = "media-audio";
    audio.controls = true;
    audio.preload = "metadata";
    container.appendChild(audio);
    getStaticAssetUrl(file)
      .then((url) => {
        audio.src = url;
      })
      .catch(() => {
        audio.replaceWith(element("div", "missing-media", "解密语音失败"));
      });
  } else {
    appendEncryptedFileMedia(container, record, file);
  }
}

function appendEncryptedFileMedia(container, record, file) {
  const button = element("button", "missing-media", `解密文件：${getBaseName(record.src || file.name)}`);
  button.type = "button";
  button.addEventListener("click", async () => {
    button.textContent = "正在解密...";
    try {
      const url = await getStaticAssetUrl(file);
      window.open(url, "_blank", "noopener");
      button.textContent = `文件：${getBaseName(record.src || file.name)}`;
    } catch {
      button.textContent = "解密文件失败";
    }
  });
  container.appendChild(button);
}

function appendMissingMedia(container, record) {
  const name = getBaseName(record.src) || TYPE_LABELS[record.type] || "媒体";
  container.appendChild(element("div", "missing-media", `未匹配素材：${name}`));
}

function appendShortCaption(container, record) {
  const text = cleanPreview(record.text, 160);
  if (!text || text.includes("<msg")) return;
  const caption = element("div", "missing-media", text);
  caption.style.marginTop = "8px";
  container.appendChild(caption);
}

function makeDateSeparator(date) {
  return element("div", "date-separator", date ? dayFormatter.format(date) : "未知日期");
}

async function toggleFavorite(key) {
  const record = state.recordByKey.get(key);
  if (!record) return;

  if (state.favorites.has(key)) {
    state.favorites.delete(key);
    await deleteOne("favorites", key);
  } else {
    state.favorites.add(key);
    await putOne("favorites", { key, createdAt: Date.now() });
  }

  renderTimeline();
  renderHighlights();
}

async function clearHighlights() {
  state.favorites.clear();
  await clearStore("favorites");
  renderTimeline();
  renderHighlights();
}

function renderHighlights() {
  const records = state.records.filter((record) => state.favorites.has(record.key));
  els.highlightInfo.textContent = records.length ? `已收藏 ${formatNumber(records.length)} 段高光对话` : "收藏聊天气泡后生成专属时光轴";
  els.clearHighlightsBtn.disabled = records.length === 0;

  if (!records.length) {
    els.highlightList.replaceChildren(makeEmptyBlock("还没有高光", "在时间线里点“收藏”，这里会自动长出专属时光轴。"));
    return;
  }

  const fragment = document.createDocumentFragment();
  let previousDay = "";
  records.forEach((record) => {
    if (record.dayKey !== previousDay) {
      fragment.appendChild(element("div", "highlight-day", formatDay(record.date)));
      previousDay = record.dayKey;
    }
    fragment.appendChild(makeHighlightCard(record));
  });
  els.highlightList.replaceChildren(fragment);
}

function makeHighlightCard(record) {
  const card = element("article", "highlight-card");
  card.dataset.key = record.key;
  card.appendChild(element("div", "highlight-meta", `${formatTime(record.date)} · ${getSenderName(record)} · ${TYPE_LABELS[record.type] || "消息"}`));
  card.appendChild(element("p", "highlight-preview", getRecordPreview(record, 140)));
  const actions = element("div", "highlight-actions");
  const jumpButton = element("button", "pager-button mini", "定位");
  jumpButton.type = "button";
  jumpButton.dataset.action = "jump-record";
  jumpButton.dataset.key = record.key;
  const removeButton = element("button", "pager-button mini", "取消收藏");
  removeButton.type = "button";
  removeButton.dataset.action = "favorite";
  removeButton.dataset.key = record.key;
  actions.append(jumpButton, removeButton);
  card.appendChild(actions);
  return card;
}

function handleRecordAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const key = button.dataset.key;
  if (button.dataset.action === "favorite") {
    toggleFavorite(key);
  } else if (button.dataset.action === "jump-record") {
    jumpToRecord(key);
  }
}

function jumpToRecord(key) {
  const record = state.recordByKey.get(key);
  if (!record) return;

  state.monthDayFilter = "";
  els.searchInput.value = "";
  els.typeSelect.value = "all";
  els.dateInput.value = record.dayKey || "";
  applyFilters();

  const index = state.filtered.findIndex((item) => item.key === key);
  if (index >= 0) {
    state.currentStart = clamp(index - Math.floor(state.pageSize / 2), 0, Math.max(0, state.filtered.length - state.pageSize));
    state.currentEnd = Math.min(state.filtered.length, state.currentStart + state.pageSize);
    state.timelineStickBottom = false;
  }
  switchTab("timeline");
  renderTimeline();

  window.requestAnimationFrame(() => {
    const target = Array.from(els.timelineList.querySelectorAll("article.message")).find((node) => node.dataset.key === key);
    if (target) {
      target.scrollIntoView({ block: "center" });
      target.classList.add("pulse");
      window.setTimeout(() => target.classList.remove("pulse"), 1400);
    }
  });
}

function renderStats() {
  if (!state.records.length) {
    els.overviewStats.replaceChildren(makeEmptyBlock("选择 CSV 后开始", "统计会在导入后生成。"));
    els.typeStats.replaceChildren();
    els.wordCloud.replaceChildren();
    els.yearHeatmap.replaceChildren();
    els.monthStats.replaceChildren();
    els.hourStats.replaceChildren();
    return;
  }

  renderOverviewStats();
  renderTypeStats();
  renderWordCloud();
  renderYearHeatmap();
  renderMonthStats();
  renderHourStats();
}

function renderOverviewStats() {
  const first = state.records[0];
  const last = state.records[state.records.length - 1];
  const activeDays = new Set(state.records.map((record) => record.dayKey).filter(Boolean)).size;
  const streak = getLongestStreak();
  const mediaCount = state.records.filter((record) => MEDIA_TYPES.has(record.type)).length;
  const cells = [
    [formatNumber(state.records.length), "总消息"],
    [formatNumber(mediaCount), "媒体消息"],
    [formatDay(first.date), "第一天"],
    [formatDay(last.date), "最近一天"],
    [formatNumber(activeDays), "有聊天的天"],
    [`${formatNumber(streak)} 天`, "最长连续"],
    [formatNumber(state.favorites.size), "高光收藏"],
  ];

  els.overviewStats.replaceChildren(...cells.map(([value, label]) => makeMetricCell(value, label)));
}

function renderTypeStats() {
  const counts = countBy(state.records, (record) => record.type);
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? entries[0][1] : 1;
  const fragment = document.createDocumentFragment();

  entries.forEach(([type, count]) => {
    const row = element("div", "bar-row");
    row.appendChild(element("span", "", TYPE_LABELS[type] || type));
    const track = element("span", "bar-track");
    const fill = element("span", "bar-fill");
    fill.style.setProperty("--bar-width", `${Math.max(2, Math.round((count / max) * 100))}%`);
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(element("span", "", formatNumber(count)));
    fragment.appendChild(row);
  });

  els.typeStats.replaceChildren(fragment);
}

function renderWordCloud() {
  const entries = getStatsCache().wordCloud;
  if (!entries.length) {
    els.wordCloud.replaceChildren(makeEmptyBlock("还没有词云", "导入文字聊天后会自动生成。"));
    return;
  }

  const max = entries[0][1];
  const min = entries[entries.length - 1][1];
  const fragment = document.createDocumentFragment();
  entries.forEach(([word, count], index) => {
    const token = element("button", `word-token tone-${index % 5}`, word);
    token.type = "button";
    token.title = `${word}：${formatNumber(count)} 次`;
    const ratio = max === min ? 1 : (count - min) / (max - min);
    const angle = index * 137.508;
    const radius = 8 + Math.sqrt(index + 1) * 8.4;
    const x = 50 + Math.cos((angle * Math.PI) / 180) * radius;
    const y = 50 + Math.sin((angle * Math.PI) / 180) * radius * 0.72;
    token.style.setProperty("--word-size", `${16 + Math.round(ratio * 22)}px`);
    token.style.setProperty("--word-x", `${clamp(x, 8, 92).toFixed(1)}%`);
    token.style.setProperty("--word-y", `${clamp(y, 10, 90).toFixed(1)}%`);
    token.style.setProperty("--word-rotate", `${((index % 7) - 3) * 4}deg`);
    token.addEventListener("click", () => {
      els.searchInput.value = word;
      state.monthDayFilter = "";
      els.dateInput.value = "";
      applyFilters();
      switchTab("timeline");
    });
    fragment.appendChild(token);
  });
  els.wordCloud.replaceChildren(fragment);
}

function renderYearHeatmap() {
  const heatmap = getStatsCache().heatmap;
  if (!heatmap.days.length) {
    els.yearHeatmap.replaceChildren(makeEmptyBlock("还没有热力图", "导入聊天记录后会绘制最近 365 天。"));
    return;
  }

  const wrapper = element("div", "heatmap-wrapper");
  const grid = element("div", "heatmap-grid");
  heatmap.days.forEach((day) => {
    const cell = element("button", `heat-cell level-${getHeatLevel(day.count, heatmap.max)}`, "");
    cell.type = "button";
    cell.dataset.day = day.day;
    cell.title = `${day.day}：${formatNumber(day.count)} 条消息`;
    grid.appendChild(cell);
  });
  const legend = element("div", "heatmap-legend");
  legend.append(element("span", "", formatDay(heatmap.start)), element("span", "", "少"), element("i", "heat-cell level-1"), element("i", "heat-cell level-2"), element("i", "heat-cell level-3"), element("i", "heat-cell level-4"), element("span", "", "多"), element("span", "", formatDay(heatmap.end)));
  wrapper.append(grid, legend);
  els.yearHeatmap.replaceChildren(wrapper);
}

function handleHeatmapClick(event) {
  const cell = event.target.closest("[data-day]");
  if (!cell) return;
  jumpToDay(cell.dataset.day);
}

function jumpToDay(day) {
  state.monthDayFilter = "";
  els.searchInput.value = "";
  els.typeSelect.value = "all";
  els.dateInput.value = day;
  applyFilters();
  switchTab("timeline");
}

function renderMonthStats() {
  const counts = countBy(state.records.filter((record) => record.monthKey), (record) => record.monthKey);
  const entries = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(1, ...entries.map((entry) => entry[1]));
  const fragment = document.createDocumentFragment();

  entries.forEach(([month, count]) => {
    const item = element("div", "month-bar");
    const fill = document.createElement("span");
    fill.style.setProperty("--bar-height", `${Math.max(8, Math.round((count / max) * 170))}px`);
    fill.title = `${month}：${formatNumber(count)} 条`;
    item.appendChild(fill);
    item.appendChild(element("span", "", month.slice(2)));
    fragment.appendChild(item);
  });

  els.monthStats.replaceChildren(fragment);
}

function renderHourStats() {
  const hours = new Array(24).fill(0);
  state.records.forEach((record) => {
    if (record.hour >= 0) hours[record.hour] += 1;
  });
  const max = Math.max(1, ...hours);
  const fragment = document.createDocumentFragment();

  hours.forEach((count, hour) => {
    const item = element("div", "hour-bar");
    const fill = document.createElement("span");
    fill.style.setProperty("--bar-height", `${Math.max(8, Math.round((count / max) * 170))}px`);
    fill.title = `${pad2(hour)}:00：${formatNumber(count)} 条`;
    item.appendChild(fill);
    item.appendChild(element("span", "", pad2(hour)));
    fragment.appendChild(item);
  });

  els.hourStats.replaceChildren(fragment);
}

function getStatsCache() {
  if (state.statsCache && state.statsCache.count === state.records.length) {
    return state.statsCache;
  }
  state.statsCache = {
    count: state.records.length,
    wordCloud: computeWordCloud(),
    heatmap: computeHeatmap(),
  };
  return state.statsCache;
}

function computeWordCloud() {
  const counts = new Map();
  state.records.forEach((record) => {
    if (record.type !== "text") return;
    const clean = cleanText(record.text);
    if (!clean || clean.length > 500) return;
    const parts = clean.match(/[a-zA-Z0-9]{2,}|[\u4e00-\u9fff]{2,}/g) || [];
    parts.forEach((part) => addWordTokens(counts, part.toLowerCase()));
  });

  return Array.from(counts.entries())
    .filter(([word, count]) => count >= 4 && !WORD_STOP_LIST.has(word))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 72);
}

function addWordTokens(counts, part) {
  if (/^[\u4e00-\u9fff]+$/.test(part)) {
    if (part.length <= 4) {
      incrementCount(counts, part);
      return;
    }
    for (let index = 0; index < part.length - 1; index += 1) {
      incrementCount(counts, part.slice(index, index + 2));
    }
    return;
  }
  incrementCount(counts, part);
}

function incrementCount(counts, word) {
  if (shouldSkipWord(word)) return;
  counts.set(word, (counts.get(word) || 0) + 1);
}

function shouldSkipWord(word) {
  if (word.length < 2 || WORD_STOP_LIST.has(word)) return true;
  if (/^\d+$/.test(word)) return true;
  if (/^(wxid|msg|tmp|node|publisher|sequence|signature)/i.test(word)) return true;
  if (/^[a-z0-9_]{10,}$/i.test(word)) return true;
  if (/^x[0-9a-f]{2,}$/i.test(word)) return true;
  if (/^[a-z]\d$/i.test(word)) return true;
  return false;
}

function computeHeatmap() {
  const datedRecords = state.records.filter((record) => record.date);
  if (!datedRecords.length) return { days: [], max: 0, start: null, end: null };
  const latest = startOfDay(datedRecords[datedRecords.length - 1].date);
  const start = new Date(latest.getTime() - 364 * DAY_MS);
  const counts = countBy(datedRecords, (record) => record.dayKey);
  const days = [];
  let max = 0;
  for (let index = 0; index < 365; index += 1) {
    const date = new Date(start.getTime() + index * DAY_MS);
    const day = toDateInputValue(date);
    const count = counts.get(day) || 0;
    max = Math.max(max, count);
    days.push({ day, count });
  }
  return { days, max, start, end: latest };
}

function getHeatLevel(count, max) {
  if (!count || !max) return 0;
  return Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count / max) * 4)));
}

function renderInteraction() {
  renderNotes();
  renderAnniversaries();
}

async function addNote() {
  const text = els.noteInput.value.trim();
  if (!text) return;
  const note = {
    author: els.noteAuthorInput.value.trim() || "我",
    text,
    color: state.notes.length % 4,
    createdAt: Date.now(),
  };
  if (state.db) {
    const transaction = state.db.transaction("notes", "readwrite");
    const request = transaction.objectStore("notes").add(note);
    const id = await requestToPromise(request);
    await transactionDone(transaction);
    note.id = id;
  } else {
    note.id = `temp-${Date.now()}`;
  }
  state.notes.unshift(note);
  els.noteInput.value = "";
  renderNotes();
}

function renderNotes() {
  if (!state.notes.length) {
    els.noteBoard.replaceChildren(makeEmptyBlock("便利贴空空的", "写一句话，给这个回忆库加一点现在的温度。"));
    return;
  }

  const fragment = document.createDocumentFragment();
  state.notes.forEach((note) => {
    const card = element("article", `note-card color-${note.color || 0}`);
    card.appendChild(element("p", "note-text", note.text));
    card.appendChild(element("div", "note-meta", `${note.author || "我"} · ${formatDateTime(new Date(note.createdAt))}`));
    const button = element("button", "note-delete", "删除");
    button.type = "button";
    button.dataset.action = "delete-note";
    button.dataset.id = note.id;
    card.appendChild(button);
    fragment.appendChild(card);
  });
  els.noteBoard.replaceChildren(fragment);
}

async function handleNoteBoardClick(event) {
  const button = event.target.closest("[data-action='delete-note']");
  if (!button) return;
  const id = Number.isNaN(Number(button.dataset.id)) ? button.dataset.id : Number(button.dataset.id);
  state.notes = state.notes.filter((note) => note.id !== id);
  await deleteOne("notes", id);
  renderNotes();
}

async function addAnniversary() {
  const name = els.anniversaryNameInput.value.trim();
  const date = els.anniversaryDateInput.value;
  if (!name || !date) return;
  const item = {
    name,
    date,
    createdAt: Date.now(),
  };
  if (state.db) {
    const transaction = state.db.transaction("anniversaries", "readwrite");
    const request = transaction.objectStore("anniversaries").add(item);
    const id = await requestToPromise(request);
    await transactionDone(transaction);
    item.id = id;
  } else {
    item.id = `temp-${Date.now()}`;
  }
  state.anniversaries.push(item);
  state.anniversaries.sort((a, b) => a.date.localeCompare(b.date));
  els.anniversaryNameInput.value = "";
  els.anniversaryDateInput.value = "";
  renderAnniversaries();
}

function renderAnniversaries() {
  if (!state.anniversaries.length) {
    els.anniversaryList.replaceChildren(makeEmptyBlock("还没有纪念日", "加上第一次见面、在一起、每一个想记住的日子。"));
    return;
  }

  const fragment = document.createDocumentFragment();
  state.anniversaries.forEach((item) => {
    const countdown = getAnniversaryCountdown(item.date);
    const card = element("article", "anniversary-card");
    card.appendChild(element("strong", "", item.name));
    card.appendChild(element("span", "", `${item.date} · 已经 ${formatNumber(Math.max(0, countdown.elapsedDays))} 天`));
    card.appendChild(element("b", "", countdown.days === 0 ? "就是今天" : `${formatNumber(countdown.days)} 天后`));
    const button = element("button", "note-delete", "删除");
    button.type = "button";
    button.dataset.action = "delete-anniversary";
    button.dataset.id = item.id;
    card.appendChild(button);
    fragment.appendChild(card);
  });
  els.anniversaryList.replaceChildren(fragment);
}

async function handleAnniversaryClick(event) {
  const button = event.target.closest("[data-action='delete-anniversary']");
  if (!button) return;
  const id = Number.isNaN(Number(button.dataset.id)) ? button.dataset.id : Number(button.dataset.id);
  state.anniversaries = state.anniversaries.filter((item) => item.id !== id);
  await deleteOne("anniversaries", id);
  renderAnniversaries();
}

function getAnniversaryCountdown(dateText) {
  const original = new Date(`${dateText}T00:00:00`);
  const today = startOfDay(new Date());
  let next = new Date(today.getFullYear(), original.getMonth(), original.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, original.getMonth(), original.getDate());
  return {
    days: Math.round((next - today) / DAY_MS),
    elapsedDays: Math.floor((today - original) / DAY_MS),
  };
}

function openLightbox(record, file) {
  if (file && file.encrypted) {
    openEncryptedLightbox(record, file);
    return;
  }

  els.lightboxBody.replaceChildren();

  if (record.type === "video") {
    const video = document.createElement("video");
    video.controls = true;
    video.autoplay = true;
    video.src = getObjectUrl(file);
    els.lightboxBody.appendChild(video);
  } else {
    const image = new Image();
    image.alt = `${TYPE_LABELS[record.type] || "媒体"} ${record.id}`;
    image.src = getObjectUrl(file);
    els.lightboxBody.appendChild(image);
  }

  els.lightboxCaption.textContent = `${formatDay(record.date)} ${formatTime(record.date)} · ${getBaseName(record.src || file.name)}`;
  if (typeof els.lightbox.showModal === "function") {
    els.lightbox.showModal();
  } else {
    els.lightbox.setAttribute("open", "");
  }
}

async function openEncryptedLightbox(record, file) {
  els.lightboxBody.replaceChildren(element("div", "missing-media", "正在解密..."));
  els.lightboxCaption.textContent = `${formatDay(record.date)} ${formatTime(record.date)} · ${getBaseName(record.src || file.name)}`;
  if (typeof els.lightbox.showModal === "function") {
    els.lightbox.showModal();
  } else {
    els.lightbox.setAttribute("open", "");
  }

  try {
    const url = await getStaticAssetUrl(file);
    els.lightboxBody.replaceChildren();
    if (record.type === "video") {
      const video = document.createElement("video");
      video.controls = true;
      video.autoplay = true;
      video.src = url;
      els.lightboxBody.appendChild(video);
    } else {
      const image = new Image();
      image.alt = `${TYPE_LABELS[record.type] || "媒体"} ${record.id}`;
      image.src = url;
      els.lightboxBody.appendChild(image);
    }
  } catch {
    els.lightboxBody.replaceChildren(element("div", "missing-media", "解密素材失败"));
  }
}

function closeLightbox() {
  if (els.lightbox.open && typeof els.lightbox.close === "function") {
    els.lightbox.close();
  } else {
    els.lightbox.removeAttribute("open");
  }
  els.lightboxBody.replaceChildren();
}

function makeMetricCell(value, label) {
  const cell = document.createElement("div");
  cell.appendChild(element("strong", "", value));
  cell.appendChild(element("span", "", label));
  return cell;
}

function makeEmptyBlock(title, body) {
  const wrapper = element("div", "empty-state");
  wrapper.appendChild(element("h2", "", title));
  wrapper.appendChild(element("p", "", body));
  return wrapper;
}

function element(tagName, className = "", text = "") {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== "") node.textContent = text;
  return node;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function countBy(items, getKey) {
  const counts = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function getLongestStreak() {
  const days = Array.from(new Set(state.records.map((record) => record.dayKey).filter(Boolean))).sort();
  let longest = 0;
  let current = 0;
  let previousTime = 0;

  days.forEach((day) => {
    const time = new Date(`${day}T00:00:00`).getTime();
    if (previousTime && time - previousTime === DAY_MS) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
    previousTime = time;
  });

  return longest;
}

function inferPartnerName(records) {
  applyFixedIdentity("我", "乖乖");
}

function saveNames() {
  const names = {
    mine: els.mineNameInput.value.trim() || "我",
    partner: els.partnerNameInput.value.trim() || "乖乖",
  };
  els.noteAuthorInput.value = names.mine;
  setMeta("names", names).catch(() => {});
}

function applyFixedIdentity(mine, partner) {
  els.mineNameInput.value = mine || "我";
  els.partnerNameInput.value = partner || "乖乖";
  els.noteAuthorInput.value = els.mineNameInput.value;
}

function getSenderName(record) {
  if (record.isMine) return els.mineNameInput.value.trim() || "我";
  return els.partnerNameInput.value.trim() || record.talker || "对方";
}

function getAvatarText(record) {
  const name = getSenderName(record);
  return name.trim().slice(0, 1) || (record.isMine ? "我" : "乖");
}

function getRecordPreview(record, maxLength = 120) {
  const text = cleanPreview(record.text, maxLength);
  if (text) return text;
  if (record.src) return `${TYPE_LABELS[record.type] || "媒体"}：${getBaseName(record.src)}`;
  return TYPE_LABELS[record.type] || "消息";
}

const HTML_ENTITIES = Object.freeze({
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
});

const APP_MESSAGE_LABELS = Object.freeze({
  5: "链接",
  6: "文件",
  8: "表情",
  17: "实时位置",
  19: "聊天记录",
  33: "小程序",
  36: "小程序",
  57: "引用",
  62: "视频",
  2000: "转账",
});

function normalizeMessageText(value, type = "text") {
  const decoded = decodeHtmlEntities(value)
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, " ")
    .trim();
  if (!decoded) return "";
  if (looksLikeStructuredMessage(decoded)) {
    return summarizeStructuredMessage(decoded, type);
  }
  return tidyPlainText(decoded);
}

function cleanText(value) {
  return tidyPlainText(decodeHtmlEntities(value).replace(/<[^>]+>/g, " "));
}

function cleanPreview(value, maxLength = 120) {
  const text = normalizeMessageText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function decodeHtmlEntities(value) {
  let text = String(value || "");
  for (let index = 0; index < 2; index += 1) {
    const previous = text;
    text = text
      .replace(/&#(x[0-9a-f]+|\d+);/gi, decodeNumericEntity)
      .replace(/&([a-z]+);/gi, (match, name) => HTML_ENTITIES[name.toLowerCase()] || match);
    if (text === previous) break;
  }
  return text;
}

function decodeNumericEntity(match, body) {
  const radix = body[0].toLowerCase() === "x" ? 16 : 10;
  const value = Number.parseInt(radix === 16 ? body.slice(1) : body, radix);
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return match;
  try {
    return String.fromCodePoint(value);
  } catch {
    return match;
  }
}

function looksLikeStructuredMessage(text) {
  const trimmed = String(text || "").trim();
  return /^<(msg|appmsg|sysmsg|voipmsg|voipinvitemsg|emoji|type|title|des|desc|content|refermsg)\b/i.test(trimmed) ||
    /<(msg|appmsg|sysmsg|voipmsg|voipinvitemsg|emoji|refermsg|appattach)\b/i.test(trimmed) ||
    (/<type>[\s\S]*?<\/type>/i.test(trimmed) && /<(title|des|desc|content|url|refermsg)>/i.test(trimmed));
}

function summarizeStructuredMessage(text, type) {
  const decoded = decodeHtmlEntities(text);
  if (/^<voip/i.test(decoded) || /<voip/i.test(decoded)) return "通话记录";
  if (/<emoji\b/i.test(decoded)) return "表情";

  const appType = extractXmlTag(decoded, "type");
  const label = APP_MESSAGE_LABELS[appType] || TYPE_LABELS[type] || "微信消息";
  const title = firstNonEmpty([
    extractXmlTag(decoded, "title"),
    extractXmlTag(decoded, "content"),
    extractXmlTag(decoded, "des"),
    extractXmlTag(decoded, "desc"),
    extractXmlTag(decoded, "displayname"),
  ].map(cleanStructuredValue));

  if (/^<a\b/i.test(decoded)) return cleanStructuredValue(decoded) || "链接";
  if (!title) return label;
  return label === "文本" || label === "微信消息" ? title : `${label}：${title}`;
}

function extractXmlTag(text, tagName) {
  const pattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = String(text || "").match(pattern);
  return match ? match[1] : "";
}

function cleanStructuredValue(value) {
  return tidyPlainText(decodeHtmlEntities(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " "));
}

function firstNonEmpty(values) {
  return values.find((value) => value && value.trim()) || "";
}

function tidyPlainText(value) {
  const text = String(value || "")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return looksUnreadableText(text) ? "" : text;
}

function looksUnreadableText(text) {
  if (!text) return false;
  if (/[\uFFFD]/.test(text)) return true;
  const controls = countMatches(text, /[\x00-\x08\x0B\x0C\x0E-\x1F]/g);
  return text.length > 12 && controls / text.length > 0.08;
}

function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDay(date) {
  return date ? dayFormatter.format(date) : "未知";
}

function formatTime(date) {
  return date ? timeFormatter.format(date) : "--:--";
}

function formatDateTime(date) {
  return `${formatDay(date)} ${formatTime(date)}`;
}

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatMatchRate(matched, total) {
  if (!total) return "0%";
  if (matched === total) return "100%";
  return `${((matched / total) * 100).toFixed(1)}%`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function nextFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}
