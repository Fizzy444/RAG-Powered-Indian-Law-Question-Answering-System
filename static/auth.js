function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');

  const hint = document.getElementById('switch-hint');
  const title = document.getElementById('auth-title');
  const sub = document.getElementById('auth-subtitle');

  if (tab === 'signin') {
    title.textContent = 'Welcome Back';
    sub.textContent = 'Sign in to access your legal research assistant.';
    hint.innerHTML = '<span>Don\'t have an account? </span><button onclick="switchTab(\'signup\')">Sign up free</button>';
  } else {
    title.textContent = 'Get Started';
    sub.textContent = 'Create your free account and start researching Indian law instantly.';
    hint.innerHTML = '<span>Already have an account? </span><button onclick="switchTab(\'signin\')">Sign in</button>';
  }
}

function togglePw(inputId, btn) {
  const input = document.getElementById(inputId);
  const hidden = input.type === 'password';
  input.type = hidden ? 'text' : 'password';
  btn.querySelector('svg').innerHTML = hidden
    ? '<path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />'
    : '<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('visible');
}

function clearError(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.classList.remove('visible');
}

function setLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  btn.textContent = loading ? 'Please wait…' : label;
}

async function handleSignin() {
  clearError('signin-error');
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-pw').value;

  if (!email || !password) { showError('signin-error', 'Please fill in all fields.'); return; }

  setLoading('signin-btn', true, 'Sign In');
  try {
    const res = await fetch('/api/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.redirect;
    } else {
      showError('signin-error', data.error || 'Sign in failed.');
      setLoading('signin-btn', false, 'Sign In');
    }
  } catch {
    showError('signin-error', 'Network error. Please try again.');
    setLoading('signin-btn', false, 'Sign In');
  }
}

async function handleSignup() {
  clearError('signup-error');
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-pw').value;

  if (!name || !email || !password) { showError('signup-error', 'Please fill in all fields.'); return; }
  if (password.length < 8) { showError('signup-error', 'Password must be at least 8 characters.'); return; }

  setLoading('signup-btn', true, 'Create Account');
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.redirect;
    } else {
      showError('signup-error', data.error || 'Sign up failed.');
      setLoading('signup-btn', false, 'Create Account');
    }
  } catch {
    showError('signup-error', 'Network error. Please try again.');
    setLoading('signup-btn', false, 'Create Account');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const activePanel = document.querySelector('.form-panel.active').id;
  if (activePanel === 'panel-signin') handleSignin();
  else handleSignup();
});