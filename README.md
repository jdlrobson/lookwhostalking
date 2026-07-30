# Installing

## Crontab

  PATH=/home/jdlrobson/.nvm/versions/node/v21.1.0/bin/:$PATH
  */30 * * * * BASH_ENV=/etc/profile /srv/lookwhostalking/talky.sh >> /srv/talky.log 2>&1

## talky.sh

cd /var/www/wikitalky && git stash && git pull origin main && node populate.js && cp projects.json topics.json index.html main.js /var/www/wikitalky
