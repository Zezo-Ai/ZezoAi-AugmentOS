/**
 * @fileoverview UserSession class that encapsulates all session-related
 * functionality and state for the server.
 */

import { Logger } from 'pino';
import WebSocket from 'ws';
import { AppI, CloudToGlassesMessageType, ConnectionError, TranscriptSegment } from '@mentra/sdk';
import { logger as rootLogger } from '../logging/pino-logger';
import { Capabilities } from '@mentra/sdk';
import AppManager from './AppManager';
import AudioManager from './AudioManager';
import MicrophoneManager from './MicrophoneManager';
import DisplayManager from '../layout/DisplayManager6.1';
import { DashboardManager } from '../dashboard';
import VideoManager from './VideoManager';
import PhotoManager from './PhotoManager';
import { GlassesErrorCode } from '../websocket/websocket-glasses.service';
import SessionStorage from './SessionStorage';
import { PosthogService } from '../logging/posthog.service';
import { TranscriptionManager } from './transcription/TranscriptionManager';
import { ManagedStreamingExtension } from '../streaming/ManagedStreamingExtension';
import { getCapabilitiesForModel } from '../../config/hardware-capabilities';

export const LOG_PING_PONG = false; // Set to true to enable detailed ping/pong logging
/**
 * Complete user session class that encapsulates all session-related
 * functionality and state for the server.
 */
export class UserSession {

  // Core identification
  public readonly userId: string;
  public readonly startTime: Date;// = new Date();
  public disconnectedAt: Date | null = null;

  // Logging
  public readonly logger: Logger;

  // WebSocket connection
  public websocket: WebSocket;

  // App state // TODO: move these state variables to AppManager, don't let other managers access them directly
  // They should only be accessed through AppManager methods!!!.
  public installedApps: Map<string, AppI> = new Map();
  public runningApps: Set<string> = new Set();
  public loadingApps: Set<string> = new Set();
  public appWebsockets: Map<string, WebSocket> = new Map();

  // Transcription
  public isTranscribing: boolean = false;
  public lastAudioTimestamp?: number;

  // Audio
  public bufferedAudio: ArrayBufferLike[] = [];
  public recentAudioBuffer: { data: ArrayBufferLike; timestamp: number }[] = [];

  // Cleanup state
  // When disconnected, this will be set to a timer that will clean up the session after the grace period, if user does not reconnect.
  public cleanupTimerId?: NodeJS.Timeout;

  // Managers
  public displayManager: DisplayManager;
  public dashboardManager: DashboardManager;
  public microphoneManager: MicrophoneManager;
  public appManager: AppManager;
  public audioManager: AudioManager;
  public transcriptionManager: TranscriptionManager;

  public videoManager: VideoManager;
  public photoManager: PhotoManager;
  public managedStreamingExtension: ManagedStreamingExtension;

  // Reconnection
  public _reconnectionTimers: Map<string, NodeJS.Timeout>;

  // Heartbeat for glasses connection
  private glassesHeartbeatInterval?: NodeJS.Timeout;

  // Audio play request tracking - maps requestId to packageName
  public audioPlayRequestMapping: Map<string, string> = new Map();

  // Other state
  public userDatetime?: string;

  // Capability Discovery
  public capabilities: Capabilities | null = null;

  // Current connected glasses model
  public currentGlassesModel: string | null = null;

  constructor(userId: string, websocket: WebSocket) {
    this.userId = userId;
    this.websocket = websocket;
    this.logger = rootLogger.child({ userId, service: 'UserSession' });

    // Initialize managers
    this.appManager = new AppManager(this);
    this.audioManager = new AudioManager(this);
    this.dashboardManager = new DashboardManager(this);
    this.displayManager = new DisplayManager(this);
    this.microphoneManager = new MicrophoneManager(this);
    this.transcriptionManager = new TranscriptionManager(this);
    this.photoManager = new PhotoManager(this);
    this.videoManager = new VideoManager(this);
    this.managedStreamingExtension = new ManagedStreamingExtension(this.logger);

    this._reconnectionTimers = new Map();
    this.startTime = new Date();

    // Set up heartbeat for glasses connection
    this.setupGlassesHeartbeat();

    // Register in session storage
    SessionStorage.getInstance().set(userId, this);
    this.logger.info(`✅ User session created and registered for ${userId}`);
  }

