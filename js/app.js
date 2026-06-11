// ===== 登录页背景模糊 =====
function initLoginBg(photoSrc) {
  const loginScreen = document.getElementById('login-screen');
  if (!loginScreen) return;
  loginScreen.style.backgroundImage = `url(${photoSrc})`;
  loginScreen.style.backgroundSize = 'cover';
  loginScreen.style.backgroundPosition = 'center';
}

// ===== 全局状态 =====
let config = null;
let messages = [];
let photos = [];
let timeline = [];
let currentPage = 'home';
let gitHubToken = null;

// ===== 工具函数 =====
function $(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff === 2) return '前天';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (y === now.getFullYear()) return `${m}月${day}日`;
  return `${y}年${m}月${day}日`;
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}年${m}月${day}日`;
}

function formatTime(isoStr) {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function daysBetween(d1, d2) {
  return Math.floor((new Date(d2) - new Date(d1)) / 86400000);
}

// ===== 数据加载 =====
async function loadJSON(path) {
  const resp = await fetch(path);
  if (!resp.ok) throw new Error(`无法加载 ${path}: ${resp.status}`);
  return resp.json();
}

async function loadAllData() {
  try {
    [config, messages, photos, timeline] = await Promise.all([
      loadJSON('data/config.json'),
      loadJSON('data/messages.json'),
      loadJSON('data/photos.json'),
      loadJSON('data/timeline.json')
    ]);
  } catch (e) {
    console.error('数据加载失败:', e);
  }
}

// ===== 花瓣动画 =====
function createPetals() {
  const container = $('petals');
  const emojis = ['🌸', '💮', '🌷', '✿', '🩷'];
  setInterval(() => {
    if (container.children.length > 15) return;
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.style.left = Math.random() * 100 + '%';
    petal.style.animationDuration = (8 + Math.random() * 10) + 's';
    petal.style.animationDelay = Math.random() * 2 + 's';
    petal.style.width = (8 + Math.random() * 10) + 'px';
    petal.style.height = petal.style.width;
    container.appendChild(petal);
    petal.addEventListener('animationend', () => petal.remove());
  }, 2000);
}

// ===== 登录 =====
async function setupLogin() {
  const savedToken = localStorage.getItem('love_journal_token');
  const savedHash = localStorage.getItem('love_journal_pwd');

  if (savedHash && savedToken !== null) {
    // 尝试验证 token 是否仍然有效
    $('login-screen').classList.add('hidden');
    gitHubToken = savedToken;
    await showApp();
    return;
  }

  if (savedHash) {
    // 有密码哈希但没有 token，直接显示登录
    $('login-btn').addEventListener('click', () => doLogin());
    $('login-pwd').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });
    return;
  }

  // 首次使用：任何密码都可以（设为初始密码）
  $('login-btn').addEventListener('click', () => firstTimeLogin());
  $('login-pwd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') firstTimeLogin();
  });
  $('login-hint').textContent = '首次访问？输入你想设的密码即可';
}

async function firstTimeLogin() {
  const pwd = $('login-pwd').value.trim();
  if (!pwd) return shake($('login-card'));
  const hash = await sha256(pwd);
  localStorage.setItem('love_journal_pwd', hash);
  $('login-screen').classList.add('hidden');
  $('login-hint').textContent = '这是我们两个人的小世界';
  await showApp();
}

async function doLogin() {
  const pwd = $('login-pwd').value.trim();
  if (!pwd) return;
  const hash = await sha256(pwd);
  const savedHash = localStorage.getItem('love_journal_pwd');
  if (hash !== savedHash) {
    shake($('login-card'));
    $('login-pwd').value = '';
    return;
  }
  $('login-screen').classList.add('hidden');
  await showApp();
}

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => el.style.animation = '', 400);
}

// 添加 shake 动画
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-8px); }
    40% { transform: translateX(8px); }
    60% { transform: translateX(-6px); }
    80% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

// ===== 主应用 =====
async function showApp() {
  await loadAllData();
  $('app').classList.remove('hidden');
  createPetals();

  // 配置名
  if (config) {
    $('home-couple-name').textContent = config.coupleName;
    $('home-since').textContent = `从 ${formatDateFull(config.startDate)} 开始`;
    document.title = config.coupleName + ' 的故事';
  }

  // 首页数据
  renderHome();
  setInterval(renderHome, 60000); // 每分钟刷新天数

  // 默认页
  switchPage('home');

  // 事件绑定
  $('logout-btn').addEventListener('click', logout);
  setupChat();
}

function logout() {
  localStorage.removeItem('love_journal_pwd');
  localStorage.removeItem('love_journal_token');
  location.reload();
}

// ===== 页面切换 =====
function switchPage(name) {
  currentPage = name;
  ['home', 'chat', 'photos', 'timeline'].forEach(p => {
    const page = $('page-' + p);
    if (page) page.classList.toggle('hidden', p !== name);
  });
  // 导航激活
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === name);
  });
  // 按需渲染
  if (name === 'chat') renderChat();
  if (name === 'photos') renderPhotos();
  if (name === 'timeline') renderTimeline();
}

// ===== 首页渲染 =====
function renderHome() {
  if (!config) return;
  const days = daysBetween(config.startDate, new Date());
  $('days-count').textContent = days;

  // 下一个纪念日
  const start = new Date(config.startDate);
  const today = new Date();
  const thisYear = today.getFullYear();
  const anniThisYear = new Date(thisYear, start.getMonth(), start.getDate());
  const anniNextYear = new Date(thisYear + 1, start.getMonth(), start.getDate());
  const nextAnni = anniThisYear > today ? anniThisYear : anniNextYear;
  const daysLeft = daysBetween(today, nextAnni);
  $('next-anniversary').textContent =
    `${formatDateFull(nextAnni.toISOString())}（还有 ${daysLeft} 天）`;
}

// ===== 聊天渲染 =====
function renderChat() {
  if (!messages.length) {
    $('chat-messages').innerHTML = '<div class="chat-loading">还没有悄悄话，去 GitHub 上写第一条吧</div>';
    return;
  }
  let html = '';
  let lastDate = '';

  messages.forEach(msg => {
    const msgDate = msg.time.split('T')[0];
    if (msgDate !== lastDate) {
      html += `<div class="chat-date-divider"><span>${formatDate(msgDate)}</span></div>`;
      lastDate = msgDate;
    }
    const isMine = msg.author === 'him';
    const cls = isMine ? 'mine' : 'hers';
    const avatarText = isMine ? (config?.boyName?.[0] || '他') : (config?.girlName?.[0] || '她');
    let bubbleContent = msg.text.replace(/\n/g, '<br>');
    if (msg.image) {
      bubbleContent = `<img src="${msg.image}" alt="图片" loading="lazy">${bubbleContent}`;
    }

    html += `
      <div class="chat-msg ${cls}">
        <div class="chat-avatar">${avatarText}</div>
        <div class="chat-bubble">
          ${bubbleContent}
          <span class="chat-time">${formatTime(msg.time)}</span>
        </div>
      </div>`;
  });

  $('chat-messages').innerHTML = html;
  $('chat-messages').scrollTop = $('chat-messages').scrollHeight;
}

function setupChat() {
  const input = $('chat-input');
  const sendBtn = $('chat-send');
  const tip = $('chat-tip');

  input.addEventListener('input', () => {
    sendBtn.disabled = !input.value.trim();
    // 自动增高
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  sendBtn.addEventListener('click', () => sendMessage());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // 检查 token
  gitHubToken = localStorage.getItem('love_journal_token');
  if (gitHubToken) {
    tip.innerHTML = '已连接 GitHub，可以直接发送消息 ✨';
    tip.style.color = '#5a85a8';
  }
}

async function sendMessage() {
  const input = $('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (!gitHubToken) {
    // 无 token 模式：复制 JSON 提示
    const newMsg = {
      id: 'msg_' + Date.now(),
      author: 'him',
      text: text,
      time: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(newMsg, null, 2);
    $('chat-tip').innerHTML = `
      ⚠️ 未配置 GitHub Token，请将以下内容手动添加到 <code>data/messages.json</code> 数组末尾：<br>
      <textarea readonly style="width:100%;height:60px;margin-top:6px;font-size:12px;border-radius:8px;border:1px solid #f0d0d8;padding:6px;background:#fef5f7;">${jsonStr}</textarea>
    `;
    input.value = '';
    return;
  }

  // 有 token：通过 GitHub API 追加
  try {
    $('chat-send').disabled = true;
    $('chat-send').textContent = '...';

    const newMsg = {
      id: 'msg_' + Date.now(),
      author: 'him',
      text: text,
      time: new Date().toISOString()
    };

    await appendToGitHub('data/messages.json', newMsg, '💬 新消息');
    messages.push(newMsg);
    renderChat();
    input.value = '';
    input.style.height = 'auto';
    $('chat-tip').textContent = '发送成功 ✨';
  } catch (e) {
    console.error('发送失败详情:', e);
    if (e.message === 'Failed to fetch') {
      $('chat-tip').innerHTML = '无法连接 GitHub API，可能需要 VPN/代理。';
    } else {
      $('chat-tip').textContent = '发送失败: ' + e.message;
    }
  } finally {
    $('chat-send').disabled = false;
    $('chat-send').textContent = '发送';
  }
}

// ===== GitHub API（优先走本地 /proxy，不可用时直连）=====
async function githubRequest(url, options = {}) {
  try {
    const resp = await fetch('/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || null
      })
    });
    if (resp.ok || resp.status >= 400) return resp;
  } catch (e) {
    console.log('代理不可用，直连 GitHub API');
  }
  // 回退：直连 GitHub API
  const fetchOpts = { method: options.method || 'GET', headers: options.headers || {} };
  if (options.body) fetchOpts.body = options.body;
  return fetch(url, fetchOpts);
}

async function uploadFileToGitHub(path, base64Content, commitMsg) {
  const repo = config.repoName;
  const branch = config.repoBranch || 'main';
  const url = `https://api.github.com/repos/${repo}/contents/${path}`;
  const resp = await githubRequest(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + gitHubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: commitMsg,
      content: base64Content,
      branch: branch
    })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.message || '上传失败');
  }
  return resp.json();
}

