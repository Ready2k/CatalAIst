# Voice Features User Guide

**Version 2.4.0** - Complete Voice Interface Documentation

---

## 📖 Overview

CatalAIst includes a powerful voice interface that allows you to interact with the system using speech instead of typing. The voice features support both speech-to-text (STT) for input and text-to-speech (TTS) for output, creating a natural conversational experience.

### Key Benefits

- **Hands-free operation** - Interact without typing
- **Faster input** - Speak naturally instead of typing long descriptions
- **Accessibility** - Alternative input method for users who prefer or need voice
- **Natural conversation** - Streaming mode creates a conversational flow

---

## 🎯 Quick Start

### 1. Enable Voice Features

Voice features are **automatically enabled** when you configure OpenAI as your LLM provider:

1. Go to the **Configuration** tab
2. Select **OpenAI** as your provider
3. Enter your OpenAI API key
4. Voice features are now enabled!

### 2. Choose Your Voice Mode

CatalAIst offers two voice interaction modes:

**Non-Streaming Mode (Default)**
- Manual control over recording
- Edit transcripts before submission
- Best for: Precise input, reviewing before sending

**Streaming Mode**
- Automatic conversational flow
- Hands-free operation
- Best for: Quick interactions, natural conversation

### 3. Start Using Voice

Look for the 🎤 microphone button:
- In the main input area (for process descriptions)
- Next to each clarification question (for answers)

Click the button and start speaking!

---

## 🎙️ Voice Modes Explained

### Non-Streaming Mode (Manual Control)

**How it works:**
1. Click the 🎤 microphone button
2. Click "Start Recording" to begin
3. Speak your input clearly
4. Click "Stop Recording" when done
5. Review and edit the transcript
6. Click "Use This Text" to submit

**Features:**
- ✅ Full control over recording start/stop
- ✅ Edit transcripts before submission
- ✅ Re-record if needed
- ✅ Visual feedback (timer, waveform)
- ✅ Recording time limit: 5 minutes

**Best for:**
- Long, detailed descriptions
- When you want to review before sending
- Noisy environments (you can edit out errors)
- First-time users learning the system

### Streaming Mode (Conversational)

**How it works:**
1. Click the 🎤 microphone button
2. Recording starts automatically
3. Speak your input
4. System detects when you stop speaking
5. Automatically transcribes and submits
6. Questions are read aloud automatically
7. Recording starts again for your answer
8. Continues until classification is complete

**Features:**
- ✅ Hands-free operation
- ✅ Automatic silence detection (2 seconds)
- ✅ Questions read aloud automatically
- ✅ Natural conversational flow
- ✅ Automatic error recovery

**Best for:**
- Quick classifications
- Hands-free operation
- Natural conversation style
- Experienced users

**Note:** Streaming mode automatically falls back to non-streaming mode if errors occur.

---

## 🔧 Configuration

### Accessing Voice Settings

1. Go to the **Configuration** tab
2. Select **OpenAI** as your provider
3. Scroll to the **Voice Settings** section

### Voice Type Selection

Choose from 6 different voices:

| Voice | Description | Best For |
|-------|-------------|----------|
| **Alloy** (Default) | Neutral, balanced | General use |
| **Echo** | Clear, professional | Business contexts |
| **Fable** | Warm, friendly | Casual interactions |
| **Onyx** | Deep, authoritative | Formal presentations |
| **Nova** | Energetic, upbeat | Quick interactions |
| **Shimmer** | Soft, gentle | Calm environments |

**Tip:** Try different voices to find the one that works best for you!

### Streaming Mode Toggle

- **OFF (Default)**: Manual control, edit transcripts
- **ON**: Automatic conversational flow

**When to enable streaming:**
- You want hands-free operation
- You're comfortable with the system
- You're in a quiet environment
- You want quick interactions

**When to disable streaming:**
- You're new to the system
- You want to review transcripts
- You're in a noisy environment
- You need precise control

---

## 💡 Using Voice Features

### Recording Your Process Description

**Non-Streaming Mode:**
1. Click the 🎤 button in the input area
2. A modal dialog opens
3. Click "Start Recording" (green button)
4. Speak your process description clearly
5. Click "Stop Recording" (red button) when done
6. Review the transcript in the text area
7. Edit if needed (you can type corrections)
8. Click "Use This Text" to submit

