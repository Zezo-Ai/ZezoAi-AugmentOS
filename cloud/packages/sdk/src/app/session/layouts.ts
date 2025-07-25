/**
 * 🎨 Layout Manager Module
 *
 * Manages AR display layouts for Apps. This class provides an easy-to-use interface
 * for showing different types of content in the user's AR view.
 *
 * @example
 * ```typescript
 * const layouts = new LayoutManager('org.example.myapp', sendMessage);
 *
 * // Show a simple message
 * layouts.showTextWall('Hello AR World!');
 *
 * // Show a card with title
 * layouts.showReferenceCard('Weather', 'Sunny and 75°F');
 * ```
 */
import { BitmapUtils } from "../../utils/bitmap-utils";
import {
  DisplayRequest,
  Layout,
  TextWall,
  DoubleTextWall,
  ReferenceCard,
  DashboardCard,
  LayoutType,
  ViewType,
  AppToCloudMessageType,
  BitmapView,
  BitmapAnimation,
  ClearView,
} from "../../types";

export class LayoutManager {
  /**
   * 🎯 Creates a new LayoutManager instance
   *
   * @param packageName - App package identifier
   * @param sendMessage - Function to send display requests to MentraOS
   */
  constructor(
    private packageName: string,
    private sendMessage: (message: DisplayRequest) => void,
  ) {}

  /**
   * 📦 Creates a display event request with validation
   *
   * @param layout - Layout configuration to display
   * @param view - View type (main or dashboard)
   * @param durationMs - How long to show the layout (optional)
   * @returns Formatted display request
   * @throws Error if layout is invalid
   */
  private createDisplayEvent(
    layout: Layout,
    view: ViewType = ViewType.MAIN,
    durationMs?: number,
  ): DisplayRequest {
    try {
      // Validate layout data before sending
      if (!layout) {
        throw new Error("Layout cannot be null or undefined");
      }

      if (!layout.layoutType) {
        throw new Error("Layout must have a layoutType property");
      }

      // Layout-specific validations
      switch (layout.layoutType) {
        case LayoutType.TEXT_WALL:
          if (typeof (layout as TextWall).text !== "string") {
            throw new Error("TextWall layout must have a text property");
          }
          // Ensure text is not too long (prevent performance issues)
          if ((layout as TextWall).text.length > 1000) {
            console.warn(
              "TextWall text is very long, this may cause performance issues",
            );
          }
          break;

        case LayoutType.DOUBLE_TEXT_WALL:
          const doubleText = layout as DoubleTextWall;
          if (typeof doubleText.topText !== "string") {
            throw new Error(
              "DoubleTextWall layout must have a topText property",
            );
          }
          if (typeof doubleText.bottomText !== "string") {
            throw new Error(
              "DoubleTextWall layout must have a bottomText property",
            );
          }
          break;

        case LayoutType.REFERENCE_CARD:
          const refCard = layout as ReferenceCard;
          if (typeof refCard.title !== "string") {
            throw new Error("ReferenceCard layout must have a title property");
          }
          if (typeof refCard.text !== "string") {
            throw new Error("ReferenceCard layout must have a text property");
          }
          break;

        case LayoutType.DASHBOARD_CARD:
          const dashCard = layout as DashboardCard;
          if (typeof dashCard.leftText !== "string") {
            throw new Error(
              "DashboardCard layout must have a leftText property",
            );
          }
          if (typeof dashCard.rightText !== "string") {
            throw new Error(
              "DashboardCard layout must have a rightText property",
            );
          }
          break;

        case LayoutType.BITMAP_VIEW:
          const bitmapView = layout as BitmapView;
          if (typeof bitmapView.data !== "string") {
            throw new Error("BitmapView layout must have a data property");
          }
          // Check if data is too large (prevent OOM errors)
          if (bitmapView.data.length > 1000000) {
            // 1MB limit
            throw new Error(
              "Bitmap data is too large (>1MB), please reduce size",
            );
          }
          break;

        case LayoutType.CLEAR_VIEW:
          // ClearView has no additional validation needed
          break;
      }

      // Validate view type
      if (view !== ViewType.MAIN && view !== ViewType.DASHBOARD) {
        console.warn(`Invalid view type: ${view}, defaulting to MAIN`);
        view = ViewType.MAIN;
      }

      // Validate duration if provided
      if (durationMs !== undefined) {
        if (typeof durationMs !== "number" || durationMs < 0) {
          console.warn(`Invalid duration: ${durationMs}, ignoring`);
          durationMs = undefined;
        }
      }

      // Create the display request with validated data
      return {
        timestamp: new Date(),
        sessionId: "", // Will be filled by session
        type: AppToCloudMessageType.DISPLAY_REQUEST,
        packageName: this.packageName,
        view,
        layout,
        durationMs,
      };
    } catch (error) {
      console.error("Error creating display event:", error);
      throw error; // Re-throw to notify caller
    }
  }