async function appendToGitHub(path, newItem, commitMsg) {
  const repo = config.repoName;
  const branch = config.repoBranch || 'main';

  // 读取当前文件
  const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&_=${Date.now()}`;
  const getResp = await githubRequest(getUrl, {
    headers: {
      'Authorization': 'token ' + gitHubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache'
    }
  });
  if (!getResp.ok) throw new Error('读取文件失败: ' + getResp.status);
  const fileData = await getResp.json();
  const content = JSON.parse(atob(fileData.content));
  content.push(newItem);

  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify(content, null, 2));
  const newContent = btoa(String.fromCharCode(...bytes));

  // 更新文件
  const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const putResp = await githubRequest(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + gitHubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: commitMsg,
      content: newContent,
      sha: fileData.sha,
      branch: branch
    })
  });
  if (!putResp.ok) {
    const err = await putResp.json();
    throw new Error(err.message || '更新失败');
  }
}

async function removeFromGitHub(path, matchFn, commitMsg) {
  const repo = config.repoName;
  const branch = config.repoBranch || 'main';

  const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}&_=${Date.now()}`;
  const getResp = await githubRequest(getUrl, {
    headers: {
      'Authorization': 'token ' + gitHubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Cache-Control': 'no-cache'
    }
  });
  if (!getResp.ok) throw new Error('读取文件失败: ' + getResp.status);
  const fileData = await getResp.json();
  const content = JSON.parse(atob(fileData.content));
  const filtered = content.filter(item => !matchFn(item));

  const encoder = new TextEncoder();
  const bytes = encoder.encode(JSON.stringify(filtered, null, 2));
  const newContent = btoa(String.fromCharCode(...bytes));

  const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const putResp = await githubRequest(putUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + gitHubToken,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: commitMsg,
      content: newContent,
      sha: fileData.sha,
      branch: branch
    })
  });
  if (!putResp.ok) {
    const err = await putResp.json();
    throw new Error(err.message || '删除失败');
  }
}

