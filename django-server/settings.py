import os
import sys
from django.conf.urls.defaults import patterns
from django.http import HttpResponse
from local_settings import *

filepath, extension = os.path.splitext(__file__)

ROOT_URLCONF = 'urls'

sys.path.append("..")

DATABASES = {
'default': {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': 'testdb'
    }
}

DEBUG = True

INSTALLED_APPS = (os.path.split(os.path.split(__file__)[0])[1],)

SC_DICOM_SERVER = 'localhost'
SC_DICOM_PORT = 11112

SC_WADO_SERVER = 'localhost'
SC_WADO_PORT = 8080
SC_WADO_PATH = 'wado'