  /**
   * 📝 Shows a single block of text
   *
   * Best for:
   * - Simple messages
   * - Status updates
   * - Notifications
   *
   * @param text - Text content to display
   * @param options - Optional parameters (view, duration, priority)
   *   - priority: If true, this display will not be overridden by other requests (default: false)
   *
   * @example
   * ```typescript
   * layouts.showTextWall('Connected to server');
   * layouts.showTextWall('Onboarding!', { priority: true });
   * ```
   */
  showTextWall(
    text: string,
    options?: { view?: ViewType; durationMs?: number },
  ) {
    try {
      // Validate input before processing
      if (text === undefined || text === null) {
        text = ""; // Default to empty string instead of crashing
        console.warn("showTextWall called with null/undefined text");
      }

      // Ensure text is a string
      if (typeof text !== "string") {
        text = String(text); // Convert to string
        console.warn("showTextWall: Non-string input converted to string");
      }

      // Create layout with validated text
      const layout: TextWall = {
        layoutType: LayoutType.TEXT_WALL,
        text,
      };

      // Create and send display event with error handling
      try {
        const displayEvent = this.createDisplayEvent(
          layout,
          options?.view,
          options?.durationMs,
        );
        this.sendMessage(displayEvent);
      } catch (error) {
        console.error("Failed to display text wall:", error);
        // Don't re-throw - prevent app crashes
      }
    } catch (error) {
      console.error("Error in showTextWall:", error);
      // Don't crash the App - fail gracefully
    }
  }

  /**
   * ↕️ Shows two sections of text, one above the other
   *
   * Best for:
   * - Before/After content
   * - Question/Answer displays
   * - Two-part messages
   * - Comparisons
   *
   * @param topText - Text to show in top section
   * @param bottomText - Text to show in bottom section
   * @param options - Optional parameters (view, duration)
   *
   * @example
   * ```typescript
   * layouts.showDoubleTextWall(
   *   'Original: Hello',
   *   'Translated: Bonjour'
   * );
   * ```
   */
  showDoubleTextWall(
    topText: string,
    bottomText: string,
    options?: { view?: ViewType; durationMs?: number },
  ) {
    const layout: DoubleTextWall = {
      layoutType: LayoutType.DOUBLE_TEXT_WALL,
      topText,
      bottomText,
    };
    this.sendMessage(
      this.createDisplayEvent(layout, options?.view, options?.durationMs),
    );
  }

  /**
   * 📇 Shows a card with a title and content
   *
   * Best for:
   * - Titled content
   * - Important information
   * - Structured data
   * - Notifications with context
   *
   * @param title - Card title
   * @param text - Main content text
   * @param options - Optional parameters (view, duration)
   *
   * @example
   * ```typescript
   * layouts.showReferenceCard(
   *   'Meeting Reminder',
   *   'Team standup in 5 minutes'
   * );
   * ```
   */
  showReferenceCard(
    title: string,
    text: string,
    options?: { view?: ViewType; durationMs?: number },
  ) {
    const layout: ReferenceCard = {
      layoutType: LayoutType.REFERENCE_CARD,
      title,
      text,
    };
    this.sendMessage(
      this.createDisplayEvent(layout, options?.view, options?.durationMs),
    );
  }

