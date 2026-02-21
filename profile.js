        const database = firebase.database();

        // Elemen UI
        const viewProfileSection = document.getElementById('view-profile-section');
        const editProfileForm = document.getElementById('edit-profile-form');
        const editProfileBtn = document.getElementById('edit-profile-btn');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const profileForm = document.getElementById('profile-form');
        // Avatar related elements (added for upload)
        const profileAvatar = document.getElementById('profile-avatar');
        const profileAvatarImg = document.getElementById('profile-avatar-img');
        const profileAvatarInitial = document.getElementById('profile-avatar-initial');
        const avatarInput = document.getElementById('avatar-input');
        const avatarModal = document.getElementById('avatar-modal');
        const avatarUploadBtn = document.getElementById('avatar-upload-btn');
        const avatarDeleteBtn = document.getElementById('avatar-delete-btn');
        const avatarModalClose = document.getElementById('avatar-modal-close');

        // Fungsi UI (Logout)
        function logout() { localStorage.removeItem('fislab-nrp'); localStorage.removeItem('fislab-role'); window.location.href = 'index.html'; }
        document.getElementById('nav-logout').addEventListener('click', (e) => { e.preventDefault(); logout(); });

        // Sidebar visibility handled by sidebar.js

        // Sidebar & dark mode handled by sidebar.js

        // Fungsi untuk menampilkan data ke elemen HTML
        function displayProfileData(userData) {
            // Header
            document.getElementById('profile-name').textContent = userData.nama || '-';
            document.getElementById('profile-nrp').textContent = userData.nrp || '-';
            document.getElementById('profile-role').textContent = userData.role || '-';
            if (userData.fotoUrl) {
                // show image
                profileAvatarImg.src = userData.fotoUrl;
                profileAvatarImg.style.display = 'block';
                profileAvatarInitial.style.display = 'none';
            } else if (userData.nama) {
                // fallback to initial
                profileAvatarImg.style.display = 'none';
                profileAvatarInitial.style.display = 'block';
                profileAvatarInitial.textContent = userData.nama.charAt(0).toUpperCase();
            }
            // Detail view
            document.querySelectorAll('#detail-nrp').forEach(el => el.textContent = userData.nrp || '-');
            document.getElementById('detail-nama').textContent = userData.nama || '-';
            document.getElementById('detail-email').textContent = userData.email || '-';
            document.getElementById('detail-telepon').textContent = userData.telepon || '-';
            document.getElementById('detail-kelompok').textContent = userData.kelompokId || 'Tidak ada';
            // Form Edit
            document.getElementById('edit-nama').value = userData.nama || '';
            document.getElementById('edit-email').value = userData.email || '';
            document.getElementById('edit-telepon').value = userData.telepon || '';
        }

        // Event Listeners untuk toggle form edit
        editProfileBtn.addEventListener('click', () => {
            viewProfileSection.style.display = 'none';
            editProfileForm.classList.add('active');
        });

        cancelEditBtn.addEventListener('click', () => {
            editProfileForm.classList.remove('active');
            viewProfileSection.style.display = 'block';
            // Reset form fields
            document.getElementById('edit-old-password').value = '';
            document.getElementById('edit-new-password').value = '';
            document.getElementById('edit-confirm-password').value = '';
        });

        // Event Listener untuk submit form
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nrp = localStorage.getItem('fislab-nrp');
            const userRef = database.ref('users/' + nrp);
            
            const submitButton = profileForm.querySelector('button[type="submit"]');
            submitButton.textContent = 'Menyimpan...';
            submitButton.disabled = true;

            // Data profil baru
            const updatedProfile = {
                nama: document.getElementById('edit-nama').value,
                email: document.getElementById('edit-email').value,
                telepon: document.getElementById('edit-telepon').value,
            };

            // Ambil data terbaru untuk verifikasi password lama
            userRef.once('value').then(snapshot => {
                const currentUserData = snapshot.val();

                const oldPassword = document.getElementById('edit-old-password').value;
                const newPassword = document.getElementById('edit-new-password').value;
                const confirmPassword = document.getElementById('edit-confirm-password').value;

                // Logika validasi dan update password
                if (oldPassword || newPassword || confirmPassword) {
                    // Jika salah satu field password diisi, maka wajib isi semua
                    if (!oldPassword || !newPassword || !confirmPassword) {
                        alert('Untuk mengubah password, semua field password harus diisi.');
                        submitButton.textContent = 'Simpan Perubahan';
                        submitButton.disabled = false;
                        return;
                    }
                    // Verifikasi password lama
                    if (oldPassword !== currentUserData.password) {
                        alert('Password lama salah!');
                        submitButton.textContent = 'Simpan Perubahan';
                        submitButton.disabled = false;
                        return;
                    }
                    // Verifikasi password baru
                    if (newPassword.length < 6) {
                        alert('Password baru minimal 6 karakter.');
                        submitButton.textContent = 'Simpan Perubahan';
                        submitButton.disabled = false;
                        return;
                    }
                    if (newPassword !== confirmPassword) {
                        alert('Konfirmasi password baru tidak cocok!');
                        submitButton.textContent = 'Simpan Perubahan';
                        submitButton.disabled = false;
                        return;
                    }
                    // Jika semua validasi lolos, tambahkan password baru ke data yang akan di-update
                    updatedProfile.password = newPassword;
                }

                // Kirim data update ke Firebase
                userRef.update(updatedProfile).then(() => {
                    alert('Profil berhasil diperbarui!');
                    displayProfileData({ ...currentUserData, ...updatedProfile }); // Tampilkan data baru
                    cancelEditBtn.click(); // Tutup form
                }).catch(error => {
                    alert('Gagal menyimpan perubahan: ' + error.message);
                }).finally(() => {
                    submitButton.textContent = 'Simpan Perubahan';
                    submitButton.disabled = false;
                });
            });
        });

        // Logika utama saat halaman dimuat
        document.addEventListener('DOMContentLoaded', () => {
            const loggedInNrp = localStorage.getItem('fislab-nrp');
            if (loggedInNrp) {
                database.ref('users/' + loggedInNrp).once('value', (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        displayProfileData(userData);
                        
                        if (userData.role) {
                            localStorage.setItem('fislab-role', userData.role);
                        }
                    } else {
                        alert('Data pengguna tidak ditemukan.');
                        logout();
                    }
                });
            } else {
                alert('Anda belum login.');
                window.location.href = 'index.html';
            }
            // Avatar click opens modal with options
            if (profileAvatar && avatarModal) {
                profileAvatar.addEventListener('click', () => openAvatarModal());
            }

            // Modal buttons
            if (avatarUploadBtn && avatarInput) {
                avatarUploadBtn.addEventListener('click', () => {
                    avatarInput.click();
                    closeAvatarModal();
                });
            }
            if (avatarModalClose) avatarModalClose.addEventListener('click', () => closeAvatarModal());
            if (avatarModal) avatarModal.addEventListener('click', (ev) => { if (ev.target.classList.contains('avatar-modal-backdrop')) closeAvatarModal(); });

            if (avatarInput) {
                avatarInput.addEventListener('change', async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const nrp = localStorage.getItem('fislab-nrp');
                    if (!nrp) { alert('NRP tidak ditemukan. Harap login ulang.'); return; }
                    try {
                        setAvatarUploading(true);
                        const result = await uploadAvatar(file, nrp);
                        // optionally show result
                    } catch (err) {
                        console.error('Upload failed', err);
                        alert('Gagal mengunggah foto: ' + (err && err.message ? err.message : err));
                    } finally {
                        setAvatarUploading(false);
                        // reset input so same file can be selected again if needed
                        avatarInput.value = '';
                    }
                });
            }

            // Delete button
            if (avatarDeleteBtn) {
                avatarDeleteBtn.addEventListener('click', async () => {
                    const nrp = localStorage.getItem('fislab-nrp');
                    if (!nrp) { alert('NRP tidak ditemukan. Harap login ulang.'); return; }
                    const confirmed = confirm('Hapus foto profil? Tindakan ini akan menghapus foto dari Supabase (jika tersedia) dan mengosongkan profil.');
                    if (!confirmed) return;
                    try {
                        setAvatarUploading(true);
                        await deleteAvatar(nrp);
                        alert('Foto profil dihapus.');
                    } catch (err) {
                        console.error('Delete failed', err);
                        alert('Gagal menghapus foto: ' + (err && err.message ? err.message : err));
                    } finally {
                        setAvatarUploading(false);
                        closeAvatarModal();
                    }
                });
            }
        });

        function openAvatarModal() {
            if (!avatarModal) return;
            avatarModal.style.display = 'flex';
            avatarModal.setAttribute('aria-hidden', 'false');
        }
        function closeAvatarModal() {
            if (!avatarModal) return;
            avatarModal.style.display = 'none';
            avatarModal.setAttribute('aria-hidden', 'true');
        }

        // Helper: small UI helpers for upload state
        function setAvatarUploading(isUploading) {
            if (!profileAvatar) return;
            profileAvatar.disabled = !!isUploading;
            profileAvatar.setAttribute('aria-busy', String(!!isUploading));
            if (isUploading) {
                profileAvatarInitial.style.opacity = '0.4';
                profileAvatarInitial.textContent = 'Menyimpan...';
            } else {
                profileAvatarInitial.style.opacity = '';
            }
        }

        // Ensure supabase client is ready (polling) before usage
        function ensureSupabaseReady(timeout = 5000) {
            return new Promise((resolve, reject) => {
                const start = Date.now();
                (function poll() {
                    if (window.supabase && window.supabase.storage) return resolve(window.supabase);
                    if (Date.now() - start > timeout) return reject(new Error('Supabase client not ready'));
                    setTimeout(poll, 150);
                })();
            });
        }

        // Upload avatar to Supabase and update Firebase with the public URL
        async function uploadAvatar(file, nrp) {
            await ensureSupabaseReady().catch(err => { throw err; });
            const ext = (file.name && file.name.split('.').pop()) || (file.type && file.type.split('/').pop()) || 'png';
            const filename = `${nrp}_${Date.now()}.${ext}`;
            // Upload to bucket 'avatars'
            let uploadRes;
            try {
                uploadRes = await window.supabase.storage.from('avatars').upload(filename, file);
            } catch (e) {
                // Older/newer supabase clients might throw or return error object
                console.error('Supabase upload error', e);
                throw e;
            }
            if (uploadRes && uploadRes.error) {
                throw uploadRes.error;
            }
            // Determine path returned by Supabase (may be in uploadRes.data.path)
            let fotoPathRaw = (uploadRes && uploadRes.data && (uploadRes.data.path || uploadRes.data.Key || uploadRes.data.name)) || filename;
            // Normalize to the path within the bucket (strip leading bucket segments or slashes)
            function normalizePath(p) {
                if (!p) return p;
                // remove any leading urls or bucket names
                // if contains '/avatars/' take substring after that
                const idx = p.indexOf('/avatars/');
                if (idx !== -1) p = p.substring(idx + '/avatars/'.length);
                // remove leading slashes
                p = p.replace(/^\/+/, '');
                // strip querystring
                p = p.split('?')[0];
                return decodeURIComponent(p);
            }
            const fotoPath = normalizePath(fotoPathRaw);
            // Get public URL
            let publicUrl;
            try {
                const urlRes = await window.supabase.storage.from('avatars').getPublicUrl(filename);
                if (urlRes && urlRes.error) throw urlRes.error;
                publicUrl = (urlRes && (urlRes.data && (urlRes.data.publicUrl || urlRes.data.publicURL))) || urlRes.publicUrl || urlRes.publicURL || (urlRes && urlRes.data && urlRes.data.public_url);
            } catch (e) {
                console.warn('getPublicUrl returned error or unexpected shape', e);
            }
            if (!publicUrl && uploadRes && uploadRes.data && uploadRes.data.path) {
                // best-effort construct URL (fallback)
                publicUrl = `${window.location.origin}/storage/v1/object/public/avatars/${uploadRes.data.path}`;
            }
            if (!publicUrl) throw new Error('Unable to obtain public URL for uploaded file');

            // Update Firebase Realtime Database with fotoUrl
            const userRef = database.ref('users/' + nrp);
            await userRef.update({ fotoUrl: publicUrl, fotoPath: fotoPath });
            // Update UI immediately
            displayProfileData({ nama: document.getElementById('edit-nama').value || document.getElementById('profile-name').textContent, nrp, fotoUrl: publicUrl });
            alert('Foto profil berhasil diunggah.');
            return { publicUrl, fotoPath };
        }

        // Delete avatar: remove from Supabase storage (if possible) and clear DB entries
        async function deleteAvatar(nrp) {
            await ensureSupabaseReady().catch(err => { throw err; });
            const userRef = database.ref('users/' + nrp);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val() || {};
            let pathToDelete = null;
            if (userData.fotoPath) {
                pathToDelete = userData.fotoPath;
            } else if (userData.fotoUrl) {
                const idx = userData.fotoUrl.indexOf('/avatars/');
                if (idx !== -1) {
                    pathToDelete = userData.fotoUrl.substring(idx + '/avatars/'.length).split('?')[0];
                } else {
                    // try to extract last path segment
                    try {
                        const url = new URL(userData.fotoUrl);
                        pathToDelete = url.pathname.split('/').pop();
                    } catch (e) {
                        pathToDelete = null;
                    }
                }
            }
            // normalize
            if (pathToDelete) {
                pathToDelete = pathToDelete.replace(/^\/+/, '').split('?')[0];
                pathToDelete = decodeURIComponent(pathToDelete);
            }
            if (pathToDelete) {
                try {
                    const removeRes = await window.supabase.storage.from('avatars').remove([pathToDelete]);
                    if (removeRes && removeRes.error) {
                        console.error('Supabase remove returned error', removeRes.error);
                        throw removeRes.error;
                    }
                } catch (e) {
                    console.error('Supabase remove failed', e);
                    // still continue to clear DB but surface the error to caller
                    throw e;
                }
            }
            // Clear DB references regardless of storage delete result
            await userRef.update({ fotoUrl: null, fotoPath: null });
            // Update UI
            displayProfileData({ nama: document.getElementById('edit-nama').value || document.getElementById('profile-name').textContent, nrp, fotoUrl: null });
        }

    