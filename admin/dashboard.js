const client = window.factorxSupabase;

const el = {
  adminEmail: document.getElementById('adminEmail'),
  logoutButton: document.getElementById('logoutButton'),
  activeServices: document.getElementById('activeServices'),
  newEnquiries: document.getElementById('newEnquiries'),
  portfolioCount: document.getElementById('portfolioCount'),
  reviewCount: document.getElementById('reviewCount'),
  pageMessage: document.getElementById('pageMessage')
};

async function requireAdmin() {
  const { data: { session } } = await client.auth.getSession();

  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: adminRow, error } = await client
    .from('admins')
    .select('user_id,email')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error || !adminRow) {
    await client.auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  el.adminEmail.textContent = adminRow.email || session.user.email;
  return session;
}

async function countRows(table, filter = null) {
  let query = client
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (filter) {
    query = query.eq(filter.column, filter.value);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function loadDashboard() {
  const [
    activeServices,
    newEnquiries,
    portfolioCount,
    reviewCount
  ] = await Promise.all([
    countRows('services', { column: 'active', value: true }),
    countRows('enquiries', { column: 'status', value: 'new' }),
    countRows('portfolio_projects', { column: 'active', value: true }),
    countRows('reviews', { column: 'active', value: true })
  ]);

  el.activeServices.textContent = activeServices;
  el.newEnquiries.textContent = newEnquiries;
  el.portfolioCount.textContent = portfolioCount;
  el.reviewCount.textContent = reviewCount;
}

document.querySelectorAll('[data-coming-soon]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    el.pageMessage.textContent = 'We’ll build this module in the next steps.';
    el.pageMessage.className = 'message';
  });
});

el.logoutButton.addEventListener('click', async () => {
  await client.auth.signOut();
  window.location.href = 'index.html';
});

(async () => {
  const session = await requireAdmin();
  if (!session) return;

  try {
    await loadDashboard();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  }
})();
