# Voice Features Troubleshooting Guide

**Version 2.4.0** - Common Issues and Solutions

---

## 🎯 Quick Diagnostics

### Is Voice Available?

Check these requirements:

- ✅ **Provider:** OpenAI selected in configuration
- ✅ **API Key:** Valid OpenAI API key entered
- ✅ **Browser:** Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
- ✅ **Microphone:** Working microphone connected
- ✅ **Permissions:** Microphone permission granted
- ✅ **HTTPS:** Using HTTPS or localhost (required for microphone access)

### Quick Test

1. Go to Configuration tab
2. Look for "Voice Settings" section
3. If visible → Voice is available
4. If not visible → Check provider is OpenAI

---

## 🚨 Common Issues

### Issue 1: No Microphone Button Visible

**Symptoms:**
- 🎤 button not showing in input area
- 🎤 button not showing next to questions
- Voice settings not visible in configuration

**Possible Causes:**

#### Cause A: Not Logged In

**Check:**
```
Are you logged in? Check if you see "Logout" button in the interface.
```

**Solution:**
1. Go to login page
2. Enter your credentials
3. Login
4. Voice features should now be available

---

#### Cause B: Wrong LLM Provider

**Check:**
```
Configuration → Provider → Should be "OpenAI"
```

**Solution:**
1. Go to Configuration tab
2. Select "OpenAI" as provider
3. Enter your OpenAI API key
4. Click "Save Configuration"
5. Microphone button should now appear

---

#### Cause C: No LLM Configuration

**Check:**
```
Configuration tab → "Please configure your LLM settings"
```

**Solution:**
1. Go to Configuration tab
2. Select provider (OpenAI)
3. Enter API key
4. Click "Save Configuration"

---

#### Cause D: Wrong Workflow State

**Check:**
```
Voice button only shows in:
- Initial input screen (before classification)
- Clarification questions screen
```

**Solution:**
- Voice is not available during classification processing
- Voice is not available on results screen
- Start a new classification to use voice

---

### Issue 2: "Microphone Permission Denied"

**Symptoms:**
- Error message: "Microphone permission denied"
- Recording doesn't start
- Browser shows blocked microphone icon

**Solutions:**

#### Chrome/Edge:
1. Click the 🔒 lock icon in address bar
2. Find "Microphone" in permissions list
3. Change from "Block" to "Allow"
4. Refresh the page (F5)
5. Try recording again

#### Firefox:
1. Click the 🔒 lock icon in address bar
2. Click "Connection secure" → "More information"
3. Go to "Permissions" tab
4. Find "Use the Microphone"
5. Uncheck "Use default" and select "Allow"
6. Refresh the page
7. Try recording again

#### Safari:
1. Safari menu → Settings → Websites
2. Click "Microphone" in left sidebar
3. Find your site in the list
4. Change to "Allow"
5. Refresh the page
6. Try recording again

#### Mobile (iOS):
1. Settings → Safari → Camera & Microphone
2. Enable "Ask" or "Allow"
3. Refresh the page in Safari
4. Grant permission when prompted

#### Mobile (Android):
1. Settings → Apps → Chrome → Permissions
2. Enable "Microphone"
3. Refresh the page
4. Grant permission when prompted

**Still not working?**
- Try a different browser
- Check if microphone works in other apps
- Use text input as fallback

---

### Issue 3: "No Token Provided" or "Authentication Required"

**Symptoms:**
- Error message: "No token provided"
- Error message: "Authentication required"
- Recording completes but transcription fails
- 401 Unauthorized error

**Cause:**
Authentication token not being sent with voice API requests

**Solution:**
1. Make sure you're logged in
2. Check that your session hasn't expired
3. Try logging out and logging back in
4. Clear browser cache and cookies
5. If problem persists, this is a bug - report it

**Technical Details:**
Voice endpoints require JWT authentication. If you see this error, the frontend may not be sending the Authorization header correctly.

---

### Issue 4: "Transcription Failed"

**Symptoms:**
- Error message: "Transcription failed"
- Recording completes but no text appears
- "Try Again" button appears

**Possible Causes:**

#### Cause A: Network Error

**Check:**
```
Browser console (F12) → Network tab → Look for failed requests
```

**Solution:**
1. Check your internet connection
2. Try again (click "Record Again")
3. If problem persists, check OpenAI status: https://status.openai.com
4. Use text input as fallback

---

#### Cause B: Invalid API Key

**Check:**
```
Browser console (F12) → Look for "401 Unauthorized" errors
```

