require 'dicom'
require 'sinatra'
require "sinatra/config_file"
require 'json'
require 'net/http'

config_file 'config.yml'

# Configuration params
server = settings.dicom_server_host
port = settings.dicom_server_port
ae = settings.ae
wado_server = settings.wado_server_host
wado_port = settings.wado_server_port

# Some DICOM SOP class constants
CT = "1.2.840.10008.5.1.4.1.1.2"
MR = "1.2.840.10008.5.1.4.1.1.4"
XA = "1.2.840.10008.5.1.4.1.1.12.1"
CR = "1.2.840.10008.5.1.4.1.1.1"

# Some DICOM attribute tag constants
SOP_CLASS_UID = "0008,0016"
PIXEL_SPACING = "0028,0030"      
IMAGER_PIXEL_SPACING = "0018,1164"
WINDOW_CENTER = "0028,1050"
WINDOW_LEVEL =  "0028,1051"
STUDY_DESCR = "0008,1030"
SERIES_DESCR = "0008,103E"
CALIBRATION_TYPE =  "0028,0402"
CALIBRATION_DESCR = "0028,0404"

# Return list of series IDs in studyUID
get '/study/:studyUID' do
     node = DICOM::DClient.new(server, port, {:host_ae => ae})
     results = node.find_studies("0020,000D" => params[:studyUID], "0008,1030"=>"")
     study_description =  results[0]["0008,1030"]
     results = node.find_series("0020,000D" => params[:studyUID], "0008,103E"=>"")
     results = results.sort_by {|obj| obj["0020,0011"].to_i} 
     child_series = results.collect {|x| {"uid"=>x["0020,000E"], "description"=>x["0008,103E"]}}
     response = {:description=>study_description, :series=>child_series}.to_json
     if params.keys().include?('callback')
       return "(function(){#{params[:callback]}(#{response});})();"
     end
     return response
end

# Return list of instance IDs in seriesUID
get '/series/:seriesUID' do
     node = DICOM::DClient.new(server, port, {:host_ae => ae})
     results = node.find_images("0020,000E" => params[:seriesUID],"0008,103E"=>"")
     results = results.sort_by {|obj| obj["0020,0013"].to_i}
     response = results.collect {|x| x["0008,0018"]}.to_json
     if params.keys().include?('callback')
       return "(function(){#{params[:callback]}(#{response});})();"
     end
     return response
end

# Convenience function to get pixel calibration details
def calibrationDetails(dcm_obj)
    details = "Not available."
    calibration_type = nil
    calibration_descr = nil
    calibration_type = dcm_obj[CALIBRATION_TYPE].value if \
        !dcm_obj[CALIBRATION_TYPE].nil?
    calibration_descr = dcm_obj[CALIBRATION_DESCR].value if \
        !dcm_obj[CALIBRATION_DESCR].nil?
    
    if calibration_type and calibration_type
        details = "#{calibration_type} - #{calibration_descr}"
    elsif calibration_type or calibration_descr
        details = calibration_type or calibration_descr
    end
    return details
end


# Proxy to WADO server that only allows jpeg or png
get '/wado' do
     if params.keys().include?('contentType') and (params[:contentType] == 'image/jpeg' or params[:contentType] == 'image/png')
          wado_url = "http://#{wado_server}:#{wado_port}/wado?"+request.query_string 
          url = URI.parse(wado_url)
          req = Net::HTTP::Get.new(url.to_s)
          res = Net::HTTP.start(url.host, url.port) {|http|
              http.request(req)
          }
          content_type params[:contentType]
          return res.body 
     end
     halt 404
end

