const client = window.factorxSupabase;

let enquiries = [];
let selectedEnquiry = null;

const el = {
  adminEmail: document.getElementById('adminEmail'),
  logoutButton: document.getElementById('logoutButton'),
  newCount: document.getElementById('newCount'),
  contactedCount: document.getElementById('contactedCount'),
  quotedCount: document.getElementById('quotedCount'),
  wonCount: document.getElementById('wonCount'),
  enquirySearch: document.getElementById('enquirySearch'),
  enquiryStatus: document.getElementById('enquiryStatus'),
  enquiryList: document.getElementById('enquiryList'),
  pageMessage: document.getElementById('pageMessage'),

  enquiryModal: document.getElementById('enquiryModal'),
  enquiryModalTitle: document.getElementById('enquiryModalTitle'),
  enquiryDetails: document.getElementById('enquiryDetails'),
  modalStatus: document.getElementById('modalStatus'),
  saveStatusButton: document.getElementById('saveStatusButton'),
  whatsappButton: document.getElementById('whatsappButton'),
  emailButton: document.getElementById('emailButton'),
  deleteEnquiryButton: document.getElementById('deleteEnquiryButton')
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function statusLabel(status) {
  return {
    new: 'New',
    contacted: 'Contacted',
    quoted: 'Quoted',
    won: 'Won',
    lost: 'Lost',
    closed: 'Closed'
  }[status] || status;
}

function normalizePhone(phone = '') {
  let value = String(phone).replace(/\D/g, '');
  if (value.startsWith('0')) value = `27${value.slice(1)}`;
  return value;
}

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

async function loadEnquiries() {
  const { data, error } = await client
    .from('enquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  enquiries = data || [];
  renderStats();
  renderEnquiries();
}

function renderStats() {
  el.newCount.textContent =
    enquiries.filter(item => item.status === 'new').length;

  el.contactedCount.textContent =
    enquiries.filter(item => item.status === 'contacted').length;

  el.quotedCount.textContent =
    enquiries.filter(item => item.status === 'quoted').length;

  el.wonCount.textContent =
    enquiries.filter(item => item.status === 'won').length;
}

function filteredEnquiries() {
  const search = el.enquirySearch.value.trim().toLowerCase();
  const status = el.enquiryStatus.value;

  return enquiries.filter(item => {
    const matchesSearch =
      !search ||
      (item.client_name || '').toLowerCase().includes(search) ||
      (item.email || '').toLowerCase().includes(search) ||
      (item.phone || '').toLowerCase().includes(search) ||
      (item.service_name || '').toLowerCase().includes(search) ||
      (item.project_details || '').toLowerCase().includes(search);

    const matchesStatus =
      !status || item.status === status;

    return matchesSearch && matchesStatus;
  });
}

function renderEnquiries() {
  const items = filteredEnquiries();

  if (!items.length) {
    el.enquiryList.innerHTML =
      '<div class="empty-state">No enquiries match your filters.</div>';
    return;
  }

  el.enquiryList.innerHTML = items.map(item => `
    <article class="enquiry-admin-row">
      <div class="enquiry-date">
        <span>${escapeHtml(formatDateTime(item.created_at))}</span>
        <small>${escapeHtml(item.source || 'website')}</small>
      </div>

      <div class="enquiry-main">
        <div class="service-admin-title-row">
          <h3>${escapeHtml(item.client_name || 'Unnamed lead')}</h3>
          <span class="lead-status-pill lead-${item.status}">
            ${escapeHtml(statusLabel(item.status))}
          </span>
        </div>

        <p class="enquiry-service">
          ${escapeHtml(item.service_name || 'General enquiry')}
        </p>

        <p class="service-meta">
          ${escapeHtml(item.phone || 'No phone')}
          <span>•</span>
          ${escapeHtml(item.email || 'No email')}
        </p>

        <p class="enquiry-preview">
          ${escapeHtml(item.project_details || 'No project details supplied.')}
        </p>
      </div>

      <div class="enquiry-actions">
        <button class="secondary-button compact-button" data-view-enquiry="${item.id}">
          View
        </button>

        ${item.phone
          ? `<button class="whatsapp-button compact-button" data-whatsapp-enquiry="${item.id}">
              WhatsApp
            </button>`
          : ''}
      </div>
    </article>
  `).join('');
}

function openModal(item) {
  selectedEnquiry = item;

  el.enquiryModalTitle.textContent =
    item.client_name || 'Enquiry';

  el.modalStatus.value = item.status;

  const rows = [
    ['Status', statusLabel(item.status)],
    ['Service', item.service_name || 'General enquiry'],
    ['Name', item.client_name || '—'],
    ['Phone', item.phone || '—'],
    ['Email', item.email || '—'],
    ['Received', formatDateTime(item.created_at)],
    ['Source', item.source || 'website']
  ];

  el.enquiryDetails.innerHTML = `
    <div class="enquiry-detail-grid">
      ${rows.map(([label, value]) => `
        <div class="enquiry-detail-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('')}
    </div>

    <div class="enquiry-project-details">
      <span>Project details</span>
      <p>${escapeHtml(item.project_details || 'No project details supplied.')}</p>
    </div>
  `;

  el.whatsappButton.disabled = !item.phone;
  el.emailButton.disabled = !item.email;

  el.enquiryModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

function closeModal() {
  el.enquiryModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  selectedEnquiry = null;
}

async function saveStatus() {
  if (!selectedEnquiry) return;

  const status = el.modalStatus.value;

  el.saveStatusButton.disabled = true;
  el.saveStatusButton.textContent = 'Saving...';

  const { error } = await client
    .from('enquiries')
    .update({ status })
    .eq('id', selectedEnquiry.id);

  el.saveStatusButton.disabled = false;
  el.saveStatusButton.textContent = 'Save Status';

  if (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
    return;
  }

  el.pageMessage.textContent =
    `Enquiry marked ${statusLabel(status)}.`;
  el.pageMessage.className = 'message success';

  closeModal();
  await loadEnquiries();
}

async function deleteEnquiry() {
  if (!selectedEnquiry) return;

  if (!window.confirm(
    `Delete the enquiry from "${selectedEnquiry.client_name || 'this lead'}"?`
  )) return;

  const { error } = await client
    .from('enquiries')
    .delete()
    .eq('id', selectedEnquiry.id);

  if (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
    return;
  }

  el.pageMessage.textContent = 'Enquiry deleted.';
  el.pageMessage.className = 'message success';

  closeModal();
  await loadEnquiries();
}

function openWhatsApp(item) {
  const phone = normalizePhone(item.phone);
  if (!phone) return;

  const message = [
    `Hi ${item.client_name || ''},`,
    '',
    `Thanks for contacting FactorX Studios about ${item.service_name || 'your project'}.`,
    `I’m following up on your website enquiry.`
  ].join('\n');

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    '_blank'
  );
}

function openEmail(item) {
  if (!item.email) return;

  const subject =
    `FactorX Studios — ${item.service_name || 'Project enquiry'}`;

  const body = [
    `Hi ${item.client_name || ''},`,
    '',
    `Thanks for contacting FactorX Studios.`,
    '',
    `I’m following up regarding ${item.service_name || 'your project enquiry'}.`
  ].join('\n');

  window.location.href =
    `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

el.enquirySearch.addEventListener('input', renderEnquiries);
el.enquiryStatus.addEventListener('change', renderEnquiries);

el.enquiryList.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view-enquiry]');
  if (viewButton) {
    const item = enquiries.find(
      enquiry => enquiry.id === viewButton.dataset.viewEnquiry
    );

    if (item) openModal(item);
    return;
  }

  const whatsappButton = event.target.closest('[data-whatsapp-enquiry]');
  if (whatsappButton) {
    const item = enquiries.find(
      enquiry => enquiry.id === whatsappButton.dataset.whatsappEnquiry
    );

    if (item) openWhatsApp(item);
  }
});

el.saveStatusButton.addEventListener('click', saveStatus);
el.deleteEnquiryButton.addEventListener('click', deleteEnquiry);

el.whatsappButton.addEventListener('click', () => {
  if (selectedEnquiry) openWhatsApp(selectedEnquiry);
});

el.emailButton.addEventListener('click', () => {
  if (selectedEnquiry) openEmail(selectedEnquiry);
});

document.querySelectorAll('[data-close-enquiry-modal]').forEach(button => {
  button.addEventListener('click', closeModal);
});

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

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal();
});

(async () => {
  const session = await requireAdmin();
  if (!session) return;

  try {
    await loadEnquiries();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  }
})();
