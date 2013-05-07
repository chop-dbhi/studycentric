from django.conf import settings
from django.http import HttpResponse, Http404
import cStringIO
import requests
import gdcm
import json
import dicom

# Some DICOM SOP class constants
CT = "1.2.840.10008.5.1.4.1.1.2"
MR = "1.2.840.10008.5.1.4.1.1.4"
XA = "1.2.840.10008.5.1.4.1.1.12.1"
CR = "1.2.840.10008.5.1.4.1.1.1"

STUDY_IUID = (0x20,0xD)
STUDY_DESCR = (0x8,0x1030)
SERIES_IUID = (0x20,0xE)
SERIES_DESCR = (0x8, 0x103E)
SOP_CLASS_UID = (0x8,0x16)
PIXEL_SPACING = (0x28,0x30)
IMAGER_PIXEL_SPACING = (0x18,0x1164)
WINDOW_CENTER = (0x28,0x1050)
WINDOW_LEVEL =  (0x28, 0x1051)
CALIBRATION_TYPE =  (0x28,0x402)
CALIBRATION_DESCR = (0x28,0x404)

WADO_URL = "http://%s:%d/%s" % (settings.SC_WADO_SERVER, settings.SC_WADO_PORT, 
            settings.SC_WADO_PATH)

def calibration_details(dcm_obj):
    pass

def study(request, study_iuid):
    # Patient Name
    response = {}
    study_iuid_tag = gdcm.Tag(0x20,0xD)
    study_iuid_element = gdcm.DataElement(study_iuid_tag)
    study_descr_tag = gdcm.Tag(0x8,0x1030)
    study_descr_element = gdcm.DataElement(study_descr_tag)
    study_iuid_element.SetByteValue(str(study_iuid), gdcm.VL(len(study_iuid)))
    ds = gdcm.DataSet()
    ds.Insert(study_iuid_element)
    ds.Insert(study_descr_element)
    cnf = gdcm.CompositeNetworkFunctions()
    theQuery = cnf.ConstructQuery(gdcm.eStudyRootType, gdcm.eStudy, ds)

    # prepare the variable for output
    ret = gdcm.DataSetArrayType()
    # Execute the C-FIND query
    cnf.CFind(settings.SC_DICOM_SERVER, settings.SC_DICOM_PORT,
            theQuery, ret, 'GDCM_PYTHON', settings.AET)

    response["description"] = str(ret[0].GetDataElement(study_descr_tag).GetValue())
    
    ds = gdcm.DataSet()
    
    series_descr_tag = gdcm.Tag(0x8,0x103E)
    series_descr_element = gdcm.DataElement(series_descr_tag)
    series_iuid_tag = gdcm.Tag(0x20,0xE)
    series_iuid_element =  gdcm.DataElement(series_iuid_tag)
    series_number_tag = gdcm.Tag(0x20,0x11)
    series_number_element = gdcm.DataElement(series_number_tag)
    
    ds.Insert(study_iuid_element)
    ds.Insert(series_descr_element)
    ds.Insert(series_iuid_element)
    ds.Insert(series_number_element)

    series_query = cnf.ConstructQuery(gdcm.eStudyRootType, gdcm.eSeries, ds)
    ret = gdcm.DataSetArrayType()
    cnf.CFind(settings.SC_DICOM_SERVER, settings.SC_DICOM_PORT, series_query,
            ret, 'GDCM_PYTHON', settings.AET)

    sorted_ret = sorted(ret, key = lambda x: int(str(x.GetDataElement(series_number_tag).GetValue())))

    response["series"] =  [{"description":str(x.GetDataElement(series_descr_tag).GetValue()),
        "uid": str(x.GetDataElement(series_iuid_tag).GetValue())} for x in sorted_ret]

    
    json_response = json.dumps(response)
    
    if request.GET.has_key('callback'):
        json_response =  "(function(){%s(%s);})();" % (request.GET['callback'], json_response) 
    
    return HttpResponse(json_response, content_type="application/json")
    

