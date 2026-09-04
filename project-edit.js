saveOrderBtn.addEventListener('click', async () => {
    const token = getToken();
    if (!token) return;

    const orderInputs = mediaGrid.querySelectorAll('.order-input');
    const updates = [];
    orderInputs.forEach(input => {
        const mediaId = parseInt(input.dataset.id);
        const sortOrder = parseInt(input.value) || 0;
        updates.push({ mediaId, sortOrder });
    });

    if (!updates.length) return;

    saveOrderBtn.disabled = true;
    saveOrderBtn.innerHTML = 'Saving...';

    try {
        for (const update of updates) {
            const res = await fetch(`/api/projects/${projectId}/media/${update.mediaId}/order`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ sort_order: update.sortOrder })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to update order');
            }
        }
        await loadProject();
        uploadStatus.textContent = '✅ Media order updated!';
        uploadStatus.style.color = '#22c55e';
        setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
    } catch (err) {
        console.error('Save order error:', err);
        alert('Unable to save media order: ' + err.message);
    } finally {
        saveOrderBtn.disabled = false;
        saveOrderBtn.innerHTML = '<i data-lucide="save" class="icon"></i> Save Order';
        refreshIcons();
    }
});