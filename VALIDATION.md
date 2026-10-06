# v1.0 検証記録

この記録はクラウド環境内のローカル検証です。GitHub への push と Pages 公開は行っていません。

- `npm ci --cache /workspace/.npm --no-audit --no-fund`: 成功。
- `npm run samples` → `npm run assets`: 4カテゴリ、5 PNG、5 WebP、JSON を生成。
- `npm test`: タグ・AND検索／フィルター／ソート・コード生成・実PNGスキャナー・不正PNG時のJSON保護を検証。
- `npm run build`: Vite 本番ビルド成功。
- Chromium: 画像一覧、複数語検索、詳細、クリップボード、Three.js／Phaserコード、ダウンロード、お気に入りの再読み込み後の保存、カテゴリ、透明画像、5種類のソート、ランダム表示を確認。ページ実行エラーなし。
- デスクトップ1440pxとモバイル390pxのスクリーンショットを確認。モバイルの横方向ページオーバーフローなし。
- 別オリジンからローカルの JSON を fetch し、PNG を crossOrigin=anonymous で読み込み、Canvas の getImageData に成功。
- 別オリジンのテストページから本番ビルドの JSON を fetch。Three.js の WebGL Plane に PNG を貼り、中心の不透明ピクセルと角の透明ピクセルを確認。Phaser の preload/create で同じ PNG をロードし Image を作成。
- 5,000件の合成メタデータに対する3語検索100回: このマシンでは平均約0.32ms/回（検索関数のみ。画像転送やDOM描画を含まない）。

## 未検証

実際の GitHub Pages から別 GitHub Pages への fetch/WebGL 利用は未検証です。`yuji5124.github.io` の応答確認は、この実行時のネットワークポリシーにより403で拒否されました。この403はPagesサイト自体の応答ではありません。必要な許可ドメインは環境設定のドラフトに保存済みです。公開後、README の手順で CORS と配信URLを確認してください。ローカルの成功は GitHub Pages の CORS 成功を保証しません。

Three.js・Phaser・ブラウザーテスト用ツールは検証用にチェックアウトの外へ導入し、アプリの依存関係には加えていません。本番アプリは Vite と素の JavaScript、画像処理は sharp のみです。
