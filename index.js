const puppeteer = require('puppeteer');
const fs = require('fs');
const {startServer} = require("./lib/server");

const BANNER_TO_RENDER = '1';
const VIDEO_OUTPUT = 'banner.webm';

const url = `http://localhost:3000/${BANNER_TO_RENDER}`;

(async () => {
    const server = startServer();
    const browser = await puppeteer.launch({
        headless: true,
        devtools: false,
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
    await page.setViewport({width: 1920, height: 1080});
    await page.goto(url);
    await page.evaluate(() => {
        const startRecording = async () => {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                preferCurrentTab: true,
            });
            const [track] = stream.getVideoTracks();
            const captureTarget = document.querySelector('#stage');
            // Make Stage capturable
            captureTarget.style.isolation = 'isolate';
            captureTarget.transformStyle = 'flat';
            const restrictionTarget = await RestrictionTarget.fromElement(captureTarget);
            await track.restrictTo(restrictionTarget);


            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 25000000,
                audioBitsPerSecond: 320000,
            });
            let chunks = [];

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, {type: 'video/webm'});
                const arrayBuffer = await blob.arrayBuffer();
                window.recordedChunks = new Uint8Array(arrayBuffer);
            };

            mediaRecorder.start();
            window.mediaRecorder = mediaRecorder;
        };

        window.startRecording = startRecording;
    });

    await new Promise(resolve => setTimeout(resolve, 3000));


    // Start the recording
    await page.evaluate(() => {
        window.startRecording();
    });

    // Record for a certain amount of time (e.g., 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Stop the recording
    await page.evaluate(() => {
        window.mediaRecorder.stop();
    });

    // Wait for the recording to be processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Retrieve the recorded video
    const recordedChunks = await page.evaluate(() => {
        return Array.from(window.recordedChunks);
    });

    const buffer = Buffer.from(recordedChunks);
    fs.writeFileSync(VIDEO_OUTPUT, buffer);

    await browser.close();
    server.close();
})();
