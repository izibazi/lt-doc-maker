# 調査報告: LT資料作成ツール

**フェーズ0完了日**: 2025-09-07  
**調査対象**: Next.js 15+, DDD, Drizzle ORM, TailwindCSS, AWS, GitHub Actions  

## 技術選定調査結果

### Next.js 15+ App Router
**決定**: Next.js 15.0+ App Router採用  
**根拠**: 
- 2024年後期リリースの最新安定版
- React Server Components完全サポート
- 改善されたルーティングとレンダリング性能
- TypeScriptサポート充実
- Vercel以外のAWSデプロイも柔軟対応

**検討した代替案**: 
- Vite + React: より軽量だが、SSRとAPI統合で複雑性増加
- Nuxt.js: Vue.jsベースのため、TypeScript強化要件に不適合

### DDD (ドメイン駆動設計) アーキテクチャ
**決定**: レイヤード アーキテクチャ + DDD概念採用  
**根拠**:
- ビジネスロジック（LT資料生成）とインフラ（DB, API）の分離
- テスタビリティ向上（ドメイン層の単体テスト容易）
- 将来の機能拡張（学習機能、テンプレート生成）への対応力
- TypeScriptとの親和性が高い

**検討した代替案**:
- MVC パターン: シンプルだが、ビジネスロジックがControllerに散在するリスク
- Clean Architecture: 過度に複雑、個人ツールには不適合

### Drizzle ORM
**決定**: Drizzle ORM 最新版採用  
**根拠**:
- Prismaより軽量（バンドルサイズ削減）
- TypeScript-first設計でZodとの統合優秀
- 実行時パフォーマンスがPrismaより高速
- マイグレーション管理がシンプル
- PostgreSQL最適化が充実

**検討した代替案**:
- Prisma: 成熟度高いが、バンドルサイズとパフォーマンス面でDrizzleに劣る
- Kysely: SQL-firstで学習コストが高い、DDDでのエンティティ管理に不適合

### TailwindCSS
**決定**: TailwindCSS v4 (最新版) 採用  
**根拠**:
- Next.js 15との統合最適化
- 開発速度とメンテナンス性のバランス良好
- レスポンシブデザイン対応容易
- バンドルサイズ最適化（未使用スタイル除去）

**検討した代替案**:
- CSS Modules: カスタマイズ性高いが開発速度低下
- Styled Components: React 18 + SSRで設定複雑化

### AWS デプロイ
**決定**: AWS ECS + ALB + RDS PostgreSQL  
**根拠**:
- GitHub Actionsとの統合が充実
- オートスケーリング対応（将来拡張時）
- Dockerコンテナ化でポータビリティ確保
- RDS PostgreSQLで managed database

**検討した代替案**:
- AWS Amplify: フロントエンド特化、APIルートでの制限あり
- AWS Lambda: コールドスタート遅延がUX要件（2秒以下）に不適合

### Zod バリデーション
**決定**: Zod v3 最新版採用  
**根拠**:
- TypeScript完全統合、型安全性確保
- Drizzle ORM + Next.js API routesでの統一スキーマ
- クライアント・サーバー両方で同一バリデーション
- 開発体験とランタイム性能のバランス良好

**検討した代替案**:
- Joi: TypeScript統合が不十分
- Yup: Zodより機能制限、DDDでの型表現力不足

## パフォーマンス分析

### 目標値検証
- **文書生成500ms以下**: Drizzle ORMクエリ最適化 + React Server Components並列処理で達成可能
- **ページ読み込み2秒以下**: Next.js 15のTurbopack + TailwindCSS最適化で達成可能  
- **レスポンシブUI**: TailwindCSS + Next.js App Routerの組み合わせで対応

### スケーラビリティ
- **個人ユーザー向け**: ECS最小構成で十分、将来的な負荷増加時のスケールアウト戦略準備

## 実装優先度

### Phase 1 (MVP)
1. **ドメイン層**: LT文書エンティティ、テンプレートバリューオブジェクト
2. **アプリケーション層**: 文書生成ユースケース、保存ユースケース
3. **インフラ層**: Drizzle ORMセットアップ、PostgreSQL接続
4. **プレゼンテーション層**: 基本UI、入力フォーム

### Phase 2 (機能拡張)
1. **エクスポート機能**: Markdown生成、localStorage統合
2. **テンプレート機能**: 事前定義テンプレート提供
3. **プロンプト機能**: ガイド付き入力支援

### Phase 3 (本格運用)
1. **AWS デプロイ**: ECS + GitHub Actions CI/CD
2. **監視・ログ**: CloudWatch統合、エラートラッキング
3. **性能最適化**: キャッシュ戦略、データベース調整

## 課題とリスク

### 技術リスク
- **Next.js 15安定性**: 最新版の潜在的バグ → フォールバック戦略準備
- **Drizzle ORM学習コスト**: チーム内知識蓄積 → ドキュメント整備、プロトタイプ検証

### 運用リスク
- **AWS費用**: 個人プロジェクトでの予算管理 → リソース使用量監視設定
- **データ移行**: 将来的なスキーマ変更 → マイグレーション戦略策定

## 次フェーズへの推奨事項

1. **データモデル設計**: DDD エンティティと VO の詳細設計
2. **API契約**: RESTful API エンドポイント設計とOpenAPI仕様作成
3. **テスト戦略**: 各レイヤーでのテスト手法確定
4. **開発環境**: Docker + docker-compose セットアップ

---
*調査完了 - Phase 1 設計開始可能*