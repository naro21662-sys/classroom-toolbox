import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, STUDENT_EMAIL_DOMAIN } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const USERNAME_PATTERN = /^[a-z0-9_]{4,20}$/;
// 선생님 컴퓨터에서 로컬 주소로 열면 학생 로그인 없이 도구를 쓴다. 계정이 필요한 일기장은 예외.
const IS_LOCAL = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
let currentUser = null;
let pendingOpen = null;
let mode = 'login';

// Supabase 인증은 이메일 형식을 쓰므로 아이디를 실제로 쓰이지 않는 주소로 바꿔 저장한다.
const toEmail = (username) => `${username}@${STUDENT_EMAIL_DOMAIN}`;
export const usernameOf = (user) => user?.user_metadata?.username || user?.email?.split('@')[0] || '';

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  $('loginTab').classList.toggle('is-active', !signup);
  $('signupTab').classList.toggle('is-active', signup);
  $('loginTab').setAttribute('aria-selected', String(!signup));
  $('signupTab').setAttribute('aria-selected', String(signup));
  $('loginConfirmField').hidden = !signup;
  $('signupHint').hidden = !signup;
  $('loginPassword').autocomplete = signup ? 'new-password' : 'current-password';
  $('loginTitle').textContent = signup ? '학생 가입' : '학생 로그인';
  $('loginSubmit').textContent = signup ? '가입하고 시작하기' : '로그인';
  $('loginError').textContent = '';
}

function openDialog(next = 'login') {
  $('loginForm').reset();
  setMode(next);
  if (!$('loginDialog').open) $('loginDialog').showModal();
  $('loginUsername').focus();
}

function validate(username, password, confirm) {
  if (!USERNAME_PATTERN.test(username)) return '아이디는 영문 소문자, 숫자, _ 로 4~20자여야 합니다.';
  if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
  if (mode === 'signup' && password !== confirm) return '비밀번호 확인이 일치하지 않습니다.';
  return '';
}

async function signUp(username, password) {
  const { data, error } = await supabase.functions.invoke('student-signup', { body: { username, password } });
  if (error) {
    const payload = await error.context?.json?.().catch(() => null);
    throw new Error(payload?.error || '가입하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  if (!data?.ok) throw new Error(data?.error || '가입하지 못했습니다.');
}

async function signIn(username, password) {
  const { error } = await supabase.auth.signInWithPassword({ email: toEmail(username), password });
  if (error) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
}

function renderAccount() {
  const signedIn = Boolean(currentUser);
  $('accountName').hidden = !signedIn;
  $('accountName').textContent = signedIn ? `${usernameOf(currentUser)} 님` : '';
  $('loginButton').hidden = signedIn;
  $('logoutButton').hidden = !signedIn;
}

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = $('loginUsername').value.trim().toLowerCase();
  const password = $('loginPassword').value;
  const message = validate(username, password, $('loginConfirm').value);
  $('loginError').textContent = message;
  if (message) return;

  $('loginSubmit').disabled = true;
  try {
    if (mode === 'signup') await signUp(username, password);
    await signIn(username, password);
    $('loginDialog').close();
  } catch (error) {
    $('loginError').textContent = error.message;
  } finally {
    $('loginSubmit').disabled = false;
  }
});

if (IS_LOCAL) document.querySelector('.app-count').textContent = '4개의 도구 · 로컬에서는 로그인 없이 사용';

$('loginTab').addEventListener('click', () => setMode('login'));
$('signupTab').addEventListener('click', () => setMode('signup'));
$('loginClose').addEventListener('click', () => $('loginDialog').close());
$('loginDialog').addEventListener('close', () => { if (!currentUser) pendingOpen = null; });
$('loginButton').addEventListener('click', () => openDialog('login'));
$('logoutButton').addEventListener('click', () => supabase.auth.signOut());

// 콜백 안에서 다른 Supabase 호출을 기다리면 멈출 수 있어, 후속 작업은 setTimeout으로 넘긴다.
supabase.auth.onAuthStateChange((_event, session) => {
  const wasSignedIn = Boolean(currentUser);
  currentUser = session?.user ?? null;
  renderAccount();
  const open = currentUser ? pendingOpen : null;
  if (open) pendingOpen = null;
  setTimeout(() => {
    // 로그아웃하면 열려 있던 도구를 닫고 허브로 돌아간다.
    if (wasSignedIn && !currentUser) window.classroomShowView?.('hub');
    document.dispatchEvent(new CustomEvent('toolbox:auth', { detail: currentUser }));
    if (open) open();
  }, 0);
});

window.classroomAuth = {
  get user() { return currentUser; },
  requireLogin(open, { needsAccount = false } = {}) {
    if (currentUser || (IS_LOCAL && !needsAccount)) return open();
    pendingOpen = open;
    openDialog('login');
  }
};
