from django.conf import settings
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
    print study_iuid
    study_iuid_tag = gdcm.Tag(0x20,0xD)
    study_iuid_element = gdcm.DataElement(study_iuid_tag)
    study_descr_tag = gdcm.Tag(0x8,0x1030)
    study_descr_element = gdcm.DataElement(study_descr_tag)
    study_descr_element.SetByteValue('', gdcm.VL(0))
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
            theQuery, ret, 'GDCM_PYTHON', 'DCM4CHEE')

    for i in range(0,ret.size()):
       print "Patient #",i
       print ret[i]
    # Find all series in this study
    ds = gdcm.DataSet()
    
    series_descr_tag = gdcm.Tag(0x8,0x103E)
    series_descr_element = gdcm.DataElement(series_descr_tag)
    
    ds.Insert(study_iuid_element)
    ds.Insert(series_descr_element)

    series_query = cnf.ConstructQuery(gdcm.eStudyRootType, gdcm.eSeries, ds)
    ret = gdcm.DataSetArrayType()
    cnf.CFind(settings.SC_DICOM_SERVER, settings.SC_DICOM_PORT, series_query,
            ret, 'GDCM_PYTHON', 'DCM4CHEE')

    for i in range(0,ret.size()):
       print "Patient #",i
       print ret[i]

    if request.GET.has_key('callback'):
        return "HI"# return JSONP response
    else:
        return "HI" 


def series(request):
    pass

def instance(request):
    pass