// ===== 照片渲染 =====
let photosExpanded = false;
let currentAlbum = '';

function renderAlbumChips() {
  const albums = getAlbums();
  let html = `<button class="album-chip${currentAlbum === '' ? ' active' : ''}" onclick="filterAlbum('')">全部</button>`;
  albums.forEach(a => {
    html += `<button class="album-chip${currentAlbum === a ? ' active' : ''}" onclick="filterAlbum('${a.replace(/'/g, "\\'")}')">${a}</button>`;
  });
  html += `<button class="album-chip album-chip-add" onclick="promptNewAlbum()" title="新建相册">+</button>`;
  $('album-bar').innerHTML = html;
}

function filterAlbum(name) {
  currentAlbum = name;
  $('photos-grid').classList.remove('expanded');
  $('photo-expand-btn').textContent = '展开';
  renderPhotos();
  renderAlbumChips();
}

function renderPhotos() {
  const filtered = currentAlbum
    ? photos.filter(p => p.album === currentAlbum)
    : photos;

  renderAlbumChips();

  if (!filtered.length) {
    $('photos-grid').innerHTML = `<div class="chat-loading">${currentAlbum ? '这个相册还是空的' : '还没有照片，去上传吧'}</div>`;
    $('photo-expand-btn').classList.add('hidden');
    return;
  }
  $('photo-expand-btn').classList.remove('hidden');

  const isExpanded = $('photos-grid').classList.contains('expanded');
  let html = '';
  filtered.forEach((p, i) => {
    const rotation = (i % 5 - 2) * 3;
    const offsetX = (i % 3 - 1) * 6;
    const offsetY = Math.floor(i / 3) * 3;
    const escapedCaption = p.caption.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedSrc = p.src.replace(/'/g, "\\'");
    const origIndex = photos.indexOf(p);

    html += `
      <div class="photo-card ${isExpanded ? 'fanned' : 'stacked'}"
           style="--r:${rotation}deg;--x:${offsetX}px;--y:${offsetY}px;--i:${i};"
           data-index="${origIndex}">
        <button class="photo-delete-btn" onclick="deletePhoto(event, ${origIndex})" title="删除" aria-label="删除照片">×</button>
        <div class="photo-card-inner" onclick="handlePhotoClick(event, ${origIndex}, '${escapedSrc}', '${escapedCaption}', '${formatDateFull(p.date)}')">
          <img src="${p.thumb || p.src}" alt="${p.caption}" loading="lazy">
          <div class="photo-info">
            <p class="photo-caption">${p.caption}</p>
            <p class="photo-date">${formatDateFull(p.date)}</p>
            ${p.album ? `<p class="photo-album-tag">${p.album}</p>` : ''}
          </div>
        </div>
      </div>`;
  });
  $('photos-grid').innerHTML = html;
}

function handlePhotoClick(e, index, src, caption, date) {
  const grid = $('photos-grid');
  if (!grid.classList.contains('expanded')) {
    togglePhotosExpand();
  } else {
    openLightbox(src, caption, date);
  }
}

function togglePhotosExpand() {
  const grid = $('photos-grid');
  const btn = $('photo-expand-btn');
  const willExpand = !grid.classList.contains('expanded');
  grid.classList.toggle('expanded');
  btn.textContent = willExpand ? '收起' : '展开';
  renderPhotos();
}

async function deletePhoto(e, index) {
  e.stopPropagation();
  if (!confirm('确定删除这张照片吗？')) return;
  const photo = photos[index];
  try {
    await removeFromGitHub('data/photos.json',
      item => item.src === photo.src && item.date === photo.date,
      '🗑 删除照片'
    );
    photos.splice(index, 1);
    renderPhotos();
  } catch (err) {
    alert('删除失败: ' + err.message);
    console.error(err);
  }
}

function openLightbox(src, caption, date) {
  $('lightbox-img').src = src;
  $('lightbox-caption').textContent = caption;
  $('lightbox-date').textContent = date;
  $('photo-lightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  $('photo-lightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

// ===== 照片上传弹窗 =====
let pendingPhotoFile = null;
let pendingPhotoBase64 = null;

function openPhotoModal() {
  if (!gitHubToken) {
    alert('请先在悄悄话页面配置 GitHub Token');
    promptToken();
    return;
  }
  $('photo-modal').classList.remove('hidden');
  resetPhotoForm();
  populateAlbumSelect();
  $('photo-date-input').value = new Date().toISOString().split('T')[0];
}

function closePhotoModal() {
  $('photo-modal').classList.add('hidden');
  resetPhotoForm();
}

function populateAlbumSelect() {
  const sel = $('photo-album-select');
  const albums = getAlbums();
  sel.innerHTML = '<option value="">无分类</option>' +
    albums.map(a => `<option value="${a}">${a}</option>`).join('');
}

function promptNewAlbum() {
  const name = prompt('输入新相册名称：');
  if (name && name.trim()) {
    // 创建相册（下次渲染时会出现在芯片中，即使还没有照片）
    if (!getAlbums().includes(name.trim())) {
      // 用一个临时占位让芯片出现：推一个无 src 的伪条目到本地
      // 改用 customAlbums 记录
      let custom = JSON.parse(localStorage.getItem('love_journal_albums') || '[]');
      if (!custom.includes(name.trim())) {
        custom.push(name.trim());
        localStorage.setItem('love_journal_albums', JSON.stringify(custom));
      }
    }
    $('photo-album-select').value = name.trim();
    renderAlbumChips();
  }
}

function getAlbums() {
  const set = new Set();
  photos.forEach(p => { if (p.album) set.add(p.album); });
  // 合并 localStorage 中的自定义相册
  try {
    const custom = JSON.parse(localStorage.getItem('love_journal_albums') || '[]');
    custom.forEach(a => set.add(a));
  } catch (e) {}
  return Array.from(set).sort();
}

function resetPhotoForm() {
  pendingPhotoFile = null;
  pendingPhotoBase64 = null;
  $('photo-file-input').value = '';
  $('photo-caption-input').value = '';
  $('photo-album-select').value = '';
  $('photo-upload-preview').style.display = 'none';
  $('photo-upload-preview').src = '';
  $('photo-upload-placeholder').style.display = '';
  $('photo-upload-btn').disabled = true;
  $('photo-upload-tip').textContent = '';
  $('photo-upload-tip').className = 'modal-tip';
}

function setupPhotoUpload() {
  // 点击遮罩关闭
  $('photo-modal').addEventListener('click', function(e) {
    if (e.target === this) closePhotoModal();
  });

  const dropArea = $('photo-drop-area');
  const fileInput = $('photo-file-input');

  dropArea.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handlePhotoFile(fileInput.files[0]);
    }
  });

  // 拖拽支持（桌面端）
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('dragover');
  });
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('dragover');
  });
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handlePhotoFile(e.dataTransfer.files[0]);
    }
  });

  $('photo-upload-btn').addEventListener('click', () => uploadPhoto());
}

