FROM gcr.io/distroless/nodejs24-debian13

WORKDIR /app

COPY .next/standalone /app/
COPY .next/static /app/.next/static/

EXPOSE 3000

ENV NODE_ENV=production

CMD ["server.js"]