**Streaming Mode:**
1. Click the 🎤 button in the input area
2. Recording starts immediately
3. Speak your process description
4. Stop speaking for 2 seconds
5. System automatically transcribes and submits
6. Wait for classification or questions

### Answering Clarification Questions

**Non-Streaming Mode:**
1. Question appears as text
2. Click the ▶️ play button to hear it (optional)
3. Click the 🎤 button next to the question
4. Record your answer
5. Review and edit the transcript
6. Click "Use This Text" to submit

**Streaming Mode:**
1. Question is read aloud automatically
2. Recording starts automatically after playback
3. Speak your answer
4. Stop speaking for 2 seconds
5. System automatically transcribes and submits
6. Next question plays automatically

### Recording Controls

**Visual Indicators:**
- 🔴 **Pulsing red dot** - Recording in progress
- ⏱️ **Timer** - Shows recording duration (MM:SS)
- 📊 **Waveform** - Shows audio levels (streaming mode)
- 🟡 **Yellow timer** - 4:00 warning (1 minute left)
- 🔴 **Red timer** - 4:30 warning (30 seconds left)

**Buttons:**
- 🟢 **Start Recording** - Begin recording
- 🔴 **Stop Recording** - End recording
- 🔄 **Record Again** - Discard and re-record
- ✅ **Use This Text** - Submit transcript
- ❌ **Cancel** - Close without submitting

### Audio Playback Controls

When questions are read aloud:
- ▶️ **Play** - Start playback
- ⏸️ **Pause** - Pause playback
- ⏹️ **Stop** - Stop playback
- 🔁 **Repeat** - Play again
- 📊 **Progress bar** - Shows playback position
- ⏱️ **Time display** - Shows current / total time

---

## ⚠️ Recording Limits and Warnings

### Time Limits

- **Maximum recording time:** 5 minutes (300 seconds)
- **Minimum recording time:** 1 second
- **Silence detection:** 2 seconds (streaming mode only)

### Visual Warnings

| Time | Color | Warning |
|------|-------|---------|
| 0:00 - 3:59 | White | Normal recording |
| 4:00 - 4:29 | Yellow | "1 minute remaining" |
| 4:30 - 4:59 | Red | "30 seconds remaining" |
| 5:00 | Auto-stop | Recording ends automatically |

**What happens at 5:00:**
- Recording stops automatically
- Audio is transcribed
- You can review and edit the transcript
- No data is lost

**Tip:** If you need more than 5 minutes, record in segments and edit the transcript to combine them.

---

## 🎨 Visual Feedback

### Recording States

**Idle (Not Recording):**
- Gray microphone button
- No timer visible
- "Start Recording" button available

**Recording:**
- Pulsing red dot animation
- Timer showing MM:SS
- Waveform showing audio levels (streaming mode)
- "Stop Recording" button available

**Processing:**
- "Transcribing..." message
- Loading spinner
- Buttons disabled

**Complete:**
- Transcript displayed
- Edit controls available
- "Use This Text" button enabled

### Accessibility Features

All voice features are fully accessible:
- ✅ **Keyboard navigation** - Tab through all controls
- ✅ **Screen reader support** - All actions announced
- ✅ **ARIA labels** - Descriptive labels on all buttons
- ✅ **Focus indicators** - Visible focus outlines
- ✅ **Color contrast** - WCAG AA compliant
- ✅ **Touch targets** - 44x44px minimum on mobile

**Keyboard shortcuts:**
- **Tab** - Navigate between controls
- **Enter/Space** - Activate buttons
- **Escape** - Close modal dialogs

---

## 🔍 Transcript Editing

### When to Edit

- Correct transcription errors
- Add punctuation or formatting
- Clarify ambiguous words
- Remove filler words ("um", "uh")
- Combine multiple recordings

### Editing Features

**Character Count:**
- Minimum: 10 characters
- Maximum: 10,000 characters
- Live counter shows remaining characters

**Validation:**
- ❌ Too short: "Description must be at least 10 characters"
- ❌ Too long: "Description must be less than 10,000 characters"
- ✅ Valid: Green checkmark

