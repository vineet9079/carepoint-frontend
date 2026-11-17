import React, { useEffect, useRef, useState } from 'react';

function tone(ctx, frequency, duration, type = 'sine', volume = 0.035, endFrequency = frequency) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, endFrequency), now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain); gain.connect(ctx.destination);
  oscillator.start(now); oscillator.stop(now + duration + 0.02);
}

export default function AmbientExperience() {
  const audioRef = useRef(null);
  const enabledRef = useRef(localStorage.getItem('carepoint_sounds') !== 'off');
  const [soundOn, setSoundOn] = useState(enabledRef.current);
  const [ambientOn, setAmbientOn] = useState(localStorage.getItem('carepoint_ambient') !== 'off');

  useEffect(() => {
    const getContext = () => {
      if (!audioRef.current) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioRef.current = new AudioContext();
      }
      if (audioRef.current?.state === 'suspended') audioRef.current.resume();
      return audioRef.current;
    };
    const clickSound = () => {
      if (!enabledRef.current) return;
      const ctx = getContext(); if (ctx) tone(ctx, 560, .085, 'sine', .014, 420);
    };
    const notificationSound = () => {
      if (!enabledRef.current) return;
      const ctx = getContext(); if (!ctx) return;
      tone(ctx, 720, .13, 'sine', .028, 900);
      window.setTimeout(() => tone(ctx, 940, .17, 'sine', .022, 1080), 120);
    };
    const onClick = e => {
      const target = e.target.closest('a.cp-nav-link, a.cp-mobile-nav-link, button[data-sound="click"], button[aria-label*="notification" i], button[title*="notification" i]');
      if (target && !target.disabled) clickSound();
    };
    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const parentLive = record.target?.nodeType === 1 ? record.target.closest?.('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]') : null;
        if (parentLive && parentLive.textContent.trim()) { notificationSound(); return; }
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          const live = node.matches?.('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]') ? node : node.querySelector?.('[role="status"],[role="alert"],[aria-live="polite"],[aria-live="assertive"]');
          if (live && live.textContent.trim()) { notificationSound(); return; }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { document.removeEventListener('click', onClick, true); observer.disconnect(); };
  }, []);

  const toggleSound = () => {
    const next = !soundOn; setSoundOn(next); enabledRef.current = next;
    localStorage.setItem('carepoint_sounds', next ? 'on' : 'off');
    if (next) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) { if (!audioRef.current) audioRef.current = new AudioContext(); if (audioRef.current.state === 'suspended') audioRef.current.resume(); tone(audioRef.current, 560, .08, 'sine', .018, 760); }
    }
  };
  const toggleAmbient = () => { const next = !ambientOn; setAmbientOn(next); localStorage.setItem('carepoint_ambient', next ? 'on' : 'off'); };

  return <>
    <div className={`cp-ambient-scene ${ambientOn ? 'is-on' : ''}`} aria-hidden="true">
      <span className="cp-aurora cp-aurora-one"/><span className="cp-aurora cp-aurora-two"/><span className="cp-aurora cp-aurora-three"/>
    </div>
    <div className="cp-experience-controls" aria-label="Experience settings">
      <button type="button" onClick={toggleAmbient} title={ambientOn ? 'Turn motion off' : 'Turn motion on'} aria-label={ambientOn ? 'Turn motion off' : 'Turn motion on'}><span className={`cp-control-orb ${ambientOn ? 'is-on' : ''}`} />{ambientOn ? 'Motion' : 'Motion off'}</button>
      <button type="button" onClick={toggleSound} title={soundOn ? 'Turn sound off' : 'Turn sound on'} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}><span className="cp-sound-glyph">{soundOn ? '♫' : '×'}</span>{soundOn ? 'Sound' : 'Sound off'}</button>
    </div>
  </>;
}
