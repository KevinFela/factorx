const client = window.factorxSupabase;

let services = [];

const el = {
  adminEmail: document.getElementById('adminEmail'),
  logoutButton: document.getElementById('logoutButton'),
  newServiceButton: document.getElementById('newServiceButton'),
  serviceList: document.getElementById('serviceList'),
  serviceSearch: document.getElementById('serviceSearch'),
  serviceStatus: document.getElementById('serviceStatus'),
  pageMessage: document.getElementById('pageMessage'),

  totalServices: document.getElementById('totalServices'),
  visibleServices: document.getElementById('visibleServices'),
  hiddenServices: document.getElementById('hiddenServices'),
  featuredServices: document.getElementById('featuredServices'),

  serviceModal: document.getElementById('serviceModal'),
  serviceModalTitle: document.getElementById('serviceModalTitle'),
  serviceForm: document.getElementById('serviceForm'),
  serviceId: document.getElementById('serviceId'),
  badge: document.getElementById('badge'),
  title: document.getElementById('title'),
  shortDescription: document.getElementById('shortDescription'),
  price: document.getElementById('price'),
  priceLabel: document.getElementById('priceLabel'),
  billingLabel: document.getElementById('billingLabel'),
  features: document.getElementById('features'),
  buttonLabel: document.getElementById('buttonLabel'),
  enquiryLabel: document.getElementById('enquiryLabel'),
  colourPreset: document.getElementById('colourPreset'),
  sortOrder: document.getElementById('sortOrder'),
  active: document.getElementById('active'),
  featured: document.getElementById('featured'),
  saveServiceButton: document.getElementById('saveServiceButton')
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

async function loadServices() {
  const { data, error } = await client
    .from('services')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  services = data || [];
  renderStats();
  renderServices();
}

function renderStats() {
  el.totalServices.textContent = services.length;
  el.visibleServices.textContent = services.filter(item => item.active).length;
  el.hiddenServices.textContent = services.filter(item => !item.active).length;
  el.featuredServices.textContent = services.filter(item => item.featured).length;
}

function filteredServices() {
  const search = el.serviceSearch.value.trim().toLowerCase();
  const status = el.serviceStatus.value;

  return services.filter(item => {
    const matchesSearch =
      !search ||
      (item.title || '').toLowerCase().includes(search) ||
      (item.badge || '').toLowerCase().includes(search) ||
      (item.short_description || '').toLowerCase().includes(search);

    const matchesStatus =
      !status ||
      (status === 'visible' && item.active) ||
      (status === 'hidden' && !item.active) ||
      (status === 'featured' && item.featured);

    return matchesSearch && matchesStatus;
  });
}

function displayPrice(item) {
  if (item.price_label) return item.price_label;
  if (item.price == null) return 'Custom';
  return `R${Number(item.price).toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

function renderServices() {
  const items = filteredServices();

  if (!items.length) {
    el.serviceList.innerHTML =
      '<div class="empty-state">No services match your filters.</div>';
    return;
  }

  el.serviceList.innerHTML = items.map(item => {
    const featureCount = Array.isArray(item.features) ? item.features.length : 0;

    return `
      <article class="service-admin-row">
        <div class="service-colour-chip ${item.colour_preset === 'orange' ? 'orange-chip' : 'blue-chip'}">
          ${escapeHtml(item.badge || 'Service')}
        </div>

        <div class="service-admin-main">
          <div class="service-admin-title-row">
            <h3>${escapeHtml(item.title)}</h3>

            <div class="status-cluster">
              ${item.featured ? '<span class="status-pill featured">Featured</span>' : ''}
              <span class="status-pill ${item.active ? 'active' : 'inactive'}">
                ${item.active ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>

          <p class="service-admin-price">
            ${escapeHtml(displayPrice(item))}
            ${item.billing_label ? `<span>• ${escapeHtml(item.billing_label)}</span>` : ''}
          </p>

          <p class="service-description-admin">
            ${escapeHtml(item.short_description || 'No description')}
          </p>

          <p class="service-meta">
            ${featureCount} feature${featureCount === 1 ? '' : 's'}
            <span>•</span>
            Sort ${Number(item.sort_order || 0)}
          </p>
        </div>

        <div class="service-admin-actions">
          <button class="secondary-button compact-button" data-edit-service="${item.id}">Edit</button>
          <button class="danger-button compact-button" data-delete-service="${item.id}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function nextSortOrder() {
  if (!services.length) return 10;

  const max = services.reduce(
    (value, item) => Math.max(value, Number(item.sort_order || 0)),
    0
  );

  return max + 10;
}

function resetForm() {
  el.serviceForm.reset();
  el.serviceId.value = '';
  el.colourPreset.value = 'blue';
  el.sortOrder.value = nextSortOrder();
  el.active.checked = true;
  el.featured.checked = false;
  el.buttonLabel.value = 'Request a quote';
}

function openModal(item = null) {
  resetForm();

  if (item) {
    el.serviceModalTitle.textContent = 'Edit Service';
    el.serviceId.value = item.id;
    el.badge.value = item.badge || '';
    el.title.value = item.title || '';
    el.shortDescription.value = item.short_description || '';
    el.price.value = item.price ?? '';
    el.priceLabel.value = item.price_label || '';
    el.billingLabel.value = item.billing_label || '';
    el.features.value = Array.isArray(item.features)
      ? item.features.join('\n')
      : '';
    el.buttonLabel.value = item.button_label || '';
    el.enquiryLabel.value = item.enquiry_label || '';
    el.colourPreset.value = item.colour_preset || 'blue';
    el.sortOrder.value = item.sort_order ?? 0;
    el.active.checked = Boolean(item.active);
    el.featured.checked = Boolean(item.featured);
  } else {
    el.serviceModalTitle.textContent = 'Add Service';
  }

  el.serviceModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  setTimeout(() => el.title.focus(), 30);
}

function closeModal() {
  el.serviceModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function featureLines() {
  return el.features.value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

async function saveService(event) {
  event.preventDefault();

  const rawPrice = el.price.value.trim();
  let priceLabel = el.priceLabel.value.trim();

  if (!priceLabel && rawPrice !== '') {
    priceLabel = `R${Number(rawPrice).toLocaleString('en-ZA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  const payload = {
    badge: el.badge.value.trim() || null,
    title: el.title.value.trim(),
    short_description: el.shortDescription.value.trim() || null,
    price: rawPrice === '' ? null : Number(rawPrice),
    price_label: priceLabel || null,
    billing_label: el.billingLabel.value.trim() || null,
    features: featureLines(),
    button_label: el.buttonLabel.value.trim() || 'Request a quote',
    enquiry_label: el.enquiryLabel.value.trim() || el.title.value.trim(),
    colour_preset: el.colourPreset.value,
    sort_order: Number(el.sortOrder.value || 0),
    active: el.active.checked,
    featured: el.featured.checked
  };

  el.saveServiceButton.disabled = true;
  el.saveServiceButton.textContent = 'Saving...';

  try {
    const id = el.serviceId.value;
    const result = id
      ? await client.from('services').update(payload).eq('id', id)
      : await client.from('services').insert(payload);

    if (result.error) throw result.error;

    closeModal();
    el.pageMessage.textContent = id ? 'Service updated.' : 'Service added.';
    el.pageMessage.className = 'message success';
    await loadServices();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  } finally {
    el.saveServiceButton.disabled = false;
    el.saveServiceButton.textContent = 'Save Service';
  }
}

async function deleteService(id) {
  const item = services.find(service => service.id === id);
  if (!item) return;

  if (!window.confirm(
    `Delete "${item.title}"?\n\nYou can hide the service instead if you may want to use it again later.`
  )) return;

  const { error } = await client
    .from('services')
    .delete()
    .eq('id', id);

  if (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
    return;
  }

  el.pageMessage.textContent = 'Service deleted.';
  el.pageMessage.className = 'message success';
  await loadServices();
}

el.newServiceButton.addEventListener('click', () => openModal());
el.serviceForm.addEventListener('submit', saveService);

el.serviceSearch.addEventListener('input', renderServices);
el.serviceStatus.addEventListener('change', renderServices);

el.serviceList.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-service]');
  if (editButton) {
    const item = services.find(service => service.id === editButton.dataset.editService);
    if (item) openModal(item);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-service]');
  if (deleteButton) {
    deleteService(deleteButton.dataset.deleteService);
  }
});

document.querySelectorAll('[data-close-service-modal]').forEach(button => {
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
    await loadServices();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  }
})();
