# App/Components 目录重构分析报告

生成时间：2025-12-24

## 一、目录结构概览

```
/Users/moninla/Documents/prompt-fine-tune/app/components/
├── batch-panel.tsx          (36 KB, 828 lines) ⚠️ 过大
├── chat-panel.tsx           (17 KB, 466 lines)
├── playground.tsx           (13 KB, 324 lines)
├── custom-model-settings.tsx (3.7 KB, 120 lines)
└── model-data.ts            (5.9 KB, 268 lines)

总计: ~76 KB, 2,006 行代码
```

## 二、文件复杂度分析

| 文件 | 大小 | 行数 | 复杂度 | 状态 |
|------|------|-------|-----------|--------|
| **batch-panel.tsx** | 36 KB | 828 | 🔴 HIGH - 急需重构 | >700 行 |
| **chat-panel.tsx** | 17 KB | 466 | 🟡 MEDIUM | 可接受 |
| **playground.tsx** | 13 KB | 324 | 🟡 MEDIUM | 容器组件 |
| **custom-model-settings.tsx** | 3.7 KB | 120 | 🟢 LOW | 工具组件 |
| **model-data.ts** | 5.9 KB | 268 | 🟢 LOW | 纯数据 |

**关键发现**：`batch-panel.tsx` 严重超标，达到 **828 行**，应拆分为多个聚焦的小组件。

## 三、组件架构与职责

### 3.1 功能模块分解

**A. Playground 容器 (playground.tsx - 324 行)**
- 顶层编排组件
- 管理配置状态：systemPrompt, model, topP, temperature, historyTurns
- 布局：2 列可调整网格（左侧配置，右侧交互）
- 作为 Chat 和 Batch 测试的标签页容器

**B. Chat 对话面板 (chat-panel.tsx - 466 行)**
- 会话式 AI 交互界面
- 使用 `@ai-sdk/react` hook: `useChat()`
- 集成模型选择器（带 provider logo）
- 消息操作：复制、重发、编辑、重试
- 消息历史渲染（带会话窗口分隔符）
- 子组件：`ChatContent`（访问 PromptInputController 的内部组件）

**C. Batch 批量测试面板 (batch-panel.tsx - 828 行)** ⚠️
- 测试用例管理 & 执行系统
- 双层 UI：概览网格 + 详情编辑器
- **关键问题**：单文件包含过多业务逻辑
- 子组件：`TrendChart`（渲染 20 项成功率历史图表）

**D. 自定义模型设置 (custom-model-settings.tsx - 120 行)**
- OpenAI 兼容模型配置对话框
- 凭证存储在 localStorage

**E. 模型数据 (model-data.ts - 268 行)**
- 静态模型目录（11 个提供商的 35 个模型）
- 提供商：OpenAI, Anthropic, Google, Meta, DeepSeek, Mistral, Alibaba, Cohere, xAI, Moonshot, Perplexity, Vercel, Amazon

## 四、关键问题：batch-panel.tsx 过于庞大

**batch-panel.tsx 内容分布：**

```
第 1-124 行:     导入 & 接口定义 (TestCase, TestResult, HistoryItem, RunDetail)
第 50-64 行:     图表配置 (ChartConfig)
第 66-119 行:    TrendChart 组件（子组件）
第 124-135 行:   状态初始化（11 个 useState hooks）
第 142-185 行:   数据加载（localStorage + 后端同步）
第 187-262 行:   CRUD 操作（addTestCase, removeTestCase, updateTestCase, resetHistory）
第 264-336 行:   测试执行控制（runSingleTest, terminateTest, terminateAllTests）
第 337-496 行:   核心测试运行逻辑（runSingleTest - 160 行）
第 498-513 行:   编排逻辑（runAllTests, 图层导航）
第 515-827 行:   渲染逻辑（两个独立渲染路径 + 分屏视图）
```

