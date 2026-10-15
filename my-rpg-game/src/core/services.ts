// path: src/core/services.ts
import type { InputSystem } from '../systems/InputSystem';

/**
 * シーンの外に置く共有サービス。シーンはここから取り出して使う。
 * (シーンの中に持つと、シーン切り替えで消えるため。GameState もいずれここに並ぶ)
 */
export interface GameServices {
  readonly input: InputSystem;
}

let current: GameServices | undefined;

export function provideServices(services: GameServices): void {
  current = services;
}

export function getServices(): GameServices {
  if (!current) {
    throw new Error('GameServices is not provided. Call provideServices() in main.ts before creating the game.');
  }
  return current;
}
