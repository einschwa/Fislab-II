        const database = firebase.database();

        const navLogout = document.getElementById('nav-logout');
    // (Form lama dihapus, gunakan modal)
    const contactForm = null;
    const searchInput = document.getElementById('assistant-search');
    const clearSearchBtn = document.getElementById('clear-search');
    const searchInfo = document.getElementById('search-result-info');
    const waModal = document.getElementById('wa-modal');
    const waModalClose = document.getElementById('wa-modal-close');
    const waForm = document.getElementById('wa-form');
    let activeAssistant = null;
        
        let assistantData = []; // Variabel untuk menyimpan data asisten yang sudah difilter

        // Navigasi berbasis role diatur oleh sidebar.js

        // Fungsi untuk menampilkan kartu kontak dan mengisi form
        function displayAssistants(allData) {
            
            const { users } = allData;
            const dataJudul = allData.judulPraktikum || {};
            const contactGrid = document.getElementById('contact-grid');
            // const assistantSelect = document.getElementById('asisten'); // tidak digunakan lagi
            
            contactGrid.innerHTML = ''; // Kosongkan grid
            // if (assistantSelect) assistantSelect.innerHTML = '<option value="">Pilih asisten...</option>';
            
            const assistants = [];
            for (const nrp in users) {
                if (users[nrp].role === 'Asisten Laboratorium') {
                    assistants.push({ nrp, ...users[nrp] });
                }
            }
            
            assistantData = assistants; // Simpan ke variabel global untuk form handler

            if(assistants.length === 0) {
                contactGrid.innerHTML = '<p>Data asisten tidak ditemukan.</p>';
                return;
            }
            
            assistants.forEach(asisten => {
                // Buat daftar modul yang diampu
                let modulesHTML = '<p>Tidak ada modul yang diampu.</p>';
                if (asisten.judul) {
                    // `judul` may be a string (single kode) or an array of kode strings.
                    const judulList = Array.isArray(asisten.judul)
                        ? asisten.judul
                        : (typeof asisten.judul === 'string' && asisten.judul.trim() !== '' ? [asisten.judul] : []);
                    if (judulList.length > 0) {
                        modulesHTML = '<ul>';
                        judulList.forEach(kode => {
                            // --- PERBAIKAN 2: Logika Pencarian Judul yang Lebih Kuat ---
                            // Bersihkan kode (hilangkan spasi, jadikan huruf besar) agar cocok dengan key di DB (W1, MP1)
                            const cleanKode = kode.toString().trim().toUpperCase();
                            
                            // Ambil objek modul berdasarkan kode
                            const infoModul = dataJudul[cleanKode];

                            // Ambil properti namaJudul dari database
                            const namaJudul = infoModul && infoModul.namaJudul ? infoModul.namaJudul : 'Judul tidak ditemukan';
                            // -----------------------------------------------------------

                            modulesHTML += `<li><strong>${cleanKode}:</strong> ${namaJudul}</li>`;
                        });
                        modulesHTML += '</ul>';
                    } 
                }

                // Siapkan foto atau inisial untuk avatar
                const photo = asisten.photoURL || asisten.photo || asisten.fotoUrl || asisten.foto || asisten.avatar || asisten.profilePhoto || null;
                const getInitials = (fullName) => {
                    if (!fullName) return '';
                    const parts = fullName.trim().split(/\s+/);
                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                };
                const initials = getInitials(asisten.nama || '');

                // Buat Kartu Kontak
                const cardHTML = `
                    <div class="contact-card" data-nrp="${asisten.nrp}" data-nama="${asisten.nama}" data-telepon="${asisten.telepon || ''}" data-email="${asisten.email || ''}">
                        <div class="contact-header">
                            <div class="contact-avatar" aria-hidden="true">
                                ${photo ? `<img src="${photo}" alt="Foto ${asisten.nama}" onload="this.parentElement.classList.add('has-photo')" onerror="this.style.display='none'; this.parentElement.classList.remove('has-photo')">` : ''}
                                <div class="avatar-initials">${initials}</div>
                            </div>
                            <div class="contact-info">
                                <h3>${asisten.nama}</h3>
                                <p class="contact-role">Asisten Laboratorium</p>
                            </div>
                        </div>
                        <div class="contact-details">
                            <div class="contact-item">
                                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                <span>${asisten.telepon || 'Tidak tersedia'}</span>
                            </div>
                            <div class="contact-item">
                                <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                <span>${asisten.email || 'Tidak tersedia'}</span>
                            </div>
                        </div>
                        <div class="module-list">
                            <h4 class="module-list-title">Modul yang Diampu:</h4>
                            ${modulesHTML}
                        </div>
                        <div class="contact-card-overlay-action" aria-hidden="true">Kirim Pesan</div>
                    </div>
                `;
                contactGrid.innerHTML += cardHTML;
            });

            // Event listener untuk setiap kartu
            contactGrid.querySelectorAll('.contact-card').forEach(card => {
                card.addEventListener('click', () => {
                    const { nrp, telepon, nama, email } = card.dataset;
                    if (!telepon) { alert('Nomor telepon tidak tersedia.'); return; }
                    
                    // Ambil foto profil asisten dari kartu yang diklik
                    const avatarElement = card.querySelector('.contact-avatar');
                    const photoImg = avatarElement.querySelector('img');
                    const initialsElement = avatarElement.querySelector('.avatar-initials');
                    const photoURL = photoImg ? photoImg.src : null;
                    const initials = initialsElement ? initialsElement.textContent : '';
                    
                    activeAssistant = { nrp, telepon, nama, email, photoURL, initials };
                    
                    // Tampilkan foto/inisial di modal
                    const modalAvatar = document.getElementById('wa-assistant-avatar');
                    const modalAvatarImg = document.getElementById('wa-avatar-img');
                    const modalInitials = document.getElementById('wa-avatar-initials');
                    const modalNama = document.getElementById('wa-asisten-display');
                    const detailNama = document.getElementById('wa-detail-nama');
                    const detailNrp = document.getElementById('wa-detail-nrp');
                    const detailHp = document.getElementById('wa-detail-hp');
                    const detailEmail = document.getElementById('wa-detail-email');
                    
                    modalNama.textContent = nama;
                    modalInitials.textContent = initials;
                    detailNama.textContent = nama || '-';
                    detailNrp.textContent = nrp || '-';
                    detailHp.textContent = telepon || '-';
                    detailEmail.textContent = email || '-';
                    
                    if (photoURL && !photoURL.includes('onerror')) {
                        modalAvatarImg.src = photoURL;
                        modalAvatarImg.style.display = 'block';
                        modalAvatarImg.onload = () => modalAvatar.classList.add('has-photo');
                        modalAvatarImg.onerror = () => {
                            modalAvatarImg.style.display = 'none';
                            modalAvatar.classList.remove('has-photo');
                        };
                    } else {
                        modalAvatarImg.style.display = 'none';
                        modalAvatar.classList.remove('has-photo');
                    }
                    
                    // Jika user data sudah diambil sebelumnya, isi nama / nrp
                    const uNama = localStorage.getItem('fislab-user-nama') || '';
                    const uNrp = localStorage.getItem('fislab-nrp') || '';
                    if (uNama) document.getElementById('wa-nama').value = uNama;
                    if (uNrp) document.getElementById('wa-nrp').value = uNrp;
                    document.getElementById('wa-pesan').value = '';
                    openWaModal();
                });
            });
            updateSearchInfo();
        }

        // Modal helpers
        function openWaModal(){ waModal.classList.add('active'); waModal.setAttribute('aria-hidden','false'); }
        function closeWaModal(){ waModal.classList.remove('active'); waModal.setAttribute('aria-hidden','true'); }
        waModalClose.addEventListener('click', closeWaModal);
        waModal.addEventListener('click', (e)=>{ if (e.target === waModal) closeWaModal(); });
        window.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && waModal.classList.contains('active')) closeWaModal(); });

        // Kirim pesan via modal
        waForm.addEventListener('submit', (e)=>{
            e.preventDefault();
            if (!activeAssistant) { alert('Asisten tidak valid.'); return; }
            const nama = document.getElementById('wa-nama').value.trim();
            const nrp = document.getElementById('wa-nrp').value.trim();
            const pesan = document.getElementById('wa-pesan').value.trim();
            if (!nama || !nrp || !pesan) { alert('Lengkapi semua kolom.'); return; }
            const whatsappNumber = activeAssistant.telepon.replace(/\D/g,'');
            const asistenName = activeAssistant.nama;
            const whatsappMessage = `Halo mas/mbak ${asistenName}, saya ingin berkonsultasi.\n\n*Data Mahasiswa:*\nNama: ${nama}\nNRP: ${nrp}\n\n*Pesan:*\n${pesan}\n\nTerima kasih.`;
            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
            if (confirm(`Kirim pesan ke ${asistenName}?`)) {
                window.open(whatsappUrl, '_blank');
                closeWaModal();
            }
        });

        // Pencarian
        function filterAssistants(query){
            const cards = document.querySelectorAll('.contact-card');
            let visible = 0;
            cards.forEach(card => {
                const name = (card.dataset.nama || '').toLowerCase();
                const show = !query || name.includes(query.toLowerCase());
                card.style.display = show ? '' : 'none';
                if (show) visible++;
            });
            updateSearchInfo(visible);
        }
        function updateSearchInfo(visible){
            if (!searchInfo) return;
            const total = document.querySelectorAll('.contact-card').length;
// sourcery skip: dont-reassign-parameters
            if (visible === undefined) visible = total;
            searchInfo.textContent = (visible === total) ? '' : `${visible} dari ${total} asisten ditampilkan`;
        }
        if (searchInput){
            searchInput.addEventListener('input', ()=> filterAssistants(searchInput.value));
        }
        if (clearSearchBtn){
            clearSearchBtn.addEventListener('click', ()=>{ searchInput.value=''; filterAssistants(''); searchInput.focus(); });
        }

        // Logika Utama Saat Halaman Dimuat
        document.addEventListener('DOMContentLoaded', () => {
            const loggedInNrp = localStorage.getItem('fislab-nrp');

            if (loggedInNrp) {
                // Ambil data user yang login untuk mengatur sidebar & mengisi form
                database.ref('users/' + loggedInNrp).once('value').then(snapshot => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        if (userData.role) {
                            localStorage.setItem('fislab-role', userData.role);
                        }
                        // Simpan untuk prefilling modal
                        localStorage.setItem('fislab-user-nama', userData.nama || '');
                    } else {
                       alert('Data pengguna tidak ditemukan.');
                       navLogout.click();
                    }
                });

                // Optimasi: Ambil data dari ref spesifik untuk performa lebih baik
                Promise.all([
                    database.ref('users').once('value'),
                    database.ref('judulPraktikum').once('value')
                ]).then(([usersSnap, judulSnap]) => {
                    if (usersSnap.exists() || judulSnap.exists()) {
                        const allData = {
                            users: usersSnap.val() || {},
                            judulPraktikum: judulSnap.val() || {}
                        };
                        displayAssistants(allData); // Tampilkan asisten beserta modulnya
                    } else {
                        document.getElementById('contact-grid').innerHTML = '<p>Gagal memuat data dari database.</p>';
                    }
                }).catch((error) => {
                    console.error('Error loading contact data:', error);
                    document.getElementById('contact-grid').innerHTML = '<p>Error memuat data dari database.</p>';
                });

            } else {
                alert('Anda belum login.');
                window.location.href = 'index.html';
            }
        });