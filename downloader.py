#!/usr/bin/env python3
import sys
import json
from pytube import YouTube

def get_info(url):
    try:
        yt = YouTube(url)
        streams = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc()
        formats = []
        for s in streams[:5]:
            formats.append({
                'itag': s.itag,
                'resolution': s.resolution,
                'fps': s.fps,
                'size': round(s.filesize / 1024 / 1024, 1) if s.filesize else 0
            })
        return json.dumps({
            'title': yt.title,
            'thumbnail': yt.thumbnail_url,
            'duration': yt.length,
            'author': yt.author,
            'formats': formats
        })
    except Exception as e:
        return json.dumps({'error': str(e)})

def get_stream_url(url, itag=None):
    try:
        yt = YouTube(url)
        if itag:
            stream = yt.streams.get_by_itag(int(itag))
        else:
            stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
        if stream:
            return json.dumps({'url': stream.url, 'title': yt.title})
        return json.dumps({'error': 'No stream found'})
    except Exception as e:
        return json.dumps({'error': str(e)})

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'Usage: downloader.py <info|stream> <url> [itag]'}))
        sys.exit(1)
    
    action = sys.argv[1]
    url = sys.argv[2]
    
    if action == 'info':
        print(get_info(url))
    elif action == 'stream':
        itag = sys.argv[3] if len(sys.argv) > 3 else None
        print(get_stream_url(url, itag))
