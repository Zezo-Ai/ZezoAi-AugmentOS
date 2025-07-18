/**
 * WebSocketManager - Handles WebSocket connection and message protocol
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import type { ClientConfig } from '../types';

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: ClientConfig;
  private sessionId: string | null = null;

  constructor(config: ClientConfig) {
    super();
    this.config = config;
  }

  async connect(serverUrl: string, email: string, coreToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL
        const wsUrl = serverUrl.replace(/^http/, 'ws') + '/glasses-ws';
        
        // Setup WebSocket with authentication
        const headers: Record<string, string> = {};
        if (coreToken) {
          headers['Authorization'] = `Bearer ${coreToken}`;
        }

        this.ws = new WebSocket(wsUrl, { headers });

        this.ws.on('open', () => {
          if (this.config.debug?.logWebSocketMessages) {
            console.log('[WebSocketManager] Connected to', wsUrl);
          }
          
          // Send connection init message
          this.sendMessage({
            type: 'connection_init',
            userId: email,
            coreToken,
            timestamp: new Date()
          });
        });

        this.ws.on('message', (data, isBinary) => {
          if (isBinary) {
            // Handle binary data (shouldn't happen for glasses->cloud direction)
            if (this.config.debug?.logWebSocketMessages) {
              const buffer = data instanceof Buffer ? data : Buffer.from(data as Uint8Array);
              console.log('[WebSocketManager] Received binary data:', buffer.length, 'bytes');
            }
            return;
          }

          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message, resolve, reject);
          } catch (error) {
            console.error('[WebSocketManager] Failed to parse message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('[WebSocketManager] WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          if (this.config.debug?.logWebSocketMessages) {
            console.log('[WebSocketManager] Connection closed:', code, reason.toString());
          }
          
          if (this.config.behavior?.reconnectOnDisconnect) {
            // TODO: Implement reconnection logic
            console.log('[WebSocketManager] Auto-reconnect not yet implemented');
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.sessionId = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  //===========================================================
  // Message Sending Methods
  //===========================================================

  sendVad(status: boolean): void {
    this.sendMessage({
      type: 'vad',
      status,
      timestamp: new Date()
    });
  }

  sendHeadPosition(position: 'up' | 'down'): void {
    this.sendMessage({
      type: 'head_position',
      position,
      timestamp: new Date()
    });
  }

  sendLocationUpdate(lat: number, lng: number): void {
    this.sendMessage({
      type: 'location_update',
      lat,
      lng,
      timestamp: new Date()
    });
  }

  sendStartApp(packageName: string): void {
    this.sendMessage({
      type: 'start_app',
      packageName,
      timestamp: new Date()
    });
  }

  sendStopApp(packageName: string): void {
    this.sendMessage({
      type: 'stop_app',
      packageName,
      timestamp: new Date()
    });
  }

  sendButtonPress(buttonId: string, pressType: 'short' | 'long'): void {
    this.sendMessage({
      type: 'button_press',
      buttonId,
      pressType,
      timestamp: new Date()
    });
  }

  sendCoreStatusUpdate(): void {
    const statusData = {
      battery: this.config.device?.batteryLevel || 85,
      brightness: this.config.device?.brightness || 50
    };

    this.sendMessage({
      type: 'core_status_update',
      status: JSON.stringify(statusData),
      details: {
        coreInfo: {
          version: '1.0.0',
          micEnabled: true
        },
        glassesInfo: {
          model: this.config.device?.model || 'Even Realities G1',
          battery: statusData.battery,
          connected: true
        }
      },
      timestamp: new Date()
    });
  }

  sendGlassesConnectionState(connected: boolean): void {
    this.sendMessage({
      type: 'glasses_connection_state',
      modelName: this.config.device?.model || 'Even Realities G1',
      status: connected ? 'CONNECTED' : 'DISCONNECTED',
      timestamp: new Date()
    });
  }

  sendAudioChunk(audioData: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  //===========================================================
  // Private Methods
  //===========================================================

  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      
      if (this.config.debug?.logWebSocketMessages) {
        console.log('[WebSocketManager] Sending:', message.type, message);
      }
      
      this.ws.send(messageStr);
    } else {
      console.warn('[WebSocketManager] Cannot send message - not connected');
    }
  }

  private handleMessage(message: any, connectResolve?: (value: void) => void, connectReject?: (reason: any) => void): void {
    if (this.config.debug?.logWebSocketMessages) {
      console.log('[WebSocketManager] Received:', message.type, message);
    }

    switch (message.type) {
      case 'connection_ack':
        this.sessionId = message.sessionId;
        this.emit('connection_ack', {
          sessionId: message.sessionId,
          userSession: message.userSession,
          timestamp: new Date(message.timestamp)
        });
        
        // Start sending periodic status updates
        this.startStatusUpdates();
        
        if (connectResolve) {
          connectResolve();
        }
        break;

      case 'connection_error':
      case 'auth_error':
        const error = new Error(message.message || 'Connection failed');
        this.emit('error', error);
        if (connectReject) {
          connectReject(error);
        }
        break;

      case 'display_event':
        this.emit('display_event', {
          layout: message.layout,
          timestamp: new Date(message.timestamp)
        });
        break;

      case 'app_state_change':
        this.emit('app_state_change', {
          userSession: message.userSession,
          timestamp: new Date(message.timestamp)
        });
        break;

      case 'microphone_state_change':
        this.emit('microphone_state_change', {
          isMicrophoneEnabled: message.isMicrophoneEnabled,
          timestamp: new Date(message.timestamp)
        });
        break;

      case 'settings_update':
        this.emit('settings_update', {
          settings: message.settings,
          timestamp: new Date(message.timestamp)
        });
        break;

      default:
        if (this.config.debug?.logLevel === 'debug') {
          console.log('[WebSocketManager] Unhandled message type:', message.type);
        }
    }
  }

  private startStatusUpdates(): void {
    // Skip status updates if disabled
    if (this.config.behavior?.disableStatusUpdates) {
      if (this.config.debug?.logLevel === 'debug') {
        console.log('[WebSocketManager] Status updates disabled');
      }
      return;
    }

    const interval = this.config.behavior?.statusUpdateInterval || 10000;
    
    setInterval(() => {
      if (this.isConnected()) {
        this.sendCoreStatusUpdate();
      }
    }, interval);
  }
}