# PIXVAULT

**2D ASSET SERVER** — 画像を探す → URL をコピー → ゲームへ貼る。

PNG を GitHub に保管し、JSON と WebP サムネイルをローカルで生成する、小さな静的 Asset Browser です。検索・カテゴリ・透明画像フィルター・並べ替え・ランダム表示・お気に入り・各種コードコピーに対応します。ログインはありません。

## なぜ無料で運用できるのか

|用途|仕組み|
|---|---|
|画像保存|GitHub リポジトリ|
|Web 公開|GitHub Pages|
|メタデータ|`public/data/assets.json`|
|検索|ブラウザ JavaScript（複数語 AND 検索）|
|サムネイル・画像解析|ローカル Node.js + sharp|
|DB / 常時バックエンド / AI API|不要|

`src/config.js` の `freeMode: true`、`aiEnabled: false` が標準です。v1 は外部 AI・SaaS・検索 API を呼びません。設定を変更しても未実装の AI 機能は有効になりません。`aiTags` は将来拡張用で通常タグと分離しています。

## セットアップ

Node.js 22 以上（推奨 24）、npm が必要です。

```bash
npm install
npm run dev
```

再現可能なインストールには `npm ci` を使います。クラウド環境でホームへの書き込みが制限される場合は `npm ci --cache /workspace/.npm` を使ってください。

## PNG の追加と更新

1. `public/assets/animals/` などへ PNG を置きます。
2. `npm run assets` を実行します。
3. 生成された PNG・WebP・JSON をまとめて commit します。

```text
public/assets/animals/cute_white_cat.png  ← 原本
public/thumbnails/animals/cute_white_cat.png.webp  ← 最大256px、縦横比保持
public/data/assets.json  ← 公開用カタログ
```

カテゴリは最上位フォルダー名です。直下の PNG は `misc` になります。サブフォルダー・日本語・空白にも対応します。シンボリックリンクはスキャンしません。画像は逐次処理してメモリー使用を抑えます（入力上限 1 億ピクセル）。壊れた PNG がある場合はエラーで終了し、JSON は更新しません。不要になった古いサムネイルは自動削除しません。

取得する情報: ID、名前、パス、カテゴリ、タグ、縦横寸法、実際の透明ピクセルの有無、形式、容量、SHA-256、登録時刻。重複ハッシュは警告し、自動削除しません。`createdAt` は初回のファイル更新時刻を採用し、その後保持します。タグはファイル名・フォルダー名の `_`、`-`、空白、CamelCase から生成し、重複を除きます。

手動の `tags`、`description`、`source`、`license`、`aiTags` などは JSON を編集してください。再生成しても同じパスのメタデータは保持されます。名前・寸法など原本由来の項目は更新されます。パス変更は新しい ID として扱います。自動タグも保持されるため、不要タグは手動で取り除いてください。

サンプル5点はこのプロジェクト用にプログラムで生成した図形です。`npm run samples` で再生成できます（既存ファイルは上書きしません）。サンプル PNG と派生 WebP は CC0-1.0 として利用できます。自分で追加する画像の利用許諾は各自確認してください。

## 設定

`src/config.js`:

- `baseUrl`: COPY URL / HTML / Three.js / Phaser の公開先。標準は `https://Yuji5124.github.io/pixvault/`。
- `largeFileBytes`: LARGE FILE の閾値（標準 5 MiB）。
- `pageSize`: 一度に表示するカード数（標準60）。追加表示で大量画像の DOM を抑えます。

Vite のサイトパスは `vite.config.js` で `/pixvault/` に設定しています。別名リポジトリ・独自ドメインでは `PIXVAULT_PATH=/ npm run build` などで変更し、`baseUrl` も合わせてください。相対 COPY PATH は `/assets/...`（保管庫内パス）です。公開プロジェクトの `/pixvault/` を省略しているため、他サイトでそのまま使わず COPY URL を使ってください。

お気に入りはそのブラウザの localStorage に保存します。ストレージが使えない場合はセッション内のみ保存します。`/` キーで検索、Escape で詳細を閉じます。クリップボードが利用できない場合は詳細内の選択済みコードを手動コピーできます。

## 検証・ビルド

