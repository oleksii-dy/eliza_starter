# Known Issues & Bugs

## 🐛 Current Bugs

### High Priority

1. **Agent Response Not Showing**

   - **Issue**: Agent responses may not appear if the agent ID doesn't match expected value
   - **Workaround**: Ensure AGENT_ID in SocketContext matches the actual agent ID
   - **Fix**: Implement dynamic agent ID detection

2. **Memory Leak in Log Streaming**
   - **Issue**: Log entries accumulate without cleanup
   - **Impact**: Performance degradation after extended use
   - **Fix**: Implement log entry limit and cleanup

### Medium Priority

3. **Reconnection State Confusion**

   - **Issue**: UI may show "Online" while actually disconnected
   - **Fix**: Improve connection state management

4. **Message History Lost on Refresh**

   - **Issue**: Chat history not persisted between sessions
   - **Fix**: Implement local storage or API-based history

5. **Input Focus Loss**
   - **Issue**: Focus doesn't return to input after sending message
   - **Fix**: Add focus management in ChatPanel

### Low Priority

6. **Scrollbar Styling Inconsistent**

   - **Issue**: Custom scrollbar only works in Webkit browsers
   - **Fix**: Add Firefox scrollbar styling

7. **Mobile Keyboard Issues**
   - **Issue**: Virtual keyboard may cover input on some devices
   - **Fix**: Implement viewport adjustments

## ⚠️ Limitations

1. **Single User Only**

   - No multi-user support
   - No user profiles or settings

2. **No Message Persistence**

   - Messages lost on server restart
   - No chat export functionality

3. **Limited Error Recovery**

   - No retry mechanism for failed messages
   - No offline queue

4. **Fixed Configuration**

   - Hardcoded server URL (localhost:3000)
   - No environment-based configuration

5. **Basic Security**
   - No authentication
   - No encrypted connections
   - No rate limiting

## 🔧 Configuration Issues

1. **Environment Variables**

   - `.env` file must be manually created
   - No validation of API keys

2. **Port Conflicts**

   - No automatic port selection if 3000/5173 in use
   - Manual cleanup required

3. **Build Dependencies**
   - Requires Node.js 18+
   - Rust needed for Tauri builds

## 📱 Browser Compatibility

### Fully Supported

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Partially Supported

- Chrome/Edge 80-89 (no glow effects)
- Firefox 78-87 (scrollbar issues)

### Not Supported

- Internet Explorer (any version)
- Browsers without WebSocket support

## 🚀 Performance Issues

1. **Initial Load Time**

   - Boot sequence adds 2-3 seconds
   - Could be made skippable

2. **Large Message Handling**

   - UI may lag with very long messages
   - No pagination for chat history

3. **Log Panel Performance**
   - Slows down with >1000 log entries
   - No virtualization implemented

## 📝 TODO Items

### Immediate

- [ ] Add message retry mechanism
- [ ] Implement connection error UI
- [ ] Add loading skeleton
- [ ] Fix agent ID detection

### Short Term

- [ ] Add local storage for preferences
- [ ] Implement message search
- [ ] Add keyboard shortcuts help
- [ ] Create settings panel

### Long Term

- [ ] Multi-agent support
- [ ] Theme customization
- [ ] Plugin system
- [ ] Mobile app version

## 🔍 Debug Tips

### Connection Issues

```bash
# Check if server is running
curl http://localhost:3000/api/server/health

# Check WebSocket
wscat -c ws://localhost:3000
```

### Agent Not Responding

1. Check `.env` has valid OpenAI API key
2. Check server logs for errors
3. Verify agent ID matches in code

### UI Not Loading

1. Clear browser cache
2. Check console for errors
3. Verify all dependencies installed

---

_Last Updated: [Current Date]_
_Report issues at: github.com/elizaos/eliza/issues_
