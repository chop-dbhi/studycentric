#!/usr/bin/env python

# This script creates a static JavaScript configuration module the StudyCentric client uses
import json
import os

def get_env_variable(var_name, default=None):
    """ Get the environment variable or return an exception"""
    try:
        return os.environ[var_name]
    except KeyError:
        return default

config = {
    "StudyCentricPath":get_env_variable("STUDYCENTRIC_PATH", "../"),
    "WADOHost":get_env_variable("CLIENT_WADO_HOST") or get_env_variable('WADO_SERVER') or get_env_variable("DICOM_SERVER", "localhost"),
    "WADOPort":get_env_variable("CLIENT_WADO_PORT") or get_env_variable('WADO_PORT', 8080),
    "WADOProt":get_env_variable("CLIENT_WADO_PROT") or get_env_variable('WADO_PROT', 'http'),
    "WADOPath":get_env_variable("CLIENT_WADO_PATH") or get_env_variable('WADO_PATH', 'wado'),
    "InstanceThumbNailSizePx":get_env_variable("INSTANCE_THUMBNAIL_SIZE_PX", 100),
    "SeriesThumbNailSizePx":get_env_variable("SERIES_THUMBNAIL_SIZE_PX", 150),
    "DefaultImgSize":get_env_variable("DEFAULT_IMG_SIZE", 128),
    "ImagesPerRow":get_env_variable("IMAGES_PER_ROW", 3),
    "DisableClinicalWarning":bool(int(get_env_variable("DISABLE_CLINICAL_WARNING", False))),
    "MeasurementPrecision":get_env_variable("MEASUREMENT_PRECISION", 1),
    "JSONP": bool(int(get_env_variable("JSONP", False))),
    "HoverColor": get_env_variable("HOVER_COLOR","#FFAA56"),
    "HintColor": get_env_variable("HINT_COLOR", "#FFFFFF"),
    "MeasurementColor": get_env_variable("MEAUREMENT_COLOR", "#00FF00"),
    "png": bool(int(get_env_variable("PNG", False))),
    "EnableReportConcern": bool(int(get_env_variable("ENABLE_REPORT_CONCERN", False))),
    "ReportConcernUrl": get_env_variable("REPORT_CONCERN_URL", "../concerns/"),
    "ReportConcernEmail": get_env_variable("REPORT_CONCERN_EMAIL", "Enter Email")
}

output = "define(%s);" % json.dumps(config)

f = open("/opt/app/client/js/config.js", "w")
f.write(output)
f.close()