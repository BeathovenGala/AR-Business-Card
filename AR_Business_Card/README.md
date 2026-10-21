# AR Business Card (gesture controlled)

A printed business card that comes alive in AR through a laptop webcam. The card is tracked with
MindAR, 3D content is drawn with A-Frame, and MediaPipe hand tracking lets you press the virtual
buttons by pinching your thumb and index finger.

## Run it
1. Print `card/AR_Card_Print_A4.pdf` at 100% scale (or show `assets/card.png` on a phone).
2. Double-click `run.bat` (or run `python server.py`). Chrome opens at http://localhost:8080.
3. Click **Start AR**, allow the camera, and hold the card in front of the webcam.
4. Point at a button with your index finger, then **pinch** or **hold still** for a moment to press it.
   The mouse works too. Tap anywhere on an open panel (or press its button again) to close it.
5. **Zoom:** press ZOOM, then spread your thumb and index finger to make the content bigger, or pinch
   them to make it smaller. Hold on DONE to finish. Mouse wheel and +/- keys also zoom; 0 resets.

The view is mirrored like a selfie camera (press **M** to switch). Press **H** for the FPS counter.
Needs Python 3, Chrome/Edge, a webcam and an internet connection (libraries load from CDN).

Tips: hold the card in one hand and point with the other, keep your pointing hand off the card,
and use good light.

## Buttons
| Button      | Action                                                  |
|-------------|---------------------------------------------------------|
| INTRO VIDEO | Plays the intro video pinned over the card (press again to stop) |
| PORTFOLIO   | Opens harshiljsoni.dev in a window, with "Open in new tab" |
| SKILLS      | Shows/hides a panel of skill chips                      |
| CONTACT     | Shows/hides the contact panel                           |
| ZOOM / DONE | Finger zoom mode (spread = bigger, pinch = smaller)     |

## Customise
- Name, website, email, phone, skills and video: `config.js`
- Card artwork: edit `card/card.html`, re-render `assets/card.png`, then open
  http://localhost:8080/tools/compile.html to rebuild `assets/targets.mind`.

## Files
| File              | Purpose                                              |
|-------------------|------------------------------------------------------|
| index.html        | A-Frame scene with the MindAR image target           |
| app.js            | Interaction: hover, pinch, hold-to-press, raycasting |
| scene3d.js        | 3D buttons, panels and animations                    |
| components.js     | A-Frame components: rounded panels, cube, icons      |
| ui.js             | Pointer, status chips, video and portfolio windows   |
| hand-tracker.js   | MediaPipe Hand Landmarker loop and skeleton drawing  |
| gesture.js        | Pinch ratio, hysteresis and smoothing (pure maths)   |
| tests/            | Unit tests: `node --test tests/gesture.test.mjs`     |
| server.py         | Local web server (camera needs localhost or https)   |