def series(request, series_iuid):

    series_iuid_tag = gdcm.Tag(0x20,0xE)
    series_iuid_element =  gdcm.DataElement(series_iuid_tag)
    series_iuid_element.SetByteValue(str(series_iuid), gdcm.VL(len(series_iuid)))
    instance_uid_tag = gdcm.Tag(0x8, 0x18)
    instance_uid_element = gdcm.DataElement(instance_uid_tag)
    instance_number_tag = gdcm.Tag(0x20,0x13)
    instance_number_element = gdcm.DataElement(instance_number_tag)

    ds = gdcm.DataSet()
    ds.Insert(series_iuid_element)
    ds.Insert(instance_uid_element)
    ds.Insert(instance_number_element)

    cnf = gdcm.CompositeNetworkFunctions()

    instance_query = cnf.ConstructQuery(gdcm.eStudyRootType, gdcm.eImage, ds)
    ret = gdcm.DataSetArrayType()
    cnf.CFind(settings.SC_DICOM_SERVER, settings.SC_DICOM_PORT, instance_query,
            ret, 'GDCM_PYTHON', settings.AET)

    sorted_ret = sorted(ret, key = lambda x: int(str(x.GetDataElement(instance_number_tag).GetValue())))
    response = [str(x.GetDataElement(instance_uid_tag).GetValue()) for x in sorted_ret]

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
        dcm_obj.has_key(CALIBRATION_TYPE) else None
    calibration_descr = dcm_obj[CALIBRATION_DESCR].value if \
        dcm_obj[CALIBRATION_DESCR].has_key(CALIBRATOIN_DESCR) else None
    
    if calibration_type and calibration_descr:
        details = "%s - %s" % (calibration_type, calibration_descr)
    elif calibration_type or calibration_descr:
        details = calibration_type or calibration_descr
    
    return details


# Proxy to WADO server that only allows jpeg or png
def wado(request):
    if request.GET.has_key('contentType') and (request.GET['contentType'] == 'image/jpeg' or request.GET['contentType'] == 'image/png'):
          r = requests.get(WADO_URL, request.GET)
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
    modality_type = dcm_obj[SOP_CLASS_UID].value if dcm_obj.has_key(SOP_CLASS_UID) else None
    spacing = None
    xSpacing = None
    ySpacing = None
    pixel_attr = None
    pixel_message = None
    response = {}
    if modality_type in [MR, CT]:
        spacing = dcm_obj[PIXEL_SPACING].value if dcm_obj.has_key(PIXEL_SPACING) else None
        pixel_attr = PIXEL_SPACING
    elif modality_type in [CR, XA]:
        # The following logic is taken from CP 586
        pixel_spacing = dcm_obj[PIXEL_SPACING].value if dcm_obj.has_key(PIXEL_SPACING) else None
        imager_spacing = dcm_obj[IMAGER_PIXEL_SPACING].value if dcm_obj.has_key(IMAGER_PIXEL_SPACING) else None
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
    response["windowCenter"] = int(dcm_obj[WINDOW_CENTER].value.split("\\")[0]) if dcm_obj.has_key(WINDOW_CENTER) and dcm_obj[WINDOW_CENTER].value else None
    response["windowWidth"] = int(dcm_obj[WINDOW_LEVEL].value.split("\\")[0]) if dcm_obj.has_key(WINDOW_LEVEL) and dcm_obj[WINDOW_LEVEL].value else None

    # Pixel spacing attributes can contain two values packed like this:
    # x//y
    if spacing:
        spacing = spacing.split("\\")
        xSpacing = ySpacing = spacing[0]
        if len(spacing) > 1:
           ySpacing = spacing[1] 

    response["xSpacing"] = xSpacing
    response["ySpacing"] = ySpacing
    response["pixelMessage"] = pixel_message
    response["pixelAttr"] = pixel_attr
    response["nativeRows"] = dcm_obj.Rows
    response["nativeCols"] = dcm_obj.Columns
    response["studyDescr"] = dcm_obj[STUDY_DESCR].value  if dcm_obj.has_key(STUDY_DESCR) else None
    response["seriesDescr"] = dcm_obj[SERIES_DESCR].value if dcm_obj.has_key(SERIES_DESCR) else None
    response["objectUID"] = instance_uid
    json_response = json.dumps(response)

    if request.GET.has_key('callback'):
        json_response =  "(function(){%s(%s);})();" % (request.GET['callback'], json_response) 
    return response