async function handlePhotoFile(file) {
  if (!file.type.startsWith('image/')) {
    $('photo-upload-tip').textContent = '请选择图片文件';
    $('photo-upload-tip').className = 'modal-tip error';
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    $('photo-upload-tip').textContent = '图片不能超过 10MB';
    $('photo-upload-tip').className = 'modal-tip error';
    return;
  }

  pendingPhotoFile = file;
  $('photo-upload-tip').textContent = '';
  $('photo-upload-tip').className = 'modal-tip';

  // 预览
  const reader = new FileReader();
  reader.onload = function(e) {
    $('photo-upload-preview').src = e.target.result;
    $('photo-upload-preview').style.display = 'block';
    $('photo-upload-placeholder').style.display = 'none';
    $('photo-upload-btn').disabled = false;
  };
  reader.readAsDataURL(file);

  // 读取 base64（不含 data URI 前缀）备用
  const bufReader = new FileReader();
  bufReader.onload = function(e) {
    const base64 = e.target.result.split(',')[1];
    pendingPhotoBase64 = base64;
  };
  bufReader.readAsDataURL(file);
}

async function uploadPhoto() {
  if (!pendingPhotoFile || !pendingPhotoBase64) return;

  const caption = $('photo-caption-input').value.trim() || '照片';
  const date = $('photo-date-input').value || new Date().toISOString().split('T')[0];
  const ext = pendingPhotoFile.name.split('.').pop() || 'jpg';
  const filename = 'photo_' + Date.now() + '.' + ext;
  const photoPath = 'photos/' + filename;

  $('photo-upload-btn').disabled = true;
  $('photo-upload-btn').textContent = '上传中...';
  $('photo-upload-tip').textContent = '正在上传...';
  $('photo-upload-tip').className = 'modal-tip';

  try {
    // 1. 上传图片文件到 GitHub
    await uploadFileToGitHub(photoPath, pendingPhotoBase64, '📷 添加照片: ' + caption);

    // 2. 追加照片元数据
    const album = $('photo-album-select').value.trim();
    const newPhoto = {
      src: photoPath,
      thumb: photoPath,
      caption: caption,
      date: date,
      album: album || ''
    };
    await appendToGitHub('data/photos.json', newPhoto, '📷 添加照片元数据');
    photos.push(newPhoto);
    currentAlbum = album || currentAlbum;
    renderPhotos();

    $('photo-upload-tip').textContent = '上传成功！';
    $('photo-upload-tip').className = 'modal-tip';
    setTimeout(() => closePhotoModal(), 1000);
  } catch (e) {
    console.error('上传失败详情:', e);
    if (e.message === 'Failed to fetch') {
      $('photo-upload-tip').innerHTML = '无法连接 GitHub API（api.github.com），可能需要 VPN/代理。<br>或检查 Token 是否配置：<a href="#" onclick="promptToken();return false;" style="color:#d48297;">重新配置</a>';
    } else {
      $('photo-upload-tip').textContent = '上传失败: ' + e.message;
    }
    $('photo-upload-tip').className = 'modal-tip error';
  } finally {
    $('photo-upload-btn').disabled = false;
    $('photo-upload-btn').textContent = '上传';
  }
}

