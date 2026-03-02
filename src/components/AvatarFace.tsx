import React, { useEffect, useRef, useCallback } from 'react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
type SpeakingState = 'idle' | 'ai_speaking' | 'user_speaking' | 'processing';

interface AvatarFaceProps {
    connectionState: ConnectionState;
    speakingState: SpeakingState;
    getAudioLevel: (() => number) | null;
}

export const AvatarFace: React.FC<AvatarFaceProps> = ({
    connectionState,
    speakingState,
    getAudioLevel
}) => {
    const mouthRef = useRef<SVGEllipseElement>(null);
    const leftEyeRef = useRef<SVGEllipseElement>(null);
    const rightEyeRef = useRef<SVGEllipseElement>(null);
    const leftPupilRef = useRef<SVGCircleElement>(null);
    const rightPupilRef = useRef<SVGCircleElement>(null);
    const animationFrameRef = useRef<number | null>(null);
    const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const isBlinkingRef = useRef(false);

    // Blink animation
    const doBlink = useCallback(() => {
        if (!leftEyeRef.current || !rightEyeRef.current) return;

        isBlinkingRef.current = true;
        const leftEye = leftEyeRef.current;
        const rightEye = rightEyeRef.current;

        // Close eyes
        leftEye.setAttribute('ry', '1');
        rightEye.setAttribute('ry', '1');

        // Open eyes after 120ms
        setTimeout(() => {
            if (leftEye && rightEye) {
                leftEye.setAttribute('ry', getEyeHeight(speakingState).toString());
                rightEye.setAttribute('ry', getEyeHeight(speakingState).toString());
            }
            isBlinkingRef.current = false;
        }, 120);
    }, [speakingState]);

    // Schedule periodic blinks
    useEffect(() => {
        const scheduleBlink = () => {
            // Random interval between 2-5 seconds
            const interval = 2000 + Math.random() * 3000;
            blinkTimeoutRef.current = setTimeout(() => {
                doBlink();
                scheduleBlink();
            }, interval);
        };

        scheduleBlink();

        return () => {
            if (blinkTimeoutRef.current) {
                clearTimeout(blinkTimeoutRef.current);
            }
        };
    }, [doBlink]);

    // Mouth animation loop driven by audio level
    useEffect(() => {
        if (connectionState !== 'connected') return;

        const animate = () => {
            if (mouthRef.current && speakingState === 'ai_speaking' && getAudioLevel) {
                const level = getAudioLevel();
                // Map audio level to mouth height (2 = closed smile, 14 = wide open)
                const mouthHeight = 2 + level * 12;
                mouthRef.current.setAttribute('ry', mouthHeight.toFixed(1));
                // Also slightly widen the mouth when open
                const mouthWidth = 18 + level * 4;
                mouthRef.current.setAttribute('rx', mouthWidth.toFixed(1));
            } else if (mouthRef.current && speakingState !== 'ai_speaking') {
                // Reset to smile/closed position
                mouthRef.current.setAttribute('ry', '2');
                mouthRef.current.setAttribute('rx', '18');
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [connectionState, speakingState, getAudioLevel]);

    // Update eye expression based on speaking state
    useEffect(() => {
        if (isBlinkingRef.current) return;

        const eyeHeight = getEyeHeight(speakingState);

        if (leftEyeRef.current) leftEyeRef.current.setAttribute('ry', eyeHeight.toString());
        if (rightEyeRef.current) rightEyeRef.current.setAttribute('ry', eyeHeight.toString());

        // Pupil position for "thinking" look
        if (leftPupilRef.current && rightPupilRef.current) {
            if (speakingState === 'processing') {
                // Look up-right (thinking)
                leftPupilRef.current.setAttribute('cy', '72');
                rightPupilRef.current.setAttribute('cy', '72');
                leftPupilRef.current.setAttribute('cx', '82');
                rightPupilRef.current.setAttribute('cx', '122');
            } else {
                // Center
                leftPupilRef.current.setAttribute('cy', '77');
                rightPupilRef.current.setAttribute('cy', '77');
                leftPupilRef.current.setAttribute('cx', '80');
                rightPupilRef.current.setAttribute('cx', '120');
            }
        }
    }, [speakingState]);

    // Get the state-based CSS class for the glow ring
    const getGlowClass = () => {
        if (connectionState !== 'connected') return '';
        switch (speakingState) {
            case 'ai_speaking': return 'glow-speaking';
            case 'user_speaking': return 'glow-listening';
            case 'processing': return 'glow-thinking';
            default: return 'glow-idle';
        }
    };

    // Determine face appearance based on connection state
    const isActive = connectionState === 'connected';
    const isConnecting = connectionState === 'connecting';

    return (
        <div className={`avatar-face-container ${getGlowClass()}`}>
            {/* Background glow ring */}
            <div className="avatar-glow-ring"></div>

            <svg
                className={`avatar-face-svg ${isConnecting ? 'avatar-connecting' : ''}`}
                viewBox="0 0 200 200"
                width="200"
                height="200"
            >
                {/* Face circle */}
                <circle
                    cx="100"
                    cy="100"
                    r="85"
                    className="avatar-head"
                />

                {/* Left eyebrow */}
                <path
                    d={speakingState === 'user_speaking'
                        ? 'M 62 58 Q 75 48, 92 56'  // Raised (attentive)
                        : speakingState === 'processing'
                            ? 'M 62 60 Q 75 50, 92 55'  // Slightly raised (thinking)
                            : 'M 64 60 Q 77 54, 90 58'  // Neutral
                    }
                    className="avatar-eyebrow"
                />

                {/* Right eyebrow */}
                <path
                    d={speakingState === 'user_speaking'
                        ? 'M 108 56 Q 125 48, 138 58'
                        : speakingState === 'processing'
                            ? 'M 108 55 Q 125 50, 138 60'
                            : 'M 110 58 Q 123 54, 136 60'
                    }
                    className="avatar-eyebrow"
                />

                {/* Left eye white */}
                <ellipse
                    cx="80"
                    cy="77"
                    rx="14"
                    ry={isActive ? getEyeHeight(speakingState) : 12}
                    className="avatar-eye-white"
                />

                {/* Right eye white */}
                <ellipse
                    cx="120"
                    cy="77"
                    rx="14"
                    ry={isActive ? getEyeHeight(speakingState) : 12}
                    className="avatar-eye-white"
                />

                {/* Left eye (iris) */}
                <ellipse
                    ref={leftEyeRef}
                    cx="80"
                    cy="77"
                    rx="8"
                    ry={isActive ? getEyeHeight(speakingState) * 0.7 : 8}
                    className="avatar-eye-iris"
                />

                {/* Right eye (iris) */}
                <ellipse
                    ref={rightEyeRef}
                    cx="120"
                    cy="77"
                    rx="8"
                    ry={isActive ? getEyeHeight(speakingState) * 0.7 : 8}
                    className="avatar-eye-iris"
                />

                {/* Left pupil */}
                <circle
                    ref={leftPupilRef}
                    cx="80"
                    cy="77"
                    r="4"
                    className="avatar-pupil"
                />

                {/* Right pupil */}
                <circle
                    ref={rightPupilRef}
                    cx="120"
                    cy="77"
                    r="4"
                    className="avatar-pupil"
                />

                {/* Eye shine (specular highlight) */}
                <circle cx="75" cy="73" r="2.5" className="avatar-eye-shine" />
                <circle cx="115" cy="73" r="2.5" className="avatar-eye-shine" />

                {/* Nose (subtle) */}
                <path
                    d="M 98 88 Q 100 95, 102 88"
                    className="avatar-nose"
                />

                {/* Mouth */}
                {isActive && speakingState === 'ai_speaking' ? (
                    // Animated mouth (ellipse that opens/closes)
                    <ellipse
                        ref={mouthRef}
                        cx="100"
                        cy="118"
                        rx="18"
                        ry="2"
                        className="avatar-mouth-open"
                    />
                ) : (
                    // Smile (static curve)
                    <path
                        d={isActive
                            ? (speakingState === 'user_speaking'
                                ? 'M 82 114 Q 100 130, 118 114'   // Slight smile when listening
                                : speakingState === 'processing'
                                    ? 'M 86 116 Q 100 122, 114 116'    // Neutral when thinking
                                    : 'M 82 114 Q 100 132, 118 114')   // Happy smile when idle
                            : isConnecting
                                ? 'M 86 116 Q 100 122, 114 116'      // Neutral when connecting
                                : 'M 82 114 Q 100 128, 118 114'      // Light smile when disconnected
                        }
                        className="avatar-mouth-smile"
                    />
                )}

                {/* Cheek blush (when AI is speaking happily) */}
                {isActive && speakingState === 'ai_speaking' && (
                    <>
                        <circle cx="58" cy="95" r="10" className="avatar-blush" />
                        <circle cx="142" cy="95" r="10" className="avatar-blush" />
                    </>
                )}

                {/* Disconnected / sleeping overlay */}
                {!isActive && !isConnecting && (
                    <>
                        {/* Closed/sleepy eyes */}
                        <line x1="68" y1="77" x2="92" y2="77" className="avatar-closed-eye" />
                        <line x1="108" y1="77" x2="132" y2="77" className="avatar-closed-eye" />
                    </>
                )}
            </svg>
        </div>
    );
};

/** Get eye height based on speaking state */
function getEyeHeight(state: SpeakingState): number {
    switch (state) {
        case 'user_speaking': return 14;   // Wide eyes (attentive)
        case 'ai_speaking': return 10;     // Slightly squinted (happy talking)
        case 'processing': return 11;      // Normal (thinking)
        default: return 12;                // Neutral idle
    }
}
