#!/bin/sh
PYTHONPATH=`pwd`:`pwd`/.. DJANGO_SETTINGS_MODULE='settings' django-admin.py shell