**问题点：**
1. 混合关注点：UI、状态管理、API 协调、验证脚本执行
2. 单组件处理 2 种 UI 模式（概览 + 详情编辑器）
3. 复杂异步逻辑（带 abort controllers）
4. 11 个 state hooks 无组织
5. 渲染约 300 行 JSX（分两个分支）

## 五、状态管理模式

### 5.1 各组件 useState 分布

**playground.tsx (9 个状态项):**
```typescript
- systemPrompt (string)
- historyTurns (number)
- model (string)
- topP (number)
- temperature (number)
- isLoading (boolean)
- customConfig (CustomModelConfig | undefined)
- isCustomSettingsOpen (boolean)
- open (boolean) - 模型选择器
```

**batch-panel.tsx (11 个状态项):**
```typescript
- testCases (TestCase[])              // 实际数据
- results (Record<string, TestResult>) // 运行中的测试结果
- isRunning (boolean)                 // 全局执行标志
- activeTestCaseId (string | null)    // 当前编辑上下文
- abortControllers (Record<...>)      // 异步控制
- editingCase (TestCase | null)       // Layer 2 草稿状态
- isLoaded (boolean)                  // 初始化标志
- isFetching (boolean)                // 后端同步状态
- isAdding (boolean)                  // 添加操作状态
- isDeletingId (string | null)        // 删除操作状态
```

**chat-panel.tsx (3 个状态项):**
```typescript
- modelSelectorOpen (boolean)
- editingMessageId (string | null)
- editingContent (string)
```

**模式**：每个组件垂直管理自己的状态——无共享 context，无状态提升（除了组件层级）。

## 六、API 调用模式与位置

### 6.1 使用的 API 端点

| 端点 | 方法 | 调用位置 | 用途 |
|----------|--------|-----------|---------|
| `/api/settings` | GET | playground.tsx | 批量获取所有设置（query: `?keys=...`）|
| `/api/settings` | POST | playground.tsx (5x) | 保存单个设置（每个单独的 effect）|
| `/api/test-cases` | GET | batch-panel.tsx | 加载用户测试用例 |
| `/api/test-cases` | POST | batch-panel.tsx | 创建新测试用例 |
| `/api/test-cases/{id}` | PATCH | batch-panel.tsx | 更新测试用例或添加历史项 |
| `/api/test-cases/{id}` | DELETE | batch-panel.tsx | 删除测试用例 |
| `/api/batch-chat` | POST | batch-panel.tsx | 执行单次测试迭代（循环调用）|
| `/api/chat` | POST | @ai-sdk/react | 聊天流式传输（通过 sendMessage hook）|

### 6.2 API 调用模式

**模式 1: Playground 设置（分散）**
```typescript
// playground.tsx 中的 5 个独立 useEffect hooks（第 84-132 行）
useEffect(() => { fetch('/api/settings', { ... }) }, [systemPrompt, userId, isLoading])
useEffect(() => { fetch('/api/settings', { ... }) }, [historyTurns, userId, isLoading])
useEffect(() => { fetch('/api/settings', { ... }) }, [model, userId, isLoading])
useEffect(() => { fetch('/api/settings', { ... }) }, [topP, userId, isLoading])
useEffect(() => { fetch('/api/settings', { ... }) }, [temperature, userId, isLoading])

// 问题：任何设置更改触发 5 个独立的 API 调用
// 可以去抖或批量处理为单个调用
```

**模式 2: Batch 测试执行（紧密循环）**
```typescript
// batch-panel.tsx, runSingleTest() - 第 376-454 行
for (let i = 0; i < testCase.expectedCount; i++) {
  const response = await fetch('/api/batch-chat', {
    method: 'POST',
    body: JSON.stringify({
      messages: [{ role: 'user', content: testCase.input }],
      model, system: systemPrompt,
      customBaseUrl, customApiKey, customModel,
      topP, temperature,
    }),
    signal: controller.signal  // AbortController
  })
  // 使用类似 eval 的 Function 构造器验证输出
  const validate = new Function('output', 'input', scriptToUse)
  validate(output, testCase.input)
  // 每次迭代后更新进度 UI
}
```

