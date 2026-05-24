import * as engine from "./engine.js";
import { DitherTransition } from "./entities/dither-transition.js";

let _transitioning = false;

/**
 * Executes a clean screen transition using the engine's native scene switch.
 */
export async function performSceneTransition(currentSceneName, targetSceneName) {
  if (_transitioning) return;
  _transitioning = true;

  const transition = new DitherTransition({
    duration: 600,
    color: '#000000',
    ditherDirection: 'diagonal',
    ditherSpacing: 1,
    ditherHarshness: 1,
  });

  transition.onComplete = async () => {
    if (transition.isFadingOut) {
      await engine.switchScene(currentSceneName, targetSceneName);
      transition.start(false);
    } else {
      engine.removeEntity(transition);
      _transitioning = false;
    }
  };

  engine.addEntity(transition);
  transition.start(true);
}