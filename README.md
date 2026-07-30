# Installing

## Crontab

  PATH=/home/jdlrobson/.nvm/versions/node/v21.1.0/bin/:$PATH
  15 * 23 * * BASH_ENV=/etc/profile /srv/seed.sh >> /srv/talky.log 2>&1

## seed.sh

cd /var/www/wikitalky && git stash && git pull origin main && node populate.js && cp projects.json topics.json index.html main.js /var/www/wikitalky
