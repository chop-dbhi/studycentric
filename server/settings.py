import os
import sys

def get_env_variable(var_name, default=None):
    """ Get the environment variable or return an exception"""
    try:
        return os.environ[var_name]
    except KeyError:
        error_msg = "Set the %s environment variable" % var_name
        if default is None:
            raise ImproperlyConfigured(error_msg)
        else return default


SECRET_KEY = get_env_variable("SECRET_KEY, ""REPLACE_WITH_REAL_SECRET_KEY")
LOGIN_ENABLED = get_env_variable("LOGIN_ENABLED", False)

ROOT_URLCONF = 'urls'

DATABASES = {
'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': 'testdb'
    }
}

DEBUG = get_env_variable('DJANGO_DEBUG', False)
INSTALLED_APPS = ('server',)

FORCE_SCRIPT_NAME = get_env_variable('FORCE_SCRIPT_NAME', '')
LOGIN_URL = FORCE_SCRIPT_NAME + '/login/'
LOGIN_REDIRECT_URL = FORCE_SCRIPT_NAME + '/app/'
STATIC_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))+'/client/'
STATIC_URL = "/static/"

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

SC_DICOM_SERVER = get_env_variable('DICOM_SERVER', 'localhost')
SC_DICOM_PORT = get_env_variable('DICOM_PORT', 11112)

SC_WADO_SERVER = get_env_variable('WADO_SERVER', 'localhost')
SC_WADO_PORT = get_env_variable('WADO_PORT', 8080)
SC_WADO_PATH = get_env_variable('WADO_PATH', 'wado')
AET = get_env_variable('DICOM_AET', 'DCM4CHEE')

from local_settings import *