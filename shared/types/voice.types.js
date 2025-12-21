"use strict";
/**
 * Voice Interface Type Definitions
 *
 * This file contains all type definitions for the voice interface module.
 * Designed to be reusable across projects and extractable into an NPM package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceErrorCode = void 0;
/**
 * Voice error types
 */
var VoiceErrorCode;
(function (VoiceErrorCode) {
    VoiceErrorCode["MICROPHONE_ACCESS_DENIED"] = "VOICE_001";
    VoiceErrorCode["TRANSCRIPTION_FAILED"] = "VOICE_002";
    VoiceErrorCode["TTS_GENERATION_FAILED"] = "VOICE_003";
    VoiceErrorCode["RECORDING_TOO_SHORT"] = "VOICE_004";
    VoiceErrorCode["TRANSCRIPTION_TOO_SHORT"] = "VOICE_005";
    VoiceErrorCode["NETWORK_TIMEOUT"] = "VOICE_006";
    VoiceErrorCode["UNSUPPORTED_BROWSER"] = "VOICE_007";
    VoiceErrorCode["AUDIO_PLAYBACK_FAILED"] = "VOICE_008";
    VoiceErrorCode["VAD_INITIALIZATION_FAILED"] = "VOICE_009";
    VoiceErrorCode["STREAMING_MODE_ERROR"] = "VOICE_010";
})(VoiceErrorCode || (exports.VoiceErrorCode = VoiceErrorCode = {}));
//# sourceMappingURL=voice.types.js.map