```bash
npm test
npm run assets
npm run build
npm run preview
```

テストは実 PNG の解析・透明判定・WebP生成・重複検出・メタデータ保持、検索とコード生成を確認します。ビルド時に画像解析は実行しません。画像を追加した場合は先に `npm run assets` が必要です。

## GitHub Pages 公開

1. このリポジトリを GitHub の `main` に push します。
2. Settings → Pages → Build and deployment → Source を **GitHub Actions** にします。
3. Actions の **Deploy PIXVAULT** を実行するか、main に push します。
4. 成功後に `https://Yuji5124.github.io/pixvault/` と `/data/assets.json` を確認します。

ワークフローは main への push または手動実行のみです。`npm ci` → テスト → ビルド → Pages 配信を行い、Actions で画像解析や定期処理はしません。無料 Pages を使う場合、個人の public リポジトリが基本です。Pages は画像・JSON も公開するため秘密情報は保存しないでください。

## 他プロジェクトで使う

```js
const PIXVAULT = 'https://Yuji5124.github.io/pixvault/';
const response = await fetch(PIXVAULT + 'data/assets.json');
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const assets = await response.json();
const trees = assets.filter(asset => asset.tags.includes('tree'));
const url = new URL(trees[0].file, PIXVAULT).href;
```

HTML:

```html
<img src="https://Yuji5124.github.io/pixvault/assets/animals/cute_white_cat.png" alt="cat">
```

Three.js（THREE と scene を準備した後）:

```js
const texture = new THREE.TextureLoader().load(
  'https://Yuji5124.github.io/pixvault/assets/animals/cute_white_cat.png'
);
texture.colorSpace = THREE.SRGBColorSpace;
const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));
```

詳細の COPY THREE.JS は元画像の縦横比を反映し、COPY SPRITE も用意しています。

Phaser の Scene:

```js
preload() {
  this.load.image('cat', 'https://Yuji5124.github.io/pixvault/assets/animals/cute_white_cat.png');
}
create() {
  this.add.image(400, 300, 'cat');
}
```

## CORS・キャッシュ

Pages のレスポンスヘッダーは本アプリでは設定できません。公開後、別オリジンから JSON の fetch と、`crossOrigin = 'anonymous'` を設定した PNG のロードを確認してください。通常の img 表示だけでは WebGL / Canvas 用 CORS の検証にはなりません。公開状態・応答ヘッダーが不明なまま利用可能と判断しないでください。公開後の確認例:

```bash
curl -I -H 'Origin: https://example.github.io' https://Yuji5124.github.io/pixvault/data/assets.json
curl -I -H 'Origin: https://example.github.io' https://Yuji5124.github.io/pixvault/assets/animals/cute_white_cat.png
```

`Access-Control-Allow-Origin: *` など対象オリジンを許可する応答が必要です。ホストが許可しない場合、消費側の public フォルダーへ必要な PNG と JSON をコピーして同一オリジンで配信する方法があります。

一覧は WebP を遅延読み込みし、安定したファイルパスで通常のブラウザキャッシュを使います。差し替え直後は Pages のキャッシュ更新を待つ必要があります。

## 容量・無料運用の注意

PIXVAULT v1.0 は GitHub の無料利用範囲を前提とした個人向け構成です。画像数・容量・トラフィック・Actions 利用量が非常に大きくなった場合は運用方法の見直しが必要になる可能性があります。

まず不要な元画像を削減し、画像解像度や圧縮を見直してください。不要画像を大量 commit しない、大容量ファイルを避ける、同じ画像の入れ替えを繰り返さないことが大切です。Git 履歴には削除前の画像も残るため、現在のフォルダー容量以上にリポジトリが肥大化します。通常 Git を使用し、Git LFS は必須にしていません。GitHub のファイルサイズ・Pages サイト容量・帯域・Actions の現行上限は公式ドキュメントで確認してください。

## 拡張方針

UI、検索、コード生成、画像スキャン、タグ生成を分離しています。追加フォーマット・ローカル AI・類似検索・登録 UI は将来の拡張であり、v1 は実装しません。JSON の追加プロパティを保持するため、license や source などを段階的に追加できます。3D や音声は別プロジェクトとして扱います。
