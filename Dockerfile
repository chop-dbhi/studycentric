# StudyCentric

FROM ubuntu:vivid

MAINTAINER Jeff Miller "millerjm1@email.chop.edu"

RUN apt-get update -qq --fix-missing
RUN apt-get install software-properties-common -y
RUN apt-get install -y\
    build-essential\
    git-core\
    libldap2-dev\
    libpq-dev\
    libsasl2-dev\
    libssl-dev\
    libxml2-dev\
    libxslt1-dev\
    libffi-dev\
    openssl\
    wget\
    zlib1g-dev

RUN apt-get install -y python2.7
RUN apt-get install -y python2.7-dev
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
