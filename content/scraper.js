(() => {
  function getImages() {
    const images = new Set();

    function addImageUrl(url) {
      if (!url) return;
      // Basic heuristic to find higher resolution version
      // e.g. converting "image-150x150.jpg" to "image.jpg"
      let highResUrl = url.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp|gif|avif))$/i, '$1');
      
      // Handle some common CDN patterns (e.g. thumbor, cloudinary, shopify)
      highResUrl = highResUrl.replace(/(_\d+x\d+(_crop_center)?)?(\.(jpg|jpeg|png|webp|gif|avif))$/i, '$3');
      
      images.add(highResUrl);
      images.add(url); // Keep original too, Set will handle duplicates
    }

    // 1. Standard <img> tags and advanced data-attributes
    document.querySelectorAll('img').forEach(img => {
      // Prioritize data-original or data-full-res
      addImageUrl(img.getAttribute('data-original'));
      addImageUrl(img.getAttribute('data-full-res'));
      addImageUrl(img.getAttribute('data-src'));
      addImageUrl(img.src);

      if (img.srcset) {
        const sources = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
        // Usually the last one in srcset is the highest resolution
        sources.forEach(src => addImageUrl(src));
      }
    });

    // 2. <picture> tags
    document.querySelectorAll('picture source').forEach(source => {
      if (source.srcset) {
        const sources = source.srcset.split(',').map(s => s.trim().split(' ')[0]);
        sources.forEach(src => addImageUrl(src));
      }
    });

    // 3. <a> tags linking directly to images
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.match(/\.(jpg|jpeg|png|webp|gif|avif)($|\?)/i)) {
        addImageUrl(href);
      }
    });

    // 4. CSS Background images
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') {
        const urlMatch = bg.match(/url\(['"]?(.*?)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          addImageUrl(urlMatch[1]);
        }
      }
    });

    // 4. Meta tags (OG images)
    document.querySelectorAll('meta[property="og:image"]').forEach(meta => {
      if (meta.content) images.add(meta.content);
    });

    // Convert relative to absolute URLs and cleanup
    const finalImages = new Map();

    Array.from(images).forEach(url => {
      try {
        const absoluteUrl = new URL(url, document.baseURI).href;
        if (!absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('data:image')) return;

        const baseUrl = absoluteUrl.replace(/-\d+x\d+(\.(jpg|jpeg|png|webp|gif|avif))$/i, '$1');
        const isThumbnail = absoluteUrl.match(/-\d+x\d+\.(jpg|jpeg|png|webp|gif|avif)$/i);
        
        if (!finalImages.has(baseUrl) || !isThumbnail) {
          // Try to find if this image is currently in the DOM to get dimensions
          let dimensions = { width: 0, height: 0 };
          const domImg = document.querySelector(`img[src="${url}"], img[srcset*="${url}"]`);
          if (domImg) {
            dimensions = {
              width: domImg.naturalWidth || domImg.width || 0,
              height: domImg.naturalHeight || domImg.height || 0
            };
          }
          
          finalImages.set(baseUrl, {
            url: absoluteUrl,
            width: dimensions.width,
            height: dimensions.height
          });
        }
      } catch (e) {}
    });

    return Array.from(finalImages.values());
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'get_images') {
      sendResponse({ images: getImages() });
    }
  });
})();
