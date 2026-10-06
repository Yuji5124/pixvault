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

カタログJSONは内容のハッシュ付きURLで取得し、再利用時にもHTTPで更新確認します。画像一覧は WebP を遅延読み込みし、安定したファイルパスで通常のブラウザキャッシュを使います。差し替え直後は Pages のキャッシュ更新を待つ必要があります。

## 容量・無料運用の注意

PIXVAULT v1.0 は GitHub の無料利用範囲を前提とした個人向け構成です。画像数・容量・トラフィック・Actions 利用量が非常に大きくなった場合は運用方法の見直しが必要になる可能性があります。

まず不要な元画像を削減し、画像解像度や圧縮を見直してください。不要画像を大量 commit しない、大容量ファイルを避ける、同じ画像の入れ替えを繰り返さないことが大切です。Git 履歴には削除前の画像も残るため、現在のフォルダー容量以上にリポジトリが肥大化します。通常 Git を使用し、Git LFS は必須にしていません。GitHub のファイルサイズ・Pages サイト容量・帯域・Actions の現行上限は公式ドキュメントで確認してください。

## 拡張方針

UI、検索、コード生成、画像スキャン、タグ生成を分離しています。追加フォーマット・ローカル AI・類似検索・登録 UI は将来の拡張であり、v1 は実装しません。JSON の追加プロパティを保持するため、license や source などを段階的に追加できます。3D や音声は別プロジェクトとして扱います。

## naka-asobi 向けの画像セット（OpenMoji カラー）

4〜7歳向けの遊び、図鑑、発見カード、景品に使えるよう、OpenMoji 17.0.0 のカラー PNG を **1,000点**取り込みました。写真や質感付きの絵ではなく、輪郭線とフラットな色を使った同じ画風のアイコン素材です。元 PNG は618×618、透明背景です。元のオリジナルサンプル5点は別セットとして残しています。

|カテゴリ|点数|
|---|---:|
|動物|143|
|自然・植物|86|
|食べ物|113|
|生活用品・道具|339|
|乗り物|72|
|建物・場所|58|
|表情・からだ|123|
|気持ち・お祝い|66|

一覧は「動物 · OpenMoji カラー」のように **カテゴリ＋画風／素材セット**でまとめます。SET でセットを絞り込み、GROUP でグループ表示を切り替えられます。カードと詳細には配布元の英語タイトルを表示します。日本語でのカテゴリ検索にも対応しますが、個々のタイトルを日本語へ翻訳したわけではありません。

```text
public/assets/animals/openmoji-color/cat-1f408.png
public/thumbnails/animals/openmoji-color/cat-1f408.png.webp
```

再取得・更新:

```bash
npm run import:openmoji
npm run assets
npm test
python3 -m unittest discover -s tests -p '*_test.py'
npm run build
```

Python 3 と curl が必要です。公式リリースのアーカイブを1回だけ取得し、GitHubが公開する SHA-256 と照合してから取り込みます。アーカイブは `.asset-cache/` にキャッシュし、Gitには含めません。既存画像が異なる内容なら上書きせず停止します。再実行しても同じパスと ID になり、手動タグ・説明は保持します。追加ダウンロードや API キーは不要です。配布元のタイトルとタグから、武器・酒・喫煙などの題材と肌色違いを選定対象から除きます。この題材フィルターは年齢適合性を保証する自動判定ではありません。採用する画像は各遊びの内容に合わせて選んでください。

取得記録は `public/data/imports/openmoji-17.0.0.json` に保存しています。版、コミット、アーカイブのハッシュ、採用した各画像のパス／ハッシュ、カテゴリ別件数を確認できます。`assets.json` の `title`、`collection`、`collectionTitle`、`style` で他アプリ側もグループ化できます。

### 利用時のクレジット

OpenMoji は **CC BY-SA 4.0** です。出典・作者・ライセンスを各画像に記録し、詳細の **COPY CREDIT** でコピーできます。利用先の naka-asobi にも見えるクレジット画面や README など、適切な場所に表示してください。例:

> Icons by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0. https://openmoji.org/ / https://creativecommons.org/licenses/by-sa/4.0/

PNGを改変して配布する場合は、変更内容を示し、その改変画像も同じライセンスで提供します。この条件をアプリ全体のソースコードのライセンスと混同しないでください。`license` と `licenseUrl`、`author`、`source` は消費側へ引き継いでください。WebP サムネイルにも同じ素材ライセンスが適用されます。ライセンス本文は `public/licenses/OpenMoji-CC-BY-SA-4.0.txt` で配信します。今回 naka-asobi のコードやUI自体は変更していません。

