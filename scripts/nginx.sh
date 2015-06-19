#!/bin/bash

APP_DIR=/opt/app/
cd $APP_DIR

if [ "$LOGIN_ENABLED" = "1" ]; then
    DJANGO_SETTINGS_MODULE='server.settings' django-admin.py syncdb --noinput
    if [ -z "$DJANGO_ADMIN_USER" ] && [ -z "$DJANGO_ADMIN_EMAIL" ] && [-z "$DJANGO_ADMIN_PASSWORD"]; then 
        echo "from django.contrib.auth.models import User; User.objects.create_superuser('"$DJANGO_ADMIN_USER"', '"$DJANGO_ADMIN_EMAIL"', '"$DJANGO_ADMIN_PASSWORD"')" | DJANGO_SETTINGS_MODULE='server.settings' django-admin.py shell
    elif [ -z "$DJANGO_ADMIN_USER" ] && [ -z "$DJANGO_ADMIN_EMAIL" ]; then
        DJANGO_SETTINGS_MODULE='server.settings' django-admin.py createsuperuser --username=$DJANGO_ADMIN_USER --email=$DJANGO_ADMIN_EMAIL
    fi 
fi

# Write the config file that the JS client requires
python /opt/app/scripts/write_config.py

exec /usr/local/bin/uwsgi --die-on-term --chdir /opt/app --uwsgi-socket 0.0.0.0:8000 -p 4 -b 32768 -T --master --max-requests 5000 --static-map /static=/opt/app/client --module wsgi:application --mount /proband_connect=wsgi.py --manage-script-name
