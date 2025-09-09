# Implementation Plan: LT Document Maker

**Branch**: `001-lt-ltdocumentmaker-lt` | **Date**: 2025-09-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/Users/ishibashi/Projects/lt-doc-maker/specs/001-lt-ltdocumentmaker-lt/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## 概要
LT資料作成ツール: ライトニングトーク発表者がテキスト入力を通じて簡単に発表資料を作成できるWebアプリケーション。テンプレート、プロンプト、構造提案を提供し、5分間のプレゼンテーションに最適化されたNotion対応Markdown出力を生成。localStorageおよびPostgreSQL ストレージによる文書保存・エクスポート機能を含む。GitHub Actions + AWSで本格運用デプロイ。シンプルで使いやすいことを重視。

## 技術コンテキスト
**言語・バージョン**: TypeScript（最新版）、Next.js 15+ App Router  
**主要依存関係**: Next.js 15+、TailwindCSS（最新版）、Drizzle ORM（最新版）、Zod（最新版）、PostgreSQL  
**アーキテクチャ**: DDD（ドメイン駆動設計）概念採用、レイヤードアーキテクチャ  
**ストレージ**: AWS RDS PostgreSQL（永続化）、localStorage（クライアント側キャッシュ）  
**テスト**: フロントエンド用Jest + React Testing Library（最新版）、APIルート用Vitest（最新版）  
**対象プラットフォーム**: Webブラウザー（モダン、ES2023+）、Node.js 20+サーバー
**プロジェクトタイプ**: web - DDD構成によるフロントエンド + バックエンド  
**CI/CD**: GitHub Actions（テスト、ビルド、デプロイ自動化）  
**デプロイ**: AWS（Vercel代替でAWS Amplify または ECS + ALB）、AWS RDS PostgreSQL  
**パフォーマンス目標**: 文書生成500ms以下、ページ読み込み2秒以下、レスポンシブUI  
**制約**: 5分間コンテンツ制限、Notion markdown互換性、オフライン編集対応  
**規模・スコープ**: 個人ユーザー、個人文書作成、文書サイズ1MB以下

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: [#] (max 3 - e.g., api, cli, tests)
- Using framework directly? (no wrapper classes)
- Single data model? (no DTOs unless serialization differs)
- Avoiding patterns? (no Repository/UoW without proven need)

**Architecture**:
- EVERY feature as library? (no direct app code)
- Libraries listed: [name + purpose for each]
- CLI per library: [commands with --help/--version/--format]
- Library docs: llms.txt format planned?

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? (test MUST fail first)
- Git commits show tests before implementation?
- Order: Contract→Integration→E2E→Unit strictly followed?
- Real dependencies used? (actual DBs, not mocks)
- Integration tests for: new libraries, contract changes, shared schemas?
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included?
- Frontend logs → backend? (unified stream)
- Error context sufficient?

**Versioning**:
- Version number assigned? (MAJOR.MINOR.BUILD)
- BUILD increments on every change?
- Breaking changes handled? (parallel tests, migration plan)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application with DDD (DDD concepts + Next.js structure)
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (Infrastructure Layer)
│   ├── (pages)/           # Page Routes
│   └── globals.css
├── domain/                # Domain Layer (DDD)
│   ├── entities/          # Business Entities
│   ├── value-objects/     # Value Objects  
│   ├── repositories/      # Repository Interfaces
│   └── services/          # Domain Services
├── application/           # Application Layer (DDD)
│   ├── use-cases/         # Use Case Classes
│   ├── dtos/              # Data Transfer Objects
│   └── services/          # Application Services
├── infrastructure/        # Infrastructure Layer (DDD)
│   ├── database/          # Drizzle ORM, Database Access
│   ├── repositories/      # Repository Implementations
│   └── external/          # External API Clients
├── presentation/          # Presentation Layer (DDD)
│   ├── components/        # React Components
│   ├── hooks/             # Custom Hooks
│   └── utils/             # UI Utilities
└── shared/                # Shared Utilities
    ├── types/             # Zod Schemas & TypeScript Types
    ├── constants/         # Application Constants
    └── utils/             # Common Utilities

tests/
├── domain/                # Domain Layer Tests
├── application/           # Application Layer Tests
├── infrastructure/        # Infrastructure Layer Tests
├── presentation/          # Presentation Layer Tests
└── e2e/                   # End-to-End Tests

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

iOS/ or android/
└── [プラットフォーム固有構造]
```

**構造決定**: オプション2（Webアプリケーション） - Next.js 15+ App Router + DDD構成 + AWS デプロイによるフロントエンド + バックエンドアーキテクチャ

## フェーズ0: 概要とリサーチ
1. **上記の技術コンテキストから不明点を抽出**:
   - 各要確認事項 → リサーチタスク
   - 各依存関係 → ベストプラクティスタスク
   - 各統合 → パターンタスク

2. **リサーチエージェントを生成・送信**:
   ```
   技術コンテキストの各不明点に対して:
     タスク: "{feature context}のための{unknown}を調査"
   各技術選択に対して:
     タスク: "{domain}での{tech}のベストプラクティスを探す"
   ```

3. **結果を`research.md`で統合**、以下の形式を使用:
   - 決定: [選択されたもの]
   - 根拠: [選択理由]
   - 検討した代替案: [他に評価したもの]

**出力**: 全要確認事項が解決されたresearch.md

## フェーズ1: 設計と契約
*前提条件: research.md完成*

1. **機能仕様からエンティティを抽出** → `data-model.md`:
   - エンティティ名、フィールド、関係
   - 要件からの検証ルール
   - 該当する場合の状態遷移

2. **機能要件からAPI契約を生成**:
   - 各ユーザーアクション → エンドポイント
   - 標準的なREST/GraphQLパターンを使用
   - OpenAPI/GraphQLスキーマを`/contracts/`に出力

3. **契約から契約テストを生成**:
   - エンドポイント毎に1つのテストファイル
   - リクエスト/レスポンススキーマをアサート
   - テストは失敗する必要あり（まだ実装なし）

4. **ユーザーストーリーからテストシナリオを抽出**:
   - 各ストーリー → 統合テストシナリオ
   - クイックスタートテスト = ストーリー検証ステップ

5. **エージェントファイルを漸進的に更新** (O(1)操作):
   - AIアシスタント用に`/scripts/update-agent-context.sh [claude|gemini|copilot]`を実行
   - 存在する場合: 現在の計画から新しい技術のみ追加
   - マーカー間の手動追加を保持
   - 最近の変更を更新（直近3回保持）
   - トークン効率のため150行未満に保つ
   - リポジトリルートに出力

**出力**: data-model.md, /contracts/*, 失敗テスト, quickstart.md, エージェント固有ファイル

## フェーズ2: タスク計画アプローチ
*このセクションは/tasksコマンドが行うことを記述 - /plan中は実行しない*

**タスク生成戦略**:
- `/templates/tasks-template.md`をベースとして読み込み
- フェーズ1設計ドキュメント（契約、データモデル、クイックスタート）からタスクを生成
- 各契約 → 契約テストタスク [P]
- 各エンティティ → モデル作成タスク [P]
- 各ユーザーストーリー → 統合テストタスク
- テストを通すための実装タスク

**順序付け戦略**:
- TDD順序: 実装前にテスト
- 依存順序: モデル → サービス → UI
- 並列実行用に[P]をマーク（独立ファイル）

**推定出力**: tasks.mdに25-30個の番号付き順序タスク

**重要**: このフェーズは/tasksコマンドで実行、/planでは実行しない

## フェーズ3+: 将来の実装
*これらのフェーズは/planコマンドの範囲外*

**フェーズ3**: タスク実行 (/tasksコマンドがtasks.mdを作成)  
**フェーズ4**: 実装 (憲法原則に従ってtasks.mdを実行)  
**フェーズ5**: 検証 (テスト実行、quickstart.md実行、性能検証)

## 複雑性追跡
*憲法チェックで正当化が必要な違反がある場合のみ記入*

| 違反 | 必要な理由 | より簡素な代替案を拒否した理由 |
|------|------------|-------------------------------|
| [例: 4番目のプロジェクト] | [現在のニーズ] | [なぜ3プロジェクトでは不十分か] |
| [例: Repositoryパターン] | [特定の問題] | [なぜ直接DB アクセスでは不十分か] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [ ] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS
- [ ] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented

---
*憲法 v2.1.1 に基づく - `/memory/constitution.md` を参照*