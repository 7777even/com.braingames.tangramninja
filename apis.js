var dataPath = "./data.json";
var dataStr = files.read(dataPath);
var taskData = JSON.parse(dataStr);



var apis = {}
apis.post = function (url, params, options) {
  let timeout = 30000
  let retryCount = 1, errMsg, headers = {}, requestType = 'postJson'
  if (options && options.timeout) timeout = options.timeout
  if (options && options.retryCount) retryCount = options.retryCount
  if (options && options.headers) headers = options.headers
  if (options && options.requestType) requestType = options.requestType
  http.__okhttp__.setTimeout(timeout);
  for (let i = 0; i < retryCount; i++) {
      try {
          return http[requestType](url, params, { headers: Object.assign(headers, { "Connection": "close" }) });
      } catch (error) {
          errMsg = error
          console.error(url + '调用异常：' + error)
      }
  }
  throw errMsg
}

apis.planReportData = function (msg, reportEnum) {
  try {
    var url = taskData.service.extServerUrl.planreportdata.eventService
    var phoneID = Packages.com.xx.device.service.SocketService.getInstance().getDeviceName()
    var params = {
      "platform": "android",  //平台 IOS|android ?
      "country": taskData.country,        // 国家 country？
      "phone_id": phoneID ,   // device Name？
      "offer_id": taskData.id, // offerId
      "id": taskData.log_report.planId,    //planId
      "device_id": taskData.device_id, //deviceId
      "target": taskData.target.join('/'), // deviceTag
      // "oss_path": "",            //oss 
      "pkg_name": taskData.config.app.package,    // APK
      // "ignore_alarm": false,    // 是否告警？
      "msg": msg,
      "reportEnum": reportEnum
    }
    log('上报参数', params)
    var result = apis.post(url, params)
    log('上报结果', result.body.json())
  } catch (err) {
    console.log(err)
  }
  
}

module.exports = apis