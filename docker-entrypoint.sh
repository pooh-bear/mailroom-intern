#/bin/sh

cp /var/www/html/index.html /tmp/index.html.old
# replace env vars in index.html
envsubst < /var/www/html/index.html > /tmp/index.html.new  && cp /tmp/index.html.new /var/www/html/index.html

# run nginx
nginx -g 'daemon off;'