# Return a hash of DICOM attributes for instanceUID
# {
#    pixelMessage:
#    pixelAttrName:
#    nativeColumns:
#    nativeRows:
#    xPixelSpacing:
#    yPixelSpacing:
#    windowWidth:
#    windowCenter
#  }
#  This function currently uses the WADO interface to retrieve the file
get '/object/:instanceUID' do
    wado_url = "http://#{wado_server}:#{wado_port}/wado?requestType=WADO&\
contentType=application/dicom&studyUID=#{params[:studyUID]}&seriesUID=#{params[:seriesUID]}&objectUID=#{params[:instanceUID]}&\
transferSyntax="+DICOM.const_get("EXPLICIT_BIG_ENDIAN")
    url = URI.parse(wado_url)
    req = Net::HTTP::Get.new(url.to_s)
    res = Net::HTTP.start(url.host, url.port) {|http|
        http.request(req)
    }
    #dcm_obj = DICOM::DObject.parse(res.body)
    logger.info DICOM.const_get("EXPLICIT_BIG_ENDIAN")

    dcm_obj = DICOM::DObject.parse(res.body)
    
    # Unfortunately figuring out which pixel spacing attribute should
    # be used for measurements is unnecessarily complex
    modality_type = nil
    modality_type = dcm_obj[SOP_CLASS_UID].value if !dcm_obj[SOP_CLASS_UID].nil?
    spacing = nil
    xSpacing = nil
    ySpacing = nil
    pixel_attr = nil
    pixel_message = nil
    response = {}
    if [MR, CT].include?(modality_type)
        spacing =  dcm_obj[PIXEL_SPACING].value if !dcm_obj[PIXEL_SPACING].nil?
        pixel_attr = IMAGER_PIXEL_SPACING
    elsif [CR, XA].include?(modality_type)
        # The following logic is taken from CP 586
        pixel_spacing = dcm_obj[PIXEL_SPACING].value if !dcm_obj[PIXEL_SPACING].nil?
        imager_spacing = dcm_obj[IMAGER_PIXEL_SPACING].value if !dcm_obj[IMAGER_PIXEL_SPACING].nil?
        if pixel_spacing
            if imager_spacing
                if pixel_spacing == imager_spacing
                    # Both attributes are present 
                    spacing = imager_spacing
                    pixel_attr = IMAGER_PIXEL_SPACING
                    pixel_message = "Measurements are at the detector plane."
                else
                    # Using Pixel Spacing
                    spacing = pixel_spacing
                    pixel_attr = PIXEL_SPACING
                    pixel_message = "Measurement has been calibrated, details = " +
                        calibrationDetails(dcm_obj)
                end
            else
               # Only Pixel Spacing was specified
               spacing = pixel_spacing
               pixel_attr = PIXEL_SPACING
               pixel_message = "Warning measurement may have been calibrated, details: " +
                   calibrationDetails(dcm_obj) + ". It is not clear what this measurement represents."
            end
        elsif imager_spacing
            spacing = imager_spacing
            pixel_attr = IMAGER_PIXEL_SPACING
            pixel_message = "Measurements are at the detector plane."
        end
    end

    # Build up the response
    response[:windowCenter] = dcm_obj[WINDOW_CENTER].value.split("\\")[0].to_i if !dcm_obj[WINDOW_CENTER].nil? and !dcm_obj[WINDOW_CENTER].value.nil?
    response[:windowWidth] = dcm_obj[WINDOW_LEVEL].value.split("\\")[0].to_i if !dcm_obj[WINDOW_LEVEL].nil? and !dcm_obj[WINDOW_LEVEL].value.nil?

    # Pixel spacing attributes can contain two values packed like this:
    # x//y
    unless spacing.nil?
        spacing = spacing.split("\\")
        xSpacing = ySpacing = spacing[0]
        ySpacing = spacing[1] if spacing.length > 1
    end

    response[:xSpacing] = xSpacing
    response[:ySpacing] = ySpacing
    response[:pixelMessage] = pixel_message
    response[:pixelAttr] = pixel_attr
    response[:nativeRows] = dcm_obj.num_rows
    response[:nativeCols] = dcm_obj.num_cols
    response[:studyDescr] = dcm_obj[STUDY_DESCR].value  if !dcm_obj[STUDY_DESCR].nil?
    response[:seriesDescr] = dcm_obj[SERIES_DESCR].value if !dcm_obj[SERIES_DESCR].nil?
    response[:objectUID] = params[:instanceUID]
    response = response.to_json

    if params.keys().include?('callback')
      return "(function(){#{params[:callback]}(#{response});})();"
    end
    return response
end
