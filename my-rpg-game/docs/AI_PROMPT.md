# 開発プロジェクト概要: レトロ風2D RPG

MOTHER2/3・Undertale のような雰囲気・システムの2D RPG を、完全オリジナルのキャラ・ストーリー・素材で作るプロジェクトです。
開発者はエンジニアですが、ゲーム開発は初心者です。ゲーム固有の用語や仕組みは、初出時に簡単に説明してください(過剰に噛み砕く必要はありません)。

プロジェクトの環境構築とホスティング(Hello Worldの公開)は完了しています。
設計の詳細は `docs/DECISIONS.md` にあり、**確定事項はそれに従ってください**。以下はその要約です。

---

## 1. 確定済みの前提

| 項目 | 決定 |
|---|---|
| 基盤 | Phaser 3(バージョン固定) + TypeScript(strict) + Vite、マップは Tiled |
| ホスティング | Cloudflare(GitHub連携) |
| 配信 | Web/PWA 先行、将来 Capacitor でアプリ化 |
| データ保持 | 端末内のみ(サーバー・DBなし) |
| 内部解像度 | 320×240(4:3)。キャンバスは `SCALE` 倍(定数、初期値3 = 960×720)。通常シーンはカメラを `SCALE` 倍ズーム |
| 高画質シーン | 奥行きのある一枚絵シーン(`ScenicScene`、ズーム1倍)。背景は4倍で制作し縮小して使う。全体の数%程度の使用 |
| タイル / キャラ | タイル16×16。キャラ枠は全員16×24 |
| 画面 | ゲーム画面は横長。スマホは縦持ちで、上に画面、下にHTML/CSSの操作盤(十字キー / A / B / MENU / SELECT) |
| 移動 | 8方向の自由移動 + Arcade Physics。当たり判定は足元の小矩形 |
| 入力 | `InputSystem` でアクション化(`up/down/left/right/confirm/cancel/menu/select/dash`)。キーボード・HTML操作盤・ゲームパッドは `InputSource` として追加。Aは「向いている先を直接調べる」方式。SELECTとdashは予約。詳細は DECISIONS.md |
| パーティ追従 | MOTHER2/3方式。最大4人、先頭のみ物理判定、後続は移動距離ごとの履歴をなぞる |
| イベント | Tiledの配置物 → イベントID → JSON命令列を実行するインタプリタ。各命令は終わるまで待つ |
| 多言語 | テキストはID参照(`ja.json`)、日本語から開始、ひらがな・カタカナ中心、`{player}` 差し込み、禁則処理 |
| シーン | Boot / Title / Field / Scenic / Battle / UI(UIは他シーンの上に重ねる共通シーン) |
| 状態 | `GameState` はシーンの外に置き、Phaser非依存の純粋データ |
| 戦闘 | ターン制、シンボルエンカウント、MOTHER風、ローリングHPなし(後から追加できる構造)、敵・技はJSON |
| セーブ | JSON + `version` + マイグレーション、3スロット + オート1、電話/セーブポイントのみで保存、1ボタンで保存完了 |
| バックアップ | 任意の「バックアップコード」(圧縮+Base64の文字列、共有/コピー対応)、補助でJSONファイル、`storage.persist()` とホーム画面追加の案内 |
| ストレージ | `IStorage` は**非同期(Promise)**。`get / set / remove` |
| Tiled規約 | レイヤー: `ground` `decor_below` `decor_above` `collision` `objects`。プロパティ: `type` `id` `eventId` `spawnFlag` |
| 命名 | 小文字スネークケース、「種類_名前」。ID形式は `種類.分類.名前` |

---

## 2. ディレクトリ構造

```
src/
├─ main.ts
├─ config/        # 定数(解像度、SCALE、タイルサイズ、速度など)
├─ core/          # Game, EventBus, GameState(純粋データ), EventRunner
├─ scenes/        # BootScene, TitleScene, FieldScene, ScenicScene, BattleScene, UIScene
├─ entities/      # Entity, Player, Npc, Interactable, PartyMember
├─ systems/       # InputSystem, input/(InputSource, ActionState, KeyboardSource),
│                 # CollisionSystem, DialogueSystem, MapLoader,
│                 # PartyFollowSystem, AudioSystem, I18n
├─ ui/            # DialogueBox, MenuWindow, touchpad/(TouchPad, dpadDirection)、DebugHud
│                 # (操作盤のHTML/CSSは index.html と style.css)
├─ save/          # SaveManager, SaveData(version必須), migrations/, backupCode.ts,
│                 # storage/(IStorage, WebStorage)
└─ data/          # events/, npcs/, items/, enemies/, skills/, text/ja.json
docs/
├─ DECISIONS.md
└─ ASSETS.md
```

---

## 3. ロードマップ

1. **フェーズ1: 基本機能**
   - 320×240・`SCALE` 定数対応の画面設定
   - プレイヤーの8方向移動、壁の衝突
   - Tiled(.json)の読み込み、スクロール、レイヤー規約に沿った `MapLoader`
2. **フェーズ2: RPG要素**
   - NPC・オブジェクトの調査、`EventRunner`
   - 会話ウィンドウ(タイプライター表示、禁則処理)、`UIScene`
   - パーティ追従
   - セーブ/ロード(`IStorage`、マイグレーション、バックアップコード)
   - シンボルエンカウント + 基本の戦闘
3. **フェーズ3: ビジュアル・UI**
   - 自作ドット絵の組み込み
   - 整数倍スケーリングの調整
   - スマホ縦持ちレイアウト + HTML操作盤、音声再生制限の回避
   - `ScenicScene`(高画質・奥行きシーン)

---

## 4. AIへの指示事項

### 回答の方針
- 事実ベースで論理的に。過度な忖度・定型の挨拶は不要
- 解決策が複数ある場合は、メリット・デメリットと推奨案を示す
- 不明点・曖昧な点があれば、実装前に質問する
- **確定済みの設計を変える提案は、理由を示して確認を取ってから**行う
- 実行・ビルドしていないコードは「未検証」と明記する
- ライブラリを追加する場合は、理由と代替案を示す

### コードの方針
- ファイルごとに全文を出し、先頭に `// path: src/...` を付ける
- `strict: true` 前提。`any` 禁止
- マジックナンバーは `src/config/` に置く
- 深い継承を避け、浅い継承 + 小さなシステム/クラスに分ける
- データ(会話・アイテム・敵・イベント)はコードに直書きせず JSON に置く
- テキストは直書きせず、ID参照にする
- Phaserのバージョンに合ったAPIを使う(不確かな場合はその旨を明記)

---

## 5. 現在の依頼(毎回ここだけ差し替える)

(ここに今回の依頼を書く)
