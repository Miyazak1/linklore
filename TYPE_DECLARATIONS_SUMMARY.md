# 类型声明文件修复总结

## 问题
服务器构建时发现多个模块缺少 TypeScript 类型声明文件。

## 已创建的类型声明文件

1. **apps/web/types/bcryptjs.d.ts** - bcryptjs 类型声明
2. **apps/web/types/mime-types.d.ts** - mime-types 类型声明
3. **apps/web/types/sanitize-html.d.ts** - sanitize-html 类型声明
4. **apps/web/types/ali-oss.d.ts** - ali-oss 类型声明
5. **apps/web/types/pdf-parse.d.ts** - pdf-parse 类型声明

## 修改的文件

1. **apps/web/tsconfig.json** - 添加 `types/**/*.d.ts` 到 include

## 原因分析

这些包在 `package.json` 的 `dependencies` 中，但没有对应的 `@types/*` 包在 `devDependencies` 中。服务器构建时 TypeScript 严格模式会报错。

## 解决方案

创建了自定义类型声明文件，放在 `apps/web/types/` 目录下，并在 `tsconfig.json` 中包含该目录。

## 下一步

提交代码并在服务器上重新构建：

```bash
git add .
git commit -m "添加缺失的类型声明文件：bcryptjs, mime-types, sanitize-html, ali-oss, pdf-parse"
git push origin master
```

服务器操作：
```bash
cd /www/wwwroot/linklore
git pull origin master
pnpm build
```





