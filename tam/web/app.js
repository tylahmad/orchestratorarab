const $ = s => document.querySelector(s);
const DEMO = location.protocol === 'file:' || new URLSearchParams(location.search).has('demo');
let accounts = [], stats = {total:0, by_status:{}}, sel = new Set(), filter = '', loginId = null, readonly = false;
let kick = {enabled:false, hours:24, watched:0, due_now:0, next_at:null};

/* ---------- Demo data ---------- */
const MOCK = {
  tasks: [
    {id: 12, kind: 'send', title: '群发 128 个目标', status: 'running', status_cn: '运行中',
     total: 128, ok_count: 74, fail_count: 3, skip_count: 0, done_count: 77, percent: 60.2,
     created_at: Date.now() / 1000 - 600, live: true, params: {html: true, concurrency: 2}},
    {id: 11, kind: 'collect_speakers', title: '采集最近 7 天发言人·2 个群',
     status: 'done', status_cn: '已完成', total: 2, ok_count: 2, fail_count: 0, skip_count: 0,
     done_count: 2, percent: 100, created_at: Date.now() / 1000 - 5400, live: false, params: {days: 7}},
    {id: 10, kind: 'send', title: '群发 40 个目标', status: 'stopped', status_cn: '已停止',
     total: 40, ok_count: 18, fail_count: 2, skip_count: 20, done_count: 40, percent: 100,
     created_at: Date.now() / 1000 - 86400, live: false, params: {}}],
  targets: [
    {id: 1, seq: 0, target: '@alice', account_id: 2, status: 'ok', status_cn: '成功', detail: '账号#2 已发送 message_id=8812'},
    {id: 2, seq: 1, target: '@bob', account_id: 3, status: 'fail', status_cn: '失败', detail: 'FloodWaitError: A wait of 300 seconds is required'},
    {id: 3, seq: 2, target: '778812345', account_id: 2, status: 'pending', status_cn: '待处理', detail: ''}],
  chats: [
    {id: -1001, title: 'Crypto Talk 中文群', username: 'cryptotalkcn', peer: '@cryptotalkcn',
     members: 12840, is_group: true, is_channel: false, megagroup: true, broadcast: false,
     unread: 12, last_msg_at: Date.now() / 1000 - 900},
    {id: -1002, title: 'Web3 Builders', username: null, peer: '-1002',
     members: 862, is_group: true, is_channel: false, megagroup: true, broadcast: false,
     unread: 0, last_msg_at: Date.now() / 1000 - 26000},
    {id: -1003, title: 'NFT 二级市场交流', username: 'nftsecond', peer: '@nftsecond',
     members: 3410, is_group: true, is_channel: false, megagroup: true, broadcast: false,
     unread: 3, last_msg_at: Date.now() / 1000 - 4 * 86400},
    {id: -1004, title: '老群（已冷）', username: null, peer: '-1004',
     members: 220, is_group: true, is_channel: false, megagroup: false, broadcast: false,
     unread: 0, last_msg_at: Date.now() / 1000 - 40 * 86400}],
  leadSources: [
    {source: 'Crypto Talk 中文群', item_count: 316, with_username: 251, last_seen: Date.now() / 1000 - 3600},
    {source: 'Web3 Builders', item_count: 88, with_username: 62, last_seen: Date.now() / 1000 - 90000}],
  leads: [
    {user_id: 60123, username: 'alice_w3', name: 'Alice', source: 'Crypto Talk 中文群', msg_count: 12, last_msg_at: Date.now() / 1000 - 4000, tags: ['高活跃']},
    {user_id: 60124, username: null, name: 'Bob', source: 'Crypto Talk 中文群', msg_count: 3, last_msg_at: Date.now() / 1000 - 40000, tags: []},
    {user_id: 60125, username: 'carol', name: 'Carol', source: 'Web3 Builders', msg_count: 7, last_msg_at: Date.now() / 1000 - 100000, tags: []}],

  accounts: [
    {id:1,label:'主号',phone:'+8613800138000',username:'gladys',status:'active',proxy:'socks5://127.0.0.1:1080',code_url:null,tags:['main'],authorized:true,premium:1,auto_kick:1,has_2fa:1,has_twofa_saved:true,twofa:'Demo2fa!',login_at:Math.floor(Date.now()/1000)-72000,adopted_at:Math.floor(Date.now()/1000)-72000},
    {id:2,label:'US-A',phone:'+10000000000',username:'coldstart_a',status:'active',proxy:'socks5://us1:1080',code_url:'https://example.invalid/code/account-a/GetHTML',tags:['batch1','us'],authorized:true,auto_kick:1,has_2fa:1,has_twofa_saved:false,login_at:Math.floor(Date.now()/1000)-90000,last_kick_at:null},
    {id:3,label:'US-B',phone:'+10000000001',username:null,status:'new',proxy:'socks5://us2:1080',code_url:'https://example.invalid/code/account-b/GetHTML',tags:['batch1','us'],authorized:false,has_2fa:0},
    {id:4,label:'US-C',phone:'+10000000002',username:null,status:'unauthorized',proxy:null,code_url:'https://example.invalid/code/account-c/GetHTML',tags:['batch1'],authorized:false,has_2fa:null},
    {id:5,label:'tdata-01',phone:'+447700900123',username:'desk_one',status:'restricted',proxy:'socks5://uk1:1080',code_url:null,tags:['tdata'],authorized:true,has_2fa:1,has_twofa_saved:true,twofa:'uk-pass'},
    {id:6,label:'tdata-02',phone:'+447700900124',username:null,status:'banned',proxy:'socks5://uk1:1080',code_url:null,tags:['tdata'],authorized:false,has_2fa:0}
  ],
  stats: {total:6, by_status:{active:2, new:1, unauthorized:1, restricted:1, banned:1}},
  autokick: {enabled:true, hours:24, watched:2, due_now:1, scan_interval_s:600,
            retry_after_s:3600, retry_after_text:'1 小时', retry_source:'env', retry_min_s:10,
             server_now: Math.floor(Date.now()/1000), max_overdue_s: 0,
             next_at: Math.floor(Date.now()/1000) + 5400},
  logs: [
    {id:42,account_id:2,action:'auto_login',ok:1,detail:'user_id=708812345',created_at:1753432740},
    {id:41,account_id:2,action:'fetch_code',ok:1,detail:'code_len=5',created_at:1753432712},
    {id:40,account_id:5,action:'health_check',ok:1,detail:'restricted: spam block until 2026-07-28',created_at:1753431980},
    {id:39,account_id:6,action:'health_check',ok:0,detail:'UserDeactivatedBanError',created_at:1753431975},
    {id:38,account_id:3,action:'import_accounts',ok:1,detail:'added=3 updated=0',created_at:1753431020}
  ]
};

/* ---------- Infrastructure ---------- */
const tokenKey = 'tam_token';
$('#token').value = localStorage.getItem(tokenKey) || '';
async function applyToken() {
  const v = $('#token').value.trim();
  $('#token').value = v;
  localStorage.setItem(tokenKey, v);
  $('#mode').textContent = 'Connecting… (جارٍ الاتصال…)'; $('#mode').className = 'pill off';
  await probeMode();
  if ($('#mode').className.indexOf('off') < 0) { toast('Token accepted; connected (تم قبول الرمز؛ تم الاتصال)', 'ok'); await refresh(); }
  else toast('Invalid token or service is not running (الرمز غير صالح أو الخدمة غير مشغلة)', 'err');
}
$('#token').addEventListener('change', applyToken);
$('#token').addEventListener('keydown', e => { if (e.key === 'Enter') applyToken(); });

function toast(msg, kind='') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
let busy = 0;
function progress(on) {
  busy = Math.max(0, busy + (on ? 1 : -1));
  $('#prog').style.width = busy ? '70%' : '0';
}
async function api(path, opts = {}) {
  if (DEMO) return demoApi(path, opts);
  progress(true);
  try {
    const res = await fetch(path, {...opts, headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + ($('#token').value || ''),
      ...(opts.headers || {})}});
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw;
      try { const j = JSON.parse(raw); msg = j.detail || j.message || raw; } catch {}
      if (res.status === 401) msg = 'Invalid token (401): check TAM_WEB_TOKEN in .env (الرمز غير صالح (401): تحقق من TAM_WEB_TOKEN في .env)';
      throw new Error(String(msg).slice(0, 400));
    }
    return res.json();
  } finally { progress(false); }
}
async function demoApi(path, opts) {
  await new Promise(r => setTimeout(r, 220));
  if (path.startsWith('/api/stats')) return MOCK.stats;
  if (path.startsWith('/api/accounts?') || path === '/api/accounts') return MOCK.accounts.map(a => {
    const o = Object.assign({}, a); delete o.twofa; return o; // 列表不带明文，与真实 API 一致
  });
  if (/^\/api\/accounts\/\d+\/twofa$/.test(path.split('?')[0]) && (!opts.method || opts.method === 'GET')) {
    const id = +path.split('/')[3];
    const a = MOCK.accounts.find(x => x.id === id) || {};
    return {ok:true, id, has_2fa: a.has_2fa, saved: !!a.has_twofa_saved, twofa: a.twofa || ''};
  }
  if (/^\/api\/accounts\/\d+\/twofa$/.test(path.split('?')[0]) && (opts.method || '').toUpperCase() === 'POST') {
    return {ok:true, saved:true, has_2fa:1};
  }
  if (path.startsWith('/api/logs')) return MOCK.logs;
  if (path.startsWith('/api/tools')) return {readonly:false, dry_run:false, tools:[]};
  if (path === '/api/tasks' || path.startsWith('/api/tasks?')) return MOCK.tasks;
  if (/^\/api\/tasks\/\d+$/.test(path.split('?')[0]))
    return Object.assign({}, MOCK.tasks[0], {targets: MOCK.targets});
  if (path.startsWith('/api/chats')) return {count: MOCK.chats.length, items: MOCK.chats};
  if (path === '/api/leads/sources') return MOCK.leadSources;

  if (path.startsWith('/api/leads/messages')) return {
    messages: [
      {user_id: 60123, username: 'alice_w3', name: 'Alice', source: 'Crypto Talk 中文群',
       text: '有人看过最新的白皮书吗？', date: Math.floor(Date.now()/1000) - 7200, reply_to: null},
      {user_id: 60124, username: null, name: 'Bob', source: 'Crypto Talk 中文群',
       text: '看了，第三节有点意思', date: Math.floor(Date.now()/1000) - 7000, reply_to: null},
      {user_id: 60123, username: 'alice_w3', name: 'Alice', source: 'Crypto Talk 中文群',
       text: '同意，周末整理一版笔记', date: Math.floor(Date.now()/1000) - 6800, reply_to: null}],
    stats: {total: 3, speakers: 2}};
  if (path.startsWith('/api/leads')) return {count: MOCK.leads.length, items: MOCK.leads};
  if (path === '/api/autokick') return MOCK.autokick;
  if (path === '/api/autokick/run') return {enabled:true, hours:24, due:1, retry_after_s:3600, results:[{account_id:2, ok:true, verified:true}]};
  if (path === '/api/autokick/retry') return {ok:true, retry_after_s:600, retry_after_text:'10 分钟', retry_source:'web'};
  return {ok:true, demo:true, path, body: opts.body ? JSON.parse(opts.body) : null};
}
/* ---------- Task Center ---------- */
const TASK_KIND_CN = {send: 'Broadcast Message (رسالة جماعية)', collect_speakers: 'Collect Speakers (جمع المتحدثين)'};
const TASK_TONE = {running: 'ok', pending: '', stopping: 'warn', stopped: 'warn', done: 'ok', failed: 'err'};
let taskTimer = null;

function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function taskCard(t) {
  const pct = Math.max(0, Math.min(100, t.percent || 0));
  const tone = TASK_TONE[t.status] || '';
  const canStop = t.status === 'running' || t.status === 'pending';
  return `<div class="taskrow">
    <div class="taskhead">
      <b>#${t.id} ${esc(t.title)}</b>
      <span class="pill ${tone}">${esc(t.status_cn || t.status)}</span>
      <span class="muted">${esc(TASK_KIND_CN[t.kind] || t.kind)} · ${rel(t.created_at)}</span>
      <span style="flex:1"></span>
      <button class="sm fit" onclick="taskDetail(${t.id})">Details (التفاصيل)</button>
      ${canStop ? `<button class="sm fit warn" onclick="stopTask(${t.id})">stop (إيقاف)</button>`
                : `<button class="sm fit" onclick="delTask(${t.id})">delete (حذف)</button>`}
    </div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="muted small">Progress (التقدم) ${t.done_count || 0}/${t.total || 0} (${pct}%)
      · Succeeded ${t.ok_count || 0} (نجح ${t.ok_count || 0}) · Failed ${t.fail_count || 0} (فشل ${t.fail_count || 0}) · Skipped ${t.skip_count || 0} (تم تخطي ${t.skip_count || 0})</div>
  </div>`;
}

async function loadTasks(manualClick) {
  try {
    const rows = await api('/api/tasks?limit=10');
    const el = $('#taskList');
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<span class="muted">No tasks yet. Collect speakers first, then broadcast to the results. (لا توجد مهام بعد. اجمع المتحدثين أولًا ثم أرسل إلى النتائج.)</span>';
      $('#taskHint').textContent = 'No tasks yet (لا توجد مهام بعد)';
    } else {
      el.innerHTML = rows.map(taskCard).join('');
      const live = rows.filter(t => t.status === 'running' || t.status === 'pending').length;
      $('#taskHint').textContent = live ? `${live} in progress (قيد التنفيذ) · ${rows.length} total (إجمالي ${rows.length})` : `Latest ${rows.length} (أحدث ${rows.length})`;
      clearTimeout(taskTimer);
      if (live) taskTimer = setTimeout(loadTasks, 3000);
    }
    if (manualClick) toast('Task list refreshed (تم تحديث قائمة المهام)', 'ok');
  } catch (e) { if (manualClick) toast('Failed to load task list: ' + e.message + ' (تعذر تحميل قائمة المهام: ' + e.message + ')', 'err'); }
}

async function taskDetail(id) {
  try {
    const t = await api(`/api/tasks/${id}?target_limit=200`);
    const head = `Task #${t.id} (المهمة رقم ${t.id}): ${t.title}\nType (النوع): ${TASK_KIND_CN[t.kind] || t.kind}`
      + `\nStatus (الحالة): ${t.status_cn || t.status}\nProgress: ${t.done_count}/${t.total} (${t.percent}%) (التقدم: ${t.done_count}/${t.total} (${t.percent}%))`
      + `\nSucceeded ${t.ok_count} (نجح ${t.ok_count}) · Failed ${t.fail_count} (فشل ${t.fail_count}) · Skipped ${t.skip_count} (تم تخطي ${t.skip_count})`
      + `\nCreated (أُنشئت في): ${fmt(t.created_at)}`
      + (t.finished_at ? `\nFinished (انتهت في): ${fmt(t.finished_at)}` : '');
    const bad = (t.targets || []).filter(x => x.status === 'fail');
    const lines = (t.targets || []).slice(0, 60).map(x =>
      `${x.status === 'ok' ? '✓' : (x.status === 'fail' ? '✗' : '·')} ${x.target}`
      + `${x.account_id ? '  by account (بواسطة الحساب) #' + x.account_id : ''}  ${x.status_cn}`
      + `${x.detail ? ': ' + x.detail : ''}`);
    const tail = (t.targets || []).length > 60 ? `\n…${t.targets.length} total (إجمالي ${t.targets.length}); showing the first 60 only (عرض أول 60 فقط)` : '';
    const fail = bad.length ? `\n\nFailure categories (تصنيفات أسباب الفشل):\n` + Object.entries(
      bad.reduce((m, x) => { const k = (x.detail || 'Unknown (غير معروف)').split(':')[0]; m[k] = (m[k] || 0) + 1; return m; }, {})
    ).map(([k, v]) => `• ${k}: ${v} items (عناصر ${v})`).join('\n') : '';
    $('#log').textContent = head + fail + '\n\nPer-target details (تفاصيل كل هدف):\n' + lines.join('\n') + tail;
    $('#logRaw').textContent = JSON.stringify(t, null, 2);
    logPinned = true; $('#logPin').style.display = '';
  } catch (e) { toast('Failed to read task: ' + e.message + ' (تعذر قراءة المهمة: ' + e.message + ')', 'err'); }
}

async function stopTask(id) {
  if (!await uiConfirm({title:'Stop Task (إيقاف المهمة)', message:'Stop task #' + id + '? Messages already sent cannot be recalled; remaining targets will be skipped. (إيقاف المهمة رقم ' + id + '؟ لا يمكن التراجع عن الرسائل المرسلة؛ ستُتخطى الأهداف المتبقية.)', danger:true, okText:'Stop (إيقاف)'})) return;
  await guard(() => api(`/api/tasks/${id}/stop`, {method: 'POST'}), 'Stop requested (تم طلب الإيقاف)');
  loadTasks();
}

async function delTask(id) {
  if (!await uiConfirm({title:'Delete Task (حذف المهمة)', message:'Delete task #' + id + ' and its execution records? (حذف المهمة رقم ' + id + ' وسجلات تنفيذها؟)', danger:true, okText:'Delete (حذف)'})) return;
  await guard(() => api(`/api/tasks/${id}`, {method: 'DELETE'}), 'Task deleted (تم حذف المهمة)');
  loadTasks();
}

let chatRows = [];
const chatPicked = new Set();

async function newCollectTask() {
  const sel = $('#cAcc');
  const usable = accounts.filter(a => a.status === 'active' || a.status === 'restricted');
  const pool = usable.length ? usable : accounts;
  sel.innerHTML = pool.map(a =>
    `<option value="${a.id}">${a.label}(${fmtPhone(a.phone) || 'Unknown number (رقم غير معروف)'})</option>`).join('');
  if (!pool.length) { toast('No usable accounts yet; import and log in first (لا توجد حسابات قابلة للاستخدام؛ استورد وسجّل الدخول أولًا)', 'err'); return; }
  chatPicked.clear();
  openModal('mChats');
  loadChats();
}

async function loadChats(force) {
  const el = $('#chatList');
  el.innerHTML = '<span class="muted">Loading groups… large lists may take a few seconds (جارٍ تحميل المجموعات… قد تستغرق القوائم الكبيرة بضع ثوانٍ)</span>';
  try {
    const aid = $('#cAcc').value;
    const kind = $('#cKind').value;
    const res = await api(`/api/chats?account_id=${aid}&kind=${kind}&limit=200`);
    chatRows = res.items || [];
    if (force) toast(`Loaded ${chatRows.length} sessions (تم تحميل ${chatRows.length} جلسة)`, 'ok');
    renderChats();
  } catch (e) {
    el.innerHTML = `<span class="muted">Load failed: ${e.message} (فشل التحميل: ${e.message})</span>`;
  }
}

function chatVisible() {
  const key = ($('#cSearch').value || '').trim().toLowerCase();
  const onlyActive = $('#cActive').checked;
  const cut = Date.now() / 1000 - 7 * 86400;
  return chatRows.filter(c => {
    if (onlyActive && !(c.last_msg_at && c.last_msg_at >= cut)) return false;
    if (!key) return true;
    return (c.title || '').toLowerCase().indexOf(key) >= 0
      || ('@' + (c.username || '')).toLowerCase().indexOf(key) >= 0;
  });
}

function renderChats() {
  const rows = chatVisible();
  const el = $('#chatList');
  if (!rows.length) {
    el.innerHTML = '<span class="muted">No matching groups. Disable “Only groups with new messages within 7 days” and try again. (لا توجد مجموعات مطابقة. عطّل «المجموعات ذات الرسائل الجديدة خلال 7 أيام» وحاول مجددًا.)</span>';
  } else {
    el.innerHTML = rows.map(c => {
      const tag = c.broadcast ? 'Channel (قناة)' : (c.megagroup ? 'Supergroup (مجموعة فائقة)' : 'Group (مجموعة)');
      const mem = c.members ? `${c.members} members (أعضاء ${c.members})` : 'Unknown member count (عدد الأعضاء غير معروف)';
      return `<label class="chatrow">
        <input type="checkbox" ${chatPicked.has(c.peer) ? 'checked' : ''}
          onchange="toggleChat('${String(c.peer).replace(/'/g, "\\'")}', this.checked)" />
        <span class="t"><b>${esc(c.title)}</b>${c.username ? ' <span class="muted">@' + esc(c.username) + '</span>' : ''}</span>
        <span class="muted">${tag} · ${mem} · ${c.last_msg_at ? rel(c.last_msg_at) : 'No messages (لا توجد رسائل)'}</span>
      </label>`;
    }).join('');
  }
  $('#cCount').textContent = `Selected ${chatPicked.size} groups (تم تحديد ${chatPicked.size} مجموعة) · Currently showing ${rows.length}/${chatRows.length} (المعروض حاليًا ${rows.length}/${chatRows.length})`;
}

function toggleChat(peer, on) {
  if (on) chatPicked.add(peer); else chatPicked.delete(peer);
  $('#cCount').textContent = `Selected ${chatPicked.size} groups (تم تحديد ${chatPicked.size} مجموعة) · Currently showing ${chatVisible().length}/${chatRows.length} (المعروض حاليًا ${chatVisible().length}/${chatRows.length})`;
}

function pickChats(all) {
  if (all) chatVisible().forEach(c => chatPicked.add(c.peer));
  else chatPicked.clear();
  renderChats();
}

async function startCollect() {
  if (!chatPicked.size) { toast('Select at least one group (حدد مجموعة واحدة على الأقل)', 'err'); return; }
  const body = {
    chats: Array.from(chatPicked),
    account_id: parseInt($('#cAcc').value, 10),
    days: parseFloat($('#cDays').value) || 7,
    limit: parseInt($('#cLimit').value, 10) || 300,
    scan: parseInt($('#cScan').value, 10) || 3000,
    skip_bots: $('#cSkipBot').checked,
    skip_premium: $('#cSkipPrem').checked,
    capture_messages: $('#cCapture').checked,
    text_limit: parseInt($('#cTextLimit').value, 10) || 4000,
    tags: ($('#cTags').value || '').split(/[,\uFF0C]/).map(x => x.trim()).filter(Boolean),
  };
  closeAll();
  await guard(() => api('/api/tasks/collect', {method: 'POST', body: JSON.stringify(body)}),
    `Collection task created (${body.chats.length} groups) (تم إنشاء مهمة الجمع (${body.chats.length} مجموعات))`);
  loadTasks();
}

async function newMessageTask() {
  const src = await uiPrompt({
    title: 'Message targets (أهداف الرسالة)',
    message: '• Enter targets directly, comma-separated (@name or user_id) (أدخل الأهداف مباشرة، مفصولة بفواصل (@name أو user_id))\n• Or enter lead:source-name (أو أدخل lead:اسم-المصدر)',
    value: 'lead:',
    label: 'Targets (الأهداف)',
  });
  if (src === null || !String(src).trim()) return;
  const text = await uiPrompt({
    title: 'Message content (محتوى الرسالة)',
    message: 'Supports {a|b} variants, the {name} variable, and HTML hyperlinks. (يدعم بدائل {a|b} ومتغير {name} والروابط التشعبية HTML.)',
    label: 'Body (النص)',
  });
  if (text === null || !text) return;
  let html = false;
  if (/<[a-z]/i.test(text)) {
    html = await uiConfirm({title: 'Rich text (نص منسق)', message: 'HTML tags detected. Send as rich text? Hyperlinks will be clickable. (تم اكتشاف وسوم HTML. هل ترسل كنص منسق؟ ستكون الروابط قابلة للنقر.)', okText: 'Send rich text (إرسال نص منسق)'});
  }
  const body = {text, html, spintax: true, concurrency: 1, delay: 0};
  if (src.indexOf('lead:') === 0) body.lead_source = src.slice(5).trim();
  else body.peers = src.split(/[,\uff0c]/).map(x => x.trim()).filter(Boolean);
  await guard(() => api('/api/tasks/message', {method: 'POST', body: JSON.stringify(body)}),
    'Broadcast task created (تم إنشاء مهمة الإرسال الجماعي)');
  loadTasks();
}

/* ---------- Lead Library ---------- */
let leadRows = [];

async function loadLeads() {
  try {
    const [srcs, data] = await Promise.all([api('/api/leads/sources'), api('/api/leads?limit=500')]);
    leadRows = data.items || [];
    const el = $('#leadList');
    if (!el) return;
    $('#leadHint').textContent = leadRows.length
      ? `${data.count} people (عدد الأشخاص: ${data.count}) · ${srcs.length} sources (عدد المصادر: ${srcs.length})` : '';
    if (!leadRows.length) {
      el.innerHTML = '<span class="muted">No leads collected yet. Click “Collect Speakers” in Task Center first. (لم يتم جمع أي عملاء محتملين بعد. انقر «جمع المتحدثين» في مركز المهام أولًا.)</span>';
      return;
    }
    const bySrc = srcs.map(x => `<div class="leadsrc">
      <b>${esc(x.source)}</b><span class="muted">${x.item_count} people (${x.item_count} شخصًا) · with usernames: ${x.with_username || 0} (${x.with_username || 0} بأسماء مستخدمين)</span>
      <span style="flex:1"></span>
      <button class="sm fit" onclick="viewLeadMsgs(null, '${esc(x.source).replace(/'/g, "\\'")}')">View chat (عرض المحادثة)</button>
      <button class="sm fit write" onclick="sendToSource('${esc(x.source).replace(/'/g, "\\'")}')">Broadcast to it (إرسال جماعي إليه)</button>
      </div>`).join('');
    const list = leadRows.slice(0, 50).map(x =>
      `<div class="leadrow"><span>${x.username ? '@' + esc(x.username) : esc(x.name || x.user_id)}</span>
       <span class="muted">${esc(x.source)} · ${x.msg_count || 0} messages (${x.msg_count || 0} رسالة) · ${rel(x.last_msg_at)}</span>
       <span style="flex:1"></span>
       <button class="sm fit" onclick="viewLeadMsgs(${Number(x.user_id)}, '${esc(x.source).replace(/'/g, "\\'")}')">Chat (محادثة)</button></div>`).join('');
    el.innerHTML = bySrc + '<div class="hr"></div>' + list
      + (leadRows.length > 50 ? `<div class="muted small">…${leadRows.length} total; export CSV to see all (${leadRows.length} إجماليًا؛ صدّر CSV لرؤية الكل)</div>` : '');
  } catch (e) { /* Silently ignore when not logged in (تجاهل بصمت عند عدم تسجيل الدخول) */ }
}

async function sendToSource(source) {
  const text = await uiPrompt({
    title: 'Broadcast to leads (إرسال جماعي إلى العملاء المحتملين)',
    message: 'Send all leads from “' + source + '” (إرسال جماعي إلى جميع العملاء المحتملين من «' + source + '»). Supports {a|b} variants and the {name} variable. (يدعم بدائل {a|b} ومتغير {name}.)',
    label: 'Body (النص)',
  });
  if (text === null || !text) return;
  await guard(() => api('/api/tasks/message', {method: 'POST', body: JSON.stringify(
    {lead_source: source, text, spintax: true})}), 'Broadcast task created (تم إنشاء مهمة الإرسال الجماعي)');
  loadTasks();
}

function toggleSessMode() {
  const mode = (document.querySelector('input[name="sessMode"]:checked') || {}).value || 'upload';
  $('#sessUploadBox').style.display = mode === 'upload' ? '' : 'none';
  $('#sessFileBox').style.display = mode === 'file' ? '' : 'none';
  $('#sessTextBox').style.display = mode === 'text' ? '' : 'none';
}

document.addEventListener('change', function (e) {
  if (!e.target || e.target.id !== 'sfUpload') return;
  const files = e.target.files || [];
  const el = $('#sfUploadHint');
  if (!el) return;
  if (!files.length) { el.textContent = 'No file selected yet (لم يتم اختيار ملف بعد)'; return; }
  const names = Array.from(files).map(f => f.name + ' (' + Math.round(f.size / 1024) + 'KB)');
  el.textContent = 'Selected ' + files.length + ' files (تم تحديد ' + files.length + ' ملفات): ' + names.slice(0, 5).join(', ')
    + (names.length > 5 ? '…' : '');
});

async function _sessionUploadOne(file, label, proxy, tags) {
  const q = new URLSearchParams();
  if (label) q.set('label', label);
  if (proxy) q.set('proxy', proxy);
  if (tags && tags.length) q.set('tags', tags.join(','));
  const path = '/api/accounts/import-session-upload' + (q.toString() ? '?' + q.toString() : '');
  const headers = {'X-Filename': file.name};
  if (!DEMO) {
    const tok = ($('#token') && $('#token').value) || localStorage.getItem('tam_token') || '';
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
  }
  if (DEMO) {
    return {ok: true, total: 1, succeeded: 1, failed: 0,
            items: [{ok: true, label: file.name, user_id: 900001}], filename: file.name};
  }
  const res = await fetch(path, {method: 'POST', body: file, headers});
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = {detail: text}; }
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText || 'Upload failed (فشل الرفع)');
  return data;
}

async function doSessionImport() {
  const mode = (document.querySelector('input[name="sessMode"]:checked') || {}).value || 'upload';
  const tags = $('#sfTags').value ? $('#sfTags').value.split(',').map(s => s.trim()).filter(Boolean) : [];
  const proxy = $('#sfProxy').value || null;
  const label = $('#sfLabel').value || null;
  try {
    let r;
    if (mode === 'upload') {
      const input = $('#sfUpload');
      const files = input && input.files ? Array.from(input.files) : [];
      if (!files.length) { toast('Select a .session file or zip to upload (حدد ملف .session أو zip لرفعه)', 'err'); return; }
      const merged = {ok: true, total: 0, succeeded: 0, failed: 0, items: []};
      for (let fi = 0; fi < files.length; fi++) {
        const f = files[fi];
        const q = new URLSearchParams();
        if (label) q.set('label', label);
        if (proxy) q.set('proxy', proxy);
        if (tags && tags.length) q.set('tags', tags.join(','));
        const path = '/api/accounts/import-session-upload' + (q.toString() ? '?' + q.toString() : '');
        const headers = {'X-Filename': f.name};
        const title = files.length > 1
          ? ('Import session file (استيراد ملف session) ' + (fi + 1) + '/' + files.length + ' · ' + f.name)
          : ('Import session (استيراد session) · ' + f.name);
        const one = await fetchImportStream(path, {method: 'POST', body: f, headers: headers}, title);
        merged.total += one.total || (one.items || []).length || 0;
        merged.succeeded += one.succeeded || 0;
        merged.failed += one.failed || 0;
        merged.items = merged.items.concat(one.items || []);
      }
      r = merged;
    } else if (mode === 'file') {
      const path = ($('#sfPath').value || '').trim();
      if (!path) { toast('Enter the server local path (أدخل المسار المحلي للخادم)', 'err'); return; }
      r = await fetchImportStream('/api/accounts/import-sessions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path, scan: $('#sfScan').checked, label, proxy, tags}),
      }, 'Import session from path (استيراد session من المسار)');
    } else {
      const text = ($('#sfText').value || '').trim();
      if (!text) { toast('Paste StringSession text (ألصق نص StringSession)', 'err'); return; }
      r = await fetchImportStream('/api/accounts/import-session-strings', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text, label, proxy, tags}),
      }, 'Import StringSession (استيراد StringSession)');
    }
    const items = r.items || [];
    const okN = r.succeeded != null ? r.succeeded : items.filter(x => x.ok).length;
    const badN = r.failed != null ? r.failed : items.length - okN;
    const lines = items.map(it => it.ok
      ? ('  ✓ ' + (it.label || it.file || '') + ' user_id=' + (it.user_id || (it.info && it.info.user_id) || '?'))
      : ('  ✗ ' + (it.label || it.file || '') + ' ' + (it.error || 'Failed (فشل)'))).join('\n');
    out('Session import complete: succeeded ' + okN + ' (اكتمل استيراد الجلسة: نجح ' + okN + ') · failed ' + badN + ' (فشل ' + badN + ')\n' + (lines || JSON.stringify(r, null, 2)), true);
    if (okN) { toast('Import succeeded: ' + okN + ' accounts (نجح الاستيراد: ' + okN + ' حسابات)' + (badN ? ' · failed ' + badN + ' (فشل ' + badN + ')' : ''), badN ? '' : 'ok'); closeAll(); }
    else toast('Import failed: 0 succeeded; see the log area for details (فشل الاستيراد: نجح 0؛ راجع منطقة السجل للتفاصيل)', 'err');
    refresh();
  } catch (e) { toast('Import failed: ' + e.message + ' (فشل الاستيراد: ' + e.message + ')', 'err'); out({error: String(e)}, true); }
}

async function viewLeadMsgs(userId, source) {
  try {
    const q = new URLSearchParams();
    if (userId != null && userId !== '') q.set('user_id', String(userId));
    if (source) q.set('source', source);
    q.set('limit', '200');
    const r = await api('/api/leads/messages?' + q.toString());
    const msgs = r.messages || [];
    const st = r.stats || {};
    const titleBits = [];
    if (userId) titleBits.push('User (المستخدم) ' + userId);
    if (source) titleBits.push(source);
    const title = titleBits.join(' · ') || 'Conversation history (سجل المحادثة)';
    closeAll();
    $('#dTitle').textContent = 'Chat (محادثة) · ' + title;
    if (!msgs.length) {
      $('#dBody').innerHTML = '<div class="chat-empty">No conversation history.<br/>Select “Also save conversation history” when collecting speakers. (لا يوجد سجل محادثة.<br/>حدد «حفظ سجل المحادثات أيضًا» عند جمع المتحدثين.)</div>';
      $('#drawer').classList.add('on'); $('#bd').classList.add('on');
      toast('No conversation history (لا يوجد سجل محادثة)', 'err');
      return;
    }
    const stats = '<div class="chat-stats">This page: ' + msgs.length + ' messages (هذه الصفحة: ' + msgs.length + ' رسالة)'
      + (st.total != null ? ' · Library total: ' + st.total + ' / ' + (st.speakers || '?') + ' people (إجمالي المكتبة: ' + st.total + ' / ' + (st.speakers || '?') + ' أشخاص)' : '')
      + '</div>';
    const rows = msgs.map(function (m) {
      const t = m.date ? new Date(m.date * 1000).toLocaleString() : '';
      const who = m.username ? ('@' + m.username) : (m.name || ('#' + (m.user_id || '')));
      const reply = m.reply_to ? (' · Reply (رد) #' + m.reply_to) : '';
      return '<div class="msg-row">'
        + '<div class="msg-meta">' + esc(who) + ' · ' + esc(t) + esc(reply) + '</div>'
        + '<div class="msg-bubble">' + esc(m.text || '(no text) (لا يوجد نص)') + '</div>'
        + '</div>';
    }).join('');
    $('#dBody').innerHTML = stats + '<div class="chat">' + rows + '</div>';
    $('#drawer').classList.add('on'); $('#bd').classList.add('on');
    toast('Loaded ' + msgs.length + ' conversation messages (تم تحميل ' + msgs.length + ' رسالة محادثة)', 'ok');
  } catch (e) { toast('Failed to load conversation: ' + e.message + ' (تعذر تحميل المحادثة: ' + e.message + ')', 'err'); }
}


