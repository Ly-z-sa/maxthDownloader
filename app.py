from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import sys
import os
import requests
import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import threading
import uuid
from datetime import datetime
import glob

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"]}})

@app.route('/')
def serve_index():
    try:
        return send_file('index.html')
    except FileNotFoundError:
        return '<h1>Maxth Downloader</h1><p>index.html not found in current directory</p>', 404

# ================= CONFIG =================
CLIENT_ID = "3d3a936ca2d74fc5bacb2bc14fa0f7b0"
CLIENT_SECRET = "ef096e8f95384fb6b1e0f412eb15f7ff"

SPOTIFY_DIR = "project/spotify"
YT_AUDIO_DIR = "project/youtube_audio"
YT_VIDEO_DIR = "project/youtube_video"
TIKTOK_DIR = "project/tiktok"
TWITTER_DIR = "project/twitter"
PINTEREST_DIR = "project/pinterest"
FACEBOOK_DIR = "project/facebook"
INSTAGRAM_DIR = "project/instagram"
# ==========================================

os.makedirs(SPOTIFY_DIR, exist_ok=True)
os.makedirs(YT_AUDIO_DIR, exist_ok=True)
os.makedirs(YT_VIDEO_DIR, exist_ok=True)
os.makedirs(TIKTOK_DIR, exist_ok=True)
os.makedirs(TWITTER_DIR, exist_ok=True)
os.makedirs(PINTEREST_DIR, exist_ok=True)
os.makedirs(FACEBOOK_DIR, exist_ok=True)
os.makedirs(INSTAGRAM_DIR, exist_ok=True)

sp = spotipy.Spotify(
    auth_manager=SpotifyClientCredentials(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET
    )
)

# Store download status
downloads = {}

def get_files(directory, name_pattern):
    files = []
    for ext in ['mp3', 'jpg']:
        pattern = os.path.join(directory, f"{name_pattern}.{ext}")
        matches = glob.glob(pattern)
        if matches:
            files.extend([os.path.basename(f) for f in matches])
    return files

def get_latest_files(directory):
    files = os.listdir(directory)
    if files:
        latest = max(files, key=lambda f: os.path.getctime(os.path.join(directory, f)))
        return [latest]
    return []

