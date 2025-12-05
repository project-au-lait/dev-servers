ARG VERSION=latest
FROM sonarqube:${VERSION}

ENV DOCKERIZE_VERSION=v0.6.1

USER root

RUN set -eux \
    && : "Install dockerize" \
    && wget -O dockerize.tar.gz https://github.com/jwilder/dockerize/releases/download/${DOCKERIZE_VERSION}/dockerize-linux-amd64-${DOCKERIZE_VERSION}.tar.gz \
    && tar -xzvf dockerize.tar.gz -C /usr/local/bin \
    && rm dockerize.tar.gz \
    && chown sonarqube /opt/sonarqube/conf/sonar.properties

USER sonarqube

WORKDIR $SONARQUBE_HOME

COPY tmpl.sonar.properties ./conf
RUN chmod u+w ./conf/sonar.properties

ENTRYPOINT [ \
    "sh", "-c", \
    "dockerize \
     -template ./conf/tmpl.sonar.properties:./conf/sonar.properties \
     -wait tcp://${DB_HOST}:${DB_PORT} \
     -timeout 60s \
     && exec ./docker/entrypoint.sh -Dsonar.web.context=/sonarqube" \
]
