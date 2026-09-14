FACTORX STUDIOS - COMPLETE CURRENT BUILD

PUBLIC WEBSITE
- index.html
- services.html
- about.html
- contact.html
- styles.css
- script.js
- supabase.js

ADMIN CMS
- admin/index.html
- admin/dashboard.html
- admin/services.html
- admin/portfolio.html
- admin/enquiries.html
- related admin JavaScript and CSS files

DATABASE
- factorx-cms-schema.sql

WHAT IS WIRED NOW
- Supabase admin authentication
- Services & Pricing CMS
- Portfolio CMS + Supabase Storage screenshots
- Enquiries CMS
- Public contact page saves an enquiry to Supabase before opening WhatsApp

NOT BUILT YET
- Public services dynamically reading prices from Supabase
- Public portfolio section/page
- Google Reviews API synchronization and floating rotating review popup
- Settings CMS

UPLOAD NOTE
Upload the contents of this folder to your web root. Keep the admin folder intact.


LIVE CMS UPDATE
---------------
This version connects the public website to the Supabase services table.

Live now:
- Homepage featured packages
- Services page featured packages
- Services page additional packages
- Maintenance price on Services page
- Contact page service dropdown

When a service is edited in Admin > Services & Pricing and saved,
the public website reads the new value from Supabase on the next page load.


LIVE PORTFOLIO UPDATE
---------------------
- Added public portfolio.html
- Added Portfolio to public navigation
- Public Portfolio reads active projects from Supabase
- New projects appear after refresh
- Hidden projects disappear after refresh
- Featured badge is controlled from the CMS
- Screenshots are served from factorx-media storage


GOOGLE REVIEWS UI UPDATE
------------------------
- Added Admin > Google Reviews manager
- Added floating review popup to public pages
- Reviews rotate automatically using values from site_settings
- Popup defaults:
  enabled = true
  interval = 14 seconds
  duration = 7 seconds
  minimum rating = 4
- Pinned reviews are shown first
- Actual Google Business Profile automatic syncing is the next integration step


SITE SETTINGS UPDATE
--------------------
Admin > Settings now controls:
- Business name
- Country
- WhatsApp number
- Phone
- Email
- Homepage hero text
- Services page hero text
- About page hero/story text
- Contact page hero/form text

Public pages read these settings from Supabase on page load.
WhatsApp links and the contact form also use the saved WhatsApp number.


FINAL CLEAN BUILD
-----------------
Google Reviews UI and floating review popup were removed.
The Supabase reviews table can remain unused; it does not affect the website.

Active CMS modules:
- Dashboard
- Services & Pricing
- Portfolio
- Enquiries
- Settings

Public live features:
- Services and pricing read from Supabase
- Portfolio reads from Supabase
- Contact enquiries save to Supabase
- Site settings update public content and contact details
