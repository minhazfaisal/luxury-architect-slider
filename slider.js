/**
 * Aperture & Monolith — Architectural Showcase Slider
 * Inspired by the Opus 5.5 + Higgsfield AI Web Design Reel
 * Vanilla JavaScript (ES6+), High-Performance, Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // State & DOM Elements
  // =========================================================================
  const slides = Array.from(document.querySelectorAll('.slide'));
  const totalSlides = slides.length;
  let currentIndex = 0;
  let isTransitioning = false;

  // Autoplay Configuration
  const AUTOPLAY_DURATION = 6000; // 6 seconds
  let autoplayTimer = null;
  let autoplayProgressTimer = null;
  let isAutoplayPaused = false;
  let autoplayStartTime = 0;

  // DOM Elements
  const sliderWrapper = document.getElementById('sliderWrapper');
  const ghostNumber = document.getElementById('ghostNumber');
  const currentSlideDisplay = document.getElementById('currentSlideDisplay');
  const categoryName = document.getElementById('categoryName');
  const progressCircle = document.getElementById('progressCircle');
  const timelineSegments = Array.from(document.querySelectorAll('.timeline-segment'));
  const thumbItems = Array.from(document.querySelectorAll('.thumb-item'));
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const autoplayLabel = document.getElementById('autoplayLabel');
  const iconPause = playPauseBtn.querySelector('.icon-pause');
  const iconPlay = playPauseBtn.querySelector('.icon-play');
  const ambientGlow = document.getElementById('ambientGlow');
  const meterBar = document.getElementById('meterBar');

  // Drawer Elements
  const promptBtn = document.getElementById('promptBtn');
  const promptDrawer = document.getElementById('promptDrawer');
  const drawerClose = document.getElementById('drawerClose');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const copyPromptBtn = document.getElementById('copyPromptBtn');
  const promptText = document.getElementById('promptText');

  // Audio Toggle
  const audioToggle = document.getElementById('audioToggle');
  const equalizerBars = audioToggle.querySelector('.equalizer-bars');

  // Custom Cursor
  const cursor = document.getElementById('cursor');
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let targetX = cursorX;
  let targetY = cursorY;

  // Radial Progress constant (2 * PI * r) where r = 24 -> ~150.79
  const CIRCLE_CIRCUMFERENCE = 150.79;

  // =========================================================================
  // Slide Switch Engine
  // =========================================================================
  function goToSlide(targetIndex, direction = 'next') {
    if (isTransitioning || targetIndex === currentIndex) return;
    isTransitioning = true;

    // Reset current active slide
    const currentSlide = slides[currentIndex];
    currentSlide.classList.remove('active');
    currentSlide.classList.add(direction === 'next' ? 'prev' : 'next');

    // Update Index
    const previousIndex = currentIndex;
    currentIndex = (targetIndex + totalSlides) % totalSlides;
    const nextSlide = slides[currentIndex];

    // Clean other slide classes
    slides.forEach((slide, idx) => {
      if (idx !== currentIndex && idx !== previousIndex) {
        slide.classList.remove('active', 'prev', 'next');
      }
    });

    // Activate next slide
    nextSlide.classList.remove('prev', 'next');
    nextSlide.classList.add('active');

    // Update Theme Colors & Dynamic Variables
    const themeColor = nextSlide.dataset.theme || '#d97736';
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--theme-glow', hexToRgba(themeColor, 0.25));

    // Update Ambient Glow color
    if (ambientGlow) {
      ambientGlow.style.background = `radial-gradient(circle, ${hexToRgba(themeColor, 0.3)} 0%, rgba(0,0,0,0) 70%)`;
    }

    // Update HUD counters
    const formattedIndex = String(currentIndex + 1).padStart(2, '0');
    if (ghostNumber) {
      ghostNumber.textContent = formattedIndex;
      ghostNumber.style.transform = 'translate(-50%, -50%) scale(0.95)';
      setTimeout(() => {
        ghostNumber.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 50);
    }

    if (currentSlideDisplay) {
      currentSlideDisplay.textContent = formattedIndex;
    }

    if (categoryName) {
      const activeTitle = nextSlide.querySelector('.title-line');
      categoryName.textContent = activeTitle ? activeTitle.textContent : 'MONOLITH';
    }

    // Update Thumbnails
    thumbItems.forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === currentIndex);
    });

    // Update Timeline Segments
    timelineSegments.forEach((seg, idx) => {
      seg.classList.remove('active', 'passed');
      if (idx < currentIndex) {
        seg.classList.add('passed');
      } else if (idx === currentIndex) {
        seg.classList.add('active');
      }
    });

    // Reset Radial Progress
    resetRadialProgress();

    // Trigger subtle sound FX
    playHapticClick();

    // Unlock transitions after animation finishes
    setTimeout(() => {
      slides.forEach((slide, idx) => {
        if (idx !== currentIndex) {
          slide.classList.remove('prev', 'next');
        }
      });
      isTransitioning = false;
    }, 900);

    // Restart Autoplay
    restartAutoplay();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1, 'next');
  }

  function prevSlide() {
    goToSlide(currentIndex - 1, 'prev');
  }

  // =========================================================================
  // Drag / Swipe Physics (Touch & Mouse)
  // =========================================================================
  let isDragging = false;
  let startX = 0;
  let currentDragDelta = 0;
  const DRAG_THRESHOLD = 70; // px required to trigger slide

  function onPointerDown(e) {
    if (isTransitioning) return;
    // Don't drag if clicking buttons or drawer
    if (e.target.closest('button, .prompt-drawer, a')) return;

    isDragging = true;
    startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    currentDragDelta = 0;
    pauseAutoplay();

    document.body.classList.add('cursor-drag');
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    currentDragDelta = clientX - startX;

    // Visual drag feedback on active slide frame
    const activeFrame = slides[currentIndex].querySelector('.aperture-frame');
    if (activeFrame) {
      const tiltX = Math.max(Math.min(currentDragDelta * 0.08, 12), -12);
      activeFrame.style.transform = `perspective(1000px) rotateY(${tiltX}deg) translateX(${currentDragDelta * 0.2}px)`;
    }

    // Update bottom drag meter
    if (meterBar) {
      const percentage = Math.min(Math.abs(currentDragDelta) / DRAG_THRESHOLD, 1) * 50;
      meterBar.style.width = `${percentage * 2}%`;
      meterBar.style.left = currentDragDelta > 0 ? '50%' : `${50 - percentage * 2}%`;
    }
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove('cursor-drag');

    // Reset active frame transform
    const activeFrame = slides[currentIndex].querySelector('.aperture-frame');
    if (activeFrame) {
      activeFrame.style.transform = 'perspective(1000px) rotateY(0deg) translateX(0px)';
    }

    // Reset drag meter
    if (meterBar) {
      meterBar.style.width = '0%';
      meterBar.style.left = '50%';
    }

    // Check threshold
    if (currentDragDelta < -DRAG_THRESHOLD) {
      nextSlide();
    } else if (currentDragDelta > DRAG_THRESHOLD) {
      prevSlide();
    } else {
      resumeAutoplay();
    }
  }

  sliderWrapper.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  sliderWrapper.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);

  // =========================================================================
  // 3D Perspective Tilt on Mouse Movement
  // =========================================================================
  sliderWrapper.addEventListener('mousemove', (e) => {
    if (isDragging || isTransitioning) return;
    const rect = sliderWrapper.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const activeFrame = slides[currentIndex].querySelector('.aperture-frame');
    if (activeFrame) {
      const rotateX = -y * 8; // degrees
      const rotateY = x * 10;
      activeFrame.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    }
  });

  sliderWrapper.addEventListener('mouseleave', () => {
    const activeFrame = slides[currentIndex].querySelector('.aperture-frame');
    if (activeFrame) {
      activeFrame.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
    }
  });

  // =========================================================================
  // Custom Cursor Smoothing Loop
  // =========================================================================
  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function renderCursor() {
    cursorX += (targetX - cursorX) * 0.18;
    cursorY += (targetY - cursorY) * 0.18;

    if (cursor) {
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
    }
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Cursor Hover Triggers
  sliderWrapper.addEventListener('mouseenter', () => {
    document.body.classList.add('cursor-drag');
  });
  sliderWrapper.addEventListener('mouseleave', () => {
    if (!isDragging) document.body.classList.remove('cursor-drag');
  });

  // =========================================================================
  // Radial Progress Ring & Autoplay Timer
  // =========================================================================
  function startAutoplay() {
    autoplayStartTime = performance.now();
    isAutoplayPaused = false;

    if (autoplayTimer) clearTimeout(autoplayTimer);
    if (autoplayProgressTimer) cancelAnimationFrame(autoplayProgressTimer);

    function updateProgress(now) {
      if (isAutoplayPaused) return;
      const elapsed = now - autoplayStartTime;
      const progress = Math.min(elapsed / AUTOPLAY_DURATION, 1);

      // Update SVG Circle
      if (progressCircle) {
        const offset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * progress);
        progressCircle.style.strokeDashoffset = offset;
      }

      if (progress < 1) {
        autoplayProgressTimer = requestAnimationFrame(updateProgress);
      } else {
        nextSlide();
      }
    }

    autoplayProgressTimer = requestAnimationFrame(updateProgress);
  }

  function resetRadialProgress() {
    if (progressCircle) {
      progressCircle.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
    }
  }

  function pauseAutoplay() {
    isAutoplayPaused = true;
    if (autoplayProgressTimer) cancelAnimationFrame(autoplayProgressTimer);
    if (autoplayLabel) autoplayLabel.textContent = 'PAUSED';
    if (iconPause) iconPause.style.display = 'none';
    if (iconPlay) iconPlay.style.display = 'block';
  }

  function resumeAutoplay() {
    if (promptDrawer.classList.contains('open')) return;
    isAutoplayPaused = false;
    autoplayStartTime = performance.now();
    if (autoplayLabel) autoplayLabel.textContent = 'AUTOPLAY 6S';
    if (iconPause) iconPause.style.display = 'block';
    if (iconPlay) iconPlay.style.display = 'none';
    startAutoplay();
  }

  function restartAutoplay() {
    if (!isAutoplayPaused) {
      startAutoplay();
    }
  }

  // Play/Pause Button Toggle
  playPauseBtn.addEventListener('click', () => {
    if (isAutoplayPaused) {
      resumeAutoplay();
    } else {
      pauseAutoplay();
    }
  });

  // Pause autoplay when hovering over editorial text or dock
  document.querySelectorAll('.slide-content, .slider-dock').forEach(elem => {
    elem.addEventListener('mouseenter', pauseAutoplay);
    elem.addEventListener('mouseleave', () => {
      if (!isDragging) resumeAutoplay();
    });
  });

  // Navigation Arrow Buttons
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  // Mini Thumbnails Click
  thumbItems.forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.index, 10);
      goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
    });
  });

  // Timeline Segments Click
  timelineSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      const idx = parseInt(seg.dataset.slide, 10);
      goToSlide(idx, idx > currentIndex ? 'next' : 'prev');
    });
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      nextSlide();
    } else if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === ' ' && !e.target.closest('input, textarea, button')) {
      e.preventDefault();
      if (isAutoplayPaused) resumeAutoplay();
      else pauseAutoplay();
    } else if (e.key === 'Escape') {
      closePromptDrawer();
    }
  });

  // =========================================================================
  // Prompt HUD Drawer
  // =========================================================================
  function openPromptDrawer() {
    promptDrawer.classList.add('open');
    promptDrawer.setAttribute('aria-hidden', 'false');
    pauseAutoplay();
  }

  function closePromptDrawer() {
    promptDrawer.classList.remove('open');
    promptDrawer.setAttribute('aria-hidden', 'true');
    resumeAutoplay();
  }

  promptBtn.addEventListener('click', openPromptDrawer);
  drawerClose.addEventListener('click', closePromptDrawer);
  drawerBackdrop.addEventListener('click', closePromptDrawer);

  document.querySelectorAll('[data-action="view-specs"]').forEach(btn => {
    btn.addEventListener('click', openPromptDrawer);
  });

  // Copy Prompt to Clipboard
  copyPromptBtn.addEventListener('click', () => {
    const text = promptText.textContent;
    navigator.clipboard.writeText(text).then(() => {
      copyPromptBtn.textContent = 'COPIED!';
      copyPromptBtn.style.background = 'var(--theme-color)';
      copyPromptBtn.style.color = '#fff';
      setTimeout(() => {
        copyPromptBtn.textContent = 'COPY';
        copyPromptBtn.style.background = '';
        copyPromptBtn.style.color = '';
      }, 2000);
    });
  });

  // =========================================================================
  // Web Audio Synthesizer (Ambient Drone & Haptic Cues)
  // =========================================================================
  let audioCtx = null;
  let isAudioPlaying = false;
  let osc1 = null, osc2 = null, masterGain = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
  }

  function toggleAmbientAudio() {
    initAudio();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (!isAudioPlaying) {
      // Start Warm Ambient Drone (Root C2 65.4Hz + Fifth G2 98.0Hz with Lowpass Filter)
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.08, audioCtx.currentTime + 2.5);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, audioCtx.currentTime);

      osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(65.4, audioCtx.currentTime); // C2

      osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(98.0, audioCtx.currentTime); // G2

      // Gentle LFO for warm organic swell
      const lfo = audioCtx.createOscillator();
      const lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(0.2, audioCtx.currentTime); // 0.2Hz swell
      lfoGain.gain.setValueAtTime(40, audioCtx.currentTime);
      lfo.connect(filter.frequency);
      lfo.start();

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      isAudioPlaying = true;
      equalizerBars.classList.add('playing');
      audioToggle.style.borderColor = 'var(--theme-color)';
    } else {
      // Fade out and stop
      if (masterGain) {
        masterGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
        setTimeout(() => {
          if (osc1) { osc1.stop(); osc1.disconnect(); }
          if (osc2) { osc2.stop(); osc2.disconnect(); }
        }, 1200);
      }
      isAudioPlaying = false;
      equalizerBars.classList.remove('playing');
      audioToggle.style.borderColor = '';
    }
  }

  function playHapticClick() {
    if (!audioCtx || !isAudioPlaying) return;
    try {
      const clickOsc = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(440, audioCtx.currentTime);
      clickOsc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.04);

      clickGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      clickGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

      clickOsc.connect(clickGain);
      clickGain.connect(audioCtx.destination);

      clickOsc.start();
      clickOsc.stop(audioCtx.currentTime + 0.04);
    } catch (_) {}
  }

  audioToggle.addEventListener('click', toggleAmbientAudio);

  // Helper: Hex color to RGBA
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // =========================================================================
  // Initialize
  // =========================================================================
  startAutoplay();
});
