# Dev Servers

Dev Servers is a Docker Compose asset to setup server tools for CI / CD.
It setups the following tools with Docker and makes them available immediately.

* Souce Code Management : GitBucket
* Continuous Integration : Jenkins
* Static Code Analysis : SonarQube
* Issue Tracking System : Redmine
* Artifact Repository Manager : Nexus
* Wiki : [Wiki.js](https://js.wiki/)

Each server tool is configured as a service of Docker Compose.
Each service has the following settings necessary for team development.

* LDAP Authentication
  * You can log in to all tools with the same user ID / password.
* Proxy Server
  * It can be accessed via the same proxy server.
* Self Service Password
  * Users can change passwords and send reminders.
* E-mail
  * You can set the connection information of the SMTP server of each service in one place.
  * The e-mail address of the LDAP user account is used as the mail transmission destination.


## Quick Start

1. Install Docker.
  * Windows 10 Pro / Mac
    * https://store.docker.com/search?type=edition&offering=community
  * Another Windows
    * https://docs.docker.com/toolbox/toolbox_install_windows/
1. Set Docker memory allocation. Minimum: 6GB, Recommended: 8GB or more.
  * Windows 10 Pro
    * Settings > Advanced > Memory
  * Mac
    * Preferences > Advanced > Memory
1. Get the resource of dev-servers and execute each Docker Compose Service with the following command.

```
git clone https://github.com/project-au-lait/dev-servers.git
cd dev-servers
docker-compose up -d
```

The endpoint URL to each service and the connection information of the admin user are as follows.

|        Server         |             Endpoint URL (*1)             |         UserId / Password          |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| GitBucket             | http://localhost/gitbucket                | root  / root                       |
| Jenkins               | http://localhost/jenkins                  | admin / admin                      |
| SonarQube             | http://localhost/sonarqube                | admin / admin                      |
| Redmine               | http://localhost/redmine                  | admin / admin                      |
| Nexus                 | http://localhost/nexus                    | admin / admin                      |
| Nexus(Docker registry)| http://localhost:5001                     | admin / admin                      |
| PostgreSQL            | jdbc:postgresql://localhost:5432/postgres | postgres / postgres                |
| Self Service Password | http://localhost/passchg                  | -                                  |
| phpLDAPAdmin          | https://localhost:17443                   | cn=admin,dc=example,dc=org / admin |
| Wiki.js               | https://wiki.localhost                    | admin@example.org / admin          |

* *1 For Docker Toolbox, it is an IP address that can be confirmed with docker-machine ls command instead of localhost.

### How To Add Users

1. Create new ldif file and add the user information you want to add.

* add-users.ldif

```
dn: cn=user001,dc=example,dc=org
changetype: add
cn: user001
sn: User
givenName: 001
mail: user001@example.org
objectClass: inetOrgPerson
objectClass: person
objectClass: top
userPassword: password
```

2. Execute the following command.

```
docker cp add-users.ldif dev-servers-work-1:/tmp
docker-compose exec work ldapmod add-users.ldif
```

Then you can log in to all services with the following user ID / password.

* user001 / password

### End to End Test

The following command confirms that the user added above can log in to each service by the automated test.

```
docker-compose exec e2etest npm run env USER_ID=user001 PASSWORD=password npm test
```

See http://localhost:9323 for the results of the automated test. 

> [!TIP]
> If you get Segmentation fault errors using Docker Desktop for Mac  
> try setting the Virtualization framework to off.  
> See this issue for more information. https://github.com/docker/for-mac/issues/6824


### Backup

1. Execute backup.sh specifing the directory you want to save backup files.
   1. All services will be stopped.
   2. All named volumes in docker-compose.yml will be backuped to backup/{timestamp} directory.
   3. 8th and subsequent directories in order of age will be deleted. 
   4. All services will be started.

```
./backup.sh /path/to/backup/directory
```


```
/path/to/backup/directory
  - yyyymmdd_hhmmss
    - ci_data.tar
    - dbms_data.tar
      :
```

### Restore

1. Execute restore.sh specifying the path of the directory that contains the backup file you want to restore.
   Read and restore tar file of "dev-servers_" prefix of specified directory.

```
git clone https://github.com/project-au-lait/dev-servers.git
cd dev-servers
./restore.sh /path/to/backup/directory/yyyymmdd_hhmmss
docker-compose up -d
```

## Migration maven artifacts from Artifactory to Nexus
dev-servers changed arm from Artifactory to Nexus.  
Here are the steps to migrate maven artifacts from Artifactory to Nexus.

> [!IMPORTANT]
> Please take [backup](#backup) of dev-servers before working.

1. **Artifactory export**  
Assume Artifactory is running.

   1. Export Artifactory data
      ```
      curl -X POST -u admin:password http://localhost/artifactory/api/export/system -H "Content-Type: application/json" -d "{ \"exportPath\" : \"/tmp/export\", \"includeMetadata\" : false, \"createArchive\" : false, \"bypassFiltering\" : false, \"verbose\" : false, \"failOnError\" : false, \"failIfEmpty\" : true, \"m2\" : false, \"incremental\" : false, \"excludeContent\" : false }"
      ```

   1. Get data from Artifactory container
      ```
      mkdir backup

      # bash
      docker cp dev-servers-arm-1:$(docker exec -it dev-servers-arm-1 bash -c 'echo -n $(ls -rtd /tmp/export/* | tail -n 1)')/repositories backup
      
      # cmd
      for /f "usebackq delims=" %A in (`docker exec -it dev-servers-arm-1 bash -c "ls -rtd /tmp/export/* | tail -n 1"`) do set EXPORT_DIR=%A
      docker cp dev-servers-arm-1:%EXPORT_DIR%/repositories backup
      ```

1. **dev-servers update Artifactory → Nexus**

   ```
   docker-compose down proxy arm work --rmi local
   docker volume rm dev-servers_arm_data
   git pull
   docker-compose up -d
   ```

1. **Nexus import**

   1. Create repository in Nexus  
      access http://localhost/nexus/#admin/repository/repositories  
      `+Create repository` > `maven2(hosted)`  
      Please select the appropriate version policy for your repository.
      <br>

   1. Import artifacts
      * run this only if you are using cmd
      ```
      docker run -v %CD%/backup:/backup -it --rm alpine sh -c "apk add curl bash && bash"
      ```

      * common procedure
      ```  
      cd backup/repositories
      curl https://raw.githubusercontent.com/sonatype-nexus-community/nexus-repository-import-scripts/master/mavenimport.sh -o mavenimport.sh
      chmod a+x mavenimport.sh

      # Repeat for as many repositories to import.
      ------------------------------------------------------------------------------------------------------------
      cd <your-artifactory-repo-name>

      # bash
      ../mavenimport.sh -r http://localhost/nexus/repository/<your-nexus-repo-name>/ -u admin -p admin

      # cmd
      ../mavenimport.sh -r http://host.docker.internal/nexus/repository/<your-nexus-repo-name>/ -u admin -p admin
      ------------------------------------------------------------------------------------------------------------
      ```

> [!TIP]
> Some metadata is not imported due to different Artifactory format,  
> but can be generated by Nexus Task function.  
> access http://localhost/nexus/#admin/system/tasks  
> `+Create task` > `Repair - Rebuild Maven repository metadata (maven-metadata.xml)`

## Notes on SonarQube Version Upgrade
You may need to go through a specific version of SonarQube to upgrade.
See link for details.
https://docs.sonarsource.com/sonarqube/latest/setup-and-upgrade/upgrade-the-server/determine-path

If you need to change the version of SonarQube in dev-servers to go through with the upgrade,  
change the `VERSION_SCA` in the .env file.