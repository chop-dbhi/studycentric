import os
import sys
from django.conf.urls.defaults import patterns
from django.http import HttpResponse
from local_settings import *

LOGIN_ENABLED = True

ROOT_URLCONF = 'urls'

DATABASES = {
'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': 'testdb'
    }
}

DEBUG = True
INSTALLED_APPS = ('sc_server_django',)

FORCE_SCRIPT_NAME = ''
LOGIN_URL = FORCE_SCRIPT_NAME + '/login/'
LOGIN_REDIRECT_URL = FORCE_SCRIPT_NAME + '/app/'
STATIC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/client/'
STATIC_URL = ""

if LOGIN_ENABLED:
    INSTALLED_APPS += ('django.contrib.sessions', 
                       'django.contrib.auth', 
                       'django.contrib.contenttypes', 
                       'django.contrib.messages', 
                       'django.contrib.admin',
                       'django.contrib.staticfiles',)

    MIDDLEWARE_CLASSES = ('django.contrib.sessions.middleware.SessionMiddleware',
                          'django.contrib.auth.middleware.AuthenticationMiddleware',
                          'django.contrib.messages.middleware.MessageMiddleware',)

    TEMPLATE_DIRS = (STATIC_ROOT,)

SC_DICOM_SERVER = 'localhost'
SC_DICOM_PORT = 11112

SC_WADO_SERVER = 'localhost'
SC_WADO_PORT = 8080
SC_WADO_PATH = 'wado'
