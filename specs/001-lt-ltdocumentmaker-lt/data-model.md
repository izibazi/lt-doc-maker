# データモデル設計: LT資料作成ツール

**作成日**: 2025-09-07  
**DDD レイヤー**: Domain Layer エンティティとバリューオブジェクト  

## ドメインモデル概要

LT資料作成ツールのコアドメインは「Lightning Talk用資料の効率的生成」です。
主要なドメイン概念を以下のエンティティとバリューオブジェクトで表現します。

## エンティティ (Entities)

### 1. LtDocument（LT文書）
**集約ルート**  
ライトニングトーク用の文書を表すメインエンティティ

```typescript
// src/domain/entities/LtDocument.ts
interface LtDocument {
  id: DocumentId;                    // エンティティID
  title: DocumentTitle;              // 文書タイトル
  content: DocumentContent;          // 文書コンテンツ
  template: Template;                // 使用テンプレート
  metadata: DocumentMetadata;        // メタデータ
  status: DocumentStatus;            // 文書状態
  createdAt: Date;
  updatedAt: Date;
  
  // ドメインメソッド
  generateMarkdown(): MarkdownOutput;
  updateContent(content: DocumentContent): void;
  applyTemplate(template: Template): void;
  validateForExport(): ValidationResult;
}
```

**状態遷移**:
- Draft → InProgress → Completed → Exported

**ビジネスルール**:
- 文書コンテンツは5分間の発表時間に収まる必要がある
- Markdownエクスポート時はNotion互換性を保つ
- テンプレート適用時は既存コンテンツとの整合性チェック

### 2. User（ユーザー）
**集約ルート**  
LT資料作成者を表すエンティティ

```typescript
// src/domain/entities/User.ts
interface User {
  id: UserId;                        // ユーザーID
  profile: UserProfile;              // プロフィール情報
  preferences: UserPreferences;      // ユーザー設定
  documents: DocumentId[];           // 所有文書一覧
  createdAt: Date;
  
  // ドメインメソッド
  createDocument(template: Template): LtDocument;
  getDocuments(): LtDocument[];
  updatePreferences(prefs: UserPreferences): void;
}
```

## バリューオブジェクト (Value Objects)

### 1. DocumentId
```typescript
interface DocumentId {
  value: string;  // UUID v4
}
```

### 2. DocumentTitle
```typescript
interface DocumentTitle {
  value: string;
  
  // バリデーション: 1-100文字、特殊文字制限
  validate(): boolean;
}
```

### 3. DocumentContent
```typescript
interface DocumentContent {
  introduction: ContentSection;      // 導入
  mainPoints: ContentSection[];     // メインポイント (最大3個)
  conclusion: ContentSection;       // まとめ
  
  // 5分間制限チェック
  estimateDuration(): Duration;
  isWithinTimeLimit(): boolean;
}

interface ContentSection {
  heading: string;
  body: string;
  bulletPoints: string[];
}
```

### 4. Template
```typescript
interface Template {
  id: TemplateId;
  name: TemplateName;
  structure: TemplateStructure;
  prompts: Prompt[];
  
  // テンプレート適用
  applyTo(content: DocumentContent): DocumentContent;
}

interface TemplateStructure {
  sections: SectionDefinition[];
  maxSections: number;
  timeConstraints: TimeConstraints;
}

interface Prompt {
  section: string;
  question: string;
  placeholder: string;
  required: boolean;
}
```

### 5. DocumentMetadata
```typescript
interface DocumentMetadata {
  estimatedDuration: Duration;      // 推定発表時間
  wordCount: number;                // 文字数
  lastExported: Date | null;        // 最終エクスポート日時
  exportCount: number;              // エクスポート回数
  tags: Tag[];                      // タグ
}
```

### 6. DocumentStatus
```typescript
enum DocumentStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  EXPORTED = 'exported'
}
```

### 7. MarkdownOutput
```typescript
interface MarkdownOutput {
  content: string;                  // Notion互換Markdown
  frontmatter: MarkdownFrontmatter; // メタデータ
  
  // Notion互換性チェック
  isNotionCompatible(): boolean;
  getNotionBlocks(): NotionBlock[];
}

interface MarkdownFrontmatter {
  title: string;
  created: string;
  tags: string[];
  duration: string;
}
```

