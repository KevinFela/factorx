const client = window.factorxSupabase;

let projects = [];

const el = {
  adminEmail: document.getElementById('adminEmail'),
  logoutButton: document.getElementById('logoutButton'),

  totalProjects: document.getElementById('totalProjects'),
  visibleProjects: document.getElementById('visibleProjects'),
  featuredProjects: document.getElementById('featuredProjects'),
  hiddenProjects: document.getElementById('hiddenProjects'),

  projectSearch: document.getElementById('projectSearch'),
  projectStatus: document.getElementById('projectStatus'),
  portfolioGrid: document.getElementById('portfolioGrid'),
  pageMessage: document.getElementById('pageMessage'),
  newProjectButton: document.getElementById('newProjectButton'),

  projectModal: document.getElementById('projectModal'),
  projectModalTitle: document.getElementById('projectModalTitle'),
  projectForm: document.getElementById('projectForm'),
  projectId: document.getElementById('projectId'),
  existingImagePath: document.getElementById('existingImagePath'),

  projectImage: document.getElementById('projectImage'),
  projectPreviewWrap: document.getElementById('projectPreviewWrap'),
  projectPreview: document.getElementById('projectPreview'),
  imageStatus: document.getElementById('imageStatus'),

  projectTitle: document.getElementById('projectTitle'),
  clientName: document.getElementById('clientName'),
  projectCategory: document.getElementById('projectCategory'),
  projectUrl: document.getElementById('projectUrl'),
  projectDescription: document.getElementById('projectDescription'),
  projectTechnologies: document.getElementById('projectTechnologies'),
  projectSortOrder: document.getElementById('projectSortOrder'),
  projectActive: document.getElementById('projectActive'),
  projectFeatured: document.getElementById('projectFeatured'),

  saveProjectButton: document.getElementById('saveProjectButton')
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

function imageUrl(path) {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data } = client.storage
    .from('factorx-media')
    .getPublicUrl(path);

  return data?.publicUrl || '';
}

function safeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

async function loadProjects() {
  const { data, error } = await client
    .from('portfolio_projects')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  projects = data || [];
  renderStats();
  renderProjects();
}

function renderStats() {
  el.totalProjects.textContent = projects.length;
  el.visibleProjects.textContent = projects.filter(item => item.active).length;
  el.featuredProjects.textContent = projects.filter(item => item.featured).length;
  el.hiddenProjects.textContent = projects.filter(item => !item.active).length;
}

function filteredProjects() {
  const search = el.projectSearch.value.trim().toLowerCase();
  const status = el.projectStatus.value;

  return projects.filter(item => {
    const matchesSearch =
      !search ||
      (item.title || '').toLowerCase().includes(search) ||
      (item.client_name || '').toLowerCase().includes(search) ||
      (item.category || '').toLowerCase().includes(search);

    const matchesStatus =
      !status ||
      (status === 'visible' && item.active) ||
      (status === 'featured' && item.featured) ||
      (status === 'hidden' && !item.active);

    return matchesSearch && matchesStatus;
  });
}

