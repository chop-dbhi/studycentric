# StudyCentric

FROM ubuntu:vivid

MAINTAINER Jeff Miller "millerjm1@email.chop.edu"

RUN apt-get update -qq --fix-missing
RUN apt-get install -y python2.7
RUN apt-get install -y libgdcm2.4
RUN apt-get install -y python-gdcm
RUN apt-get install -y python-pip

# Python dependencies
RUN pip install "Django==1.5"
RUN pip install "requests"
RUN pip install "pydicom"
RUN pip install "uWSGI"

ADD . /opt/app

# Ensure all python requirements are met
ENV APP_NAME STUDYCENTRIC

CMD ["/opt/app/scripts/http.sh"]

EXPOSE 8000
