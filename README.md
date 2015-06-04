THIS SOFTWARE IS NOT INTENDED FOR PRIMARY DIAGNOSTIC, ONLY FOR SCIENTIFIC USAGE.

THIS SOFTWARE IS NOT CERTIFIED AS A MEDICAL DEVICE FOR PRIMARY DIAGNOSIS. THERE ARE NO CERTIFICATIONS. YOU CAN ONLY USE THIS SOFTWARE AS A REVIEWING AND SCIENTIFIC SOFTWARE, NOT FOR PRIMARY DIAGNOSTIC.

ALL CALCULATIONS, MEASUREMENTS AND IMAGES PROVIDED BY THIS SOFTWARE ARE INTENDED ONLY FOR SCIENTIFIC RESEARCH, NOT FOR DIAGNOSIS.

THE IMAGES DISPLAYED BY THIS VIEWER WHEN USED IN CONJUNCTION WITH THE DCM4CHEE PACS SERVER ARE LOSSY JPEGS AND ARE NOT OF THE SAME QUALITY AS DISPLAYED BY A MEDICAL PACS VIEWER.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
THIS SOFTWARE IS NOT INTENDED FOR PRIMARY DIAGNOSTIC, ONLY FOR SCIENTIFIC USAGE.

# StudyCentric - Research DICOM Viewer

## What is StudyCentric?

StudyCentric is web-based DICOM image viewer for use with research applications. The application communicates with a DICOM PACS via the DICOM protocol (both standard DICOM C-FIND queries and via [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF)). The standard DICOM communication is executed use a simple REST service with implementations available in both ruby (using sinatra) or python (using django). The rest of application runs entirely in the web browser using JavaScript. 

StudyCentric not a full PACS viewer, it is meant to be deployed within a larger application to view specific DICOM studies. It contains no patient or image search functionality. The expected workflow would be something like the following:

1. A researcher looks through a database of patients and finds that there are relevant studies associated.
1. The database provides links to StudyCentric, each configured with the Study UID of a study.
1. The researcher clicks the link, which launches StudyCentric, telling it to display a particular image study.

To view a study, navigate to the url where StudyCentric is installed and pass it the DICOM StudyUID within the parameter list:

```http://yourinstitution.edu/studycentric/?studyUID=1.2.323.32.3.356 ```

