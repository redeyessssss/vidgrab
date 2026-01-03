const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;
const YTDLP = '/Users/anupamghosh/Library/Python/3.9/bin/yt-dlp';

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main.html')));

// Run yt-dlp with suppressed warnings
function runYtdlp(args) {
    return new Promise((resolve, reject) => {
        const proc = spawn(YTDLP, args, { env: { ...process.env, PYTHONWARNINGS: 'ignore' } });
        let stdout = '', stderr = '';
        proc.stdout.on('data', d => stdout += d);
        proc.stderr.on('data', d => stderr += d);
        proc.on('close', code => {
            stderr = stderr.replace(/Deprecated Feature:.*\n?/gi, '').trim();
            if (code === 0) resolve(stdout);
            else reject(new Error(stderr || 'yt-dlp failed'));
        });
    });
}

// Get video info
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    console.log('Getting info:', url);

    try {
        const output = await runYtdlp(['-j', '--no-playlist', url]);
        const info = JSON.parse(output);
        
        const formats = (info.formats || [])
            .filter(f => f.url && f.ext === 'mp4' && f.vcodec !== 'none')
            .map(f => ({
                itag: f.format_id,
                quality: f.format_note || f.resolution || f.height + 'p',
                size: f.filesize ? Math.round(f.filesize / 1024 / 1024) + ' MB' : ''
            }))
            .slice(-6);

        res.json({ title: info.title, thumbnail: info.thumbnail, duration: info.duration, formats });
    } catch (e) {
        console.error('yt-dlp error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// Download video
app.get('/api/download', (req, res) => {
    const { url, itag } = req.query;
    if (!url) return res.status(400).json({ error: 'URL required' });
    console.log('Downloading:', url, 'format:', itag);

    const args = ['-o', '-', '--no-playlist'];
    if (itag) args.push('-f', itag);
    else args.push('-f', 'best[ext=mp4]/best');
    args.push(url);

    const ytdlp = spawn(YTDLP, args, { env: { ...process.env, PYTHONWARNINGS: 'ignore' } });
    
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    
    ytdlp.stdout.pipe(res);
    ytdlp.stderr.on('data', d => {
        const msg = d.toString();
        if (!msg.includes('Deprecated')) console.log('yt-dlp:', msg);
    });
    
    req.on('close', () => ytdlp.kill());
});

app.listen(PORT, () => console.log(`\n🎬 Video Downloader at http://localhost:${PORT}\n`));
