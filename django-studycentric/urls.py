from views import *
from django.conf.urls import patterns, url

urlpatterns = patterns('',
   url(r'^study/(?P<study_iuid>[0-9.]+)/$', study),
   url(r'^series/(?P<series_iuid>[0-9.]+)/$', series),
)
