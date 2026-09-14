const toggle = document.getElementById('menu-toggle');
const menu = document.getElementById('nav-menu');

if (toggle && menu) {
  function closeMenu() {
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  }

  toggle.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });

  menu.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.nav-inner')) closeMenu();
  });
}

const service = document.getElementById('service');
const details = document.getElementById('project-details');
const nameInput = document.getElementById('client-name');
const phoneInput = document.getElementById('client-phone');
const emailInput = document.getElementById('client-email');
const enquiryButton = document.getElementById('whatsapp-enquiry');
const selection = document.getElementById('selection');
const enquiryStatus = document.getElementById('enquiry-status');

function buildWhatsAppMessage() {
  if (!service) return '';

  const name = nameInput?.value.trim();
  const detailText = details?.value.trim();

  return [
    `Hi FactorX, I am interested in ${service.value}.`,
    name ? `My name is ${name}.` : '',
    detailText || '',
    'Please send me more information and a quote.'
  ].filter(Boolean).join('\n\n');
}

function updateEnquiryPreview() {
  if (!service || !selection) return;
  selection.textContent = `${service.value} will be included in your WhatsApp message.`;
}

if (service && details) {
  service.addEventListener('change', updateEnquiryPreview);
  details.addEventListener('input', updateEnquiryPreview);
  updateEnquiryPreview();
}

if (enquiryButton && service && details) {
  enquiryButton.addEventListener('click', async () => {
    const name = nameInput?.value.trim() || '';
    const phone = phoneInput?.value.trim() || '';
    const email = emailInput?.value.trim() || '';

    if (!name) {
      enquiryStatus.textContent = 'Please enter your name.';
      nameInput?.focus();
      return;
    }

    if (!phone) {
      enquiryStatus.textContent = 'Please enter your WhatsApp number.';
      phoneInput?.focus();
      return;
    }

    enquiryButton.disabled = true;
    enquiryButton.textContent = 'Saving enquiry...';
    enquiryStatus.textContent = '';

    try {
      if (typeof supabaseClient === 'undefined') {
        throw new Error('The enquiry service is not available right now.');
      }

      const { error } = await supabaseClient.rpc('submit_enquiry', {
        p_client_name: name,
        p_email: email || null,
        p_phone: phone,
        p_service_id: null,
        p_service_name: service.value,
        p_project_details: details.value.trim() || null
      });

      if (error) throw error;

      enquiryStatus.textContent = 'Enquiry saved. Opening WhatsApp...';
      const message = buildWhatsAppMessage();
      const businessWhatsApp = window.fxSiteSettings?.whatsapp || window.fxSiteSettings?.phone || '+27 76 426 7368';
      const whatsappDigits = String(businessWhatsApp).replace(/\D/g, '').replace(/^0/, '27');
      window.location.href = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(message)}`;
    } catch (error) {
      console.error(error);
      enquiryStatus.textContent = 'Could not save your enquiry. Please try again or use the WhatsApp button.';
      enquiryButton.disabled = false;
      enquiryButton.textContent = 'Save enquiry & continue to WhatsApp';
    }
  });
}

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
