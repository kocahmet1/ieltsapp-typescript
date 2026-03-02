import React, { useEffect, useRef, useCallback } from 'react';
import { AudioData } from '../services/realtimeService';
import type { VisemeQueue, VisemeShape } from '../services/visemeMapper';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type SpeakingState = 'idle' | 'ai_speaking' | 'user_speaking' | 'processing';

interface AvatarFaceCanvasProps {
    connectionState: ConnectionState;
    speakingState: SpeakingState;
    getAudioData: (() => AudioData) | null;
    getVisemeQueue: (() => VisemeQueue | null) | null;
}

// --- Animation state managed per frame ---
interface AnimState {
    // Mouth
    mouthOpen: number;      // 0 = closed, 1 = wide open
    mouthWidth: number;     // 0.5 = narrow, 1.2 = wide
    mouthSmile: number;     // 0 = neutral, 1 = full smile
    lipRound: number;       // 0 = spread (EE), 1 = rounded (OO)

    // Eyes
    eyeOpenL: number;       // 0 = closed, 1 = fully open
    eyeOpenR: number;
    pupilX: number;         // -1 to 1 gaze horizontal
    pupilY: number;         // -1 to 1 gaze vertical
    irisSize: number;       // pupil dilation

    // Eyebrows
    browLiftL: number;      // 0 = neutral, 1 = raised, -1 = furrowed
    browLiftR: number;

    // Head
    headTilt: number;       // degrees, -10 to 10
    headNod: number;        // degrees, -5 to 5

    // Mood / glow
    glowHue: number;        // 0-360
    glowIntensity: number;  // 0-1
    blushOpacity: number;   // 0-1
}

interface AnimTargets extends AnimState { }

const DEFAULT_STATE: AnimState = {
    mouthOpen: 0, mouthWidth: 0.8, mouthSmile: 0.6, lipRound: 0.3,
    eyeOpenL: 1, eyeOpenR: 1,
    pupilX: 0, pupilY: 0, irisSize: 1,
    browLiftL: 0, browLiftR: 0,
    headTilt: 0, headNod: 0,
    glowHue: 270, glowIntensity: 0.3, blushOpacity: 0,
};

// Lerp utility
function lerp(current: number, target: number, speed: number, dt: number): number {
    return current + (target - current) * Math.min(1, speed * dt);
}

// Easing for blink (ease-out quad)
function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

