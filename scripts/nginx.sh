#!/bin/bash

APP_DIR=/opt/app/
cd $APP_DIR

if [ "$LOGIN_ENABLED" = "1" ]; then
    DJANGO_SETTINGS_MODULE='server.settings' django-admin.py syncdb
#    DJANGO_SETTINGS_MODULE='server.settings' django-admin.py createcachetable
fi

# Write the config file that the JS client requires
python /opt/app/scripts/write_config.py

exec /usr/local/bin/uwsgi --die-on-term --chdir /opt/app --uwsgi-socket 0.0.0.0:8000 -p 4 -b 32768 -T --master --max-requests 5000 --static-map /static=/opt/app/client --module wsgi:application --mount /proband_connect=wsgi.py --manage-script-name
