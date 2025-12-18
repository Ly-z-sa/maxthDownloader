class MediaDownloader {
    constructor() {
        this.currentPlatform = 'spotify';
        this.downloads = [];
        this.downloadedFiles = new Set();
        this.apiUrl = window.location.origin;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateDownloadsList();
        this.setupBeforeUnloadWarning();
        this.logStatus('Media Downloader initialized', 'info');
    }

    bindEvents() {
        // Platform selection
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectPlatform(e.target.closest('.platform-btn').dataset.platform);
                this.hideProgressBar();
            });
        });

        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.startDownload();
        });

        // Enter key in URL input
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startDownload();
            }
        });
        
        // Clear progress when URL input changes
        document.getElementById('urlInput').addEventListener('input', () => {
            this.hideProgressBar();
        });
        
        // Track download link clicks
        document.getElementById('downloadsList').addEventListener('click', (e) => {
            if (e.target.classList.contains('download-link')) {
                const filename = e.target.textContent;
                this.trackDownload(filename);
            }
        });
        
        // Custom dropdown for mobile
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        
        dropdownSelected.addEventListener('click', () => {
            const isActive = dropdownSelected.classList.contains('active');
            if (isActive) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        });
        
        dropdownOptions.addEventListener('click', (e) => {
            const option = e.target.closest('.dropdown-option');
            if (option) {
                const value = option.dataset.value;
                const text = option.textContent.trim();
                this.selectDropdownOption(value, text);
                this.selectPlatform(value);
                this.hideProgressBar();
                this.closeDropdown();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const customDropdown = document.getElementById('customDropdown');
            if (!customDropdown.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    selectPlatform(platform) {
        this.currentPlatform = platform;
        
        // Update active button
        document.querySelectorAll('.platform-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`[data-platform="${platform}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Update custom dropdown
        this.updateDropdownSelection(platform);
        
        // Update info card
        document.querySelectorAll('.info-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector(`[data-info="${platform}"]`).classList.add('active');
        
        // Update placeholder
        const placeholders = {
            'spotify': 'https://open.spotify.com/track/...',
            'youtube-audio': 'https://www.youtube.com/watch?v=...',
            'youtube-video': 'https://www.youtube.com/watch?v=...',
            'tiktok': 'https://www.tiktok.com/@user/video/...',
            'twitter': 'https://twitter.com/user/status/...',
            'pinterest': 'https://pin.it/...',
            'facebook': 'https://www.facebook.com/reel/... or watch?v=...',
            'instagram': 'https://www.instagram.com/p/... or /reel/...'
        };
        document.getElementById('urlInput').placeholder = placeholders[platform];
    }

    async startDownload() {
        const url = document.getElementById('urlInput').value.trim();
        if (!url) {
            this.logStatus('Please enter a URL', 'error');
            return;
        }

        if (!this.validateUrl(url)) {
            this.logStatus('Invalid URL for selected platform', 'error');
            return;
        }

        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Downloading...';

        try {
            await this.simulateDownload(url);
        } catch (error) {
            this.logStatus(`Error: ${error.message}`, 'error');
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download';
        }
    }

    validateUrl(url) {
        const patterns = {
            'spotify': /spotify\.com\/(track|album|playlist)/,
            'youtube-audio': /youtube\.com\/watch|youtu\.be\//,
            'youtube-video': /youtube\.com\/watch|youtu\.be\//,
            'tiktok': /tiktok\.com/,
            'twitter': /twitter\.com|x\.com/,
            'pinterest': /pinterest\.com\/pin\/|pin\.it\//,
            'facebook': /facebook\.com\/(watch|share|reel|.*\/videos)/,
            'instagram': /instagram\.com\/(p|reel|tv)\//
        };
        return patterns[this.currentPlatform]?.test(url) || false;
    }

    async simulateDownload(url) {
        try {
            // Start download
            const response = await fetch(`${this.apiUrl}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, platform: this.currentPlatform })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const text = await response.text();
            if (!text) {
                throw new Error('Empty response');
            }
            
            const data = JSON.parse(text);
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Poll for status
            await this.pollDownloadStatus(data.download_id, url);
            
        } catch (error) {
            this.logStatus(`Error: ${error.message}`, 'error');
        }
    }
    
    async pollDownloadStatus(downloadId, url) {
        this.showProgressBar();
        
        while (true) {
            try {
                const response = await fetch(`${this.apiUrl}/status/${downloadId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                const text = await response.text();
                if (!text) {
                    throw new Error('Empty response');
                }
                
                const status = JSON.parse(text);
                
                if (status.status === 'completed') {
                    this.updateProgress(100, 'Download completed!');
                    
                    const downloadData = {
                        title: status.title || 'Downloaded Media',
                        platform: this.currentPlatform,
                        url,
                        outputPath: status.output_path,
                        files: status.files || [],
                        timestamp: new Date().toISOString()
                    };
                    this.addDownload(downloadData);
                    document.getElementById('urlInput').value = '';
                    break;
                } else if (status.status === 'error') {
                    this.updateProgress(0, `Download failed. We apologize for the inconvenience. Error: ${status.error}`, true);
                    break;
                } else {
                    const progress = this.getProgressFromStatus(status.status);
                    this.updateProgress(progress, status.status);
                }
                
                await this.delay(1000);
            } catch (error) {
                this.updateProgress(0, `Download failed. We apologize for the inconvenience. ${error.message}`, true);
                break;
            }
        }
    }
    
    getProgressFromStatus(status) {
        const progressMap = {
            'starting': 10,
            'Fetching track info...': 20,
            'Downloading audio (320k MP3)...': 60,
            'Downloading album cover...': 80,
            'Downloading audio...': 70,
            'Downloading video...': 70,
            'Downloading video (720p max)...': 70,
            'Downloading Facebook video...': 70,
            'Extracting Facebook video URL...': 30
        };
        
        for (const [key, value] of Object.entries(progressMap)) {
            if (status.includes(key)) return value;
        }
        
        return status.includes('Found:') ? 40 : 50;
    }
    
    showProgressBar() {
        const statusLog = document.getElementById('statusLog');
        statusLog.innerHTML = `
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">Starting download...</div>
                <div class="download-info">Download speed depends on your network connection and server load</div>
            </div>
        `;
    }
    
    updateProgress(percentage, text, isError = false) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.className = `progress-fill ${isError ? 'error' : percentage === 100 ? 'success' : ''}`;
        }
        
        if (progressText) {
            progressText.textContent = text;
            progressText.className = `progress-text ${isError ? 'error' : percentage === 100 ? 'success' : ''}`;
        }
    }
    
    hideProgressBar() {
        const statusLog = document.getElementById('statusLog');
        statusLog.innerHTML = '';
    }



    addDownload(data) {
        this.downloads.unshift(data);
        if (this.downloads.length > 10) {
            this.downloads = this.downloads.slice(0, 10);
        }
        this.updateDownloadsList();
        this.showWarningBanner();
    }

    updateDownloadsList() {
        const list = document.getElementById('downloadsList');
        const countElement = document.querySelector('.download-count');
        
        if (this.downloads.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #64748b; padding: 40px;">No downloads yet</div>';
            countElement.textContent = '0 files';
            return;
        }

        const totalFiles = this.downloads.reduce((sum, d) => sum + (d.files?.length || 0), 0);
        countElement.textContent = `${totalFiles} file${totalFiles !== 1 ? 's' : ''}`;

        list.innerHTML = this.downloads.map(download => `
            <div class="download-item">
                <div class="download-info">
                    <div class="download-title">${download.title}</div>
                    <div class="download-platform">${download.platform}</div>
                    ${download.files ? this.renderDownloadLinks(download) : ''}
                </div>
                <div class="download-time">${this.formatTime(download.timestamp)}</div>
            </div>
        `).join('');
    }
    
    renderDownloadLinks(download) {
        if (!download.files || download.files.length === 0) return '';
        
        return `<div class="download-links">
            ${download.files.map(file => 
                `<a href="${this.apiUrl}/download-file/${download.platform}/${encodeURIComponent(file)}" 
                   class="download-link" download>${file}</a>`
            ).join('')}
        </div>`;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }

    logStatus(message, type = 'info') {
        // Only used for initialization and validation messages now
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    trackDownload(filename) {
        this.downloadedFiles.add(filename);
        this.checkAllDownloaded();
    }
    
    checkAllDownloaded() {
        const totalFiles = this.downloads.reduce((sum, d) => sum + (d.files?.length || 0), 0);
        if (this.downloadedFiles.size >= totalFiles && totalFiles > 0) {
            this.hideWarningBanner();
        }
    }
    
    showWarningBanner() {
        if (this.downloads.length > 0 && !document.getElementById('warningBanner')) {
            const banner = document.createElement('div');
            banner.id = 'warningBanner';
            banner.className = 'warning-banner';
            banner.innerHTML = `
                <div class="warning-content">
                    <span class="warning-text">Warning: Downloaded media will be deleted after page reload or close. Please download all files to your device first.</span>
                    <button class="warning-close" onclick="document.getElementById('warningBanner').remove()">×</button>
                </div>
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }
    }
    
    hideWarningBanner() {
        const banner = document.getElementById('warningBanner');
        if (banner) {
            banner.remove();
        }
    }
    
    setupBeforeUnloadWarning() {
        window.addEventListener('beforeunload', (e) => {
            const totalFiles = this.downloads.reduce((sum, d) => sum + (d.files?.length || 0), 0);
            if (totalFiles > 0 && this.downloadedFiles.size < totalFiles) {
                const message = 'You have undownloaded files that will be lost.';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });
    }
    
    openDropdown() {
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        
        dropdownSelected.classList.add('active');
        dropdownOptions.classList.add('show');
    }
    
    closeDropdown() {
        const dropdownSelected = document.getElementById('dropdownSelected');
        const dropdownOptions = document.getElementById('dropdownOptions');
        
        dropdownSelected.classList.remove('active');
        dropdownOptions.classList.remove('show');
    }
    
    selectDropdownOption(value, text) {
        const selectedText = document.querySelector('.selected-text');
        selectedText.textContent = text;
        
        // Update selected state in options
        document.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-value="${value}"]`).classList.add('selected');
    }
    
    updateDropdownSelection(platform) {
        const platformNames = {
            'spotify': 'Spotify',
            'youtube-audio': 'YouTube Audio',
            'youtube-video': 'YouTube Video',
            'tiktok': 'TikTok',
            'twitter': 'Twitter/X',
            'pinterest': 'Pinterest',
            'facebook': 'Facebook',
            'instagram': 'Instagram'
        };
        
        const selectedText = document.querySelector('.selected-text');
        if (selectedText && platformNames[platform]) {
            selectedText.textContent = platformNames[platform];
        }
        
        // Update selected state in options
        document.querySelectorAll('.dropdown-option').forEach(option => {
            option.classList.remove('selected');
        });
        const selectedOption = document.querySelector(`[data-value="${platform}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new MediaDownloader();
});