**模式 3: 测试用例 CRUD（直接 Fetch）**
```typescript
// batch-panel.tsx
const addTestCase = async () => {
  const res = await fetch('/api/test-cases', { method: 'POST', body: JSON.stringify(newCase) })
  const savedCase = await res.json()
  // 如果没有 userId 则回退到本地状态
}

const updateTestCase = async (id: string, updates: Partial<TestCase>) => {
  setTestCases(prev => ...)  // 乐观更新
  if (userId) {
    await fetch(`/api/test-cases/${id}`, { method: 'PATCH', body: JSON.stringify(updates) })
  }
}
```

### 6.3 关键问题：无 API 抽象层

- **25+ fetch() 调用分散在各组件中**
- 无错误处理标准化
- 无请求/响应拦截器
- 无重试逻辑
- 无请求去重
- 错误日志基础（仅 console.error）

## 七、配置与状态管理

### 7.1 配置来源

| 配置项 | 来源 | 位置 | 持久化 |
|------------|--------|----------|-------------|
| 系统提示词 | 后端 (Prisma) | playground.tsx state | 每用户 DB |
| 模型 | 后端 (Prisma) | playground.tsx state | 每用户 DB |
| 温度 | 后端 (Prisma) | playground.tsx state | 每用户 DB |
| Top P | 后端 (Prisma) | playground.tsx state | 每用户 DB |
| 对话轮数 | 后端 (Prisma) | playground.tsx state | 每用户 DB |
| 测试用例 | 后端 (Prisma) OR localStorage | batch-panel.tsx state | 双重（优先 DB）|
| 自定义模型配置 | 仅 localStorage | custom-model-settings state | 仅浏览器 |
| 模型目录 | 静态数据 | model-data.ts | 代码 |

### 7.2 双存储模式（回退策略）

**在 batch-panel.tsx（第 142-185 行）：**
```typescript
const loadData = async () => {
  if (userId) {
    try {
      const res = await fetch('/api/test-cases')
      // 成功：使用后端
      setTestCases(data)
      return
    } catch (e) {
      console.error("Failed to load from backend", e)
    }
  }

  // 回退：localStorage
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    setTestCases(JSON.parse(saved))
  }
}
```

**目的**：离线/未认证工作，但创建数据同步复杂性。

## 八、重复代码模式

### 8.1 相同的 API 调用模式

**模式：带 userId 守卫的 Fetch**
```typescript
// 在 batch-panel.tsx 中出现 8+ 次
if (userId) {
  try {
    const res = await fetch(`/api/test-cases/${id}`, {
      method: 'POST'|'PATCH'|'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    // 成功处理
  } catch (e) {
    console.error("Failed operation", e)
  }
}
// 回退到本地操作
```

**模式：设置保存（playground.tsx）**
```typescript
// 完全相同的代码重复 5 次，只有不同的键
useEffect(() => {
  if (userId && !isLoading) {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'SETTING_KEY', value: value.toString() })
    })
  }
}, [value, userId, isLoading])
```

### 8.2 模型选择器组件使用

**在 playground.tsx（第 171-222 行）和 chat-panel.tsx（第 258-310 行）中完全相同的模式：**
```typescript
<ModelSelector onOpenChange={setOpen} open={open}>
  <ModelSelectorTrigger>...</ModelSelectorTrigger>
  <ModelSelectorContent>
    <ModelSelectorInput placeholder="Search models..." />
    <ModelSelectorList>
      {chefs.map((chef) => (
        <ModelSelectorGroup heading={chef} key={chef}>
          {models.filter((m) => m.chef === chef).map((modelItem) => (
            <ModelSelectorItem
              key={modelItem.id}
              onSelect={() => {
                onModelChange?.(modelItem.id) // 或 setModel()
                setOpen(false)
              }}
              value={modelItem.id}
            >
              {/* 相同的 logo/name 渲染 */}
              {model === modelItem.id && <CheckIcon />}
            </ModelSelectorItem>
          ))}
        </ModelSelectorGroup>
      ))}
    </ModelSelectorList>
  </ModelSelectorContent>
</ModelSelector>
```

