let allImages = [];
let selectedImages = new Set();
let imageSizes = {}; // Cache for image sizes

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('image-grid');
  const totalCountEl = document.getElementById('total-count');
  const selectedCountEl = document.getElementById('selected-count');
  const totalSizeEl = document.getElementById('total-size');
  const downloadBtn = document.getElementById('download-btn');
  const selectAllBtn = document.getElementById('select-all');
  const deselectAllBtn = document.getElementById('deselect-all');
  const minWidthInput = document.getElementById('min-width');
  const fileTypeInput = document.getElementById('file-type');
  const renamePrefixInput = document.getElementById('rename-prefix');
  const rescanBtn = document.getElementById('rescan-btn');
  const overlay = document.getElementById('loading-overlay');

  // 1. Get images from content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  async function fetchImages() {
    grid.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Scanning...</p></div>';
    chrome.tabs.sendMessage(tab.id, { action: 'get_images' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        grid.innerHTML = '<div class="empty-state"><p style="color: var(--error)">Error: Scan failed.</p></div>';
        return;
      }
      allImages = response.images;
      renderGrid();
    });
  }

  fetchImages();

  rescanBtn.onclick = fetchImages;

  function renderGrid() {
    const minWidth = parseInt(minWidthInput.value) || 0;
    const typeFilter = fileTypeInput.value.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

    const filtered = allImages.filter(img => {
      const { url, width, height } = img;
      
      // Min dimension filter (if dimension is 0, we show it anyway to be safe)
      if (minWidth > 0 && width > 0 && width < minWidth) return false;

      // Basic type filtering
      if (typeFilter.length > 0) {
        const ext = url.split('.').pop().split(/[?#]/)[0].toLowerCase();
        if (!typeFilter.includes(ext)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No images found matches filters.</p></div>';
      stats.textContent = '0 images found';
      return;
    }

    grid.innerHTML = '';
    filtered.forEach((imgData, index) => {
      const { url, width, height } = imgData;
      const card = document.createElement('div');
      card.className = `image-card ${selectedImages.has(url) ? 'selected' : ''}`;
      
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      
      const info = document.createElement('div');
      info.className = 'info';
      const dimText = width > 0 ? ` [${width}x${height}]` : '';
      info.textContent = (url.split('/').pop().split('?')[0] || `image_${index}`) + dimText;

      card.appendChild(img);
      card.appendChild(info);
      
      card.onclick = () => {
        if (selectedImages.has(url)) {
          selectedImages.delete(url);
          card.classList.remove('selected');
        } else {
          selectedImages.add(url);
          card.classList.add('selected');
        }
        updateStats();
      };

      grid.appendChild(card);
    });

    updateStats();
  }

  async function updateStats() {
    totalCountEl.textContent = allImages.length;
    selectedCountEl.textContent = selectedImages.size;
    
    downloadBtn.disabled = selectedImages.size === 0;
    downloadBtn.style.opacity = selectedImages.size === 0 ? '0.5' : '1';

    // Calculate Size
    let totalBytes = 0;
    const selectedList = Array.from(selectedImages);
    
    // We update UI immediately and then refine with sizes
    totalSizeEl.textContent = 'Calculating...';

    const sizePromises = selectedList.map(async (url) => {
      if (imageSizes[url] !== undefined) return imageSizes[url];
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'get_file_size', url }, (response) => {
          const size = (response && response.size) ? response.size : 0;
          imageSizes[url] = size;
          resolve(size);
        });
      });
    });

    const sizes = await Promise.all(sizePromises);
    totalBytes = sizes.reduce((acc, curr) => acc + curr, 0);
    
    const mb = (totalBytes / (1024 * 1024)).toFixed(2);
    totalSizeEl.textContent = `${mb} MB`;
  }

  selectAllBtn.onclick = () => {
    allImages.forEach(img => selectedImages.add(img.url));
    renderGrid();
  };

  deselectAllBtn.onclick = () => {
    selectedImages.clear();
    renderGrid();
  };

  minWidthInput.oninput = renderGrid;
  fileTypeInput.oninput = renderGrid;

  downloadBtn.onclick = () => {
    if (selectedImages.size === 0) return;

    overlay.style.display = 'flex';
    
    const folderName = new URL(tab.url).hostname.replace('www.', '');

    chrome.runtime.sendMessage({
      action: 'download_zip',
      images: Array.from(selectedImages),
      folderName: folderName,
      prefix: renamePrefixInput.value.trim()
    }, (response) => {
      overlay.style.display = 'none';
      if (response && response.success) {
        // Show success notification or just let download handle it
      } else {
        alert('Download failed: ' + (response ? response.error : 'Unknown error'));
      }
    });
  };
});