def download_facebook(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading Facebook video...'
        subprocess.run([
            "yt-dlp", url,
            "-o", f"{FACEBOOK_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{FACEBOOK_DIR}/"
        downloads[download_id]['files'] = get_latest_files(FACEBOOK_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_spotify(url, download_id):
    try:
        downloads[download_id]['status'] = 'Fetching track info...'
        track = sp.track(url)
        artist = track["artists"][0]["name"]
        title = track["name"]
        
        downloads[download_id]['status'] = f'Found: {artist} - {title}'
        downloads[download_id]['title'] = f'{artist} - {title}'
        
        downloads[download_id]['status'] = 'Downloading audio (320k MP3)...'
        subprocess.run([
            sys.executable, "-m", "spotdl", url,
            "--format", "mp3", "--bitrate", "320k",
            "--output", f"{SPOTIFY_DIR}/Maxth Downloader - {{artist}} - {{title}}.{{output-ext}}",
            "--overwrite", "force"
        ], check=True)
        
        downloads[download_id]['status'] = 'Downloading album cover...'
        cover_url = track["album"]["images"][0]["url"]
        r = requests.get(cover_url, timeout=15)
        safe_name = f"Maxth Downloader - {artist} - {title}".replace("/", "_")
        with open(os.path.join(SPOTIFY_DIR, safe_name + ".jpg"), "wb") as f:
            f.write(r.content)
        
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{SPOTIFY_DIR}/"
        downloads[download_id]['files'] = get_files(SPOTIFY_DIR, safe_name)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_youtube_audio(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading audio...'
        subprocess.run([
            "yt-dlp", url,
            "-f", "bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio",
            "-o", f"{YT_AUDIO_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{YT_AUDIO_DIR}/"
        downloads[download_id]['files'] = get_latest_files(YT_AUDIO_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_youtube_video(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading video (720p max)...'
        subprocess.run([
            "yt-dlp", url,
            "-f", "best[height<=720]",
            "-o", f"{YT_VIDEO_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{YT_VIDEO_DIR}/"
        downloads[download_id]['files'] = get_latest_files(YT_VIDEO_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_tiktok(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading video...'
        subprocess.run([
            "yt-dlp", url,
            "-o", f"{TIKTOK_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{TIKTOK_DIR}/"
        downloads[download_id]['files'] = get_latest_files(TIKTOK_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_twitter(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading video...'
        subprocess.run([
            "yt-dlp", url,
            "-o", f"{TWITTER_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{TWITTER_DIR}/"
        downloads[download_id]['files'] = get_latest_files(TWITTER_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_pinterest(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading video...'
        subprocess.run([
            "yt-dlp", url,
            "-o", f"{PINTEREST_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{PINTEREST_DIR}/"
        downloads[download_id]['files'] = get_latest_files(PINTEREST_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

def download_instagram(url, download_id):
    try:
        downloads[download_id]['status'] = 'Downloading video...'
        subprocess.run([
            "yt-dlp", url,
            "-o", f"{INSTAGRAM_DIR}/Maxth Downloader - %(title)s.%(ext)s"
        ], check=True)
        downloads[download_id]['status'] = 'completed'
        downloads[download_id]['output_path'] = f"{INSTAGRAM_DIR}/"
        downloads[download_id]['files'] = get_latest_files(INSTAGRAM_DIR)
    except Exception as e:
        downloads[download_id]['status'] = 'error'
        downloads[download_id]['error'] = str(e)

@app.route('/download', methods=['POST', 'OPTIONS'])
def start_download():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.json
    url = data.get('url')
    platform = data.get('platform')
    
    if not url or not platform:
        return jsonify({'error': 'URL and platform required'}), 400
    
    download_id = str(uuid.uuid4())
    downloads[download_id] = {
        'status': 'starting',
        'platform': platform,
        'url': url,
        'created_at': datetime.now().isoformat()
    }
    
    # Start download in background
    download_functions = {
        'spotify': download_spotify,
        'youtube-audio': download_youtube_audio,
        'youtube-video': download_youtube_video,
        'tiktok': download_tiktok,
        'twitter': download_twitter,
        'pinterest': download_pinterest,
        'facebook': download_facebook,
        'instagram': download_instagram
    }
    
    if platform in download_functions:
        thread = threading.Thread(
            target=download_functions[platform],
            args=(url, download_id)
        )
        thread.start()
        return jsonify({'download_id': download_id})
    else:
        return jsonify({'error': 'Invalid platform'}), 400

@app.route('/status/<download_id>', methods=['GET', 'OPTIONS'])
def get_status(download_id):
    if request.method == 'OPTIONS':
        return '', 200
    if download_id in downloads:
        return jsonify(downloads[download_id])
    else:
        return jsonify({'error': 'Download not found'}), 404

@app.route('/download-file/<platform>/<filename>', methods=['GET', 'OPTIONS'])
def download_file(platform, filename):
    if request.method == 'OPTIONS':
        return '', 200
    directories = {
        'spotify': SPOTIFY_DIR,
        'youtube-audio': YT_AUDIO_DIR,
        'youtube-video': YT_VIDEO_DIR,
        'tiktok': TIKTOK_DIR,
        'twitter': TWITTER_DIR,
        'pinterest': PINTEREST_DIR,
        'facebook': FACEBOOK_DIR,
        'instagram': INSTAGRAM_DIR
    }
    
    if platform not in directories:
        return jsonify({'error': 'Invalid platform'}), 404
    
    file_path = os.path.join(directories[platform], filename)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({'error': 'File not found'}), 404

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
    print(f'Maxth Downloader running on port {port}')
    print(f'Visit: http://localhost:{port}')