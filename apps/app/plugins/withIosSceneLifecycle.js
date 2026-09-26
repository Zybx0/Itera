/**
 * Expo SDK 57's default iOS template does not adopt the UIScene life cycle:
 * `Info.plist` has no `UIApplicationSceneManifest`, and the generated
 * `AppDelegate.swift` builds its window directly in
 * `didFinishLaunchingWithOptions` instead of through a scene. Recent iOS
 * versions require the scene life cycle and kill the app on launch
 * ("UIScene life cycle is required for apps built with this SDK").
 *
 * Expo already ships the missing piece (`ExpoAppSceneDelegate`, Obj-C name
 * `EXExpoAppSceneDelegate`, in the `expo` package's
 * `ios/AppDelegates/ExpoAppSceneDelegate.swift`) — it is just not wired up
 * by default yet. This plugin:
 *   1. adds `UIApplicationSceneManifest` to Info.plist, pointing at it;
 *   2. removes the old-style window/`startReactNative` call from
 *      `AppDelegate.swift`, since the scene delegate now does that.
 *
 * Remove this plugin once a future Expo SDK does this out of the box (check
 * by reverting app.json and running `npx expo prebuild -p ios --clean`).
 */
const { withInfoPlist, withAppDelegate } = require('@expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

// Matches the `#if os(iOS) || os(tvOS) ... #endif` block that builds the
// window and starts React Native the old way, in Expo SDK 57's template.
const OLD_STYLE_LAUNCH_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*\n\s*factory\.startReactNative\(\s*\n\s*withModuleName: "main",\s*\n\s*in: window,\s*\n\s*launchOptions: launchOptions\)\s*\n\s*#endif\s*\n/;

// `ExpoAppSceneDelegate` retrieves the factory via `appDelegate as? ExpoReactNativeFactoryProvider`.
// Swift needs the conformance declared explicitly — matching properties are not enough.
const APP_DELEGATE_CLASS_LINE = /class AppDelegate: ExpoAppDelegate \{/;
const APP_DELEGATE_CLASS_LINE_WITH_CONFORMANCE = 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {';

function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return config;
  });

  return withAppDelegate(config, (config) => {
    const { contents, language } = config.modResults;
    if (language !== 'swift') {
      // Only the Swift template (current default) is known to need this.
      throw new Error(
        `withIosSceneLifecycle: AppDelegate is ${language}, not swift — the app.itera.ios ` +
          'iOS template changed. Check whether this plugin (and the matching Expo SDK gap) ' +
          'is still needed, and update OLD_STYLE_LAUNCH_BLOCK if so.',
      );
    }
    if (!OLD_STYLE_LAUNCH_BLOCK.test(contents)) {
      throw new Error(
        'withIosSceneLifecycle: expected old-style launch block not found in AppDelegate.swift. ' +
          "Expo's template likely changed — check whether this plugin is still needed.",
      );
    }
    if (!APP_DELEGATE_CLASS_LINE.test(contents)) {
      throw new Error(
        'withIosSceneLifecycle: expected "class AppDelegate: ExpoAppDelegate {" line not found. ' +
          "Expo's template likely changed — check whether this plugin is still needed.",
      );
    }
    config.modResults.contents = contents
      .replace(OLD_STYLE_LAUNCH_BLOCK, '')
      .replace(APP_DELEGATE_CLASS_LINE, APP_DELEGATE_CLASS_LINE_WITH_CONFORMANCE);
    return config;
  });
}

module.exports = withIosSceneLifecycle;
