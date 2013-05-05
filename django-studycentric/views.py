from django.conf import settings
from django.http import HttpResponse
import requests
import gdcm
import json

# Some DICOM SOP class constants
CT = "1.2.840.10008.5.1.4.1.1.2"
MR = "1.2.840.10008.5.1.4.1.1.4"
XA = "1.2.840.10008.5.1.4.1.1.12.1"
CR = "1.2.840.10008.5.1.4.1.1.1"

STUDY_IUID = (0x20,0xD)
STUDY_DESCR = (0x8,0x1030)
SERIES_IUID = (0x20,0xE)
SERIES_DESCR = (0x8, 0x103E)


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




def instance(request):
    wado_url = "http://%s:%s/wado?requestType=WADO" % (settings.SC_WADO_SERVER, settings.SC_WADO_PORT)
    "+DICOM.const_get("EXPLICIT_BIG_ENDIAN")  
    payload = {'contentType': 'application/dicom', 
               'seriesUID': 'value2',
               'studyUID' :'value3',
               'objectUID': 'value4',
               'transferSyntax':'value5'}
    r = requests.get(wado_url, params=payload)

