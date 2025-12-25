# 项目结构规范

> Next.js App Router 项目的最佳实践指南

## 📋 目录

- [设计原则](#设计原则)
- [当前项目结构](#当前项目结构)
- [目录组织规范](#目录组织规范)
- [导入路径规范](#导入路径规范)
- [命名约定](#命名约定)
- [最佳实践](#最佳实践)
- [扩展指南](#扩展指南)

---

## 🎯 设计原则

### 1. 按功能分组 > 按类型分组

**推荐：**
```
features/
  user-profile/
    components/
    hooks/
    types.ts
```

**不推荐：**
```
components/
  all-components.tsx
hooks/
  all-hooks.ts
types/
  all-types.ts
```

### 2. 就近原则（Colocation）

相关代码应该放在一起，减少跨目录依赖。

### 3. 模块化原则

- **单一职责**：每个模块只负责一个功能域
- **高内聚**：相关代码放在一起
- **低耦合**：模块间通过明确的接口通信

### 4. 明确的导出边界

使用 `index.ts` 控制对外暴露的接口，私有组件不导出。

---

## 📁 当前项目结构

```
app/
├── api/                           # API 路由
│   ├── batch-chat/
│   ├── chat/
│   ├── settings/
│   └── test-cases/
│
├── playground/                    # Playground 功能页面
│   ├── features/                 # 功能模块
│   │   ├── chat-panel/          # Chat 功能模块
│   │   │   ├── components/      # Chat 私有组件
│   │   │   │   ├── chat-header.tsx
│   │   │   │   ├── chat-input.tsx
│   │   │   │   ├── message-item.tsx
│   │   │   │   ├── message-action-buttons.tsx
│   │   │   │   ├── message-edit-form.tsx
│   │   │   │   └── history-separator.tsx
│   │   │   ├── chat-panel.tsx   # Chat 主组件
│   │   │   └── index.ts         # 导出文件
│   │   │
│   │   └── batch-panel/         # Batch 功能模块
│   │       ├── batch-panel.tsx  # Batch 主组件
│   │       └── index.ts         # 导出文件
│   │
│   └── page.tsx                 # Playground 页面入口
│
├── shared/                       # 跨模块共享资源
│   ├── components/              # 共享组件
│   │   ├── custom-model-settings.tsx
│   │   └── index.ts
│   ├── model-data.ts           # 共享数据
│   └── index.ts                # 统一导出
│
├── components/                   # 全局基础组件
│   ├── ui/                      # shadcn/ui 组件
│   └── ai-elements/             # AI 相关组件
│
├── sign-in/                     # 登录页面
├── sign-up/                     # 注册页面
├── layout.tsx                   # 根布局
└── page.tsx                     # 首页
```

---

## 🗂️ 目录组织规范

### 页面级目录结构

每个页面（路由）应该包含以下结构：

```
app/[page-name]/
├── features/              # 功能模块（必需，包含核心业务逻辑）
│   └── [feature-name]/
│       ├── components/    # 功能私有组件
│       ├── hooks/        # 功能专属 hooks（可选）
│       ├── lib/          # 功能工具函数（可选）
│       ├── types.ts      # 功能类型定义（可选）
│       ├── [feature].tsx # 主组件
│       └── index.ts      # 导出文件
│
├── components/           # 页面级共享组件（可选）
├── hooks/               # 页面级 hooks（可选）
├── lib/                 # 页面级工具函数（可选）
└── page.tsx            # 页面入口（必需）
```

### 功能模块（Feature）结构

```
features/[feature-name]/
├── components/              # 私有子组件
│   ├── component-a.tsx
│   ├── component-b.tsx
│   └── component-c.tsx
│
├── hooks/                  # 功能专属 hooks
│   └── use-[feature].ts
│
├── lib/                    # 工具函数
│   └── helpers.ts
│
├── types.ts               # 类型定义
├── [feature-name].tsx     # 主组件
└── index.ts               # 导出接口
```

### 共享资源目录

```
app/shared/
├── components/            # 跨页面共享组件
│   ├── component-a.tsx
│   └── index.ts
│
├── hooks/                # 跨页面共享 hooks
│   ├── use-shared-hook.ts
│   └── index.ts
│
├── lib/                  # 工具函数
│   ├── utils.ts
│   └── index.ts
│
├── types/                # 全局类型定义
│   └── index.ts
│
└── index.ts             # 统一导出
```

---

## 🔗 导入路径规范

### 路径别名配置

在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### 导入规范

#### 1. 从全局组件库导入

```typescript
// shadcn/ui 组件
import { Button } from "@/components/ui/button"

// AI 相关全局组件
import { Conversation } from "@/components/ai-elements/conversation"
```

#### 2. 从共享资源导入

```typescript
// 从 app/shared 导入
import { models, CustomModelSettings } from "@/app/shared"
```

#### 3. 页面内功能模块导入

```typescript
// 在 page.tsx 中导入功能模块
import { ChatPanel } from "./features/chat-panel"
import { BatchPanel } from "./features/batch-panel"
```

#### 4. 功能模块内部导入

```typescript
// 在功能主组件中导入子组件（使用相对路径）
import { ChatHeader } from "./components/chat-header"
import { ChatInput } from "./components/chat-input"

// 导入共享资源（使用路径别名）
import { CustomModelConfig } from "@/app/shared"
```

### index.ts 导出规范

#### 功能模块导出

```typescript
// features/chat-panel/index.ts
export { ChatPanel } from './chat-panel'
export type { ChatPanelProps } from './chat-panel'

// 不导出私有组件
// ❌ export { ChatHeader } from './components/chat-header'
```

#### 共享资源导出

```typescript
// app/shared/index.ts
export { models } from './model-data'
export * from './components'

// app/shared/components/index.ts
export { CustomModelSettings } from './custom-model-settings'
export type { CustomModelConfig } from './custom-model-settings'
```

---

## 📝 命名约定

### 文件命名

| 类型 | 命名规则 | 示例 |
|------|---------|------|
| 组件文件 | kebab-case | `chat-header.tsx` |
| 页面文件 | `page.tsx` | `page.tsx` |
| 布局文件 | `layout.tsx` | `layout.tsx` |
| API 路由 | `route.ts` | `route.ts` |
| 工具函数 | kebab-case | `format-date.ts` |
| Hooks | `use-*.ts` | `use-chat.ts` |
| 类型文件 | kebab-case | `types.ts` |
| 导出文件 | `index.ts` | `index.ts` |

### 组件命名

```typescript
// ✅ 使用 PascalCase
export function ChatPanel() {}
export const MessageItem = () => {}

// ❌ 避免使用 camelCase
export function chatPanel() {}
```

### 类型命名

```typescript
// ✅ 接口和类型使用 PascalCase
export interface ChatPanelProps {
  model: string
}

export type CustomModelConfig = {
  baseUrl?: string
}
```

---

## ✨ 最佳实践

### 1. 组件拆分原则

**何时拆分组件：**
- 组件超过 300 行代码
- 有明确的功能边界
- 可能被复用
- 提高可测试性

**chat-panel 拆分示例：**

```typescript
// ❌ 拆分前：一个 467 行的大文件
chat-panel.tsx (467 行)

// ✅ 拆分后：清晰的模块结构
chat-panel/
  ├── components/
  │   ├── chat-header.tsx      (26 行)
  │   ├── chat-input.tsx       (138 行)
  │   ├── message-item.tsx     (62 行)
  │   ├── message-action-buttons.tsx (52 行)
  │   ├── message-edit-form.tsx (38 行)
  │   └── history-separator.tsx (17 行)
  ├── chat-panel.tsx           (200 行)
  └── index.ts                 (2 行)
```

### 2. 避免过度工程

**何时不需要拆分：**
- 简单的单一功能组件（< 100 行）
- 不会被复用的一次性组件
- 没有独立业务逻辑的纯展示组件

### 3. 状态管理层级

```typescript
// 页面级状态
app/playground/page.tsx
  ├── systemPrompt (全局状态)
  ├── model (全局状态)
  └── temperature (全局状态)

// 功能模块状态
features/chat-panel/chat-panel.tsx
  ├── messages (模块内部状态)
  ├── editingMessageId (模块内部状态)
  └── modelSelectorOpen (模块内部状态)

// 组件级状态
components/message-item.tsx
  └── isHovered (组件内部状态)
```

### 4. Props 传递原则

**避免 Props 透传（Prop Drilling）：**

```typescript
// ❌ 不推荐：多层传递
<ChatPanel
  onCopy={onCopy}
  onEdit={onEdit}
  onRetry={onRetry}
>
  <MessageItem onCopy={onCopy} onEdit={onEdit} onRetry={onRetry}>
    <MessageActions onCopy={onCopy} onEdit={onEdit} />
  </MessageItem>
</ChatPanel>

// ✅ 推荐：在需要的层级组合回调
<ChatPanel>
  <MessageItem
    onCopy={() => handleCopy(text)}
    onEdit={() => handleEdit(id, text)}
  />
</ChatPanel>
```

### 5. 类型安全

```typescript
// ✅ 导出接口供外部使用
export interface ChatPanelProps {
  systemPrompt: string
  model: string
  onModelChange?: (model: string) => void
}

// ✅ 使用类型推断减少重复
type MessageHandler = (messageId: string, text: string) => void
```

---

## 🚀 扩展指南

### 添加新页面

```bash
# 1. 创建页面目录
mkdir -p app/new-page/features

# 2. 创建页面文件
touch app/new-page/page.tsx

# 3. 添加功能模块
mkdir -p app/new-page/features/feature-name
touch app/new-page/features/feature-name/index.ts
touch app/new-page/features/feature-name/feature-name.tsx
```

### 添加新功能模块

```bash
# 在现有页面下添加功能
mkdir -p app/playground/features/new-feature/components
touch app/playground/features/new-feature/new-feature.tsx
touch app/playground/features/new-feature/index.ts
```

### 添加共享组件

```bash
# 添加到 shared/components
touch app/shared/components/new-shared-component.tsx

# 在 shared/components/index.ts 中导出
echo "export { NewSharedComponent } from './new-shared-component'" >> app/shared/components/index.ts
```

### 功能模块模板

```typescript
// features/new-feature/new-feature.tsx
"use client"

import { useState } from "react"

export interface NewFeatureProps {
  // 定义 props
}

export function NewFeature({ }: NewFeatureProps) {
  const [state, setState] = useState()

  return (
    <div>
      {/* 实现功能 */}
    </div>
  )
}
```

```typescript
// features/new-feature/index.ts
export { NewFeature } from './new-feature'
export type { NewFeatureProps } from './new-feature'
```

---

## 📚 参考资源

### Next.js 官方文档

- [Project Organization](https://nextjs.org/docs/app/building-your-application/routing/colocation)
- [App Router](https://nextjs.org/docs/app)

### 社区最佳实践

- [Bulletproof React](https://github.com/alan2207/bulletproof-react)
- [Next.js App Structure](https://dev.to/vadorequest/a-2021-guide-about-structuring-your-next-js-project-in-a-flexible-and-efficient-way-472)

---

## 🔄 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| 1.0.0 | 2025-12-25 | 初始版本，建立项目结构规范 |

---

## 📞 反馈与建议

如果你对这个结构规范有任何建议或问题，欢迎提出 Issue 或 PR。

---

**遵循这些规范，可以让项目：**
- ✅ 更容易理解和导航
- ✅ 更容易维护和扩展
- ✅ 更容易进行团队协作
- ✅ 更容易进行代码审查
