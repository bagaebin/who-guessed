# Player Camera Bubble & Input Experience Spec

## Goals
- Align the player camera tile visuals with the shared character tile style guide (colors, lighting feel, rounded edges).
- Add a subtle sky-blue gradient backdrop in the 3D scene to improve depth perception.
- Upgrade the in-world speech bubble so players can send their self-intro text to the LLM directly from the 3D view (button + Enter key submission).
- Ensure keyboard typing always routes to the in-world bubble (even after mouse camera moves) and focuses the camera tile/bubble.
- Fix the duplicate Korean input issue inside the in-world speech bubble.

## Functional Requirements
1. **Camera tile styling**
   - Use the tileStyleGuide palette (base color/accent, opacity, border radius) for the player camera tile body and face frame.
   - Preserve readable video/text content while matching character tile lighting/roughness.
2. **3D background**
   - Add a light sky gradient background to the 3D scene to convey vertical depth.
3. **In-world bubble submission**
   - Bubble accepts self-introduction text for the LLM.
   - Includes a Send button; Enter key submits when not in an IME composition.
   - Submission path calls the same LLM flow as the side panel input and shows loading/disabled state while awaiting a response.
4. **Keyboard focus routing**
   - When the user presses a printable key while focus is outside text fields, the in-world bubble input gains focus and the camera re-focuses on the camera tile/bubble.
   - Cursor moves to the end of existing text without losing current content.
5. **Korean duplicate input fix**
   - Prevent double text insertion during IME composition (e.g., Hangul). Enter-to-send must ignore composition state.

## Technical Notes / Approach
- Reuse `getTileStyle` from `utils/tileStyleGuide` to drive the player camera tile materials and border radius (via `RoundedBox`). Accent color can be used for frame/LED strip for consistency.
- Add a sky gradient backdrop using a large plane with a `GradientTexture` (tone-mapped off) positioned behind the board; keep existing lights but adjust background color to complement the gradient.
- Wrap the bubble UI in a form element with submit handling wired to `useGameStore().submitPlayerText`. Add a Send button and Enter key submission guard (`event.nativeEvent.isComposing`).
- Track the bubble text in component state; reuse `isLoading` from the store for button disabled/label state.
- Implement a global keydown listener (skip when focusing inputs/textarea/contentEditable or during modifier keys) that focuses the bubble input and recenters the orbit controls target/camera toward the camera tile.
- Manage IME safety with `onCompositionStart/End` or composition-aware Enter handling to remove duplicate Korean character insertion.

## Acceptance Criteria
- Player camera tile matches character tile style (color, rounded edges, front frame/lighting feel) and still displays camera feed.
- Scene shows a subtle light sky gradient; base color still coherent with UI palette.
- Bubble has Send button; pressing Enter (outside composition) submits to LLM and shows loading state; existing side panel submission still works.
- Typing after panning the camera focuses bubble input and camera tile, with typed characters appearing once; no interference with other form fields.
- Korean text enters once per character (no duplication) and composition Enter does not prematurely submit.