**Solution:**
1. Go to Configuration tab
2. Verify your OpenAI API key is correct
3. Generate a new key if needed: https://platform.openai.com/api-keys
4. Save configuration
5. Try recording again

---

#### Cause C: API Rate Limit

**Check:**
```
Error message mentions "rate limit" or "quota"
```

**Solution:**
1. Wait a few minutes
2. Try again
3. Check your OpenAI usage: https://platform.openai.com/usage
4. Upgrade your OpenAI plan if needed
5. Use text input as fallback

---

#### Cause D: Audio Format Issue

**Check:**
```
Browser console (F12) → Look for "unsupported format" errors
```

**Solution:**
1. Try a different browser (Chrome recommended)
2. Update your browser to latest version
3. Clear browser cache
4. Try recording again

---

### Issue 5: "Audio Playback Failed"

**Symptoms:**
- Questions don't play aloud
- Error message: "Audio playback failed"
- Play button doesn't work

**Possible Causes:**

#### Cause A: TTS Generation Error

**Check:**
```
Browser console (F12) → Look for TTS-related errors
```

**Solution:**
1. Question text is still visible (you can read it)
2. Click the ▶️ play button to retry
3. If problem persists, continue with text
4. Check OpenAI status: https://status.openai.com

---

#### Cause B: Browser Audio Blocked

**Check:**
```
Browser shows "Autoplay blocked" notification
```

**Solution:**
1. Click anywhere on the page to enable audio
2. Click the ▶️ play button again
3. Enable autoplay in browser settings:
   - Chrome: Settings → Privacy → Site Settings → Sound
   - Firefox: Settings → Privacy → Permissions → Autoplay
   - Safari: Settings → Websites → Auto-Play

---

#### Cause C: Audio Device Issue

**Check:**
```
Test if other audio works (YouTube, etc.)
```

**Solution:**
1. Check volume is not muted
2. Check correct audio output device selected
3. Try headphones/speakers
4. Restart browser
5. Continue with text (question is still readable)

---

### Issue 6: Recording Stops Too Early (Streaming Mode)

**Symptoms:**
- Recording stops after 2 seconds of silence
- Can't finish speaking before it stops
- Keeps stopping mid-sentence

**Cause:**
Voice Activity Detection (VAD) detects 2 seconds of silence and auto-stops

**Solutions:**

#### Solution A: Speak More Continuously
- Reduce pauses between words
- Speak at a steady pace
- Don't pause for more than 2 seconds

#### Solution B: Switch to Non-Streaming Mode
1. Go to Configuration tab
2. Find "Voice Settings" section
3. Turn OFF "Streaming Mode"
4. Click "Save Configuration"
5. Now you have manual control (click to stop)

#### Solution C: Adjust Speaking Style
- Speak in shorter segments
- Let it auto-stop, then continue
- System will restart recording automatically

---

### Issue 7: Recording Stops at 5 Minutes

**Symptoms:**
- Recording stops automatically at 5:00
- Message: "Maximum recording time reached"
- Can't record longer

**Cause:**
5-minute maximum recording limit (prevents excessive API costs)

**Solutions:**

#### Solution A: Record in Segments
1. Record first 5 minutes
2. Review and submit transcript
3. If more needed, add in next interaction
4. Edit transcript to combine segments

#### Solution B: Be More Concise
- Focus on key points
- Remove unnecessary details
- Speak more efficiently
- 5 minutes is typically sufficient

#### Solution C: Use Text Input
- For very long descriptions
- Type or paste text instead
- No length limit on text input

---

### Issue 8: Transcription is Inaccurate

**Symptoms:**
- Wrong words in transcript
- Missing words
- Garbled text
- Technical terms wrong

**Solutions:**

#### Solution A: Improve Audio Quality
- Use in quiet environment
- Reduce background noise
- Use better microphone
- Speak closer to microphone
- Speak more clearly

#### Solution B: Edit the Transcript
1. Review transcript after recording
2. Click in text area to edit
3. Correct any errors
4. Click "Use This Text" when done

#### Solution C: Adjust Speaking Style
- Speak more slowly
- Enunciate clearly
- Spell out acronyms first time
- Avoid mumbling
- Speak at consistent volume

#### Solution D: Use Text for Complex Terms
- Type technical terms
- Paste from documentation
- Use text input for code/formulas
- Voice for general description

---

### Issue 9: Switched to Non-Streaming Mode Automatically

**Symptoms:**
- Message: "Switched to manual mode due to errors"
- Streaming mode stopped working
- Now have manual controls

