// view-modul.js — loads generated HTML fragment, builds TOC, renders math, fetches assistants, and handles WA modal + navigation
(function(){
  function qs(sel, root=document) { return root.querySelector(sel); }
  function qsa(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '';

  // If the requested module is the special "Data" (pengolahan data),
  // redirect to the dedicated viewer page which uses `view-pengolahan.js`.
  if (id === 'Data') {
    window.location.href = 'view-pengolahan.html';
    return;
  }

  const contentEl = document.getElementById('modul-content');
  const tocList = document.getElementById('toc-list');
  const assistantsList = document.getElementById('assistants-list');
  const prevBtn = document.getElementById('prev-mod');
  const nextBtn = document.getElementById('next-mod');
  const moduleCodeEl = document.getElementById('module-code');
  const moduleNameEl = document.getElementById('module-name');

  // Ordered cyclic list of modules (MP then W)
  const moduleOrder = ['MP1','MP2','MP3','MP4','MP5','W1','W2','W3','W4','W5'];

  function loadFragment(modId) {
    const url = `public/modul-html/${modId}.html`;
    contentEl.innerHTML = '<p>Memuat modul…</p>';
    fetch(url).then(r => {
      if (!r.ok) throw new Error('Not found');
      return r.text();
    }).then(html => {
      contentEl.innerHTML = html;
      buildTOC();
      renderMath();
      // mark second image (alat) with specific id and center it
      try {
        const imgs = Array.from(contentEl.querySelectorAll('img'));
        if (imgs[1]) {
          imgs[1].id = 'modul-alat-img';
          imgs[1].classList.add('modul-alat');
          const fig = imgs[1].closest('figure');
          if (fig) fig.style.textAlign = 'center';
        }
      } catch (e) { /* ignore */ }
      // ensure user cache for modal is populated
      populateUserCache();
      fetchModuleTitle(modId);
      fetchAssistants(modId);
    }).catch(err => {
      contentEl.innerHTML = `<p>Gagal memuat modul ${modId}. (${err.message})</p>`;
      tocList.innerHTML = '';
      assistantsList.innerHTML = '';
      setHeaderFallback(modId);
    });
  }

  function slugify(s){ return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  function buildTOC(){
    tocList.innerHTML = '';
    const headings = qsa('h2, h3', contentEl);
    if (!headings.length) { tocList.innerHTML = '<p>(Tidak ada daftar isi)</p>'; return; }
    const ul = document.createElement('ul');
    headings.forEach(h => {
      if (!h.id) h.id = slugify(h.textContent || 'heading');
      const li = document.createElement('li');
      li.className = h.tagName.toLowerCase();
      const a = document.createElement('a');
      a.href = `#${h.id}`;
      a.textContent = h.textContent;
      li.appendChild(a);
      ul.appendChild(li);
    });
    tocList.appendChild(ul);
  }

  function renderMath(){
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise([contentEl]).catch(()=>{});
    }
  }

  function setHeaderFallback(modId){
    if(moduleCodeEl) moduleCodeEl.textContent = modId || '';
    if(moduleNameEl && !moduleNameEl.textContent) moduleNameEl.textContent = '';
  }

  function fetchModuleTitle(modId){
    // Prefer global judulPraktikum node, then modul/<id>, then other fallbacks
    function applyTitle(title){
      if(moduleCodeEl) moduleCodeEl.textContent = modId ? `${modId}` : '';
      if(moduleNameEl) moduleNameEl.textContent = title ? ` - ${title}` : '';
    }
    // If firebase not available, fallback to first heading in content
    if (typeof firebase === 'undefined' || !firebase.database) {
      const h = contentEl.querySelector('h1, h2, .modul-title');
      applyTitle(h ? (h.textContent || '') : '');
      return;
    }

    try{
      const db = firebase.database();
      // Prefer global judulPraktikum node
      db.ref(`judulPraktikum/${modId}`).once('value').then(snapJ => {
        const vj = snapJ.val();
        if (vj) {
          // if stored as object, try common fields
          if (typeof vj === 'object') {
            const cand = vj.namaJudul || vj.nama || vj.title || vj.name || vj.judulPraktikum || null;
            if (cand) { applyTitle(cand); return; }
          } else {
            applyTitle(vj); return;
          }
        }
        // fallback to modul/<id>
        db.ref(`modul/${modId}`).once('value').then(snap => {
          const val = snap.val() || {};
          const candidates = [val.judulPraktikum, val.judul, val.title, val.nama, val.name, val.moduleTitle];
          const found = candidates.find(x => !!x);
          if(found) { applyTitle(found); return; }
          // try alternate locations
          db.ref(`modules/${modId}/title`).once('value').then(snap3 => {
            const v3 = snap3.val();
            if(v3) applyTitle(v3);
            else applyTitle((contentEl.querySelector('h1, h2, .modul-title')||{}).textContent||'');
          }).catch(()=> applyTitle((contentEl.querySelector('h1, h2, .modul-title')||{}).textContent||''));
        }).catch(()=> applyTitle((contentEl.querySelector('h1, h2, .modul-title')||{}).textContent||''));
      }).catch(()=> applyTitle((contentEl.querySelector('h1, h2, .modul-title')||{}).textContent||''));
    }catch(e){ applyTitle((contentEl.querySelector('h1, h2, .modul-title')||{}).textContent||''); }
  }

  function fetchAssistants(modId) {
    assistantsList.innerHTML = 'Memuat…';
    function initAndQuery(){
      if (typeof firebase === 'undefined' || !firebase.database) {
        assistantsList.innerHTML = '<p>Firebase tidak tersedia.</p>';
        return;
      }
      try{ if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.__FISLAB_FIREBASE_CONFIG__); }catch(e){}
      const db = firebase.database();
      db.ref('users').once('value').then(snap => {
        const val = snap.val() || {};
        const rows = Object.values(val).filter(u => u && u.role === 'Asisten Laboratorium' && String(u.judul) === String(modId));
        if (!rows.length) {
          assistantsList.innerHTML = '<p>(Tidak ada asisten terdaftar untuk modul ini)</p>';
          return;
        }
        assistantsList.innerHTML = '';
        rows.forEach(u => {
          const card = document.createElement('div');
          card.className = 'assistant-card';
          const img = document.createElement('img');
          img.alt = u.nama || 'Asisten';
          img.className = 'assistant-photo';
          img.src = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nama||'Asisten')}&background=3b82f6&color=fff`;
          const info = document.createElement('div');
          const name = document.createElement('div'); name.className='assistant-name'; name.textContent = u.nama || 'Unknown';
          const nrp = document.createElement('div'); nrp.className='assistant-nrp'; nrp.textContent = u.nrp || (u.NRP || '');
          info.appendChild(name); info.appendChild(nrp);
          card.appendChild(img); card.appendChild(info);
          card.addEventListener('click', () => openWAModal(u));
          assistantsList.appendChild(card);
        });
      }).catch(e => { assistantsList.innerHTML = '<p>Gagal memuat daftar asisten.</p>'; });
    }

    if (typeof firebase === 'undefined') {
      const s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
        s2.onload = initAndQuery;
        document.head.appendChild(s2);
      };
      s1.onerror = () => { assistantsList.innerHTML = '<p>Gagal memuat Firebase.</p>'; };
      document.head.appendChild(s1);
    } else initAndQuery();
  }

  /* WhatsApp modal handling */
  const waModal = document.getElementById('wa-modal');
  const waClose = document.getElementById('wa-modal-close');
  const waForm = document.getElementById('wa-form');
  const waAsistenInput = document.getElementById('wa-asisten');
  const waNamaInput = document.getElementById('wa-nama');
  const waNrpInput = document.getElementById('wa-nrp');

  function populateUserCache(){
    try{
      const cachedName = localStorage.getItem('fislab-user-nama');
      const cachedNrp = localStorage.getItem('fislab-nrp');
      if(waNamaInput && cachedName) waNamaInput.value = cachedName;
      if(waNrpInput && cachedNrp) waNrpInput.value = cachedNrp;
      // if name missing but nrp present, try to fetch from DB and cache it
      if((!cachedName || !cachedNrp) && cachedNrp && typeof firebase !== 'undefined' && firebase.database){
        try{ if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.__FISLAB_FIREBASE_CONFIG__); }catch(e){}
        firebase.database().ref('users/' + cachedNrp).once('value').then(snap=>{
          if(snap.exists()){
            const u = snap.val();
            if(u.nama) { localStorage.setItem('fislab-user-nama', u.nama); if(waNamaInput) waNamaInput.value = u.nama; }
            if(u.nrp) { localStorage.setItem('fislab-nrp', u.nrp); if(waNrpInput) waNrpInput.value = u.nrp; }
          }
        }).catch(()=>{});
      }
    }catch(e){}
  }

  function openWAModal(user){
    if(!waModal) return;
    waAsistenInput.value = `${user.nama || ''} (${user.nrp || user.NRP || ''})`;
    // prefill user name/nrp from cache
    populateUserCache();
    // support both class variants used in CSS
    waModal.classList.add('is-open'); waModal.classList.add('active'); waModal.setAttribute('aria-hidden','false');
  }
  function closeWAModal(){ if(!waModal) return; waModal.classList.remove('is-open'); waModal.classList.remove('active'); waModal.setAttribute('aria-hidden','true'); }
  if(waClose) waClose.addEventListener('click', closeWAModal);
  if(waModal) waModal.addEventListener('click', (e)=>{ if(e.target===waModal) closeWAModal(); });

  if(waForm){
    waForm.addEventListener('submit', function(e){
      e.preventDefault();
      const name = document.getElementById('wa-nama').value||'';
      const nrp = document.getElementById('wa-nrp').value||'';
      const asisten = waAsistenInput.value||'';
      const pesan = document.getElementById('wa-pesan').value||'';
      const text = `Halo ${asisten}%0A%0ANama: ${encodeURIComponent(name)}%0ANRP: ${encodeURIComponent(nrp)}%0A%0A${encodeURIComponent(pesan)}`;
      // If the assistant object had phone number we could use it; fall back to opening WhatsApp with no number (user chooses)
      // Try to pick phone number from selected assistant if present in UI (not stored currently). We will open wa.me with text only.
      const waUrl = `https://wa.me/?text=${text}`;
      window.open(waUrl, '_blank');
      closeWAModal();
    });
  }

  function setPrevNextButtons(modId){
    if(!prevBtn || !nextBtn) return;
    const idx = moduleOrder.indexOf(modId);
    if(idx === -1){ prevBtn.style.display='none'; nextBtn.style.display='none'; return; }
    const prevIdx = (idx - 1 + moduleOrder.length) % moduleOrder.length;
    const nextIdx = (idx + 1) % moduleOrder.length;
    const prev = moduleOrder[prevIdx];
    const next = moduleOrder[nextIdx];
    prevBtn.onclick = () => { window.location.href = `view-modul.html?id=${prev}`; };
    nextBtn.onclick = () => { window.location.href = `view-modul.html?id=${next}`; };
    // disable prev if same (single-item set) — keep enabled for circular flow
    prevBtn.disabled = false; nextBtn.disabled = false;
  }

  if (!id) {
    contentEl.innerHTML = '<p>Tidak ada modul dipilih.</p>';
  } else {
    loadFragment(id);
    setPrevNextButtons(id);
  }

  // Back button
  const backBtn = document.getElementById('back-to-modul');
  if(backBtn) backBtn.addEventListener('click', ()=> { window.location.href = 'modul.html'; });

})();
