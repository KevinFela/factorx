const cleanCopy = value => String(value ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/[↗←↑●✓]/g, '').replace(/\s+[—–-]\s+/g, ', ').replace(/([A-Za-z])-([A-Za-z])/g, '$1 $2').replace(/ {2,}/g, ' ').trim();
const cmsClient = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeUrl = value => {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
};
let siteSettings = {};
let liveServices = [];
const whatsappNumber = () => String(siteSettings.whatsapp || siteSettings.phone || '27764267368').replace(/\D/g, '').replace(/^0/, '27');
const whatsappUrl = message => `https://wa.me/${whatsappNumber()}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
function applyContactLinks() {
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
    const message = new URL(link.href).searchParams.get('text');
    link.href = whatsappUrl(message);
  });
  document.querySelectorAll('[data-contact-phone]').forEach(node => { node.textContent = siteSettings.phone || siteSettings.whatsapp || '076 426 7368'; });
  document.querySelectorAll('[data-contact-email]').forEach(link => {
    if (siteSettings.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siteSettings.email)) {
      link.textContent = siteSettings.email;
      link.href = `mailto:${siteSettings.email}`;
      link.hidden = false;
    }
  });
}
async function loadSettings() {
  const { data, error } = await cmsClient.from('site_settings').select('setting_key,setting_value');
  if (error) throw error;
  siteSettings = Object.fromEntries((data || []).map(row => [row.setting_key, row.setting_value]));
  document.querySelectorAll('[data-cms-key]').forEach(node => {
    const value = siteSettings[node.dataset.cmsKey];
    if (value !== undefined) node.textContent = cleanCopy(value);
  });
  const name = cleanCopy(siteSettings.business_name || 'FactorX Studios');
  document.querySelectorAll('.brand').forEach(node => {
    if (name !== 'FactorX Studios') node.textContent = name;
    node.setAttribute('aria-label', `${name} home`);
  });
  const copyright = document.querySelector('footer p');
  if (copyright) copyright.textContent = `© ${new Date().getFullYear()} ${name} · ${siteSettings.country || 'South Africa'}`;
  applyContactLinks();
}
function serviceCard(service) {
  const price = service.price_label || (service.price != null ? `R${Number(service.price).toLocaleString('en-ZA')}` : 'Custom');
  const features = Array.isArray(service.features) ? service.features : [];
  return `<article><span class="number">${escapeHtml(cleanCopy(service.badge || 'WEBSITE SERVICES'))}</span><h3>${escapeHtml(cleanCopy(service.title))}</h3><p class="price"><strong>${escapeHtml(cleanCopy(price))}</strong><span>${escapeHtml(cleanCopy(service.billing_label || ''))}</span></p><p>${escapeHtml(cleanCopy(service.short_description || ''))}</p><ul>${features.map(item => `<li>${escapeHtml(cleanCopy(item))}</li>`).join('')}</ul><a class="text-link" href="contact.html?service=${encodeURIComponent(service.enquiry_label || service.title)}">${escapeHtml(cleanCopy(service.button_label || 'Request a quote'))} </a></article>`;
}
async function loadServices() {
  const {data,error} = await cmsClient.from('services').select('*').eq('active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if (error) throw error;
  liveServices = data || [];
  document.querySelectorAll('[data-cms-services]').forEach(grid => {
    const featured = liveServices.filter(service => service.featured);
    const items = grid.dataset.featured ? (featured.length ? featured : liveServices).slice(0,contentCount('home_service_count')) : liveServices;
    grid.innerHTML = items.length ? items.map(serviceCard).join('') : `<p class="cms-notice">${escapeHtml(contentText('service_empty_message','Contact me to discuss a package for your business.'))}</p>`;
  });
  const select = document.querySelector('#service');
  if (select) {
    select.innerHTML = liveServices.map(service => `<option>${escapeHtml(service.enquiry_label || service.title)}</option>`).join('') + '<option>Something else</option>';
    const requested = new URLSearchParams(location.search).get('service');
    if ([...select.options].some(option => option.value === requested)) select.value = requested;
  }
}
function projectImage(project) {
  if (project.image_path) {
    if (/^https?:\/\//i.test(project.image_path)) return safeUrl(project.image_path);
    return cmsClient.storage.from('factorx-media').getPublicUrl(project.image_path).data.publicUrl;
  }
  const url = safeUrl(project.project_url);
  if (url && new URL(url).hostname.replace(/^www\./,'') === 'eateryflamingo.co.za') return 'assets/eatery.jpg';
  if (url && new URL(url).hostname.replace(/^www\./,'') === 'nailsbykele.co.za') return 'assets/nails.jpg';
  return '';
}
function projectCard(project) {
  const image = projectImage(project);
  const url = safeUrl(project.project_url);
  const content = `<div class="project-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(cleanCopy(project.title))} website screenshot" loading="lazy">` : '<div class="placeholder">Project preview coming soon</div>'}${url ? `<span class="visit">${escapeHtml(contentText('project_visit_label','Visit website'))}</span>` : ''}</div><div class="project-title"><h3>${escapeHtml(cleanCopy(project.title))}</h3>${url ? '' : ''}</div><p>${escapeHtml(cleanCopy(project.category || project.client_name || 'Website'))}</p>${project.short_description ? `<p class="project-description">${escapeHtml(cleanCopy(project.short_description))}</p>` : ''}`;
  return url ? `<a class="project" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>` : `<article class="project">${content}</article>`;
}
async function loadProjects() {
  if (!document.querySelector('[data-cms-projects]')) return;
  const {data,error} = await cmsClient.from('portfolio_projects').select('*').eq('active',true).order('sort_order',{ascending:true}).order('created_at',{ascending:false});
  if (error) throw error;
  const projects = data || [];
  document.querySelectorAll('[data-cms-projects]').forEach(grid => {
    const featured = projects.filter(project => project.featured);
    const items = grid.dataset.featured ? (featured.length ? featured : projects).slice(0,contentCount('home_project_count')) : projects;
    grid.innerHTML = items.length ? items.map(projectCard).join('') : `<p class="cms-notice">${escapeHtml(contentText('portfolio_empty_message','New work will appear here soon.'))}</p>`;
  });
  const hero = document.querySelector('.hero-art');
  if (hero) {
    const withImages = projects.filter(project => projectImage(project)).slice(0,2);
    hero.innerHTML = withImages.map((project,index) => {
      const url = safeUrl(project.project_url);
      const label = url ? new URL(url).hostname : project.title;
      return `<a class="preview ${index ? 'preview-front' : 'preview-back'}" href="${escapeHtml(url || 'portfolio.html')}" ${url ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="View ${escapeHtml(cleanCopy(project.title))}"><div class="browser-bar"><span>${escapeHtml(label)}</span></div><img src="${escapeHtml(projectImage(project))}" alt="${escapeHtml(cleanCopy(project.title))} website screenshot"></a>`;
    }).join('') + (withImages.length ? `<p class="art-caption">${escapeHtml(contentText('hero_caption','Real websites. Built for real businesses.'))}</p>` : '<p class="cms-notice">Your next website starts with a conversation.</p>');
  }
}
const enquiryForm = document.querySelector('#enquiry-form');
if (enquiryForm) enquiryForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!enquiryForm.reportValidity()) return;
  const button = document.querySelector('#enquiry-submit');
  const status = document.querySelector('#enquiry-status');
  const continuation = document.querySelector('#whatsapp-continue');
  const name = document.querySelector('#client-name').value.trim();
  const phone = document.querySelector('#client-phone').value.trim();
  const email = document.querySelector('#client-email').value.trim();
  const selected = document.querySelector('#service').value;
  const details = document.querySelector('#project-details').value.trim();
  if (!name || !phone) { status.textContent = 'Please enter your name and WhatsApp number.'; return; }
  button.disabled = true; button.textContent = 'Saving enquiry…'; status.textContent = ''; continuation.hidden = true;
  try {
    if (!cmsClient) throw new Error('Unavailable');
    const service = liveServices.find(item => (item.enquiry_label || item.title) === selected);
    const {error} = await cmsClient.rpc('submit_enquiry',{p_client_name:name,p_email:email || null,p_phone:phone,p_service_id:service?.id || null,p_service_name:selected,p_project_details:details || null});
    if (error) throw error;
    const url = whatsappUrl([`Hi, I’m ${name}. I’m interested in ${selected}.`,details,'Please send me more information and a quote.'].filter(Boolean).join('\n\n'));
    status.textContent = 'Your enquiry has been saved. Continue on WhatsApp to chat about your project.';
    continuation.href = url; continuation.hidden = false;
    button.textContent = 'Enquiry saved';
  } catch {
    status.textContent = 'Your enquiry could not be saved. Please try again or contact me using the WhatsApp link.';
    button.disabled = false; button.textContent = 'Save enquiry & continue to WhatsApp ';
  }
});