// ===== 时间线渲染 =====
function renderTimeline() {
  if (!timeline.length) {
    $('timeline-list').innerHTML = '<div class="chat-loading">还没有记录</div>';
    return;
  }
  let html = '';
  timeline.forEach((item, i) => {
    html += `
      <div class="timeline-item">
        <div class="timeline-dot">${item.emoji || '💖'}</div>
        <div class="timeline-card">
          <button class="timeline-delete-btn" onclick="deleteTimelineEntry(event, ${i})" title="删除" aria-label="删除事件">×</button>
          <p class="timeline-date">${formatDateFull(item.date)}</p>
          <p class="timeline-title">${item.title}</p>
          <p class="timeline-desc">${item.desc}</p>
        </div>
      </div>`;
  });
  $('timeline-list').innerHTML = html;
}

async function deleteTimelineEntry(e, index) {
  e.stopPropagation();
  if (!confirm('确定删除这个事件吗？')) return;
  const entry = timeline[index];
  try {
    await removeFromGitHub('data/timeline.json',
      item => item.date === entry.date && item.title === entry.title,
      '🗑 删除时间线事件'
    );
    timeline.splice(index, 1);
    renderTimeline();
  } catch (err) {
    alert('删除失败: ' + err.message);
    console.error(err);
  }
}

