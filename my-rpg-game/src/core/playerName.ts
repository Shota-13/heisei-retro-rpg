const PLAYER_NAME_STORAGE_KEY = 'heisei-retro-rpg.player-name';

export function getPlayerName(): string | null {
  const playerName = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY)?.trim();
  return playerName || null;
}

export function savePlayerName(playerName: string): string {
  const trimmedName = playerName.trim();
  if (!trimmedName) {
    throw new Error('Player name must not be empty');
  }

  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedName);
  return trimmedName;
}
