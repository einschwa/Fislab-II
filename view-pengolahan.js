// view-pengolahan.js — loads Pengolahan_Data.html into viewer and renders math
(function(){
  const contentEl = document.getElementById('modul-content');
  const tocList = document.getElementById('toc-list');
  const backBtn = document.getElementById('back-to-modul');

  function renderMath(){ if(window.MathJax && window.MathJax.typesetPromise) window.MathJax.typesetPromise([contentEl]).catch(()=>{}); }

  function slugify(s){ return String(s||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }

  function buildTOC(){
    if(!tocList) return;
    tocList.innerHTML = '';
    const headings = Array.from(contentEl.querySelectorAll('h2, h3'));
    if(!headings.length){ tocList.innerHTML = '<p>(Tidak ada daftar isi)</p>'; return; }
    const ul = document.createElement('ul');
    headings.forEach(h=>{
      if(!h.id) h.id = slugify(h.textContent||'heading');
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

  function load(){
    const url = 'public/modul-html/Data.html';
    contentEl.innerHTML = '<p>Memuat pengolahan data…</p>';
    fetch(url).then(r=>{ if(!r.ok) throw new Error('Not found'); return r.text(); }).then(html=>{
      contentEl.innerHTML = html;
      buildTOC();
      renderMath();
    }).catch(e=>{ contentEl.innerHTML = `<p>Gagal memuat pengolahan data. (${e.message})</p>`; });
  }

  if(backBtn) backBtn.addEventListener('click', ()=> window.location.href = 'modul.html');

  load();
})();