function exportLeads() {
  if (!leadRows.length) { toast('There are no leads to export (لا توجد عملاء محتملون لتصديرهم)', 'err'); return; }
  const head = ['user_id', 'username', 'name', 'source', 'msg_count', 'last_msg_at'];
  const csv = [head.join(',')].concat(leadRows.map(r => head.map(k => {
    const v = k === 'last_msg_at' ? fmt(r[k]) : (r[k] === null || r[k] === undefined ? '' : r[k]);
    return '"' + String(v).replace(/"/g, '""') + '"';
  }).join(','))).join('\n');
  const blob = new Blob(['\ufeff' + csv], {type: 'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tam-leads.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast(`Exported ${leadRows.length} leads (تم تصدير ${leadRows.length} عميل محتمل)`, 'ok');
}

async function runDoctor() {
  toast('Running health checks and automatic repairs; this may take a minute (جارٍ فحص الحالة والإصلاح التلقائي؛ قد يستغرق ذلك دقيقة)…');
  try {
    const r = await api('/api/doctor/fix', {method: 'POST'});
    const lines = (r.checks || []).map(c => {
      const mark = c.status === 'ok' ? '✓' : (c.status === 'warn' ? '!' : '✗');
      const fixed = c.fixed ? '(automatically repaired) (تم الإصلاح تلقائيًا)' : '';
      const hint = c.hint && c.status !== 'ok' ? `\n     → ${c.hint}` : '';
      return `${mark} ${c.name}: ${c.detail || ''}${fixed}${hint}`;
    });
    out(lines.join('\n'), true);
    if (r.ok) toast(r.fixed && r.fixed.length ? `Health check passed; automatically fixed ${r.fixed.length} items (نجح فحص الحالة؛ تم إصلاح ${r.fixed.length} عنصر تلقائيًا)` : 'All health checks passed (اجتازت كل فحوص الحالة)', 'ok');
    else toast(`${r.failed.length} items failed (فشل ${r.failed.length} عنصرًا) ; see the log area below (راجع منطقة السجل أدناه)`, 'err');
    refresh();
  } catch (e) { toast('Health check failed: ' + e.message + ' (فشل فحص الحالة: ' + e.message + ')', 'err'); out({error: String(e)}, true); }
}

async function hotReload() {
  if (!await uiConfirm({
    title: 'Hot Reload (actual restart) (إعادة التحميل السريع (إعادة تشغيل فعلية))',
    message: 'The backend will restart (os.execv); service unavailable for about 1–3 seconds. (سيُعاد تشغيل الخادم (os.execv)؛ ستتوقف الخدمة نحو 1–3 ثوانٍ.)\nActive imports/tasks will be interrupted. (ستتوقف عمليات الاستيراد والمهام النشطة.)\nContinue? (هل تتابع؟)',
    okText: 'Restart (إعادة التشغيل)',
    danger: true,
  })) return;
  try {

    uiProgress({title: 'Hot Reload (إعادة التحميل السريع)', current: 0, total: 1, text: 'Requesting restart… (جارٍ طلب إعادة التشغيل…)'});
    const r = await api('/api/system/restart', {
      method: 'POST',
      body: JSON.stringify({confirm: true}),
    });
    out(r, true);
    toast(r.message || 'Restarting… (جارٍ إعادة التشغيل…)', 'ok');
    const ok = await waitForRestart(r.instance_id || null);
    uiProgress(null);
    if (ok) {
      toast('Service restored (تمت استعادة الخدمة)', 'ok');
      refresh();
    } else {
      toast('Wait timed out: refresh manually or check whether the process started (انتهت مهلة الانتظار: حدّث الصفحة يدويًا أو تحقق من تشغيل العملية)', 'err');
    }
  } catch (e) {
    uiProgress(null);
    // The restart request may be cut off; continue polling
    toast('Connection interrupted; waiting for restart… (انقطع الاتصال؛ جارٍ انتظار إعادة التشغيل…)', '');
    const ok = await waitForRestart(null);
    uiProgress(null);
    if (ok) { toast('Service restored (تمت استعادة الخدمة)', 'ok'); refresh(); }
    else toast('Restart may have failed: ' + e.message + ' (قد تفشل إعادة التشغيل: ' + e.message + ')', 'err');
  }
}

async function waitForRestart(previousInstanceId) {
  let sawUnavailable = false;
  for (let i = 0; i < 40; i++) {
    await new Promise(res => setTimeout(res, 800));
    uiProgress({
      title: 'Hot Reload (إعادة التحميل السريع)',
      current: i + 1,
      total: 40,
      text: 'Waiting for the new process to start… (بانتظار بدء العملية الجديدة…) (' + (i + 1) + '/40)',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch('/api/system/status', {
        cache: 'no-store',
        signal: controller.signal,
        headers: {'Authorization': 'Bearer ' + (($('#token') && $('#token').value) || '')},
      });
      if (!res.ok) {
        sawUnavailable = true;
        continue;
      }
      const status = await res.json();
      if (previousInstanceId && status.instance_id !== previousInstanceId) return true;
      if (!previousInstanceId && sawUnavailable) return true;
    } catch (_) {
      sawUnavailable = true;
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

function openErrorLog() {
  openModal('mErrors');
  loadErrorLog();
}

async function loadErrorLog() {
  const pre = $('#errList');
  const st = $('#errStats');
  if (pre) pre.textContent = 'Loading… (جارٍ التحميل…)';
  try {
    const r = await api('/api/system/errors?limit=80');
    const stats = r.stats || {};
    if (st) {
      st.textContent = 'Total ' + (stats.total || 0) + ' entries (إجمالي ' + (stats.total || 0) + ' إدخالات)'
        + (stats.latest_at ? ' · Latest ' + rel(stats.latest_at) + ' (الأحدث: ' + rel(stats.latest_at) + ')' : '');
    }
    const items = r.items || [];
    if (!items.length) {
      if (pre) pre.textContent = 'No error records. (لا توجد سجلات أخطاء.)';
      return;
    }
    const lines = items.map(function (e) {
      const t = e.created_at ? fmt(e.created_at) : '';
      const head = '[' + t + '] ' + (e.level || 'error') + '/' + (e.source || '')
        + (e.path ? ' ' + e.path : '') + (e.id != null ? ' #' + e.id : '');
      const body = e.message || '';
      const tb = e.traceback ? ('\\n' + String(e.traceback).split('\\n').slice(-6).join('\\n')) : '';
      return head + '\\n  ' + body + tb;
    });
    if (pre) pre.textContent = lines.join('\\n\\n');
  } catch (e) {
    if (pre) pre.textContent = 'Load failed: ' + e.message + ' (فشل التحميل: ' + e.message + ')';
  }
}

async function exportErrorLog() {
  try {
    const name = await _downloadBlob('/api/system/errors/export?limit=200', null, 'tam-error-report.json', 'GET');
    toast('Download complete (اكتمل التنزيل) ' + (name || 'Error report (تقرير الأخطاء)'), 'ok');
  } catch (e) {
    // _downloadBlob may be POST-only — fallback fetch
    try {
      const res = await fetch('/api/system/errors/export?limit=200', {
        headers: {'Authorization': 'Bearer ' + (($('#token') && $('#token').value) || '')},
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'tam-error-report.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
      toast('Error report downloaded (تم تنزيل تقرير الأخطاء)', 'ok');
    } catch (e2) {
      toast('Export failed: ' + e2.message + ' (فشل التصدير: ' + e2.message + ')', 'err');
    }
  }
}

async function clearErrorLog() {
  if (!await uiConfirm({title: 'Clear error log (مسح سجل الأخطاء)', message: 'Confirm clearing all error records (تأكيد مسح كل سجلات الأخطاء)?', danger: true, okText: 'Clear (مسح)'})) return;
  try {
    const r = await api('/api/system/errors', {method: 'DELETE'});
    toast('Deleted ' + (r.deleted || 0) + ' entries (تم حذف ' + (r.deleted || 0) + ' إدخالات)', 'ok');
    loadErrorLog();
  } catch (e) {
    toast('Clear failed: ' + e.message + ' (فشل المسح: ' + e.message + ')', 'err');
  }
}

function reportClientError(message, extra) {
  try {
    const body = {
      message: String(message || 'unknown').slice(0, 4000),
      source: 'client',
      path: location.pathname,
      href: location.href,
      stack: (extra && extra.stack) ? String(extra.stack).slice(0, 8000) : undefined,
      extra: extra || undefined,
    };
    // Do not use api to avoid triggering again progress; fail silently
    fetch('/api/system/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (($('#token') && $('#token').value) || localStorage.getItem('tam_token') || ''),
      },
      body: JSON.stringify(body),
    }).catch(function () {});
  } catch (_) {}
}

window.addEventListener('error', function (ev) {
  reportClientError(ev.message || 'window.error', {
    stack: ev.error && ev.error.stack,
    file: ev.filename,
    line: ev.lineno,
    col: ev.colno,
  });
});
window.addEventListener('unhandledrejection', function (ev) {
  const r = ev.reason;
  reportClientError(
    (r && r.message) ? r.message : String(r || 'unhandledrejection'),
    {stack: r && r.stack}
  );
});



/* When pin=true, lock the log area; automatic refresh will not overwrite it until the user clicks "Resume automatic log" */
let logPinned = false;

/* ---------- Human-readable rendering ---------- */
const ACTION_CN = {
  import_session:'Import Session (استيراد الجلسة)', import_session_file:'Import Session File (استيراد ملف الجلسة)', import_sessions:'Import session file (استيراد ملف session)',
  import_session_strings:'Import StringSession (استيراد StringSession)', import_session_upload:'Upload Session Import (رفع واستيراد session)',
  import_accounts:'Bulk Import Accounts (استيراد الحسابات جماعيًا)', import_tdata:'tdata Import (استيراد tdata)', import_tdata_upload:'Upload tdata Import (رفع واستيراد tdata)',
  health_check:'Health Check (فحص الحالة)', send_code:'Send Code (إرسال الرمز)', sign_in:'Code Login (تسجيل الدخول بالرمز)',
  auto_login:'Auto Code Login (تسجيل الدخول بالرمز تلقائيًا)', qr_login_start:'QR Login Started (بدء تسجيل الدخول عبر QR)', qr_login:'QR Login (تسجيل الدخول عبر QR)', fetch_code:'Fetch Code (جلب الرمز)', send_message:'Send Message (إرسال رسالة)',
  update_profile:'Update Profile (تحديث الملف الشخصي)', terminate_sessions:'Clear Other Devices (مسح الأجهزة الأخرى)', logout:'Log Out (تسجيل الخروج)', delete:'Delete Account (حذف الحساب)',
  spam_check:'Restriction Check (فحص القيود)', okpay_balance:'OKPay Balance (رصيد OKPay)', regenerate_session:'Regenerate Session (إعادة إنشاء الجلسة)', twofa_status:'2FA Status (حالة التحقق بخطوتين)', twofa_reset:'Start 2FA Reset (بدء إعادة ضبط 2FA)', twofa_reset_cancel:'Cancel 2FA Reset (إلغاء إعادة ضبط 2FA)', twofa:'Change 2FA (تغيير التحقق بخطوتين)', search_public:'Search Public (البحث العام)', join_chat:'Join Group Chat (الانضمام إلى محادثة جماعية)', list_members:'Group Members (أعضاء المجموعة)', read_messages:'Read Group Messages (قراءة رسائل المجموعة)', list_contacts:'Contacts (جهات الاتصال)', add_contact:'Add Contact (إضافة جهة اتصال)', delete_contact:'Delete Contact (حذف جهة اتصال)', send_media:'Send File (إرسال ملف)', download_media:'Download Media (تنزيل الوسائط)', create_channel:'Create Channel (إنشاء قناة)', set_username:'Set Username (تعيين اسم المستخدم)', interact_bot:'Bot Interaction (تفاعل الروبوت)', privacy:'Privacy Settings (إعدادات الخصوصية)', contacts_clear:'Clear Contacts (مسح جهات الاتصال)', dialogs_clear:'Clear Dialogs (مسح المحادثات)', profile_clear:'Anti-Recovery Cleanup (تنظيف منع الاسترداد)', logout:'Log Out (تسجيل الخروج)', delete_tg_account:'Delete Telegram Account (حذف حساب تيليجرام)', alive:'Activity Filter (تصفية النشاط)',
  export_session_string:'Export StringSession (تصدير StringSession)', export_session_file:'Export .session (تصدير .session)',
  export_session_pack:'Export Pack (تصدير حزمة)', export_tdata:'Export tdata (تصدير tdata)',
  warmup:'Warm Up (تهيئة الحساب)', warmup_chat:'Warm-up Chat (محادثة تهيئة)', auto_kick:'Automatic Device Cleanup (تنظيف الأجهزة تلقائيًا)',
  list_groups:'List Groups (عرض المجموعات)', collect_recent:'Collect Speakers (جمع المتحدثين)', sync_login_at:'Sync Login Time (مزامنة وقت تسجيل الدخول)',
  'toolbox.one':'Single-Account Toolbox (صندوق أدوات الحساب الواحد)', 'toolbox.batch':'Bulk Toolbox (صندوق الأدوات الجماعي)',
  'tools.unpack':'ZIP Split (تقسيم ZIP)', 'tools.merge':'ZIP Merge (دمج ZIP)', 'tools.regtime':'Classify by Registration Time (تصنيف حسب وقت التسجيل)',
  'settings.save':'Save Settings (حفظ الإعدادات)', 'settings.reset':'Reset Settings (إعادة ضبط الإعدادات)',
  'tools.call':'Agent Tool Call (استدعاء أداة Agent)'
};
const STATUS_CN = {new:'Not logged in (لم يسجل الدخول)', active:'Normal (طبيعي)', spam_block:'Temporary restriction (تقييد مؤقت)', spam_block_perm:'Permanent restriction (تقييد دائم)',
  frozen:'Frozen (مجمّد)', unauthorized:'Session invalid (الجلسة غير صالحة)', restricted:'Restricted (مقيّد)', banned:'Banned (محظور)', error:'Error (خطأ)',
  flood_wait:'Rate limited (تم تحديد المعدل)'};
const cnStatus = s => STATUS_CN[s] ? `${STATUS_CN[s]} (${s})` : (s || 'Unknown (غير معروف)');
function whoIs(id) {
  if (id === null || id === undefined) return 'System (النظام)';
  const a = accounts.find(x => x.id === id);
  return a ? `${a.label}${a.phone ? ' ' + fmtPhone(a.phone) : ''}` : `Account (الحساب) #${id}`;
}
function logLines(rows) {
  return rows.map(r => `${fmt(r.created_at)}  ${r.ok ? '✓' : '✗'} ${ACTION_CN[r.action] || r.action}`
    + `  ${whoIs(r.account_id)}${r.detail ? '  ' + r.detail : ''}`).join('\n');
}
function humanize(d) {
  if (d === null || d === undefined) return null;
  if (Array.isArray(d)) {
    if (!d.length) return '(empty list) ((قائمة فارغة))';
    const f = d[0];
    if (f && f.action !== undefined && f.created_at !== undefined)
      return `Activity log: ${d.length} entries (سجل العمليات: ${d.length} إدخالات) (newest first (الأحدث أولًا))\n` + logLines(d);
    if (f && (f.device !== undefined || f.platform !== undefined || f.app !== undefined))
      return `Devices logged into this account (الأجهزة المسجلة الدخول إلى هذا الحساب): ${d.length} devices (أجهزة ${d.length}): \n` + d.map(x =>
        `• ${x.app || x.device || 'Unknown client (عميل غير معروف)'}${x.platform ? ' · ' + x.platform : ''}`
        + `${x.country ? ' · ' + x.country : ''}${x.current ? ' · Current session (الجلسة الحالية)' : ''}`
        + `${x.date_created ? ' · Logged in at (تم تسجيل الدخول في) ' + String(x.date_created).replace('T', ' ').slice(0, 16) : ''}`
        + `${x.date_active ? ' · Last active (آخر نشاط) ' + String(x.date_active).replace('T', ' ').slice(0, 16) : ''}`).join('\n')
        + (d.length > 1 ? '\nHint (تلميح): use “Clear Other Devices (مسح الأجهزة الأخرى) / Bulk Kick Devices (طرد الأجهزة جماعيًا)” to kick all logins except this device. (استخدمهما لطرد كل جلسات الدخول عدا هذا الجهاز.)' : '');
    if (f && (f.name !== undefined || f.title !== undefined))
      return `Recent Sessions (الجلسات الأخيرة): ${d.length} sessions (جلسات ${d.length}): \n` + d.map(x =>
        `• ${x.name || x.title}${x.unread ? ` (unread (غير مقروء) ${x.unread})` : ''}`).join('\n');
    // tdata/session import: [{path, accounts:[{ok,...}]}]
    if (f && (f.accounts !== undefined || f.path !== undefined) && (f.accounts || f.path)) {
      return d.map(e => {
        const accs = e.accounts || [];
        const okN = accs.filter(a => a.ok).length;
        const lines = accs.map(a => a.ok
          ? `  ✓ ${a.label || ''} user_id=${a.user_id || '?'}`
          : `  ✗ ${a.label || a.error || 'Failed (فشل)'}${a.error && a.label ? ' · ' + a.error : ''}`);
        return `directory (مجلد): ${e.path || '—'}\nSucceeded (نجح) ${okN}/${accs.length}\n` + (lines.join('\n') || '   (No account details (لا توجد تفاصيل حساب))');
      }).join('\n\n');
    }
    // bulk account result
    if (f && (f.account_id !== undefined || f.id !== undefined) && (f.ok !== undefined || f.error !== undefined || f.spam_status !== undefined || f.balances !== undefined)) {
      const ok = d.filter(x => x.ok !== false && !x.error).length;
      return `Bulk result (النتيجة الجماعية): ${d.length} total (إجمالي ${d.length}), succeeded ${ok} (نجح ${ok}), failed ${d.length - ok} (فشل ${d.length - ok})\n` + d.map(x => {
        const id = x.account_id ?? x.id;
        let extra = '';
        if (x.error) extra = '  ' + x.error;
        else if (x.spam_status) extra = '  ' + cnStatus(x.spam_status) + (x.reply ? '\n    Reply (الرد): ' + String(x.reply).slice(0, 120) : '');
        else if (x.balances && Object.keys(x.balances).length)
          extra = '  ' + Object.entries(x.balances).map(([k,v]) => k + '=' + v).join(' · ');
        else if (x.status) extra = '  ' + cnStatus(x.status);
        else if (x.device_model) extra = '  New device (جهاز جديد): ' + x.device_model;
        return `${x.ok === false || x.error ? '✗' : '✓'} ${whoIs(id)}${extra}`;
      }).join('\n');
    }
    // Generic object array
    try {
      return `List (القائمة): ${d.length} entries (إدخالات ${d.length}): \n` + d.slice(0, 30).map((x, i) => {
        if (typeof x !== 'object' || !x) return `• ${String(x)}`;
        const keys = Object.keys(x).slice(0, 6);
        return `• [${i + 1}] ` + keys.map(k => `${k}=${typeof x[k] === 'object' ? JSON.stringify(x[k]).slice(0, 40) : x[k]}`).join(' · ');
      }).join('\n') + (d.length > 30 ? `\n…${d.length - 30} more entries (إدخالات إضافية ${d.length - 30})` : '');
    } catch (_) { return null; }
  }
  if (typeof d !== 'object') return String(d);
  if (d.error && !d.ok && Object.keys(d).length <= 3) return `Error (خطأ): ${typeof d.error === 'object' ? JSON.stringify(d.error) : d.error}`;
  if (d.detail && !d.ok && typeof d.detail === 'string' && Object.keys(d).length <= 4)
    return `Details (التفاصيل): ${d.detail}`;

  // Bulk summary {items, succeeded, failed, total}
  if (Array.isArray(d.items) && (d.succeeded !== undefined || d.total !== undefined || d.failed !== undefined)) {
    const items = d.items;
    const ok = d.succeeded != null ? d.succeeded : items.filter(x => x.ok).length;
    const fail = d.failed != null ? d.failed : (items.length - ok);
    const head = `Bulk complete (اكتملت العملية الجماعية): succeeded ${ok} (نجح ${ok}), failed ${fail} (فشل ${fail})` + (d.total != null ? `, total ${d.total} (إجمالي ${d.total})` : `, total ${items.length} (إجمالي ${items.length})`);
    const lines = items.slice(0, 40).map(x => {
      const id = x.account_id ?? x.id;
      if (x.ok === false || x.error) return `✗ ${whoIs(id)}  ${x.error || 'Failed (فشل)'}`;
      if (x.balances) return `✓ ${whoIs(id)}  ` + Object.entries(x.balances).map(([k,v]) => k + '=' + v).join(' · ');
      if (x.spam_status) return `✓ ${whoIs(id)}  ${cnStatus(x.spam_status)}`;
      if (x.device_model) return `✓ ${whoIs(id)}  New device (جهاز جديد): ${x.device_model}` + (x.old_logged_out ? ' · old authorization logged out (تم إلغاء التفويض القديم)' : '');
      if (x.remaining_others !== undefined) return `✓ ${whoIs(id)}  Kick devices (طرد الأجهزة) · other remaining (المتبقي من الأجهزة الأخرى) ${x.remaining_others}`;
      return `✓ ${whoIs(id)}` + (x.label ? '  ' + x.label : '');
    });
    return head + (lines.length ? '\n' + lines.join('\n') : '') + (items.length > 40 ? `\n…${items.length - 40} more entries (إدخالات إضافية ${items.length - 40})` : '');
  }

  if (Array.isArray(d.results)) {
    const rs = d.results, ok = rs.filter(x => x.ok).length;
    const head = d.hours !== undefined
      ? `Automatic device cleanup (تنظيف الأجهزة تلقائيًا): accounts logged in for ${d.hours} hours (حسابات مسجلة منذ ${d.hours} ساعة), due ${d.due ?? rs.length} (المستحقة ${d.due ?? rs.length}), succeeded ${ok} (نجح ${ok}), failed ${rs.length - ok} (فشل ${rs.length - ok})`
      : `Bulk result (النتيجة الجماعية): ${rs.length} total (إجمالي ${rs.length}), succeeded ${ok} (نجح ${ok}), failed ${rs.length - ok} (فشل ${rs.length - ok})`;
    return head + (rs.length ? '\n' + rs.map(x =>
      `${x.ok ? '✓' : '✗'} ${whoIs(x.account_id ?? x.id)}${x.error ? '  ' + x.error : ''}`).join('\n') : '\nNo accounts are due this round (لا توجد حسابات مستحقة هذه الجولة)');
  }

  // Regenerate session
  if (d.old_logged_out !== undefined || (d.ok && d.device_model && d.note && String(d.note).indexOf('new session (جلسة جديدة)') >= 0))
    return `${d.ok ? '✓ Session regenerated (تمت إعادة إنشاء الجلسة)' : '✗ Regeneration failed (فشلت إعادة الإنشاء)'}`
      + (d.label ? ` · ${d.label}` : '')
      + (d.user_id ? ` · user_id=${d.user_id}` : '')
      + (d.device_model ? `\nNew device fingerprint (بصمة الجهاز الجديدة): ${d.device_model} / ${d.app_version || ''} / ${d.system_version || ''}` : '')
      + (d.old_logged_out !== undefined ? `\nOld authorization logout (إلغاء التفويض القديم): ${d.old_logged_out ? 'Executed (تم التنفيذ)' : 'Not confirmed (غير مؤكد) (may still be valid (قد يظل صالحًا))'}` : '')
      + (d.note ? `\n${d.note}` : '');

  // OKPay balance
  if (d.balances !== undefined || (d.bot && d.reply !== undefined && d.account_id !== undefined)) {
    const b = d.balances || {};
    const keys = Object.keys(b);
    return `OKPay Balance query (استعلام الرصيد) · bot (الروبوت) @${d.bot || 'Okpay'}`
      + (d.account_id != null ? ` · ${whoIs(d.account_id)}` : '')
      + (keys.length ? `\nParsed (تم التحليل): ` + keys.map(k => `${k} = ${b[k]}`).join(', ') : '\nCould not parse the amount automatically (تعذر تحليل المبلغ تلقائيًا)')
      + (d.reply ? `\nOriginal excerpt (مقتطف من النص الأصلي): \n${String(d.reply).slice(0, 500)}` : '');
  }

  // 2FA status / Start reset (single-account Toolbox or Details button)
  if (d.result && d.op === 'twofa_status' && d.result.has_password !== undefined)
    d = Object.assign({account_id: d.account_id}, d.result);
  if (d.result && (d.op === 'twofa_reset' || d.op === 'twofa_reset_cancel') && d.result.note)
    d = Object.assign({account_id: d.account_id}, d.result);
  if (d.has_recovery !== undefined && (d.has_password !== undefined || d.pending_reset !== undefined) && d.spam_status === undefined && !d.items) {
    const lines = [];
    lines.push(d.has_password ? '2FA enabled (تم تفعيل 2FA)' : '2FA not enabled (2FA غير مفعّل)');
    lines.push(d.has_recovery ? 'Recovery email: bound (بريد الاسترداد: مرتبط)' : 'Recovery email: not bound (بريد الاسترداد: غير مرتبط)');
    if (d.hint) lines.push('Hint (تلميح): ' + d.hint);
    if (d.pending_reset) lines.push('Reset pending (إعادة الضبط قيد الانتظار)' + ((d.pending_reset_iso || d.pending_reset_date) ? (' · until (حتى) ' + (d.pending_reset_iso || fmt(d.pending_reset_date))) : ''));
    if (d.action === 'reset' || d.result === 'waiting' || d.result === 'ok' || d.result === 'failed_wait') {
      lines.push('Reset result (نتيجة إعادة الضبط): ' + (d.result || d.action));
      if (d.until_iso || d.until_date) lines.push('Wait until (انتظر حتى): ' + (d.until_iso || fmt(d.until_date)));
      if (d.retry_iso || d.retry_date) lines.push('Retry time (وقت إعادة المحاولة): ' + (d.retry_iso || fmt(d.retry_date)));
    }
    if (d.note) lines.push(d.note);
    return lines.join('\n');
  }

  // Restriction check
  if (d.spam_status !== undefined)
    return `Restriction check (فحص القيود): ${cnStatus(d.spam_status)}`
      + (d.account_id != null ? ` · ${whoIs(d.account_id)}` : '')
      + (d.until ? `\nEstimated related time (الوقت ذي الصلة المتوقع): ${fmt(d.until)}` : '')
      + (d.reply ? `\nSpamBot reply (رد SpamBot): \n${String(d.reply).slice(0, 400)}` : '');

  // single-account device kick
  if (d.remaining_others !== undefined || d.verified !== undefined || (d.before !== undefined && d.ok !== undefined && d.account_id === undefined && !d.items))
    return `Clear other devices (مسح الأجهزة الأخرى): ${d.ok || d.verified ? 'Done (تم)' : 'Not fully confirmed (غير مؤكد بالكامل)'}`
      + (d.before != null ? ` · Before kick: ${d.before} authorizations (قبل الطرد: ${d.before} تفويضات)` : '')
      + (d.remaining_others != null ? ` · Other devices still remain: ${d.remaining_others} (لا تزال أجهزة أخرى: ${d.remaining_others})` : '')
      + (d.detail ? `\n${d.detail}` : '');

  // export
  if (d.session && typeof d.session === 'string' && d.session.length > 20)
    return `StringSession exported (تم تصدير StringSession)` + (d.label ? ` · ${d.label}` : '') + (d.user_id ? ` · user_id=${d.user_id}` : '')
      + `\n (Full string is in the raw data on the right; do not disclose it (السلسلة الكاملة في البيانات الخام على اليمين؛ لا تفصح عنها))`;
  if (d.path && (d.ok || d.label) && !d.accounts)
    return `File generated (تم إنشاء الملف)` + (d.label ? ` · ${d.label}` : '') + `\nPath (المسار): ${d.path}`;

  // Health / check type
  if (d.status !== undefined && (d.authorized !== undefined || d.user_id !== undefined) && d.label === undefined) {
    return `Check result (نتيجة الفحص): ${cnStatus(d.status)}`
      + (d.authorized !== undefined ? (d.authorized ? ' · Authorized (مفوّض)' : ' · Unauthorized (غير مفوض)') : '')
      + (d.username ? ` · @${d.username}` : '')
      + (d.user_id ? ` · id=${d.user_id}` : '')
      + (d.note || d.status_note ? `\n${d.note || d.status_note}` : '');
  }

  if (d.enabled !== undefined && d.hours !== undefined)
    return `Automatic device cleanup (تنظيف الأجهزة تلقائيًا): ${d.enabled ? 'enabled (مفعّل)' : 'disabled (معطّل)'} · Interval ${d.hours} hours (الفترة ${d.hours} ساعة) · monitoring ${d.watched} accounts (مراقبة ${d.watched} حسابات)`
      + ` · Pending ${d.due_now} (قيد الانتظار ${d.due_now}) · Scan interval ${Math.round((d.scan_interval_s || 0) / 60)} minutes (فاصل الفحص ${Math.round((d.scan_interval_s || 0) / 60)} دقيقة)`
      + (d.next_at ? ` · Next: ${fmt(d.next_at)}` : '');

  if (d.label !== undefined && d.status !== undefined) {
    const L = [`account (حساب): ${d.label}${d.phone ? ' ' + fmtPhone(d.phone) + ' (' + countryOf(d.phone) + ')' : ''}`,
      `Status: (الحالة:)${cnStatus(d.status)}${d.authorized ? ' · Authorized (مفوّض)' : ' · Unauthorized (غير مفوض)'}`];
    if (d.username) L.push(`Username (اسم المستخدم): @${d.username}`);
    if (d.user_id) L.push(`Telegram ID: ${d.user_id}`);
    if (d.premium) L.push('Premium member (عضو Premium): Telegram Premium');
    if (d.spam_until) L.push(`Restriction release time (وقت رفع التقييد): ${fmt(d.spam_until)}`);
    if (d.proxy) L.push(`Proxy (الوكيل): ${d.proxy}`);
    if (d.status_note) L.push(`Note (ملاحظة): ${d.status_note}`);
    if (d.last_check_at) L.push(`Last check (آخر فحص): ${fmt(d.last_check_at)}`);
    if (d.login_at) L.push(`Login time (وقت تسجيل الدخول): ${fmt(d.login_at)}`);
    if (d.adopted_at) L.push(`Local takeover (الاستلام المحلي): ${fmt(d.adopted_at)}`);
    if (d.last_kick_at) L.push(`Last device cleanup (آخر تنظيف للأجهزة): ${fmt(d.last_kick_at)}`);
    if ((d.tags || []).length) L.push(`tag (وسم): ${d.tags.join(', ')}`);
    return L.join('\n');
  }

  if (d.added !== undefined || d.updated !== undefined)
    return `Import complete (اكتمل الاستيراد): added ${(d.added || []).length} (تمت إضافة ${(d.added || []).length}), updated ${(d.updated || []).length} (تم تحديث ${(d.updated || []).length})`
      + (d.skipped && d.skipped.length ? `; skipped (؛ تم التخطي) ${d.skipped.length} item (عنصر)` : '')
      + (d.dry_run ? ' (dry run; not actually written to the database (تشغيل تجريبي؛ لم تُكتب فعليًا إلى قاعدة البيانات))' : '');

  // doctor
  if (d.checks || d.report || (d.ok !== undefined && d.fixes !== undefined))
    return `One-click health check (فحص حالة بنقرة واحدة): ${d.ok ? 'Passed (اجتاز)' : 'Has issues (به مشاكل)'}`
      + (Array.isArray(d.checks) ? `\n` + d.checks.slice(0, 20).map(c =>
        `${c.ok ? '✓' : '✗'} ${c.name || c.item || ''}${c.detail || c.message ? ' · ' + (c.detail || c.message) : ''}`).join('\n') : '')
      + (d.summary ? `\n${d.summary}` : '');

  // stats
  if (d.total !== undefined && d.active !== undefined && !d.items)
    return `Statistics (الإحصاءات): total ${d.total} accounts (إجمالي ${d.total} حسابات)` + (d.active != null ? ` · Normal ${d.active} (طبيعي ${d.active})` : '')
      + (d.unauthorized != null ? ` · Unauthorized ${d.unauthorized} (غير مفوّض ${d.unauthorized})` : '')
      + Object.keys(d).filter(k => !['total','active','unauthorized','ok'].includes(k)).slice(0, 8)
        .map(k => ` · ${k}=${d[k]}`).join('');

  // settings object
  if (d.values || (d.ok && d.saved))
    return d.saved ? `Settings saved (تم حفظ الإعدادات): ${Array.isArray(d.saved) ? d.saved.join(', ') : d.saved}`
      : `Current settings (الإعدادات الحالية): \n` + Object.entries(d.values || d).slice(0, 20).map(([k,v]) => `• ${k} = ${v}`).join('\n');

  // toolbox single
  if (d.done || d.errors || d.logged_out !== undefined || d.remaining_others !== undefined && d.before !== undefined) {
    const parts = [];
    if (d.done) parts.push('complete (اكتمل): ' + (Array.isArray(d.done) ? d.done.join('; ') : d.done));
    if (d.errors && d.errors.length) parts.push('Issue (مشكلة): ' + d.errors.join('; '));
    if (d.before != null) parts.push(`authorizations before kick (التفويضات قبل الطرد) ${d.before}; other remaining (؛ المتبقي من الأجهزة الأخرى) ${d.remaining_others}`);
    if (d.logged_out !== undefined) parts.push(d.logged_out ? 'Logged out (تم تسجيل الخروج)' : 'Logout not confirmed (تسجيل الخروج غير مؤكد)');
    if (parts.length) return parts.join('\n');
  }

  // ZIP / File task
  if (d.output || d.out_dir || d.packs !== undefined || d.files !== undefined)
    return `ZIP Tool complete (اكتملت الأداة)`
      + (d.output || d.out_dir ? `\nOutput (الإخراج): ${d.output || d.out_dir}` : '')
      + (d.packs != null ? `\nPackage count (عدد الحزم): ${d.packs}` : '')
      + (d.files != null ? `\nFile (ملف): ${d.files}` : '')
      + (d.message || d.note ? `\n${d.message || d.note}` : '');

  // Upload import summary
  if (d.filename && (d.succeeded !== undefined || d.tdata_dirs !== undefined))
    return `Upload import (رفع واستيراد): ${d.filename}`
      + (d.tdata_dirs != null ? ` · Found tdata directories: ${d.tdata_dirs} (تم العثور على مجلدات tdata: ${d.tdata_dirs})` : '')
      + (d.succeeded != null ? ` · successful accounts (الحسابات الناجحة) ${d.succeeded}` : '')
      + (Array.isArray(d.items) ? '\n' + humanize(d.items) : '');

  // Simple ok
  if (d.ok !== undefined && Object.keys(d).length <= 5)
    return d.ok ? ('Operation succeeded (نجحت العملية)' + (d.message || d.note ? ': ' + (d.message || d.note) : ''))
      : `Operation failed (فشلت العملية)${d.error ? ': ' + d.error : d.detail ? ': ' + d.detail : ''}`;

  // Final fallback: Convert the main fields into readable lines instead of giving up
  try {
    const skip = new Set(['trace', 'stack']);
    const lines = Object.keys(d).filter(k => !skip.has(k)).slice(0, 25).map(k => {
      let v = d[k];
      if (v === null || v === undefined) v = '—';
      else if (typeof v === 'object') v = JSON.stringify(v).slice(0, 120);
      else v = String(v).slice(0, 200);
      const kn = ACTION_CN[k] || k;
      return `• ${kn}: ${v}`;
    });
    if (lines.length) return `Result summary (ملخص النتيجة): \n` + lines.join('\n');
  } catch (_) {}
  return null;
}

function out(data, pin) {
  if (logPinned && !pin) return;                 // Locked: Ignore automatic refresh writes
  let human, raw;
  if (typeof data === 'string') { human = data; raw = '—'; }
  else {
    raw = JSON.stringify(data, null, 2);
    try { human = humanize(data); } catch (e) { human = null; }
    if (!human) human = 'Result recorded. Structured fields are in the raw data on the right; add another template if this occurs often. (تم تسجيل النتيجة. الحقول المنظمة في البيانات الخام على اليمين؛ أضف قالبًا آخر إذا تكرر ذلك.)';
  }
  $('#log').textContent = human;
  $('#logRaw').textContent = raw;
  if (pin) { logPinned = true; $('#logPin').style.display = ''; }
}
function unpinLog() { logPinned = false; $('#logPin').style.display = 'none'; loadLogs(); }

/* ---------- Phone number / Country detection ---------- */
const DIAL = {
  '1':'United States (الولايات المتحدة)/Canada (كندا) \ud83c\uddfa\ud83c\uddf8','7':'Russia (روسيا)/Kazakhstan (كازاخستان) \ud83c\uddf7\ud83c\uddfa','20':'Egypt (مصر) \ud83c\uddea\ud83c\uddec','27':'South Africa (جنوب أفريقيا) \ud83c\uddff\ud83c\udde6',
  '30':'Greece (اليونان) \ud83c\uddec\ud83c\uddf7','31':'Netherlands (هولندا) \ud83c\uddf3\ud83c\uddf1','32':'Belgium (بلجيكا) \ud83c\udde7\ud83c\uddea','33':'France (فرنسا) \ud83c\uddeb\ud83c\uddf7','34':'Spain (إسبانيا) \ud83c\uddea\ud83c\uddf8',
  '36':'Hungary (المجر) \ud83c\udded\ud83c\uddfa','39':'Italy (إيطاليا) \ud83c\uddee\ud83c\uddf9','40':'Romania (رومانيا) \ud83c\uddf7\ud83c\uddf4','41':'Switzerland (سويسرا) \ud83c\udde8\ud83c\udded','43':'Austria (النمسا) \ud83c\udde6\ud83c\uddf9',
  '44':'United Kingdom (المملكة المتحدة) \ud83c\uddec\ud83c\udde7','45':'Denmark (الدنمارك) \ud83c\udde9\ud83c\uddf0','46':'Sweden (السويد) \ud83c\uddf8\ud83c\uddea','47':'Norway (النرويج) \ud83c\uddf3\ud83c\uddf4','48':'Poland (بولندا) \ud83c\uddf5\ud83c\uddf1',
  '49':'Germany (ألمانيا) \ud83c\udde9\ud83c\uddea','51':'Peru (بيرو) \ud83c\uddf5\ud83c\uddea','52':'Mexico (المكسيك) \ud83c\uddf2\ud83c\uddfd','53':'Cuba (كوبا) \ud83c\udde8\ud83c\uddfa','54':'Argentina (الأرجنتين) \ud83c\udde6\ud83c\uddf7',
  '55':'Brazil (البرازيل) \ud83c\udde7\ud83c\uddf7','56':'Chile (تشيلي) \ud83c\udde8\ud83c\uddf1','57':'Colombia (كولومبيا) \ud83c\udde8\ud83c\uddf4','58':'Venezuela (فنزويلا) \ud83c\uddfb\ud83c\uddea','60':'Malaysia (ماليزيا) \ud83c\uddf2\ud83c\uddfe',
  '61':'Australia (أستراليا) \ud83c\udde6\ud83c\uddfa','62':'Indonesia (إندونيسيا) \ud83c\uddee\ud83c\udde9','63':'Philippines (الفلبين) \ud83c\uddf5\ud83c\udded','64':'New Zealand (نيوزيلندا) \ud83c\uddf3\ud83c\uddff','65':'Singapore (سنغافورة) \ud83c\uddf8\ud83c\uddec',
  '66':'Thailand (تايلاند) \ud83c\uddf9\ud83c\udded','81':'Japan (اليابان) \ud83c\uddef\ud83c\uddf5','82':'South Korea (كوريا الجنوبية) \ud83c\uddf0\ud83c\uddf7','84':'Vietnam (فيتنام) \ud83c\uddfb\ud83c\uddf3','86':'China (الصين) \ud83c\udde8\ud83c\uddf3',
  '90':'Turkey (تركيا) \ud83c\uddf9\ud83c\uddf7','91':'India (الهند) \ud83c\uddee\ud83c\uddf3','92':'Pakistan (باكستان) \ud83c\uddf5\ud83c\uddf0','93':'Afghanistan (أفغانستان) \ud83c\udde6\ud83c\uddeb','94':'Sri Lanka (سريلانكا) \ud83c\uddf1\ud83c\uddf0',
  '95':'Myanmar (ميانمار) \ud83c\uddf2\ud83c\uddf2','98':'Iran (إيران) \ud83c\uddee\ud83c\uddf7','212':'Morocco (المغرب) \ud83c\uddf2\ud83c\udde6','213':'Algeria (الجزائر) \ud83c\udde9\ud83c\uddff','216':'Tunisia (تونس) \ud83c\uddf9\ud83c\uddf3',
  '218':'Libya (ليبيا) \ud83c\uddf1\ud83c\uddfe','220':'Gambia (غامبيا) \ud83c\uddec\ud83c\uddf2','221':'Senegal (السنغال) \ud83c\uddf8\ud83c\uddf3','233':'Ghana (غانا) \ud83c\uddec\ud83c\udded','234':'Nigeria (نيجيريا) \ud83c\uddf3\ud83c\uddec',
  '237':'Cameroon (الكاميرون) \ud83c\udde8\ud83c\uddf2','249':'Sudan (السودان) \ud83c\uddf8\ud83c\udde9','251':'Ethiopia (إثيوبيا) \ud83c\uddea\ud83c\uddf9','254':'Kenya (كينيا) \ud83c\uddf0\ud83c\uddea','255':'Tanzania (تنزانيا) \ud83c\uddf9\ud83c\uddff',
  '256':'Uganda (أوغندا) \ud83c\uddfa\ud83c\uddec','260':'Zambia (زامبيا) \ud83c\uddff\ud83c\uddf2','263':'Zimbabwe (زيمبابوي) \ud83c\uddff\ud83c\uddfc','351':'Portugal (البرتغال) \ud83c\uddf5\ud83c\uddf9','352':'Luxembourg (لوكسمبورغ) \ud83c\uddf1\ud83c\uddfa',
  '353':'Ireland (أيرلندا) \ud83c\uddee\ud83c\uddea','354':'Iceland (آيسلندا) \ud83c\uddee\ud83c\uddf8','355':'Albania (ألبانيا) \ud83c\udde6\ud83c\uddf1','358':'Finland (فنلندا) \ud83c\uddeb\ud83c\uddee','359':'Bulgaria (بلغاريا) \ud83c\udde7\ud83c\uddec',
  '370':'Lithuania (ليتوانيا) \ud83c\uddf1\ud83c\uddf9','371':'Latvia (لاتفيا) \ud83c\uddf1\ud83c\uddfb','372':'Estonia (إستونيا) \ud83c\uddea\ud83c\uddea','373':'Moldova (مولدوفا) \ud83c\uddf2\ud83c\udde9','374':'Armenia (أرمينيا) \ud83c\udde6\ud83c\uddf2',
  '375':'Belarus (بيلاروس) \ud83c\udde7\ud83c\uddfe','380':'Ukraine (أوكرانيا) \ud83c\uddfa\ud83c\udde6','381':'Serbia (صربيا) \ud83c\uddf7\ud83c\uddf8','385':'Croatia (كرواتيا) \ud83c\udded\ud83c\uddf7','386':'Slovenia (سلوفينيا) \ud83c\uddf8\ud83c\uddee',
  '420':'Czechia (التشيك) \ud83c\udde8\ud83c\uddff','421':'Slovakia (سلوفاكيا) \ud83c\uddf8\ud83c\uddf0','593':'Ecuador (الإكوادور) \ud83c\uddea\ud83c\udde8','595':'Paraguay (باراغواي) \ud83c\uddf5\ud83c\uddfe','598':'Uruguay (أوروغواي) \ud83c\uddfa\ud83c\uddfe',
  '852':'Hong Kong (هونغ كونغ) \ud83c\udded\ud83c\uddf0','853':'Macau (ماكاو) \ud83c\uddf2\ud83c\uddf4','855':'Cambodia (كمبوديا) \ud83c\uddf0\ud83c\udded','856':'Laos (لاوس) \ud83c\uddf1\ud83c\udde6','880':'Bangladesh (بنغلاديش) \ud83c\udde7\ud83c\udde9',
  '886':'Taiwan (تايوان) \ud83c\uddf9\ud83c\uddfc','960':'Maldives (المالديف) \ud83c\uddf2\ud83c\uddfb','961':'Lebanon (لبنان) \ud83c\uddf1\ud83c\udde7','962':'Jordan (الأردن) \ud83c\uddef\ud83c\uddf4','963':'Syria (سوريا) \ud83c\uddf8\ud83c\uddfe',
  '964':'Iraq (العراق) \ud83c\uddee\ud83c\uddf6','965':'Kuwait (الكويت) \ud83c\uddf0\ud83c\uddfc','966':'Saudi Arabia (السعودية) \ud83c\uddf8\ud83c\udde6','967':'Yemen (اليمن) \ud83c\uddfe\ud83c\uddea','968':'Oman (عُمان) \ud83c\uddf4\ud83c\uddf2',
  '971':'United Arab Emirates (الإمارات العربية المتحدة) \ud83c\udde6\ud83c\uddea','972':'Israel (إسرائيل) \ud83c\uddee\ud83c\uddf1','973':'Bahrain (البحرين) \ud83c\udde7\ud83c\udded','974':'Qatar (قطر) \ud83c\uddf6\ud83c\udde6','975':'Bhutan (بوتان) \ud83c\udde7\ud83c\uddf9',
  '976':'Mongolia (منغوليا) \ud83c\uddf2\ud83c\uddf3','977':'Nepal (نيبال) \ud83c\uddf3\ud83c\uddf5','992':'Tajikistan (طاجيكستان) \ud83c\uddf9\ud83c\uddef','993':'Turkmenistan (تركمانستان) \ud83c\uddf9\ud83c\uddf2','994':'Azerbaijan (أذربيجان) \ud83c\udde6\ud83c\uddff',
  '995':'Georgia (جورجيا) \ud83c\uddec\ud83c\uddea','996':'Kyrgyzstan (قرغيزستان) \ud83c\uddf0\ud83c\uddec','998':'Uzbekistan (أوزبكستان) \ud83c\uddfa\ud83c\uddff'};
/* Prefer long prefixes: Try first3 digits, then 2 digits, finally 1 digits */
function dialOf(phone) {
  const d = String(phone || '').replace(/[^0-9]/g, '');
  if (!d) return null;
  for (const n of [3, 2, 1]) {
    const code = d.slice(0, n);
    if (DIAL[code]) return {code, rest: d.slice(n), country: DIAL[code]};
  }
  return null;
}
/* Displayed as +91 7299333330 */
function fmtPhone(phone) {
  if (!phone) return '—';
  const hit = dialOf(phone);
  const d = String(phone).replace(/[^0-9]/g, '');
  return hit ? `+${hit.code} ${hit.rest}` : '+' + d;
}
function countryOf(phone) {
  const hit = dialOf(phone);
  return hit ? hit.country : 'Unrecognized (غير معروف)';
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function fmt(ts) { return ts ? new Date(ts * 1000).toLocaleString('zh-CN', {hour12:false}) : '—'; }
/* Server/local clock difference (milliseconds). If local time is inaccurate, relative times can be wildly wrong, so use server time consistently. */
let skewMs = 0;
const nowMs = () => Date.now() + skewMs;
function syncClock(serverNow) {
  if (!serverNow) return;
  const d = serverNow * 1000 - Date.now();
  skewMs = Math.abs(d) > 5000 ? d : 0;   // Differences within 5 seconds are normal jitter; do not correct them
}
function rel(ts) {
  if (!ts || !isFinite(ts)) return '—';
  const d = ts * 1000 - nowMs(), m = Math.round(Math.abs(d) / 60000);
  const s = m < 60 ? m + ' minutes (' + m + ' دقيقة)' : (m < 1440 ? (m / 60).toFixed(1) + ' hours (' + (m / 60).toFixed(1) + ' ساعة)' : (m / 1440).toFixed(1) + ' days (' + (m / 1440).toFixed(1) + ' يوم)');
  return d >= 0 ? s + ' from now (من الآن)' : s + ' ago (منذ)';
}
/* Explain when this account will automatically clear other devices. */
/* Compact list display: time until the next automatic cleanup. */
/* Same rules as backend autokick.plan. Prefer backend-supplied a.kick; use the local fallback only for old backends. */
const KICK_SKIP_STATUS = new Set(['banned', 'unauthorized', 'frozen', 'spam_block_perm']);
const KICK_STATE_CN = {disabled:'—', no_session:'—', off:'Off (متوقف)', skipped:'Not participating (لا يشارك)', no_base:'Awaiting takeover (بانتظار الاستلام)'};
const KICK_BASE_CN = {kick_retry_at:'Retry after the last failed kick (إعادة المحاولة بعد فشل الطرد السابق)', last_kick_at:'Last device cleanup (آخر تنظيف للأجهزة)',
                      adopted_at:'Local takeover time (وقت الاستلام المحلي)', login_at:'Session creation time (وقت إنشاء الجلسة)', created_at:'Account creation time (وقت إنشاء الحساب)'};
function kickPlan(a) {
  if (a.kick && a.kick.state) return a.kick;
  const hrs = (a.auto_kick_hours != null && a.auto_kick_hours > 0)
    ? Number(a.auto_kick_hours) : (kick.hours || 24);
  const loop = (a.auto_kick_loop == null) ? true : !!a.auto_kick_loop;
  if (!kick.enabled && !(a.auto_kick_hours > 0))
    return {state:'disabled', reason:'Automatic device cleanup is not enabled globally (التنظيف التلقائي للأجهزة غير مفعّل عالميًا)', hours: hrs, loop: loop};
  if (!a.authorized) return {state:'no_session', reason:'Unauthorized; not participating yet (غير مفوّض؛ لا يشارك بعد)', hours: hrs, loop: loop};
  if (!a.auto_kick) return {state:'off', reason:'This account has disabled it separately (عطّله هذا الحساب منفردًا)', hours: hrs, loop: loop};
  if (KICK_SKIP_STATUS.has(a.status)) return {state:'skipped', reason:`Status ${a.status}; will not be retried (الحالة ${a.status}؛ لن تتم إعادة المحاولة)`, hours: hrs, loop: loop};
  if (!loop && a.last_kick_at && !a.kick_retry_at)
    return {state:'done', reason:'One-time device cleanup completed (اكتمل تنظيف الأجهزة لمرة واحدة); looping is disabled (التكرار غير مفعّل)', hours: hrs, loop: false};
  if (a.kick_retry_at) {
    return {state: a.kick_retry_at * 1000 <= nowMs() ? 'due' : 'waiting',
            due_at: a.kick_retry_at, base_from:'kick_retry_at', retrying: true,
            reason:'The last kick failed; waiting to retry (فشل الطرد السابق؛ بانتظار إعادة المحاولة)', hours: hrs, loop: loop};
  }
  const from = a.last_kick_at ? 'last_kick_at' : (a.adopted_at ? 'adopted_at'
             : (a.login_at ? 'login_at' : (a.created_at ? 'created_at' : null)));
  if (!from) return {state:'no_base', reason:'No takeover time yet (لا يوجد وقت استلام بعد)', hours: hrs, loop: loop};
  const due = a[from] + hrs * 3600;
  return {state: due * 1000 <= nowMs() ? 'due' : 'waiting', due_at: due,
          base_from: from, retrying: false, hours: hrs, loop: loop};
}
function kickCell(a) {
  const p = kickPlan(a);
  if (p.state === 'waiting') return (p.retrying ? 'Retry (إعادة المحاولة) ' : '') + rel(p.due_at)
    + (p.hours ? (' · ' + p.hours + 'h') : '') + (p.loop === false ? ' · One-time (لمرة واحدة)' : '');
  if (p.state === 'due') return p.retrying ? 'Awaiting retry (بانتظار إعادة المحاولة)' : 'Due · awaiting execution (مستحق · بانتظار التنفيذ)';
  if (p.state === 'done') return 'Completed (اكتمل) · One-time (لمرة واحدة)';
  return KICK_STATE_CN[p.state] || '—';
}
function kickHint(a) {
  const p = kickPlan(a);
  const last = a.last_kick_at ? 'Last ' + fmt(a.last_kick_at) + ', ' : '';
  const scanMin = Math.max(1, Math.round((kick.scan_interval_s || 600) / 60));
  const from = p.base_from ? ' · based on ' + (KICK_BASE_CN[p.base_from] || p.base_from) : '';
  if (p.retrying)
    return last + 'Device-cleanup verification failed; retry on ' + fmt(p.due_at) + ' (' + rel(p.due_at) + '). (فشل التحقق من تنظيف الأجهزة؛ أعد المحاولة في ' + fmt(p.due_at) + ' (' + rel(p.due_at) + ').)';
  if (p.state === 'waiting') return last + 'Next: ' + fmt(p.due_at) + ' (' + rel(p.due_at) + ')' + from;
  if (p.state === 'due')
    return last + 'Due on ' + fmt(p.due_at) + '; the backend scans every ' + scanMin + ' minutes and execution will start shortly. (مستحق في ' + fmt(p.due_at) + '؛ يفحص الخادم كل ' + scanMin + ' دقائق وسيبدأ التنفيذ قريبًا.)';
  return last + (p.reason || KICK_STATE_CN[p.state] || 'Not participating (لا يشارك)');
}
function kickHintLegacy(a) {
  if (!a.auto_kick) return 'disabled (معطّل)';
  if (!a.authorized) return 'Not logged in; not participating yet (لم يسجل الدخول؛ لا يشارك بعد)';
  const hrs = (kick.hours || 24) * 3600;
  const base = a.last_kick_at || a.login_at || a.created_at;
  if (!base) return 'The timer starts after login (يبدأ المؤقت بعد تسجيل الدخول)';
  const at = base + hrs;
  return (a.last_kick_at ? 'Last ' + fmt(a.last_kick_at) + ', ' : '') + 'Next: ' + fmt(at) + ' (' + rel(at) + ')';
}

/* ---------- Modal layer ---------- */

/* ---------- In-app dialog (replaces prompt/confirm) ---------- */
let _uiResolver = null;
let _uiMode = 'confirm'; // confirm | prompt | progress

function uiClose() {
  const m = $('#mUi');
  if (m) m.classList.remove('on');
  // Remove the backdrop only when no other modal is open
  const any = [...document.querySelectorAll('.modal.on')].length;
  if (!any) $('#bd').classList.remove('on');
}

function uiResolve(ok) {
  if (_uiMode === 'progress') return; // During progress, confirm/cancel cannot be clicked; use resolve
  const r = _uiResolver;
  _uiResolver = null;
  uiClose();
  if (!r) return;
  if (_uiMode === 'prompt') {
    if (!ok) { r(null); return; }
    r(($('#uiInput') && $('#uiInput').value) || '');
  } else {
    r(!!ok);
  }
}

function uiOpenShell(title, msg) {
  closeAll(); // Close other dialogs to avoid confusing stacked logic
  $('#uiTitle').textContent = title || 'hint (تلميح)';
  $('#uiMsg').textContent = msg || '';
  $('#uiInputWrap').style.display = 'none';
  $('#uiProgWrap').style.display = 'none';
  $('#uiActions').style.display = '';
  $('#uiCancel').style.display = '';
  $('#uiOk').style.display = '';
  $('#uiOk').className = 'primary';
  $('#uiOk').textContent = 'confirm (تأكيد)';
  $('#uiCancel').textContent = 'cancel (إلغاء)';
  $('#mUi').classList.add('on');
  $('#bd').classList.add('on');
}

/** @returns {Promise<boolean>} */
function uiConfirm(opts) {
  opts = opts || {};
  _uiMode = 'confirm';
  uiOpenShell(opts.title || 'please confirm (يرجى تأكيد)', opts.message || '');
  if (opts.danger) {
    $('#uiOk').className = 'danger-solid';
    $('#uiOk').textContent = opts.okText || 'confirm execute (تأكيد تنفيذ)';
  } else {
    $('#uiOk').textContent = opts.okText || 'confirm (تأكيد)';
  }
  if (opts.cancelText) $('#uiCancel').textContent = opts.cancelText;
  return new Promise(resolve => { _uiResolver = resolve; });
}

/**
 * Dangerous operation: requires a confirmation word (default "confirm").
 * @returns {Promise<boolean>}
 */
async function uiConfirmDanger(opts) {
  opts = opts || {};
  const word = opts.word || 'confirm';
  const msg = (opts.message || '') + '\n\nEnter below (أدخل أدناه) “' + word + '” to confirm (للتأكيد): ';
  const typed = await uiPrompt({
    title: opts.title || 'Dangerous operation (عملية خطرة)',
    message: msg,
    placeholder: word,
    okText: opts.okText || 'Confirm and execute (تأكيد وتنفيذ)',
    danger: true,
  });
  if (typed === null) return false;
  if (String(typed).trim() !== word) {
    toast('The correct confirmation word was not entered; canceled (لم تُدخل كلمة التأكيد الصحيحة؛ تم الإلغاء)', 'err');
    return false;
  }
  return true;
}

/** @returns {Promise<string|null>} null=cancel  */
function uiPrompt(opts) {
  opts = opts || {};
  _uiMode = 'prompt';
  uiOpenShell(opts.title || 'please enter (يرجى أدخل)', opts.message || '');
  $('#uiInputWrap').style.display = '';
  $('#uiInputLabel').textContent = opts.label || 'Content (المحتوى)';
  const inp = $('#uiInput');
  inp.type = opts.password ? 'password' : 'text';
  inp.value = opts.value != null ? String(opts.value) : '';
  inp.placeholder = opts.placeholder || '';
  if (opts.danger) {
    $('#uiOk').className = 'danger-solid';
  }
  $('#uiOk').textContent = opts.okText || 'confirm (تأكيد)';
  setTimeout(() => { try { inp.focus(); inp.select(); } catch (_) {} }, 30);
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); uiResolve(true); }
    if (e.key === 'Escape') { e.preventDefault(); uiResolve(false); }
  };
  return new Promise(resolve => { _uiResolver = resolve; });
}

/** Show/update/close progress. Pass null to close. */
function uiProgress(opts) {
  if (!opts) {
    if (_uiMode === 'progress') {
      _uiMode = 'confirm';
      uiClose();
    }
    return;
  }
  _uiMode = 'progress';
  _uiResolver = null;
  if (!$('#mUi').classList.contains('on')) {
    closeAll();
    $('#mUi').classList.add('on');
    $('#bd').classList.add('on');
  }
  $('#uiTitle').textContent = opts.title || 'Please confirm (يرجى التأكيد)';
  $('#uiMsg').textContent = opts.message || 'Please wait; do not close the page (يرجى الانتظار؛ لا تغلق الصفحة)…';
  $('#uiInputWrap').style.display = 'none';
  $('#uiProgWrap').style.display = '';
  $('#uiActions').style.display = 'none';
  const cur = opts.current || 0;
  const total = opts.total || 1;
  const pct = Math.max(0, Math.min(100, Math.round(cur / total * 100)));
  $('#uiProgBar').style.width = pct + '%';
  $('#uiProgText').textContent = (opts.text != null)
    ? opts.text
    : (`Progress ${cur}/${total} items (التقدم ${cur}/${total} عناصر)` + (opts.detail ? ' · ' + opts.detail : ''));
}

/** Read settings from the settings-panel cache (use defaults if not loaded). */
function cfgInt(key, defVal) {
  const raw = (typeof SET_ORIG !== 'undefined' && SET_ORIG && SET_ORIG[key] != null)
    ? SET_ORIG[key] : '';
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) ? n : defVal;
}
function batchConc(defVal) {
  let n = cfgInt('TAM_BATCH_CONCURRENCY', defVal != null ? defVal : 3);
  if (n < 1) n = 1;
  if (n > 32) n = 32;
  return n;
}
function regenConcDefault() {
  let n = cfgInt('TAM_REGEN_CONCURRENCY', 1);
  if (n < 1) n = 1;
  if (n > 8) n = 8;
  return n;
}
function opTimeoutMs() {
  let s = cfgInt('TAM_UI_OP_TIMEOUT', 120);
  if (s < 15) s = 15;
  if (s > 600) s = 600;
  return s * 1000;
}
/** Promise timeout: throw on timeout so bulk operations skip automatically. */
function withTimeout(promise, ms, label) {
  let timer = null;
  const sec = Math.round(ms / 1000);
  const timeout = new Promise(function (_, reject) {
    timer = setTimeout(function () {
      reject(new Error('skip automatically on timeout (التخطي تلقائيًا عند انتهاء المهلة) (' + sec + 's)' + (label ? ': ' + label : '')));
    }, ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(function () {
    if (timer) clearTimeout(timer);
  });
}

/** Account display name */
function accLabel(id) {
  const a = accounts.find(x => String(x.id) === String(id));
  return (a && (a.label || a.phone)) ? (a.label || a.phone) : ('#' + id);
}

/** Process an id list serially with progress; return {total,ok,failed,results} */
async function runSerial(ids, worker, title) {
  return runPool(ids, worker, title, 1);
}

/**
 * Process an id list with a parallel pool and progress bar.
 * concurrency=1 means serial. Return {total,ok,failed,results}
 */
async function runPool(ids, worker, title, concurrency) {
  const list = (ids || []).map(Number).filter(n => Number.isFinite(n));
  const total = list.length;
  const conc = Math.max(1, Math.min(Number(concurrency) || 1, 8));
  const results = new Array(total);
  let done = 0, ok = 0, fail = 0;
  let cursor = 0;
  const title0 = title || 'Bulk processing (معالجة جماعية)';

  function paint(currentLabel, extra) {
    const cur = Math.min(done + (currentLabel ? 1 : 0), total) || (total ? 1 : 0);
    uiProgress({
      title: title0 + (conc > 1 ? (' ×' + conc) : ''),
      current: done,
      total: total || 1,
      text: (total ? (done + ' / ' + total) : '…')
        + ' · Succeeded (نجح) ' + ok + ' · Failed (فشل) ' + fail
        + (currentLabel ? (' · ' + currentLabel) : '')
        + (extra ? (' · ' + extra) : ''),
      detail: currentLabel || '',
    });
  }

  if (!total) {
    uiProgress(null);
    return {total: 0, ok: 0, failed: 0, results: []};
  }
  paint('Preparing (جارٍ التحضير)…');

  async function one(idx, id) {
    const lab = accLabel(id);
    const tmo = opTimeoutMs();
    paint(lab + ' in progress (قيد التنفيذ) (' + Math.round(tmo / 1000) + 's)');
    try {
      const r = await withTimeout(worker(id, idx), tmo, lab);
      const row = (r && typeof r === 'object')
        ? Object.assign({ok: true, id: id}, r)
        : {ok: true, id: id, result: r};
      if (row.ok === false) {
        fail++;
        results[idx] = row;
      } else {
        ok++;
        results[idx] = row;
      }
    } catch (e) {
      fail++;
      results[idx] = {ok: false, id: id, error: String(e.message || e), skipped: /\u8D85\u65F6/.test(String(e.message || e))};
    } finally {
      done++;
      paint(lab + ' Done (تم)');
    }
  }

  async function workerLoop() {
    while (true) {
      const idx = cursor++;
      if (idx >= total) return;
      await one(idx, list[idx]);
    }
  }

  const n = Math.min(conc, total);
  await Promise.all(Array.from({length: n}, () => workerLoop()));
  uiProgress(null);
  return {
    total: total,
    ok: ok,
    failed: fail,
    results: results.filter(Boolean),
  };
}

/** Long single request: show a clear wait bar even when progress is unknown; allow an overall timeout. */

/** Streaming import: read NDJSON, show real progress, and return the final done object. */
async function fetchImportStream(url, opts, title) {
  opts = opts || {};
  const headers = Object.assign({}, opts.headers || {});
  headers['Accept'] = 'application/x-ndjson';
  if (!DEMO) {
    const tok = ($('#token') && $('#token').value) || localStorage.getItem('tam_token') || '';
    if (tok && !headers['Authorization']) headers['Authorization'] = 'Bearer ' + tok;
  }
  const u = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'stream=1';
  uiProgress({title: title || 'Importing (جارٍ الاستيراد)', current: 0, total: 1, text: 'Connecting… (جارٍ الاتصال…)'});
  let final = null;
  let okN = 0, failN = 0, total = 1;
  try {
    if (DEMO) {
      await new Promise(r => setTimeout(r, 350));
      final = {event:'done', total:1, succeeded:1, failed:0, items:[{ok:true,label:'demo'}]};
      uiProgress({title: title || 'Importing (جارٍ الاستيراد)', current:1, total:1, text:'Done (تم) 1/1'});
      return final;
    }
    const res = await fetch(u, Object.assign({}, opts, {headers: headers}));
    if (!res.ok) {
      const raw = await res.text();
      let msg = raw;
      try { const j = JSON.parse(raw); msg = j.detail || j.error || raw; } catch (_) {}
      throw new Error(String(msg).slice(0, 400));
    }
    const ct = (res.headers.get('content-type') || '');
    if (ct.indexOf('ndjson') < 0 && ct.indexOf('json') >= 0) {
      const data = await res.json();
      const items = data.items || [];
      const t = data.total || items.length || 1;
      uiProgress({title: title || 'Importing (جارٍ الاستيراد)', current: t, total: t,
        text: 'Done (تم) ' + (data.succeeded || 0) + '/' + t});
      return Object.assign({event:'done'}, data);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      buf += dec.decode(value, {stream: true});
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let ev;
        try { ev = JSON.parse(line); } catch (_) { continue; }
        if (ev.event === 'start') {
          total = ev.total || 1;
          uiProgress({title: title || 'Importing (جارٍ الاستيراد)', current: 0, total: total, text: 'Start (بدء) 0/' + total});
        } else if (ev.event === 'item') {
          total = ev.total || total;
          if (ev.ok) okN++; else failN++;
          const lab = (ev.item && (ev.item.label || ev.item.file || ev.item.user_id)) || '';
          uiProgress({
            title: title || 'Importing (جارٍ الاستيراد)',
            current: ev.index || (okN + failN),
            total: total,
            text: (ev.ok ? '✓' : '✗') + ' ' + (ev.index || (okN + failN)) + '/' + total
              + (lab ? ' · ' + lab : '')
              + ' (succeeded (نجح) ' + okN + ' / Failed (فشل) ' + failN + ')',
          });
        } else if (ev.event === 'done') {
          final = ev;
          total = ev.total || total;
          uiProgress({
            title: title || 'Importing (جارٍ الاستيراد)',
            current: total,
            total: total || 1,
            text: 'complete (اكتمل): succeeded (نجح) ' + (ev.succeeded != null ? ev.succeeded : okN)
              + ' / Failed (فشل) ' + (ev.failed != null ? ev.failed : failN),
          });
        } else if (ev.event === 'error') {
          throw new Error(ev.error || 'Import failed (فشل الاستيراد)');
        }
      }
    }
    if (!final) final = {event:'done', total: total, succeeded: okN, failed: failN, items: []};
    return final;
  } finally {
    await new Promise(r => setTimeout(r, 280));
    uiProgress(null);
  }
}

async function withWaitProgress(title, message, fn, timeoutMs) {
  const tmo = timeoutMs != null ? timeoutMs : Math.max(opTimeoutMs() * 3, 180000);
  uiProgress({
    title: title || 'Processing (جارٍ المعالجة)',
    current: 0,
    total: 1,
    text: (message || 'Request in progress; please wait (الطلب قيد التنفيذ؛ يرجى الانتظار)…') + ' (' + Math.round(tmo / 1000) + 's)',
  });
  try {
    return await withTimeout(fn(), tmo, title || 'Batch task (مهمة جماعية)');
  } finally {
    uiProgress(null);
  }
}

function exportTwofaHint(idOrIds) {
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  let saved = 0, unsavedHas = 0;
  ids.forEach(id => {
    const a = accounts.find(x => x.id === id);
    if (!a) return;
    if (a.has_twofa_saved || a.twofa) saved++;
    else if (a.has_2fa === 1) unsavedHas++;
  });
  if (saved && !unsavedHas) return ' · including saved 2FA (بما في ذلك 2FA المحفوظ) (2fa.txt)';
  if (saved && unsavedHas) return ` · ${saved} files with 2FA (ملفات 2FA: ${saved}) · ${unsavedHas} accounts have 2FA but no saved password (حسابات 2FA دون كلمة مرور محفوظة: ${unsavedHas})`;
  if (!saved && unsavedHas) return ' · 2FA is present but the password is not saved; the pack contains no real (2FA موجود لكن كلمة المرور غير محفوظة؛ لا تحتوي الحزمة على) 2fa.txt';
  return '';
}


function openModal(id) {
  closeAll();
  $('#' + id).classList.add('on');
  $('#bd').classList.add('on');
  document.body.classList.add('modal-open');
}

function openHelp() {
  openModal('mHelp');
}
function helpJump(a) {
  try {
    document.querySelectorAll('#mHelp .help-nav a').forEach(function (x) {
      x.classList.toggle('on', x === a);
    });
    const id = (a.getAttribute('href') || '').replace(/^#/, '');
    const el = id && document.getElementById(id);
    const main = document.querySelector('#mHelp .help-main');
    if (el && main) {
      main.scrollTo({top: Math.max(0, el.offsetTop - 8), behavior: 'smooth'});
    }
  } catch (_) {}
  return false;
}

function closeAll() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('on'));
  const dr = $('#drawer');
  if (dr) dr.classList.remove('on');
  $('#bd').classList.remove('on');
  document.body.classList.remove('modal-open');
  if (_uiResolver && _uiMode !== 'progress') {
    const r = _uiResolver; _uiResolver = null; r(_uiMode === 'prompt' ? null : false);
  }
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

/* ---------- Data loading ---------- */
async function refresh() {
  try {
    const [s, a] = await Promise.all([api('/api/stats'), api('/api/accounts')]);
    stats = s; accounts = a;
    if (a.length && a[0].server_now) syncClock(a[0].server_now);
    render(); loadLogs(); loadKick(); loadTasks(); loadLeads();
    loadSettings(); loadOps(); renderZt();
  } catch (e) { toast('Load failed: ' + e.message + ' (فشل التحميل: ' + e.message + ')', 'err'); out({error: String(e)}, true); }
}
async function loadKick() {
  try {
    kick = await api('/api/autokick');
    syncClock(kick.server_now);
    if (!kick.enabled) { $('#kickbar').style.display = 'none'; return; }
    $('#kickbar').style.display = 'flex';
    $('#kickText').textContent =
      'Automatic device cleanup: local takeover for ' + kick.hours + ' hours; kick other devices and verify the cleanup; monitoring ' + kick.watched + ' accounts (التنظيف التلقائي للأجهزة: بعد الاستلام المحلي لمدة ' + kick.hours + ' ساعة؛ طرد الأجهزة الأخرى والتحقق من التنظيف؛ مراقبة ' + kick.watched + ' حسابًا)'
      + (kick.due_now ? ' · ' + kick.due_now + ' pending (قيد الانتظار: ' + kick.due_now + ')' : '')
      + (kick.retrying ? ' · ' + kick.retrying + ' failed kicks awaiting retry (عمليات طرد فاشلة بانتظار إعادة المحاولة: ' + kick.retrying + ')' : '')
      + (kick.retry_after_text ? ' · retry after failure in ' + kick.retry_after_text + ' (إعادة المحاولة بعد الفشل خلال ' + kick.retry_after_text + ')' : '')
      + (kick.next_at ? ' · Next: ' + fmt(kick.next_at) + ' (' + rel(kick.next_at) + ')' : '');
    // Refill the input only when the user is not editing, so typed text is not overwritten
    const ri = $('#kickRetry');
    if (ri && document.activeElement !== ri) ri.value = kick.retry_after_text ? retryToInput(kick.retry_after_s) : '';
    if (kick.due_now && kick.max_overdue_s > 3 * (kick.scan_interval_s || 600))
      $('#kickText').textContent += ' · ⚠ oldest overdue by ' + (kick.max_overdue_s / 86400).toFixed(1) + ' days (⚠ الأقدم متأخر بمقدار ' + (kick.max_overdue_s / 86400).toFixed(1) + ' يومًا); check the logs (راجع السجلات)';
    render();   // The list’s "Clear Devices" column depends on kick.hours; redraw once after loading the configuration
  } catch (e) { $('#kickbar').style.display = 'none'; }
}
/* Convert seconds back to compact input notation: 90 -> 90s, 900 -> 15m, 3600 -> 1h */
function retryToInput(sec) {
  if (!isFinite(sec) || sec <= 0) return '';
  if (sec % 3600 === 0) return (sec / 3600) + 'h';
  if (sec % 60 === 0) return (sec / 60) + 'm';
  return sec + 's';
}
const saveKickRetry = () => guard(async () => {
  const v = ($('#kickRetry').value || '').trim();
  const r = await api('/api/autokick/retry', {method:'POST', body: JSON.stringify({value: v})});
  loadKick(); return r;
}, 'Retry interval saved (تم حفظ فترة إعادة المحاولة)');
const kickNow = () => guard(async () => {
  const r = await api('/api/autokick/run', {method:'POST'});
  loadKick(); return r;
}, 'One scan completed (اكتملت جولة فحص واحدة)');
async function loadLogs() {
  if (logPinned) return;
  try { out(await api('/api/logs?limit=20')); } catch (e) { out({error: String(e)}); }
}
/* Render the tdata diagnostic report in plain language */
function renderTdataReport(rep) {
  const lines = [`directory (مجلد): ${rep.path}`];
  (rep.steps || []).forEach(s => lines.push(`  ${s.ok ? '✓' : '✗'} ${s.name}${s.detail ? ': ' + s.detail : ''}`));
  (rep.accounts || []).forEach(a => lines.push(`  → Account (الحساب) user_id=${a.user_id} Main (رئيسي)DC=${a.main_dc} Authorized (مفوّض)DC=[${(a.dcs||[]).join(', ')}]`));
  if (rep.error) lines.push(`  ✗ failed (فشل): ${rep.error}`);
  return lines.join('\n');
}
async function probeMode() {
  try {
    const t = await api('/api/tools');
    readonly = !!t.readonly;
    $('#mode').textContent = readonly ? 'Read-only mode (وضع القراءة فقط)' : (t.dry_run ? 'Dry-run mode (الوضع التجريبي)' : 'Full access (صلاحيات كاملة)');
    $('#mode').className = 'pill' + (readonly || t.dry_run ? ' ro' : '');
    document.querySelectorAll('.write').forEach(b => b.disabled = readonly);
  } catch (e) {
    $('#mode').textContent = String(e.message || '').indexOf('401') >= 0 ? 'Invalid token (الرمز غير صالح)' : 'Not connected (غير متصل)';
    $('#mode').className = 'pill off';
  }
}

/* ---------- Layout engine (2D grid + AABB collision + push-down + upward compaction) ---------- */
const STAT_CN = {total: 'Total Accounts (إجمالي الحسابات)', active: 'Logged In (مسجل الدخول)', new: 'New (جديد)', unauthorized: 'Unauthorized (غير مفوض)',
  restricted: 'Restricted (مقيّد)', banned: 'Banned (محظور)', frozen: 'Frozen (مجمّد)', error: 'Error (خطأ)',
  spam_block: 'Restricted (مقيّد)', spam_block_perm: 'Permanent restriction (تقييد دائم)', flood_wait: 'Rate-limit wait (انتظار تحديد المعدل)'};
const FIXED = {
  kickbar: {name: 'Automatic device cleanup bar (شريط تنظيف الأجهزة التلقائي)'},
  accounts: {name: 'Account List (قائمة الحسابات)'},
  tasks: {name: 'Task Center (مركز المهام)'},
  leads: {name: 'Lead Library (مكتبة العملاء المحتملين)'},
  logText: {name: 'Activity Log · Summary (سجل العمليات · الملخص)'},
  logJson: {name: 'Activity Log · Raw JSON (سجل العمليات · JSON الخام)'},
  toolbox: {name: 'Toolbox · Bulk Actions (صندوق الأدوات · إجراءات جماعية)'},
  ziptools: {name: 'ZIP Tools · Split/Merge/Registration Time/Convert to API (أدوات ZIP · تقسيم/دمج/وقت التسجيل/تحويل إلى API)'},
};
const GAP = 12;          // Grid gap
const RH = 40;           // Row height
const layoutKey = 'tam.layout';
const BPS = [{n: 'lg', min: 1180, cols: 12}, {n: 'md', min: 760, cols: 8}, {n: 'sm', min: 0, cols: 4}];
const BP_CN = {lg: 'Wide (عريض)', md: 'Medium (متوسط)', sm: 'Narrow (ضيق)'};

let LAY = {v: 3, bp: {}};
let BP = 'lg';
let editing = false;
let drag = null;
let rsz = null;
let rafPending = false;

function board() { return $('#board'); }
function bpFor(w) { return (BPS.find(b => w >= b.min) || BPS[BPS.length - 1]).n; }
function cols() { return (BPS.find(b => b.n === BP) || BPS[0]).cols; }
function page() {
  if (!LAY.bp[BP]) LAY.bp[BP] = {items: {}, hidden: []};
  const p = LAY.bp[BP];
  if (!p.items) p.items = {};
  if (!Array.isArray(p.hidden)) p.hidden = [];
  if (p.auto === undefined) p.auto = true;
  return p;
}
function colW() {
  const b = board(); if (!b) return 100;
  return (b.clientWidth - GAP * (cols() - 1)) / cols();
}
function wname(k) {
  if (k.indexOf('stat:') === 0) { const t = k.slice(5); return 'Statistics (الإحصاءات) · ' + (STAT_CN[t] || t); }
  return (FIXED[k] || {}).name || k;
}
function minSize(k) { return k.indexOf('stat:') === 0 ? {w: 1, h: 2} : {w: 2, h: 3}; }
function defSize(k) {
  const n = cols();
  if (k.indexOf('stat:') === 0) return {w: n >= 12 ? 2 : (n >= 8 ? 2 : 2), h: 2};
  if (k === 'kickbar') return {w: n, h: 2};
  if (k === 'settings') return {w: n, h: 10};
  if (k === 'toolbox') return {w: n, h: 11};
  if (k === 'ziptools') return {w: n, h: 10};
  if (k === 'accounts') return {w: n, h: 12};
  if (k === 'tasks') return {w: n, h: 9};
  if (k === 'leads') return {w: Math.max(2, Math.round(n / 2)), h: 8};
  if (k === 'logText' || k === 'logJson') return {w: Math.max(2, Math.round(n / 2)), h: 9};
  return {w: n, h: 6};
}
function domKeys() { return [...board().children].map(n => n.dataset && n.dataset.widget).filter(Boolean); }
function visibleKeys() { return domKeys().filter(k => page().hidden.indexOf(k) < 0); }
function items() { return visibleKeys().map(k => itemOf(k)); }

function itemOf(k) {
  const p = page();
  if (!p.items[k]) {
    const d = defSize(k);
    p.items[k] = {k, x: 0, y: bottomY(), w: d.w, h: d.h};
    packItem(p.items[k]);
  }
  const it = p.items[k];
  it.k = k;
  it.w = Math.max(1, Math.min(cols(), it.w | 0 || 1));
  it.h = Math.max(1, it.h | 0 || 1);
  it.x = Math.max(0, Math.min(cols() - it.w, it.x | 0));
  it.y = Math.max(0, it.y | 0);
  return it;
}
const STAT_ORDER = ['total', 'active', 'new', 'unauthorized', 'restricted', 'banned', 'frozen',
  'spam_block', 'spam_block_perm', 'flood_wait', 'error'];
function rank(k) {
  if (k.indexOf('stat:') === 0) {
    const i = STAT_ORDER.indexOf(k.slice(5));
    return 0 + (i < 0 ? 90 : i) * 0.01;
  }
  const R = {kickbar: 1, accounts: 2, tasks: 3, leads: 4, logText: 5, logJson: 6};
  return R[k] !== undefined ? R[k] : 9;
}
/* Default auto-arrangement: once the user adjusts manually (auto=false), do not interfere again. */
function autoArrange() {
  const p = page();
  const keys = visibleKeys().slice().sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
  const placed = [];
  keys.forEach(k => {
    const d = defSize(k);
    const it = p.items[k] || (p.items[k] = {k, x: 0, y: 0, w: d.w, h: d.h});
    it.k = k; it.w = d.w; it.h = d.h; it.x = 0; it.y = 0;
    outer:
    for (let y = 0; y < 400; y++) {
      for (let x = 0; x + it.w <= cols(); x++) {
        const t = {k, x, y, w: it.w, h: it.h};
        if (!placed.some(o => hits(o, t))) { it.x = x; it.y = y; break outer; }
      }
    }
    placed.push(it);
  });
}
function manual() { page().auto = false; }
function bottomY() {
  const p = page();
  return Object.keys(p.items).reduce((m, k) => Math.max(m, (p.items[k].y | 0) + (p.items[k].h | 0)), 0);
}

/* --- AABB collision --- */
function hits(a, b) {
  if (a === b || a.k === b.k) return false;
  return !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
}
function firstHit(list, it) { return list.find(o => hits(o, it)); }

/* --- Place a new widget : find the first available space from top to bottom  --- */
function packItem(it) {
  const others = items().filter(o => o.k !== it.k);
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x + it.w <= cols(); x++) {
      const t = {k: it.k, x, y, w: it.w, h: it.h};
      if (!firstHit(others, t)) { it.x = x; it.y = y; return; }
    }
  }
}

/* --- Push collided widgets downward  (recursively in a chain ) --- */
function pushDown(list, moved, guard) {
  guard = guard || {n: 0};
  let hit;
  while ((hit = firstHit(list.filter(o => o.k !== moved.k), moved)) && guard.n++ < 400) {
    hit.y = moved.y + moved.h;
    pushDown(list, hit, guard);
  }
}

/* --- Compact upward (a widget can be fixed) --- */
function compact(fixedKey) {
  const list = items().slice().sort((a, b) => a.y - b.y || a.x - b.x);
  const placed = [];
  list.forEach(it => {
    if (it.k !== fixedKey) {
      while (it.y > 0) {
        it.y--;
        if (placed.some(o => hits(o, it))) { it.y++; break; }
      }
    }
    placed.push(it);
  });
}
function compactNow() { manual(); compact(); renderLayout(); saveLayout(); toast('Compacted upward; gaps removed (تم ضغط العناصر للأعلى وإزالة الفراغات)', 'ok'); }

/* --- Persistence --- */
function loadLayout() {
  try {
    const o = JSON.parse(localStorage.getItem(layoutKey) || '{}');
    if (o && o.v === 3 && o.bp) LAY = o;
  } catch (e) {}
  BP = bpFor(window.innerWidth);
  ensureWx();
  renderLayout();
}
function saveLayout() {
  try { localStorage.setItem(layoutKey, JSON.stringify(LAY)); } catch (e) {}
}
function applyLayout() { ensureWx(); renderLayout(); saveLayout(); }

/* --- Inject × and resize handles --- */
function setInner(el, html) {
  let inner = el.querySelector(':scope > .inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'inner';
    el.insertBefore(inner, el.firstChild);
  }
  inner.innerHTML = html;
}
function ensureWx() {
  const b = board(); if (!b) return;
  [...b.children].forEach(el => {
    const k = el.dataset && el.dataset.widget;
    if (!k) return;
    if (!el.querySelector(':scope > .wx')) {
      const btn = document.createElement('button');
      btn.className = 'wx';
      btn.textContent = '×';
      btn.title = 'Hide [' + wname(k) + '] (إخفاء [' + wname(k) + '])';
      btn.onclick = ev => { ev.stopPropagation(); hideWidget(k); };
      el.appendChild(btn);
    }
    ['e', 's', 'se'].forEach(dir => {
      if (el.querySelector(':scope > .wr-' + dir)) return;
      const h = document.createElement('div');
      h.className = 'wr wr-' + dir;
      h.dataset.dir = dir;
      h.title = dir === 's' ? 'Drag to change height (snap to rows) (اسحب لتغيير الارتفاع (محاذاة للصفوف))'
        : dir === 'e' ? 'Drag to change width (snap to columns) (اسحب لتغيير العرض (محاذاة للأعمدة))' : 'Drag to resize; double-click to restore default (اسحب لتغيير الحجم؛ انقر مرتين لاستعادة الافتراضي)';
      if (dir === 'se') h.ondblclick = ev => {
        ev.stopPropagation();
        manual();
        const d = defSize(k), it = itemOf(k);
        it.w = d.w; it.h = d.h;
        pushDown(items(), it); compact(k); applyLayout();
        toast('[' + wname(k) + '] Default size restored (تمت استعادة الحجم الافتراضي)', 'ok');
      };
      el.appendChild(h);
    });
  });
}

/* --- Rendering --- */
function place(el, it, cw) {
  el.style.transform = `translate3d(${Math.round(it.x * (cw + GAP))}px,${it.y * (RH + GAP)}px,0)`;
  el.style.width = Math.round(it.w * cw + (it.w - 1) * GAP) + 'px';
  el.style.height = (it.h * RH + (it.h - 1) * GAP) + 'px';
}
function renderLayout() {
  const b = board(); if (!b) return;
  if (page().auto) autoArrange();
  const p = page(), cw = colW();
  [...b.children].forEach(el => {
    const k = el.dataset && el.dataset.widget;
    if (!k) return;
    const hidden = p.hidden.indexOf(k) >= 0;
    el.classList.toggle('whidden', hidden);
    if (hidden) return;
    const it = itemOf(k);
    if (!drag || drag.k !== k) place(el, it, cw);
  });
  b.style.height = Math.max(0, bottomVisible() * (RH + GAP) - GAP) + 'px';
  const box = $('#restoreList');
  if (box) box.innerHTML = p.hidden.length
    ? p.hidden.map(k => `<button class="sm fit" onclick="showWidget('${k}')">+ ${esc(wname(k))}</button>`).join('')
    : '<span class="muted">None; all currently visible (لا شيء؛ الكل ظاهر حاليًا)</span>';
  const tip = $('#bpTip');
  if (tip) tip.textContent = `Current breakpoint: ${BP_CN[BP]} (${cols()} columns) · each breakpoint is saved separately (نقطة التوقف الحالية: ${BP_CN[BP]} (${cols()} أعمدة) · تُحفظ كل نقطة توقف منفصلة)`;
}
function bottomVisible() {
  return items().reduce((m, it) => Math.max(m, it.y + it.h), 0);
}

/* --- Show / hide --- */
function hideWidget(k) {
  manual();
  const p = page();
  if (p.hidden.indexOf(k) < 0) p.hidden.push(k);
  compact(); applyLayout();
  toastUndo('Hidden [' + wname(k) + '] (مخفي: [' + wname(k) + '])', () => showWidget(k));
}
function showWidget(k) {
  manual();
  const p = page();
  p.hidden = p.hidden.filter(x => x !== k);
  const it = p.items[k];
  if (it) { it.y = bottomVisible(); packItem(it); }
  compact(); applyLayout();
  if (k === 'kickbar') loadKick();
  if (k === 'settings') loadSettings();
  if (k === 'toolbox') loadOps();
  if (k === 'ziptools') renderZt();
}
function resetSizes() {
  manual();
  const p = page();
  Object.keys(p.items).forEach(k => {
    const d = defSize(k);
    p.items[k].w = d.w; p.items[k].h = d.h;
  });
  Object.keys(p.items).forEach(k => packItem(p.items[k]));
  compact(); applyLayout();
  toast('All widget default sizes restored (تمت استعادة الأحجام الافتراضية لكل العناصر)', 'ok');
}
function resetLayout() {
  try { localStorage.removeItem(layoutKey); } catch (e) {}
  location.reload();
}
function toggleEdit() {
  editing = !editing;
  document.body.classList.toggle('editing', editing);
  $('#editBtn').textContent = editing ? 'Done (تم)' : 'Edit Layout (تحرير التخطيط)';
  if (editing) toast('Edit mode (وضع التحرير): drag the center to move; drag the sides or lower-right corner to resize; click × to hide. (اسحب الوسط للنقل؛ اسحب الجوانب أو الزاوية السفلية اليمنى لتغيير الحجم؛ انقر × للإخفاء.)');
  else { compact(); applyLayout(); }
}
function toastUndo(msg, undo) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg + '  ';
  const b = document.createElement('button');
  b.className = 'sm fit';
  b.textContent = 'Undo (تراجع)';
  b.onclick = () => { undo(); el.remove(); };
  el.appendChild(b);
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

/* --- Export / Import --- */
function exportLayout() {
  const blob = new Blob([JSON.stringify(LAY, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tam-layout.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('Exported tam-layout.json (تم تصدير tam-layout.json)', 'ok');
}
function importLayout() {
  const f = $('#layFile');
  f.value = '';
  f.onchange = () => {
    const file = f.files && f.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const o = JSON.parse(r.result);
        if (!o || o.v !== 3 || !o.bp) throw new Error('Invalid format (الصيغة غير صحيحة)');
        LAY = o;
        compact(); applyLayout();
        toast('Layout imported (تم استيراد التخطيط)', 'ok');
      } catch (e) { toast('Import failed: ' + e.message + ' (فشل الاستيراد: ' + e.message + ')', 'err'); }
    };
    r.readAsText(file);
  };
  f.click();
}

/* --- Placeholder  --- */
function showPh(it, cw) {
  const ph = $('#ph');
  ph.classList.add('on');
  place(ph, it, cw);
}
function hidePh() { $('#ph').classList.remove('on'); }

/* --- Drag to move  --- */
function dragStart(e) {
  if (!editing || e.button > 0) return;
  if (e.target.closest('.wx') || e.target.closest('.wr')) return;
  const el = e.target.closest('[data-widget]');
  if (!el || el.parentElement !== board()) return;
  const k = el.dataset.widget;
  const r = el.getBoundingClientRect();
  const br = board().getBoundingClientRect();
  manual();
  drag = {
    k, el, it: itemOf(k),
    offX: e.clientX - r.left, offY: e.clientY - r.top,
    br, moved: false, px: 0, py: 0, ev: null,
    touch: e.pointerType === 'touch', ready: e.pointerType !== 'touch',
  };
  if (drag.touch) drag.timer = setTimeout(() => { if (drag) drag.ready = true; }, 220);
  try { el.setPointerCapture && el.setPointerCapture(e.pointerId); } catch (err) {}
}

function dragMove(e) {
  if (!drag) return;
  if (!drag.ready) {
    if (Math.abs(e.clientX - (drag.br.left + drag.offX)) > 24) { clearTimeout(drag.timer); drag = null; }
    return;
  }
  drag.ev = e;
  if (!drag.moved) {
    drag.moved = true;
    drag.el.classList.add('dragging');
    document.body.classList.add('dragging-on');
  }
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(dragFrame);
  }
}

function dragFrame() {
  rafPending = false;
  if (!drag || !drag.ev) return;
  const e = drag.ev, cw = colW();
  const br = board().getBoundingClientRect();
  const px = e.clientX - br.left - drag.offX;
  const py = e.clientY - br.top - drag.offY;
  drag.el.style.transform = `translate3d(${px}px,${py}px,0)`;
  // pixels  -> grid
  const gx = Math.max(0, Math.min(cols() - drag.it.w, Math.round(px / (cw + GAP))));
  const gy = Math.max(0, Math.round(py / (RH + GAP)));
  if (gx !== drag.it.x || gy !== drag.it.y) {
    drag.it.x = gx; drag.it.y = gy;
    pushDown(items(), drag.it);
    compact(drag.k);
    renderLayout();
  }
  showPh(drag.it, cw);
  // Auto-scroll at edge
  const vy = e.clientY;
  if (vy < 90) window.scrollBy(0, -14);
  else if (vy > window.innerHeight - 90) window.scrollBy(0, 14);
}

function dragEnd() {
  if (!drag) return;
  const d = drag; drag = null;
  clearTimeout(d.timer);
  d.el.classList.remove('dragging');
  document.body.classList.remove('dragging-on');
  hidePh();
  if (d.moved) {
    manual();
    compact();
    applyLayout();
    toast(`[${wname(d.k)}]Placed at (تم الوضع في) ${d.it.x + 1} columns (أعمدة) / ${d.it.y + 1} rows (صفوف)`, 'ok');
  } else {
    renderLayout();
  }
}

/* --- Resize at edge  --- */
function resizeStart(e) {
  if (!editing || e.button > 0) return;
  const h = e.target.closest('.wr');
  if (!h) return;
  const el = h.closest('[data-widget]');
  if (!el || el.parentElement !== board()) return;
  e.preventDefault(); e.stopPropagation();
  const k = el.dataset.widget;
  manual();
  rsz = {k, el, dir: h.dataset.dir, it: itemOf(k), x: e.clientX, y: e.clientY, ev: null};
  el.classList.add('resizing');
  try { h.setPointerCapture && h.setPointerCapture(e.pointerId); } catch (err) {}
}
function resizeMove(e) {
  if (!rsz) return;
  rsz.ev = e;
  if (!rafPending) { rafPending = true; requestAnimationFrame(resizeFrame); }
}
function resizeFrame() {
  rafPending = false;
  if (!rsz || !rsz.ev) return;
  const e = rsz.ev, cw = colW(), mn = minSize(rsz.k);
  const br = board().getBoundingClientRect();
  let changed = false;
  if (rsz.dir !== 's') {
    const w = Math.max(mn.w, Math.min(cols() - rsz.it.x,
      Math.round((e.clientX - br.left - rsz.it.x * (cw + GAP) + GAP) / (cw + GAP))));
    if (w !== rsz.it.w) { rsz.it.w = w; changed = true; }
  }
  if (rsz.dir !== 'e') {
    const h = Math.max(mn.h, Math.min(60,
      Math.round((e.clientY - br.top - rsz.it.y * (RH + GAP) + GAP) / (RH + GAP))));
    if (h !== rsz.it.h) { rsz.it.h = h; changed = true; }
  }
  if (changed) {
    pushDown(items(), rsz.it);
    compact(rsz.k);
    renderLayout();
    showPh(rsz.it, cw);
  }
}
function resizeEnd() {
  if (!rsz) return;
  const r = rsz; rsz = null;
  r.el.classList.remove('resizing');
  hidePh();
  manual();
  compact();
  applyLayout();
  toast(`[${wname(r.k)}]${r.it.w}columns (أعمدة) × ${r.it.h}rows (صفوف)`, 'ok');
}

document.addEventListener('pointerdown', resizeStart, true);
document.addEventListener('pointerdown', dragStart);
document.addEventListener('pointermove', e => { resizeMove(e); dragMove(e); });
document.addEventListener('pointerup', () => { resizeEnd(); dragEnd(); });
document.addEventListener('pointercancel', () => { resizeEnd(); dragEnd(); });

let bpTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(bpTimer);
  bpTimer = setTimeout(() => {
    const nb = bpFor(window.innerWidth);
    if (nb !== BP) { BP = nb; ensureWx(); compact(); applyLayout(); }
    else renderLayout();
  }, 120);
});

/* ---------- Rendering ---------- */
function visible() {
  const q = $('#q').value.trim().toLowerCase();
  return accounts.filter(a => {
    if (filter && a.status !== filter) return false;
    if (quickFilter === 'noauth' && a.authorized) return false;
    if (quickFilter === 'has2fa' && a.has_2fa !== 1) return false;
    if (quickFilter === 'nosaved2fa' && !(a.has_2fa === 1 && !a.has_twofa_saved && !a.twofa)) return false;
    if (quickFilter === 'noproxy' && a.proxy) return false;
    if (!q) return true;
    return [a.label, a.phone, a.username, (a.tags || []).join(',')].join(' ').toLowerCase().includes(q);
  });
}

const twofaShown = new Set();
let quickFilter = '';  // '' | noauth | has2fa | nosaved2fa | noproxy

function twofaMask(pwd) {
  const n = Math.min(Math.max((pwd || '').length, 4), 16);
  return '*'.repeat(n);
}
function twofaCell(a) {
  if (a.has_2fa !== 1) {
    if (a.has_2fa === 0) return '<span class="muted">-</span>';
    return '<span class="muted" title="Not checked yet; click “Check” to sync 2FA status (لم يتم الفحص بعد؛ انقر «فحص» لمزامنة حالة 2FA)">-</span>';
  }
  const saved = !!(a.has_twofa_saved || a.twofa);
  if (!saved) {
    return `<span class="twofa-miss" title="2FA is enabled; password is not saved here. Click to add it locally (التحقق بخطوتين مفعّل؛ كلمة المرور غير محفوظة هنا. انقر لإضافتها محليًا)"
      onclick="promptSaveTwofa(${a.id}, event)">2FA · Not saved (2FA · غير محفوظ)</span>`;
  }
  const pwd = a.twofa || '';
  const shown = twofaShown.has(a.id) && pwd;
  const text = shown ? esc(pwd) : twofaMask(pwd || '******');
  const eye = shown ? '🙈' : '👁';
  const tip = shown ? 'Hide password (إخفاء كلمة المرور)' : 'Show password (إظهار كلمة المرور)';
  return `<span class="twofa-wrap">` +
    `<code class="twofa-text" id="t2fa_${a.id}">${text}</code>` +
    `<button type="button" class="twofa-eye" title="${tip}" aria-label="${tip}" ` +
    `onclick="toggleTwofa(${a.id}, event)">${eye}</button></span>`;
}
async function toggleTwofa(id, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  const a = accounts.find(x => x.id === id);
  const el = document.getElementById('t2fa_' + id);
  if (!a || !el) return;
  const btn = el.parentElement && el.parentElement.querySelector('.twofa-eye');
  if (twofaShown.has(id) && a.twofa) {
    twofaShown.delete(id);
    el.textContent = twofaMask(a.twofa);
    if (btn) { btn.textContent = '👁'; btn.title = 'Show password (إظهار كلمة المرور)'; }
    return;
  }
  // Decrypt from the backend on demand; the list API no longer sends plaintext
  if (!a.twofa) {
    try {
      if (DEMO) {
        a.twofa = a.twofa || 'Demo2fa!';
      } else {
        const r = await api('/api/accounts/' + id + '/twofa');
        a.twofa = r.twofa || '';
        a.has_twofa_saved = !!r.saved;
      }
    } catch (e) {
      toast('Cannot read 2FA: ' + e.message + ' (تعذر قراءة 2FA: ' + e.message + ')', 'err');
      return;
    }
    if (!a.twofa) {
      toast('No 2FA password is saved in the library; click “2FA · Not saved” to add it or change it in the Toolbox (لا توجد كلمة مرور 2FA محفوظة في المكتبة؛ انقر «2FA · غير محفوظ» لإضافتها أو غيّرها من صندوق الأدوات)', 'err');
      return;
    }
  }
  twofaShown.add(id);
  el.textContent = a.twofa;
  if (btn) { btn.textContent = '🙈'; btn.title = 'Hide password (إخفاء كلمة المرور)'; }
}
async function promptSaveTwofa(id, ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  const pwd = await uiPrompt({
    title: 'Add 2FA Password (إضافة كلمة مرور 2FA)',
    message: 'Save only in this tool (encrypted in the library); this does not change Telegram’s cloud password. Leave empty to cancel. (احفظها في هذه الأداة فقط (مشفرًا في المكتبة)؛ لا يغيّر ذلك كلمة مرور تيليجرام السحابية. اتركه فارغًا للإلغاء.)',
    label: '2FA Password (كلمة مرور 2FA)',
    password: true,
    placeholder: 'Enter the current cloud password to export a pack (أدخل كلمة المرور السحابية الحالية لتصدير حزمة)',
  });
  if (pwd === null || !String(pwd).trim()) return;
  try {
    if (DEMO) {
      const a = accounts.find(x => x.id === id);
      if (a) { a.twofa = String(pwd).trim(); a.has_twofa_saved = true; a.has_2fa = 1; }
      toast('Demo mode: sample data was written (الوضع التجريبي: تمت كتابة بيانات نموذجية)', 'ok');
      render();
      return;
    }
    await api('/api/accounts/' + id + '/twofa', {
      method: 'POST', body: JSON.stringify({password: String(pwd).trim()})
    });
    toast('2FA password saved encrypted (تم حفظ كلمة مرور 2FA مشفرة)', 'ok');
    refresh();
  } catch (e) {
    toast('Save failed (فشل الحفظ): ' + e.message, 'err');
  }
}

/** Extract successful results from the bulk result and summarize failures for a quick glance. */
function batchSummary(r) {
  if (!r || typeof r !== 'object') return '';
  if (typeof r.ok === 'number' && typeof r.total === 'number') {
    const fail = r.failed != null ? r.failed : (r.total - r.ok);
    let s = `Succeeded (نجح) ${r.ok} / total (إجمالي) ${r.total}` + (fail ? `, failed (، فشل) ${fail}` : '');
    if (Array.isArray(r.results)) {
      const bad = r.results.filter(x => x && x.ok === false).slice(0, 5);
      if (bad.length) {
        s += '\nFailure summary (ملخص الفشل): ' + bad.map(x => {
          const id = x.id != null ? x.id : x.account_id;
          const err = x.error || x.detail || x.message || 'Failed (فشل)';
          return `#${id} ${err}`;
        }).join('; ');
      }
    }
    return s;
  }
  if (Array.isArray(r.results)) {
    const ok = r.results.filter(x => x && x.ok !== false).length;
    const total = r.results.length;
    return `Done (تم) ${ok}/${total}`;
  }
  return '';
}


function clearFilters() {
  filter = '';
  quickFilter = '';
  const q = $('#q');
  if (q) q.value = '';
  render();
}
function emptyRowHtml() {
  let inner;
  if (accounts.length === 0) {
    inner = '<div>No accounts yet (لا توجد حسابات بعد)</div>'
      + '<div class="empty-actions">'
      + "<button class=\"fit\" onclick=\"openModal('mTdata')\">Import (استيراد) tdata</button>"
      + "<button class=\"fit\" onclick=\"openModal('mSession')\">Import (استيراد) session</button>"
      + "<button class=\"fit\" onclick=\"openModal('mImport')\">Phone list (قائمة أرقام الهاتف)</button>"
      + "<button class=\"fit\" onclick=\"openModal('mAdd')\">Add manually (إضافة يدويًا)</button>"
      + '</div>'
      + '<div class="empty-hint">After importing, first run (بعد الاستيراد، شغّل أولًا) “Health Check (فحص الحالة)” to sync status and 2FA, then warm up the account or change 2FA (لمزامنة الحالة و2FA، ثم هيّئ الحساب أو غيّر 2FA)</div>';
  } else if (quickFilter || filter || ($('#q') && $('#q').value)) {
    inner = 'No accounts match the filters (لا توجد حسابات مطابقة للفلاتر) <button class="sm" onclick="clearFilters()">Clear filters (مسح الفلاتر)</button>';
  } else {
    inner = 'No accounts match the filters (لا توجد حسابات مطابقة للفلاتر)';
  }
  return '<tr><td colspan="12"><div class="empty">' + inner + '</div></td></tr>';
}

function setQuickFilter(k) {
  quickFilter = (quickFilter === k) ? '' : k;
  render();
}

function render() {
  renderStats();

  const counts = stats.by_status || {};
  $('#chips').innerHTML = [['', 'All (الكل)']].concat(Object.keys(counts).map(k => [k, `${k} ${counts[k]}`]))
    .map(([k, t]) => `<button class="chip${filter === k ? ' on' : ''}" onclick="setFilter('${k}')">${esc(t)}</button>`).join('');
  const qf = [
    ['noauth', 'Unauthorized (غير مفوض)'],
    ['has2fa', 'Has 2FA (لديه 2FA)'],
    ['nosaved2fa', '2FA not saved (2FA غير محفوظ)'],
    ['noproxy', 'No proxy (بلا وكيل)'],
  ];
  const qfe = $('#qfilters');
  if (qfe) qfe.innerHTML = qf.map(([k, lab]) =>
    `<button class="chip${quickFilter === k ? ' on' : ''}" onclick="setQuickFilter('${k}')">${lab}</button>`
  ).join('');

  const rows = visible();
  $('#tb').innerHTML = rows.length ? rows.map(a => `
    <tr class="${sel.has(a.id) ? 'sel' : ''}" onclick="openDrawer(${a.id})">
      <td onclick="event.stopPropagation()"><input type="checkbox" style="width:16px;min-height:0" ${sel.has(a.id) ? 'checked' : ''} onclick="pick(${a.id},this.checked)" /></td>
      <td><b>${esc(a.label)}</b></td>
      <td>${esc(fmtPhone(a.phone))}</td>
      <td class="hide-s">${esc(countryOf(a.phone))}</td>
      <td class="hide-s">${a.username ? '@' + esc(a.username) : '—'}</td>
      <td><span class="tag s-${esc(a.status)}">${esc(a.status)}</span>${a.premium ? ' <span class="tag">Premium</span>' : ''}${a.spam_until && a.spam_until * 1000 > Date.now() ? ' <span class="tag s-restricted">spam</span>' : ''}</td>
      <td class="hide-s" onclick="event.stopPropagation()">${twofaCell(a)}</td>
      <td class="hide-s">${a.proxy ? 'Configured (مضبوط)' : '<span class="muted">Direct (اتصال مباشر)</span>'}</td>
      <td class="hide-s">${a.code_url ? '✓' : '—'}</td>
      <td class="hide-s">${(a.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(' ') || '—'}</td>
      <td class="hide-s muted">${esc(kickCell(a))}</td>
      <td onclick="event.stopPropagation()">
        ${a.authorized ? '' : `<button class="sm write" onclick="startLogin(${a.id})">Log In (تسجيل الدخول)</button>`}
        <button class="sm write fit" onclick="startQrLogin(${a.id})" title="Authorize by scanning with Telegram on your phone (فوّض بالمسح عبر تيليجرام على هاتفك)">QR Login (تسجيل الدخول عبر QR)</button>
        <button class="sm" onclick="check(${a.id})">Check (فحص)</button>
      </td>
    </tr>`).join('') : emptyRowHtml();

  $('#selN').textContent = `Selected ${sel.size} item (عنصر)`;
  $('#bulk').classList.toggle('on', sel.size > 0);
  $('#all').checked = rows.length > 0 && rows.every(a => sel.has(a.id));
  if (readonly) document.querySelectorAll('.write').forEach(b => b.disabled = true);
  ensureWx();
  applyLayout();
}

function renderStats() {
  const b = board(); if (!b) return;
  const keys = ['total'].concat(Object.keys(stats.by_status || {})).map(k => 'stat:' + k);
  [...b.children].forEach(n => {
    const k = n.dataset.widget;
    if (k && k.indexOf('stat:') === 0 && keys.indexOf(k) < 0) n.remove();
  });
  keys.slice().reverse().forEach(k => {
    const t = k.slice(5);
    const v = t === 'total' ? (stats.total || 0) : (stats.by_status || {})[t];
    let el = b.querySelector(`[data-widget="${k}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'card stat';
      el.dataset.widget = k;
      b.appendChild(el);
    }
    setInner(el, `<b>${v || 0}</b><span>${esc(wname(k).replace('Statistics (الإحصاءات) · ', ''))}</span>`);
  });
}
function setFilter(k) { filter = k; render(); }
function pick(id, on) { on ? sel.add(id) : sel.delete(id); render(); }
function toggleAll(on) { visible().forEach(a => on ? sel.add(a.id) : sel.delete(a.id)); render(); }
function clearSel() { sel.clear(); render(); }

/* ---------- Details drawer  ---------- */
function openDrawer(id) {
  const a = accounts.find(x => x.id === id);
  if (!a) return;
  closeAll();
  $('#dTitle').textContent = a.label;
  $('#dBody').innerHTML = `
    <div class="kv">
      <span>ID</span><div>${a.id}</div>
      <span>status (الحالة)</span><div><span class="tag s-${esc(a.status)}">${esc(a.status)}</span> ${a.authorized ? 'Authorized (مفوّض)' : '<span class="muted">Unauthorized (غير مفوض)</span>'}${a.premium ? ' · Premium' : ''}</div>
      <span>2FA (2FA)</span><div>${
        a.has_2fa === 1
          ? (a.twofa || a.has_twofa_saved
              ? ('enabled (مفعّل)' + (a.twofa ? (' · <code>' + esc(a.twofa) + '</code>') : ' · saved (محفوظ) (click the eye in the list to view it (انقر العين في القائمة لعرضها))'))
              : 'enabled (مفعّل) · <a href="#" onclick="promptSaveTwofa(' + a.id + ', event);return false">Add password (إضافة كلمة المرور)</a>')
          : (a.has_2fa === 0 ? '-' : 'Unknown (غير معروف) · click Check to sync (انقر فحص للمزامنة)')
      }</div>
      <span>Phone Number (رقم الهاتف)</span><div>${esc(fmtPhone(a.phone))}</div>
      <span>Country/Region (الدولة/المنطقة)</span><div>${esc(countryOf(a.phone))}</div>
      <span>Local Takeover (الاستلام المحلي)</span><div>${a.adopted_at ? esc(fmt(a.adopted_at)) + ' (' + esc(rel(a.adopted_at)) + ')' : '<span class=\'muted\'>Not recorded (غير مسجل)</span>'}</div>
      <span>Session Created (إنشاء الجلسة)</span><div>${a.login_at ? esc(fmt(a.login_at)) + ' (' + esc(rel(a.login_at)) + ')<span class="muted"> · server (الخادم) date_created, for reference only (، للمرجع فقط)</span>' : '<span class=\'muted\'>Not recorded; click (غير مسجل؛ انقر)“View Devices (عرض الأجهزة)”can fetch from (يمكن جلبه من) Telegram load (تحميل)</span>'}</div>
      <span>Username (اسم المستخدم)</span><div>${a.username ? '@' + esc(a.username) : '—'}</div>
    </div>
    <label class="f"><span>Alias (الاسم المستعار)</span><input id="eLabel" value="${esc(a.label)}" /></label>
    <label class="f"><span>Phone Number (رقم الهاتف)</span><input id="ePhone" value="${esc(a.phone || '')}" /></label>
    <label class="f"><span>Proxy (الوكيل)</span><input id="eProxy" value="${esc(a.proxy || '')}" placeholder="socks5://host:1080" /></label>
    <label class="f"><span>Code Link (رابط الرمز)</span><input id="eCode" value="${esc(a.code_url || '')}" /></label>
    <div class="row" style="gap:8px;margin:-6px 0 12px;align-items:center">
      <button type="button" class="sm fit" id="eCodeTest" onclick="testCodeSource('eCode','eProxy','eCodeStatus')">Test Code Link (اختبار رابط الرمز)</button>
      <span class="muted" id="eCodeStatus">Read-only test; does not send a Telegram verification code (اختبار للقراءة فقط؛ لا يرسل رمز تحقق تيليجرام)</span>
    </div>
    <label class="f"><span>Tags (comma-separated) (الوسوم (مفصولة بفواصل))</span><input id="eTags" value="${esc((a.tags || []).join(','))}" /></label>
    <div class="f">
      <span class="lbl">Automatic Device Cleanup (تنظيف الأجهزة تلقائيًا)</span>
      <label class="row" style="gap:8px;cursor:pointer">
        <input type="checkbox" id="eKick" style="width:16px;min-height:0;flex:0 0 auto" ${a.auto_kick ? 'checked' : ''} />
        <span class="muted" style="flex:1">Participate in automatic kicks of other devices (المشاركة في طرد الأجهزة الأخرى تلقائيًا) · ${esc(kickHint(a))}</span>
      </label>
    </div>
    <label class="f"><span>Device-cleanup interval (hours) (فترة تنظيف الأجهزة (بالساعات))</span>
      <input id="eKickHours" type="number" min="0" step="0.5" placeholder="Leave empty = use the global ${kick.hours||24} hours (اتركه فارغًا = استخدم ${kick.hours||24} ساعة العامة)"
        value="${a.auto_kick_hours != null && a.auto_kick_hours !== '' ? esc(String(a.auto_kick_hours)) : ''}" />
    </label>
    <div class="f">
      <span class="lbl">Loop device cleanup (تكرار تنظيف الأجهزة)</span>
      <label class="row" style="gap:8px;cursor:pointer">
        <input type="checkbox" id="eKickLoop" style="width:16px;min-height:0;flex:0 0 auto" ${(a.auto_kick_loop == null || a.auto_kick_loop) ? 'checked' : ''} />
        <span class="muted" style="flex:1">When enabled, start the interval after a successful kick; when disabled, kick only once (عند التفعيل يبدأ الفاصل بعد الطرد الناجح؛ وعند التعطيل يتم الطرد مرة واحدة فقط)</span>
      </label>
    </div>
    <div class="row" style="margin-bottom:20px">
      <button class="primary write fit" onclick="saveAccount(${a.id})">Save Changes (حفظ التغييرات)</button>
      <button class="fit" onclick="check(${a.id})">Health Check (فحص الحالة)</button>
      <button class="fit write" onclick="spamCheck(${a.id})">Restriction Check (فحص القيود)</button>
      <button class="fit" onclick="twofaStatus(${a.id})" title="Whether there is a cloud password, recovery email, and reset wait (وجود كلمة مرور سحابية وبريد استرداد وفترة انتظار إعادة الضبط)">2FA Status (حالة التحقق بخطوتين)</button>
      <button class="fit" onclick="devices(${a.id})">View Devices (عرض الأجهزة)</button>
      <button class="fit" onclick="dialogs(${a.id})">Recent Sessions (الجلسات الأخيرة)</button>
    </div>
    <div class="row" style="margin-bottom:8px;flex-wrap:wrap;gap:6px">
      <button class="danger write fit" onclick="twofaReset(${a.id})" title="Start an official 2FA reset (بدء إعادة ضبط 2FA الرسمية) (usually a 7-day waiting period (عادة فترة انتظار 7 أيام))">Start 2FA Reset (بدء إعادة ضبط 2FA)</button>
      <button class="write fit" onclick="twofaResetCancel(${a.id})" title="Cancel the ongoing 2FA reset wait (إلغاء انتظار إعادة ضبط 2FA الجاري)">Cancel 2FA Reset (إلغاء إعادة ضبط 2FA)</button>
      <button class="write fit" onclick="exportAcc(${a.id},'string')" title="Show/copy StringSession text (عرض/نسخ نص StringSession)">Export StringSession (تصدير StringSession)</button>
      <button class="write fit" onclick="exportAcc(${a.id},'session')" title="Download Telethon .session file (تنزيل ملف Telethon .session)">Export .session (تصدير .session)</button>
      <button class="write fit" onclick="exportAcc(${a.id},'pack')" title="Download session+json pack zip (تنزيل حزمة zip من session+json)">Export Pack (تصدير حزمة) zip</button>
      <button class="write fit" onclick="exportAcc(${a.id},'tdata')" title="Download Telegram Desktop tdata zip (opentele must be installed on the server) (تنزيل zip لـ Telegram Desktop tdata (يجب تثبيت opentele على الخادم))">Export tdata (تصدير tdata)</button>
      <button class="danger write fit" onclick="regenSession(${a.id})" title="Log in with a new device fingerprint; invalidate the old session (anti-recovery) (تسجيل الدخول ببصمة جهاز جديدة؛ إبطال الجلسة القديمة (منع الاسترداد))">Regenerate Session (إعادة إنشاء الجلسة)</button>
    </div>
    <div class="row">
      ${a.authorized ? '' : `<button class="write fit" onclick="startLogin(${a.id})">Log In (تسجيل الدخول)</button>`}
      <button class="write fit" onclick="startQrLogin(${a.id})" title="phone (الهاتف) Telegram scan to authorize; no SMS needed (امسح للتفويض؛ لا حاجة إلى SMS)">QR Login (تسجيل الدخول عبر QR)</button>
      <button class="write fit" onclick="terminate(${a.id})">Clear Other Devices (مسح الأجهزة الأخرى)</button>
      <button class="write fit" onclick="logout(${a.id})">Log Out (تسجيل الخروج)</button>
      <button class="fit danger write" onclick="deleteTelegram(${a.id})">Delete Telegram Account (حذف حساب تيليجرام)</button>
      <button class="danger write fit" onclick="delAccount(${a.id})">Delete Account (حذف الحساب)</button>
    </div>
    <h2 style="font-size:14px;margin:20px 0 8px">This account’s log (سجل هذا الحساب)</h2>
    <pre id="dLog" style="max-height:320px">Loading… (جارٍ التحميل…)</pre>`;
  $('#drawer').classList.add('on'); $('#bd').classList.add('on');
  if (readonly) document.querySelectorAll('.write').forEach(b => b.disabled = true);
  api(`/api/logs?account_id=${id}&limit=20`)
    .then(l => $('#dLog').textContent = (l.length ? logLines(l) : 'No logs yet (لا توجد سجلات بعد)'))
    .catch(e => $('#dLog').textContent = String(e));
}

/* ---------- Actions ---------- */
async function guard(fn, okMsg) {
  // Any result triggered by the user locks the log area,
  // Otherwise, the following refresh -> loadLogs will overwrite it (that is, it will flash and disappear).
  try {
    const r = await fn();
    out(r, true);
    const sum = batchSummary(r);
    if (sum) toast((okMsg ? okMsg + ' · ' : '') + sum.replace(/\n/g, ' '), 'ok');
    else if (okMsg) toast(okMsg, 'ok');
    refresh();
    return r;
  } catch (e) {
    toast('failed (فشل): ' + e.message, 'err');
    out({error: String(e)}, true);
  }
}
const addAccount = () => guard(async () => {
  const r = await api('/api/accounts', {method:'POST', body: JSON.stringify({
    label: $('#aLabel').value, phone: $('#aPhone').value || null,
    proxy: $('#aProxy').value || null,
    tags: $('#aTags').value ? $('#aTags').value.split(',').map(s => s.trim()) : []})});
  if ($('#aCode').value) await api(`/api/accounts/${r.id}`, {method:'PATCH', body: JSON.stringify({code_url: $('#aCode').value})});
  ['#aLabel','#aPhone','#aCode','#aProxy','#aTags'].forEach(s => $(s).value = '');
  closeAll(); return r;
}, 'Account added (تمت إضافة الحساب)');

const saveAccount = id => guard(async () => {
  const hoursRaw = ($('#eKickHours') && $('#eKickHours').value || '').trim();
  let auto_kick_hours = null;
  if (hoursRaw !== '') {
    const n = parseFloat(hoursRaw);
    if (!Number.isFinite(n) || n < 0) throw new Error('Device-cleanup interval must be a non-negative number (يجب أن تكون فترة تنظيف الأجهزة رقمًا غير سالب) (hours (ساعات))');
    auto_kick_hours = n === 0 ? null : n;
  }
  const r = await api(`/api/accounts/${id}`, {method:'PATCH', body: JSON.stringify({
    label: $('#eLabel').value, phone: $('#ePhone').value || null,
    proxy: $('#eProxy').value || null, code_url: $('#eCode').value || null,
    auto_kick: $('#eKick').checked ? 1 : 0,
    auto_kick_loop: ($('#eKickLoop') && $('#eKickLoop').checked) ? 1 : 0,
    auto_kick_hours: auto_kick_hours,
    tags: $('#eTags').value ? $('#eTags').value.split(',').map(s => s.trim()) : []})});
  closeAll(); return r;
}, 'saved (محفوظ)');

function codeProbeSummary(r) {
  const type = {json: 'JSON', html: 'HTML', text: 'Plain text (نص عادي)'}[r.response_type] || r.response_type;
  return `${r.provider_label} · ${type} · ${r.code_present ? 'A verification code is currently detected (تم اكتشاف رمز تحقق حاليًا)' : 'No verification code is currently available (لا يوجد رمز تحقق حاليًا)'}`
    + (r.requires_prepare ? ' · Monitoring starts first during login (تبدأ المراقبة أولًا أثناء تسجيل الدخول)' : '');
}

async function testCodeSource(urlId, proxyId, statusId, explicitUrl) {
  const urlEl = $('#' + urlId);
  const proxyEl = proxyId ? $('#' + proxyId) : null;
  const status = $('#' + statusId);
  const url = (explicitUrl || (urlEl && urlEl.value) || '').trim();
  if (!url) {
    if (status) status.textContent = 'Please enter a code link first (يرجى إدخال رابط الرمز أولًا)';
    toast('Please enter a code link first (يرجى إدخال رابط الرمز أولًا)', 'err');
    return null;
  }
  if (status) status.textContent = 'Running a read-only probe (جارٍ إجراء فحص للقراءة فقط)…';
  try {
    const r = await api('/api/code-sources/probe', {
      method: 'POST',
      body: JSON.stringify({url, proxy: (proxyEl && proxyEl.value) || null, timeout: 15}),
    });
    const summary = codeProbeSummary(r);
    if (status) status.textContent = summary;
    toast('Code link is accessible (رابط الرمز قابل للوصول): ' + summary, 'ok');
    return r;
  } catch (e) {
    if (status) status.textContent = 'Probe failed (فشل الفحص): ' + e.message;
    toast('Code-link probe failed (فشل فحص رابط الرمز): ' + e.message, 'err');
    return null;
  }
}


const check = id => guard(() => api(`/api/accounts/${id}/check`, {method:'POST'}), 'Check complete (اكتمل الفحص)');

async function twofaStatus(id) {
  return guard(() => api('/api/accounts/' + id + '/toolbox/twofa_status', {
    method: 'POST', body: JSON.stringify({params: {}})
  }), '2FA status queried (تم الاستعلام عن حالة 2FA)');
}
async function twofaReset(id) {
  if (!confirm('Confirm starting a 2FA reset for this account? (أكد بدء إعادة ضبط 2FA لهذا الحساب؟)\nThis enters the official waiting period of 7 days, after which the cloud password expires. (سيدخل ذلك فترة الانتظار الرسمية لمدة 7 أيام، وبعدها تنتهي كلمة المرور السحابية.)\nIf a recovery email is linked, the original owner may still recover it by email. (إذا كان بريد استرداد مرتبطًا، فقد يستعيده المالك الأصلي عبر البريد.)')) return;
  return guard(() => api('/api/accounts/' + id + '/toolbox/twofa_reset', {
    method: 'POST', body: JSON.stringify({params: {confirm: true}})
  }), 'Submitted (تم الإرسال) 2FA reset (إعادة ضبط)');
}
async function twofaResetCancel(id) {
  if (!confirm('Confirm canceling this account’s ongoing (أكد إلغاء الجاري لهذا الحساب) 2FA reset wait (انتظار إعادة الضبط)?')) return;
  return guard(() => api('/api/accounts/' + id + '/toolbox/twofa_reset_cancel', {
    method: 'POST', body: JSON.stringify({params: {confirm: true}})
  }), 'done cancel (تم إلغاء) 2FA reset (إعادة ضبط)');
}

const devices = id => guard(() => api(`/api/accounts/${id}/devices`));
const dialogs = id => guard(() => api(`/api/accounts/${id}/dialogs?limit=20`));
const terminate = async id => { if (!await uiConfirm({title:'Kick other devices (طرد الأجهزة الأخرى)', message:'This will kick all other logged-in devices, keeping only this session. (سيطرد كل الأجهزة المسجلة الأخرى، مع إبقاء هذه الجلسة فقط.)', danger:true, okText:'Kick out (طرد)'})) return; return guard(async () => {
  const r = await api(`/api/accounts/${id}/devices/terminate`, {method:'POST'});
  // The server kicks first, then reloads the session list for verification; this directly reports whether devices were really kicked.
  if (r && r.verified === false)
    toast('Verification failed (فشل التحقق): remaining (المتبقي) ' + (r.after_others || 0) + '  external sessions ( جلسات خارجية)'
      + (r.error ? ' (' + r.error + ')' : '') + (r.reappeared && r.reappeared.length ? ', a device may log in again after being kicked (، قد يسجل جهاز الدخول مجددًا بعد طرده)' : ''), 'err');
  else if (r && r.verified)
    toast('Verified (تم التحقق): Kicked (تم الطرد) ' + ((r.removed || []).length) + ' ; only this device remains (؛ لم يبق إلا هذا الجهاز)', 'ok');
  refresh(); return r;
}, 'Cleanup executed (تم تنفيذ التنظيف)'); };
const logout = async id => { if (!await uiConfirm({title:'Log Out (تسجيل الخروج)', message:'Logging out requires code login again. Confirm (يتطلب تسجيل الخروج تسجيل الدخول بالرمز مجددًا. أكد)?', danger:true, okText:'log out (تسجيل الخروج)'})) return; return guard(() => api(`/api/accounts/${id}/logout`, {method:'POST'}), 'Logged out (تم تسجيل الخروج)'); };
const delAccount = async id => { if (!await uiConfirmDanger({title:'Delete Local Records (حذف السجلات المحلية)', message:'Delete this local record; the Telegram account itself is not affected, but the session stored in this tool cannot be recovered. (احذف هذا السجل المحلي؛ لن يتأثر حساب تيليجرام نفسه، لكن لا يمكن استرداد الجلسة المخزنة في هذه الأداة.)', word:'confirm'})) return; return guard(async () => { const r = await api(`/api/accounts/${id}`, {method:'DELETE'}); closeAll(); sel.delete(id); return r; }, 'Deleted (تم الحذف)'); };

/* ---------- Export session  (sensitive : will decrypt the local session ) ---------- */
function _exportAuthHeaders() {
  const h = {};
  const tok = ($('#token') && $('#token').value) || localStorage.getItem('tam_token') || '';
  if (tok) h['Authorization'] = 'Bearer ' + tok;
  return h;
}

async function _downloadBlob(path, body, fallbackName) {
  const res = await fetch(path, {
    method: 'POST',
    headers: Object.assign({'Content-Type': 'application/json'}, _exportAuthHeaders()),
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try { msg = (JSON.parse(raw).detail) || raw; } catch (_) {}
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  const disp = res.headers.get('Content-Disposition') || '';
  let name = fallbackName;
  const m = /filename="?([^";]+)"?/i.exec(disp);
  if (m) name = m[1];
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  return name;
}

async function exportAcc(id, fmt) {
  fmt = fmt || 'pack';
  let msg = 'This will export this account’s session file (سيتم تصدير ملف جلسة هذا الحساب). The session is sensitive. Continue? (الجلسة حساسة. هل تتابع؟)';
  if (fmt === 'string') msg = 'This will decrypt and display this account’s StringSession. A session is equivalent to login credentials; do not disclose it. Continue? (سيفك تشفير StringSession لهذا الحساب ويعرضه. الجلسة تعادل بيانات تسجيل الدخول؛ لا تفصح عنها. هل تتابع؟)';
  else if (fmt === 'tdata') msg = 'Export tdata. The server must have opentele, and the session must be valid. Continue? (تصدير tdata. يجب أن يحتوي الخادم على opentele، وأن تكون الجلسة صالحة. هل تتابع؟)';
  else if (fmt === 'pack') msg = 'This will export a session+json account-pack zip (سيتم تصدير zip لحزمة حساب session+json). ' + exportTwofaHint(id).replace(' · ', '') + '\nContinue? (هل تتابع؟)';
  if (!await uiConfirm({title: 'Export confirmation (تأكيد التصدير)', message: msg, danger: true, okText: 'export (تصدير)'})) return;
  try {
    progress(true);
    if (fmt === 'string') {
      const r = await api('/api/accounts/' + id + '/export', {
        method: 'POST', body: JSON.stringify({format: 'string'})});
      out(r, true);
      const sess = r.session || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(sess);
          toast('StringSession Copied to clipboard (تم النسخ إلى الحافظة)', 'ok');
        } else {
          toast('StringSession exported (تم تصدير StringSession); see the log below (راجع السجل أدناه)', 'ok');
        }
      } catch (_) {
        toast('StringSession exported (تم تصدير StringSession); see the log below. If copying fails, select it manually (راجع السجل أدناه؛ إذا فشل النسخ فحدده يدويًا)', 'ok');
      }
    } else {
      const name = await _downloadBlob(
        '/api/accounts/' + id + '/export',
        {format: fmt},
        fmt === 'session' ? ('account-' + id + '.session')
          : (fmt === 'tdata' ? ('account-' + id + '-tdata.zip') : ('account-' + id + '.zip'))
      );
      toast('Download complete: ' + name + ' (اكتمل التنزيل: ' + name + ')' + exportTwofaHint(id), 'ok');
    }
  } catch (e) {
    const msg = String(e.message || e);
    out({error: msg}, true);
    if (fmt === 'tdata' && /opentele/i.test(msg)) {
      const go = await uiConfirm({
        title: 'Installation required (التثبيت مطلوب) opentele',
        message: 'The opentele dependency is required for tdata export. (تصدير tdata يتطلب تبعية opentele.)\n\n' + msg +
          '\n\nInstall it now with one click? (هل تثبته الآن بنقرة واحدة؟)? (pip install opentele, it may take (، قد يستغرق) 1–2 minutes (دقائق))',
        okText: 'Install now (التثبيت الآن)',
        danger: false,
      });
      if (go) {
        try {
          progress(true);
          const r = await api('/api/system/install-opentele', {method: 'POST', body: '{}'});
          toast(r.message || 'Installation complete (اكتمل التثبيت)', 'ok');
          out(r, true);
          if (r.installed && await uiConfirm({title: 'Installation succeeded (نجح التثبيت)', message: 'Export again now? (هل تصدّر مجددًا الآن؟) tdata?', okText: 'Export again (إعادة التصدير)'})) {
            progress(false);
            return exportAcc(id, 'tdata');
          }
        } catch (e2) {
          toast('install failed (تثبيت فشل): ' + e2.message, 'err');
          out({error: String(e2)}, true);
        }
      }
    } else {
      toast('Export failed: ' + msg + ' (فشل التصدير: ' + msg + ')', 'err');
    }
  } finally {
    progress(false);
  }
}

async function bulkExport(fmt) {
  fmt = fmt || 'pack';
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  const msg = 'This will export the selected ' + ids.length + ' account sessions as a zip (سيتم تصدير جلسات الحسابات المحددة وعددها ' + ids.length + ' في zip). '
    + exportTwofaHint(ids) + '\nContinue? (هل تتابع؟)';
  if (!await uiConfirm({title: 'Bulk export (تصدير جماعي)', message: msg, danger: true, okText: 'export (تصدير)'})) return;
  try {
    progress(true);
    const name = await _downloadBlob(
      '/api/accounts/export',
      {ids: ids, format: fmt},
      'accounts-export.zip'
    );
    toast('Downloaded ' + name + ' (' + ids.length + ' items) (تم تنزيل ' + name + ' (' + ids.length + ' عناصر))' + exportTwofaHint(ids), 'ok');
  } catch (e) {
    toast('Bulk export failed (فشل التصدير الجماعي): ' + e.message, 'err');
    out({error: String(e)}, true);
  } finally {
    progress(false);
  }
}

async function regenSession(id) {
  if (!await uiConfirm({
    title: 'Regenerate Session (إعادة إنشاء الجلسة)',
    message: 'This will log in to the account with a new device fingerprint. (سيُسجّل الدخول إلى الحساب ببصمة جهاز جديدة.)\n· The old session will be logged out if possible, making it difficult for the previous holder to reuse. (سيتم تسجيل الخروج من الجلسة القديمة إن أمكن، مما يصعّب على المالك السابق إعادة استخدامها.)\n· The account will be replaced in the library with a new session. (سيُستبدل الحساب في المكتبة بجلسة جديدة.)\n· The account must be able to receive official Telegram verification codes. (يجب أن يتمكن الحساب من استقبال رموز التحقق الرسمية من تيليجرام.)\n· Do not regenerate repeatedly in a short time; this may trigger login rate limits (PhonePasswordFlood). (لا تُعد الإنشاء مرارًا خلال وقت قصير؛ فقد يؤدي ذلك إلى تحديد معدل تسجيل الدخول (PhonePasswordFlood).)',
    danger: true,
    okText: 'Continue (متابعة)',
  })) return;
  const password = await uiPrompt({
    title: 'Two-step verification password (كلمة مرور التحقق بخطوتين)',
    message: 'If this account has a cloud password, enter it; otherwise leave it empty and confirm. (إذا كان للحساب كلمة مرور سحابية فأدخلها؛ وإلا اتركها فارغة وأكد.)',
    label: '2FA password (كلمة مرور 2FA; optional (اختياري))',
    password: true,
  });
  if (password === null) return;
  try {
    progress(true);
    const r = await api('/api/accounts/' + id + '/regenerate-session', {
      method: 'POST',
      body: JSON.stringify({password: password || null, code_wait: 8})
    });
    out(r, true);
    toast(r.ok ? ('Session regenerated (تمت إعادة إنشاء الجلسة)' + (r.old_logged_out ? '; old authorization logged out (تم إلغاء التفويض القديم)' : ' (Old authorization logout not confirmed (إلغاء التفويض القديم غير مؤكد))')) : 'Session regeneration failed (فشلت إعادة إنشاء الجلسة)', r.ok ? 'ok' : 'err');
    refresh();
    if (r.ok && await uiConfirm({title: 'Export new account pack (تصدير حزمة الحساب الجديدة)', message: 'Continue exporting the new account pack as a zip? (هل تتابع تصدير حزمة الحساب الجديدة كملف zip؟)', okText: 'Export again (إعادة التصدير)'})) {
      await exportAcc(id, 'pack');
    }
  } catch (e) {
    const msg = String(e.message || e);
    const flood = /PhonePasswordFlood|\u767B\u5F55.?\u6B21\u6570\u8FC7\u591A|FloodWait|too many/i.test(msg);
    toast((flood ? 'Regeneration rate-limited (تم تقييد إعادة الإنشاء): ' : 'regenerate failed (إعادة إنشاء فشل): ') + msg, 'err');
    out({error: msg, flood: flood}, true);
  } finally {
    progress(false);
  }
}

async function bulkRegen() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirmDanger({
    title: 'Bulk session regeneration (إعادة إنشاء الجلسات جماعيًا)',
    message: 'Regenerate sessions for ' + ids.length + ' selected accounts; old authorizations become invalid. (إعادة إنشاء جلسات ' + ids.length + ' حسابات محددة؛ ستصبح التفويضات القديمة غير صالحة.)\nThe task runs in the server background, so closing the browser will not interrupt it. View progress or stop it in Task Center. (تعمل المهمة في خلفية الخادم، لذلك لن يوقف إغلاق المتصفح المهمة. اعرض التقدم أو أوقفها في مركز المهام.)\nNext choose concurrency: 1 is safer and 2–5 is faster but more likely to trigger rate limits. (اختر التوازي تالياً: 1 أكثر أمانًا و2–5 أسرع لكنه أكثر عرضة لتحديد المعدل.)',
    word: 'confirm',
    okText: 'Next (التالي)',
  })) return;
  const password = await uiPrompt({
    title: 'Common two-step verification password (كلمة مرور التحقق بخطوتين الموحدة)',
    message: 'Enter it here if all accounts share the same password; otherwise leave empty. (أدخلها هنا إذا كانت كلمات مرور الحسابات متطابقة؛ وإلا اتركها فارغة.)',
    label: '2FA password (2FA كلمة المرور) (optional (اختياري))',
    password: true,
  });
  if (password === null) return;
  const concStr = await uiPrompt({
    title: 'Concurrency (عدد العمليات المتوازية)',
    message: '1 = Serial (تسلسلي؛ الأكثر أمانًا)\n2–5 = Parallel is faster but may trigger FloodWait (التوازي أسرع لكنه قد يسبب FloodWait)\nMaximum: 8 (الحد الأقصى: 8)\nDefault from the settings panel: TAM_REGEN_CONCURRENCY (الافتراضي من لوحة الإعدادات: TAM_REGEN_CONCURRENCY)',
    label: 'How many accounts to regenerate at once (عدد الحسابات التي يعاد إنشاؤها معًا)',
    value: String(regenConcDefault()),
  });
  if (concStr === null) return;
  let concurrency = parseInt(String(concStr).trim(), 10);
  if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = 1;
  if (concurrency > 8) concurrency = 8;
  try {
    uiProgress({title: 'Bulk session regeneration (إعادة إنشاء الجلسات جماعيًا) ×' + concurrency, current: 0, total: ids.length, text: 'Submitting task (جارٍ إرسال المهمة)…'});
    // Asynchronous job: returns the task ID immediately, runs in the background, and is polled from Task Center without a long connection.
    const created = await api('/api/accounts/regenerate-session?async=1', {
      method: 'POST',
      body: JSON.stringify({ids: ids, password: password || null, code_wait: 8, concurrency: concurrency}),
    });
    const taskId = (created.task && created.task.id) || created.job;
    if (!taskId) throw new Error('Task ID was not returned (لم يتم إرجاع معرّف المهمة)');
    out(created, true);
    toast('Regeneration task submitted (تم إرسال مهمة إعادة الإنشاء) #' + taskId + '; running in the background (قيد التنفيذ في الخلفية)', 'ok');
    if (typeof loadTasks === 'function') loadTasks(true);

    const terminal = {done:1, failed:1, stopped:1};
    let last = created.task || {};
    let stagnant = 0;
    let lastDone = -1;
    const maxStagnant = 100; // About 100*2s ≈ 3.5 minutes without progress; warn and end polling
    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      let t;
      try {
        t = await api('/api/tasks/' + taskId + '?target_limit=50');
      } catch (e) {
        // Brief network jitter does not stop it; continue polling.
        continue;
      }
      last = t;
      const done = (t.ok_count || 0) + (t.fail_count || 0) + (t.skip_count || 0);
      const total = t.total || ids.length;
      const targets = t.targets || [];
      const latest = targets.slice().reverse().find(x => x.status === 'ok' || x.status === 'fail' || x.status === 'running');
      let detail = t.status_cn || t.status || '';
      if (latest) {
        const a = accounts.find(x => String(x.id) === String(latest.target));
        const lab = (a && a.label) || ('#' + latest.target);
        detail = lab + ' · ' + (latest.status_cn || latest.status) + (latest.detail ? ' · ' + latest.detail : '');
      }
      if (done === lastDone) stagnant++;
      else { stagnant = 0; lastDone = done; }
      uiProgress({
        title: 'Bulk session regeneration (إعادة إنشاء الجلسات جماعيًا) ×' + concurrency + ' · task #' + taskId + ' (المهمة رقم ' + taskId + ')',
        current: done,
        total: total,
        detail: detail,
        text: (t.percent != null ? t.percent + '%' : '') + 'Succeeded: ' + (t.ok_count||0) + ' (الناجح: ' + (t.ok_count||0) + ') · Failed: ' + (t.fail_count||0) + ' (الفاشل: ' + (t.fail_count||0) + ')'
          + (stagnant > 15 ? ' · The current account is taking longer (يستغرق الحساب الحالي وقتًا أطول)…' : ''),
      });
      if (terminal[t.status]) break;
      if (!t.live && done >= total && total > 0) break;
      if (!t.live && terminal[t.status]) break;
      // The server is no longer running, but the status is not terminal; avoid an infinite loop.
      if (!t.live && stagnant > 5) break;
      if (stagnant >= maxStagnant) {
        toast('The task made no progress for a long time; stopped waiting. Open Task Center or stop and retry (لم تتقدم المهمة طويلًا؛ تم إيقاف الانتظار. افتح مركز المهام أو أوقفها ثم أعد المحاولة)', 'err');
        break;
      }
    }
    uiProgress(null);
    const r = {
      ok: true,
      task_id: taskId,
      total: last.total || ids.length,
      succeeded: last.ok_count || 0,
      failed: last.fail_count || 0,
      skipped: last.skip_count || 0,
      status: last.status,
      status_cn: last.status_cn,
    };
    out(r, true);
    toast(
      'Regeneration finished (انتهت إعادة الإنشاء): succeeded (نجح) ' + r.succeeded + ' / Failed (فشل) ' + r.failed
        + (r.skipped ? ' / Skipped (تم التخطي) ' + r.skipped : '')
        + ' (task (مهمة) #' + taskId + ')',
      r.failed ? 'err' : 'ok'
    );
    if (typeof loadTasks === 'function') loadTasks(true);
    refresh();
  } catch (e) {
    uiProgress(null);
    toast('Bulk regeneration failed (فشلت إعادة الإنشاء الجماعية): ' + e.message, 'err');
    out({error: String(e)}, true);
  }
}




/* QR Login */
let qrLoginId = null;
let qrWaitAbort = false;

async function startQrLogin(id) {
  qrLoginId = id;
  qrWaitAbort = false;
  const a = accounts.find(x => x.id === id);
  const who = a ? ((a.label || '') + ' ' + (a.phone || '')).trim() : ('#' + id);
  if ($('#qrWho')) $('#qrWho').textContent = who;
  if ($('#qrPass')) $('#qrPass').value = '';
  if ($('#qrPassWrap')) $('#qrPassWrap').style.display = 'none';
  if ($('#qrSubmitPass')) $('#qrSubmitPass').style.display = 'none';
  if ($('#qrStatus')) $('#qrStatus').textContent = 'Getting QR code (جارٍ الحصول على رمز QR)…';
  if ($('#qrImg')) $('#qrImg').removeAttribute('src');
  openModal('mQrLogin');
  try {
    await qrLoginRefresh();
    qrLoginPoll();
  } catch (e) {
    if ($('#qrStatus')) $('#qrStatus').textContent = 'QR login failed: ' + e.message + ' (فشل تسجيل الدخول عبر QR: ' + e.message + ')';
    toast('QR login failed: ' + e.message + ' (فشل تسجيل الدخول عبر QR: ' + e.message + ')', 'err');
  }
}

async function qrLoginRefresh() {
  if (!qrLoginId) return;
  if ($('#qrStatus')) $('#qrStatus').textContent = 'Refresh QR code (تحديث رمز QR)…';
  const r = await api('/api/accounts/' + qrLoginId + '/login/qr', {method: 'POST'});
  if (r.qr_png_base64 && $('#qrImg')) {
    $('#qrImg').src = 'data:image/png;base64,' + r.qr_png_base64;
  }
  const exp = r.expires_in != null ? r.expires_in : '';
  if ($('#qrStatus')) {
    $('#qrStatus').textContent = 'Scan the code (امسح الرمز)…' + (exp !== '' ? ('(' + exp + 's valid (صالح خلال ' + exp + 's))') : '');
  }
  out(r, true);
  return r;
}

async function qrLoginPoll() {
  if (!qrLoginId || qrWaitAbort) return;
  try {
    const r = await api('/api/accounts/' + qrLoginId + '/login/qr/wait', {
      method: 'POST',
      body: JSON.stringify({timeout: 50}),
    });
    if (qrWaitAbort) return;
    if (r.ok) {
      if ($('#qrStatus')) $('#qrStatus').textContent = 'QR login succeeded (نجح تسجيل الدخول عبر QR)';
      toast('QR login succeeded (نجح تسجيل الدخول عبر QR)', 'ok');
      out(r, true);
      closeAll();
      refresh();
      return;
    }
    if (r.need_password) {
      if ($('#qrPassWrap')) $('#qrPassWrap').style.display = '';
      if ($('#qrSubmitPass')) $('#qrSubmitPass').style.display = '';
      if ($('#qrStatus')) $('#qrStatus').textContent = r.note || 'Please enter the 2FA password (يرجى إدخال كلمة مرور 2FA)';
      toast(r.note || 'Two-step verification password required (مطلوب كلمة مرور التحقق بخطوتين)', 'err');
      return;
    }
    if (r.pending) {
      if (r.qr_png_base64 && $('#qrImg')) {
        $('#qrImg').src = 'data:image/png;base64,' + r.qr_png_base64;
      }
      if ($('#qrStatus')) {
        const exp = r.expires_in != null ? r.expires_in : '';
        $('#qrStatus').textContent = 'Waiting for scan (بانتظار المسح)…' + (exp !== '' ? ('about ' + exp + 's remaining (المتبقي نحو ' + exp + ' ثانية)') : '');
      }
      if (!qrWaitAbort) setTimeout(qrLoginPoll, 400);
      return;
    }
    if ($('#qrStatus')) $('#qrStatus').textContent = r.note || r.error || 'Not complete (لم يكتمل)';
  } catch (e) {
    if (qrWaitAbort) return;
    if ($('#qrStatus')) $('#qrStatus').textContent = 'Wait interrupted (انقطع الانتظار): ' + e.message + ' (click Refresh (انقر تحديث))';
    // Retry briefly to avoid abandoning the operation because of network jitter.
    if (!qrWaitAbort) setTimeout(qrLoginPoll, 2000);
  }
}

async function qrLoginSubmitPass() {
  if (!qrLoginId) return;
  const password = ($('#qrPass') && $('#qrPass').value) || '';
  if (!password) { toast('Please enter the 2FA password (يرجى إدخال كلمة مرور 2FA)', 'err'); return; }
  try {
    progress(true);
    const r = await api('/api/accounts/' + qrLoginId + '/login/qr/wait', {
      method: 'POST',
      body: JSON.stringify({password: password, timeout: 30}),
    });
    if (r.ok) {
      toast('QR login succeeded (نجح تسجيل الدخول عبر QR)', 'ok');
      closeAll();
      refresh();
    } else if (r.need_password) {
      toast(r.note || r.error || 'Incorrect password (كلمة المرور غير صحيحة)', 'err');
    } else {
      toast(r.note || 'Not complete (لم يكتمل)', 'err');
    }
    out(r, true);
  } catch (e) {
    toast('Submission failed (فشل الإرسال): ' + e.message, 'err');
  } finally {
    progress(false);
  }
}

async function qrLoginCancel() {
  qrWaitAbort = true;
  const id = qrLoginId;
  qrLoginId = null;
  try {
    if (id) await api('/api/accounts/' + id + '/login/qr', {method: 'DELETE'});
  } catch (_) {}
  closeAll();
}


async function autoLogin(id, closeOnSuccess) {
  const password = loginId === id && $('#lPass') ? ($('#lPass').value || null) : null;
  const r = await guard(() => api(`/api/accounts/${id}/login/auto`, {method:'POST',
    body: JSON.stringify({timeout:120, password})}), 'Automatic code login complete (اكتمل تسجيل الدخول التلقائي بالرمز)');
  if (r && closeOnSuccess) closeAll();
  return r;
}

async function autoLoginFromModal() {
  if (!loginId) return;
  const btn = $('#lAutoBtn');
  const hint = $('#lHint');
  if (btn) btn.disabled = true;
  if (hint) hint.textContent = 'Starting code monitoring; send the verification code and wait for a new code. (جارٍ بدء مراقبة الرمز؛ أرسل رمز التحقق وانتظر رمزًا جديدًا)…';
  try {
    const r = await autoLogin(loginId, true);
    if (!r && hint) hint.textContent = 'Automatic code retrieval failed; check the error log and retry. (فشل جلب الرمز تلقائيًا؛ راجع سجل الأخطاء وأعد المحاولة.)';
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Log in (inline form replacing prompt) */
async function startLogin(id) {
  loginId = id;
  const a = accounts.find(x => x.id === id);
  $('#lWho').textContent = a ? `${a.label} ${a.phone || ''}` : '';
  $('#lCode').value = $('#lPass').value = '';
  $('#lHint').textContent = a && a.code_url
    ? 'No code sent yet. Send it manually and enter the code, or click automatic code login. (لم يُرسل أي رمز بعد. أرسله يدويًا وأدخل الرمز، أو انقر تسجيل الدخول التلقائي بالرمز.)'
    : 'No code sent yet. Click (لم يُرسل أي رمز بعد. انقر)“Send Code (إرسال الرمز)”then enter the received code manually. (ثم أدخل الرمز المستلم يدويًا.)';
  $('#lSendBtn').textContent = 'Send Code (إرسال الرمز)';
  $('#lAutoBtn').style.display = a && a.code_url ? '' : 'none';
  openModal('mLogin');
}
async function resend() {
  if (!loginId) return;
  const btn = $('#lSendBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await guard(
      () => api(`/api/accounts/${loginId}/login/code`, {method:'POST'}),
      'Verification code sent (تم إرسال رمز التحقق)',
    );
    if (r) {
      $('#lHint').textContent = 'Verification code sent; enter it and confirm login. (تم إرسال رمز التحقق؛ أدخله وأكد تسجيل الدخول.)';
      btn.textContent = 'Resend verification code (إعادة إرسال رمز التحقق)';
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}
const verify = () => guard(async () => {
  const body = {code: $('#lCode').value, password: $('#lPass').value || null};
  const r = await api(`/api/accounts/${loginId}/login/verify`, {method:'POST', body: JSON.stringify(body)});
  if (r.need_password) { toast('This account has 2FA enabled; enter the password (هذا الحساب مفعّل عليه 2FA؛ أدخل كلمة المرور)', 'err'); return r; }
  closeAll(); return r;
}, 'Login succeeded (نجح تسجيل الدخول)');

/* Bulk operations (per-account progress; can run in parallel) */
async function bulk(kind) {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (kind === 'check') {
    const r = await runPool(ids, async (id) => {
      return await api('/api/accounts/' + id + '/check', {method: 'POST'});
    }, 'Health Check (فحص الحالة)', batchConc(3));
    out(r, true);
    toast('Health Check (فحص الحالة) · Succeeded (نجح) ' + r.ok + ' / total (إجمالي) ' + r.total + (r.failed ? ', failed (، فشل) ' + r.failed : ''), r.failed ? 'err' : 'ok');
    refresh();
    return r;
  }
  if (kind === 'auto') {
    if (!await uiConfirm({title:'Bulk automatic login (تسجيل الدخول التلقائي الجماعي)', message:'Process ' + ids.length + ' accounts serially: send code, retrieve it automatically, then log in. (معالجة ' + ids.length + ' حسابات بالتسلسل: إرسال الرمز وجلبه تلقائيًا ثم تسجيل الدخول.)', danger:true, okText:'Start (بدء)'})) return;
    const r = await runSerial(ids, async (id) => {
      return await api('/api/accounts/' + id + '/login/auto', {
        method: 'POST', body: JSON.stringify({timeout: 120})});
    }, 'Bulk automatic login (تسجيل الدخول التلقائي الجماعي)');
    out(r, true);
    toast('Automatic login (تسجيل الدخول تلقائيًا) · Succeeded (نجح) ' + r.ok + ' / total (إجمالي) ' + r.total + (r.failed ? ', failed (، فشل) ' + r.failed : ''), r.failed ? 'err' : 'ok');
    refresh();
    return r;
  }
}
async function bulkWarmup() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirm({title:'Warm Up (تهيئة الحساب)', message:'Warm up the selected healthy accounts. (هيّئ الحسابات السليمة المحددة.) Keep them online, mark random messages as read, and chat between accounts. (أبقها متصلة، وضع علامة مقروء عشوائيًا، وفعّل المحادثة بين الحسابات.)\nThe server runs the batch and returns all results when complete. (ينفذ الخادم العملية الجماعية ويعيد كل النتائج عند اكتمالها.)', okText:'Start (بدء)'})) return;
  const r = await withWaitProgress(
    'Warm Up (تهيئة الحساب) · ' + ids.length + ' accounts (تهيئة ' + ids.length + ' حسابًا)',
    'Running on the server; please wait. (قيد التنفيذ على الخادم؛ يرجى الانتظار.) Online / read / mutual chat. (متصل / قراءة / محادثة متبادلة)…',
    () => api('/api/batch/warmup', {
      method:'POST',
      body: JSON.stringify({account_ids: ids, concurrency: 2, rounds: 1}),
    })
  );
  out(r, true);
  toast('Warm-up task complete (اكتملت مهمة تهيئة الحساب)', 'ok');
  refresh();
  return r;
}
async function proxyAudit() {
  const r = await withWaitProgress('Proxy health check (فحص حالة الوكيل)', 'Probing proxy connectivity for each account (جارٍ فحص اتصال الوكيل لكل حساب)…',
    () => api('/api/proxies/audit'));
  out(r, true);
  toast('Proxy health check complete (اكتمل فحص حالة الوكيل)', 'ok');
  return r;
}
async function spamCheck(id) {
  const r = await withWaitProgress('Restriction Check (فحص القيود) · ' + accLabel(id), 'Communicating with (جارٍ التواصل مع) @SpamBot Chat (محادثة)…',
    () => api('/api/accounts/' + id + '/spam-check', {method:'POST'}));
  out(r, true);
  toast('Restriction check complete (اكتمل فحص القيود)', 'ok');
  return r;
}
async function okpayBalance(id) {
  const r = await withWaitProgress('OKPay Balance (رصيد OKPay) · ' + accLabel(id), 'Select the currency menu and parse the balance (حدد قائمة العملة وحلل الرصيد)…',
    () => api('/api/accounts/' + id + '/okpay-balance', {
      method:'POST', body: JSON.stringify({bot: 'Okpay', wait: 4})}));
  out(r, true);
  toast('OKPay Balance query complete (اكتمل استعلام الرصيد)', 'ok');
  return r;
}
async function bulkOkpay() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirm({title:'OKPay Balance (رصيد OKPay)', message:'Query OKPay for ' + ids.length + ' accounts. A message will be sent to @Okpay and the currency selected. (استعلام رصيد OKPay لـ ' + ids.length + ' حسابات. ستُرسل رسالة إلى @Okpay وتُحدد العملة.)', okText:'Query (استعلام)'})) return;
  const r = await runPool(ids, async (id) => {
    return await api('/api/accounts/' + id + '/okpay-balance', {
      method: 'POST', body: JSON.stringify({bot: 'Okpay', wait: 4})});
  }, 'OKPay Balance (رصيد OKPay)', batchConc(2));
  out(r, true);
  toast('OKPay · Succeeded (نجح) ' + r.ok + ' / total (إجمالي) ' + r.total + (r.failed ? ', failed (، فشل) ' + r.failed : ''), r.failed ? 'err' : 'ok');
  return r;
}
async function bulkTerminate() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirm({
    title: 'Bulk device cleanup (تنظيف الأجهزة الجماعي)',
    message: 'Kick all other logged-in devices for ' + ids.length + ' selected accounts, keeping only the current session. (طرد كل أجهزة الدخول الأخرى لـ ' + ids.length + ' حسابات محددة، مع إبقاء الجلسة الحالية فقط.)',
    danger: true,
    okText: 'Start kicking (بدء الطرد)',
  })) return;
  const r = await runPool(ids, async (id) => {
    return await api('/api/accounts/' + id + '/devices/terminate', {method: 'POST'});
  }, 'Bulk device cleanup (تنظيف الأجهزة الجماعي)', batchConc(2));
  out(r, true);
  toast('Device kick complete (اكتمل طرد الأجهزة) · Succeeded (نجح) ' + r.ok + ' / total (إجمالي) ' + r.total + (r.failed ? ', failed (، فشل) ' + r.failed : ''), r.failed ? 'err' : 'ok');
  refresh();
}
let spinTimer = null;
function spinPreview() {
  clearTimeout(spinTimer);
  spinTimer = setTimeout(async () => {
    const text = $('#sText').value;
    if (!text.includes('{')) { $('#spinN').textContent = 'Variants (البدائل): 1'; $('#spinPrev').textContent = ''; return; }
    try {
      const r = await api('/api/spintax/preview', {method:'POST', body: JSON.stringify({text})});
      if (!r.ok) { $('#spinN').textContent = 'Syntax error (خطأ نحوي)'; $('#spinPrev').textContent = r.error || ''; return; }
      $('#spinN').textContent = `Variants (البدائل): ${r.variants} (عدد البدائل: ${r.variants})`;
      $('#spinPrev').textContent = (r.preview || []).join('\n') + (r.warning ? '\n⚠ ' + r.warning : '');
    } catch (e) { $('#spinN').textContent = 'Preview failed (فشل العرض المسبق)'; }
  }, 400);
}
const doSend = () => guard(async () => {
  const ids = [...sel];
  const body = {account_ids: ids, peer: $('#sPeer').value, text: $('#sText').value, concurrency: 2,
                spintax: $('#sSpin').checked, healthy_only: $('#sHealthy').checked};
  const r = await api('/api/batch/message', {method:'POST', body: JSON.stringify(body)});
  closeAll(); return r;
}, 'Broadcast task complete (اكتملت مهمة الإرسال)');
async function bulkTag() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  const t = await uiPrompt({
    title: 'Append tags (إضافة وسوم)',
    message: 'Add tags to the selected ' + ids.length + ' accounts; separate multiple tags with commas. (أضف وسومًا إلى الحسابات المحددة وعددها ' + ids.length + '؛ افصل الوسوم المتعددة بفواصل.)',
    label: 'tag (وسم)',
    placeholder: 'batch2, us',
  });
  if (t === null || !String(t).trim()) return;
  const add = String(t).split(',').map(s => s.trim()).filter(Boolean);
  const r = await runPool(ids, async (id) => {
    const a = accounts.find(x => x.id === id);
    const tags = [...new Set([...(a && a.tags || []), ...add])];
    await api('/api/accounts/' + id, {method: 'PATCH', body: JSON.stringify({tags})});
    return {ok: true};
  }, 'Bulk tag (وسم جماعي)', batchConc(5));
  out(r, true);
  toast('Tags updated (تم تحديث الوسوم) · ' + r.ok + '/' + r.total, 'ok');
  refresh();
}

async function deleteTelegram(id) {
  if (!await uiConfirmDanger({
    title: 'Delete Telegram Account (حذف حساب تيليجرام)',
    message: 'Request permanent deletion of Telegram account #' + id + '. This action cannot be undone; the account linked to the phone number will be deleted, not merely logged out. (اطلب حذف حساب تيليجرام رقم ' + id + ' نهائيًا. لا يمكن التراجع عن ذلك؛ سيُحذف الحساب المرتبط برقم الهاتف، وليس تسجيل الخروج فقط.)\nEnter “delete” to confirm. (أدخل «delete» للتأكيد.)',
    word: 'delete',
    okText: 'Permanent deletion (حذف نهائي)',
  })) return;
  const reason = await uiPrompt({
    title: 'Deletion reason (سبب الحذف) (optional (اختياري))',
    message: 'will be submitted to (سيُرسل إلى) Telegram as the reason; leave empty for the default. (كسبب؛ اتركه فارغًا لاستخدام الافتراضي.)',
    label: 'Reason (السبب)',
    value: 'User requested deletion',
  });
  if (reason === null) return;
  try {
    uiProgress({title: 'Delete account (حذف الحساب) · ' + accLabel(id), current: 0, total: 1, text: 'Submitting (جارٍ الإرسال)…'});
    const r = await api('/api/accounts/' + id + '/delete-telegram', {
      method: 'POST',
      body: JSON.stringify({
        confirm: true,
        reason: String(reason || 'User requested deletion').trim() || 'User requested deletion',
        purge_local: true,
      }),
    });
    uiProgress(null);
    out(r, true);
    toast(r.ok ? 'Deletion submitted and local session cleared (تم إرسال الحذف ومسح الجلسة المحلية)' : ('Deletion response (استجابة الحذف): ' + (r.note || '')), r.ok ? 'ok' : 'err');
    refresh();
  } catch (e) {
    uiProgress(null);
    toast('Deletion failed (فشل الحذف): ' + e.message, 'err');
    out({error: String(e)}, true);
  }
}

async function bulkDeleteTelegram() {
  const ids = [...sel];
  if (!ids.length) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirmDanger({
    title: 'Bulk delete Telegram accounts (حذف حسابات تيليجرام جماعيًا)',
    message: 'Request Telegram account deletion for ' + ids.length + ' accounts; this is irreversible. (طلب حذف حسابات تيليجرام وعددها ' + ids.length + '؛ لا يمكن التراجع عن ذلك.)\nEnter “bulk delete” to confirm. (أدخل «bulk delete» للتأكيد.)',
    word: 'bulk delete',
    okText: 'Start deletion (بدء الحذف)',
  })) return;
  const r = await runPool(ids, async (id) => {
    return await api('/api/accounts/' + id + '/delete-telegram', {
      method: 'POST',
      body: JSON.stringify({confirm: true, reason: 'User requested deletion', purge_local: true}),
    });
  }, 'Delete Telegram Account (حذف حساب تيليجرام)', 1);
  out(r, true);
  toast('Deletion complete: succeeded ' + r.ok + ' / total ' + r.total + (r.failed ? ', failed ' + r.failed : '') + ' (اكتمل الحذف: نجح ' + r.ok + ' / الإجمالي ' + r.total + (r.failed ? '، فشل ' + r.failed : '') + ')', r.failed ? 'err' : 'ok');
  refresh();
}

async function bulkDelete() {
  const n = sel.size;
  if (!n) { toast('Select accounts first (حدد الحسابات أولًا)', 'err'); return; }
  if (!await uiConfirmDanger({
    title: 'Bulk delete local records (حذف السجلات المحلية جماعيًا)',
    message: 'Delete ' + n + ' selected local account records, not the Telegram accounts themselves. Encrypted sessions in this tool will disappear. (حذف ' + n + ' سجلات حساب محلية محددة، وليس حسابات تيليجرام نفسها. ستختفي الجلسات المشفرة في هذه الأداة.)',
    word: 'confirm',
    okText: 'Delete (حذف)',
  })) return;
  const ids = [...sel];
  const r = await runPool(ids, async (id) => {
    await api('/api/accounts/' + id, {method: 'DELETE'});
    return {ok: true};
  }, 'Bulk delete (حذف جماعي)', batchConc(5));
  sel.clear();
  out(r, true);
  toast('Deleted: succeeded ' + r.ok + ' / total ' + r.total + ' (تم الحذف: نجح ' + r.ok + ' / الإجمالي ' + r.total + ')', 'ok');
  refresh();
}

/* Bulk import  */
function cleanImportPart(part) {
  let value = part.trim();
  if (value.length >= 2 && value.startsWith('`') && value.endsWith('`')) {
    value = value.replace(/^`+|`+$/g, '').trim();
  }
  if (value.length >= 4 && ((value.startsWith('**') && value.endsWith('**')) ||
      (value.startsWith('__') && value.endsWith('__')))) {
    value = value.slice(2, -2).trim();
  }
  if (value.length >= 2 && value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1).trim();
  }
  return value;
}

function isMarkdownTableMeta(parts) {
  if (parts.length && parts.every(p => /^:?-{3,}:?$/.test(p.replace(/\s/g, '')))) return true;
  const names = new Set(parts.map(p => p.replace(/[\s_\/-]/g, '').toLowerCase()));
  const hasPhone = ['phone', 'phonenumber', 'mobile', 'Phone Number (رقم الهاتف)', 'numbers (أرقام)'].some(x => names.has(x));
  const hasUrl = ['url', 'link', 'codeurl', 'Code Link (رابط الرمز)', 'links (روابط)'].some(x => names.has(x));
  return hasPhone && hasUrl;
}

function parseLines(text) {
  const ok = [], bad = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim().replace(/^\ufeff/, '');
    if (!line || line.startsWith('#')) return;
    const parts = line.split(/\s*(?:\\\||\||\uFF5C|\t|,|;)\s*/)
      .map(cleanImportPart).filter(Boolean);
    if (isMarkdownTableMeta(parts)) return;
    let phone = null, url = null, label = null;
    parts.forEach(p => {
      if (/^https?:\/\//i.test(p)) url = url || p;
      else if (/^\+?\d[\d\s\-()]{5,}$/.test(p)) {
        const digitCount = p.replace(/\D/g, '').length;
        if (digitCount >= 7 && digitCount <= 15) phone = phone || ('+' + p.replace(/\D/g, ''));
      }
      else if (/^(?:#\s*)?\d+[.)]?$/i.test(p)) return;
      else label = label || p;
    });
    phone ? ok.push({phone, url, label}) : bad.push({line: i + 1, raw: line});
  });
  return {ok, bad};
}
function previewImport() {
  const {ok, bad} = parseLines($('#iText').value);
  const withUrl = ok.filter(x => x.url).length;
  $('#iPrev').innerHTML = ok.length || bad.length
    ? `Code-link list: <b>${ok.length}</b> valid entries (قائمة روابط الرموز: <b>${ok.length}</b> إدخالات صالحة) (${withUrl} entries have code links (لدى ${withUrl} إدخالات روابط رموز))` +
      (bad.length ? `, <span style="color:#a13f36">${bad.length} rows could not be recognized (تعذر التعرف على ${bad.length} صفوف): lines ${bad.slice(0,5).map(b => b.line).join(', ')}</span>` : '')
    : 'Code-link list: Waiting for input (قائمة روابط الرموز: بانتظار الإدخال)';
}

async function testFirstImportedCodeSource() {
  const {ok} = parseLines($('#iText').value);
  const first = ok.find(item => item.url);
  if (!first) {
    $('#iCodeStatus').textContent = 'No code-link text to parse (لا يوجد نص روابط رموز لتحليله)';
    toast('No code-link text to parse (لا يوجد نص روابط رموز لتحليله)', 'err');
    return;
  }
  return testCodeSource('', 'iProxy', 'iCodeStatus', first.url);
}

const doImport = dry => guard(async () => {
  const r = await withWaitProgress(
    dry ? 'Dry-run import list (قائمة استيراد تجريبية)' : 'Bulk Import Accounts (استيراد الحسابات جماعيًا)',
    dry ? 'Parsing (جارٍ التحليل)…' : 'Writing to database (جارٍ الكتابة إلى قاعدة البيانات)…',
    () => api('/api/accounts/import', {method:'POST', body: JSON.stringify({
      text: $('#iText').value,
      tags: $('#iTags').value ? $('#iTags').value.split(',').map(s => s.trim()) : [],
      proxy: $('#iProxy').value || null, dry_run: dry})}),
    120000);
  if (!dry) closeAll();
  return r;
}, null).then(r => r && toast(dry ? 'Dry run complete; see the log area for results (اكتمل التشغيل التجريبي؛ راجع منطقة السجل للنتائج)' : `Import complete: added ${(r.added||[]).length}, updated ${(r.updated||[]).length} (اكتمل الاستيراد: أضيف ${(r.added||[]).length}، حُدّث ${(r.updated||[]).length})`, 'ok'));

function toggleTdataMode() {
  const mode = (document.querySelector('input[name="tdataMode"]:checked') || {}).value || 'upload';
  $('#tdataUploadBox').style.display = mode === 'upload' ? '' : 'none';
  $('#tdataPathBox').style.display = mode === 'path' ? '' : 'none';
}

document.addEventListener('change', function (e) {
  if (!e.target || e.target.id !== 'tUpload') return;
  const files = e.target.files || [];
  const el = $('#tUploadHint');
  if (!el) return;
  if (!files.length) { el.textContent = 'No file selected yet (لم يتم اختيار ملف بعد)'; return; }
  const names = Array.from(files).map(f => f.name);
  el.textContent = 'Selected ' + files.length + ' items (تم تحديد ' + files.length + ' عناصر): ' + names.slice(0, 5).join(', ')
    + (names.length > 5 ? '…' : '');
});

const tdataBody = () => JSON.stringify({
  path: $('#tPath').value, scan: $('#tScan') ? $('#tScan').checked : false,
  label: $('#tLabel').value || null, password: $('#tPass').value || null,
  proxy: $('#tProxy').value || null, debug: $('#tDebug').checked,
  tags: $('#tTags').value ? $('#tTags').value.split(',').map(s => s.trim()).filter(Boolean) : []});

async function _tdataUploadOne(file, extra) {
  const q = new URLSearchParams();
  if (extra.label) q.set('label', extra.label);
  if (extra.password) q.set('password', extra.password);
  if (extra.proxy) q.set('proxy', extra.proxy);
  if (extra.tags && extra.tags.length) q.set('tags', extra.tags.join(','));
  if (extra.debug) q.set('debug', 'true');
  q.set('scan', 'true');
  const path = '/api/accounts/import-tdata-upload' + (q.toString() ? '?' + q.toString() : '');
  const headers = {'X-Filename': file.name};
  if (!DEMO) {
    const tok = ($('#token') && $('#token').value) || localStorage.getItem('tam_token') || '';
    if (tok) headers['Authorization'] = 'Bearer ' + tok;
  }
  if (DEMO) {
    return {ok: true, filename: file.name, tdata_dirs: 1, succeeded: 1,
            items: [{path: 'demo/tdata', accounts: [{ok: true, label: file.name, user_id: 1}]}]};
  }
  const res = await fetch(path, {method: 'POST', body: file, headers});
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch (_) { data = {detail: text}; }
  if (!res.ok) throw new Error(data.detail || data.message || text || ('HTTP ' + res.status));
  return data;
}

async function doTdata() {
  const mode = (document.querySelector('input[name="tdataMode"]:checked') || {}).value || 'upload';
  const extra = {
    label: $('#tLabel').value || null,
    password: $('#tPass').value || null,
    proxy: $('#tProxy').value || null,
    tags: $('#tTags').value ? $('#tTags').value.split(',').map(s => s.trim()).filter(Boolean) : [],
    debug: $('#tDebug').checked,
  };
  try {
    uiProgress({title: 'tdata Import (استيراد tdata)', current: 0, total: 1, text: 'Preparing (جارٍ التحضير)…'});
    let r;
    if (mode === 'upload') {
      const input = $('#tUpload');
      const files = input && input.files ? Array.from(input.files) : [];
      if (!files.length) { toast('Select tdata zip files to upload (حدد ملفات zip الخاصة بـ tdata لرفعها)', 'err'); return; }
      const items = [];
      let okN = 0, badN = 0;
      for (let fi = 0; fi < files.length; fi++) {
        const f = files[fi];
        uiProgress({
          title: 'tdata Import (استيراد tdata)',
          current: fi,
          total: files.length,
          text: 'Upload and parse (رفع وتحليل) ' + (fi + 1) + '/' + files.length + ' · ' + f.name,
        });
        const one = await _tdataUploadOne(f, extra);
        for (const e of (one.items || [])) {
          items.push(e);
          for (const a of (e.accounts || [])) {
            if (a.ok) okN++; else badN++;
          }
        }
      }
      r = items;
      const blocks = items.map(e => {
        const per = (e.accounts || []).map(a => a.ok
          ? ('  ✓ ' + (a.label || '') + ' user_id=' + (a.user_id || '?'))
          : ('  ✗ ' + (a.label || '') + ' ' + (a.error || 'Unknown error (خطأ غير معروف)'))).join('\n');
        return 'directory (مجلد): ' + e.path + '\n' + per + (e.debug ? '\n' + renderTdataReport(e.debug) : '');
      });
      out(blocks.join('\n\n') || JSON.stringify(items, null, 2), true);
      if (okN) { toast('Import succeeded: ' + okN + ' accounts (نجح الاستيراد: ' + okN + ' حسابات)' + (badN ? ', failed ' + badN + ' (فشل ' + badN + ')' : ''), badN ? '' : 'ok'); closeAll(); }
      else toast('Import failed: 0 accounts; see the log area below (فشل الاستيراد: 0 حسابات؛ راجع منطقة السجل أدناه)', 'err');
    } else {
      const path = ($('#tPath').value || '').trim();
      if (!path) { toast('Enter the server local path (أدخل المسار المحلي للخادم)', 'err'); return; }
      r = await withWaitProgress('tdata Path import (استيراد من المسار)', 'Parsing and validating tdata (may take longer with many accounts) (جارٍ تحليل والتحقق من tdata (قد يستغرق وقتًا أطول مع حسابات كثيرة))…',
        () => api('/api/accounts/import-tdata', {method:'POST', body: tdataBody()}), 600000);
      const accs = [].concat(...(r || []).map(e => e.accounts || []));
      const okN = accs.filter(a => a.ok).length, badN = accs.length - okN;
      const blocks = (r || []).map(e => {
        const per = (e.accounts || []).map(a => a.ok
          ? ('  ✓ ' + (a.label || '') + ' user_id=' + (a.user_id || '?'))
          : ('  ✗ ' + (a.label || '') + ' ' + (a.error || 'Unknown error (خطأ غير معروف)'))).join('\n');
        return 'directory (مجلد): ' + e.path + '\n' + per + (e.debug ? '\n' + renderTdataReport(e.debug) : '');
      });
      out(blocks.join('\n\n') || JSON.stringify(r, null, 2), true);
      if (okN) { toast('Import succeeded: ' + okN + ' accounts (نجح الاستيراد: ' + okN + ' حسابات)' + (badN ? ', failed ' + badN + ' (فشل ' + badN + ')' : ''), badN ? '' : 'ok'); closeAll(); }
      else toast('Import failed: 0 accounts; see the log area below (فشل الاستيراد: 0 حسابات؛ راجع منطقة السجل أدناه)', 'err');
    }
    refresh();
  } catch (e) {
    toast('Import failed: ' + e.message + ' (فشل الاستيراد: ' + e.message + ')', 'err');
    out({error: String(e)}, true);
  } finally {
    uiProgress(null);
  }
}

async function doTdataInspect() {
  const mode = (document.querySelector('input[name="tdataMode"]:checked') || {}).value || 'upload';
  if (mode === 'upload') {
    toast('“Check First” supports server paths only; upload to import directly (failures include diagnostics) («الفحص أولًا» يدعم مسارات الخادم فقط؛ ارفع للاستيراد مباشرة (تتضمن حالات الفشل تشخيصًا))', 'err');
    return;
  }
  try {
    const r = await api('/api/tdata/inspect', {method:'POST', body: tdataBody()});
    const reps = r.reports || [];
    out(reps.map(renderTdataReport).join('\n\n') || 'No directory to diagnose (لا يوجد مجلد لتشخيصه)', true);
    const good = reps.filter(x => x.ok).length;
    toast(good ? ('Health check complete: ' + good + '/' + reps.length + ' usable directories (اكتمل فحص الحالة: ' + good + '/' + reps.length + ' مجلدات صالحة)') : 'Health check failed; see the log area for details (فشل فحص الحالة؛ راجع منطقة السجل للتفاصيل)', good ? 'ok' : 'err');
  } catch (e) {
    toast('Health check failed: ' + e.message + ' (فشل فحص الحالة: ' + e.message + ')', 'err');
    out({error: String(e)}, true);
  }
}

/* Auto refresh */
let timer = null;
$('#auto').addEventListener('change', e => {
  clearInterval(timer);
  if (e.target.checked) timer = setInterval(refresh, 10000);
});

/* Start */
loadLayout();
if (DEMO) {
  $('#demoBar').classList.add('on');
  $('#mode').textContent = 'Demo mode (الوضع التجريبي)';
  $('#mode').className = 'pill ro';
  accounts = MOCK.accounts; stats = MOCK.stats;
  render();
  loadKick();
  loadTasks();
  loadLeads();
  loadSettings();
  loadOps();
  renderZt();
  out(MOCK.logs);
} else {
  probeMode();
  refresh();
}
/* ---------- Toolbox: these batch functions act directly on selected accounts in the library ---------- */
/* Fields come from /api/toolbox/ops and are dynamic; adding a backend operation requires no frontend changes. */
let TB_OPS = [];
let TB_CUR = '';

const TB_PRIV_KEYS = [
  ['phone', 'Phone number visible (رقم الهاتف ظاهر)'], ['last_seen', 'Last online (آخر ظهور على الإنترنت)'], ['invite', 'Added to groups (أُضيف إلى المجموعات)'],
  ['avatar', 'Profile photo visible (الصورة الشخصية ظاهرة)'], ['call', 'Incoming calls (المكالمات الواردة)'], ['forward', 'Forwarding signature (اسم الإحالة عند إعادة التوجيه)'],
];
const TB_PRIV_VALS = [['', 'Nobody (لا أحد)'], ['everybody', 'Everyone (الجميع)'], ['contacts', 'Contacts (جهات الاتصال)'], ['nobody', 'Nobody (لا أحد)']];

async function loadOps() {
  const box = $('#tbBody');
  if (!box) return;
  try {
    const r = await api('/api/toolbox/ops');
    TB_OPS = r.ops || [];
    if (!TB_CUR && TB_OPS.length) TB_CUR = TB_OPS[0].op;
    renderTb();
  } catch (e) {
    box.innerHTML = '<span class="muted">Load failed: ' + esc(e.message) + ' (فشل التحميل: ' + esc(e.message) + ')</span>';
  }
}

function tbSpec() { return TB_OPS.find(o => o.op === TB_CUR) || null; }

function tbField(p) {
  const id = 'tbp_' + p.name;
  const req = p.required ? ' <span class="tag s-restricted">Required (مطلوب)</span>' : '';
  const dv = (p.default === undefined || p.default === null) ? '' : String(p.default);

  if (p.type === 'bool') {
    const on = p.default === true ? ' checked' : '';
    return '<label class="row" style="gap:8px;cursor:pointer;margin:6px 0">' +
      '<input type="checkbox" id="' + id + '" style="width:16px;min-height:0"' + on + ' />' +
      '<span>' + esc(p.label) + req + '</span></label>';
  }
  if (p.type === 'privacy') {
    const rows = TB_PRIV_KEYS.map(function (kv) {
      const opts = TB_PRIV_VALS.map(function (vt) {
        return '<option value="' + vt[0] + '">' + esc(vt[1]) + '</option>';
      }).join('');
      return '<label class="f"><span>' + esc(kv[1]) + '</span>' +
        '<select id="tbpriv_' + kv[0] + '">' + opts + '</select></label>';
    }).join('');
    return '<div class="muted" style="margin:6px 0">' + esc(p.label) +
      ' (Leave “Nobody” items untouched (اترك عناصر «لا أحد» دون تغيير))</div>' + rows;
  }
  if (p.type === 'textarea') {
    return '<label class="f"><span>' + esc(p.label) + req + '</span>' +
      '<textarea id="' + id + '" rows="5" placeholder="One per line (واحد في كل سطر)"></textarea></label>';
  }
  const t = p.type === 'password' ? 'password'
    : ((p.type === 'int' || p.type === 'float') ? 'number' : 'text');
  const step = p.type === 'float' ? ' step="any"' : '';
  return '<label class="f"><span>' + esc(p.label) + req + '</span>' +
    '<input id="' + id + '" type="' + t + '"' + step +
    ' placeholder="' + esc(dv ? 'default (افتراضي) ' + dv : '') + '" /></label>';
}

function renderTb() {
  const box = $('#tbBody');
  if (!box) return;
  const sp = tbSpec();
  const opts = TB_OPS.map(function (o) {
    return '<option value="' + esc(o.op) + '"' + (o.op === TB_CUR ? ' selected' : '') +
      '>' + (o.danger ? '⚠ ' : '') + esc(o.label) + '</option>';
  }).join('');

  const warn = (sp && sp.danger)
    ? '<div class="empty" style="border-color:#a33;color:#e88;margin:8px 0">' +
      '⚠ Irreversible action; confirm once more before execution. Test with one account first. (إجراء لا يمكن التراجع عنه؛ سيُطلب التأكيد مرة أخرى قبل التنفيذ. اختبر حسابًا واحدًا أولًا.)</div>' : '';

  box.innerHTML =
    '<label class="f"><span>Operation (العملية)</span>' +
    '<select id="tbOp" onchange="TB_CUR=this.value;renderTb()">' + opts + '</select></label>' +
    '<div class="muted" style="margin:4px 0 8px">' + (sp ? esc(sp.desc) : '') + '</div>' +
    warn +
    (sp ? sp.params.map(tbField).join('') : '') +
    '<label class="f"><span>concurrency (التوازي)</span>' +
    '<input id="tbConc" type="number" min="1" max="32" ' +
    'placeholder="Blank = use the TAM_BATCH_CONCURRENCY setting (فارغ = استخدام إعداد TAM_BATCH_CONCURRENCY)" /></label>' +
    '<div class="row" style="gap:8px;margin-top:8px">' +
    '<button class="sm write" onclick="runTb()">Run on selected accounts (نفّذ على الحسابات المحددة)</button>' +
    '<span class="muted" id="tbSel">Selected ' + sel.size + ' item (عنصر)</span></div>' +
    '<div id="tbOut" style="margin-top:10px"></div>';

  if (readonly) box.querySelectorAll('.write').forEach(function (b) { b.disabled = true; });
}

/* Collapse the form into params. Leave numbers empty to omit them and let the server use defaults — do not invent 0; empty and zero are different. */
/* An explicitly entered zero is different from leaving the field empty. */
function tbCollect(sp) {
  const out = {};
  for (const p of sp.params) {
    if (p.type === 'privacy') {
      const items = {};
      for (const kv of TB_PRIV_KEYS) {
        const el = $('#tbpriv_' + kv[0]);
        const v = el ? (el.value || '') : '';
        if (v) items[kv[0]] = v;
      }
      if (Object.keys(items).length) out[p.name] = items;
      continue;
    }
    const el = $('#tbp_' + p.name);
    if (!el) continue;
    if (p.type === 'bool') { out[p.name] = el.checked; continue; }
    const raw = String(el.value || '').trim();
    if (!raw) continue;
    if (p.type === 'int' || p.type === 'float') {
      const n = Number(raw);
      if (!isFinite(n)) throw new Error(p.label + ' The value is not a number (القيمة ليست رقمًا): ' + raw);
      out[p.name] = p.type === 'int' ? Math.trunc(n) : n;
    } else {
      out[p.name] = raw;
    }
  }
  return out;
}

function tbLabel(id) {
  const a = accounts.find(function (x) { return x.id === id; });
  return a ? a.label : ('#' + id);
}

async function runTb() {
  const sp = tbSpec();
  if (!sp) return;
  const ids = [...sel];
  if (!ids.length) { toast('First select the accounts to operate on in the account list (حدد أولًا الحسابات المراد تشغيلها في قائمة الحسابات)', 'err'); return; }

  let params;
  try { params = tbCollect(sp); }
  catch (e) { toast(e.message, 'err'); return; }

  if (sp.danger) {
    const msg = '[' + sp.label + ']is irreversible; it will process (لا يمكن التراجع عنه؛ سيعالج) ' + ids.length +
      '  accounts. ( حسابات.)\n\n' + sp.desc + '\n\nConfirm and continue (أكد وتابع)?';
    if (!await uiConfirm({title:'please confirm (يرجى تأكيد)', message: msg, danger:true})) return;
  }

  const cel = $('#tbConc');
  const cv = cel ? String(cel.value || '').trim() : '';
  let conc = cv ? Number(cv) : batchConc(3);
  if (!Number.isFinite(conc) || conc < 1) conc = 1;
  if (conc > 32) conc = 32;

  const box = $('#tbOut');
  box.innerHTML = '<span class="muted">Running (قيد التنفيذ)…</span>';
  try {
    const r = await runPool(ids, async (id) => {
      const one = await api('/api/accounts/' + id + '/toolbox/' + encodeURIComponent(sp.op), {
        method: 'POST',
        body: JSON.stringify({params: params}),
      });
      // Normalize to the common batch result-row structure.
      if (one && typeof one === 'object' && ('ok' in one || 'result' in one || 'error' in one)) {
        return Object.assign({account_id: id}, one);
      }
      return {ok: true, account_id: id, result: one};
    }, 'Tool (الأداة) · ' + sp.label, conc);
    // Adapter for renderTbResult.
    const adapted = {
      total: r.total,
      ok: r.ok,
      failed: r.failed,
      results: (r.results || []).map(function (x) {
        return {
          account_id: x.account_id != null ? x.account_id : x.id,
          ok: x.ok !== false && !x.error,
          result: x.result != null ? x.result : x,
          error: x.error,
        };
      }),
    };
    renderTbResult(adapted);
    out(adapted, true);
    toast(sp.label + ': succeeded (نجح) ' + adapted.ok + ' / total (إجمالي) ' + adapted.total, adapted.failed ? 'warn' : 'ok');
    refresh();
  } catch (e) {
    box.innerHTML = '<span class="muted">failed (فشل): ' + esc(e.message) + '</span>';
    toast('failed (فشل): ' + e.message, 'err');
    uiProgress(null);
  }
}

function renderTbResult(r) {
  const rows = (r.results || []).map(function (x) {
    const tone = x.ok ? 'ok' : 'err';
    const txt = x.ok ? tbBrief(x.result) : String(x.error || 'Failed (فشل)');
    return '<tr><td>' + esc(tbLabel(x.account_id)) + '</td>' +
      '<td><span class="tag s-' + tone + '">' + (x.ok ? 'Succeeded (نجح)' : 'Failed (فشل)') + '</span></td>' +
      '<td class="muted">' + esc(txt) + '</td></tr>';
  }).join('');
  $('#tbOut').innerHTML =
    '<div class="muted" style="margin-bottom:6px">total (إجمالي) ' + r.total + ' item,  succeeded (عنصر نجح) ' +
    r.ok + ', failed (، فشل) ' + r.failed + '</div>' +
    '<table><thead><tr><th>Account (الحساب)</th><th>Result (النتيجة)</th><th>Description (الوصف)</th></tr></thead><tbody>' +
    rows + '</tbody></table>';
}

/* Flatten the returned dictionary into a readable line. Each operation may return different keys, so show common ones; if a value cannot be recognized, show the original JSON rather than showing nothing. */
function tbBrief(v) {
  if (v === null || v === undefined) return 'Done (تم)';
  if (typeof v !== 'object') return String(v);
  const pick = ['note', 'status', 'message', 'detail', 'action', 'path', 'username',
    'title', 'reply_count', 'deleted', 'total', 'returned', 'alive', 'has_password'];
  for (const k of pick) {
    if (v[k] !== undefined && v[k] !== null && v[k] !== '') {
      if (k === 'alive') return v[k] ? 'Alive (حي)' : ('Unavailable (غير متاح): ' + (v.reason || ''));
      if (k === 'has_password') return v[k] ? '2FA set (تم تعيين 2FA)' : 'none 2FA (لا يوجد 2FA)';
      if (k === 'reply_count') return 'Reply (رد) ' + v[k] + ' entry (إدخال)';
      if (k === 'deleted' && v.total !== undefined) return 'Delete (حذف) ' + v.deleted + '/' + v.total;
      return String(v[k]);
    }
  }
  const parts = Object.keys(v)
    .filter(function (k) { return typeof v[k] !== 'object'; })
    .slice(0, 6)
    .map(function (k) { return k + '=' + v[k]; });
  return parts.length ? parts.join('  ') : JSON.stringify(v);
}
/* ---------- ZIP tool: split / merge / classify by registration time ---------- */
/* Upload uses the raw request body. The backend does not import python-multipart because it conflicts with the similarly named multipart package, so api() cannot be used here. */
/* The helper is not used here because it forces JSON headers and stringifies the body. */

let ZT_JOB = null;      // Current split/classification job
let ZT_MERGE_JOB = null; // Current merge job; upload in batches and track it separately
let ZT_MERGE_N = 0;

function ztAuth() {
  const el = $('#token');
  return el && el.value ? {Authorization: 'Bearer ' + el.value} : {};
}

async function ztFetch(path, opts) {
  const o = opts || {};
  o.headers = Object.assign({}, ztAuth(), o.headers || {});
  const res = await fetch(path, o);
  const raw = await res.text();
  let j = {};
  try { j = raw ? JSON.parse(raw) : {}; } catch (e) { j = {}; }
  if (!res.ok) {
    if (res.status === 401) throw new Error('Token is wrong or expired; fill in the token above first (الرمز خاطئ أو منتهي؛ املأ الرمز أعلاه أولًا)');
    throw new Error(j.detail || j.message || raw || ('HTTP ' + res.status));
  }
  return j;
}

/* The download route requires authorization; ordinary <a href> requests do not include Authorization headers, */
/* so fetch the response as a blob before triggering a save. */
async function ztDownload(url, filename) {
  try {
    const res = await fetch(url, {headers: ztAuth()});
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  } catch (e) {
    toast('Download failed (فشل التنزيل): ' + e.message, 'err');
  }
}

function ztFile(id) {
  const el = $(id);
  return el && el.files && el.files.length ? el.files : null;
}

function ztConc(id) {
  const el = $(id);
  const v = el ? String(el.value || '').trim() : '';
  return v ? ('?workers=' + encodeURIComponent(v)) : '';
}

function ztSay(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

function renderZt() {
  const box = $('#ztBody');
  if (!box) return;
  box.innerHTML =
    '<div class="muted" style="margin-bottom:8px">These three tools process the account-pack files you upload. (تعالج هذه الأدوات الثلاث ملفات حزم الحساب التي ترفعها.)' +
    'They do not touch accounts hosted in the library. Click “Delete when done” — account packs are sensitive. (لا تلمس الحسابات المستضافة في المكتبة. انقر «احذف بعد الانتهاء»؛ حزم الحسابات حساسة.)' +
    'Do not leave them on the server for long. (لا تتركها على الخادم طويلًا.)</div>' +

    '<h4 style="margin:10px 0 4px">One: Split pack (واحد: تقسيم الحزمة)</h4>' +
    '<label class="f"><span>Select account pack (حدد حزمة الحساب)</span>' +
    '<input type="file" id="ztUpFile" accept=".zip" /></label>' +
    '<label class="f"><span>Split format (صيغة التقسيم)</span>' +
    '<input id="ztFmt" placeholder="-9- means each pack has 9 items; 5,5,5 specifies each pack (تعني -9- أن كل حزمة تحتوي على 9 عناصر؛ وتحدد 5,5,5 عناصر كل حزمة)" /></label>' +
    '<label class="f"><span>concurrency (التوازي)</span>' +
    '<input id="ztUpConc" type="number" min="1" max="32" ' +
    'placeholder="Blank = use the TAM_WORKERS setting (فارغ = استخدام إعداد TAM_WORKERS)" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm" onclick="ztAnalyze()">First see how many accounts there are (اعرف أولًا عدد الحسابات)</button>' +
    '<button class="sm write" onclick="ztUnpack()">split pack (تقسيم الحزمة)</button></div>' +
    '<div id="ztUnpackOut" style="margin:6px 0 12px"></div>' +

    '<h4 style="margin:10px 0 4px">Two: Merge (اثنان: دمج)</h4>' +
    '<div class="muted" style="margin-bottom:4px">Select several at once or add them in batches (حدد عدة ملفات دفعة واحدة أو أضفها على دفعات) (collect them into the same job (اجمعها في المهمة نفسها)). ' +
    'Accounts with the same name are renamed automatically; nothing is silently overwritten. (تُعاد تسمية الحسابات المتطابقة تلقائيًا؛ ولا يُستبدل شيء بصمت.)</div>' +
    '<label class="f"><span>Select account packs (حدد حزم الحسابات) (multiple selection allowed (يمكن اختيار عدة ملفات))</span>' +
    '<input type="file" id="ztMergeFiles" accept=".zip" multiple /></label>' +
    '<label class="f"><span>concurrency (التوازي)</span>' +
    '<input id="ztMergeConc" type="number" min="1" max="32" ' +
    'placeholder="Blank = use the TAM_WORKERS setting (فارغ = استخدام إعداد TAM_WORKERS)" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm" onclick="ztMergeAdd()">Add to the merge job (أضف إلى مهمة الدمج)</button>' +
    '<button class="sm write" onclick="ztMergeRun()">Start merge (بدء الدمج)</button>' +
    '<span class="muted" id="ztMergeN">Queued packages (الحزم المجمعة): 0</span></div>' +
    '<div id="ztMergeOut" style="margin:6px 0 12px"></div>' +

    '<h4 style="margin:10px 0 4px">Three: Classify by registration time (ثلاثة: تصنيف حسب وقت التسجيل)</h4>' +
    '<div class="muted" style="margin-bottom:4px">Default: <b>Completely offline (دون اتصال تمامًا)</b>; uses only JSON date fields already available. (الإعداد الافتراضي: يستخدم حقول تواريخ JSON الموجودة مسبقًا فقط.)' +
    'No data is sent out; it goes online only when TAM_REGTIME_ENDPOINT is configured. (لا تُرسل أي بيانات؛ يتصل بالإنترنت فقط عند ضبط TAM_REGTIME_ENDPOINT.)</div>' +
    '<label class="f"><span>select account pack (حدد حزمة حساب)</span>' +
    '<input type="file" id="ztRegFile" accept=".zip" /></label>' +
    '<label class="f"><span>concurrency (التوازي)</span>' +
    '<input id="ztRegConc" type="number" min="1" max="32" ' +
    'placeholder="Blank = use the TAM_WORKERS setting (فارغ = استخدام إعداد TAM_WORKERS)" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm write" onclick="ztRegtime()">Start classification (بدء التصنيف)</button></div>' +
    '<div id="ztRegOut" style="margin:6px 0"></div>' +

    '<h4 style="margin:14px 0 4px">Four: Tdata API (أربعة: Tdata API)</h4>' +
    '<div class="muted" style="margin-bottom:4px">Upload a session/tdata account pack; generate renamed session, ' +
    '<code>api.json</code> and the code-link list (وقائمة روابط الرموز) (“Tdata API”; source: GAFBot MIT). ' +
    'The code prefix defaults to the environment variable TAM_TOAPI_BASE / DM / SERVER_IP:API_PORT. (تُقرأ بادئة الرمز افتراضيًا من متغير البيئة TAM_TOAPI_BASE / DM / SERVER_IP:API_PORT.)</div>' +
    '<label class="f"><span>Select account pack ZIP (حدد ملف ZIP لحزمة الحساب)</span>' +
    '<input type="file" id="ztToapiFile" accept=".zip" /></label>' +
    '<label class="f"><span>2FA handling (معالجة 2FA)</span>' +
    '<select id="ztToapiMode" style="min-height:0;padding:4px 8px">' +
    '<option value="from_json">From JSON / 2fa.txt (من JSON / 2fa.txt) Extract (استخراج)</option>' +
    '<option value="no_2fa">No 2FA (لا توجد 2FA)</option>' +
    '<option value="manual">Enter manually for all 2FA (إدخال 2FA يدويًا للجميع)</option>' +
    '</select></label>' +
    '<label class="f"><span>Unified 2FA (التحقق بخطوتين الموحد) (manual only (للوضع اليدوي فقط))</span>' +
    '<input id="ztToapiPass" type="password" placeholder="manual required in this mode (مطلوب في هذا الوضع)" autocomplete="off" /></label>' +
    '<label class="f"><span>Code retrieval API prefix (بادئة API لجلب الرمز) (optional (اختياري))</span>' +
    '<input id="ztToapiBase" placeholder="https://example.com or http://ip:port" /></label>' +
    '<label class="f"><span>tdata local password passcode (optional) (رمز كلمة مرور tdata المحلية (اختياري))</span>' +
    '<input id="ztToapiTdataPass" type="password" placeholder="Fill only if Desktop has a local password (املأ فقط إذا كان لدى تطبيق سطح المكتب كلمة مرور محلية)" autocomplete="off" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm write" onclick="ztToapi()">Start API conversion (بدء تحويل API)</button></div>' +
    '<div id="ztToapiOut" style="margin:6px 0"></div>' +

    '<h4 style="margin:14px 0 4px">Five: Format conversion (خمسة: تحويل الصيغة)</h4>' +
    '<div class="muted" style="margin-bottom:4px">/convert: Session → Tdata (requires opentele) or Tdata → Session (built-in parsing). (/convert: Session → Tdata (يتطلب opentele) أو Tdata → Session (تحليل مدمج).) </div> ' +
    '<label class="f"><span>direction (الاتجاه)</span>' +
    '<select id="ztCvtMode">' +
    '<option value="session_to_tdata">Session → Tdata</option>' +
    '<option value="tdata_to_session">Tdata → Session</option>' +
    '</select></label>' +
    '<label class="f"><span>account pack (حزمة حساب) zip</span>' +
    '<input type="file" id="ztCvtFile" accept=".zip" /></label>' +
    '<label class="f"><span>tdata local password passcode (only for Tdata→Session, optional) (رمز كلمة مرور tdata المحلية (فقط لـ Tdata→Session، اختياري))</span>' +
    '<input id="ztCvtPass" type="password" placeholder="If it has a passcode, fill it in (إذا كانت تحتوي على رمز مرور فأدخله)" autocomplete="off" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm write" onclick="ztConvert()">Start conversion (بدء التحويل)</button></div>' +
    '<div id="ztCvtOut" style="margin:6px 0 12px"></div>' +

    '<h4 style="margin:10px 0 4px">Six: Passkey (ستة: Passkey)</h4>' +
    '<div class="muted" style="margin-bottom:4px">/passkey Creation direction: upload a session account pack; initialize Passkey, register, and download JSON credentials. (/passkey اتجاه الإنشاء: ارفع حزمة حساب session؛ هيّئ Passkey وسجّل ونزّل بيانات اعتماد JSON.) </div> ' +
    '<label class="f"><span>session account pack (حزمة حساب) zip</span>' +
    '<input type="file" id="ztPkFile" accept=".zip" /></label>' +
    '<div class="row" style="gap:8px">' +
    '<button class="sm write" onclick="ztPasskey()">Create Passkey credential pack (إنشاء حزمة بيانات اعتماد Passkey)</button></div>' +
    '<div id="ztPkOut" style="margin:6px 0"></div>';

  if (readonly) box.querySelectorAll('.write').forEach(function (b) { b.disabled = true; });
}
/* ---------- ZIP tool: Actions ---------- */

function ztBtns(job, url, filename) {
  return '<div class="row" style="gap:8px;margin-top:6px">' +
    '<button class="sm" onclick="ztDownload(\'' + url + '\',\'' + filename + '\')">' +
    'Download (تنزيل) ' + filename + '</button>' +
    '<button class="sm" onclick="ztCleanup(\'' + job + '\')">Delete when done (احذف بعد الانتهاء)</button></div>';
}

async function ztCleanup(job) {
  try {
    await ztFetch('/api/tools/unpack/' + encodeURIComponent(job), {method: 'DELETE'});
    toast('Temporary server files have been deleted (تم حذف الملفات المؤقتة على الخادم)', 'ok');
    renderZt();
  } catch (e) {
    toast(e.message, 'err');
  }
}

async function ztAnalyze() {
  const fs = ztFile('#ztUpFile');
  if (!fs) { toast('Select an account pack first (حدد حزمة حساب أولًا)', 'err'); return; }
  ztSay('#ztUnpackOut', '<span class="muted">Analyzing (جارٍ التحليل)…</span>');
  try {
    const r = await ztFetch('/api/tools/unpack/analyze', {method: 'POST', body: fs[0]});
    ztSay('#ztUnpackOut', '<span class="ok">The pack contains <b>' + r.total + ' accounts (تحتوي الحزمة على ' + r.total + ' حسابًا)</b></span><span class="muted"> (Not split yet; preview only (لم تُقسّم بعد؛ مجرد معاينة))</span>');
  } catch (e) {
    ztSay('#ztUnpackOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztUnpack() {
  const fs = ztFile('#ztUpFile');
  if (!fs) { toast('Select an account pack first (حدد حزمة حساب أولًا)', 'err'); return; }
  const fmt = String(($('#ztFmt') || {}).value || '').trim();
  if (!fmt) { toast('Enter a split format, for example -9- or 5,5,5 (أدخل صيغة تقسيم، مثل -9- أو 5,5,5)', 'err'); return; }
  ztSay('#ztUnpackOut', '<span class="muted">Splitting; large packs may take longer (جارٍ التقسيم؛ قد تستغرق الحزم الكبيرة وقتًا أطول)…</span>');
  try {
    // ztConc Returned value is ?workers=; this already has ?fmt= ; replace with &
    const r = await ztFetch('/api/tools/unpack?fmt=' + encodeURIComponent(fmt) +
      ztConc('#ztUpConc').replace('?', '&'), {method: 'POST', body: fs[0]});
    ZT_JOB = r.job;
    let h = '<span class="ok">' + r.total + ' accounts (حسابات ' + r.total + ') → ' + r.pack_count + ' packs (حزم ' + r.pack_count + ')</span>' +
      '<span class="muted"> (concurrency (التوازي) ' + r.workers + ')</span>';
    h += '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">';
    (r.packs || []).forEach(function (pk) {
      h += '<button class="sm" onclick="ztDownload(\'' + pk.url + '\',\'' +
        pk.filename + '\')">' + esc(pk.filename) + ' (' + pk.size + ' items (عناصر ' + pk.size + '))</button>';
    });
    h += '</div><div class="row" style="margin-top:6px">' +
      '<button class="sm" onclick="ztCleanup(\'' + r.job + '\')">Delete when done (احذف بعد الانتهاء)</button></div>';
    ztSay('#ztUnpackOut', h);
  } catch (e) {
    ztSay('#ztUnpackOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztMergeAdd() {
  const fs = ztFile('#ztMergeFiles');
  if (!fs) { toast('Select an account pack first (حدد حزمة حساب أولًا)', 'err'); return; }
  ztSay('#ztMergeOut', '<span class="muted">Uploading (جارٍ الرفع)…</span>');
  try {
    // Upload one file at a time into the same job
    for (let i = 0; i < fs.length; i++) {
      const q = ZT_MERGE_JOB ? ('?job=' + encodeURIComponent(ZT_MERGE_JOB)) : '';
      const r = await ztFetch('/api/tools/merge/add' + q, {method: 'POST', body: fs[i]});
      ZT_MERGE_JOB = r.job;
      ZT_MERGE_N = r.count;
      ztSay('#ztMergeOut', '<span class="muted">Uploaded ' + r.count + ' packages (تم رفع ' + r.count + ' حزم)…</span>');
    }
    ztSay('#ztMergeN', 'Queued packages: ' + ZT_MERGE_N + ' (الحزم المجمعة: ' + ZT_MERGE_N + ')');
    ztSay('#ztMergeOut', '<span class="ok">Queued ' + ZT_MERGE_N +
      ' packages (تم تجميع ' + ZT_MERGE_N + ' حزم)</span><span class="muted">; you can add more files, then click Start Merge (يمكنك إضافة ملفات أخرى ثم النقر على بدء الدمج)</span>');
    const el = $('#ztMergeFiles');
    if (el) el.value = '';
  } catch (e) {
    ztSay('#ztMergeOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztMergeRun() {
  if (!ZT_MERGE_JOB) { toast('Add the packs to merge first (أضف الحزم المراد دمجها أولًا)', 'err'); return; }
  ztSay('#ztMergeOut', '<span class="muted">Merging (جارٍ الدمج)…</span>');
  try {
    const r = await ztFetch('/api/tools/merge/' + encodeURIComponent(ZT_MERGE_JOB) +
      '/run' + ztConc('#ztMergeConc'), {method: 'POST'});
    let h = '<span class="ok">' + r.sources + ' source packs (حزم المصدر: ' + r.sources + ') → ' + r.total + ' accounts (الحسابات: ' + r.total + ')</span>';
    if (r.renamed) h += '<span class="muted">' + r.renamed + ' duplicate names renamed automatically (تمت إعادة تسمية ' + r.renamed + ' أسماء مكررة تلقائيًا؛ no accounts were lost (لم تُفقد حسابات))</span>';
    if (r.skipped && r.skipped.length) h += '<div class="err">' + r.skipped.length + ' packs could not be read (تعذر قراءة ' + r.skipped.length + ' حزم): ' + esc(r.skipped.map(function (s) {
      return (s.src || '?') + ' ' + (s.reason || '');
    }).join('; ')) + '</div>';
    h += '<div class="muted">Concurrency ' + r.workers + ' (التوازي: ' + r.workers + ') · source packs deleted (حُذفت حزم المصدر)</div>';
    h += ztBtns(r.job, r.url, 'merged.zip');
    ztSay('#ztMergeOut', h);
    ZT_MERGE_JOB = null; ZT_MERGE_N = 0;
    ztSay('#ztMergeN', 'Queued packages: 0 (الحزم المجمعة: 0)');
  } catch (e) {
    ztSay('#ztMergeOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztRegtime() {
  const fs = ztFile('#ztRegFile');
  if (!fs) { toast('Select an account pack first (حدد حزمة حساب أولًا)', 'err'); return; }
  ztSay('#ztRegOut', '<span class="muted">Classifying (جارٍ التصنيف)…</span>');
  try {
    const r = await ztFetch('/api/tools/regtime' + ztConc('#ztRegConc'),
      {method: 'POST', body: fs[0]});
    let h = '<span class="ok">' + r.total + ' accounts (الحسابات: ' + r.total + '); resolved ' + r.resolved + ' (تم استخراج ' + r.resolved + ')</span>';
    if (r.unknown) h += '<span class="muted">' + r.unknown + ' dates unknown (تواريخ غير معروفة: ' + r.unknown + ') — placed in unknown directory; none lost (وُضعت في مجلد unknown؛ لم يُفقد شيء)</span>';
    h += '<div class="muted">' + (r.online ? 'Looked up online this time (تم البحث عبر الإنترنت هذه المرة)' : 'Fully offline; no data was sent out (دون اتصال طوال الوقت؛ لم تُرسل أي بيانات)') + ' · concurrency ' + r.workers + ' (التوازي: ' + r.workers + ')</div>';
    const g = r.groups || {};
    const keys = Object.keys(g).sort();
    if (keys.length) {
      h += '<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:4px">';
      keys.forEach(function (k) {
        h += '<span class="pill">' + esc(k) + ' × ' + g[k] + '</span>';
      });
      h += '</div>';
    }
    h += ztBtns(r.job, r.url, 'regtime.zip');
    ztSay('#ztRegOut', h);
  } catch (e) {
    ztSay('#ztRegOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztToapi() {
  const fs = ztFile('#ztToapiFile');
  if (!fs) { toast('Select an account pack first (حدد حزمة حساب أولًا)', 'err'); return; }
  const mode = ($('#ztToapiMode') && $('#ztToapiMode').value) || 'from_json';
  const password = ($('#ztToapiPass') && $('#ztToapiPass').value) || '';
  const apiBase = ($('#ztToapiBase') && $('#ztToapiBase').value) || '';
  const tdataPass = ($('#ztToapiTdataPass') && $('#ztToapiTdataPass').value) || '';
  if (mode === 'manual' && !String(password).trim()) {
    toast('Manual mode requires a common 2FA password (الوضع اليدوي يتطلب كلمة مرور 2FA موحدة)', 'err'); return;
  }
  ztSay('#ztToapiOut', '<span class="muted">Converting (جارٍ التحويل)…</span>');
  try {
    let q = '?mode=' + encodeURIComponent(mode);
    if (password) q += '&password=' + encodeURIComponent(password);
    if (apiBase) q += '&api_base=' + encodeURIComponent(apiBase);
    if (tdataPass) q += '&tdata_passcode=' + encodeURIComponent(tdataPass);
    const r = await ztFetch('/api/tools/toapi' + q, {method: 'POST', body: fs[0]});
    let h = '<span class="ok">Succeeded ' + r.total + ' items (نجح ' + r.total + ' عنصرًا)</span>';
    if (r.failed) h += '<span class="muted">, failed ' + r.failed + ' (فشل ' + r.failed + ')</span>';
    h += '<div class="muted">Code prefix (بادئة الرمز): ' + esc(r.api_base || '') + ' · Mode (الوضع): ' + esc(r.mode || mode) + '</div>';
    if (r.errors && r.errors.length) {
      h += '<div class="err" style="font-size:12px">' + esc(r.errors.map(function (e) {
        return (e.source || '?') + ': ' + (e.error || '');
      }).join('; ')) + '</div>';
    }
    h += ztBtns(r.job, r.url, 'toapi.zip');
    ztSay('#ztToapiOut', h);
  } catch (e) {
    ztSay('#ztToapiOut', '<span class="err">' + esc(e.message) + '</span>');
  }
}

async function ztConvert() {
  const files = ztFile('ztCvtFile');
  if (!files || !files.length) { toast('Select account packs (حدد حزم الحسابات) zip', 'err'); return; }
  const mode = ($('#ztCvtMode') && $('#ztCvtMode').value) || 'session_to_tdata';
  const pass = ($('#ztCvtPass') && $('#ztCvtPass').value) || '';
  const q = new URLSearchParams({mode: mode});
  if (pass) q.set('password', pass);
  ztSay('ztCvtOut', '<span class="muted">Converting formats (جارٍ تحويل الصيغ)…</span>');
  try {
    progress(true);
    const r = await ztFetch('/api/tools/convert?' + q.toString(), {
      method: 'POST', body: files[0],
      headers: Object.assign({'X-Filename': files[0].name}, ztAuth()),
    });
    const html = 'complete (اكتمل): succeeded (نجح) ' + (r.succeeded || 0) + ' / total (إجمالي) ' + (r.total || 0) +
      (r.url ? ztBtns(r.job, r.url, r.filename || 'convert.zip') : '');
    ztSay('ztCvtOut', html);
    out(r, true);
    toast('Format conversion complete (اكتمل تحويل الصيغة)', 'ok');
  } catch (e) {
    const msg = String(e.message || e);
    ztSay('ztCvtOut', '<span style="color:#e88">' + esc(msg) + '</span>');
    if (/opentele/i.test(msg)) {
      const go = await uiConfirm({
        title: 'Required (مطلوب) opentele',
        message: msg + '\\n\\nInstall with one click? (هل تثبّت بنقرة واحدة؟) opentele?',
        okText: 'Install now (التثبيت الآن)',
      });
      if (go) {
        try {
          const r = await api('/api/system/install-opentele', {method:'POST', body:'{}'});
          toast(r.message || 'Installed (مثبّت)', 'ok');
        } catch (e2) { toast('install failed (تثبيت فشل): ' + e2.message, 'err'); }
      }
    } else toast('Format conversion failed (فشل تحويل الصيغة): ' + msg, 'err');
  } finally { progress(false); }
}

async function ztPasskey() {
  const files = ztFile('ztPkFile');
  if (!files || !files.length) { toast('Please select a session account pack zip (يرجى تحديد ملف zip لحزمة حسابات الجلسات)', 'err'); return; }
  ztSay('ztPkOut', '<span class="muted">Processing (جارٍ المعالجة)…</span>');
  try {
    progress(true);
    const r = await ztFetch('/api/tools/passkey?mode=create', {
      method: 'POST', body: files[0],
      headers: Object.assign({'X-Filename': files[0].name}, ztAuth()),
    });
    ztSay('ztPkOut', 'Complete: succeeded ' + (r.succeeded || 0) + ' / total ' + (r.total || 0) + ' (اكتمل: نجح ' + (r.succeeded || 0) + ' / الإجمالي ' + (r.total || 0) + ')' + (r.url ? ztBtns(r.job, r.url, r.filename || 'passkey.zip') : ''));
    out(r, true);
    toast('Passkey credential pack generated (تم إنشاء حزمة بيانات اعتماد Passkey)', 'ok');
  } catch (e) {
    ztSay('ztPkOut', '<span style="color:#e88">' + esc(String(e.message || e)) + '</span>');
    toast('Passkey failed (فشل): ' + e.message, 'err');
  } finally { progress(false); }
}




/* ---------- AI Assistant panel ---------- */
let AI_CFG = null;
let AI_MSGS = []; // {role, content}
const AI_HIST_KEY = 'tam_ai_chat_history_v1';
const AI_HIST_MAX = 80;

function aiSaveHistory() {
  try {
    const slim = (AI_MSGS || []).slice(-AI_HIST_MAX).map(function (m) {
      return {role: m.role, content: String(m.content || '').slice(0, 12000)};
    });
    localStorage.setItem(AI_HIST_KEY, JSON.stringify(slim));
  } catch (_) {}
}

function aiLoadHistory() {
  try {
    const raw = localStorage.getItem(AI_HIST_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || !arr.length) return;
    AI_MSGS = arr.filter(function (m) {
      return m && (m.role === 'user' || m.role === 'assistant') && m.content;
    }).slice(-AI_HIST_MAX);
  } catch (_) {
    AI_MSGS = [];
  }
}

function aiRenderHistory() {
  const box = $('#aiMsgs');
  if (!box) return;
  box.innerHTML = '';
  if (!AI_MSGS.length) {
    box.innerHTML = '<div class="ai-row sys"><div class="ai-bubble sys">No conversation yet. Enable AI in “Configuration and Permissions” to ask questions. History is saved in this browser. (لا توجد محادثة بعد. فعّل AI في «الإعدادات والصلاحيات» لطرح الأسئلة. يُحفظ السجل في هذا المتصفح.)</div></div>';
    return;
  }
  AI_MSGS.forEach(function (m) {
    aiAppendBubble(m.role === 'user' ? 'user' : 'bot', m.content);
  });
  const tip = document.createElement('div');
  tip.className = 'ai-row sys';
  tip.innerHTML = '<div class="ai-bubble sys">Restored local history (تمت استعادة السجل المحلي) ' + AI_MSGS.length + ' entry (إدخال) (this browser only (هذا المتصفح فقط))</div>';
  box.appendChild(tip);
  box.scrollTop = box.scrollHeight;
}

async function aiClearHistory() {
  if (!confirm('Clear the current AI conversation history? (مسح سجل محادثة AI الحالي؟)')) return;
  AI_MSGS = [];
  try { localStorage.removeItem(AI_HIST_KEY); } catch (_) {}
  aiRenderHistory();
  toast('Conversation history cleared (تم مسح سجل المحادثة)', 'ok');
}




function aiProviderChange() {
  const sel = $('#aiProvider');
  const hint = $('#aiProviderHint');
  const base = $('#aiBase');
  if (!sel || !AI_CFG || !AI_CFG.providers) return;
  const meta = AI_CFG.providers[sel.value] || {};
  if (hint) hint.textContent = meta.hint || '';
  // Auto-fill only when the base is empty or still has a default value.
  if (base && meta.default_base) {
    const cur = (base.value || '').trim();
    const defaults = Object.keys(AI_CFG.providers).map(function (k) {
      return (AI_CFG.providers[k] && AI_CFG.providers[k].default_base) || '';
    });
    if (!cur || defaults.indexOf(cur) >= 0) base.value = meta.default_base;
  }
}

function aiApplyPromptPreset() {
  const sel = $('#aiPromptPreset');
  const ta = $('#aiSys');
  if (!sel || !ta || !AI_CFG || !AI_CFG.prompt_presets) return;
  const k = sel.value;
  if (k === '_custom') return;
  const item = AI_CFG.prompt_presets[k];
  if (item && item.text) ta.value = item.text;
}

function initAiFabDrag() {
  const fab = $('#aiFab');
  if (!fab || fab._dragBound) return;
  fab._dragBound = true;
  const KEY = 'tam_ai_fab_pos';
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved.left === 'number' && typeof saved.top === 'number') {
      fab.style.left = saved.left + 'px';
      fab.style.top = saved.top + 'px';
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
    }
  } catch (_) {}

  let dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;

  function point(ev) {
    if (ev.touches && ev.touches[0]) return {x: ev.touches[0].clientX, y: ev.touches[0].clientY};
    return {x: ev.clientX, y: ev.clientY};
  }
  function onStart(ev) {
    const p = point(ev);
    const rect = fab.getBoundingClientRect();
    dragging = true;
    moved = false;
    sx = p.x; sy = p.y;
    ox = rect.left; oy = rect.top;
    fab.classList.add('dragging');
    ev.preventDefault();
  }
  function onMove(ev) {
    if (!dragging) return;
    const p = point(ev);
    const dx = p.x - sx, dy = p.y - sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    let left = ox + dx, top = oy + dy;
    const maxL = window.innerWidth - fab.offsetWidth - 4;
    const maxT = window.innerHeight - fab.offsetHeight - 4;
    left = Math.max(4, Math.min(left, maxL));
    top = Math.max(4, Math.min(top, maxT));
    fab.style.left = left + 'px';
    fab.style.top = top + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
    ev.preventDefault();
  }
  function onEnd(ev) {
    if (!dragging) return;
    dragging = false;
    fab.classList.remove('dragging');
    try {
      localStorage.setItem(KEY, JSON.stringify({
        left: parseFloat(fab.style.left) || 0,
        top: parseFloat(fab.style.top) || 0,
      }));
    } catch (_) {}
    if (!moved) openAiPanel();
  }
  fab.addEventListener('mousedown', onStart);
  fab.addEventListener('touchstart', onStart, {passive: false});
  window.addEventListener('mousemove', onMove, {passive: false});
  window.addEventListener('touchmove', onMove, {passive: false});
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);
}
document.addEventListener('DOMContentLoaded', initAiFabDrag);
if (document.readyState !== 'loading') try { initAiFabDrag();
try { initAiPanelResize(); } catch (_) {} } catch (_) {}



function initAiPanelResize() {
  const panel = $('#aiPanel');
  const handle = $('#aiResize');
  if (!panel || !handle || handle._bound) return;
  handle._bound = true;
  const KEY = 'tam_ai_panel_width';
  const MIN = 320;
  const MAX_RATIO = 0.92;

  function maxW() { return Math.floor(window.innerWidth * MAX_RATIO); }

  function applyWidth(w) {
    w = Math.max(MIN, Math.min(maxW(), Math.round(w)));
    panel.style.width = w + 'px';
    try { localStorage.setItem(KEY, String(w)); } catch (_) {}
    return w;
  }

  function restore() {
    try {
      const n = parseInt(localStorage.getItem(KEY) || '', 10);
      if (n >= MIN) applyWidth(n);
    } catch (_) {}
  }
  restore();

  let dragging = false, startX = 0, startW = 0;
  function onDown(ev) {
    const p = ev.touches ? ev.touches[0] : ev;
    dragging = true;
    startX = p.clientX;
    startW = panel.getBoundingClientRect().width;
    panel.classList.add('resizing');
    ev.preventDefault();
  }
  function onMove(ev) {
    if (!dragging) return;
    const p = ev.touches ? ev.touches[0] : ev;
    // The panel is on the right: dragging left makes it wider.
    const dx = startX - p.clientX;
    applyWidth(startW + dx);
    ev.preventDefault();
  }
  function onUp() {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('resizing');
  }
  handle.addEventListener('mousedown', onDown);
  handle.addEventListener('touchstart', onDown, {passive: false});
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, {passive: false});
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
  window.addEventListener('resize', function () {
    const cur = panel.getBoundingClientRect().width;
    if (cur > maxW()) applyWidth(maxW());
  });
}

function openAiPanel() {
  const p = $('#aiPanel');
  if (!p) return;
  p.classList.add('on');
  p.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  loadAiConfig();
  try { bindAiInput(); } catch (_) {}
}
function closeAiPanel() {
  const p = $('#aiPanel');
  if (p) {
    p.classList.remove('on');
    p.setAttribute('aria-hidden', 'true');
  }
  // Do not close another modal unless there is no modal; unlock the body then.
  if (!document.querySelector('.modal.on')) document.body.classList.remove('modal-open');
}
function aiShowTab(name) {
  const chat = name === 'chat';
  $('#aiTabChat').classList.toggle('on', chat);
  $('#aiTabCfg').classList.toggle('on', !chat);
  $('#aiPaneChat').classList.toggle('on', chat);
  $('#aiPaneCfg').classList.toggle('on', !chat);
  if (!chat) renderAiConfigForm();
}

async function loadAiConfig() {
  try {
    AI_CFG = await api('/api/ai/config');
    const st = $('#aiStatus');
    if (st) {
      st.textContent = AI_CFG.enabled ? ('Enabled (مفعّل) · ' + (AI_CFG.preset || '')) : 'Disabled (معطّل)';
      st.className = 'pill' + (AI_CFG.enabled ? ' s-ok' : '');
    }
    if ($('#aiPaneCfg') && $('#aiPaneCfg').classList.contains('on')) renderAiConfigForm();
  } catch (e) {
    toast('Failed to load AI configuration (فشل تحميل إعدادات AI): ' + e.message, 'err');
  }
}

function renderAiConfigForm() {
  const box = $('#aiCfgForm');
  if (!box || !AI_CFG) return;
  const c = AI_CFG;
  const presets = c.presets || {};
  const presetOpts = Object.keys(presets).map(function (k) {
    return '<option value="' + esc(k) + '"' + (c.preset === k ? ' selected' : '') + '>' +
      esc(presets[k] || k) + '</option>';
  }).join('');
  const catalog = c.catalog || [];
  const tools = c.tools || {};
  let enabledCount = 0;
  catalog.forEach(function (t) { if (tools[t.name]) enabledCount++; });

  let perm = '';
  let last = '';
  catalog.forEach(function (t) {
    if (t.danger !== last) {
      last = t.danger;
      const title = last === 'read' ? 'Read-only tool (أداة للقراءة فقط)' : (last === 'write' ? 'Write tool (أداة للكتابة)' : 'Dangerous tool (أداة خطرة) (visible externally)');
      perm += '<div class="ai-perm-group">' + title + '</div>';
    }
    const on = tools[t.name] ? ' checked' : '';
    perm += '<div class="ai-perm-row">' +
      '<input type="checkbox" id="ai_t_' + esc(t.name) + '"' + on +
      ' onchange="aiUpdatePermCount()" />' +
      '<label for="ai_t_' + esc(t.name) + '"><code>' + esc(t.name) + '</code>' +
      '<span class="ai-badge d-' + esc(t.danger) + '">' + esc(t.danger) + '</span>' +
      '<span class="ai-perm-desc">' + esc(t.description || '') + '</span></label></div>';
  });

  const keyHint = c.api_key_set
    ? ('Saved ' + esc(c.api_key_masked || '****') + '; leave empty to keep it unchanged (محفوظ؛ اتركه فارغًا للإبقاء عليه دون تغيير)')
    : 'Key not saved yet (لم يُحفظ المفتاح بعد)';

  box.innerHTML =
    '<div class="ai-card">' +
      '<div class="ai-switch-row">' +
        '<div><div class="ai-switch-label">Enable AI assistant (تفعيل مساعد AI)</div>' +
        '<div class="ai-switch-sub">After disabling and saving, chat cannot send; permissions and key are retained. (بعد التعطيل والحفظ لا يمكن إرسال المحادثات؛ تبقى الصلاحيات والمفتاح محفوظة.)</div></div>' +
        '<label class="row" style="gap:6px;margin:0"><input type="checkbox" id="aiEnabled"' +
        (c.enabled ? ' checked' : '') + ' /></label>' +
      '</div>' +
    '</div>' +

    '<div class="ai-card">' +
      '<h4><span class="ai-step">1</span>Provider and key (المزوّد والمفتاح)</h4>' +
      '<label class="f"><span>API format (صيغة API)</span><select id="aiProvider" onchange="aiProviderChange()">' +
      Object.keys(c.providers || {openai_compatible:{label:'OpenAI-compatible (متوافق مع OpenAI)'}}).map(function (k) {
        const lab = (c.providers[k] && c.providers[k].label) || k;
        return '<option value="' + esc(k) + '"' +
          ((c.provider || 'openai_compatible') === k ? ' selected' : '') + '>' + esc(lab) + '</option>';
      }).join('') + '</select></label>' +
      '<div class="ai-hint" id="aiProviderHint">Choose the format matching your API documentation (اختر الصيغة المطابقة لوثائق API الخاصة بك)</div>' +
      '<label class="f"><span>API Base URL</span>' +
      '<input id="aiBase" value="' + esc(c.base_url || '') + '" placeholder="https://api.openai.com/v1" /></label>' +
      '<label class="f"><span>API Key · ' + keyHint + '</span>' +
      '<input id="aiKey" type="password" placeholder="Paste the key; plaintext will not be echoed (ألصق المفتاح؛ لن يظهر النص الصريح)" autocomplete="off" /></label>' +
      '<label class="row muted" style="gap:6px;margin:0 0 8px;font-size:12px">' +
      '<input type="checkbox" id="aiClearKey" /> Clear saved key (مسح المفتاح المحفوظ)</label>' +
      '<label class="f"><span>Model name (اسم النموذج)</span>' +
      '<input id="aiModel" value="' + esc(c.model || '') + '" placeholder="gpt-4o-mini / claude-… / gemini-…" /></label>' +
    '</div>' +

    '<div class="ai-card">' +
      '<h4><span class="ai-step">2</span>Context and generation (السياق والتوليد)</h4>' +
      '<label class="f"><span>Prompt preset (إعداد المطالبة)</span><select id="aiPromptPreset" onchange="aiApplyPromptPreset()">' +
      Object.keys(c.prompt_presets || {}).map(function (k) {
        const lab = (c.prompt_presets[k] && c.prompt_presets[k].label) || k;
        return '<option value="' + esc(k) + '"' + (c.prompt_preset === k ? ' selected' : '') + '>' + esc(lab) + '</option>';
      }).join('') +
      '<option value="_custom"' + ((!c.prompt_preset || c.prompt_preset === '_custom') ? ' selected' : '') + '>Custom (مخصص)</option>' +
      '</select></label>' +
      '<label class="f"><span>System prompt (موجه النظام)</span><textarea id="aiSys" rows="3">' + esc(c.system_prompt || '') + '</textarea></label>' +
      '<div class="ai-grid2">' +
        '<label class="f"><span>Tool rounds (جولات الأدوات)</span>' +
        '<input id="aiRounds" type="number" min="1" max="12" value="' + esc(String(c.max_tool_rounds || 6)) + '" /></label>' +
        '<label class="f"><span>Temperature (الحرارة)</span>' +
        '<input id="aiTemp" type="number" step="0.1" min="0" max="2" value="' + esc(String(c.temperature ?? 0.2)) + '" /></label>' +
      '</div>' +
      '<div style="margin:10px 0 6px;padding-top:8px;border-top:1px solid var(--border)">' +
        '<div style="font-size:12.5px;font-weight:650;margin-bottom:8px">Context limit (حد السياق) (customizable (قابل للتخصيص))</div>' +
        '<label class="row" style="gap:8px;margin:0 0 8px;font-size:12.5px">' +
        '<input type="checkbox" id="aiAutoCompress"' + (c.auto_compress !== false ? ' checked' : '') + ' />' +
        '<span>Compress earlier conversations automatically when over the limit (ضغط المحادثات الأقدم تلقائيًا عند تجاوز الحد)</span></label>' +
        '<div class="ai-grid2">' +
          '<label class="f"><span>Number of recent messages to keep (عدد الرسائل الأخيرة المحتفظ بها)</span>' +
          '<input id="aiKeepRecent" type="number" min="2" max="80" value="' + esc(String(c.context_keep_recent || 8)) + '" /></label>' +
          '<label class="f"><span>Character limit (حد الأحرف؛ تقريبي)</span>' +
          '<input id="aiMaxChars" type="number" min="2000" max="200000" step="1000" value="' + esc(String(c.context_max_chars || 14000)) + '" /></label>' +
        '</div>' +
        '<div class="ai-hint">Default: 14000 characters. Adjust to the model context or make it smaller; effective immediately after saving. Compression affects only content sent to the model; full bubbles remain visible. (الافتراضي: 14000 حرفًا. عدّل حسب سياق النموذج أو اجعله أصغر؛ يسري فور الحفظ. يؤثر الضغط في المحتوى المرسل للنموذج فقط؛ تبقى الفقاعات كاملة ظاهرة.)</div>' +
      '</div>' +
    '</div>' +

    '<div class="ai-card">' +
      '<h4><span class="ai-step">3</span>Permissions and scope (الصلاحيات والنطاق)</h4>' +
      '<label class="f"><span>Permission preset (إعداد الصلاحيات)</span><select id="aiPreset">' + presetOpts + '</select></label>' +
      '<div class="ai-perm-toolbar">' +
        '<button type="button" class="sm write" onclick="applyAiPresetOnly()">Apply preset to selected (تطبيق الإعداد على المحدد)</button>' +
        '<button type="button" class="sm" onclick="aiPermSetAll(true)">Select all (تحديد الكل)</button>' +
        '<button type="button" class="sm" onclick="aiPermSetAll(false)">Select none (إلغاء تحديد الكل)</button>' +
        '<button type="button" class="sm" onclick="aiPermSetDanger(\'read\')">Read-only only (للقراءة فقط)</button>' +
      '</div>' +
      '<div class="ai-hint">Enabled (مفعّل): <strong id="aiPermCount">' + enabledCount + '</strong> / ' + catalog.length +
      ' tools. Click “Save” to apply; login/import/export session is never allowed. ( أداة. انقر «حفظ» للتطبيق؛ لا يُسمح أبدًا بتسجيل الدخول أو استيراد/تصدير الجلسات.)</div>' +
      '<div class="ai-perm-list">' + perm + '</div>' +
      '<label class="f" style="margin-top:12px"><span>Allowed account ID (معرّف الحساب المسموح) (comma-separated; empty = all (مفصولة بفواصل؛ الفارغ = الكل))</span>' +
      '<input id="aiAccounts" value="' + esc((c.allow_account_ids || []).join(',')) + '" placeholder="for example (مثلًا) 1,2,5" /></label>' +
      '<label class="row" style="gap:8px;margin:4px 0 0;font-size:12.5px">' +
      '<input type="checkbox" id="aiReqConfirm"' + (c.require_confirm_destructive !== false ? ' checked' : '') + ' />' +
      '<span>Dangerous tools (أدوات خطرة): delete/log out/delete sessions; confirmation required before execution (حذف/تسجيل الخروج/حذف الجلسات؛ يلزم التأكيد قبل التنفيذ)</span></label>' +
      '<div class="ai-hint" style="color:#d32f2f;font-size:11.5px;margin:2px 0 6px 24px;line-height:1.4">' +
      '⚠️ <strong>After disabling this, AI can directly perform irreversible actions such as account deletion without human confirmation. (⚠️ بعد تعطيل هذا الخيار، يمكن لـ AI تنفيذ إجراءات لا رجعة فيها مثل حذف الحسابات دون تأكيد بشري.)</strong> Disable only when you fully trust the model’s judgment. (عطّل فقط إذا كنت تثق تمامًا بحكم النموذج.)</div>' +
      '<label class="row" style="gap:8px;margin:4px 0 0;font-size:12.5px">' +
      '<input type="checkbox" id="aiReqWrite"' + (c.confirm_write !== false ? ' checked' : '') + ' />' +
      '<span>Mutating tools (أدوات التعديل): change 2FA/profile/privacy/send messages; confirmation required before execution (تغيير 2FA/الملف الشخصي/الخصوصية/إرسال الرسائل؛ يلزم التأكيد قبل التنفيذ)</span></label>' +
      '<div class="ai-hint" style="color:#d32f2f;font-size:11.5px;margin:2px 0 0 24px;line-height:1.4">' +
      '⚠️ <strong>Mutating actions such as changing 2FA, profile, privacy, or sending messages require confirmation before execution. (⚠️ تتطلب الإجراءات المعدّلة مثل تغيير 2FA والملف والخصوصية أو إرسال الرسائل تأكيدًا قبل التنفيذ.)</strong> Keeping it enabled is recommended. (يُنصح بإبقائه مفعّلًا.)</div>' +
    '</div>' +

    '<div class="ai-actions">' +
      '<button class="primary write" onclick="saveAiConfig()">Save configuration (حفظ الإعدادات)</button>' +
      '<button class="sm" onclick="loadAiConfig()">Reload (إعادة التحميل)</button>' +
    '</div>' +
    '<p class="ai-footnote">Configuration is stored in the server database. Supports OpenAI-compatible, Anthropic Messages, Gemini, and Azure OpenAI. (تُحفظ الإعدادات في قاعدة بيانات الخادم. تدعم OpenAI-compatible وAnthropic Messages وGemini وAzure OpenAI.)</p>';
  try { aiProviderChange(); } catch (_) {}
  try { aiUpdatePermCount(); } catch (_) {}
}

function aiUpdatePermCount() {
  const el = $('#aiPermCount');
  if (!el || !AI_CFG) return;
  let n = 0;
  (AI_CFG.catalog || []).forEach(function (t) {
    const cb = $('#ai_t_' + t.name);
    if (cb && cb.checked) n++;
  });
  el.textContent = String(n);
}

function aiPermSetAll(on) {
  (AI_CFG && AI_CFG.catalog || []).forEach(function (t) {
    const cb = $('#ai_t_' + t.name);
    if (cb) cb.checked = !!on;
  });
  aiUpdatePermCount();
}

function aiPermSetDanger(level) {
  (AI_CFG && AI_CFG.catalog || []).forEach(function (t) {
    const cb = $('#ai_t_' + t.name);
    if (cb) cb.checked = (t.danger === level);
  });
  aiUpdatePermCount();
}

function aiPresetChange() {
  /* UI hint only; actually apply by sending preset without tools when saving, or by submitting all selected states as custom */
}

function collectAiConfigBody() {
  // When the form is not rendered, do not incorrectly write enabled as false
  const formReady = !!($('#aiEnabled'));
  const tools = {};
  const catalog = (AI_CFG && AI_CFG.catalog) || [];
  catalog.forEach(function (t) {
    const el = $('#ai_t_' + t.name);
    if (el) tools[t.name] = !!el.checked;
    else if (AI_CFG && AI_CFG.tools) tools[t.name] = !!AI_CFG.tools[t.name];
  });
  const accRaw = ($('#aiAccounts') && $('#aiAccounts').value || '').trim();
  const allow = accRaw ? accRaw.split(/[,\uFF0C\s]+/).map(function (x) { return parseInt(x, 10); }).filter(function (n) { return n > 0; }) : [];
  const prev = AI_CFG || {};
  const body = {
    enabled: formReady ? !!$('#aiEnabled').checked : !!prev.enabled,
    provider: ($('#aiProvider') && $('#aiProvider').value) || prev.provider || 'openai_compatible',
    base_url: ($('#aiBase') && $('#aiBase').value || '').trim() || (prev.base_url || ''),
    model: ($('#aiModel') && $('#aiModel').value || '').trim() || (prev.model || ''),
    system_prompt: ($('#aiSys') && $('#aiSys').value != null) ? $('#aiSys').value : (prev.system_prompt || ''),
    prompt_preset: (function () {
      const v = ($('#aiPromptPreset') && $('#aiPromptPreset').value) || '_custom';
      return v === '_custom' ? '_custom' : v;
    })(),
    max_tool_rounds: parseInt(($('#aiRounds') && $('#aiRounds').value) || prev.max_tool_rounds || '6', 10),
    temperature: parseFloat(($('#aiTemp') && $('#aiTemp').value) || prev.temperature || '0.2'),
    auto_compress: $('#aiAutoCompress') ? !!$('#aiAutoCompress').checked : (prev.auto_compress !== false),
    context_keep_recent: parseInt(($('#aiKeepRecent') && $('#aiKeepRecent').value) || prev.context_keep_recent || '8', 10),
    context_max_chars: parseInt(($('#aiMaxChars') && $('#aiMaxChars').value) || prev.context_max_chars || '14000', 10),
    allow_account_ids: allow.length ? allow : (prev.allow_account_ids || []),
    require_confirm_destructive: $('#aiReqConfirm') ? !!$('#aiReqConfirm').checked : (prev.require_confirm_destructive !== false),
    confirm_write: $('#aiReqWrite') ? !!$('#aiReqWrite').checked : (prev.confirm_write !== false),
    tools: tools,
    // The selection state always follows the UI -> custom; one-click preset application uses applyAiPresetOnly.
    preset: 'custom',
  };
  const key = ($('#aiKey') && $('#aiKey').value || '').trim();
  if (key) body.api_key = key;
  if ($('#aiClearKey') && $('#aiClearKey').checked) body.clear_api_key = true;
  return body;
}

async function saveAiConfig() {
  try {
    // If the configuration form has not finished rendering (for example, while on the chat page), collect it first so enabled is not incorrectly written as false.
    if (!$('#aiEnabled')) {
      try { renderAiConfigForm(); } catch (_) {}
    }
    if (!$('#aiEnabled')) {
      toast('Open the Configuration tab first, then save (افتح تبويب الإعدادات أولًا ثم احفظ)', 'err');
      return;
    }
    const body = collectAiConfigBody();
    // Always submit the current selections and enabled state; what you see is what is saved.
    const res = await api('/api/ai/config', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    AI_CFG = res;
    // Use the server response as authoritative, with the local body as a fallback to prevent missing fields.
    if (typeof AI_CFG.enabled === 'undefined') AI_CFG.enabled = body.enabled;
    const on = !!AI_CFG.enabled;
    const st = $('#aiStatus');
    if (st) {
      st.textContent = on ? ('Enabled (مفعّل) · ' + (AI_CFG.preset || 'custom')) : 'Disabled (معطّل)';
      st.className = 'pill' + (on ? ' s-ok' : '');
    }
    toast(on ? 'AI configuration saved (تم حفظ إعدادات AI)' : 'AI assistant disabled (تم تعطيل مساعد AI)', 'ok');
    try { renderAiConfigForm(); } catch (e2) {
      console.warn('renderAiConfigForm', e2);
    }
  } catch (e) {
    toast('Save failed (فشل الحفظ): ' + e.message, 'err');
  }
}

async function applyAiPresetOnly() {
  const sel = ($('#aiPreset') && $('#aiPreset').value) || 'readonly';
  if (sel === 'custom') { toast('Select read-only, Safe, Standard, Complete, or another preset (حدد القراءة فقط أو الآمن أو القياسي أو الكامل أو إعدادًا آخر)', ''); return; }
  try {
    if (!$('#aiEnabled')) {
      try { renderAiConfigForm(); } catch (_) {}
    }
    const body = {
      enabled: $('#aiEnabled') ? !!$('#aiEnabled').checked : !!(AI_CFG && AI_CFG.enabled),
      preset: sel,
      provider: ($('#aiProvider') && $('#aiProvider').value) || 'openai_compatible',
      base_url: ($('#aiBase') && $('#aiBase').value || '').trim(),
      model: ($('#aiModel') && $('#aiModel').value || '').trim(),
      system_prompt: ($('#aiSys') && $('#aiSys').value) || '',
      max_tool_rounds: parseInt(($('#aiRounds') && $('#aiRounds').value) || '6', 10),
      temperature: parseFloat(($('#aiTemp') && $('#aiTemp').value) || '0.2'),
      auto_compress: $('#aiAutoCompress') ? !!$('#aiAutoCompress').checked : true,
      require_confirm_destructive: $('#aiReqConfirm') ? !!$('#aiReqConfirm').checked : true,
      confirm_write: $('#aiReqWrite') ? !!$('#aiReqWrite').checked : true,
    };
    const key = ($('#aiKey') && $('#aiKey').value || '').trim();
    if (key) body.api_key = key;
    // Do not send tools: the server recalculates all tool switches from the preset.
    AI_CFG = await api('/api/ai/config', {method: 'PUT', body: JSON.stringify(body)});
    toast('Preset applied (تم تطبيق الإعداد): ' + sel + (AI_CFG.enabled ? ' (Assistant enabled (المساعد مفعّل))' : ' (Assistant not enabled (المساعد غير مفعّل))'), 'ok');
    const st = $('#aiStatus');
    if (st) {
      st.textContent = AI_CFG.enabled ? ('Enabled (مفعّل) · ' + (AI_CFG.preset || sel)) : 'Disabled (معطّل)';
      st.className = 'pill' + (AI_CFG.enabled ? ' s-ok' : '');
    }
    renderAiConfigForm();
  } catch (e) {
    toast('Apply failed (فشل التطبيق): ' + e.message, 'err');
  }
}

function aiEscapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Lightweight Markdown to HTML (tables / code / lists / headings / quotes) */
function aiRenderMd(src) {
  let s = String(src == null ? '' : src).replace(/\r\n/g, '\n');
  const blocks = [];
  // fenced code
  s = s.replace(/```([\w-]*)\n?([\s\S]*?)```/g, function (_, lang, code) {
    const i = blocks.length;
    blocks.push(
      '<pre><code class="lang-' + aiEscapeHtml(lang || '') + '">' +
      aiEscapeHtml(code.replace(/\n$/, '')) + '</code></pre>'
    );
    return '\n%%BLK' + i + '%%\n';
  });
  // tables (GFM)
  s = s.replace(/(?:(?:^|\n)(?:\|.+\|(?:\n|$))+)/g, function (block) {
    const lines = block.trim().split('\n').filter(Boolean);
    if (lines.length < 2 || !/^\|?\s*:?-+:?\s*\|/.test(lines[1].replace(/\s/g, '')) &&
        !/^\|?[\s|:-]+$/.test(lines[1])) {
      // second line must be separator
      if (lines.length < 2 || lines[1].indexOf('-') < 0) return block;
    }
    function splitRow(line) {
      let t = line.trim();
      if (t.startsWith('|')) t = t.slice(1);
      if (t.endsWith('|')) t = t.slice(0, -1);
      return t.split('|').map(function (c) { return c.trim(); });
    }
    const head = splitRow(lines[0]);
    let bodyStart = 1;
    if (/^[\s|:-]+$/.test(lines[1])) bodyStart = 2;
    let html = '<table><thead><tr>';
    head.forEach(function (c) { html += '<th>' + aiInlineMd(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    for (let i = bodyStart; i < lines.length; i++) {
      if (!lines[i].includes('|')) continue;
      const cells = splitRow(lines[i]);
      html += '<tr>';
      for (let j = 0; j < head.length; j++) {
        html += '<td>' + aiInlineMd(cells[j] == null ? '' : cells[j]) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    const i = blocks.length;
    blocks.push(html);
    return '\n%%BLK' + i + '%%\n';
  });

  const lines = s.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const blk = line.match(/^%%BLK(\d+)%%$/);
    if (blk) {
      out.push(blocks[parseInt(blk[1], 10)]);
      i++;
      continue;
    }
    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      out.push('<hr/>');
      i++;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const n = h[1].length;
      out.push('<h' + n + '>' + aiInlineMd(h[2]) + '</h' + n + '>');
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const qs = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qs.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push('<blockquote>' + aiInlineMd(qs.join(' ')) + '</blockquote>');
      continue;
    }
    if (/^(\s*[-*+]\s+)/.test(line)) {
      const items = [];
      while (i < lines.length && /^(\s*[-*+]\s+)/.test(lines[i])) {
        items.push('<li>' + aiInlineMd(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ul>' + items.join('') + '</ul>');
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push('<li>' + aiInlineMd(lines[i].replace(/^\s*\d+\.\s+/, '')) + '</li>');
        i++;
      }
      out.push('<ol>' + items.join('') + '</ol>');
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const paras = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^%%BLK/.test(lines[i]) &&
           !/^#{1,4}\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) &&
           !/^(\s*[-*+]\s+)/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) &&
           !/^---+$/.test(lines[i].trim())) {
      if (lines[i].includes('|') && i + 1 < lines.length && /-/.test(lines[i + 1] || '')) break;
      paras.push(lines[i]);
      i++;
    }
    out.push('<p>' + aiInlineMd(paras.join(' ')) + '</p>');
  }
  return out.join('') || '<p></p>';
}

function aiInlineMd(s) {
  let t = aiEscapeHtml(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*(?![*])/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return t;
}

function aiAppendTrace(div, trace) {
  if (!trace || !trace.length) return;
  const t = document.createElement('div');
  t.className = 'ai-trace';
  trace.forEach(function (x) {
    const ok = x.result && x.result.ok;
    const chip = document.createElement('span');
    chip.className = 'ai-chip ' + (ok ? 'ok' : 'err');
    let label = (ok ? '✓ ' : '✗ ') + (x.tool || '');
    if (!ok && x.result && x.result.error) {
      label += ' · ' + (x.result.error.message || x.result.error.code || '');
    }
    chip.textContent = label;
    chip.title = label;
    t.appendChild(chip);
  });
  div.appendChild(t);
}

function aiAppendBubble(role, text, trace) {
  const box = $('#aiMsgs');
  if (!box) return;
  const row = document.createElement('div');
  row.className = 'ai-row ' + (role === 'user' ? 'user' : (role === 'sys' ? 'sys' : 'bot'));
  const meta = document.createElement('div');
  meta.className = 'ai-meta';
  const now = new Date();
  const ts = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  meta.textContent = (role === 'user' ? 'You (أنت)' : (role === 'sys' ? 'System (النظام)' : 'assistant (المساعد)')) + ' · ' + ts;
  const div = document.createElement('div');
  div.className = 'ai-bubble ' + (role === 'user' ? 'user' : (role === 'sys' ? 'sys' : 'bot'));
  if (role === 'bot') {
    div.classList.add('ai-md');
    div.innerHTML = aiRenderMd(text || '');
  } else {
    div.textContent = text || '';
  }
  aiAppendTrace(div, trace);
  if (role !== 'sys') row.appendChild(meta);
  row.appendChild(div);
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  return row;
}

function aiShowTyping() {
  const box = $('#aiMsgs');
  if (!box) return null;
  const row = document.createElement('div');
  row.className = 'ai-row bot';
  row.id = 'aiTyping';
  row.innerHTML = '<div class="ai-meta">assistant (المساعد)</div><div class="ai-bubble bot typing">Thinking and calling tools (يفكر ويستدعي الأدوات)…</div>';
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  return row;
}

function aiHideTyping() {
  const el = $('#aiTyping');
  if (el) el.remove();
}


function aiCompressLocalHistory(msgs) {
  msgs = (msgs || []).slice();
  const keep = Math.max(2, Math.min(80, parseInt((AI_CFG && AI_CFG.context_keep_recent) || 8, 10) || 8));
  const maxChars = Math.max(2000, Math.min(200000, parseInt((AI_CFG && AI_CFG.context_max_chars) || 14000, 10) || 14000));
  const auto = !AI_CFG || AI_CFG.auto_compress !== false;
  let total = 0;
  msgs.forEach(function (m) { total += String(m.content || '').length; });
  if (!auto || (msgs.length <= keep + 2 && total <= maxChars)) {
    return msgs.map(function (m) {
      const c = String(m.content || '');
      if (c.length > 8000) return Object.assign({}, m, {content: c.slice(0, 8000) + '…(truncated (مقتطع))'});
      return m;
    });
  }
  const old = msgs.length > keep ? msgs.slice(0, -keep) : [];
  const recent = msgs.length > keep ? msgs.slice(-keep) : msgs;
  const lines = ['[Local summary]'];
  old.forEach(function (m) {
    const role = m.role === 'user' ? 'User (المستخدم)' : (m.role === 'assistant' ? 'assistant (المساعد)' : m.role);
    const c = String(m.content || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    if (c) lines.push('- ' + role + ': ' + c);
  });
  const budget = Math.min(3000, Math.floor(maxChars / 3));
  return [
    {role: 'user', content: lines.join('\n').slice(0, budget)},
    {role: 'assistant', content: 'I understand the previous summary. (فهمت الملخص السابق.)'},
  ].concat(recent);
}

// Tool name -> source description (from the server catalog; use the original name if unavailable).
function aiToolLabel(name) {
  if (!AI_CFG || !AI_CFG.catalog) return name;
  var hit = AI_CFG.catalog.filter(function (t) { return t.name === name; })[0];
  return hit ? (hit.description || name) : name;
}

// Tool-list confirmation dialog; a non-empty array means approve, null means cancel
function aiConfirmTools(pending) {
  return new Promise(function (resolve) {
    var modal = document.createElement('div');
    modal.className = 'modal on';
    modal.id = 'mAiConfirm';
    modal.style.width = 'min(680px,92vw)';

    var rows = pending.map(function (p, i) {
      var dangerous = p.danger === 'destructive';
      var args = (typeof p.arguments === 'object' && p.arguments) ? p.arguments : {};
      var argText = JSON.stringify(args, null, 2) || '{}';
      var row = document.createElement('label');
      row.style.cssText = 'display:flex;gap:8px;align-items:flex-start;cursor:pointer;' +
        'border:1px solid ' + (dangerous ? '#f66' : '#ddd') +
        ';border-radius:6px;padding:10px 12px;margin:6px 0;background:' + (dangerous ? '#fff1f1' : '#fbfbfb');
      row.innerHTML =
        '<input type="checkbox" class="ai-cf-cb" data-i="' + i + '" checked style="margin-top:3px">' +
        '<span><strong>' + aiToolLabel(p.tool) + '</strong>' +
        (dangerous ? ' <span style="color:#e53935;font-weight:bold">· Dangerous operation (عملية خطرة)</span>' : '') +
        (p.danger === 'write' ? ' <span style="color:#888;font-weight:normal">· Mutating</span>' : '') +
        '<br><code style="white-space:pre-wrap;word-break:break-all;font-size:11px;color:#444;display:inline-block;margin-top:4px">' +
          aiEscapeHtml(argText) + '</code></span>';
      return row;
    });

    modal.innerHTML =
      '<h3>AI requests the following operations; select them before execution (يطلب AI تنفيذ العمليات التالية؛ حددها قبل التنفيذ)</h3>' +
      '<div class="body" id="aiCfBody"></div>' +
      '<div class="foot"><button type="button" class="sm" id="aiCfCancel">Cancel all (إلغاء الكل)</button>' +
      '<button type="button" class="primary write" id="aiCfOk">Execute selected items (تنفيذ العناصر المحددة)</button></div>';

    var body = document.createElement('div');
    body.style.maxHeight = '46vh'; body.style.overflowY = 'auto';
    rows.forEach(function (r) { body.appendChild(r); });
    modal.querySelector('#aiCfBody').appendChild(body);

    var close = function () {
      document.removeEventListener('keydown', onKey);
      $('#bd').classList.remove('on');
      document.body.classList.remove('modal-open');
      closeAll();
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    };
    var onKey = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        close(); resolve(null);       // User presses Esc -> abandon this round of operations
      }
    };
    document.addEventListener('keydown', onKey);
    modal.querySelector('#aiCfCancel').onclick = function () {
      var appr = rows.map(function (row, i) {
        return {tool: pending[i].tool, arguments: pending[i].arguments || {}, approved: false};
      });
      close(); resolve(appr);      // Cancel all -> send the server a cancellation context
    };
    modal.querySelector('#aiCfOk').onclick = function () {
      var appr = rows.map(function (row, i) {
        var cb = row.querySelector('.ai-cf-cb');
        return {tool: pending[i].tool, arguments: pending[i].arguments || {}, approved: !!(cb && cb.checked)};
      });
      close(); resolve(appr);
    };
    document.body.appendChild(modal);
    $('#bd').classList.add('on');
    document.body.classList.add('modal-open');
  });
}

// Read the NDJSON stream and call back for each item; return a Promise resolving to a done event (with body).
// Requires fetch + ReadableStream (modern browsers). Returns a Promise resolving to a body.
function aiChatOnce(approve) {
  const body = JSON.stringify({messages: AI_MSGS, approve: approve || null});
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + ($('#token').value || ''),
  };
  return fetch('/api/ai/chat?stream=1', {method: 'POST', headers, body})
    .then(function (res) {
      if (!res.ok) {
        return res.text().then(function (raw) {
          let msg = raw;
          try { const j = JSON.parse(raw); msg = j.detail || j.message || raw; } catch (_) {}
          throw new Error(String(msg).slice(0, 400));
        });
      }
      if (!res.body || !res.body.getReader) {
        // Streaming not supported → Fall back to JSON
        return res.json();
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '';
      let liveRow = null;
      let liveDiv = null;
      let usedStream = false;              // went through the streaming-read path → must retain the live bubble
      function liveBubble() {
        if (liveRow) return liveRow;
        liveRow = aiShowTyping();           // Reuse the thinking row for streaming text
        liveRow.classList.add('streaming');
        usedStream = true;
        liveDiv = liveRow.querySelector('.ai-bubble');
        if (liveDiv) { liveDiv.classList.add('ai-md'); liveDiv.innerHTML = ''; }
        return liveRow;
      }
      return new Promise(function (resolve, reject) {
        function handle(finalEvt) {
          if (liveDiv) { liveDiv.innerHTML = aiRenderMd(liveDiv.textContent || ''); }
          if (usedStream) finalEvt = Object.assign({}, finalEvt, {_streamed: true});
          resolve(finalEvt);
        }
        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              // Stream ended; explicit done event was truncated, so use accumulated text as a fallback.
              if (!finalEvt) {
                const text = (liveDiv ? liveDiv.textContent : '') || '';
                finalEvt = {event: 'done', message: {role: 'assistant', content: text},
                            pending: [], trace: [], messages: AI_MSGS, context: {compressed: false}};
                handle(finalEvt);
              }
              return;
            }
            buf += decoder.decode(chunk.value || new Uint8Array(), {stream: true});
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, idx).trim();
              buf = buf.slice(idx + 1);
              if (!line) continue;
              let ev;
              try { ev = JSON.parse(line); } catch (_) { continue; }
              if (ev.event === 'delta' && typeof ev.text === 'string') {
                liveBubble();
                if (liveDiv) liveDiv.textContent = (liveDiv.textContent || '') + ev.text;
              } else if (ev.event === 'done') {
                finalEvt = ev;
                handle(ev);
                return;
              } else if (ev.event === 'error' || ev.event === 'final') {
                finalEvt = ev;
                handle(ev);
                return;
              }
            }
            return pump();
          }, function (err) { reject(err); });
        }
        let finalEvt = null;
        pump();
      });
    });
}

async function aiSend() {
  const input = $('#aiInput');
  const text = (input && input.value || '').trim();
  if (!text) return;
  if (!AI_CFG || !AI_CFG.enabled) {
    toast('First enable AI in “Configuration and Permissions” and save it (فعّل AI أولًا في «الإعدادات والصلاحيات» واحفظه)', 'err');
    aiShowTab('cfg');
    return;
  }
  if (input) input.value = '';
  AI_MSGS.push({role: 'user', content: text});
  aiAppendBubble('user', text);
  AI_MSGS = aiCompressLocalHistory(AI_MSGS);
  aiSaveHistory();
  const btn = $('#aiSendBtn');
  if (btn) btn.disabled = true;
  let approve = null;
  try {
    while (true) {
      aiShowTyping();
      let r = await aiChatOnce(approve);   // streaming : delta enters in real time  #aiTyping, done after  resolve
      // Replace local context with the complete server context to preserve continuity across stages
      if (r && r.messages && r.messages.length) {
        AI_MSGS = r.messages;
        AI_MSGS = aiCompressLocalHistory(AI_MSGS);
        aiSaveHistory();
      }
      const pending = (r && r.pending) || [];
      if (pending && pending.length) {
        aiHideTyping();                    // Collapse the typing bubble before the confirmation list
        const decision = await aiConfirmTools(pending);
        if (decision === null) break;      // Dialog closed unexpectedly
        approve = decision;                // [] means cancel all; restore the server context
        continue;                          // then  POST, the server executes approved items and continues
      }
      // No pending tools: final reply.
      const msg = (r && r.message && r.message.content) || 'No reply (لا يوجد رد)';
      AI_MSGS.push({role: 'assistant', content: msg});
      AI_MSGS = aiCompressLocalHistory(AI_MSGS);
      aiSaveHistory();
      const typing = $('#aiTyping');
      if (r && r._streamed && typing) {
        // Streaming already rendered in real time: convert the typing bubble to the final bubble and add the trace.
        typing.classList.remove('streaming');
        const b = typing.querySelector('.ai-bubble');
        if (b) { b.classList.add('ai-md'); b.innerHTML = aiRenderMd(msg); }
        aiAppendTrace(typing.querySelector('.ai-bubble') || typing, (r && r.trace) || []);
      } else {
        aiHideTyping();
        aiAppendBubble('bot', msg, (r && r.trace) || []);
      }
      if (r && r.context && r.context.compressed) {
        aiAppendBubble('sys', 'Context automatically compressed (تم ضغط السياق تلقائيًا): ' + (r.context.before_chars || '?') +
          '→' + (r.context.after_chars || '?') + ' characters (' + (r.context.after_chars || '?') + ' أحرف)');
      }
      break;
    }
  } catch (e) {
    aiHideTyping();
    aiAppendBubble('sys', 'Error (خطأ): ' + e.message);
    toast('AI failed (فشل): ' + e.message, 'err');
  } finally {
    if (btn) btn.disabled = false;
    const input = $('#aiInput');
    if (input) input.focus();
  }
}

function bindAiInput() {
  const input = $('#aiInput');
  if (!input || input._aiBound) return;
  input._aiBound = true;
  input.placeholder = 'Enter a message; Enter to send; Shift+Enter for a new line (أدخل رسالة؛ اضغط Enter للإرسال؛ Shift+Enter لسطر جديد)';
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      aiSend();
    }
  });
}
document.addEventListener('DOMContentLoaded', bindAiInput);
if (document.readyState !== 'loading') try { bindAiInput(); } catch (_) {}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && $('#aiPanel') && $('#aiPanel').classList.contains('on')) {
    closeAiPanel();
  }
});
