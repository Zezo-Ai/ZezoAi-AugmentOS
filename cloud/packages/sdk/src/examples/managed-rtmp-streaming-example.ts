/**
 * Managed RTMP Streaming Example
 *
 * This example demonstrates how to use the MentraOS SDK's managed streaming
 * feature. With managed streaming, you don't need your own RTMP server -
 * MentraOS handles all the infrastructure and provides viewer URLs.
 * 
 * Perfect for:
 * - Social media streaming (X, YouTube Live, TikTok Live)
 * - Quick demos and prototypes
 * - Production apps without existing streaming infrastructure
 * 
 * NEW: You can now add re-streaming to multiple platforms! See
 * managed-rtmp-streaming-with-restream-example.ts for details.
 */
import { AppSession, StreamType, ManagedStreamStatus } from '../';

// Initialize App session
const session = new AppSession({
  packageName: 'com.example.managed-streaming',
  apiKey: 'your-api-key',
  userId: 'example-user@example.com',
  appServer: {} as any, // In a real app, this would be a AppServer instance
  mentraOSWebsocketUrl: 'ws://localhost:8002/app-ws'
});

// Track current stream for cleanup
let currentStreamId: string | null = null;

// Connect to MentraOS Cloud and start streaming
async function main() {
  try {
    // 1. Connect to MentraOS Cloud
    await session.connect('managed-streaming-session');
    console.log('✅ Connected to MentraOS Cloud');

    // 2. Subscribe to stream status updates
    session.subscribe(StreamType.MANAGED_STREAM_STATUS);
    setupStreamStatusHandler();

    // 3. Start managed streaming
    await startManagedStream();

    // 4. Keep streaming for 2 minutes then stop
    setTimeout(async () => {
      await stopManagedStream();
      session.disconnect();
    }, 2 * 60 * 1000);

  } catch (error) {
    console.error('❌ Error:', error);
    session.disconnect();
  }
}

// Start a managed stream
async function startManagedStream() {
  try {
    console.log('🎬 Starting managed stream...');
    
    // Start streaming with zero configuration!
    const result = await session.camera.startManagedStream();

    currentStreamId = result.streamId;

    console.log('\n🎉 Stream started successfully!');
    console.log('📺 Share these URLs with viewers:');
    console.log(`   HLS URL (Best compatibility): ${result.hlsUrl}`);
    console.log(`   DASH URL (Alternative): ${result.dashUrl}`);
    if (result.webrtcUrl) {
      console.log(`   WebRTC URL (Low latency): ${result.webrtcUrl}`);
    }
    
    console.log('\n💡 Viewers can open the HLS URL in:');
    console.log('   - Any modern web browser');
    console.log('   - VLC Media Player');
    console.log('   - Mobile video players');
    console.log('   - Or embed in your app with video.js or hls.js\n');

  } catch (error) {
    console.error('❌ Failed to start managed stream:', error);
  }
}

// Example: Enable WebRTC for low-latency viewing
async function startLowLatencyStream() {
  try {
    const result = await session.camera.startManagedStream({
      enableWebRTC: true
    });
    
    console.log('✅ Low-latency stream started');
    console.log('🚀 WebRTC URL:', result.webrtcUrl);
    console.log('   (Latency: ~2-3 seconds vs 5-10 seconds for HLS)');

  } catch (error) {
    console.error('❌ Failed to start stream:', error);
  }
}

// Set up handler for stream status updates
function setupStreamStatusHandler() {
  session.on(StreamType.MANAGED_STREAM_STATUS, (status: ManagedStreamStatus) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (status.status) {
      case 'initializing':
        console.log(`[${timestamp}] 📡 Stream initializing...`);
        break;
        
      case 'active':
        console.log(`[${timestamp}] 🟢 Stream is LIVE!`);
        if (status.hlsUrl) {
          console.log(`   View at: ${status.hlsUrl}`);
        }
        break;
        
      case 'stopping':
        console.log(`[${timestamp}] 🟡 Stream stopping...`);
        break;
        
      case 'stopped':
        console.log(`[${timestamp}] 🔴 Stream stopped`);
        currentStreamId = null;
        break;
        
      case 'error':
        console.error(`[${timestamp}] ❌ Stream error: ${status.message}`);
        currentStreamId = null;
        break;
        
      default:
        console.log(`[${timestamp}] Stream status: ${status.status}`);
    }
  });
}

// Stop the managed stream
async function stopManagedStream() {
  if (!currentStreamId) {
    console.log('No active stream to stop');
    return;
  }

  try {
    console.log('🛑 Stopping managed stream...');
    await session.camera.stopManagedStream();
    console.log('✅ Stream stopped successfully');
    currentStreamId = null;
  } catch (error) {
    console.error('❌ Error stopping stream:', error);
  }
}

// Handle errors
session.events.on('error', (error) => {
  console.error('Session error:', error);
});

// Handle disconnection
session.events.on('disconnected', (info) => {
  console.log('Disconnected:', info);
  currentStreamId = null;
});

// Graceful shutdown on exit
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  if (currentStreamId) {
    await stopManagedStream();
  }
  session.disconnect();
  process.exit(0);
});

// Run the example
console.log('🚀 Managed RTMP Streaming Example');
console.log('==================================');
console.log('This example demonstrates zero-infrastructure streaming.');
console.log('No RTMP server needed - MentraOS handles everything!\n');

main().catch(console.error);