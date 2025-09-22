ARG VERSION=latest
FROM mcr.microsoft.com/playwright:${VERSION}

RUN apt update \
    && apt install nginx -y\
    && rm -rf /var/lib/apt/lists/*

COPY server.conf /etc/nginx/conf.d/server.conf

WORKDIR /mnt

ENTRYPOINT ["sh", "-c", "npm i && exec nginx -g 'daemon off;'"]
