package com.augmentos.augmentos_core.comms;

import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;


public class AugmentOsManagerMessageParser {
    private static final String TAG = "AugmentOsMessageParser";
    private final AugmentOsActionsCallback callback;

    public AugmentOsManagerMessageParser(AugmentOsActionsCallback callback) {
        this.callback = callback;  // Store the callback reference for triggering actions
    }

    public void parseMessage(String json) throws JSONException {
            JSONObject commandObject = new JSONObject(json);
            String command = commandObject.getString("command");

            switch (command) {
                case "ping":
                    callback.requestPing();
                    break;

                case "request_status":
                    callback.requestStatus();
                    break;

                case "search_for_compatible_device_names":
                    String modelNameToFind = commandObject.getJSONObject("params").getString("model_name");
                    callback.searchForCompatibleDeviceNames(modelNameToFind);
                break;

                case "connect_wearable":
                    Log.d(TAG,"GOT A COMMAND TO CONNECT TO WEARABLE");
                    String modelName = commandObject.getJSONObject("params").getString("model_name");
                    String deviceName = commandObject.getJSONObject("params").getString("device_name");
                    Log.d(TAG,"Connect to model: " + modelName + ", device address: " + deviceName);
                    callback.connectToWearable(modelName, deviceName);
                    break;

                case "forget_smart_glasses":
                    callback.forgetSmartGlasses();
                    break;

                case "disconnect_wearable":
                    // String disconnectId = commandObject.getJSONObject("params").getString("target");
                    String disconnectId = "notImplemented";
                    callback.disconnectWearable(disconnectId);
                    break;

                case "start_app":
                    String packageName = commandObject.getJSONObject("params").getString("target");
                    callback.startApp(packageName);
                    break;

                case "stop_app":
                    String stopPackage = commandObject.getJSONObject("params").getString("target");
                    callback.stopApp(stopPackage);
                    break;

                case "enable_sensing":
                    boolean sensingEnabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setSensingEnabled(sensingEnabled);
                    break;

                case "force_core_onboard_mic":
                    boolean toForceCoreOnboardMic = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setForceCoreOnboardMic(toForceCoreOnboardMic);
                    break;

                case "enable_contextual_dashboard":
                    boolean dashboardEnabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setContextualDashboardEnabled(dashboardEnabled);
                    break;

                case "set_metric_system_enabled":
                    // Log.d(TAG, "GOT A COMMAND TO SET METRIC SYSTEM ENABLED");
                    boolean metricSystemEnabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    // Log.d(TAG, "Metric system enabled: " + metricSystemEnabled);
                    callback.setMetricSystemEnabled(metricSystemEnabled);
                    break;

                case "bypass_vad_for_debugging":
                    boolean bypassVadForDebugging = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setBypassVadForDebugging(bypassVadForDebugging);
                    break;

                case "bypass_audio_encoding_for_debugging":
                    boolean bypassAudioEncodingForDebugging = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setBypassAudioEncodingForDebugging(bypassAudioEncodingForDebugging);
                    break;

                case "enable_always_on_status_bar":
                    boolean alwaysOnEnabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setAlwaysOnStatusBarEnabled(alwaysOnEnabled);
                    break;

                case "enable_power_saving_mode":
                    boolean powerSavingEnabled = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setPowerSavingMode(powerSavingEnabled);
                    break;

                case "install_app_from_repository": // TODO: Implement repository handling
//                    String repo = commandObject.getJSONObject("params").getString("repository");
                    String packageNameToInstall = commandObject.getJSONObject("params").getString("target");
                    callback.installAppFromRepository("repo", packageNameToInstall);
                    break;

                case "uninstall_app":
                    String uninstallPackage = commandObject.getJSONObject("params").getString("target");
                    callback.uninstallApp(uninstallPackage);
                    break;

                case "phone_notification":
                    JSONObject notificationData = commandObject.getJSONObject("params");
                    Log.d(TAG, notificationData.toString());
                    callback.handleNotificationData(notificationData);
                    break;

                case "phone_notification_dismissed":
                    JSONObject dismissalData = commandObject.getJSONObject("params");
                    Log.d(TAG, "Received notification dismissal: " + dismissalData.toString());
                    callback.handleNotificationDismissal(dismissalData);
                    break;

                case "set_auth_secret_key":
                    String userId = commandObject.getJSONObject("params").getString("userId");
                    String authKey = commandObject.getJSONObject("params").getString("authSecretKey");
                    callback.setAuthSecretKey(userId, authKey);
                    break;

                case "set_server_url":
                    String url = commandObject.getJSONObject("params").getString("url");
                    callback.setServerUrl(url);
                    break;

                case "verify_auth_secret_key":
                    callback.verifyAuthSecretKey();
                    break;

                case "delete_auth_secret_key":
                    callback.deleteAuthSecretKey();
                    break;

                case "update_app_settings":
                    String targetApp = commandObject.getJSONObject("params").getString("target");
                    JSONObject settings = commandObject.getJSONObject("params").getJSONObject("settings");
                    callback.updateAppSettings(targetApp, settings);
                    break;
                case "request_app_info":
                    String packageNameToGetDetails = commandObject.getJSONObject("params").getString("target");
                    callback.requestAppInfo(packageNameToGetDetails);
                    break;

                case "update_glasses_brightness":
                    int brightnessLevel = commandObject.getJSONObject("params").getInt("brightness");
                    boolean isAutoBrightness = commandObject.getJSONObject("params").getBoolean("autoBrightness");
                    Log.d(TAG, "Brightness level: " + brightnessLevel + ", autoBrightness: " + isAutoBrightness);
                    if (isAutoBrightness) {
                        callback.updateGlassesAutoBrightness(isAutoBrightness);
                    }
                    else {
                        callback.updateGlassesBrightness(brightnessLevel);
                    }
                    break;

                case "update_glasses_head_up_angle":
                    int headUpAngle = commandObject.getJSONObject("params").getInt("headUpAngle");
                    callback.updateGlassesHeadUpAngle(headUpAngle);
                    break;

                case "update_glasses_height":
                    int height = commandObject.getJSONObject("params").getInt("height");
                    callback.updateGlassesHeight(height);
                    break;

                case "update_glasses_depth":
                    int depth = commandObject.getJSONObject("params").getInt("depth");
                    callback.updateGlassesDepth(depth);
                    break;

                case "toggle_updating_screen":
                    boolean updatingScreen = commandObject.getJSONObject("params").getBoolean("enabled");
                    callback.setUpdatingScreen(updatingScreen);
                    break;


                case "send_wifi_credentials":
                    String ssid = commandObject.getJSONObject("params").getString("ssid");
                    String password = commandObject.getJSONObject("params").getString("password");
                    // Log.d(TAG, "@#@ GOT A COMMAND TO SEND WIFI CREDENTIALS, SSID: " + ssid + ", PASSWORD: " + password);
                    callback.setGlassesWifiCredentials(ssid, password);
                    break;

                case "request_wifi_scan":
                    callback.requestWifiScan();
                    break;

                case "set_preferred_mic":
                    String mic = commandObject.getJSONObject("params").getString("mic");
                    callback.setPreferredMic(mic);
                    break;

                case "audio_play_response":
                    JSONObject audioResponse = commandObject.getJSONObject("params");
                    callback.onAudioPlayResponse(audioResponse);
                    break;

                case "audio_stop_request":
                    JSONObject audioStopParams = commandObject.getJSONObject("params");
                    callback.onAudioStopRequest(audioStopParams);
                    break;

                case "simulate_head_position":
                    String position = commandObject.getJSONObject("params").getString("position");
                    callback.simulateHeadPosition(position);
                    break;

                case "simulate_button_press":
                    String buttonId = commandObject.getJSONObject("params").getString("buttonId");
                    String pressType = commandObject.getJSONObject("params").getString("pressType");
                    callback.simulateButtonPress(buttonId, pressType);
                    break;

                default:
                    Log.w(TAG, "Unknown command: " + command);
            }
    }
}
