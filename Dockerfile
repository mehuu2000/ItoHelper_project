# 本番用 Dockerfile

# ビルド用のステージ
FROM node:18-alpine AS build

WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install --production

# ソースコードをコピー
COPY . .

# Next.js アプリケーションをビルド
RUN npm run build

# 本番用の軽量なイメージ
FROM node:18-alpine

WORKDIR /app

# 必要なファイルのみをコピー
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src

# ポート3000を公開
EXPOSE 3000

# アプリケーションを実行
CMD ["npm", "start"]
