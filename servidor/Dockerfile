FROM golang:1.25-alpine AS builder
WORKDIR /app

# 1. Copia arquivos de módulo e baixa as dependências (Cache layer)
COPY go.mod go.sum ./
RUN go mod download

# 2. Copia TUDO (incluindo a subpasta /contract)
COPY . .

# 3. Compila o binário
RUN go build -o servidor .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/servidor .
COPY config.json .

# Expõe as portas usadas pelo setor (ajustadas para ambiente de laboratório)
EXPOSE 48080/udp
EXPOSE 48081/tcp
EXPOSE 48082/tcp
EXPOSE 48083/tcp
CMD ["./servidor"]

