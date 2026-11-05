window.loadCmsPages=async function(client){
  const {data,error}=await client.from('pages').select('id,parent_id,parent_route,title,slug,show_in_nav,sort_order').eq('published',true).order('sort_order').order('title');
  if(error)throw error;
  const pages=(data||[]).filter(p=>!p.parent_id||(data||[]).some(parent=>parent.id===p.parent_id));
  const url=p=>`page.html?slug=${encodeURIComponent(p.slug)}`;
  const node=(tag,text,className)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(className)n.className=className;return n;};
  const link=(p,className)=>{const a=node('a',p.title,className);a.href=url(p);return a;};
  const nav=document.querySelector('#navigation');
  if(nav){
    window.sitePageParents.forEach(parent=>{
      const children=pages.filter(p=>p.parent_route===parent.route&&p.show_in_nav);if(!children.length)return;
      const original=nav.querySelector('a[href="'+parent.route+'.html"]');if(!original)return;
      const group=node('details','','pages-menu');const summary=node('summary',original.textContent);group.append(summary);
      const dropdown=node('div','','pages-dropdown');nav.insertBefore(group,original);dropdown.append(original);children.forEach(p=>dropdown.append(link(p,'subpage-link')));group.append(dropdown);
    });
    const menu=node('details','','pages-menu');menu.append(node('summary','Explore'));
    const items=node('div','','pages-dropdown');
    pages.filter(p=>!p.parent_id&&!p.parent_route&&p.show_in_nav).forEach(parent=>{items.append(link(parent,'parent-page-link'));pages.filter(p=>p.parent_id===parent.id&&p.show_in_nav).forEach(child=>items.append(link(child,'subpage-link')));});
    if(items.childElementCount){menu.append(items);nav.insertBefore(menu,nav.querySelector('.button'));}
  }
  const host=document.getElementById('dynamicPage');if(!host){
    const route=(location.pathname.split('/').pop()||'index.html').replace(/\.html$/,'');
    const children=pages.filter(p=>p.parent_route===route&&p.show_in_nav);
    const main=document.getElementById('main');if(main&&children.length){const section=node('section','','section subpage-list');section.append(node('h2','Explore more'));children.forEach(p=>section.append(link(p,'text-link')));main.append(section);}return;
  }
  const params=new URLSearchParams(location.search);const slug=params.get('slug');const preview=params.get('preview')==='1';
  const notFound=()=>{host.replaceChildren();const section=node('section','','page-intro');section.append(node('h1','Page not found'),node('p','This page is unavailable or has not been published.'));const home=node('a','Go to homepage','text-link');home.href='index.html';section.append(home);host.append(section);document.title='Page not found | FactorX Studios';};
  if(!slug){notFound();return;}
  let query=client.from('pages').select('*').eq('slug',slug);if(!preview)query=query.eq('published',true);
  const {data:page,error:pageError}=await query.maybeSingle();if(pageError)throw pageError;
  if(!page||(!preview&&page.parent_id&&!pages.some(p=>p.id===page.parent_id))){notFound();return;}
  host.replaceChildren();const intro=node('section','','page-intro');const trail=node('p','','eyebrow');const home=node('a','Home');home.href='index.html';trail.append(home);
  const builtInParent=window.sitePageParents.find(p=>p.route===page.parent_route);
  if(builtInParent&&builtInParent.route!=='index'){trail.append(' / ');const parentLink=node('a',builtInParent.title);parentLink.href=builtInParent.route+'.html';trail.append(parentLink);}
  const parent=pages.find(p=>p.id===page.parent_id);if(parent){trail.append(' / ');trail.append(link(parent));}intro.append(trail);
  if(preview)intro.append(node('p',page.published?'Preview: published page':'Preview: draft page','cms-notice'));
  intro.append(node('h1',page.title),node('p',page.intro,'intro'));host.append(intro);
  const content=node('section','','section custom-page-content');
  if(page.image_path){const src=/^https?:\/\//i.test(page.image_path)?page.image_path:client.storage.from('factorx-media').getPublicUrl(page.image_path).data.publicUrl;if(safeUrl(src)){const image=node('img','','custom-page-image');image.src=src;image.alt=page.image_alt||page.title;content.append(image);}}
  page.body.split(/\n\s*\n/).filter(p=>p.trim()).forEach(p=>content.append(node('p',p,'custom-page-paragraph')));
  if(page.button_label&&contentLink(page.button_url)){const a=node('a',page.button_label,'button');a.href=contentLink(page.button_url);content.append(a);}
  const children=pages.filter(p=>p.parent_id===page.id);if(children.length){const list=node('div','','subpage-list');list.append(node('h2','Explore more'));children.forEach(p=>list.append(link(p,'text-link')));content.append(list);}
  host.append(content);document.title=page.title+' | '+(siteSettings.business_name||'FactorX Studios');const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=page.seo_description||page.intro;
};
