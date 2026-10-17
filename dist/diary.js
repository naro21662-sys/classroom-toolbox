import { supabase } from './auth.js';

const $ = (id) => document.getElementById(id);
const moodSymbols = { '행복': '☺', '평온': '○', '슬픔': '◡', '복잡': '≋' };
let entries = [];
let loadedFor = null;
let activeId = null;
let activeMood = '';
let toastTimer;

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
}

function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

function toEntry(row) {
  return { id: row.id, date: row.entry_date, title: row.title, content: row.content, mood: row.mood, tags: row.tags || [], updatedAt: row.updated_at };
}

function sortEntries() {
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));
}

function filteredEntries() {
  const query = $('diarySearch').value.trim().toLowerCase();
  return entries.filter((entry) => {
    const matchesMood = !activeMood || entry.mood === activeMood;
    const haystack = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase();
    return matchesMood && (!query || haystack.includes(query));
  });
}

function renderList() {
  const list = $('diaryList');
  const shown = filteredEntries();
  list.replaceChildren();
  $('diaryEmpty').hidden = shown.length > 0;
  shown.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `diary-entry${entry.id === activeId ? ' is-active' : ''}`;
    const meta = document.createElement('span');
    meta.className = 'diary-entry-meta';
    meta.textContent = `${formatDate(entry.date)} · ${moodSymbols[entry.mood] || '○'} ${entry.mood}`;
    const title = document.createElement('strong');
    title.textContent = entry.title;
    const preview = document.createElement('span');
    preview.className = 'diary-entry-preview';
    preview.textContent = entry.content;
    button.append(meta, title, preview);
    if (entry.tags.length) {
      const tags = document.createElement('span');
      tags.className = 'diary-entry-tags';
      tags.textContent = entry.tags.map((tag) => `#${tag}`).join(' ');
      button.append(tags);
    }
    button.addEventListener('click', () => editEntry(entry.id));
    list.append(button);
  });
}

function dayKey(date) {
  return new Date(`${date}T00:00:00`).setHours(0, 0, 0, 0);
}

function renderSummary() {
  $('diaryTotal').textContent = entries.length;
  const today = new Date();
  $('diaryMonth').textContent = entries.filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
  }).length;
  const days = [...new Set(entries.map((entry) => dayKey(entry.date)))].sort((a, b) => b - a);
  let streak = 0;
  if (days.length) {
    const oneDay = 86400000;
    const todayKey = new Date().setHours(0, 0, 0, 0);
    let expected = days[0] === todayKey || days[0] === todayKey - oneDay ? days[0] : null;
    for (const day of days) {
      if (expected === null || day !== expected) break;
      streak += 1;
      expected -= oneDay;
    }
  }
  $('diaryStreak').textContent = streak;
}

function setEditing(editing) {
  $('diaryEditorMode').textContent = editing ? 'EDIT ENTRY' : 'NEW ENTRY';
  $('diaryEditorTitle').textContent = editing ? '기록을 다듬어요' : '오늘을 기록해요';
  $('diarySaveButton').textContent = editing ? '수정 저장' : '기록 저장';
  $('diaryDeleteButton').hidden = !editing;
}

function resetForm(focus = false) {
  activeId = null;
  $('diaryForm').reset();
  $('diaryDate').value = localDate();
  document.querySelector('input[name="diaryMood"][value="평온"]').checked = true;
  setEditing(false);
  updateCount();
  renderList();
  if (focus) $('diaryTitle').focus();
}

function editEntry(id) {
  const entry = entries.find((item) => item.id === id);
  if (!entry) return;
  activeId = id;
  $('diaryDate').value = entry.date;
  $('diaryTitle').value = entry.title;
  $('diaryContent').value = entry.content;
  $('diaryTags').value = entry.tags.join(', ');
  const mood = document.querySelector(`input[name="diaryMood"][value="${CSS.escape(entry.mood)}"]`);
  if (mood) mood.checked = true;
  setEditing(true);
  updateCount();
  renderList();
  if (window.innerWidth <= 900) document.querySelector('.diary-editor-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 데이터베이스 제약(길이·기분·태그 수)과 같은 기준으로 입력을 정리한다.
function formData() {
  const data = {
    entry_date: $('diaryDate').value,
    title: $('diaryTitle').value.trim(),
    content: $('diaryContent').value.trim(),
    mood: document.querySelector('input[name="diaryMood"]:checked').value,
    tags: $('diaryTags').value.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8)
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.entry_date)) throw new Error('날짜를 확인해 주세요.');
  if (!data.title || data.title.length > 80) throw new Error('제목은 1~80자로 입력해 주세요.');
  if (!data.content || data.content.length > 20000) throw new Error('내용은 1~20,000자로 입력해 주세요.');
  return data;
}

async function loadEntries(user) {
  const { data, error } = await supabase.from('diary_entries').select('*').order('entry_date', { ascending: false });
  if (error) throw new Error('일기를 불러오지 못했습니다.');
  entries = data.map(toEntry);
  sortEntries();
  loadedFor = user.id;
  resetForm();
  renderSummary();
}

async function saveEntry(event) {
  event.preventDefault();
  $('diarySaveButton').disabled = true;
  try {
    const data = formData();
    const editing = Boolean(activeId);
    const query = editing
      ? supabase.from('diary_entries').update(data).eq('id', activeId)
      : supabase.from('diary_entries').insert(data);
    const { data: rows, error } = await query.select().single();
    if (error) throw new Error('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const saved = toEntry(rows);
    entries = entries.filter((entry) => entry.id !== saved.id);
    entries.unshift(saved);
    sortEntries();
    activeId = saved.id;
    setEditing(true);
    renderSummary();
    renderList();
    showToast(editing ? '일기를 수정했습니다.' : '오늘의 기록을 저장했습니다.');
  } catch (error) {
    showToast(error.message);
  } finally {
    $('diarySaveButton').disabled = false;
  }
}

async function deleteEntry() {
  if (!activeId || !window.confirm('이 일기를 삭제할까요? 삭제한 기록은 되돌릴 수 없어요.')) return;
  const { error } = await supabase.from('diary_entries').delete().eq('id', activeId);
  if (error) return showToast('삭제하지 못했습니다.');
  entries = entries.filter((entry) => entry.id !== activeId);
  resetForm();
  renderSummary();
  showToast('일기를 삭제했습니다.');
}

function updateCount() {
  $('diaryCount').textContent = `${$('diaryContent').value.length.toLocaleString('ko-KR')}자`;
}

function clearEntries() {
  entries = [];
  loadedFor = null;
  resetForm();
  renderSummary();
}

document.addEventListener('toolbox:view', async (event) => {
  const user = window.classroomAuth?.user;
  if (event.detail !== 'diary' || !user || loadedFor === user.id) return;
  try {
    await loadEntries(user);
  } catch (error) {
    showToast(error.message);
  }
});

document.addEventListener('toolbox:auth', (event) => {
  if (!event.detail || event.detail.id !== loadedFor) clearEntries();
});

$('diaryForm').addEventListener('submit', saveEntry);
$('diaryNewButton').addEventListener('click', () => resetForm(true));
$('diaryDeleteButton').addEventListener('click', deleteEntry);
$('diaryContent').addEventListener('input', updateCount);
$('diarySearch').addEventListener('input', renderList);
$('diaryMoodFilters').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-mood]');
  if (!chip) return;
  activeMood = chip.dataset.mood;
  document.querySelectorAll('#diaryMoodFilters [data-mood]').forEach((item) => item.classList.toggle('is-active', item === chip));
  renderList();
});

resetForm();
