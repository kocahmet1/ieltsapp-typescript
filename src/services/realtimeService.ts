import { VisemeQueue } from './visemeMapper';

/**
 * OpenAI Realtime API Service
 * Provides bi-directional voice conversation capabilities for the Voice Tutor feature.
 * 
 * This service uses the OpenAI Realtime API via WebRTC for low-latency voice interactions.
 */

import { getExistingMicrophoneStream, isMicrophonePermissionGranted } from './microphoneService';

export interface RealtimeSessionConfig {
  instructions: string;
  voice: 'alloy' | 'echo' | 'shimmer' | 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';
  inputAudioTranscription?: boolean;
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
  };
  // Function calling tools for structured interactions
  tools?: Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

export interface RealtimeMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type RealtimeEventType =
  | 'connected'
  | 'disconnected'
  | 'speaking_started'
  | 'speaking_stopped'
  | 'user_speaking'
  | 'user_stopped_speaking'
  | 'transcript'
  | 'focus_error'
  | 'audio_started'
  | 'audio_stopped'
  | 'error';

export interface RealtimeEvent {
  type: RealtimeEventType;
  data?: unknown;
}

type EventCallback = (event: RealtimeEvent) => void;

export interface AudioData {
  level: number;       // 0-1 overall amplitude
  low: number;         // 0-1 low freq band (vowels, fundamental)
  mid: number;         // 0-1 mid freq band (consonants)
  high: number;        // 0-1 high freq band (sibilants)
  isSpeaking: boolean; // above silence threshold
}

/**
 * RealtimeSession class manages a single voice conversation session
 * using the OpenAI Realtime API via WebRTC.
 */
