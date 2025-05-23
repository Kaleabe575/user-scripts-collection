// ==UserScript==
// @name         Twitter/X Force HQ Video
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Always play Twitter/X videos in highest quality, prevent auto-pausing, and add HQ toggle
// @author       YourName
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        none
// @updateURL    https://yourdomain.com/twitter-x-force-hq-video.user.js
// @downloadURL  https://yourdomain.com/twitter-x-force-hq-video.user.js
// @supportURL   https://github.com/yourusername/yourrepo/issues
// ==/UserScript==

(function() {
    'use strict';

    let forceHQ = true;

    // Create toggle button
    function createToggle() {
        if (document.getElementById('hq-toggle-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'hq-toggle-btn';
        btn.textContent = 'HQ: ON';
        btn.style.position = 'fixed';
        btn.style.top = '10px';
        btn.style.right = '10px';
        btn.style.zIndex = 9999;
        btn.style.background = '#1da1f2';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.padding = '8px 16px';
        btn.style.borderRadius = '6px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        btn.onclick = function() {
            forceHQ = !forceHQ;
            btn.textContent = 'HQ: ' + (forceHQ ? 'ON' : 'OFF');
        };
        document.body.appendChild(btn);
    }

    // Force highest quality on video
    function setHQ(video) {
        if (!forceHQ) return;
        if (video.dataset.hqSet) return;
        // Try to set all available qualities
        if (video.getAvailableQualityLevels) {
            const levels = video.getAvailableQualityLevels();
            if (levels && levels.length) {
                video.setPlaybackQuality(levels[0]); // highest
            }
        }
        // For most browsers, try to set src to highest quality
        // Twitter/X uses HLS (m3u8), so we can try to set playbackRate and buffer
        video.playbackRate = 1;
        video.preload = 'auto';
        video.dataset.hqSet = '1';
    }

    // Prevent pausing on interaction, but allow manual pause and auto-pause when out of view
    function preventPause(video) {
        if (video.dataset.preventPause) return;
        let userPaused = false;
        // Detect manual pause
        video.addEventListener('pause', function(e) {
            if (!video.dataset.autoPaused && !video.dataset.outOfView) {
                userPaused = true;
            }
        }, true);
        video.addEventListener('play', function() {
            userPaused = false;
        }, true);
        // Prevent unwanted pause (not by user or out of view)
        const handler = (e) => {
            if (forceHQ && video.paused && !userPaused && !video.dataset.outOfView) {
                video.play();
            }
        };
        video.addEventListener('pause', handler, true);
        video.dataset.preventPause = '1';
        // Intersection Observer for auto-pause when out of view
        if (!video.dataset.observing) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        video.dataset.outOfView = '1';
                        video.dataset.autoPaused = '1';
                        video.pause();
                        delete video.dataset.autoPaused;
                    } else {
                        delete video.dataset.outOfView;
                        if (!userPaused && forceHQ && video.paused) {
                            video.play();
                        }
                    }
                });
            }, { threshold: 0.1 });
            observer.observe(video);
            video.dataset.observing = '1';
        }
        // Always set HQ and resume if needed when user clicks play
        video.addEventListener('play', function() {
            setHQ(video);
            if (forceHQ && !userPaused && !video.dataset.outOfView && video.paused) {
                video.play();
            }
        }, true);
    }

    // Observe for new videos
    function observeVideos() {
        const process = (video) => {
            setHQ(video);
            preventPause(video);
        };
        // Initial
        document.querySelectorAll('video').forEach(process);
        // Observe DOM
        const observer = new MutationObserver(() => {
            document.querySelectorAll('video').forEach(process);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Re-apply HQ on play (in case Twitter/X changes quality)
    function reapplyHQ() {
        document.addEventListener('play', function(e) {
            if (e.target && e.target.tagName === 'VIDEO') {
                setHQ(e.target);
            }
        }, true);
    }

    // Wait for body
    function waitForBody() {
        if (document.body) {
            createToggle();
            observeVideos();
            reapplyHQ();
        } else {
            setTimeout(waitForBody, 100);
        }
    }

    waitForBody();
})();
