# 共享组件目录

## 目的

存放可以被多个模块共享使用的组件，避免模块间的直接依赖。

## 当前组件

### BookSearchDialog

**用途**: 图书搜索对话框，可在聊天、讨论版等模块中使用

**使用方式**:

```typescript
import BookSearchDialog from '@/shared/components/BookSearchDialog';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  
  return (
    <BookSearchDialog
      open={showDialog}
      onClose={() => setShowDialog(false)}
      onSelect={(book) => {
        console.log('Selected book:', book);
      }}
    />
  );
}
```

## 添加新共享组件

1. 将组件文件放到 `shared/components/` 目录
2. 确保组件不依赖特定模块的内部实现
3. 通过 props 传递依赖，而不是直接导入
4. 更新此 README 文档

## 原则

- **独立性**: 共享组件不应依赖特定模块的内部实现
- **可复用性**: 组件应设计为可在多个场景使用
- **接口清晰**: 通过 props 明确组件的输入输出





