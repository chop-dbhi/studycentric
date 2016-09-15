from django.conf import settings
from django.http import HttpResponse, Http404
from django.template.loader import get_template
from django.template import Context
from django.conf import settings
from requests.auth import HTTPBasicAuth
import cStringIO
import requests
import json
import dicom

# Some DICOM SOP class constants
CT = "1.2.840.10008.5.1.4.1.1.2"
MR = "1.2.840.10008.5.1.4.1.1.4"
XA = "1.2.840.10008.5.1.4.1.1.12.1"
CR = "1.2.840.10008.5.1.4.1.1.1"

STUDY_IUID = (0x20,0xD)
STUDY_DESCR = (0x8, 0x1030)
SERIES_IUID = (0x20,0xE)
SERIES_DESCR = (0x8, 0x103E)
SOP_CLASS_UID = (0x8,0x16)
PIXEL_SPACING = (0x28,0x30)
IMAGER_PIXEL_SPACING = (0x18,0x1164)
WINDOW_CENTER = (0x28,0x1050)
WINDOW_WIDTH =  (0x28, 0x1051)
CALIBRATION_TYPE =  (0x28,0x402)
CALIBRATION_DESCR = (0x28,0x404)

WADO_URL = "%s://%s:%d/%s" % (settings.SC_WADO_PROT, settings.SC_WADO_SERVER, settings.SC_WADO_PORT, 
            settings.SC_WADO_PATH)

ORTHANC_URL = "%s://%s:%d" % (settings.SC_WADO_PROT, settings.SC_WADO_SERVER, settings.SC_WADO_PORT)

def app_root(request):
    document_template = get_template("index.html")
    document = document_template.render(Context({}))
    document = document.replace('var STATIC_URL = "";','var STATIC_URL = "%s";' % settings.STATIC_URL)
    return HttpResponse(document)

def get_orthanc(dicom_id):
    response=requests.post("%s/tools/lookup/" % ORTHANC_URL, data=dicom_id, 
       auth=HTTPBasicAuth(settings.ORTHANC_USER, settings.ORTHANC_PASSWORD))
    return response.json()[0]

def study(request, study_iuid):
    study_locator = get_orthanc(study_iuid)
    
    study = requests.get("%s%s" % (ORTHANC_URL, study_locator['Path']), 
        auth=HTTPBasicAuth(settings.ORTHANC_USER, settings.ORTHANC_PASSWORD)).json()

    response["description"] = study['MainDicomTags']['StudyDescription']
   
    series_ids = study['Series']
    series = requests.get("%s%s/series" % (ORTHANC_URL, study_locator['PATH']), 
        auth=HTTPBasicAuth(settings.ORTHANC_USER, settings.ORTHANC_PASSWORD)).json()

    response["series"] =  [{"description":s['MainDicomTags']['SeriesDescription'],
        "uid": s['MainDicomTags']['SeriesInstanceUID']} for s in series]

    json_response = json.dumps(response)
    
    if request.GET.has_key('callback'):
        json_response =  "(function(){%s(%s);})();" % (request.GET['callback'], json_response) 
    
    return HttpResponse(json_response, content_type="application/json")
    

def series(request, series_iuid):

    series_locator = get_orthanc(series_iuid)

    instances = requests.get("%s%s/series/instances" % (ORTHANC_URL, series_locator['Path']),
        auth=HTTPBasicAuth(settings.ORTHANC_USER, settings.ORTHANC_PASSWORD)).json()

    response = [i["MainDicomTags"]["SOPInstanceUID"] for i in instances]

    json_response = json.dumps(response)
    
    if request.GET.has_key('callback'):
        json_response =  "(function(){%s(%s);})();" % (request.GET['callback'], json_response) 
    
    return HttpResponse(json_response, content_type="application/json")

# Convenience function to get pixel calibration details
def calibrationDetails(dcm_obj):
    details = "Not available."
    calibration_type = None
    calibration_descr = None
    calibration_type = dcm_obj[CALIBRATION_TYPE].value if \
        CALIBRATION_TYPE in dcm_obj else None
    calibration_descr = dcm_obj[CALIBRATION_DESCR].value if \
        CALIBRATION_DESCR in dcm_obj else None
    
    if calibration_type and calibration_descr:
        details = "%s - %s" % (calibration_type, calibration_descr)
    elif calibration_type or calibration_descr:
        details = calibration_type or calibration_descr
    
    return details

