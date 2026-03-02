/**
 * Viseme Mapper — converts text to phoneme-approximated mouth shapes.
 *
 * Uses a simplified English/Turkish phoneme-to-viseme mapping based on
 * the Preston Blair phoneme set, adapted for real-time use.
 *
 * Viseme shapes (0-8):
 *   0: REST    — mouth closed, neutral
 *   1: PP      — lips pressed (P, B, M)
 *   2: FF      — lower lip to upper teeth (F, V)
 *   3: TH      — tongue between teeth (TH)
 *   4: DD      — tongue behind upper teeth (T, D, N, L, S, Z)
 *   5: KK      — back tongue raised (K, G, NG, R)
 *   6: CH      — wide, slight opening (SH, CH, J, ZH)
 *   7: EE      — wide lips (E, I, EE)
 *   8: AA      — open jaw (A, O, AH)
 *   9: OO      — rounded lips (O, U, W, OO)
 */

export type VisemeId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface VisemeShape {
    mouthOpen: number;   // 0-1
    mouthWidth: number;  // 0.5-1.2
    lipRound: number;    // 0 = spread, 1 = rounded
}

/**
 * Mouth shape parameters for each viseme ID
 */
export const VISEME_SHAPES: Record<VisemeId, VisemeShape> = {
    0: { mouthOpen: 0.0, mouthWidth: 0.8, lipRound: 0.3 }, // REST
    1: { mouthOpen: 0.0, mouthWidth: 0.7, lipRound: 0.5 }, // PP (lips pressed)
    2: { mouthOpen: 0.15, mouthWidth: 0.8, lipRound: 0.2 }, // FF (lip-teeth)
    3: { mouthOpen: 0.2, mouthWidth: 0.85, lipRound: 0.2 }, // TH (tongue out)
    4: { mouthOpen: 0.25, mouthWidth: 0.85, lipRound: 0.3 }, // DD (tongue-teeth)
    5: { mouthOpen: 0.35, mouthWidth: 0.75, lipRound: 0.4 }, // KK (back tongue)
    6: { mouthOpen: 0.3, mouthWidth: 0.9, lipRound: 0.3 }, // CH (wide slight)
    7: { mouthOpen: 0.4, mouthWidth: 1.0, lipRound: 0.1 }, // EE (wide open)
    8: { mouthOpen: 0.75, mouthWidth: 0.9, lipRound: 0.2 }, // AA (open jaw)
    9: { mouthOpen: 0.45, mouthWidth: 0.6, lipRound: 0.9 }, // OO (rounded)
};

/**
 * Map of character digraphs/chars to viseme IDs.
 * Digraphs checked first, then single chars.
 */
const DIGRAPH_MAP: [string, VisemeId][] = [
    ['sh', 6], ['ch', 6], ['th', 3], ['ph', 2],
    ['ng', 5], ['ck', 5], ['wh', 9],
    ['ee', 7], ['ea', 7], ['ie', 7],
    ['oo', 9], ['ou', 9], ['ow', 9],
    ['ai', 8], ['ay', 8], ['ey', 7],
    ['oi', 8], ['oy', 8],
];

const CHAR_MAP: Record<string, VisemeId> = {
    // Consonants
    'p': 1, 'b': 1, 'm': 1,
    'f': 2, 'v': 2,
    't': 4, 'd': 4, 'n': 4, 'l': 4, 's': 4, 'z': 4,
    'k': 5, 'g': 5, 'r': 5, 'q': 5, 'x': 5,
    'j': 6, 'y': 7,
    'w': 9,
    'h': 8,
    'c': 5, // default c -> k sound

    // Vowels
    'a': 8, 'e': 7, 'i': 7,
    'o': 9, 'u': 9,

    // Turkish specific letters
    'ç': 6, 'ş': 6, 'ğ': 5, 'ı': 7, 'ö': 9, 'ü': 9,
};

export interface VisemeFrame {
    visemeId: VisemeId;
    shape: VisemeShape;
    duration: number;  // estimated ms
    char: string;      // source character(s)
}

/**
 * Speech rate: approximate phonemes per second for natural speech.
 * Turkish averages ~5-6 syllables/sec, English ~4-5.
 */
