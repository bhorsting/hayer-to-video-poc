const puppeteer = require('puppeteer');
const fs = require('fs');
const {startServer} = require("./lib/server");

const BANNER_TO_RENDER = '1';
const VIDEO_OUTPUT = 'banner.webm';

const url = `http://localhost:3000/${BANNER_TO_RENDER}`;

(async () => {
    const server = startServer();
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,
        args: [
            `--window-size=1920,1080`,
            '--enable-experimental-web-platform-features',
            '--disable-infobars',
            '--disable-web-security',
            '--enable-usermedia-screen-capturing',
            '--allow-http-screen-capture',
            '--auto-select-desktop-capture-source=webclip',
            '--ignore-certificate-errors',
            '--auto-select-tab-capture-source-by-title=Test',
            '--unsafely-treat-insecure-origin-as-secure=' + url
        ]
    });
    const page = await browser.newPage();
    page.on('console', msg => {
        if(msg){
            console.log('PAGE LOG:', msg.text())
        }
    });
    await page.setViewport({width: 1920, height: 1080});
    await page.goto(url);
    await page.evaluate(() => {
        const ENCODE_WIDTH = 1920;
        const ENCODE_HEIGHT = 1080;
        const startRecording = async () => {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                preferCurrentTab: true,
                frameRate: 120,
            });
            const [track] = stream.getVideoTracks();
            const imageCapture = new ImageCapture(track);
            const canvas = document.createElement('canvas');
            document.body.appendChild(canvas);

            const videoEncoder = new VideoEncoder({
                output: (chunk) => {
                    window.chunks.push(chunk);
                },
                error: (e) => {
                    console.error(e);
                },
                mimeType: 'video/webm; codecs=vp9',
            });

            videoEncoder.configure({
                codec: "vp09.00.10.08",
                width: ENCODE_WIDTH,
                height: ENCODE_HEIGHT,
                bitrateMode: "quantizer",
                framerate: 30,
                latencyMode: "realtime",
            });

            canvas.width = ENCODE_WIDTH;
            canvas.height = ENCODE_HEIGHT;

            setInterval(()=>{
                imageCapture.grabFrame().then((imageBitmap) => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(imageBitmap, 0, 0, ENCODE_WIDTH, ENCODE_HEIGHT);
                    const frameFromCanvas = new VideoFrame(canvas, {
                        timestamp: performance.now(),
                    });
                    videoEncoder.encode(frameFromCanvas, {keyFrame: true});
                    //const data = canvas.toDataURL('image/png');
                });
            }, 10);


            const captureTarget = document.querySelector('#stage');
            // Make Stage capturable
            captureTarget.style.isolation = 'isolate';
            captureTarget.transformStyle = 'flat';
            const restrictionTarget = await RestrictionTarget.fromElement(captureTarget);
            await track.restrictTo(restrictionTarget);

            window.chunks = [];
            window.videoEncoder = videoEncoder;

        };

        window.startRecording = startRecording;
    });

    await new Promise(resolve => setTimeout(resolve, 3000));


    // Start the recording
    await page.evaluate(() => {
        window.banner.pause();
        window.banner.seek(0);
        window.banner.play();
        window.startRecording();
    });

    // Record for a certain amount of time (e.g., 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop the recording
    await page.evaluate(async () => {
        //window.mediaRecorder.stop();
        await window.videoEncoder.flush();
    });

    // Wait for the recording to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Retrieve the recorded video
    const recordedChunks = await page.evaluate(async () => {
        await window.videoEncoder.close();
        return Array.from(window.recordedChunks);
    });

    const buffer = Buffer.from(recordedChunks);
    fs.writeFileSync(VIDEO_OUTPUT, buffer);

    //await browser.close();
    server.close();
})();