export class RealtimeSession {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private localStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private eventListeners: Map<RealtimeEventType | 'all', EventCallback[]> = new Map();
  private isConnected = false;
  private config: RealtimeSessionConfig;
  private conversationHistory: RealtimeMessage[] = [];
  private visemeQueue = new VisemeQueue();
  private speakingStopTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: RealtimeSessionConfig) {
    this.config = config;
  }

  /**
   * Register an event listener
   */
  on(event: RealtimeEventType | 'all', callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Remove an event listener
   */
  off(event: RealtimeEventType | 'all', callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(type: RealtimeEventType, data?: unknown): void {
    const event: RealtimeEvent = { type, data };

    // Notify specific listeners
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(cb => cb(event));

    // Notify 'all' listeners
    const allListeners = this.eventListeners.get('all') || [];
    allListeners.forEach(cb => cb(event));
  }

  /**
   * Connect to the OpenAI Realtime API
   */
  async connect(): Promise<void> {
    try {
      // Try to use existing microphone stream if already granted
      const existingStream = getExistingMicrophoneStream();
      if (existingStream && isMicrophonePermissionGranted()) {
        // Clone the existing stream to avoid conflicts
        this.localStream = existingStream.clone();
      } else {
        // Request microphone access
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection();

      // Create audio element for playback
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;

      // Handle incoming audio track
      this.peerConnection.ontrack = (event) => {
        if (this.audioElement && event.streams[0]) {
          this.audioElement.srcObject = event.streams[0];

          // Wire up audio analyser for avatar mouth animation
          try {
            this.audioContext = new AudioContext();
            this.audioContext.resume(); // Ensure context is not suspended

            // CRITICAL FIX: For WebRTC streams, we MUST use createMediaStreamSource.
            // createMediaElementSource often fails silently with WebRTC due to browser security/CORS,
            // resulting in the AnalyserNode returning all zeros while audio plays fine.
            const source = this.audioContext.createMediaStreamSource(event.streams[0]);

            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 256;
            this.analyserNode.smoothingTimeConstant = 0.6;
            this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

            // Route: WebRTC source â†’ analyser
            // Note: We don't connect to audioContext.destination because the <audio> 
            // element is already handling speaker output. We just tap the stream.
            source.connect(this.analyserNode);
          } catch (err) {
            console.warn('Failed to create audio analyser:', err);
          }

          this.emit('audio_started');
        }
      };

      // Add local audio track
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });

      // Create data channel for events
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      // Create and set local description
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Get ephemeral token from the app server
      const sessionResponse = await fetch('/api/openai/realtime/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          voice: this.config.voice,
          instructions: this.config.instructions,
          inputAudioTranscription: this.config.inputAudioTranscription,
          turnDetection: this.config.turnDetection || {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          }
        })
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        throw new Error(`Failed to create session: ${sessionResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const sessionData = await sessionResponse.json();
      const ephemeralKey = sessionData.client_secret?.value;

      if (!ephemeralKey) {
        throw new Error('Failed to get ephemeral key from session response');
      }

      // Connect to OpenAI Realtime API
      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) {
        throw new Error(`Failed to connect: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      });

      this.isConnected = true;
      this.emit('connected');

    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      this.disconnect();
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
      // Send session.update with tools if configured
      if (this.config.tools && this.config.tools.length > 0 && this.dataChannel) {
        const sessionUpdate = {
          type: 'session.update',
          session: {
            tools: this.config.tools
          }
        };
        this.dataChannel.send(JSON.stringify(sessionUpdate));
        console.log('Sent session.update with tools:', this.config.tools.map(t => t.name));
      }
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (error) {
        console.error('Failed to parse server event:', error);
      }
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
      this.emit('error', error);
    };
  }

  /**
   * Handle server events from the Realtime API
   */
  private handleServerEvent(event: Record<string, unknown>): void {
    const eventType = event.type as string;

    switch (eventType) {
      case 'response.audio_transcript.delta':
      case 'response.text.delta': {
        // Feed transcript delta to viseme queue for lip sync
        const deltaText = (event.delta as string) || '';
        if (deltaText) {
          this.visemeQueue.enqueue(deltaText);
          this.emit('speaking_started');
        }
        break;
      }

      case 'response.audio_transcript.done':
      case 'response.text.done':
        // Complete transcript from AI
        const transcript = event.transcript as string || event.text as string;
        if (transcript) {
          this.conversationHistory.push({
            role: 'assistant',
            content: transcript,
            timestamp: new Date()
          });
          this.emit('transcript', { role: 'assistant', content: transcript });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User's speech transcribed
        const userTranscript = event.transcript as string;
        if (userTranscript) {
          this.conversationHistory.push({
            role: 'user',
            content: userTranscript,
            timestamp: new Date()
          });
          this.emit('transcript', { role: 'user', content: userTranscript });
        }
        break;

      case 'input_audio_buffer.speech_started':
        this.emit('user_speaking');
        break;

      case 'input_audio_buffer.speech_stopped':
        this.emit('user_stopped_speaking');
        break;

      case 'response.audio.started':
        this.emit('speaking_started');
        break;

      case 'response.audio.done':
      case 'response.done':
        // DON'T immediately stop speaking â€” the audio plays longer than
        // text generation takes. Let the viseme queue drain and use the
        // synthetic fallback until the audio actually goes silent.
        this.scheduleGracefulSpeakingStop();
        break;

      // ===== Function calling: handle tool calls from the AI =====
      case 'response.function_call_arguments.done': {
        const callId = event.call_id as string;
        const fnName = event.name as string;
        const argsStr = event.arguments as string;

        console.log(`Function call: ${fnName}(${argsStr})`);

        try {
          const args = JSON.parse(argsStr || '{}');

          if (fnName === 'highlight_error') {
            const errorNumber = args.error_number as number;
            if (typeof errorNumber === 'number' && errorNumber >= 1) {
              // Emit focus_error with 0-based index
              this.emit('focus_error', { errorIndex: errorNumber - 1 });
            }
          }
        } catch (e) {
          console.warn('Failed to parse function call args:', e);
        }

        // Send function call output back so the AI can continue speaking
        if (this.dataChannel && this.dataChannel.readyState === 'open' && callId) {
          const outputEvent = {
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: JSON.stringify({ status: 'ok', highlighted: true })
            }
          };
          this.dataChannel.send(JSON.stringify(outputEvent));

          // Trigger AI to continue its response after the function call
          const responseEvent = { type: 'response.create' };
          this.dataChannel.send(JSON.stringify(responseEvent));
        }
        break;
      }

      case 'error':
        console.error('Server error:', event);
        this.emit('error', event);
        break;

      default:
        // Other events
        break;
    }
  }

  /**
   * Send a text message to the AI (will be spoken back)
   */
  sendMessage(text: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not ready');
      return;
    }

    // Create a conversation item
    const event = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text
          }
        ]
      }
    };

    this.dataChannel.send(JSON.stringify(event));

    // Trigger a response
    const responseEvent = {
      type: 'response.create'
    };
    this.dataChannel.send(JSON.stringify(responseEvent));
  }

  /**
   * Interrupt the current AI response
   */
  interrupt(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      return;
    }

    const event = {
      type: 'response.cancel'
    };
    this.dataChannel.send(JSON.stringify(event));
  }

  /**
   * Gracefully stop speaking: poll audio levels and only stop when
   * audio output goes silent. This accounts for the lag between
   * text generation completing and WebRTC audio playback finishing.
   */
  private scheduleGracefulSpeakingStop(): void {
    // Clear any existing timer
    if (this.speakingStopTimer) {
      clearInterval(this.speakingStopTimer);
    }

    let silentFrames = 0;
    const SILENCE_THRESHOLD = 0.015;
    const FRAMES_TO_CONFIRM = 6; // 6 checks Ã— 500ms = 3.0s of silence

    this.speakingStopTimer = setInterval(() => {
      const audio = this.getAudioData();

      if (audio.level < SILENCE_THRESHOLD) {
        silentFrames++;
        if (silentFrames >= FRAMES_TO_CONFIRM) {
          // Audio has been silent long enough â€” truly done speaking
          this.visemeQueue.clear();
          this.emit('speaking_stopped');
          if (this.speakingStopTimer) {
            clearInterval(this.speakingStopTimer);
            this.speakingStopTimer = null;
          }
        }
      } else {
        // Audio still playing, reset counter
        silentFrames = 0;
      }
    }, 500);

    // Safety: force stop after 60s max to prevent forever-speaking
    setTimeout(() => {
      if (this.speakingStopTimer) {
        clearInterval(this.speakingStopTimer);
        this.speakingStopTimer = null;
        this.visemeQueue.clear();
        this.emit('speaking_stopped');
      }
    }, 60000);
  }


  /**
   * Get the conversation history
   */
  getHistory(): RealtimeMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear the conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get the current audio output level (0-1) for avatar mouth animation.
   * Returns 0 if not connected or no audio data available.
   */
  getAudioLevel(): number {
    return this.getAudioData().level;
  }

  /**
   * Get detailed audio frequency data for viseme-driven mouth animation.
   * Returns band-separated data: low (vowels), mid (consonants), high (sibilants).
   */
  getAudioData(): AudioData {
    const empty: AudioData = { level: 0, low: 0, mid: 0, high: 0, isSpeaking: false };
    if (!this.analyserNode || !this.frequencyData) return empty;

    this.analyserNode.getByteFrequencyData(this.frequencyData);

    const len = this.frequencyData.length;
    // With fftSize=256 and ~48kHz sample rate, each bin â‰ˆ 187Hz
    // Low: bins 0-3 (~0-750Hz) â€” vowel fundamentals, "aah", "oh"
    // Mid: bins 4-10 (~750-2000Hz) â€” consonants, voice formants
    // High: bins 11-20 (~2000-3750Hz) â€” sibilants, "s", "sh", "f"

    let lowSum = 0, midSum = 0, highSum = 0;
    const lowEnd = Math.min(4, len);
    const midEnd = Math.min(11, len);
    const highEnd = Math.min(21, len);

    for (let i = 0; i < lowEnd; i++) lowSum += this.frequencyData[i];
    for (let i = lowEnd; i < midEnd; i++) midSum += this.frequencyData[i];
    for (let i = midEnd; i < highEnd; i++) highSum += this.frequencyData[i];

    const low = Math.min(1, (lowSum / lowEnd) / 180);
    const mid = Math.min(1, (midSum / (midEnd - lowEnd)) / 160);
    const high = Math.min(1, (highSum / (highEnd - midEnd)) / 140);
    const level = low * 0.5 + mid * 0.35 + high * 0.15;
    const isSpeaking = level > 0.05;

    return { level, low, mid, high, isSpeaking };
  }

  /**
   * Get the viseme queue for phoneme-based lip sync animation.
   */
  getVisemeQueue(): VisemeQueue {
    return this.visemeQueue;
  }

  /**
   * Check if the session is connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from the Realtime API
   */
  disconnect(): void {
    this.isConnected = false;

    // Clear any pending graceful stop timer
    if (this.speakingStopTimer) {
      clearInterval(this.speakingStopTimer);
      this.speakingStopTimer = null;
    }
    this.visemeQueue.clear();

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => { });
      this.audioContext = null;
      this.analyserNode = null;
      this.frequencyData = null;
    }

    if (this.audioElement) {
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    this.emit('disconnected');
  }
}

