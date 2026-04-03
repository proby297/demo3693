FROM node:23-alpine

WORKDIR /usr/src/app

# 为 node-gyp 安装编译 cld 等原生插件所需的依赖：
# python3: node-gyp 需要 Python
# make 和 g++: C++ 编译器和构建工具
# git: 某些 npm 包可能需要从 git仓库拉取
# tzdata: Alpine 上正确处理时区数据通常需要
RUN apk add --no-cache python3 make g++ git tzdata

# (可选但推荐) 设置 PYTHON 环境变量，明确告诉 node-gyp 使用哪个 python
ENV PYTHON=python3

# 复制package.json和package-lock.json (如果存在)
COPY package*.json ./

# 安装依赖 (现在应该能成功编译 cld 了)
RUN npm install

# 复制源代码
COPY . .

# 构建TypeScript代码 (将 TS 编译成 JS 到 dist 目录)
RUN npm run build

# 暴露API端口
EXPOSE 5000

# 启动命令 (运行编译后的 JavaScript)
CMD ["node", "dist/server.js"]