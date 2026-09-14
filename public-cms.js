const fxPublicClient = typeof supabaseClient !== 'undefined' ? supabaseClient : null;

function fxEscapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function fxPriceMarkup(service) {
  const priceLabel =
    service.price_label ||
    (service.price != null
      ? `R${Number(service.price).toLocaleString('en-ZA', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        })}`
      : 'Custom');

  const isQuote =
    String(priceLabel).toLowerCase() === 'custom' ||
    String(service.billing_label || '').toLowerCase() === 'quote';

  if (isQuote) {
    return `
      <div class="price quote">
        <strong>${fxEscapeHtml(priceLabel)}</strong>
        ${service.billing_label ? `<span>${fxEscapeHtml(service.billing_label)}</span>` : ''}
      </div>
    `;
  }

  return `
    <div class="price">
      <span>FROM</span>
      <strong>${fxEscapeHtml(priceLabel)}</strong>
      ${service.billing_label ? `<span>${fxEscapeHtml(service.billing_label)}</span>` : ''}
    </div>
  `;
}

function fxServiceCard(service, headingTag = 'h2') {
  const features = Array.isArray(service.features) ? service.features : [];
  const enquiryName = service.enquiry_label || service.title;
  const message = `Hi FactorX, I am interested in ${enquiryName}. Please send me more information and a quote.`;
  const colour = service.colour_preset === 'orange' ? 'orange' : 'blue';

  return `
    <article class="pricing-card ${colour}">
      ${service.badge ? `<div class="badge">${fxEscapeHtml(service.badge)}</div>` : ''}
      ${fxPriceMarkup(service)}
      <div class="card-body">
        <${headingTag}>${fxEscapeHtml(service.title)}</${headingTag}>
        ${service.short_description ? `<p>${fxEscapeHtml(service.short_description)}</p>` : ''}
        ${features.length ? `
          <ul>
            ${features.map(item => `<li>${fxEscapeHtml(item)}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      <a
        class="order"
        href="https://wa.me/27764267368?text=${encodeURIComponent(message)}"
        target="_blank"
        rel="noopener noreferrer"
        data-package="${fxEscapeHtml(enquiryName)}"
      >${fxEscapeHtml(service.button_label || 'Request a quote')}</a>
    </article>
  `;
}

async function fxLoadServices() {
  if (!fxPublicClient) return;

  const { data: services, error } = await fxPublicClient
    .from('services')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !services?.length) {
    console.warn('FactorX live services could not be loaded.', error);
    return;
  }

  const homePackages = document.getElementById('home-packages');
  if (homePackages) {
    const featured = services.filter(item => item.featured);
    const display = featured.length ? featured : services.slice(0, 2);
    homePackages.innerHTML = display.map(item => fxServiceCard(item, 'h2')).join('');
  }

  const featuredPackages = document.getElementById('services-featured-packages');
  if (featuredPackages) {
    const featured = services.filter(item => item.featured);
    const display = featured.length ? featured : services.slice(0, 2);
    featuredPackages.innerHTML = display.map(item => fxServiceCard(item, 'h2')).join('');
  }

  const customPackages = document.getElementById('services-custom-packages');
  if (customPackages) {
    let custom = services.filter(item => !item.featured);
    if (!custom.length) custom = services.slice(2);
    customPackages.innerHTML = custom.map(item => fxServiceCard(item, 'h3')).join('');
  }

  const maintenance =
    services.find(item => /maintenance/i.test(item.title || '')) ||
    services.find(item => /monthly website care/i.test(item.enquiry_label || ''));

  if (maintenance) {
    document.querySelectorAll('[data-live-maintenance-price]').forEach(node => {
      const label =
        maintenance.price_label ||
        (maintenance.price != null
          ? `R${Number(maintenance.price).toLocaleString('en-ZA')}`
          : 'Custom');

      node.textContent = maintenance.billing_label &&
        maintenance.billing_label.toLowerCase() === 'monthly'
        ? `${label}/month`
        : label;
    });
  }

  const contactSelect = document.getElementById('service');
  if (contactSelect) {
    const current = contactSelect.value;
    contactSelect.innerHTML = services.map(item => {
      const value = item.enquiry_label || item.title;
      return `<option value="${fxEscapeHtml(value)}">${fxEscapeHtml(item.title)}</option>`;
    }).join('');

    if ([...contactSelect.options].some(option => option.value === current)) {
      contactSelect.value = current;
    }

    contactSelect.dispatchEvent(new Event('change'));
  }
}

document.addEventListener('DOMContentLoaded', fxLoadServices);


function fxPublicProjectImageUrl(path) {
  if (!path) return '';

  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data } = fxPublicClient.storage
    .from('factorx-media')
    .getPublicUrl(path);

  return data?.publicUrl || '';
}

async function fxLoadPortfolio() {
  const grid = document.getElementById('public-portfolio-grid');
  if (!grid || !fxPublicClient) return;

  const { data: projects, error } = await fxPublicClient
    .from('portfolio_projects')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('FactorX portfolio could not be loaded.', error);
    grid.innerHTML = '<p class="portfolio-loading">Projects are temporarily unavailable.</p>';
    return;
  }

  if (!projects?.length) {
    grid.innerHTML = '<p class="portfolio-loading">Portfolio projects will appear here soon.</p>';
    return;
  }

  grid.innerHTML = projects.map(project => {
    const image = fxPublicProjectImageUrl(project.image_path);
    const tech = Array.isArray(project.technologies) ? project.technologies : [];

    return `
      <article class="public-project-card">
        <div class="public-project-image">
          ${image
            ? `<img src="${fxEscapeHtml(image)}" alt="${fxEscapeHtml(project.title)}" loading="lazy">`
            : `<div class="public-project-placeholder">FactorX Project</div>`}
          ${project.featured ? '<span class="public-featured-badge">Featured</span>' : ''}
        </div>

        <div class="public-project-body">
          <span class="eyebrow">${fxEscapeHtml(project.category || 'PROJECT')}</span>
          <h2>${fxEscapeHtml(project.title)}</h2>

          ${project.client_name
            ? `<p class="public-project-client">Client: ${fxEscapeHtml(project.client_name)}</p>`
            : ''}

          ${project.short_description
            ? `<p>${fxEscapeHtml(project.short_description)}</p>`
            : ''}

          ${tech.length
            ? `<div class="public-tech-tags">
                ${tech.map(item => `<span>${fxEscapeHtml(item)}</span>`).join('')}
              </div>`
            : ''}

          ${project.project_url
            ? `<a class="secondary-button public-project-link"
                  href="${fxEscapeHtml(project.project_url)}"
                  target="_blank"
                  rel="noopener">View live project</a>`
            : ''}
        </div>
      </article>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', fxLoadPortfolio);