**Cause:**
After 2 consecutive errors, system automatically switches to non-streaming mode for reliability

**This is Normal:**
- Protects against repeated failures
- Allows you to continue with manual control
- Your conversation context is preserved

**Solutions:**

#### Solution A: Continue in Non-Streaming Mode
- Use manual controls
- Complete your classification
- More reliable after errors

#### Solution B: Start New Session
1. Complete current classification
2. Start new classification
3. Streaming mode available again
4. Consider staying in non-streaming if errors persist

#### Solution C: Fix Underlying Issue
- Check internet connection
- Check microphone quality
- Reduce background noise
- Update browser

---

### Issue 10: No Sound from Speakers

**Symptoms:**
- Questions don't play
- No audio output
- Play button works but no sound

**Solutions:**

#### Check System Volume
1. Ensure volume is not muted
2. Increase system volume
3. Check application volume (browser)

#### Check Audio Output Device
1. Verify correct speakers/headphones selected
2. Try different audio device
3. Unplug and replug headphones

#### Check Browser Settings
1. Browser may have site muted
2. Right-click browser tab → Unmute site
3. Check browser audio settings

#### Test Other Audio
1. Play YouTube video
2. If that works, issue is with CatalAIst
3. If that doesn't work, issue is with system
4. Restart browser/computer

---

### Issue 11: Waveform Not Showing (Streaming Mode)

**Symptoms:**
- No waveform visualization
- Just timer, no audio levels
- Recording works but no visual feedback

**Possible Causes:**

#### Cause A: Browser Doesn't Support Web Audio API

**Check:**
```
Browser console (F12) → Look for "AudioContext not supported"
```

**Solution:**
- Update browser to latest version
- Use Chrome, Firefox, or Edge (best support)
- Waveform is optional (recording still works)

#### Cause B: Microphone Not Providing Audio Levels

**Solution:**
- Recording still works
- Waveform is just visual feedback
- Check timer to confirm recording
- Look for pulsing red dot

---

## 🔧 Advanced Troubleshooting

### Browser Console Debugging

1. Press F12 to open developer tools
2. Go to "Console" tab
3. Look for errors (red text)
4. Common errors and meanings:

```
"NotAllowedError: Permission denied"
→ Microphone permission not granted

"NotFoundError: Requested device not found"
→ No microphone connected

"NetworkError: Failed to fetch"
→ Internet connection issue

"401 Unauthorized"
→ Invalid API key

"429 Too Many Requests"
→ Rate limit exceeded

"AudioContext was not allowed to start"
→ Browser blocked audio (click page to enable)
```

### Network Tab Debugging

1. Press F12 → "Network" tab
2. Start recording
3. Look for failed requests (red)
4. Click failed request to see details
5. Check "Response" tab for error message

### Testing Microphone

Test if microphone works outside CatalAIst:

**Online Test:**
- Visit: https://www.onlinemictest.com
- Grant permission
- Speak and watch levels
- If this works, issue is with CatalAIst config
- If this doesn't work, issue is with microphone/permissions

**System Test:**
- Windows: Settings → System → Sound → Test microphone
- Mac: System Preferences → Sound → Input → Check levels
- Linux: Settings → Sound → Input → Test

### Clearing Browser Data

Sometimes cached data causes issues:

**Chrome/Edge:**
1. Settings → Privacy → Clear browsing data
2. Select "Cached images and files"
3. Select "Cookies and site data"
4. Click "Clear data"
5. Refresh CatalAIst

**Firefox:**
1. Settings → Privacy → Clear Data
2. Select "Cookies" and "Cache"
3. Click "Clear"
4. Refresh CatalAIst

**Safari:**
1. Safari → Preferences → Privacy
2. Click "Manage Website Data"
3. Find CatalAIst site
4. Click "Remove"
5. Refresh CatalAIst

---

## 📱 Mobile-Specific Issues

### iOS Safari Issues

**Issue: Microphone permission not working**
- Settings → Safari → Camera & Microphone → Allow
- Refresh page
- Grant permission when prompted

**Issue: Audio doesn't autoplay**
- Tap anywhere on page first
- Then click play button
- iOS requires user interaction for audio

**Issue: Recording stops when screen locks**
- Keep screen on during recording
- Disable auto-lock temporarily
- Or use non-streaming mode (faster)

### Android Chrome Issues

**Issue: Microphone permission not working**
- Settings → Apps → Chrome → Permissions → Microphone → Allow
- Refresh page
- Grant permission when prompted