function contentText(key,fallback) {
  return cleanCopy(Object.hasOwn(siteSettings,key) ? siteSettings[key] : fallback);
}
function contentCount(key) {
  const count=Number(siteSettings[key]);
  return Number.isInteger(count)&&count>=1&&count<=12 ? count : 2;
}
function contentLink(value) {
  if (!value || /[\u0000-\u0020\\]/.test(value) || value.startsWith('//')) return '';
  try {
    const url=new URL(value,location.href);
    return ['https:','http:','mailto:','tel:'].includes(url.protocol) ? value : '';
  } catch { return ''; }
}
function applyContentControls() {
  document.querySelectorAll('[data-cms-href]').forEach(node=>{
    const value=siteSettings[node.dataset.cmsHref];if(value===undefined)return;
    const href=contentLink(value);
    if(href){node.setAttribute('href',href);node.removeAttribute('aria-disabled');}
    else {node.removeAttribute('href');node.setAttribute('aria-disabled','true');}
  });
  document.querySelectorAll('[data-cms-visible]').forEach(node=>{
    if(Object.hasOwn(siteSettings,node.dataset.cmsVisible))node.hidden=siteSettings[node.dataset.cmsVisible]==='false';
  });
  document.querySelectorAll('[data-cms-placeholder]').forEach(node=>{
    const value=siteSettings[node.dataset.cmsPlaceholder];if(value!==undefined)node.setAttribute('placeholder',cleanCopy(value));
  });
  document.querySelectorAll('[data-cms-meta]').forEach(node=>{
    const value=siteSettings[node.dataset.cmsMeta];if(value!==undefined)node.setAttribute('content',cleanCopy(value));
  });
  for(const [key,variable] of [['brand_accent','--accent'],['brand_paper','--paper'],['brand_ink','--ink']]){
    if(/^#[0-9a-f]{6}$/i.test(siteSettings[key]||''))document.documentElement.style.setProperty(variable,siteSettings[key]);
  }
  const logo=contentLink(siteSettings.brand_logo);
  if(logo&&/^(https?:\/\/|\/?assets\/)/i.test(logo))document.querySelectorAll('.brand').forEach(node=>{
    const image=document.createElement('img');image.src=logo;image.alt=siteSettings.business_name||'FactorX Studios';image.className='brand-image';node.replaceChildren(image);
  });
  const icon=contentLink(siteSettings.brand_favicon);
  if(icon&&/^(https?:\/\/|\/?assets\/)/i.test(icon)){
    const node=document.querySelector('link[rel="icon"]');if(node){node.href=icon;node.removeAttribute('type');}
  }
}

async function initialiseCms() {
  if (!cmsClient) { window.finishCmsLoading?.(false); return; }
  const settingsResult = await Promise.allSettled([loadSettings()]);
  const results = [...settingsResult,...await Promise.allSettled([loadServices(),loadProjects(),window.loadCmsPages(cmsClient)])];
  document.body.dataset.cmsStatus = results.every(result => result.status === 'fulfilled') ? 'connected' : 'unavailable';
  applyContactLinks();
  applyContentControls();
  window.finishCmsLoading?.(results.every(result => result.status === 'fulfilled'));
}
initialiseCms().catch(() => window.finishCmsLoading?.(false));
