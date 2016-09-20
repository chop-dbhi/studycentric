import re
from views import *
from django.conf.urls import url
from django.conf import settings
from django.contrib.auth.decorators import login_required

if not settings.LOGIN_ENABLED:
   login_required = lambda x: x

urlpatterns = [
   url(r'^study/(?P<study_iuid>[0-9.]+)/?$', login_required(study)),
   url(r'^series/(?P<series_iuid>[0-9.]+)/?$', login_required(series)),
   url(r'^object/(?P<instance_uid>[0-9.]+)/?$', login_required(instance)),
   url(r'^wado/?$', login_required(wado)),
]

if settings.LOGIN_ENABLED:
    urlpatterns += [
        url(r'^app/?$', login_required(app_root)),
        # Below enables a simple login that will use the model authorization backend
        # Replace with your own auth system if necessary
        url(r'^login/?$', 'django.contrib.auth.views.login'),
]