  /**
   * 📇 Shows a bitmap
   *
   * Uses the proven animation system internally for proper L/R eye synchronization.
   * This ensures single bitmap displays work consistently with the same
   * hardware-optimized timing as animations.
   *
   * @param data - hex or base64 encoded bitmap data
   * @param options - Optional parameters (view, duration)
   *
   * @example
   * ```typescript
   * layouts.showBitmapView(
   *   yourHexOrBase64EncodedBitmapDataString
   * );
   * ```
   */
  async showBitmapView(
    base64Bitmap: string,
    options?: { view?: ViewType; padding?: { left: number; top: number } },
  ) {
    const padding = options?.padding ?? { left: 50, top: 35 };
    const bitmapFrame = await BitmapUtils.padBase64Bitmap(
      base64Bitmap,
      padding,
    );
    const validation = BitmapUtils.validateBase64Bitmap(bitmapFrame);
    if (!validation.isValid) {
      throw new Error(
        `❌ Frame validation failed: ${validation.errors.join(", ")}`,
      );
    }
    const layout: BitmapView = {
      layoutType: LayoutType.BITMAP_VIEW,
      data: bitmapFrame,
    };
    this.sendMessage(this.createDisplayEvent(layout, options?.view));
  }

  /**
   * 📊 Shows a dashboard card with left and right text
   *
   * Best for:
   * - Key-value pairs
   * - Dashboard displays
   * - Metrics
   *
   * @param leftText - Left side text (typically label/key)
   * @param rightText - Right side text (typically value)
   * @param options - Optional parameters (view, duration)
   *
   * @example
   * ```typescript
   * layouts.showDashboardCard('Weather', '72°F');
   * ```
   */
  showDashboardCard(
    leftText: string,
    rightText: string,
    options?: { view?: ViewType; durationMs?: number },
  ) {
    const layout: DashboardCard = {
      layoutType: LayoutType.DASHBOARD_CARD,
      leftText,
      rightText,
    };
    this.sendMessage(
      this.createDisplayEvent(
        layout,
        options?.view || ViewType.DASHBOARD,
        options?.durationMs,
      ),
    );
  }

  /**
   * 🧹 Clears the display
   *
   * Best for:
   * - Clearing previous content
   * - Resetting display state
   * - Starting fresh
   *
   * @param options - Optional parameters (view)
   *
   * @example
   * ```typescript
   * layouts.clearView();
   * layouts.clearView({ view: ViewType.DASHBOARD });
   * ```
   */
  clearView(options?: { view?: ViewType }) {
    const layout: ClearView = {
      layoutType: LayoutType.CLEAR_VIEW,
    };
    this.sendMessage(this.createDisplayEvent(layout, options?.view));
  }

  /**
   * 🎬 Shows an animated sequence of bitmap images (iOS-controlled timing)
   *
   * Sends complete animation package to iOS for device-controlled timing.
   * This provides superior performance and synchronization by letting
   * the device control the display timing directly.
   *
   * Best for:
   * - Smooth high-performance animations
   * - Precise timing control
   * - Synchronized left/right display
   * - EvenDemo-quality performance
   *
   * @param bitmapDataArray - Array of bitmap data strings (hex or base64 encoded)
   * @param intervalMs - Time between frames in milliseconds (default: 1650ms)
   * @param repeat - Whether to loop the animation continuously (default: false)
   * @param options - Optional parameters (view)
   *
   * @example
   * ```typescript
   * // Device-controlled animation (recommended)
   * const frames = ['hexdata1', 'hexdata2', 'hexdata3'];
   * layouts.showBitmapAnimation(frames, 1650, true);
   *
   * // Single-cycle animation
   * layouts.showBitmapAnimation(loadingFrames, 1650, false);
   * ```
   *
   * @returns Animation controller object with stop() method
   */
  showBitmapAnimation(
    bitmapDataArray: string[],
    intervalMs: number = 1650,
    repeat: boolean = false,
    options?: { view?: ViewType },
  ): { stop: () => void } {
    // Validation
    if (!Array.isArray(bitmapDataArray) || bitmapDataArray.length === 0) {
      throw new Error(
        "showBitmapAnimation requires a non-empty array of bitmap data",
      );
    }

    // Send complete animation package to iOS for device-controlled timing
    const layout: BitmapAnimation = {
      layoutType: LayoutType.BITMAP_ANIMATION,
      frames: bitmapDataArray,
      interval: intervalMs,
      repeat: repeat,
    };

    this.sendMessage(this.createDisplayEvent(layout, options?.view));

    console.log(
      `🎬 Sent batched animation to iOS: ${
        bitmapDataArray.length
      } frames at ${intervalMs}ms${repeat ? " (repeating)" : ""}`,
    );

    // Return controller for compatibility
    return {
      stop: () => {
        // Send stop command to iOS
        this.clearView();
        console.log("🛑 Animation stop requested");
      },
    };
  }
}