function renderProjects() {
  const items = filteredProjects();

  if (!items.length) {
    el.portfolioGrid.innerHTML =
      '<div class="empty-state portfolio-empty">No projects match your filters.</div>';
    return;
  }

  el.portfolioGrid.innerHTML = items.map(item => {
    const technologies = Array.isArray(item.technologies) ? item.technologies : [];
    const preview = imageUrl(item.image_path);

    return `
      <article class="portfolio-admin-card ${item.active ? '' : 'is-hidden'}">
        <div class="portfolio-admin-image-wrap">
          ${preview
            ? `<img src="${escapeHtml(preview)}" alt="${escapeHtml(item.title)}">`
            : `<div class="portfolio-image-placeholder">No image</div>`}

          <div class="portfolio-card-badges">
            ${item.featured ? '<span class="status-pill featured">Featured</span>' : ''}
            <span class="status-pill ${item.active ? 'active' : 'inactive'}">
              ${item.active ? 'Visible' : 'Hidden'}
            </span>
          </div>
        </div>

        <div class="portfolio-admin-body">
          <p class="portfolio-category">${escapeHtml(item.category || 'Project')}</p>
          <h3>${escapeHtml(item.title)}</h3>

          ${item.client_name
            ? `<p class="portfolio-client">Client: ${escapeHtml(item.client_name)}</p>`
            : ''}

          <p class="portfolio-description">
            ${escapeHtml(item.short_description || 'No description')}
          </p>

          ${technologies.length
            ? `<div class="technology-tags">
                ${technologies.map(tech => `<span>${escapeHtml(tech)}</span>`).join('')}
              </div>`
            : ''}

          <div class="portfolio-card-actions">
            ${item.project_url
              ? `<a class="secondary-button compact-button portfolio-link-button"
                    href="${escapeHtml(item.project_url)}"
                    target="_blank"
                    rel="noopener">Open Site</a>`
              : ''}
            <button class="secondary-button compact-button" data-edit-project="${item.id}">Edit</button>
            <button class="danger-button compact-button" data-delete-project="${item.id}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function nextSortOrder() {
  if (!projects.length) return 10;

  return projects.reduce(
    (max, item) => Math.max(max, Number(item.sort_order || 0)),
    0
  ) + 10;
}

function showPreview(url) {
  if (!url) {
    el.projectPreviewWrap.classList.add('hidden');
    el.projectPreview.removeAttribute('src');
    return;
  }

  el.projectPreview.src = url;
  el.projectPreviewWrap.classList.remove('hidden');
}

function resetForm() {
  el.projectForm.reset();
  el.projectId.value = '';
  el.existingImagePath.value = '';
  el.projectActive.checked = true;
  el.projectFeatured.checked = false;
  el.projectSortOrder.value = nextSortOrder();
  el.imageStatus.textContent = '';
  showPreview('');
}

function openModal(item = null) {
  resetForm();

  if (item) {
    el.projectModalTitle.textContent = 'Edit Project';
    el.projectId.value = item.id;
    el.existingImagePath.value = item.image_path || '';
    el.projectTitle.value = item.title || '';
    el.clientName.value = item.client_name || '';
    el.projectCategory.value = item.category || '';
    el.projectUrl.value = item.project_url || '';
    el.projectDescription.value = item.short_description || '';
    el.projectTechnologies.value = Array.isArray(item.technologies)
      ? item.technologies.join('\n')
      : '';
    el.projectSortOrder.value = item.sort_order ?? 0;
    el.projectActive.checked = Boolean(item.active);
    el.projectFeatured.checked = Boolean(item.featured);

    if (item.image_path) {
      showPreview(imageUrl(item.image_path));
      el.imageStatus.textContent =
        'A screenshot is already saved. Choose a new image only if you want to replace it.';
    }
  } else {
    el.projectModalTitle.textContent = 'Add Project';
  }

  el.projectModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  setTimeout(() => el.projectTitle.focus(), 30);
}

function closeModal() {
  el.projectModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function technologies() {
  return el.projectTechnologies.value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

async function uploadImage(file) {
  const path = `portfolio/${Date.now()}-${safeFileName(file.name)}`;

  const { error } = await client.storage
    .from('factorx-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return path;
}

async function saveProject(event) {
  event.preventDefault();

  el.saveProjectButton.disabled = true;
  el.saveProjectButton.textContent = 'Saving...';

  try {
    const id = el.projectId.value;
    const existingPath = el.existingImagePath.value;
    const newFile = el.projectImage.files[0];

    let imagePath = existingPath;

    if (newFile) {
      imagePath = await uploadImage(newFile);
    }

    const payload = {
      title: el.projectTitle.value.trim(),
      client_name: el.clientName.value.trim() || null,
      category: el.projectCategory.value.trim() || null,
      short_description: el.projectDescription.value.trim() || null,
      project_url: el.projectUrl.value.trim() || null,
      image_path: imagePath || null,
      technologies: technologies(),
      sort_order: Number(el.projectSortOrder.value || 0),
      active: el.projectActive.checked,
      featured: el.projectFeatured.checked
    };

    const result = id
      ? await client.from('portfolio_projects').update(payload).eq('id', id)
      : await client.from('portfolio_projects').insert(payload);

    if (result.error) throw result.error;

    if (id && newFile && existingPath && existingPath !== imagePath) {
      await client.storage.from('factorx-media').remove([existingPath]);
    }

    closeModal();
    el.pageMessage.textContent = id ? 'Project updated.' : 'Project added.';
    el.pageMessage.className = 'message success';

    await loadProjects();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  } finally {
    el.saveProjectButton.disabled = false;
    el.saveProjectButton.textContent = 'Save Project';
  }
}

async function deleteProject(id) {
  const item = projects.find(project => project.id === id);
  if (!item) return;

  if (!window.confirm(
    `Delete "${item.title}"?\n\nYou can hide it instead if you may want to show it again later.`
  )) return;

  const { error } = await client
    .from('portfolio_projects')
    .delete()
    .eq('id', id);

  if (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
    return;
  }

  if (item.image_path) {
    await client.storage.from('factorx-media').remove([item.image_path]);
  }

  el.pageMessage.textContent = 'Project deleted.';
  el.pageMessage.className = 'message success';

  await loadProjects();
}

el.newProjectButton.addEventListener('click', () => openModal());
el.projectForm.addEventListener('submit', saveProject);

el.projectSearch.addEventListener('input', renderProjects);
el.projectStatus.addEventListener('change', renderProjects);

el.projectImage.addEventListener('change', () => {
  const file = el.projectImage.files[0];

  if (!file) {
    const existing = el.existingImagePath.value;
    showPreview(existing ? imageUrl(existing) : '');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    el.pageMessage.textContent = 'That image is larger than 10MB.';
    el.pageMessage.className = 'message error';
    el.projectImage.value = '';
    return;
  }

  showPreview(URL.createObjectURL(file));
  el.imageStatus.textContent = `${file.name} selected. It will upload when you save.`;
});

el.portfolioGrid.addEventListener('click', event => {
  const editButton = event.target.closest('[data-edit-project]');
  if (editButton) {
    const item = projects.find(project => project.id === editButton.dataset.editProject);
    if (item) openModal(item);
    return;
  }

  const deleteButton = event.target.closest('[data-delete-project]');
  if (deleteButton) {
    deleteProject(deleteButton.dataset.deleteProject);
  }
});

document.querySelectorAll('[data-close-project-modal]').forEach(button => {
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
    await loadProjects();
  } catch (error) {
    el.pageMessage.textContent = error.message;
    el.pageMessage.className = 'message error';
  }
})();