const PHONEME_DURATION_MS = 70; // ~14 phonemes/sec
const SPACE_DURATION_MS = 40;   // short pause between words

/**
 * Convert a text string to a sequence of viseme frames.
 */
export function textToVisemes(text: string): VisemeFrame[] {
    const frames: VisemeFrame[] = [];
    const lower = text.toLowerCase();
    let i = 0;

    while (i < lower.length) {
        const char = lower[i];

        // Skip non-letter characters (spaces, punctuation)
        if (!/[a-zçşğıöü]/i.test(char)) {
            // Add a brief rest for spaces/punctuation
            if (char === ' ' || char === ',' || char === '.' || char === '!' || char === '?') {
                const pauseDuration = char === ' ' ? SPACE_DURATION_MS :
                    char === ',' ? 120 :
                        150; // period/exclamation = longer pause
                frames.push({
                    visemeId: 0,
                    shape: VISEME_SHAPES[0],
                    duration: pauseDuration,
                    char: char,
                });
            }
            i++;
            continue;
        }

        // Check digraphs first (2 chars)
        if (i + 1 < lower.length) {
            const di = lower.substring(i, i + 2);
            const digraphMatch = DIGRAPH_MAP.find(([pattern]) => pattern === di);
            if (digraphMatch) {
                const visemeId = digraphMatch[1];
                frames.push({
                    visemeId,
                    shape: VISEME_SHAPES[visemeId],
                    duration: PHONEME_DURATION_MS * 1.2, // digraphs slightly longer
                    char: di,
                });
                i += 2;
                continue;
            }
        }

        // Single character
        const visemeId = CHAR_MAP[char] ?? 0;
        frames.push({
            visemeId,
            shape: VISEME_SHAPES[visemeId],
            duration: PHONEME_DURATION_MS,
            char: char,
        });
        i++;
    }

    return frames;
}

/**
 * VisemeQueue — manages a queue of viseme frames for real-time playback.
 * Feeds viseme shapes at the correct timing for lip sync.
 */
export class VisemeQueue {
    private queue: VisemeFrame[] = [];
    private currentIndex = 0;
    private frameTimer = 0;
    private _isActive = false;

    /** Add new text chunk to the queue (call on each transcript delta) */
    enqueue(text: string): void {
        const frames = textToVisemes(text);
        this.queue.push(...frames);
        this._isActive = true;
    }

    /** Clear the queue (on new response or disconnect) */
    clear(): void {
        this.queue = [];
        this.currentIndex = 0;
        this.frameTimer = 0;
        this._isActive = false;
    }

    /** Whether viseme data is actively being played */
    get isActive(): boolean {
        return this._isActive && this.currentIndex < this.queue.length;
    }

    /**
     * Advance the queue by `dt` seconds and return the current viseme shape.
     * Returns null if queue is exhausted.
     */
    update(dt: number): VisemeShape | null {
        if (!this._isActive || this.currentIndex >= this.queue.length) {
            this._isActive = false;
            return null;
        }

        this.frameTimer += dt * 1000; // convert to ms

        const currentFrame = this.queue[this.currentIndex];
        if (this.frameTimer >= currentFrame.duration) {
            this.frameTimer -= currentFrame.duration;
            this.currentIndex++;

            // If we've exhausted the queue, return null
            if (this.currentIndex >= this.queue.length) {
                this._isActive = false;
                return null;
            }
        }

        // Blend between current and next frame for smoothness
        const frame = this.queue[this.currentIndex];
        const nextFrame = this.currentIndex + 1 < this.queue.length
            ? this.queue[this.currentIndex + 1]
            : frame;

        const progress = this.frameTimer / frame.duration;
        const blendFactor = Math.min(1, progress * 1.5); // slight anticipation

        return {
            mouthOpen: frame.shape.mouthOpen + (nextFrame.shape.mouthOpen - frame.shape.mouthOpen) * blendFactor * 0.3,
            mouthWidth: frame.shape.mouthWidth + (nextFrame.shape.mouthWidth - frame.shape.mouthWidth) * blendFactor * 0.3,
            lipRound: frame.shape.lipRound + (nextFrame.shape.lipRound - frame.shape.lipRound) * blendFactor * 0.3,
        };
    }
}