## データベーススキーマ (Drizzle ORM)

### テーブル定義
```typescript
// src/infrastructure/database/schema.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile: jsonb('profile').$type<UserProfile>().notNull(),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const ltDocuments = pgTable('lt_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  content: jsonb('content').$type<DocumentContent>().notNull(),
  template: jsonb('template').$type<Template>().notNull(),
  metadata: jsonb('metadata').$type<DocumentMetadata>().notNull(),
  status: varchar('status', { length: 20 }).$type<DocumentStatus>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 50 }).notNull(),
  structure: jsonb('structure').$type<TemplateStructure>().notNull(),
  prompts: jsonb('prompts').$type<Prompt[]>().notNull(),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### リレーション定義
```typescript
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(ltDocuments),
}));

export const ltDocumentsRelations = relations(ltDocuments, ({ one }) => ({
  user: one(users, {
    fields: [ltDocuments.userId],
    references: [users.id],
  }),
}));
```

## Zod バリデーションスキーマ

### ドメインオブジェクト検証
```typescript
// src/shared/types/validation.ts
import { z } from 'zod';

export const DocumentTitleSchema = z.object({
  value: z.string().min(1).max(100).regex(/^[^<>\"']+$/),
});

export const ContentSectionSchema = z.object({
  heading: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  bulletPoints: z.array(z.string().max(500)).max(10),
});

export const DocumentContentSchema = z.object({
  introduction: ContentSectionSchema,
  mainPoints: z.array(ContentSectionSchema).min(1).max(3),
  conclusion: ContentSectionSchema,
});

export const LtDocumentSchema = z.object({
  id: z.string().uuid(),
  title: DocumentTitleSchema,
  content: DocumentContentSchema,
  template: TemplateSchema,
  metadata: DocumentMetadataSchema,
  status: z.nativeEnum(DocumentStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

## ドメインサービス

### 1. DocumentGenerationService
```typescript
// src/domain/services/DocumentGenerationService.ts
interface DocumentGenerationService {
  // テンプレート適用とコンテンツ生成
  generateFromTemplate(
    template: Template, 
    userInput: UserInput
  ): Promise<LtDocument>;
  
  // 5分間制限チェック
  validateDuration(content: DocumentContent): ValidationResult;
  
  // Notion互換Markdown生成
  generateMarkdown(document: LtDocument): MarkdownOutput;
}
```

### 2. TemplateService
```typescript
// src/domain/services/TemplateService.ts
interface TemplateService {
  // 利用可能テンプレート取得
  getAvailableTemplates(): Template[];
  
  // テンプレート推奨
  recommendTemplate(userPreferences: UserPreferences): Template;
  
  // カスタムテンプレート作成
  createCustomTemplate(structure: TemplateStructure): Template;
}
```

## リポジトリインターフェース

### ドメイン層でのリポジトリ契約
```typescript
// src/domain/repositories/DocumentRepository.ts
interface DocumentRepository {
  save(document: LtDocument): Promise<void>;
  findById(id: DocumentId): Promise<LtDocument | null>;
  findByUserId(userId: UserId): Promise<LtDocument[]>;
  delete(id: DocumentId): Promise<void>;
}

// src/domain/repositories/UserRepository.ts
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: UserId): Promise<User | null>;
}

// src/domain/repositories/TemplateRepository.ts
interface TemplateRepository {
  findAll(): Promise<Template[]>;
  findById(id: TemplateId): Promise<Template | null>;
  findDefaults(): Promise<Template[]>;
}
```

## ドメインイベント

### イベント定義
```typescript
// src/domain/events/DocumentEvents.ts
interface DocumentCreated {
  type: 'DocumentCreated';
  documentId: DocumentId;
  userId: UserId;
  timestamp: Date;
}

interface DocumentExported {
  type: 'DocumentExported';
  documentId: DocumentId;
  format: 'markdown';
  timestamp: Date;
}

interface TemplateApplied {
  type: 'TemplateApplied';
  documentId: DocumentId;
  templateId: TemplateId;
  timestamp: Date;
}
```

---

**次のステップ**: 
1. API契約設計 (contracts/)
2. アプリケーション層ユースケース設計
3. インフラ層実装（Drizzle ORM）
4. プレゼンテーション層コンポーネント設計