**Issue: Recording quality poor**
- Close other apps using microphone
- Check microphone not blocked (case, screen protector)
- Try different microphone (headset)

**Issue: App crashes during recording**
- Clear Chrome cache
- Update Chrome to latest version
- Restart device
- Use text input as fallback

---

## 🌐 Network Issues

### Slow Transcription

**Symptoms:**
- Transcription takes >10 seconds
- "Transcribing..." message stays long time

**Solutions:**
1. Check internet speed (need >1 Mbps upload)
2. Close other apps using bandwidth
3. Move closer to WiFi router
4. Switch to wired connection
5. Try again during off-peak hours

### Intermittent Failures

**Symptoms:**
- Sometimes works, sometimes doesn't
- Random "Network error" messages

**Solutions:**
1. Check WiFi signal strength
2. Restart router
3. Switch to different network
4. Use mobile hotspot as test
5. Contact ISP if problem persists

### Firewall/Proxy Issues

**Symptoms:**
- Works at home, not at work
- "Connection refused" errors
- Requests timeout

**Solutions:**
1. Check if OpenAI API is blocked
2. Ask IT to whitelist: api.openai.com
3. Try VPN
4. Use mobile hotspot as workaround
5. Use text input at work

---

## 🔐 Security/Privacy Issues

### HTTPS Required

**Symptoms:**
- "Microphone not available over HTTP"
- Permission request doesn't appear

**Cause:**
Browsers require HTTPS for microphone access (security feature)

**Solutions:**
- Use HTTPS in production
- Use localhost for development (allowed)
- Don't use HTTP with IP address
- Set up SSL certificate

### Corporate Firewall

**Symptoms:**
- Works at home, not at work
- SSL certificate errors

**Solutions:**
1. Ask IT to whitelist OpenAI API
2. Import corporate SSL certificate
3. Use VPN
4. Use mobile hotspot
5. Use text input at work

---

## 📊 Performance Issues

### High CPU Usage

**Symptoms:**
- Browser becomes slow during recording
- Fan spins up
- Computer gets hot

**Causes:**
- Voice Activity Detection uses CPU
- Audio processing in real-time

**Solutions:**
1. Close other tabs/apps
2. Use non-streaming mode (less CPU)
3. Disable waveform visualization (future feature)
4. Use more powerful device
5. Use text input for long sessions

### High Memory Usage

**Symptoms:**
- Browser uses lots of RAM
- Computer slows down
- Browser crashes

**Solutions:**
1. Close other tabs
2. Restart browser periodically
3. Use non-streaming mode
4. Clear browser cache
5. Use text input for long sessions

---

## 🆘 When All Else Fails

### Fallback Options

1. **Use Text Input**
   - Always available
   - No microphone needed
   - Type or paste text
   - Same functionality

2. **Try Different Browser**
   - Chrome (recommended)
   - Firefox
   - Edge
   - Safari

3. **Try Different Device**
   - Desktop vs laptop
   - Different computer
   - Mobile device
   - Tablet

4. **Use Different Network**
   - Home vs work
   - WiFi vs wired
   - Mobile hotspot
   - Public WiFi

### Reporting Bugs

If you've tried everything and it still doesn't work:

1. **Gather Information:**
   - Browser and version
   - Operating system
   - Error messages (exact text)
   - Browser console errors (F12)
   - Steps to reproduce

2. **Check Known Issues:**
   - GitHub issues
   - Release notes
   - Changelog

3. **Report Issue:**
   - Include all information above
   - Screenshots if possible
   - Browser console log
   - Network tab screenshot

4. **Workaround:**
   - Use text input
   - Wait for fix
   - Try different browser

---

## 📚 Additional Resources

- **Voice Features Guide:** [VOICE_FEATURES_GUIDE.md](VOICE_FEATURES_GUIDE.md)
- **Main README:** [README.md](../README.md)
- **OpenAI Status:** https://status.openai.com
- **Browser Compatibility:** https://caniuse.com/mediarecorder

---

## ✅ Troubleshooting Checklist

Before reporting an issue, verify:

- [ ] OpenAI selected as provider
- [ ] Valid API key entered
- [ ] Microphone permission granted
- [ ] Using supported browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- [ ] Internet connection working
- [ ] Microphone working in other apps
- [ ] Browser console checked for errors
- [ ] Tried different browser
- [ ] Tried text input as fallback
- [ ] Checked OpenAI API status
- [ ] Cleared browser cache
- [ ] Restarted browser

---

**Last Updated:** November 14, 2025  
**Version:** 2.4.0

