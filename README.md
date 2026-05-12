# Visionary Image Downloader

A premium Chrome Extension (Manifest V3) that scrapes, filters, and downloads images from any website as a ZIP file.

## ✨ Features

- **Premium UI**: Modern Glassmorphism design with a sleek dark mode.
- **Smart Scraping**: Automatically detects images in `<img>`, `srcset`, CSS backgrounds, and `<picture>` tags.
- **Resolution Intelligence**: Prioritizes high-resolution images and attempts to strip thumbnail suffixes to find original sources.
- **Real-time Stats**: Shows total images found, selected count, and estimated download size (MB).
- **Bulk Renaming**: Set a custom prefix for all files in the ZIP archive.
- **Filtering**: Filter by dimensions (Min Width) and file format.
- **Re-scan**: Easily re-scan pages for lazy-loaded images.

## 🛠 Tech Stack

- **Manifest V3**
- **Vanilla JS/CSS/HTML**
- **JSZip**: For client-side ZIP generation.

## 🚀 Installation

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the root directory of this project.

## 📂 Project Structure

- `manifest.json`: Extension configuration.
- `popup/`: UI and interaction logic.
- `content/`: Scraper script injected into pages.
- `background/`: Service worker for ZIP generation and size calculation.
- `assets/`: Icons and third-party libraries (JSZip).

## 📄 License

MIT
