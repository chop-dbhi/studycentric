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

StudyCentric is web-based DICOM image viewer for use with research applications. The application communicates with a DICOM PACS via the DICOM protocol (both standard DICOM C-FIND queries and via [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF)). A REST service implemented in Django speaks DICOM to your PACS and exposes necessary queries to the JavaScript client. The rest of application runs entirely in the web browser using JavaScript/HTML. 

StudyCentric is not a full PACS viewer, it is meant to be deployed within a larger application to view specific DICOM studies. It contains no patient or image search functionality. The expected workflow would be that an external system provides links to StudyCentric that specify the Study UID it should display, like below:

```http://yourinstitution.edu/studycentric/index.html?studyUID=1.2.323.32.3.356```

## Feedback
All types of feedback are welcome. Please see the [google user group](https://groups.google.com/forum/#!forum/studycentric).

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

### Notes: 
There used to be server implementations in both Ruby and Python. Support for Ruby has been dropped in favor of making the whole app available as a Docker image.


You can require that users authenticate before using the application. This uses Django's auth functionality. See [requiring authentiaton](#requiring-authentication) below.

## Your PACS
This is a bit beyond the scope of this README but you will need to store your images in a DICOM compatible [PACS](http://en.wikipedia.org/wiki/Picture_archiving_and_communication_system) that supports [WADO](http://medical.nema.org/dicom/2004/04_18PU.PDF).  All of our internal instances use the open source [DCM4CHEE](http://www.dcm4che.org/confluence/display/ee2/Home) PACS.

Both the Server and the Client will need to communicate with the PACS system. The server executes all communication that requires speaking the standard DICOM protocol or manipulating binary files, but the client executes WADO requests (HTTP requests) for images directly. There are three basic ways you can choose to make the PACS WADO port available to the client(by default on DCM4CHEE it is port 8080):

1. Make the WADO port directly available to the StudyCentric client. Please note, the WADO protocol will serve up both jpg images (which is what the StudyCentric client requires) and the DICOM files themselves (this functionality is only used by the StudyCentric server, not the client). If you choose this option, all users will technically be able to request the entire DICOM file giving them access to all metadata about the study in the DICOM file (the level of information in the file will depend on your anonymization process) as opposed to simply being able to see the information that the client displays (the images, the pixel spacing data, the study description and the series descriptions). This may or not be what you want.
1. Make the WADO port of your DICOM server available to the client via a reverse proxy. This would allow you to restrict the types of requests you allow a user to make of the WADO server, for example, dropping all WADO requests for a contenttype of WADO and only allowing JPEG requests through. 
1. Proxy through the StudyCentric server. The StudyCentric client has an endpoint that will proxy requests through to the DICOM WADO server, attempting to drop any requests for the DICOM files (use t
his at your own risk). You can use this by configuring the client's WADO server setting (see below) to point to the /wado endpoint of the StudyCentric server. This method has not been tested for security or performance and will likely be slower than the above two options.

## Running with Docker

The easiest way to get the app up and running is to use Docker. This README will cover deployment with docker only. If you want to deploy the app yourself, there are instructions in this repo's wiki.

### Building the docker image

Clone this repository and run the following command:
    
    docker build -t studycentric .

### Configuration

The following environment variables will allow you to configure StudyCentric. While most variables have defaults, you will probably need to at least set `DICOM_SERVER`. Below is a list of the variables and what they do:
   
    DICOM_SERVER: This is the ip address of your PACS. Defaults to "localhost".
    DICOM_PORT: This is the DICOM port of your PACS. Defaults to 11112.
    WADO_SERVER: This is the server exposing the WADO service that StudyCentric will talk to. Defaults to the value set for `DICOM_SERVER`.
    WADO_PORT: This is the port for the WADO service that your StudyCentric will talk to. Defaults to 8080.
    WADO_PATH: This the path in URI to the WADO service that your StudyCentric will speak to. Defaults to 'wado'.
    WADO_PROT: This is the protocol your WADO service is running on (http or https). Defaults to http.
    DICOM_AET: The AET of your PACS. Defaults to DCM4CHEE.

    LOGIN_ENABLED: Enable Django authorization. See the Require Authorization section below. Defaults to 0 for false.
    DJANGO_DB_NAME: Set the name of the sqlite database Django will use if you set LOGIN_ENABLED to 1. Defaults to "database.db".
    DJANGO_ADMIN_USER: Set Django admin superuser name.
    DJANGO_ADMIN_EMAIL: Set Django admin superuser email.
    DJANGO_ADMIN_PASSWORD: Set Django admin superuser password.

    INSTANCE_THUMBNAIL_SIZE_PX: This controls the size of the image thumbnails that appear in the right-hand side series preview drawer. Defaults to 100.
    SERIES_THUMBNAIL_SIZE_PX: This controls the thumbnail size for the Series thumbnails displayed on the left-hand side of the screen. Defaults to 150.
    DEFAULT_IMG_SIZE: This controls the default image size of the displayed image in the center of the screen. Defaults to 128.
    IMAGES_PER_ROW: This controls the number of images displayed per row in the right-hand side series preview drawer. Defaults to 3
    DISABLE_CLINICAL_WARNING: This controls whether StudyCentric will prompt the user to agree that it is not to be used for clinical or diagnostic purposes. The default is false, so the user will be prompted each time they use the application. It is recommended that this default be used. Defaults to False.
    MEASUREMENT_PRECISION: This determines the number of decimal places shown in in the distance measurements (in mm or pixels). It is very important to keep in mind that the measurement tool is not high quality and is not meant to be used for diagnosis. The appearance of images can change across different browsers because StudyCentric requests lossy jpegs from the PACS and interpolation algorithms vary. Care should be taken to not provide a false sense of accuracy by providing more precision than the data and image actually provides. Defaults to 1.
    JSONP: Enable JSONP for ajax requests. Defaults to 1 for true.
    HOVER_COLOR: You can change the default color when you hover over measurements. Defaults to #FFAA56.
    HINT_COLOR: Change the default color of hint lines between measurement bars measurement text. Defaults to #FFFFFF.
    MEAUREMENT_COLOR: Change the default color of measurements. Defaults to #00FF00.
    PNG: Request lossless pngs from your WADO server instead of JPEGs. Defaults to false.
    
    The following variables are available in the event that you need to force your client to make WADO requests (which is how it obtains the actual images it displays) to a different PACS then specified above. This would only happen in a situation where the network you are serving StudyCentric to does not have direct access to your PACS and it needs to go through some sort of proxy. See the [Your PACS](#your-pacs) section for more details. If your client can talk directly to your PACS you can ignore these variables completely.

    CLIENT_WADO_HOST: WADO host you want your client to talk to.
    CLIENT_WADO_PORT: Port the WADO service is running on 
    CLIENT_WADO_PROT: Protocol the WADO service is using (http or https)
    CLIENT_WADO_PATH: Path to the WADO service on 
    
    ##### Report a Concern Feature
    
    ENABLE_REPORT_CONCERN
    REPORT_CONCERN_URL
    REPORT_CONCERN_EMAIL
    
    The last three options affect an optional "Report a Concern" feature. This is meant to help screen studies for potential Protected Health Information(PHI). If `ENABLE_REPORT_CONCERN` is set to 1, this places a button at the top of the screen labeled "Report a Concern". If the user clicks the button while viewing a study it will POST a JSON object to the `REPORT_CONCERN_URL` to inform you that something in the study requires attention. *Please note that the HTTP service receiving this POST is not part of StudyCentric, you would need to provide it.* The feature is intended for use when StudyCentric is part of a larger PHI screening application. The `REPORT_CONCERN_EMAIL ` is displayed to the user in a message asking them to e-mail the study information only if the POST fails.

    The JSON object sent is as follows:

    ```javascript
    {
      document: <HTML document containing a link to the study and the image the user was viewing>,
      comment: <Comment entered by the user when they clicked the report button>    
    }
    ```

### Running
Once the configuration is set, you can run the image as follows. This assumes that you have put all of the necessary variables above into a docker environment variable file called `env_vars` and want to expose the service on port 8000 of your docker host.

     docker run -p 8000:8000 --env-file=env_vars studycentric

The server should be available at `http://yourdockerhost:8000/static/index.html?studyUID=<Enter a valid DICOM study uid>` unless you turned on `LOGIN_ENABLED` in which case it will be `http://yourdockerhost:8000/app/?studyUID=<Enter a valid DICOM study uid>`. Read the next section for more details on this feature.

#### Requiring Authentication
The original intention of StudyCentric was to make it a simple JavaScript/HTML only app that hits a simple web service only when absolutely required for browser limitations or performance reasons. If that is all you need, you can still do this. Simply run the service as is. Realistically, because of the nature of this type of application, you may have authorization requirements. You can accomplish this at the webserver level with something like http basic auth, but for a better user experience the server can be configured to require authentication. If the `LOGIN_ENABLED` environement variable is set to 1, it will essentially turn the app into a Django app that requires the user to authenticate. Basically, instead of pointing users to the StudyCentric index.html static file, you point them to the url endpoint `app/` that will require authentication before showing anything. 

##### Enabling authentication
As this turns the project into a more complex django application, this may require some knowledge of django, but this guide will try to walk through all the steps.

1. Set the `LOGIN_ENABLED` environment variable to 1. 
1. You need a Django database backend to hold the authorization and session information (this is required by Django when you use its authorization features). By default, StudyCentric will create a sqlite database (the location and name of which you can control with the `DJANGO_DB_NAME` environment variable), but you can change this by using docker to mount a local_settings.py file into /opt/app/server/ with the proper Django server settings. You can also use this method to add any middleware or custom authentication backends you might need. The login screen is pretty barebones- you can override it by mounting a custom template to `/opt/server/templates/registration/login.html`.  If you want to create a superuser for your Django database, you must set the `DJANGO_ADMIN_USER`, `DJANGO_ADMIN_EMAIL` and (optionally, depending on whether you have a custom authorization backend) `DJANGO_ADMIN_PASSWORD` environment variables. If you do not, no super user will be created, and if you have not set up a custom authentication backend you will not be able to login.

# Troubleshooting

* The page loads, but it is completely blank (no series images load along the left hand side)

 Verify that your  `DICOM_SERVER` and associated environment variables are set correctly.

* The page loads fine, but when you choose a series from the left, the first image does not appear in the center pane
 Try changing `JSONP` environment variable to 1. The is likely a CORS (Cross Origin Resource Sharing) issue, and this
 should fix it.