/**
 * Create a voice tutor session with pre-configured instructions for English learning
 */
export function createVoiceTutorSession(
  questionContext: string,
  explanation: string,
  studentAnswer: string,
  correctAnswer: string
): RealtimeSession {
  const instructions = `Sen deneyimli ve sabÄ±rlÄ± bir Ä°ngilizce Ã¶ÄŸretmenisin. TÃ¼rkÃ§e konuÅŸuyorsun ama Ä°ngilizce kelimeleri ve Ã¶rnek cÃ¼mleleri Ä°ngilizce sÃ¶ylÃ¼yorsun.

Ã–ÄŸrenciye bir soru hakkÄ±nda yardÄ±m ediyorsun. Ä°ÅŸte baÄŸlam:

**Soru:** ${questionContext}
**Ã–ÄŸrencinin CevabÄ±:** ${studentAnswer}
**DoÄŸru Cevap:** ${correctAnswer}

**HazÄ±rlanan AÃ§Ä±klama:**
${explanation}

GÃ–REVLER:
1. Ã–nce yukarÄ±daki aÃ§Ä±klamayÄ± sÄ±cak ve destekleyici bir ÅŸekilde Ã¶ÄŸrenciye anlat.
2. Ã–ÄŸrenci takip sorularÄ± sorabilir - bunlara sabÄ±rla ve detaylÄ± cevap ver.
3. Ã–rnek cÃ¼mleleri net ve yavaÅŸ telaffuz et.
4. Gramer kurallarÄ±nÄ± basit ve anlaÅŸÄ±lÄ±r ÅŸekilde aÃ§Ä±kla.
5. Ã–ÄŸrenciyi motive et ve cesaretlendir.

KONUÅMA TARZI:
- SÄ±cak ve arkadaÅŸÃ§a ol
- Ã‡ok uzun monologlardan kaÃ§Ä±n, interaktif ol
- Ä°ngilizce kelimeleri dÃ¼zgÃ¼n telaffuz et
- Ã–ÄŸrenci anlamadÄ±ÄŸÄ±nda farklÄ± ÅŸekillerde aÃ§Ä±kla

Ã–NEMLÄ°: TÃ¼rkÃ§e konuÅŸ, sadece Ä°ngilizce kelimeler, terimler ve Ã¶rnek cÃ¼mleler Ä°ngilizce olsun. Ä°ngilizce Ã¶rnek cÃ¼mlelerin TÃ¼rkÃ§e Ã§evirisini de sÃ¶yle.`;

  return new RealtimeSession({
    instructions,
    voice: 'shimmer', // Warm, friendly voice
    inputAudioTranscription: true,
    turnDetection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 700
    }
  });
}

