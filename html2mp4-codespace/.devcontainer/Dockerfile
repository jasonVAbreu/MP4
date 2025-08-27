FROM mcr.microsoft.com/devcontainers/javascript-node:1-18-bullseye

# Dependencias del sistema para Chromium y fuentes (importante para que puppeteer renderice bien)
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 \
    libdrm2 libgbm1 fonts-noto fonts-noto-color-emoji fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspaces/html2mp4-codespace
