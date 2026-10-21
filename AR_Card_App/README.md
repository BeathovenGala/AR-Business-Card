# AR Business Card: Android app

The web app in `../AR_Business_Card` wrapped as an Android app with Capacitor 6.

## Install on a phone
1. Copy `AR_Business_Card.apk` to the phone (USB, Drive or WhatsApp to yourself).
2. Open it and allow "Install unknown apps" for the app you opened it from.
3. Open **AR Business Card**, tap **Start AR** and allow the camera.
4. Point the back camera at the printed card. Tap buttons on the screen, pinch with two fingers to zoom.

Needs Android 5.1 or newer and an internet connection (A-Frame, MindAR and MediaPipe load from CDNs).

## Rebuild after changing the web app
Needs Node.js, JDK 17 and the Android SDK (`android/local.properties` points to it).

```bash
npm run sync-web
cd android && gradlew.bat assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.
On Windows, a long folder path can break the build; building from a `subst` drive letter avoids it.

## Files
| Path                    | Purpose                                                  |
|-------------------------|----------------------------------------------------------|
| copy-web.mjs            | Copies the web app into `www/` (skips server, tools, tests) |
| capacitor.config.json   | App id `dev.harshiljsoni.arcard`, name, web folder       |
| make-icons.py           | Draws the launcher icon and splash screen                |
| android/                | Generated Android Studio project (camera permission added) |