// ===== 时间线添加弹窗 =====
function openTimelineModal() {
  if (!gitHubToken) {
    alert('请先在悄悄话页面配置 GitHub Token');
    promptToken();
    return;
  }
  $('timeline-modal').classList.remove('hidden');
  resetTimelineForm();
  $('timeline-date-input').value = new Date().toISOString().split('T')[0];
}

function closeTimelineModal() {
  $('timeline-modal').classList.add('hidden');
  resetTimelineForm();
}

function resetTimelineForm() {
  $('timeline-date-input').value = '';
  $('timeline-emoji-input').value = '';
  $('timeline-title-input').value = '';
  $('timeline-desc-input').value = '';
  $('timeline-save-btn').disabled = true;
  $('timeline-save-tip').textContent = '';
  $('timeline-save-tip').className = 'modal-tip';
}

function setupTimelineForm() {
  // 点击遮罩关闭
  $('timeline-modal').addEventListener('click', function(e) {
    if (e.target === this) closeTimelineModal();
  });

  const titleInput = $('timeline-title-input');
  const saveBtn = $('timeline-save-btn');

  function validate() {
    saveBtn.disabled = !titleInput.value.trim();
  }
  titleInput.addEventListener('input', validate);

  $('timeline-save-btn').addEventListener('click', () => saveTimelineEntry());
}