export const AvatarFaceCanvas: React.FC<AvatarFaceCanvasProps> = ({
    connectionState,
    speakingState,
    getAudioData,
    getVisemeQueue,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);

    // Animation state (mutable, not React state — updated every frame)
    const state = useRef<AnimState>({ ...DEFAULT_STATE });
    const targets = useRef<AnimTargets>({ ...DEFAULT_STATE });

    // Blink state
    const blinkTimer = useRef(0);
    const nextBlink = useRef(2 + Math.random() * 3);
    const blinkPhase = useRef<'none' | 'closing' | 'opening'>('none');
    const blinkProgress = useRef(0);

    // Gaze wander
    const gazeTimer = useRef(0);
    const gazeTargetX = useRef(0);
    const gazeTargetY = useRef(0);
    const nextGazeChange = useRef(1 + Math.random() * 2);

    // Head nod for speaking
    const nodTimer = useRef(0);

    // Last frame time
    const lastTime = useRef(0);

    const updateTargets = useCallback((dt: number, audio: AudioData) => {
        const t = targets.current;

        // --- Blink system ---
        blinkTimer.current += dt;
        if (blinkPhase.current === 'none' && blinkTimer.current >= nextBlink.current) {
            blinkPhase.current = 'closing';
            blinkProgress.current = 0;
            blinkTimer.current = 0;
            nextBlink.current = 2 + Math.random() * 4;
        }

        if (blinkPhase.current === 'closing') {
            blinkProgress.current += dt * 15; // Very fast close
            t.eyeOpenL = Math.max(0, 1 - blinkProgress.current);
            t.eyeOpenR = Math.max(0, 1 - blinkProgress.current);
            if (blinkProgress.current >= 1) {
                blinkPhase.current = 'opening';
                blinkProgress.current = 0;
            }
        } else if (blinkPhase.current === 'opening') {
            blinkProgress.current += dt * 5; // Slower ease-out open
            const eased = easeOutQuad(Math.min(1, blinkProgress.current));
            t.eyeOpenL = eased;
            t.eyeOpenR = eased;
            if (blinkProgress.current >= 1) {
                blinkPhase.current = 'none';
                t.eyeOpenL = 1;
                t.eyeOpenR = 1;
            }
        }

        // --- Gaze wander ---
        gazeTimer.current += dt;
        if (gazeTimer.current >= nextGazeChange.current) {
            gazeTimer.current = 0;
            nextGazeChange.current = 1.5 + Math.random() * 3;
            gazeTargetX.current = (Math.random() - 0.5) * 0.6;
            gazeTargetY.current = (Math.random() - 0.5) * 0.4;
        }
        t.pupilX = gazeTargetX.current;
        t.pupilY = gazeTargetY.current;

        // --- State-dependent targets ---
        switch (speakingState) {
            case 'ai_speaking': {
                // Head nod while speaking
                nodTimer.current += dt;

                // Try viseme queue first (phoneme-level lip sync)
                const queue = getVisemeQueue ? getVisemeQueue() : null;
                const viseme: VisemeShape | null = queue?.isActive ? queue.update(dt) : null;

                // Check if real audio data is available  
                const hasRealAudio = audio.level > 0.02;

                let mouthOpenVal: number;
                let mouthWidthVal: number;
                let mouthSmileVal: number;

                if (viseme) {
                    // Tier 3: phoneme-driven viseme mouth shapes (amplified)
                    mouthOpenVal = Math.min(1, viseme.mouthOpen * 1.5);
                    mouthWidthVal = viseme.mouthWidth;
                    mouthSmileVal = viseme.lipRound > 0.5 ? 0.1 : 0.3;
                    t.lipRound = viseme.lipRound;
                } else if (hasRealAudio) {
                    // Tier 2 fallback: audio band-driven (amplified)
                    mouthOpenVal = Math.min(1, (audio.low * 0.7 + audio.mid * 0.3) * 2.0);
                    mouthWidthVal = 0.6 + audio.mid * 0.5;
                    mouthSmileVal = 0.2 + (1 - audio.level) * 0.2;
                    t.lipRound = 0.2 + audio.high * 0.5;
                } else {
                    // Tier 1 fallback: dramatic synthetic mouth animation
                    const time = nodTimer.current;
                    // Fast syllable-rate jaw (bigger amplitude)
                    const jaw = Math.max(0, Math.sin(time * 11) * 0.6 + 0.35);
                    // Word grouping creates pauses
                    const wordMod = Math.max(0.3, Math.sin(time * 2.8) * 0.4 + 0.7);
                    // Occasional breath pause
                    const breathMod = Math.max(0.15, Math.sin(time * 0.6) * 0.4 + 0.7);
                    // Extra variation layers
                    const v1 = Math.sin(time * 7.3) * 0.12;
                    const v2 = Math.sin(time * 14.1) * 0.08;
                    const raw = jaw * wordMod * breathMod + v1 + v2;
                    mouthOpenVal = Math.max(0, Math.min(1, raw));
                    mouthWidthVal = 0.6 + mouthOpenVal * 0.35;
                    mouthSmileVal = 0.15 + (1 - mouthOpenVal) * 0.2;
                    t.lipRound = 0.2 + Math.sin(time * 4.5) * 0.35;
                }

                t.mouthOpen = mouthOpenVal;
                t.mouthWidth = mouthWidthVal;
                t.mouthSmile = mouthSmileVal;

                // Happy eyes (slightly squinted)
                if (blinkPhase.current === 'none') {
                    t.eyeOpenL = 0.8;
                    t.eyeOpenR = 0.8;
                }
                t.irisSize = 1;

                // Slightly raised brows
                t.browLiftL = 0.2;
                t.browLiftR = 0.2;

                // Head nod while speaking
                t.headNod = Math.sin(nodTimer.current * 3) * 2;
                t.headTilt = Math.sin(nodTimer.current * 1.3) * 2;

                // Green glow
                t.glowHue = 140;
                t.glowIntensity = 0.4 + (hasRealAudio ? audio.level : mouthOpenVal) * 0.3;
                t.blushOpacity = 0.15;
                break;
            }

            case 'user_speaking': {
                // Attentive: wide eyes, slight head tilt
                t.mouthOpen = 0;
                t.mouthWidth = 0.75;
                t.mouthSmile = 0.4;
                t.lipRound = 0.3;

                if (blinkPhase.current === 'none') {
                    t.eyeOpenL = 1.15;
                    t.eyeOpenR = 1.15;
                }
                t.irisSize = 1.1;

                t.browLiftL = 0.4;
                t.browLiftR = 0.4;

                t.headTilt = 3;
                t.headNod = 0;

                // Blue glow
                t.glowHue = 210;
                t.glowIntensity = 0.4;
                t.blushOpacity = 0;
                break;
            }

            case 'processing': {
                // Thinking: eyes look up, neutral mouth
                t.mouthOpen = 0;
                t.mouthWidth = 0.7;
                t.mouthSmile = 0.15;
                t.lipRound = 0.3;

                if (blinkPhase.current === 'none') {
                    t.eyeOpenL = 0.9;
                    t.eyeOpenR = 0.9;
                }
                t.irisSize = 0.95;

                // Override gaze to look up-right
                t.pupilX = 0.3;
                t.pupilY = -0.5;

                t.browLiftL = 0.3;
                t.browLiftR = 0.5;

                t.headTilt = -2;
                t.headNod = 2;

                // Yellow glow
                t.glowHue = 45;
                t.glowIntensity = 0.35;
                t.blushOpacity = 0;
                break;
            }

            default: { // idle
                t.mouthOpen = 0;
                t.mouthWidth = 0.8;
                t.mouthSmile = 0.6;
                t.lipRound = 0.3;

                if (blinkPhase.current === 'none') {
                    t.eyeOpenL = 1;
                    t.eyeOpenR = 1;
                }
                t.irisSize = 1;

                t.browLiftL = 0;
                t.browLiftR = 0;

                // Gentle sway
                nodTimer.current += dt;
                t.headTilt = Math.sin(nodTimer.current * 0.5) * 1.5;
                t.headNod = Math.sin(nodTimer.current * 0.3) * 0.5;

                // Purple glow
                t.glowHue = 270;
                t.glowIntensity = 0.2 + Math.sin(nodTimer.current * 0.8) * 0.08;
                t.blushOpacity = 0;
                break;
            }
        }
    }, [speakingState, getVisemeQueue]);

    const lerpState = useCallback((dt: number) => {
        const s = state.current;
        const t = targets.current;

        s.mouthOpen = lerp(s.mouthOpen, t.mouthOpen, 20, dt);
        s.mouthWidth = lerp(s.mouthWidth, t.mouthWidth, 8, dt);
        s.mouthSmile = lerp(s.mouthSmile, t.mouthSmile, 5, dt);
        s.lipRound = lerp(s.lipRound, t.lipRound, 10, dt);

        s.eyeOpenL = lerp(s.eyeOpenL, t.eyeOpenL, 18, dt);
        s.eyeOpenR = lerp(s.eyeOpenR, t.eyeOpenR, 18, dt);
        s.pupilX = lerp(s.pupilX, t.pupilX, 3, dt);
        s.pupilY = lerp(s.pupilY, t.pupilY, 3, dt);
        s.irisSize = lerp(s.irisSize, t.irisSize, 4, dt);

        s.browLiftL = lerp(s.browLiftL, t.browLiftL, 4, dt);
        s.browLiftR = lerp(s.browLiftR, t.browLiftR, 4, dt);

        s.headTilt = lerp(s.headTilt, t.headTilt, 3, dt);
        s.headNod = lerp(s.headNod, t.headNod, 4, dt);

        s.glowHue = lerp(s.glowHue, t.glowHue, 2, dt);
        s.glowIntensity = lerp(s.glowIntensity, t.glowIntensity, 3, dt);
        s.blushOpacity = lerp(s.blushOpacity, t.blushOpacity, 3, dt);
    }, []);

    const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
        const s = state.current;
        const cx = w / 2;
        const cy = h / 2;
        const scale = w / 200; // Normalized to 200x200 design

        ctx.clearRect(0, 0, w, h);
        ctx.save();

        // --- Glow ring ---
        const glowR = 95 * scale;
        const glowGrad = ctx.createRadialGradient(cx, cy, glowR * 0.7, cx, cy, glowR * 1.3);
        const glowColor = `hsla(${s.glowHue}, 80%, 60%, ${s.glowIntensity})`;
        glowGrad.addColorStop(0, glowColor);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, glowR * 1.3, 0, Math.PI * 2);
        ctx.fill();

        // --- Audio wave bars around the head (visible during speech) ---
        if (s.mouthOpen > 0.05) {
            const barCount = 28;
            const baseR = 86 * scale;
            const barWidth = 3 * scale;
            const time = performance.now() / 1000;

            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
                // Each bar gets a unique height from mouth + sine variation
                const wave = Math.sin(time * 8 + i * 0.9) * 0.4 + 0.6;
                const wave2 = Math.sin(time * 13 + i * 1.7) * 0.25;
                const barH = (s.mouthOpen * wave + wave2) * 18 * scale;

                if (barH < 1) continue;

                const x1 = cx + Math.cos(angle) * baseR;
                const y1 = cy + Math.sin(angle) * baseR;
                const x2 = cx + Math.cos(angle) * (baseR + barH);
                const y2 = cy + Math.sin(angle) * (baseR + barH);

                // Color gradient based on position (green → blue → purple)
                const hue = (s.glowHue + i * 4) % 360;
                ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${0.3 + s.mouthOpen * 0.4})`;
                ctx.lineWidth = barWidth;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // --- Head transform (tilt + nod) ---
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((s.headTilt * Math.PI) / 180);
        ctx.translate(0, s.headNod * scale);
        ctx.translate(-cx, -cy);

        // --- Head circle ---
        const headR = 80 * scale;
        const headGrad = ctx.createRadialGradient(
            cx - headR * 0.2, cy - headR * 0.2, headR * 0.1,
            cx, cy, headR
        );
        headGrad.addColorStop(0, '#2d1f4e');
        headGrad.addColorStop(1, '#170e2a');
        ctx.fillStyle = headGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, headR, 0, Math.PI * 2);
        ctx.fill();

        // Head border
        ctx.strokeStyle = `hsla(${s.glowHue}, 60%, 55%, 0.6)`;
        ctx.lineWidth = 2.5 * scale;
        ctx.stroke();

        // --- Eyebrows ---
        const browY = cy - 28 * scale;
        const browSpread = 20 * scale;
        ctx.strokeStyle = `hsla(270, 60%, 65%, 0.7)`;
        ctx.lineWidth = 2.5 * scale;
        ctx.lineCap = 'round';

        // Left brow
        ctx.beginPath();
        const lBrowLift = s.browLiftL * 5 * scale;
        ctx.moveTo(cx - browSpread - 12 * scale, browY - lBrowLift + 2 * scale);
        ctx.quadraticCurveTo(
            cx - browSpread, browY - lBrowLift - 4 * scale,
            cx - browSpread + 14 * scale, browY - lBrowLift
        );
        ctx.stroke();

        // Right brow
        ctx.beginPath();
        const rBrowLift = s.browLiftR * 5 * scale;
        ctx.moveTo(cx + browSpread - 14 * scale, browY - rBrowLift);
        ctx.quadraticCurveTo(
            cx + browSpread, browY - rBrowLift - 4 * scale,
            cx + browSpread + 12 * scale, browY - rBrowLift + 2 * scale
        );
        ctx.stroke();

        // --- Eyes ---
        const eyeSpacing = 20 * scale;
        const eyeY = cy - 18 * scale;
        drawEye(ctx, cx - eyeSpacing, eyeY, scale, s.eyeOpenL, s.pupilX, s.pupilY, s.irisSize);
        drawEye(ctx, cx + eyeSpacing, eyeY, scale, s.eyeOpenR, s.pupilX, s.pupilY, s.irisSize);

        // --- Nose ---
        ctx.strokeStyle = 'rgba(163, 113, 247, 0.25)';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(cx - 2 * scale, cy + 2 * scale);
        ctx.quadraticCurveTo(cx, cy + 8 * scale, cx + 2 * scale, cy + 2 * scale);
        ctx.stroke();

        // --- Mouth ---
        drawMouth(ctx, cx, cy + 22 * scale, scale, s.mouthOpen, s.mouthWidth, s.mouthSmile, s.lipRound);

        // --- Cheek blush ---
        if (s.blushOpacity > 0.01) {
            ctx.fillStyle = `rgba(236, 72, 153, ${s.blushOpacity})`;
            ctx.beginPath();
            ctx.ellipse(cx - 35 * scale, cy + 5 * scale, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cx + 35 * scale, cy + 5 * scale, 10 * scale, 7 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore(); // head transform
        ctx.restore(); // initial save
    }, []);

    // --- Main animation loop ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle DPR for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        const size = 200;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        lastTime.current = performance.now();

        const loop = (timestamp: number) => {
            const dt = Math.min(0.1, (timestamp - lastTime.current) / 1000); // cap at 100ms
            lastTime.current = timestamp;

            const audio: AudioData = getAudioData
                ? getAudioData()
                : { level: 0, low: 0, mid: 0, high: 0, isSpeaking: false };

            updateTargets(dt, audio);
            lerpState(dt);
            draw(ctx, size, size);

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, [connectionState, speakingState, getAudioData, updateTargets, lerpState, draw]);

    return (
        <div className="avatar-face-container">
            <canvas
                ref={canvasRef}
                className="avatar-face-canvas"
                width={200}
                height={200}
            />
        </div>
    );
};

// ========== Drawing helpers ==========

function drawEye(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    scale: number,
    openness: number, // 0-1+
    gazeX: number, gazeY: number,
    irisScale: number
) {
    const eyeW = 13 * scale;
    const eyeH = 11 * scale * Math.max(0.05, openness);

    // Eye white
    ctx.fillStyle = '#e8e0f0';
    ctx.beginPath();
    ctx.ellipse(x, y, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    if (openness < 0.1) return; // Eyes closed, don't draw iris/pupil

    // Clip to eye shape
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, eyeW - 1, eyeH - 1, 0, 0, Math.PI * 2);
    ctx.clip();

    // Iris
    const irisR = 7.5 * scale * irisScale;
    const gazeOffX = gazeX * 4 * scale;
    const gazeOffY = gazeY * 3 * scale;
    const irisGrad = ctx.createRadialGradient(
        x + gazeOffX, y + gazeOffY, irisR * 0.2,
        x + gazeOffX, y + gazeOffY, irisR
    );
    irisGrad.addColorStop(0, '#8b6cc4');
    irisGrad.addColorStop(0.7, '#6d4aaa');
    irisGrad.addColorStop(1, '#4a2d80');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(x + gazeOffX, y + gazeOffY, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    const pupilR = 3.5 * scale * irisScale;
    ctx.fillStyle = '#1a0e2e';
    ctx.beginPath();
    ctx.arc(x + gazeOffX, y + gazeOffY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x + gazeOffX - 3 * scale, y + gazeOffY - 3 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Small secondary highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x + gazeOffX + 2 * scale, y + gazeOffY + 1.5 * scale, 1.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // unclip
}

function drawMouth(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    scale: number,
    openness: number,  // 0-1
    width: number,     // 0.5-1.2
    smile: number,     // 0-1
    lipRound: number   // 0 = spread, 1 = rounded
) {
    // Width modulated by lip rounding (rounded = narrower)
    const roundFactor = 1 - lipRound * 0.35;
    const mouthW = 18 * scale * width * roundFactor;
    const mouthH = openness * 22 * scale;

    if (openness > 0.08) {
        // --- Open mouth ---
        ctx.save();

        // Outer mouth shape — rounded lips use a more circular shape
        const ovalRatio = lipRound > 0.5 ? 0.85 : 1.0; // more circular for OO sounds
        const adjustedW = mouthW * ovalRatio;
        const adjustedH = Math.max(3 * scale, mouthH * (lipRound > 0.5 ? 1.2 : 1.0));

        // Dark mouth interior
        ctx.fillStyle = '#1a0e2e';
        ctx.beginPath();
        ctx.ellipse(x, y, adjustedW, adjustedH, 0, 0, Math.PI * 2);
        ctx.fill();

        // Upper teeth row (visible at moderate opening)
        if (openness > 0.2 && lipRound < 0.7) {
            ctx.fillStyle = 'rgba(220, 215, 230, 0.6)';
            ctx.beginPath();
            const teethW = adjustedW * 0.8;
            const teethH = Math.min(adjustedH * 0.25, 4 * scale);
            ctx.ellipse(x, y - adjustedH * 0.5 + teethH * 0.5, teethW, teethH, 0, Math.PI, Math.PI * 2);
            ctx.fill();
        }

        // Tongue (visible when wide open and not rounded)
        if (openness > 0.45 && lipRound < 0.6) {
            ctx.fillStyle = '#3d2060';
            ctx.beginPath();
            ctx.ellipse(x, y + adjustedH * 0.3, adjustedW * 0.5, adjustedH * 0.35, 0, 0, Math.PI);
            ctx.fill();
        }

        // Lip outline — thicker for rounded shapes
        const lipThickness = lipRound > 0.5 ? 2.5 : 1.5;
        ctx.strokeStyle = `rgba(163, 113, 247, ${0.4 + lipRound * 0.2})`;
        ctx.lineWidth = lipThickness * scale;
        ctx.beginPath();
        ctx.ellipse(x, y, adjustedW, adjustedH, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Upper lip highlight for rounded shapes (the "pucker")
        if (lipRound > 0.4 && openness > 0.15) {
            ctx.strokeStyle = 'rgba(180, 140, 230, 0.35)';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.arc(x, y - adjustedH, adjustedW * 0.6, Math.PI * 0.15, Math.PI * 0.85);
            ctx.stroke();
        }

        ctx.restore();
    } else {
        // --- Closed mouth ---
        const smileCurve = smile * 8 * scale;

        // For rounded resting mouth (M, B, P sounds)
        if (lipRound > 0.4) {
            // Pressed/pursed lips — small rounded line
            ctx.strokeStyle = 'rgba(163, 113, 247, 0.7)';
            ctx.lineWidth = 3 * scale;
            ctx.lineCap = 'round';
            const pursedW = mouthW * 0.5;
            ctx.beginPath();
            ctx.moveTo(x - pursedW, y);
            ctx.quadraticCurveTo(x, y + smileCurve * 0.3, x + pursedW, y);
            ctx.stroke();
        } else {
            // Normal smile
            ctx.strokeStyle = 'rgba(163, 113, 247, 0.7)';
            ctx.lineWidth = 2.5 * scale;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - mouthW, y);
            ctx.quadraticCurveTo(x, y + smileCurve, x + mouthW, y);
            ctx.stroke();
        }
    }
}
