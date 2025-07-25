// src/enums.ts

/**
 * Types of Third-Party Applications (Apps)
 */
export enum AppType {
    SYSTEM_DASHBOARD = 'system_dashboard',  // Special UI placement, system functionality
    BACKGROUND = 'background',              // Can temporarily take control of display
    STANDARD = 'standard'                   // Regular App (default) only one standard app can run at a time. starting a standard App will close any other standard App that is running.
}

// TODO(isaiah): doesn't seem like this is actually used anywhere, remove?
/**
 * Application states in the system
 */
export enum AppState {
    NOT_INSTALLED = 'not_installed',  // Initial state
    INSTALLED = 'installed',          // Installed but never run
    BOOTING = 'booting',              // Starting up
    RUNNING = 'running',              // Active and running
    STOPPED = 'stopped',              // Manually stopped
    ERROR = 'error'                   // Error state
}

/**
 * Supported languages
 */
export enum Language {
    EN = "en",
    ES = "es",
    FR = "fr",
    // TODO: Add more languages
}

/**
 * Types of layouts for displaying content
 */
export enum LayoutType {
    TEXT_WALL = 'text_wall',
    DOUBLE_TEXT_WALL = 'double_text_wall',
    DASHBOARD_CARD = 'dashboard_card',
    REFERENCE_CARD = 'reference_card',
    BITMAP_VIEW = 'bitmap_view',
    BITMAP_ANIMATION = 'bitmap_animation',
    CLEAR_VIEW = 'clear_view'
}

/**
 * Types of views for displaying content
 */
export enum ViewType {
    DASHBOARD = 'dashboard',   // Regular dashboard (main/expanded)
    ALWAYS_ON = 'always_on',   // Persistent overlay dashboard
    MAIN = 'main'              // Regular app content
}

// Types for AppSettings
export enum AppSettingType {
    TOGGLE = 'toggle',
    TEXT = 'text',
    SELECT = 'select',
    SLIDER = 'slider',
    GROUP = 'group',
    TEXT_NO_SAVE_BUTTON = 'text_no_save_button',
    SELECT_WITH_SEARCH = 'select_with_search',
    MULTISELECT = 'multiselect',
    TITLE_VALUE = 'titleValue',
    NUMERIC_INPUT = 'numeric_input',
    TIME_PICKER = 'time_picker'
}
// | { type: "toggle"; key: string; label: string; defaultValue: boolean }
// | { type: "text"; key: string; label: string; defaultValue?: string }
// | { type: "select"; key: string; label: string; options: { label: string; value: string }[]; defaultValue?: string };