async function saveTimelineEntry() {
  const date = $('timeline-date-input').value;
  const emoji = $('timeline-emoji-input').value.trim() || '💖';
  const title = $('timeline-title-input').value.trim();
  const desc = $('timeline-desc-input').value.trim();

  if (!date || !title) return;

  $('timeline-save-btn').disabled = true;
  $('timeline-save-btn').textContent = '保存中...';
  $('timeline-save-tip').textContent = '正在保存...';
  $('timeline-save-tip').className = 'modal-tip';

  try {
    const newEntry = { date, emoji, title, desc };
    await appendToGitHub('data/timeline.json', newEntry, '📍 添加时间线事件: ' + title);
    timeline.push(newEntry);
    // 按日期排序
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderTimeline();

    $('timeline-save-tip').textContent = '保存成功！';
    $('timeline-save-tip').className = 'modal-tip';
    setTimeout(() => closeTimelineModal(), 1000);
  } catch (e) {
    console.error('保存失败详情:', e);
    if (e.message === 'Failed to fetch') {
      $('timeline-save-tip').innerHTML = '无法连接 GitHub API（api.github.com），可能需要 VPN/代理。<br>或检查 Token 是否配置：<a href="#" onclick="promptToken();return false;" style="color:#d48297;">重新配置</a>';
    } else {
      $('timeline-save-tip').textContent = '保存失败: ' + e.message;
    }
    $('timeline-save-tip').className = 'modal-tip error';
  } finally {
    $('timeline-save-btn').disabled = false;
    $('timeline-save-btn').textContent = '保存';
  }
}

// ===== Token 设置（页面加载时检测） =====
function setupTokenUI() {
  // 在聊天页添加一个小的 token 设置入口
  const tip = $('chat-tip');
  if (!localStorage.getItem('love_journal_token')) {
    tip.innerHTML = `
      发送消息需要 <a href="#" onclick="promptToken();return false;" style="color:#d48297;">配置 GitHub Token</a>
      （仅需设置一次）
    `;
  }

  // 设置 FAB 按钮
  const photoFab = $('photo-add-btn');
  const timelineFab = $('timeline-add-btn');
  if (photoFab) photoFab.addEventListener('click', openPhotoModal);
  if (timelineFab) timelineFab.addEventListener('click', openTimelineModal);

  // 设置上传弹窗
  setupPhotoUpload();
  setupTimelineForm();
}

function promptToken() {
  const token = prompt(
    '请输入 GitHub Personal Access Token\n\n' +
    '获取方式：\n' +
    '1. 打开 https://github.com/settings/tokens\n' +
    '2. 点击 Generate new token (classic)\n' +
    '3. 勾选 repo 权限\n' +
    '4. 生成后粘贴到这里\n\n' +
    'Token 只保存在你的浏览器中，不会上传到任何地方'
  );
  if (token && token.trim()) {
    gitHubToken = token.trim();
    localStorage.setItem('love_journal_token', gitHubToken);
    $('chat-tip').innerHTML = '已连接 GitHub，可以直接发送消息 ✨';
    $('chat-tip').style.color = '#c07084';
  }
}

// 暴露到全局
window.promptToken = promptToken;

// ===== 启动 =====
async function init() {
  // 预加载配置，让登录页显示照片和模糊背景
  try {
    const cfg = await loadJSON('data/config.json');
    if (cfg.loginPhoto) {
      $('login-photo').src = cfg.loginPhoto;
    }
    if (cfg.bgPhoto) {
      const img = new Image();
      img.onload = function() { initLoginBg(cfg.bgPhoto); };
      img.src = cfg.bgPhoto;
    }
  } catch (e) { /* 忽略 */ }
  await setupLogin();
  setupTokenUI();
}

init();

// 暴露到全局（HTML onclick 需要）
window.switchPage = switchPage;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.openPhotoModal = openPhotoModal;
window.closePhotoModal = closePhotoModal;
window.openTimelineModal = openTimelineModal;
window.closeTimelineModal = closeTimelineModal;
window.deletePhoto = deletePhoto;
window.deleteTimelineEntry = deleteTimelineEntry;
window.handlePhotoClick = handlePhotoClick;
window.togglePhotosExpand = togglePhotosExpand;
window.filterAlbum = filterAlbum;
window.promptNewAlbum = promptNewAlbum;
