import axios from 'axios';
import https from 'https';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * Sber SmartSpeech API Service
 * Handles OAuth authentication and speech recognition
 */

interface SberSpeechResponse {
    result: string[];
    emotions?: Array<{
        negative: number;
        neutral: number;
        positive: number;
    }>;
    person_identity?: {
        age: string;
        gender: string;
        age_score: number;
        gender_score: number;
    };
    status: number;
}

class SberSpeechService {
    private tokenUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    private speechUrl = 'https://smartspeech.sber.ru/rest/v1/speech:recognize';
    private authToken: string;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    // Create axios instance that ignores SSL verification
    private axiosInstance = axios.create({
        httpsAgent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    constructor(authToken: string) {
        this.authToken = authToken;
    }

    /**
     * Get or refresh access token for SmartSpeech
     */
    private async getAccessToken(): Promise<string> {
        // Check if token is still valid (with 5 minute buffer)
        if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
            return this.accessToken;
        }

        try {
            const response = await this.axiosInstance.post(
                this.tokenUrl,
                'scope=SALUTE_SPEECH_PERS',
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json',
                        'RqUID': this.generateRqUID(),
                        'Authorization': `Basic ${this.authToken}`
                    }
                }
            );

            const token = response.data.access_token;
            if (!token) {
                throw new Error('No access token in response');
            }

            this.accessToken = token;
            // Tokens typically expire in 30 minutes
            this.tokenExpiry = Date.now() + 1800000;

            console.log('✅ Sber SmartSpeech access token obtained');
            return token;
        } catch (error: any) {
            console.error('❌ Error getting Sber SmartSpeech token:', error.message);
            throw new Error('Failed to authenticate with Sber SmartSpeech');
        }
    }

    /**
     * Generate unique request ID
     */
    private generateRqUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Recognize speech from audio buffer
     * @param audioBuffer - Audio data buffer (WAV format, 16-bit PCM, 16kHz)
     * @returns Recognized text
     */
    async recognizeSpeech(audioBuffer: Buffer): Promise<string> {
        const token = await this.getAccessToken();

        try {
            const response = await this.axiosInstance.post<SberSpeechResponse>(
                this.speechUrl,
                audioBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'audio/x-pcm;bit=16;rate=16000'
                    }
                }
            );

            if (response.data.status === 200 && response.data.result && response.data.result.length > 0) {
                // Return first non-empty result
                const text = response.data.result.find((r: string) => r.trim().length > 0);
                return text || '';
            }

            return '';
        } catch (error: any) {
            console.error('❌ Error calling Sber SmartSpeech API:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw new Error('Failed to recognize speech');
        }
    }

    /**
     * Recognize speech from audio file
     * @param audioFilePath - Path to audio file (WAV format, 16-bit PCM, 16kHz)
     * @returns Recognized text
     */
    async recognizeSpeechFromFile(audioFilePath: string): Promise<string> {
        try {
            const audioBuffer = fs.readFileSync(audioFilePath);
            return await this.recognizeSpeech(audioBuffer);
        } catch (error: any) {
            console.error('❌ Error reading audio file:', error.message);
            throw new Error('Failed to read audio file');
        }
    }
}

// Singleton instance
let sberSpeechInstance: SberSpeechService | null = null;

export function initSberSpeech(authToken: string): SberSpeechService {
    if (!sberSpeechInstance) {
        sberSpeechInstance = new SberSpeechService(authToken);
    }
    return sberSpeechInstance;
}

export function getSberSpeech(): SberSpeechService {
    if (!sberSpeechInstance) {
        throw new Error('Sber SmartSpeech service not initialized. Call initSberSpeech first.');
    }
    return sberSpeechInstance;
}

export { SberSpeechService };