/**
 * Create a voice tutor session for writing practice feedback
 */
export function createWritingTutorSession(
  promptTitle: string | undefined,
  originalText: string,
  correctedText: string,
  feedbackSummary: string,
  errors: Array<{ text: string; suggestion: string; explanation: string; }>
): RealtimeSession {
  // Format errors into a readable string for the prompt
  const errorsList = errors.map((err, idx) =>
    `${idx + 1}. HatalÄ± kullanÄ±m: "${err.text}" -> DoÄŸrusu: "${err.suggestion}"\n   AÃ§Ä±klama: ${err.explanation}`
  ).join('\n\n');

  const instructions = `Sen deneyimli ve sabÄ±rlÄ± bir Ä°ngilizce Ã¶ÄŸretmenisin. TÃ¼rkÃ§e konuÅŸuyorsun ama Ä°ngilizce kelimeleri ve Ã¶rnek cÃ¼mleleri Ä°ngilizce sÃ¶ylÃ¼yorsun.

Ã–ÄŸrenciye yazma pratiÄŸi (writing) konusunda yardÄ±m ediyorsun. Ä°ÅŸte yazdÄ±ÄŸÄ± metin ve geri bildirimler:

${promptTitle ? `**Yazma Konusu:** ${promptTitle}\n` : ''}
**Ã–ÄŸrencinin YazdÄ±ÄŸÄ± Metin:**
${originalText}

**DÃ¼zeltilmiÅŸ Metin:**
${correctedText}

**Genel DeÄŸerlendirme Ã–zeti:**
${feedbackSummary}

**YapÄ±lan Hatalar ve AÃ§Ä±klamalarÄ±:**
${errorsList || 'Ã–nemli bir gramer veya kelime hatasÄ± bulunmadÄ±.'}

GÃ–REVLER:
1. Ã–ÄŸrenciyle Ã¶nce genel deÄŸerlendirme Ã¶zeti Ã¼zerinden sÄ±cak ve destekleyici bir konuÅŸma baÅŸlat. GÃ¼Ã§lÃ¼ yÃ¶nlerini Ã¶v, zayÄ±f yÃ¶nlerini nazikÃ§e belirt.
2. Sonra hatalarÄ± SIRAYLA TEK TEK aÃ§Ä±kla. **Her hataya geÃ§meden Ã–NCE, highlight_error fonksiyonunu Ã§aÄŸÄ±r.** Ã–rneÄŸin 1. hatayÄ± anlatmaya baÅŸlamadan Ã¶nce highlight_error(1) Ã§aÄŸÄ±r, 2. hataya geÃ§meden Ã¶nce highlight_error(2) Ã§aÄŸÄ±r. Bu fonksiyon ekranda ilgili hatayÄ± vurgular.
3. Ã–ÄŸrenci takip sorularÄ± sorabilir - bunlara sabÄ±rla ve detaylÄ± cevap ver.
4. Ã–rnek cÃ¼mleleri net ve yavaÅŸ telaffuz et.
5. Gramer kurallarÄ±nÄ± basit ve anlaÅŸÄ±lÄ±r ÅŸekilde aÃ§Ä±kla.
6. Ã–ÄŸrenciyi motive et ve cesaretlendir.

FONKSÄ°YON KULLANIMI (KRÄ°TÄ°K):
- Her hatayÄ± anlatmaya baÅŸlamadan HEMEN Ã–NCE highlight_error fonksiyonunu Ã§aÄŸÄ±r.
- error_number parametresi 1'den baÅŸlar (1. hata iÃ§in 1, 2. hata iÃ§in 2, vb.)
- Genel Ã¶zeti bitirdikten sonra ilk hataya geÃ§meden Ã¶nce highlight_error(1) Ã§aÄŸÄ±r.
- Bu fonksiyonu Ã§aÄŸÄ±rmayÄ± ASLA UNUTMA, her hata geÃ§iÅŸinde Ã§aÄŸÄ±r.

KONUÅMA TARZI:
- SÄ±cak ve arkadaÅŸÃ§a ol
- Ã‡ok uzun monologlardan kaÃ§Ä±n, interaktif ol, soru sormasÄ±na imkan tanÄ±
- Ä°ngilizce kelimeleri dÃ¼zgÃ¼n telaffuz et
- Ã–ÄŸrenci anlamadÄ±ÄŸÄ±nda farklÄ± ÅŸekillerde aÃ§Ä±kla

Ã–NEMLÄ°: TÃ¼rkÃ§e konuÅŸ, sadece Ä°ngilizce kelimeler, terimler ve Ã¶rnek cÃ¼mleler Ä°ngilizce olsun. Ä°ngilizce Ã¶rnek cÃ¼mlelerin TÃ¼rkÃ§e Ã§evirisini de sÃ¶yle.`;

  return new RealtimeSession({
    instructions,
    voice: 'shimmer',
    inputAudioTranscription: true,
    turnDetection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 700
    },
    tools: errors.length > 0 ? [
      {
        type: 'function',
        name: 'highlight_error',
        description: 'Ekranda bir hata kartÄ±nÄ± vurgular. Her hatayÄ± anlatmaya baÅŸlamadan hemen Ã¶nce bu fonksiyonu Ã§aÄŸÄ±r.',
        parameters: {
          type: 'object',
          properties: {
            error_number: {
              type: 'number',
              description: `Vurgulanacak hatanÄ±n numarasÄ± (1-${errors.length} arasÄ±)`
            }
          },
          required: ['error_number']
        }
      }
    ] : undefined
  });
}


