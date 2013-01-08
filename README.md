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

StudyCentric is web-based DICOM image viewer for use with research applications. The application communicates with a DICOM PACS via the DICOM protocol (both standard DICOM C-FIND queries and via [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF)). The standard DICOM communication is executed using a very small Ruby web-service (the server). The rest of application runs entirely in the web browser using JavaScript. 

StudyCentric not a full PACS viewer, it is meant to be deployed within a larger application to view specific DICOM studies. It contains no patient or image search functionality. The expected workflow would be something like the following:

1. A researcher looks through a database and finds that there are relevant studies.
1. The database provides links to StudyCentric, each configured with the Study UID of a study.
1. The researcher clicks the link, which launches StudyCentric, telling it to display a particular image study.

To view a study, navigate to the url where StudyCentric is installed and pass it the DICOM StudyUID within the parameter list:

```http://yourinstitution.edu/studycentric/?studyUID=1.2.323.32.3.356 ```

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
1. StudyCentric is currently not working in IE 8 (untested in IE 9) due to inclusion of a BigDecimal library that is not working in IE. We are currently working on a fix.
1. We have seen issues with the ruby server being exceptionally slow on CentOS when using Ruby 1.9.2 and ruby-dicom 0.9.4. Downgrading to Ruby 1.8.7 and ruby-dicom 0.9.1 seems to remedy this, but requires a small change to the server code. Please use the code branch called ruby1.8.7 if using ruby-dicom 0.9.1 on Ruby 1.8.7.

## Requirements

1. [Sinatra](http://www.sinatrarb.com/)
2. [ruby-dicom](http://github.com/dicom/ruby-dicom)


# Installation

## Installing a PACS
This is a bit beyond the scope of this README but you will need to store your images in a DICOM compatible [PACS](http://en.wikipedia.org/wiki/Picture_archiving_and_communication_system) that supports [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF).  All of our internal instances use the open source [DCM4CHEE](http://www.dcm4che.org/confluence/display/ee2/Home) PACS.

Both the Server and the Client will need to communicate with the PACS system. The server executes all communication that requires speaking the standard DICOM protocol or manipulating binary files, but the client executes WADO requests (HTTP requests) for images directly. There are three basic ways you can choose to make the PACS WADO port available to the client(by default on DCM4CHEE it is port 8080):

1. Make the WADO port directly available to the StudyCentric client. Please note, the WADO protocol will serve up both jpg images (which is what the StudyCentric client requires) and the DICOM files themselves (this functionality is only used by the StudyCentric server, not the client). If you choose this option, all users will technically be able to request the entire DICOM file giving them access to all metadata about the study in the DICOM file (the level of information in the file will depend on your anonymization process) as opposed to simply being able to see the information that the client displays (the images, the pixel spacing data, the study description and the series descriptions). This may or not be what you want.
1. Make the WADO port of your DICOM server available to the client via a reverse proxy. This would allow you to restrict the types of requests you allow a user to make of the WADO server, for example, dropping all WADO requests for a contenttype of WADO and only allowing JPEG requests through. 
1. Proxy through the StudyCentric server. The StudyCentric client has an endpoint that will proxy requests through to the DICOM WADO server, attempting to drop any requests for the DICOM files (use this at your own risk). You can use this by configuring the client's WADO server setting (see below) to point to the /wado endpoint of the StudyCentric server. This method has not been tested for security or performance and will likely be slower than the above two options as it will require that every request for an image go through a Ruby interpreter.

## Installing the server

The StudyCentric server is a very simple Sinatra Ruby app. It can be installed a number of ways. Our internal instances serve the application from [Apache using the Passenger Phusion module](http://www.pastbedti.me/2009/11/deploying-a-sinatra-app-with-apache-and-phusion-passenger-a-k-a-mod_rack/), but there are other [options](http://www.kalzumeus.com/2010/01/15/deploying-sinatra-on-ubuntu-in-which-i-employ-a-secretary/). Sinatra is fully compatible with [Rack](http://en.wikipedia.org/wiki/Rack_(web_server_interface\)) so any web server capable of deploying a Rack application will work.

### Server Ruby gem requirements
1. ruby 1.9.2
1. ruby-dicom (version 0.9.4)
1. sinatra
1. sinatra-contrib

### Server Configuration

You need to configure the server so it knows the location of your DICOM PACS. In the server directory there is a config.yml file that needs to be configured. It requires that you fill in the following configuration options:

* dicom\_server\_host: the hostname of your DICOM server (PACS)
* ae: the [Application Entity](http://www.dabsoft.ch/dicom/8/C.1/) of your DICOM Server
* dicom\_server\_port: the port of your DICOM server (default is 11112)
* wado\_server\_host: the hostname of your WADO server (should be the same as your DICOM server)
* wado\_server\_port: the port your WADO service is running on (defaults to 8080 on DCM4CHEE)

You will also need to configure the client (see below) so it knows where you have installed the StudyCentric server.

## Installing the client
The StudyCentric client is written entirely in JavaScript and HTML. It can be installed  by serving the client directory from your preferred web server.
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
    EnableReportConcern:false,
    ReportConcernUrl:"../concerns/",
    ReportConcernEmail:"Enter Email"
});
```
This file must be configured properly to match your PACS server and StudyCentric Server configuration. Descriptions of each option are outlined below:

* StudyCentricProt: This must be set to the protocol you are using to serve the * StudyCentric server (either http or https)
* StudyCentricHost: This host of your StudyCentric server
* StudyCentricPath: The url path to the StudyCentric server
* StudyCentricPort: The port you are serving the StudyCentric server from
* WADOProt: The protocol you are serving the WADO service from (http or https)
* WADOHost: The hostname of your WADO server
* WADOPath: The url path to your WADO server
* WADOPort: The port of the wado service (by default on DCM4CHEE this is 8080)

The next five options affect the appearance of the client:
* InstanceThumbNailSizePx: This controls the size of the image thumbnails that appear in the right-hand side series preview drawer.
* SeriesThumbNailSizePx: This controls the thumbnail size for the Series thumbnails displayed on the left-hand side of the screen.
* DefaultImgSize: This controls the default image size of the displayed image in the center of the screen.
* ImagesPerRow: This controls the number of images displayed per row in the right-hand side series preview drawer.
* DisableClinicalWarning: This controls whether StudyCentric will prompt the user to agree that it is not to be used for clinical or diagnostic purposes. The default is false, so the user will be prompted each time they use the application. It is recommended that this default be used.

### Report a Concern Feature
The last three options affect an optional "Report a Concern Feature". This is meant to help screen studies for potential Protected Health Information. If enabled, this places a button at the top of the screen labeled "Report a Concern". If the user clicks the button while viewing a study it will POST a JSON object to the configured URL to inform you that something in the study requires attention. *Please note that the HTTP service receiving this POST is not part of StudyCentric, you would need to provide it.* The feature is intended for use when StudyCentric is part of a larger PHI screening application. The ReportConcernEmail is displayed to the user in a message asking them to e-mail the study information only if the POST fails.

The JSON object sent is as follows:

```javascript
{
  document: <HTML document containing a link to the study and the image the user was viewing>,
  comment: <Comment entered by the user when they clicked the report button>	
}
```


