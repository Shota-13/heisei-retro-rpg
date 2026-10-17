// path: src/config/placeholder.ts
// 仮素材(コードで生成する絵)の色。本素材が入ったら不要になる。

export const PLACEHOLDER_COLORS = {
  skin: 0xf2c9a0,
  hair: 0x5b3a29,
  shirt: 0x3b82f6,
  npcShirts: {
    blue: 0x3b82f6,
    red: 0xdc4545,
    green: 0x3b9b62,
    yellow: 0xd6a82f,
  },
  pants: 0x1e3a8a,
  eye: 0x111827,
  floorA: 0x243044,
  floorB: 0x1f2a3b,
  wallFill: 0x6b7280,
  wallEdge: 0x374151,
} as const;
