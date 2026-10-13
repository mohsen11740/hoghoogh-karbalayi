
FROM node:20-alpine
WORKDIR /app
COPY hoghoogh-karbalayi-groq.zip /tmp/app.zip
RUN apk add --no-cache unzip \
    && unzip -q /tmp/app.zip -d /tmp/source \
    && cp -a /tmp/source/hoghoogh-karbalayi-connected/. /app/ \
    && npm install --omit=dev
EXPOSE 3000
CMD ["npm", "start"]