# Proxy to WADO server that only allows jpeg or png
def wado(request):
    if request.GET.has_key('contentType') and (request.GET['contentType'] == 'image/jpeg' or request.GET['contentType'] == 'image/png'):
          r = requests.get(WADO_URL, params=request.GET)
          data = r.content
          return HttpResponse(data, content_type=request.GET['contentType'])
    return Http404

def instance(request, instance_uid):

    payload = {'contentType': 'application/dicom', 
               'seriesUID':'',
               'studyUID' :'',
               'objectUID': instance_uid,
               'requestType':'WADO',
               'transferSyntax':'1.2.840.10008.1.2.2'} # explicit big endian
    # explicit little endian is  '1.2.840.10008.1.2.1'
    r = requests.get(WADO_URL, params=payload)
    data = r.content
    file_like = cStringIO.StringIO(data)
    dcm_obj = dicom.read_file(file_like)
    file_like.close()

    modality_type = None
    modality_type = dcm_obj[SOP_CLASS_UID].value if SOP_CLASS_UID in dcm_obj else None
    spacing = None
    xSpacing = None
    ySpacing = None
    pixel_attr = None
    pixel_message = None
    response = {}
    if modality_type in [MR, CT]:
        spacing = dcm_obj[PIXEL_SPACING].value if PIXEL_SPACING in dcm_obj else None
        pixel_attr = PIXEL_SPACING
    elif modality_type in [CR, XA]:
        # The following logic is taken from CP 586
        pixel_spacing = dcm_obj[PIXEL_SPACING].value if PIXEL_SPACING in dcm_obj else None
        imager_spacing = dcm_obj[IMAGER_PIXEL_SPACING].value if IMAGER_PIXEL_SPACING in  dcm_obj else None
        if pixel_spacing:
            if imager_spacing:
                if pixel_spacing == imager_spacing:
                    # Both attributes are present 
                    spacing = imager_spacing
                    pixel_attr = IMAGER_PIXEL_SPACING
                    pixel_message = "Measurements are at the detector plane."
                else:
                    # Using Pixel Spacing
                    spacing = pixel_spacing
                    pixel_attr = PIXEL_SPACING
                    pixel_message = "Measurement has been calibrated, details = %s " % \
                        calibrationDetails(dcm_obj)
            else:
               # Only Pixel Spacing was specified
               spacing = pixel_spacing
               pixel_attr = PIXEL_SPACING
               pixel_message = "Warning measurement may have been calibrated, details: %s. It is not clear" + \
                  " what this measurement represents." % calibrationDetails(dcm_obj)
        elif imager_spacing:
            spacing = imager_spacing
            pixel_attr = IMAGER_PIXEL_SPACING
            pixel_message = "Measurements are at the detector plane."

    # Build up the response
    response["windowCenter"] = None
    response["windowWidth"] = None

    if WINDOW_CENTER in dcm_obj:
        if dcm_obj[WINDOW_CENTER].VM > 1:
            response["windowCenter"] = int(dcm_obj[WINDOW_CENTER].value[0])
        else:
            response["windowCenter"] = int(dcm_obj[WINDOW_CENTER].value)

    if WINDOW_WIDTH in dcm_obj:
        if dcm_obj[WINDOW_WIDTH].VM > 1:
            response["windowWidth"] = int(dcm_obj[WINDOW_WIDTH].value[0])
        else:
            response["windowWidth"] = int(dcm_obj[WINDOW_WIDTH].value)

    # Pixel spacing attributes can contain two values packed like this:
    # x//y
    if spacing:
        xSpacing = ySpacing = spacing[0]
        if len(spacing) > 1:
           ySpacing = spacing[1] 

    response["xSpacing"] = xSpacing
    response["ySpacing"] = ySpacing
    response["pixelMessage"] = pixel_message
    response["pixelAttr"] = pixel_attr
    response["nativeRows"] = dcm_obj.Rows
    response["nativeCols"] = dcm_obj.Columns
    response["studyDescr"] = dcm_obj[STUDY_DESCR].value if STUDY_DESCR in dcm_obj else None
    response["seriesDescr"] = dcm_obj[SERIES_DESCR].value if SERIES_DESCR in dcm_obj else None
    response["objectUID"] = instance_uid
    json_response = json.dumps(response)

    if request.GET.has_key('callback'):
        json_response =  "(function(){%s(%s);})();" % (request.GET['callback'], json_response) 
    return HttpResponse(json_response, content_type="application/json")




