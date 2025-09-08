# Domain Repositories

このディレクトリには、ドメインリポジトリインターフェースを配置します。

## 構造

- `LtDocumentRepository.ts` - LT資料リポジトリインターフェース
- `UserRepository.ts` - ユーザーリポジトリインターフェース
- `TemplateRepository.ts` - テンプレートリポジトリインターフェース

## 原則

- インターフェースのみを定義
- 実装はインフラストラクチャ層で行う
- ドメインのニーズに基づいてメソッドを定義