## 桃太郎動画用・出典表示不要の5,000 PNG

**CC0-1.0 のPNGを5,000枚追加**しました。既存の教育用・サンプル素材と合わせた全体は6,005枚です。今回の5,000枚には出典表示が必要なOpenMojiを含めません。

最初は PROJECT「桃太郎動画用」、出典表示不要（CC0）、SORT BY「高解像度順」で表示します。TYPEで人物／身体パーツ／アニメ用ポーズ／動物／背景／背景パーツ／小道具／演出／地形を選べます。RESOLUTIONでは元画像の長辺256・512・1024・2048px以上に絞れます。

これは**桃太郎専用の日本アニメ風キャラクターを5,000枚揃えたものではありません**。CC0のカートゥーン／ゲーム調の背景・人物ポーズ・パーツ・小道具を動画に組み合わせて使う構成素材庫です。和装の桃太郎、統一された犬・猿・キジ・鬼の専用キャラクターセットは未確保です。イラストの画風・衣装はセットごとに異なるので、GROUPとSETで同じパックを選んでください。人物は一般的な冒険者・キャラクターで、すべてが物語の登場人物の代用になるわけではありません。

|種別|枚数|
|---|---:|
|背景|34|
|背景パーツ|1,120|
|人物・キャラクター|28|
|身体パーツ|482|
|アニメ用ポーズ|483|
|動物|296|
|小道具|594|
|演出・エフェクト|324|
|地形・組み立てパーツ|1,639|

|元画像の長辺|枚数|
|---|---:|
|1024px以上|138|
|512〜1023px|345|
|256〜511px|1,332|
|256px未満|3,185|

高解像度順は**元の幅×高さ（画素数）**で並べます。長辺のフィルターとは指標が異なります。グループ表示でも大きな画像を含むグループが先頭になります。人工的な拡大やコピー、左右反転だけで枚数・画質を増やしていません。解像度は画質の目安で、絵の細かさや美術品質の保証ではありません。全画面の1080p背景として使える画像ばかりではありません。小さな画像は小道具・パーツとして使ってください。

### 保存先と名前

```text
public/assets/backgrounds/momotaro/kenney-<pack>/03-1k_background_<pack>_<original>_1024x1024_<id>.png
public/assets/characters/momotaro/kenney-<pack>/05-256_animation-frame_<pack>_<pose>_192x256_<id>.png
public/assets/props/momotaro/kenney-<pack>/...
public/assets/effects/momotaro/kenney-<pack>/...
public/assets/animals/momotaro/kenney-<pack>/...
public/assets/tiles/momotaro/kenney-<pack>/...
```

名前は「解像度帯 → 種別 → 素材セット → 元の名前 → 実寸 → 固有ID」です。`01-4k`、`02-2k`、`03-1k`、`04-512`、`05-256`、`06-small`の順に分類しますが、未取得の帯には画像を作りません。JSONに `project`、`kind`、`sourceWidth/Height`、`upscaled: false`、`storyRoles`、`animationGroup`、`frameIndex`を保持します。ポーズの連番は動画ではないので、アニメーションは利用先でフレームの順序・速度を設定してください。`storyRoles`は元のファイル名から判断できた題材のみで、桃太郎関連をすべて画像認識したタグではありません。

### 再取得と出典確認

```bash
npm run import:momotaro
npm run assets
npm test
python3 -m unittest discover -s tests -p '*_test.py'
npm run build
```

作者はKenneyです。PNGは公開ミラー `shorepine/kenney` の固定コミットから取得し、各ファイルをそのコミットのGit blob hashと照合。対応するパックごとのCC0・出典表示任意の原文を `eturner58/game-assets` の固定コミットにあるカタログで確認し、`public/licenses/kenney/`に保存します。Kenney公式サイトから直接ダウンロードした素材と偽っていません。必要なpackのライセンスが確認できない場合は取得対象から外します。

取得記録は `public/data/imports/momotaro-kenney.json`。素材・ライセンスの参照コミット、アーカイブとライセンスメタデータのSHA-256、全ファイルのSHA-256/Git blob、種別と解像度帯の実数を記録しています。同一バイト109件とHD/通常版などの解像度違い395件を除外してから5,000枚を選定しました。取り込みは削除・自動同期ではなく追加型です。

CC0素材では動画や説明欄への出典表示は必須ではありません。既存のOpenMojiはCC BY-SA 4.0なので、この条件とは別です。「出典表示不要（CC0）」フィルターを有効にして選んでください。既存のサンプルやユーザーが追加する画像にも、実際のライセンス情報を残すことをおすすめします。