## Feedback
All types of feedback is welcome. Please see the [google user group](https://groups.google.com/forum/#!forum/studycentric).

## Screenshot

<center>
<img src="https://raw.github.com/cbmi/studycentric/master/StudyCentric.png"/>
</center>

Displaying the KNIX study from http://www.osirix-viewer.com/datasets/


## Limitations

StudyCentric currently only supports single frame DICOM files. There is not multi-frame support at this time. It has been tested with the following modality types:

* MRI
* CT
* X-ray

### Known Issues
1. We have seen issues with the ruby server being exceptionally slow on CentOS when using Ruby 1.9.2 and ruby-dicom 0.9.4. Downgrading to Ruby 1.8.7 and ruby-dicom 0.9.1 seems to remedy this, but requires a small change to the server code. Please use the code branch called ruby1.8.7 if using ruby-dicom 0.9.1 on Ruby 1.8.7.

## Which server should I use?
The ruby and python implementations both serve the same purpose, which is to speak the binary DICOM protocol required to determine which series are in a given study, and in turn, which objects are in a given series. They implementations are identical except for the following features available only with the Python web service:

1. The python server is noticeably faster.
1. You can require that users authenticate before using the application if you use the python web service. This uses django's auth functionality. See [requiring authorization](#requiring-authorization) below.

## Requirements

### Ruby
1. [Sinatra](http://www.sinatrarb.com/)
2. [ruby-dicom](http://github.com/dicom/ruby-dicom)

### Python
1. [requests](http://docs.python-requests.org/en/latest/) >= 1.2.0
1. [django](https://www.djangoproject.com/) (tested with 1.5)
1. [pydicom](https://code.google.com/p/pydicom/) >= 0.9.8
1. [gdcm](http://gdcm.sourceforge.net/wiki/index.php/Main_Page) with python wrappers >= 2.2.3. See installation instructions in the INSTALL.txt file that comes with the source package (the instructions on the wiki are not as complete). Or see the section [installing gdcm in a virtualenv](#installing-gdcm-in-a-virtualenv) for assistance installing gdcm. On Linux and OS X, the following were required to build.
 1. swig >= 2.0.9
 1. cmake


# Installation

## Installing a PACS
This is a bit beyond the scope of this README but you will need to store your images in a DICOM compatible [PACS](http://en.wikipedia.org/wiki/Picture_archiving_and_communication_system) that supports [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF).  All of our internal instances use the open source [DCM4CHEE](http://www.dcm4che.org/confluence/display/ee2/Home) PACS.

Both the Server and the Client will need to communicate with the PACS system. The server executes all communication that requires speaking the standard DICOM protocol or manipulating binary files, but the client executes WADO requests (HTTP requests) for images directly. There are three basic ways you can choose to make the PACS WADO port available to the client(by default on DCM4CHEE it is port 8080):

1. Make the WADO port directly available to the StudyCentric client. Please note, the WADO protocol will serve up both jpg images (which is what the StudyCentric client requires) and the DICOM files themselves (this functionality is only used by the StudyCentric server, not the client). If you choose this option, all users will technically be able to request the entire DICOM file giving them access to all metadata about the study in the DICOM file (the level of information in the file will depend on your anonymization process) as opposed to simply being able to see the information that the client displays (the images, the pixel spacing data, the study description and the series descriptions). This may or not be what you want.
1. Make the WADO port of your DICOM server available to the client via a reverse proxy. This would allow you to restrict the types of requests you allow a user to make of the WADO server, for example, dropping all WADO requests for a contenttype of WADO and only allowing JPEG requests through. 
1. Proxy through the StudyCentric server. The StudyCentric client has an endpoint that will proxy requests through to the DICOM WADO server, attempting to drop any requests for the DICOM files (use this at your own risk). You can use this by configuring the client's WADO server setting (see below) to point to the /wado endpoint of the StudyCentric server. This method has not been tested for security or performance and will likely be slower than the above two options as it will require that every request for an image go through a Ruby interpreter.

## Installing a server

Either server may be installed.
### Ruby server
The StudyCentric server is a very simple Sinatra Ruby app. It can be installed a number of ways. Our internal instances serve the application from [Apache using the Passenger Phusion module](http://www.pastbedti.me/2009/11/deploying-a-sinatra-app-with-apache-and-phusion-passenger-a-k-a-mod_rack/), but there are other [options](http://www.kalzumeus.com/2010/01/15/deploying-sinatra-on-ubuntu-in-which-i-employ-a-secretary/). Sinatra is fully compatible with [Rack](http://en.wikipedia.org/wiki/Rack_(web_server_interface\)) so any web server capable of deploying a Rack application will work.  See the bottom of this section for a very simple apache configuration.

### Server Ruby gem requirements
1. ruby 1.9.2
1. ruby-dicom (version 0.9.4)
1. sinatra
1. sinatra-contrib

### Server Configuration

You need to configure the server so it knows the location of your DICOM PACS. In the ruby-server directory there is a config.yml file that needs to be configured. It requires that you fill in the following configuration options:

* dicom\_server\_host: the hostname of your DICOM server (PACS)
* ae: the [Application Entity](http://www.dabsoft.ch/dicom/8/C.1/) of your DICOM Server
* dicom\_server\_port: the port of your DICOM server (default is 11112)
* wado\_server\_host: the hostname of your WADO server (should be the same as your DICOM server)
* wado\_server\_port: the port your WADO service is running on (defaults to 8080 on DCM4CHEE)

You will also need to configure the client (see below) so it knows where you have installed the StudyCentric server.

### Sample mod_rack and apache configuration

Most of the sample configurations available on the web show the Rack application mounted at the DocumentRoot in the Apache config, but the configuration below just mounts the server at an arbitrary uri endpoint on your server. This is likely to be what you want since this is just a simple API endpoint that the client accesses and not something like a full Rails application.

This configuration is how we have the server installed in development on a [Vagrant](http://www.vagrantup.com/) box with [RVM](https://rvm.io/) installed. The api endpoint is `/server`. The git repository has been cloned into /vagrant/studycentric. The client will be accessible at `/client`.

    LoadModule passenger_module /home/vagrant/.rvm/gems/ruby-1.9.2-p320/gems/passenger-3.0.19/ext/apache2/mod_passenger.so
    PassengerRoot /home/vagrant/.rvm/gems/ruby-1.9.2-p320/gems/passenger-3.0.19
    PassengerRuby /home/vagrant/.rvm/wrappers/ruby-1.9.2-p320/ruby

    <VirtualHost *:80>
          DocumentRoot /vagrant/studycentric

          <LocationMatch ^/server>
              PassengerAppRoot /vagrant/studycentric/ruby-server
              RackBaseURI /server
          </LocationMatch>

          <Directory /vagrant/studycentric/ruby-server>
             # This relaxes Apache security settings.
             AllowOverride all
             # MultiViews must be turned off.
             Options -MultiViews
          </Directory>
    </VirtualHost>

### Python server

The python server is a simple django application. There are many different ways to deploy a django application in production so it won't be covered here, but the application directory in the repository is sc_server_django/. Some sample nginx and uwsgi configurations are included in the project, but they are optional.

There are a few configuration variables that need to be set in the settings.py file.

* SC\_DICOM\_SERVER: hostname of your DICOM server
* SC\_DICOM\_PORT: DICOM port of your DICOM server
* SC\_WADO\_SERVER: hostname of your WADO server. Should be the same as your DICOM server.
* SC\_WADO\_PORT: WADO port on your DICOM server.
* SC\_WADO\_PATH: path the WADO server is mounted at. Usually /wado.
* AET : the [Application Entity](http://www.dabsoft.ch/dicom/8/C.1/) of your DICOM Server

#### Creating a virtualenv and installing dependencies

All dependencies except gdcm can be installed by creating a virtualenv and executing the following command from the root of the github repo

    pip install -r sc_server_django/requirements.txt
    
Because gdcm is a c library with python wrappers, installing it is a bit more manual.

##### Installing gdcm in a virtualenv

Following the gdcm installation instructions should work fine, but this section will provide a little more assistance.  These instructions assume a unix-like environment.

1. Create your python virtualenv and activate it. Making the root of the git repository your virutalenv root is probably the easiest.
1. Make sure cmake and swig are installed.
1. Download gdcm and unzip it. Rename the directory it unzips into to `gdcm`.
1. Create a directory at the same level as the `gdcm` directory called `gdcmbin` and descend into it.
1. Run the following commands
   1. ccmake ../gdcm
        1. A configure app will open up. Make sure to turn on python wrappers and shared libraries. It's a little tricky, but just follow the instructions at the bottom of the screen.
   1. make
1. Copy the following files from `gdcm/bin` to your virtualenv's `site-packages` folder.
   1. gdcm.py
   1. gdcmswig.py
   1. _gdcmswig.so

*Note* in the most recent version of GDCM we have tested (gdcm 2.4.4 with Swig-3.0.5) on REDHat I ran into two problems.

1. gdcmswig.py uses the reserved Python keyword "as" for a variable name in the function SetAbstractSyntax. This needs to be changed to something else. Anything should do. It needs to be changed in the function body as well. I have opened a [ticket](https://sourceforge.net/p/gdcm/bugs/345/) and it should be fixed soon.
1. Segmentation Fault caused by code in the function System::GetLocaleCharset() in Source/Common/gdcmSystem.cxx. This has to do with the c system call setlocale returning NULL. On our particular machine we needed to set LC_CTYPE="en_US.UTF-8" in `/etc/sysconfig/i18n`. Thanks to [stackoverflow](http://serverfault.com/questions/320971/centos-6-and-locale-error). On your system you will need to resolve any errors that calling `locale` at the command line returns.

#### Requiring Authorization
The original intention of StudyCentric was to make it a simple JavaScript/HTML only app that hits a simple web service only when absolutely required for browser limitations or performance reasons. If that is all you need, you can still do this. Simply run the service as is. Realistically, because of the nature of this type of application, you may have authorization requirements. You can accomplish this at the webserver level with something like http basic auth, but for a better user experience the python backend can be configured to require authentication. There is a setting for the python server that will essentially turn the app into a django app that requires the user to authenticate. Basically, instead of pointing users to the StudyCentric index.html static file, you point them to a url endpoint `app/` that will require authentication before showing anything. 
##### Enabling authorization
As this turns the project into a more complex django application, this may require some knowledge of django, but this guide will try to walk through all the steps.

1. Set the `LOGIN_ENABLED` setting to `True` in your django settings.py file. 
1. You need a django database backend to hold the authorization and session information (this is required by django when you use its authorization features). By default, StudyCentric will just use sqlite, but you can also change that in your settings.py file.
1. As is typical with django deployments, the actual client static files are not served up by django. You should serve them up with a webserver like apache or nginx. You will need to set the `STATIC_URL` settings in the django settings file to point to the url you are serving the client static files from. The only static file that django will serve up in LOGIN_ENABLED mode is the main index.html for the application. This is because we want to require that the user authorize before using the client at all.

Execute the following command `./run-syncdb.sh`

Then deploy the django app as usual. For testing you can use

     ./run-server.sh

to bring up a local instance running on port 8000.


## Installing the client
The StudyCentric client is written entirely in JavaScript and HTML. It can be installed by serving the client directory from your preferred web server.

### Configuration
In client/js/ there is a JavaScript file called config.js: 

```javascript
// Configuration Options for StudyCentric
define({
    StudyCentricProt:"http",
    StudyCentricHost:"localhost",
    StudyCentricPath:"",
    StudyCentricPort:80,
    WADOHost:"localhost",
    WADOPort:8080,
    WADOProt:"http",
    WADOPath:"wado",
    InstanceThumbNailSizePx:100,
    SeriesThumbNailSizePx:150,
    DefaultImgSize:128,
    ImagesPerRow:3,
    DisableClinicalWarning:false,
    MeasurementPrecision:1,
    EnableReportConcern:false,
    ReportConcernUrl:"../concerns/",
    ReportConcernEmail:"Enter Email"
});
```
This file must be configured properly to match your PACS server and StudyCentric Server configuration. Descriptions of each option are outlined below:

* StudyCentricProt: This must be set to the protocol you are using to serve the StudyCentric server (either http or https)
* StudyCentricHost: This host of your StudyCentric server
* StudyCentricPath: The url path to the StudyCentric server
* StudyCentricPort: The port you are serving the StudyCentric server from
* WADOProt: The protocol you are serving the WADO service from (http or https)
* WADOHost: The hostname of your WADO server
* WADOPath: The url path to your WADO server
* WADOPort: The port of the WADO service (by default on DCM4CHEE this is 8080)


The next five options affect the appearance of the client:

* InstanceThumbNailSizePx: This controls the size of the image thumbnails that appear in the right-hand side series preview drawer.
* SeriesThumbNailSizePx: This controls the thumbnail size for the Series thumbnails displayed on the left-hand side of the screen.
* DefaultImgSize: This controls the default image size of the displayed image in the center of the screen.
* ImagesPerRow: This controls the number of images displayed per row in the right-hand side series preview drawer.
* DisableClinicalWarning: This controls whether StudyCentric will prompt the user to agree that it is not to be used for clinical or diagnostic purposes. The default is false, so the user will be prompted each time they use the application. It is recommended that this default be used.
* MeasurementPrecision: This determines the number of decimal places shown in in the distance measurements (in mm or pixels). It is very important to keep in mind that the measurement tool is not high quality and is not meant to be used for diagnosis. The appearance of images can change across different browsers because StudyCentric requests lossy jpegs from the PACS and interpolation algorithms vary. Care should be taken to not provide a false sense of accuracy by providing more precision than the data and image actually provides.

# Troubleshooting
## Python server
* `No module named site found` when running ./run_server.sh

 The cause of this is likely that your servers/uwsgi/local.ini file is not pointing the correct location of your python virtualenv. The `virtualenv` variable must point to the root of your python virtual environment.
* run_server.sh says no app is found. The web browser shows a 'Server error encountered' message when you try to go to the app

 The cause of this is likely that your uwsgi `chdir` variable is not pointing to the correct directory location. This must point to the directory that contains the file `wsgi.py`.

## General issues
* The page loads, but it is completely blank (no series images load along the left hand side)

 Verify that your StudyCentricHost and your WADOHost variables in the client/js/config.js file are pointing to the correct respective servers. Also verify the associated Port variables.
* The page loads fine, but when you choose a series from the left, the first image does not appear in the center pane
 
 In `client/js/config.js` try changing `JSONP` to `true`. The is likely a CORS (Cross Origin Resource Sharing) issue, and this should fix it.


### Report a Concern Feature
The last three options affect an optional "Report a Concern Feature". This is meant to help screen studies for potential Protected Health Information. If enabled, this places a button at the top of the screen labeled "Report a Concern". If the user clicks the button while viewing a study it will POST a JSON object to the configured URL to inform you that something in the study requires attention. *Please note that the HTTP service receiving this POST is not part of StudyCentric, you would need to provide it.* The feature is intended for use when StudyCentric is part of a larger PHI screening application. The ReportConcernEmail is displayed to the user in a message asking them to e-mail the study information only if the POST fails.

The JSON object sent is as follows:

```javascript
{
  document: <HTML document containing a link to the study and the image the user was viewing>,
  comment: <Comment entered by the user when they clicked the report button>	
}
```


