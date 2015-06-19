#!/bin/bash

APP_DIR=/opt/app/
cd $APP_DIR

if [ "$LOGIN_ENABLED" = "1" ]; then
    PYTHONPATH=$PYTHONPATH:`pwd` DJANGO_SETTINGS_MODULE='server.settings' django-admin.py syncdb --noinput
    if [ -n "$DJANGO_ADMIN_USER" ] && [ -n "$DJANGO_ADMIN_EMAIL" ] && [ -n "$DJANGO_ADMIN_PASSWORD" ]; then
        echo "Creating admin user"
        echo "from django.contrib.auth.models import User; User.objects.create_superuser('"$DJANGO_ADMIN_USER"', '"$DJANGO_ADMIN_EMAIL"', '"$DJANGO_ADMIN_PASSWORD"')" | PYTHONPATH=$PYTHONPATH:`pwd` DJANGO_SETTINGS_MODULE='server.settings' django-admin.py shell
    elif [ -n "$DJANGO_ADMIN_USER" ] && [ -n "$DJANGO_ADMIN_EMAIL" ]; then
        echo "Creating admin user with no password"
        PYTHONPATH=$PYTHONPATH:`pwd` DJANGO_SETTINGS_MODULE='server.settings' django-admin.py createsuperuser --noinput --username=$DJANGO_ADMIN_USER --email=$DJANGO_ADMIN_EMAIL
    fi 
fi

# Write the config file that the JS client requires
python /opt/app/scripts/write_config.py

exec /usr/local/bin/uwsgi --die-on-term --chdir /opt/app --uwsgi-socket 0.0.0.0:8000 -p 4 -b 32768 -T --master --max-requests 5000 --static-map /static=/opt/app/client --module wsgi:application --mount /proband_connect=wsgi.py --manage-script-name
