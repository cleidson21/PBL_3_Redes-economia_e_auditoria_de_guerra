# Estágio de compilação
FROM golang:1.25-alpine AS builder
WORKDIR /app

# 1. Copia módulos e baixa dependências
COPY go.mod go.sum ./
RUN go mod download

# 2. Copia o código-fonte
COPY . .

# 3. Compila o binário
RUN go build -o drone main.go

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/drone .
CMD ["./drone"]