**Copy Button:**
- Click 📋 to copy transcript to clipboard
- Useful for saving or sharing

---

## 🚨 Error Handling

### Common Errors and Solutions

#### "Microphone permission denied"

**Cause:** Browser doesn't have permission to access microphone

**Solution:**
1. Click the 🔒 lock icon in browser address bar
2. Find "Microphone" permission
3. Change to "Allow"
4. Refresh the page
5. Try recording again

**Alternative:** Use text input instead

---

#### "Transcription failed"

**Cause:** Network error or API issue

**Solution:**
1. Check your internet connection
2. Click "Record Again" to retry
3. If problem persists, use text input
4. Check OpenAI API status

---

#### "Audio playback failed"

**Cause:** TTS generation error or network issue

**Solution:**
1. Question text is still visible (you can read it)
2. Click the ▶️ play button to retry
3. Continue with text input if needed

---

#### "Recording stopped automatically"

**Cause:** 5-minute time limit reached

**Solution:**
1. Review the transcript (nothing is lost)
2. Edit if needed
3. Click "Use This Text" to submit
4. For longer input, record in segments

---

#### "Silence detected, stopping recording"

**Cause:** No speech detected for 2 seconds (streaming mode)

**Solution:**
- This is normal behavior in streaming mode
- Speak continuously to avoid auto-stop
- If stopped too early, recording will restart
- Switch to non-streaming mode for manual control

---

### Automatic Error Recovery

**Streaming Mode:**
- After 2 consecutive errors, automatically switches to non-streaming mode
- You'll see a notification: "Switched to manual mode due to errors"
- Continue with manual control
- Your conversation context is preserved

**Non-Streaming Mode:**
- "Try Again" button appears on errors
- Click to retry the operation
- Use text input as fallback

---

## 💻 Browser Compatibility

### Supported Browsers

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full support |
| Edge | 90+ | ✅ Full support |
| Firefox | 88+ | ✅ Full support |
| Safari | 14+ | ✅ Full support |
| Opera | 76+ | ✅ Full support |

### Required Features

- **MediaRecorder API** - For audio recording
- **Web Audio API** - For voice activity detection
- **Audio element** - For playback
- **Microphone access** - Hardware requirement

### Mobile Support

- ✅ **iOS Safari** - Full support (iOS 14+)
- ✅ **Android Chrome** - Full support (Android 10+)
- ✅ **Touch controls** - Optimized for mobile
- ✅ **Responsive design** - Works on all screen sizes

---

## 🎯 Best Practices

### For Best Results

**Environment:**
- 🎧 Use in a quiet environment
- 🎤 Speak clearly and at normal pace
- 📱 Use a good quality microphone
- 🔇 Minimize background noise

