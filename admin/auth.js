const client = window.factorxSupabase;

const form = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const button = document.getElementById('loginButton');
const message = document.getElementById('loginMessage');

async function redirectIfAlreadyLoggedIn() {
  const { data: { session } } = await client.auth.getSession();
  if (!session) return;

  const { data: adminRow } = await client
    .from('admins')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (adminRow) {
    window.location.href = 'dashboard.html';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();

  button.disabled = true;
  button.textContent = 'Signing in...';
  message.textContent = '';
  message.className = 'message';

  const { data, error } = await client.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value
  });

  if (error) {
    message.textContent = error.message;
    message.className = 'message error';
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  const { data: adminRow, error: adminError } = await client
    .from('admins')
    .select('user_id,email')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    await client.auth.signOut();
    message.textContent = 'This account is not registered as a FactorX CMS admin.';
    message.className = 'message error';
    button.disabled = false;
    button.textContent = 'Sign In';
    return;
  }

  window.location.href = 'dashboard.html';
});

redirectIfAlreadyLoggedIn();