  /**
   * Set up heartbeat for glasses WebSocket connection
   */
  private setupGlassesHeartbeat(): void {
    const HEARTBEAT_INTERVAL = 10000; // 10 seconds

    // Clear any existing heartbeat
    this.clearGlassesHeartbeat();

    // Set up new heartbeat
    this.glassesHeartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.ping();
        if (LOG_PING_PONG) {
          this.logger.debug({ ping: true }, `[UserSession:heartbeat:ping] Sent ping to glasses for user ${this.userId}`);
        }
      } else {
        // WebSocket is not open, clear the interval
        this.clearGlassesHeartbeat();
      }
    }, HEARTBEAT_INTERVAL);

    // Set up pong handler
    this.websocket.on('pong', () => {
      if (LOG_PING_PONG) {
        this.logger.debug({ pong: true }, `[UserSession:heartbeat:pong] Received pong from glasses for user ${this.userId}`);
      }
    });

    this.logger.debug(`[UserSession:setupGlassesHeartbeat] Heartbeat established for glasses connection`);
  }

  /**
   * Clear heartbeat for glasses connection
   */
  private clearGlassesHeartbeat(): void {
    if (this.glassesHeartbeatInterval) {
      clearInterval(this.glassesHeartbeatInterval);
      this.glassesHeartbeatInterval = undefined;
      this.logger.debug(`[UserSession:clearGlassesHeartbeat] Heartbeat cleared for glasses connection`);
    }
  }

  /**
   * Update WebSocket connection and restart heartbeat
   * Called when glasses reconnect with a new WebSocket
   */
  updateWebSocket(newWebSocket: WebSocket): void {
    this.logger.info(`[UserSession:updateWebSocket] Updating WebSocket connection for user ${this.userId}`);

    // Clear old heartbeat
    this.clearGlassesHeartbeat();

    // Update WebSocket reference
    this.websocket = newWebSocket;

    // Set up new heartbeat with the new WebSocket
    this.setupGlassesHeartbeat();

    this.logger.debug(`[UserSession:updateWebSocket] WebSocket and heartbeat updated for user ${this.userId}`);
  }

  /**
   * Update the current glasses model and refresh capabilities
   * Called when model information is received from the manager
   */
  updateGlassesModel(modelName: string): void {
    if (this.currentGlassesModel === modelName) {
      this.logger.debug(`[UserSession:updateGlassesModel] Model unchanged: ${modelName}`);
      return;
    }

    this.logger.info(`[UserSession:updateGlassesModel] Updating glasses model from "${this.currentGlassesModel}" to "${modelName}"`);

    this.currentGlassesModel = modelName;

    // Update capabilities based on the new model
    const capabilities = getCapabilitiesForModel(modelName);
    if (capabilities) {
      this.capabilities = capabilities;
      this.logger.info(`[UserSession:updateGlassesModel] Updated capabilities for ${modelName}`);
    } else {
      this.logger.warn(`[UserSession:updateGlassesModel] No capabilities found for model: ${modelName}`);

      // Fallback to Even Realities G1 capabilities if no capabilities found and we don't have any yet
      if (!this.capabilities) {
        const fallbackCapabilities = getCapabilitiesForModel("Even Realities G1");
        if (fallbackCapabilities) {
          this.capabilities = fallbackCapabilities;
          this.logger.info(`[UserSession:updateGlassesModel] Applied fallback capabilities (Even Realities G1) for unknown model: ${modelName}`);
        }
      }
    }
  }

  /**
   * Get capabilities with fallback to default model if none available
   */
  getCapabilities(): Capabilities | null {
    if (this.capabilities) {
      return this.capabilities;
    }

    // If no capabilities set yet, try to use Even Realities G1 as fallback
    const fallbackCapabilities = getCapabilitiesForModel("Even Realities G1");
    if (fallbackCapabilities) {
      this.logger.debug(`[UserSession:getCapabilities] Using fallback capabilities (Even Realities G1)`);
      return fallbackCapabilities;
    }

    this.logger.warn(`[UserSession:getCapabilities] No capabilities available, including fallback`);
    return null;
  }

  /**
   * Check if a specific capability is available
   */
  hasCapability(capability: keyof Capabilities): boolean {
    const caps = this.getCapabilities();
    return caps ? Boolean(caps[capability]) : false;
  }

  /**
   * Get a user session by ID
   */
  static getById(userId: string): UserSession | undefined {
    return SessionStorage.getInstance().get(userId);
  }

  /**
   * Get all active user sessions
   */
  static getAllSessions(): UserSession[] {
    return SessionStorage.getInstance().getAllSessions();
  }

  /**
   * Transform session data for client consumption
   */
  async toClientFormat(): Promise<any> {
    // Return only what the client needs
    return {
      userId: this.userId,
      startTime: this.startTime,
      activeAppSessions: Array.from(this.runningApps),
      loadingApps: Array.from(this.loadingApps),
      isTranscribing: this.isTranscribing,
      // Other client-relevant data
    };
  }

  /**
   * Send error message to glasses
   *
   * @param message Error message
   * @param code Error code
   */
  public sendError(message: string, code: GlassesErrorCode,): void {
    try {
      const errorMessage: ConnectionError = {
        type: CloudToGlassesMessageType.CONNECTION_ERROR,
        code: code,
        message,
        timestamp: new Date()
      };

      this.websocket.send(JSON.stringify(errorMessage));
      // this.websocket.close(1008, message);
    } catch (error) {
      this.logger.error('Error sending error message to glasses:', error);

      // try {
      //   this.websocket.close(1011, 'Internal server error');
      // } catch (closeError) {
      //   this.logger.error('Error closing WebSocket connection:', closeError);
      // }
    }
  }

  /**
   * Dispose of all resources and remove from sessions map
   */
  async dispose(): Promise<void> {
    this.logger.warn(`[UserSession:dispose]: Disposing UserSession: ${this.userId}`);

    // Log to posthog disconnected duration.
    const now = new Date();
    const duration = now.getTime() - this.startTime.getTime();
    this.logger.info({ duration }, `User session ${this.userId} disconnected. Connected for ${duration}ms`);
    try {
      await PosthogService.trackEvent("disconnected", this.userId, {
        duration: duration,
        userId: this.userId,
        sessionId: this.userId,
        disconnectedAt: now.toISOString(),
        startTime: this.startTime.toISOString()
      });
    } catch (error) {
      this.logger.error('Error tracking disconnected event:', error);
    }

    // Clean up all resources
    if (this.appManager) this.appManager.dispose();
    if (this.audioManager) this.audioManager.dispose();
    if (this.microphoneManager) this.microphoneManager.dispose();
    if (this.displayManager) this.displayManager.dispose();
    if (this.dashboardManager) this.dashboardManager.dispose();
    if (this.transcriptionManager) this.transcriptionManager.dispose();
    // if (this.heartbeatManager) this.heartbeatManager.dispose();
    if (this.videoManager) this.videoManager.dispose();
    if (this.photoManager) this.photoManager.dispose();
    if (this.managedStreamingExtension) this.managedStreamingExtension.dispose();

    // Clear glasses heartbeat
    this.clearGlassesHeartbeat();

    // Clear any timers
    if (this.cleanupTimerId) {
      clearTimeout(this.cleanupTimerId);
      this.cleanupTimerId = undefined;
    }

    if (this._reconnectionTimers) {
      for (const timer of this._reconnectionTimers.values()) {
        clearTimeout(timer);
      }
      this._reconnectionTimers.clear();
    }

    // Clear collections
    this.appWebsockets.clear();
    this.runningApps.clear();
    this.loadingApps.clear();
    this.bufferedAudio = [];
    this.recentAudioBuffer = [];

    // Clear audio play request mappings
    this.audioPlayRequestMapping.clear();

    // Remove from session storage
    SessionStorage.getInstance().delete(this.userId);

    this.logger.info({
      disposalReason: this.disconnectedAt ? 'grace_period_timeout' : 'explicit_disposal'
    }, `🗑️ Session disposed and removed from storage for ${this.userId}`);
  }


  /**
   * Get the session ID (for backward compatibility)
   */
  get sessionId(): string {
    return this.userId;
  }
}

export default UserSession;