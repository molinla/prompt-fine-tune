# 快速参考指南

> 项目结构和常用操作的速查表

## 📂 目录结构速查

```
app/
├── [page]/                    # 页面目录
│   ├── features/             # 功能模块（业务逻辑）
│   │   └── [feature]/
│   │       ├── components/   # 私有组件
│   │       ├── [feature].tsx # 主组件
│   │       └── index.ts      # 导出
│   └── page.tsx             # 页面入口
│
├── shared/                   # 跨页面共享
│   ├── components/          # 共享组件
│   └── index.ts             # 统一导出
│
└── components/              # 全局基础组件
    └── ui/                  # shadcn/ui
```

## 🔗 导入路径速查

| 导入内容 | 路径 | 示例 |
|---------|------|------|
| 全局 UI 组件 | `@/components/ui/*` | `import { Button } from "@/components/ui/button"` |
| AI 元素组件 | `@/components/ai-elements/*` | `import { Conversation } from "@/components/ai-elements/conversation"` |
| 共享资源 | `@/app/shared` | `import { models } from "@/app/shared"` |
| 功能模块 | `./features/*` | `import { ChatPanel } from "./features/chat-panel"` |
| 子组件 | `./components/*` | `import { ChatHeader } from "./components/chat-header"` |

## 🚀 常用操作

### 创建新页面

```bash
# 1. 创建目录结构
mkdir -p app/my-page/features/my-feature/components

# 2. 创建必要文件
touch app/my-page/page.tsx
touch app/my-page/features/my-feature/my-feature.tsx
touch app/my-page/features/my-feature/index.ts

# 3. 在 my-feature/index.ts 添加导出
echo "export { MyFeature } from './my-feature'" > app/my-page/features/my-feature/index.ts
```

### 创建新功能模块

```bash
# 在现有页面添加功能
mkdir -p app/playground/features/new-feature/components
touch app/playground/features/new-feature/new-feature.tsx
touch app/playground/features/new-feature/index.ts
```

### 添加共享组件

```bash
# 创建共享组件
touch app/shared/components/my-component.tsx

# 在 index.ts 中导出
echo "export { MyComponent } from './my-component'" >> app/shared/components/index.ts
```

## 📝 代码模板

### 功能模块主组件

```typescript
"use client"

import { useState } from "react"
// 导入全局组件
import { Button } from "@/components/ui/button"
// 导入共享资源
import { models } from "@/app/shared"
// 导入子组件
import { SubComponent } from "./components/sub-component"

export interface MyFeatureProps {
  prop1: string
  prop2?: number
}

export function MyFeature({ prop1, prop2 = 0 }: MyFeatureProps) {
  const [state, setState] = useState()

  return (
    <div>
      <SubComponent />
    </div>
  )
}
```

### index.ts 导出文件

```typescript
// features/my-feature/index.ts
export { MyFeature } from './my-feature'
export type { MyFeatureProps } from './my-feature'
```

### 页面入口文件

```typescript
// app/my-page/page.tsx
import { MyFeature } from "./features/my-feature"

export default function MyPage() {
  return (
    <main>
      <MyFeature prop1="value" />
    </main>
  )
}
```

## ⚠️ 注意事项

### ✅ 应该做的

- ✅ 功能模块放在 `features/` 目录下
- ✅ 私有组件放在 `components/` 子目录
- ✅ 使用 `index.ts` 控制导出
- ✅ 跨页面共享的放在 `app/shared/`
- ✅ 使用路径别名 `@/` 导入全局资源

### ❌ 不应该做的

- ❌ 不要平铺所有组件在同一目录
- ❌ 不要导出私有组件
- ❌ 不要在页面间直接导入对方的功能模块
- ❌ 不要过度拆分简单组件（< 100 行）
- ❌ 不要使用相对路径导入全局资源

## 🔍 何时拆分组件？

### 拆分信号

- 📏 组件超过 300 行
- 🔄 有可复用的部分
- 🎯 有明确的功能边界
- 🧪 需要独立测试

### 不需要拆分

- 📄 简单组件（< 100 行）
- 🎨 纯展示组件
- 🔒 不会被复用的一次性组件

## 📊 项目分层

```
┌─────────────────────────────────────┐
│          app/page.tsx               │  页面层（路由）
│      (路由入口，状态编排)            │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│     app/[page]/features/            │  功能层（业务逻辑）
│      (核心业务逻辑，数据处理)         │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│  features/[feature]/components/     │  组件层（UI 实现）
│      (UI 组件，交互逻辑)              │
└─────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────┐
│      @/components/ui/               │  基础层（UI 库）
│   (shadcn/ui，基础组件)              │
└─────────────────────────────────────┘
```

## 🎯 导入顺序规范

```typescript
// 1. React 相关
import { useState, useEffect } from "react"

// 2. 第三方库
import { useAuth } from "@clerk/nextjs"
import { useChat } from "@ai-sdk/react"

// 3. 全局组件（路径别名）
import { Button } from "@/components/ui/button"
import { Conversation } from "@/components/ai-elements/conversation"

// 4. 共享资源（路径别名）
import { models, CustomModelConfig } from "@/app/shared"

// 5. 功能模块（相对路径）
import { ChatPanel } from "./features/chat-panel"

// 6. 本地组件（相对路径）
import { ChatHeader } from "./components/chat-header"

// 7. 类型导入
import type { CustomType } from "./types"

// 8. 样式文件
import "./styles.css"
```

## 🛠️ 故障排查

### 导入错误

**问题：** `Cannot find module '@/shared'`

**解决：** 检查路径别名配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

正确的导入应该是：
```typescript
import { models } from "@/app/shared"  // ✅
// 而不是
import { models } from "@/shared"      // ❌
```

### 模块未找到

**问题：** 找不到功能模块

**检查清单：**
1. ✅ `index.ts` 是否存在
2. ✅ `index.ts` 是否导出了组件
3. ✅ 导入路径是否正确
4. ✅ 文件名是否匹配

### 循环依赖

**避免方法：**
- 不要在功能模块间相互导入
- 共享的逻辑提取到 `app/shared/`
- 使用事件总线或状态管理解决通信

## 📦 迁移现有代码

### 从平铺结构迁移到模块化

```bash
# 1. 创建新结构
mkdir -p app/playground/features/my-feature/components

# 2. 移动文件
mv app/components/my-feature.tsx app/playground/features/my-feature/
mv app/components/my-feature-*.tsx app/playground/features/my-feature/components/

# 3. 创建 index.ts
echo "export { MyFeature } from './my-feature'" > app/playground/features/my-feature/index.ts

# 4. 更新导入路径
# 在使用该组件的地方更新导入
# 从: import { MyFeature } from '@/components/my-feature'
# 到: import { MyFeature } from './features/my-feature'

# 5. 验证构建
pnpm run build
```

---

## 📚 相关文档

- [完整结构规范](./PROJECT_STRUCTURE.md) - 详细的项目结构说明
- [Next.js 官方文档](https://nextjs.org/docs) - Next.js 官方指南

---

需要更详细的说明？查看 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
