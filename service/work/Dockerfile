ARG VERSION=latest
FROM jwilder/dockerize:${VERSION}

RUN apk update --no-cache && \
    apk add --no-cache bash tree postgresql-client openldap-clients curl jq

ENV PATH=$PATH:/tmp

WORKDIR /tmp

ENTRYPOINT [ \
    "sh", "-c", \
    "dockerize -template /mnt:./ \
     && chmod u+x init.sh ldapmod nexus-config.sh wiki-config.sh \
     && ./init.sh \
     && exec tail -f /dev/null" \
]

