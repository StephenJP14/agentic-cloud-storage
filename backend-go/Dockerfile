# Stage 1: Builder
FROM golang:1.25-alpine AS builder
RUN apk add --no-cache tzdata git
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Pastikan nama binary 'server'
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./main.go

# Stage 2: Runner
FROM alpine:latest
RUN apk add --no-cache tzdata ca-certificates
ENV TZ=Asia/Jakarta
WORKDIR /app
# Ambil binary 'server' dari builder
COPY --from=builder /app/server ./server
# COPY --from=builder /app/.env ./.env 
RUN chmod +x ./server
EXPOSE 8080
CMD ["./server"]