# ---- 构建阶段：编译 React 控制台 ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY vite.config.ts tsconfig.json index.html ./
COPY src ./src
RUN npm run build

# ---- 运行阶段：保持零依赖，只带 server.js 与静态产物 ----
# node_modules 刻意不进运行镜像：server.js 本身没有任何运行时依赖
FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY --from=build /app/dist ./dist
ENV DATA_DIR=/data
ENV BIND_HOST=0.0.0.0
VOLUME /data
EXPOSE 3123
CMD ["node", "server.js"]