**机会**：提取为 `<ModelSelectorPanel />` 包装组件。

## 九、共享 vs 特定功能组件

### 9.1 跨组件共享

1. **model-data.ts** - 使用者：
   - playground.tsx
   - chat-panel.tsx
   - batch-panel.tsx（通过 playground 间接）

2. **CustomModelConfig 接口** - 使用者：
   - custom-model-settings.tsx（提供者）
   - chat-panel.tsx（消费者）
   - batch-panel.tsx（消费者）
   - playground.tsx（编排器）

3. **Clerk useAuth()** - 使用者：
   - playground.tsx
   - batch-panel.tsx
   - custom-model-settings.tsx（通过 props）

### 9.2 特定功能组件

| 组件 | 所有者 | 依赖项 | 数据源 |
|-----------|-------|-------------|------------|
| **Playground** | 容器 | ChatPanel, BatchPanel, CustomModelSettings | 多个（编排器）|
| **ChatPanel** | 功能 | @ai-sdk/react, ai-elements/*, ui/* | useChat hook + API |
| **BatchPanel** | 功能 | Recharts, CustomModelSettings | Prisma + localStorage |
| **CustomModelSettings** | 功能 | Dialog UI, localStorage | localStorage |

**发现**：无共享状态 context 或全局 providers——所有共享通过 props 传递。

## 十、错误处理与边缘情况

### 10.1 当前错误处理

**模式：记录但不向用户显示**
```typescript
try {
  const res = await fetch(...)
  if (!res.ok) throw new Error('Network response was not ok')
  const data = await res.json()
} catch (e: any) {
  console.error("Failed operation", e)  // 静默失败！
  // 回退到仅本地操作
}
```

**问题：**
- 用户看不到错误
- 无重试机制
- 失败的同步静默丢失
- 网络超时未处理

安装 sonner 全局 toast 弹窗提示

### 10.2 验证脚本执行（batch-panel.tsx:402）

```typescript
const validate = new Function('output', 'input', scriptToUse)
validate(output, testCase.input)
```

**安全问题**：使用 Function 构造器执行用户提供的验证代码
- 可能执行任意 JavaScript
- 无沙箱隔离
- 错误处理基础（捕获但不详细）

## 十一、性能观察

### 11.1 重渲染问题

**batch-panel.tsx 第 573-650 行（网格渲染）**：
```typescript
{testCases.map((testCase, index) => {
  const result = results[testCase.id]
  const successRate = result?.successRate ?? ...
  return (
    <div onClick={() => enterLayer2(testCase)}>
      {/* 每次更新时卡片多次渲染 */}
      {result?.status === 'running' && <Loader2 animate-spin />}
      {isDeletingId === testCase.id && <Loader2 animate-spin />}
    </div>
  )
})}
```

**问题**：由于 `results` 字典中的对象引用更改，任何状态更改都会导致整个网格重新渲染。

### 11.2 多次设置保存（playground.tsx）

5 个独立的 useEffect 块触发独立的 API 调用：
```
1. systemPrompt 更改 → POST /api/settings (system-prompt)
2. historyTurns 更改 → POST /api/settings (history-turns)
3. model 更改 → POST /api/settings (model)
4. topP 更改 → POST /api/settings (top-p)
5. temperature 更改 → POST /api/settings (temperature)
```

**影响**：每次设置更改 = 1 次 API 调用（未批处理）

## 十二、问题总结

| 问题 | 严重性 | 位置 | 影响 |
|-------|----------|----------|--------|
| batch-panel.tsx 有 828 行 | 🔴 HIGH | batch-panel.tsx | 难以维护、测试、调试 |
| runSingleTest 有 160 行 | 🔴 HIGH | batch-panel.tsx:337-496 | 业务逻辑与 UI 耦合过紧 |
| 5 次设置 API 调用（未批处理）| 🟡 MEDIUM | playground.tsx:84-132 | 不必要的网络通信 |
| 无 API 抽象层 | 🟡 MEDIUM | 所有组件 | 错误处理分散，无重试 |
| Function() 验证脚本 | 🔴 HIGH | batch-panel.tsx:402 | 安全风险（任意代码执行）|
| 无共享 context/providers | 🟢 LOW | 架构 | Props 传递 4 层 |
| 25+ fetch 调用分散 | 🟡 MEDIUM | 组件 | 难以跟踪、维护、调试 |
| 模型选择器代码重复 | 🟢 LOW | playground.tsx, chat-panel.tsx | 50+ 行重复 |
| 状态更改时完整网格重渲染 | 🟢 LOW | batch-panel.tsx:573 | 多测试用例时性能问题 |
| 双存储（localStorage + DB）| 🟢 LOW | batch-panel.tsx | 同步复杂性，混合离线支持 |
| custom-model-settings 使用 localStorage | 🟡 MEDIUM | custom-model-settings.tsx | API 密钥在浏览器中未加密存储 |

## 十三、重构建议优先级

### 🔴 关键（立即重构）

1. **拆分 batch-panel.tsx** 为 3 个组件：BatchOverview, BatchDetail, TrendChart
2. **提取 runSingleTest** 到自定义 hook（useTestRunner）
3. **创建 API 客户端抽象**（/lib/api-client）
4. **实现验证脚本沙箱**（iframe 或 web worker）

### 🟡 高优先级（下一个 Sprint）

5. **批量设置更新**（带去抖）
6. **提取 ModelSelectorPanel 组件**
7. **添加全局错误/Toast 通知系统**
8. **创建共享类型文件**（/lib/types）

### 🟢 中等优先级（技术债务）

9. **实现测试执行状态的 Context**
10. **添加带指数退避的请求重试逻辑**
11. **加密 localStorage 中的自定义模型凭证数据**
12. **记忆化 batch panel 中的网格项**（React.memo）

---

## 十四、推荐的新目录结构

```
app/components/
├── playground/
│   ├── index.tsx                 # 主容器
│   ├── playground-context.tsx    # 配置 Context
│   └── settings-panel.tsx        # 左侧配置面板
│
├── chat-panel/
│   ├── index.tsx                 # 主组件
│   ├── chat-content.tsx          # 消息列表
│   ├── message-actions.tsx       # 消息操作按钮
│   └── use-chat-panel.ts         # 自定义 hook
│
├── batch-panel/
│   ├── index.tsx                 # 容器
│   ├── batch-overview.tsx        # Layer 1: 网格视图
│   ├── batch-detail.tsx          # Layer 2: 编辑器
│   ├── trend-chart.tsx           # 成功率图表
│   ├── test-card.tsx             # 单个测试用例卡片
│   ├── use-test-runner.ts        # 测试执行逻辑
│   ├── use-test-cases.ts         # CRUD 操作
│   └── types.ts                  # 测试相关类型
│
├── shared/
│   ├── model-selector-panel.tsx  # 统一模型选择器
│   ├── custom-model-settings.tsx # 自定义模型对话框
│   └── model-data.ts             # 模型目录
│
└── lib/
    ├── api-client.ts             # 统一 API 调用
    ├── types.ts                  # 共享类型
    └── validation-sandbox.ts     # 安全脚本执行

```

---

## 十五、下一步行动

1. **创建详细的重构待办清单**（TodoWrite）
2. **逐步重构**（避免大爆炸式改写）

---

**报告结束**
