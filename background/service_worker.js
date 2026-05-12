importScripts('../assets/vendor/jszip.min.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download_zip') {
    createZip(request.images, request.folderName, request.prefix)
      .then(blobUrl => {
        chrome.downloads.download({
          url: blobUrl,
          filename: `${request.folderName || 'images'}.zip`,
          saveAs: true
        });
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('ZIP Error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open
  }

  if (request.action === 'get_file_size') {
    getFileSize(request.url)
      .then(size => sendResponse({ size }))
      .catch(() => sendResponse({ size: 0 }));
    return true;
  }
});

async function getFileSize(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const size = response.headers.get('content-length');
    return size ? parseInt(size) : 0;
  } catch (e) {
    return 0;
  }
}

async function createZip(imageUrls, folderName, prefix) {
  const zip = new JSZip();
  const folder = zip.folder(folderName || 'images');

  const downloadPromises = imageUrls.map(async (url, index) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const blob = await response.blob();
      
      // Determine extension from URL or content-type
      let ext = url.split('.').pop().split(/[?#]/)[0] || 'png';
      if (ext.length > 4) ext = 'png';
      
      const fileName = `${prefix || 'image'}_${index + 1}.${ext}`;
      folder.file(fileName, blob);
    } catch (e) {
      console.warn(`Failed to fetch image: ${url}`, e);
    }
  });

  await Promise.all(downloadPromises);
  const content = await zip.generateAsync({ type: 'blob' });
  
  // Convert blob to data URL because chrome.downloads.download URL must be a string
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(content);
  });
}