**Speaking Tips:**
- Speak naturally (don't shout or whisper)
- Pause briefly between sentences
- Avoid filler words ("um", "uh", "like")
- Speak at a consistent volume
- Enunciate clearly

**Process Descriptions:**
- Be specific and detailed
- Mention key steps in order
- Include relevant context
- Describe current state and desired outcome
- Mention any pain points or challenges

**Answering Questions:**
- Listen to the full question first
- Answer directly and concisely
- Provide specific examples if asked
- Say "I don't know" if unsure (don't guess)

### Mode Selection

**Choose Non-Streaming Mode when:**
- You're new to the system
- You want to review before sending
- You're in a noisy environment
- You need precise control
- You want to edit transcripts

**Choose Streaming Mode when:**
- You're experienced with the system
- You want hands-free operation
- You're in a quiet environment
- You want quick interactions
- You prefer conversational flow

### Troubleshooting Tips

**If transcription is inaccurate:**
- Speak more clearly and slowly
- Reduce background noise
- Use a better microphone
- Edit the transcript before submitting
- Switch to text input for complex terms

**If recording stops too early (streaming):**
- Speak more continuously
- Reduce pauses between words
- Switch to non-streaming mode
- Check microphone sensitivity

**If you're unsure:**
- Start with non-streaming mode
- Review transcripts before submitting
- Use text input as needed
- Practice with simple descriptions first

---

## 🔐 Privacy and Security

### Data Handling

**Audio Recording:**
- Audio is recorded locally in your browser
- Sent to OpenAI for transcription
- Not stored on CatalAIst servers
- Deleted after transcription

**Transcripts:**
- Stored in your session data
- Encrypted at rest
- PII automatically detected and encrypted
- Included in audit logs (PII scrubbed)

**Voice Playback:**
- Generated by OpenAI TTS
- Streamed directly to your browser
- Not stored on servers
- Deleted after playback

### Permissions

**Microphone Access:**
- Required for voice recording
- Requested by your browser
- Can be revoked at any time
- Only active during recording

**Data Retention:**
- Session data retained per your settings
- Audio not retained after transcription
- Transcripts follow standard retention policy
- Audit logs retained per compliance requirements

---

## 📊 Voice Analytics

### What's Tracked

Voice usage is tracked for analytics and improvement:
- Voice vs text input method
- Voice mode (streaming vs non-streaming)
- Recording duration
- Transcription success rate
- Error frequency and types
- Mode switching events

### Privacy

- No audio recordings are stored
- Transcripts are PII-scrubbed in logs
- Analytics are aggregated and anonymized
- Used only for system improvement

---

## ❓ FAQ

### General Questions

**Q: Do I need special hardware?**
A: Just a working microphone. Built-in laptop/phone mics work fine.

**Q: Does voice cost extra?**
A: Voice uses your OpenAI API credits. STT costs ~$0.006/minute, TTS costs ~$0.015/1K characters.

**Q: Can I use voice with AWS Bedrock?**
A: Not yet. Voice features currently require OpenAI. Bedrock support is planned for a future release.

**Q: Is my voice data stored?**
A: No. Audio is transcribed and then deleted. Only text transcripts are stored.

**Q: Can I switch between voice and text?**
A: Yes! Text input is always available. Use whichever is more convenient.

### Technical Questions

**Q: What audio format is used?**
A: WebM with Opus codec (browser default). Automatically converted for OpenAI.

**Q: How accurate is transcription?**
A: OpenAI Whisper is highly accurate (~95%+). You can edit transcripts before submitting.

**Q: Why does streaming mode stop recording?**
A: It detects 2 seconds of silence. This is normal - speak continuously or use non-streaming mode.

**Q: Can I change the silence detection time?**
A: Not currently. 2 seconds is optimal for most users. Use non-streaming mode for manual control.

**Q: What's the maximum recording length?**
A: 5 minutes. This is sufficient for most descriptions. Record in segments if needed.

### Troubleshooting Questions

**Q: Why can't I see the microphone button?**
A: Voice requires OpenAI provider. Check your configuration and ensure you've entered an API key.

**Q: Why does my browser ask for microphone permission?**
A: This is a security feature. Grant permission to use voice features.

**Q: Why is transcription slow?**
A: Transcription typically takes 2-5 seconds. Longer recordings take more time. Check your internet connection.

**Q: Why did it switch to non-streaming mode?**
A: After 2 errors, the system automatically switches for reliability. You can continue with manual control.

**Q: Can I switch back to streaming mode?**
A: Yes, but only by starting a new session. This prevents repeated errors.

---

## 🆘 Getting Help

### Support Resources

1. **This Guide** - Comprehensive voice features documentation
2. **Troubleshooting Guide** - See [VOICE_TROUBLESHOOTING.md](VOICE_TROUBLESHOOTING.md)
3. **Main README** - See [README.md](../README.md)
4. **In-App Help** - Hover over ℹ️ icons for tooltips

### Reporting Issues

If you encounter problems:
1. Check the troubleshooting guide
2. Check browser console for errors (F12)
3. Try text input as fallback
4. Report issues with:
   - Browser and version
   - Error message (if any)
   - Steps to reproduce
   - Expected vs actual behavior

---

## 🗺️ Future Enhancements

Planned voice features:
- AWS Bedrock voice support
- Custom voice training
- Multi-language support
- Voice commands ("submit", "cancel", etc.)
- Adjustable silence detection
- Voice biometrics for authentication
- Offline voice support
- Voice shortcuts and macros

---

**Last Updated:** November 14, 2025  
**Version:** 2.4.0

