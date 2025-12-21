#!/bin/bash
# 修复 TraceEditor.tsx 文件的脚本

cd /www/wwwroot/linklore || exit 1

FILE="apps/web/components/trace/TraceEditor.tsx"

echo "正在修复 $FILE ..."

# 使用 Python 修复文件（处理编码和替换）
python3 << 'PYTHON_EOF'
import re
import sys

file_path = 'apps/web/components/trace/TraceEditor.tsx'

try:
    # 读取文件
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
except Exception as e:
    print(f"读取文件失败: {e}")
    sys.exit(1)

# 替换 maxwidth 为 maxWidth（不区分大小写，但只替换 style 对象中的）
content = re.sub(r'maxwidth\s*:', 'maxWidth:', content, flags=re.IGNORECASE)

# 修复可能的乱码注释
lines = content.split('\n')
for i, line in enumerate(lines):
    # 如果包含乱码字符，替换为正确的注释
    if 'M-iM-!M-5' in line or ('页面头部' not in line and '/*' in line and '*/' in line and 'M-' in line):
        # 查找注释位置
        if '{/*' in line:
            lines[i] = re.sub(r'\{/\*.*?\*/\}', '{/* 页面头部 */}', line)
        print(f"修复第 {i+1} 行注释")

# 写入文件
try:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print("文件修复完成！")
except Exception as e:
    print(f"写入文件失败: {e}")
    sys.exit(1)
PYTHON_EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "验证修复结果（第 329-331 行）："
    sed -n '329,331p' "$FILE"
    echo ""
    echo "清理构建缓存..."
    rm -rf apps/web/.next apps/web/node_modules/.cache node_modules/.cache
    find apps/web -name "*.tsbuildinfo" -delete
    echo "缓存清理完成！"
    echo ""
    echo "现在可以执行构建命令："
    echo "pnpm --filter @linklore/web build"
else
    echo "修复失败！"
    exit 1
fi

