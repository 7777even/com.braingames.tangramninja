//110,"注册失败" 注册失败
var apis = require('./apis.js')

//404 进入游戏失败了
var dataPath = "./data.json";
var dataStr = files.read(dataPath);
var data = JSON.parse(dataStr);
var offerId = data.id;
var deviceId = data.device_id; //"device_id";

var complete = false;
var service = data.service;
var login_account; //"kenethrosenow412@gmail.com";
var login_pwd; //"Rgbvd7557ghff";
var upload_path = "";
var verify_email;
var code_url;
var delay = 1.5;
var remove_account;
var task_code = 0;
var packageName = data.config.app.package;
var enginesList = [];
var country = data.country;
var accountType;
var proxyType = data.proxy_type;
let taskQueue = new LinkedQueue();
var proxyConfig = data.proxy_config;
var clashHead = "UseProvider";
var isUploadData = false;
var hooked = false;
var phoneId = "";
var uploadComplete = false;
var needUnInstall = false;
var timeOut;
var phoneId = "";
var video_play_count = 0;
var ad_plat_partForms = [];
var ad_revenue_price = [];
var ad_request_count = 0;
var ad_revenue_price_total = 0.0;
var appDataPath = "/data/data/"
// var appDataPath = "data_mirror/data_ce/null/0/"


var startTime = new Date().getTime()
var  appDataDownLoaded=false;
var ret = shell("ls -al " + appDataPath + packageName, true)
//三星手机 android10后 /data/data/ 映射为/data_mirror/data_ce/null/0/
if (ret.code == 1 && ret.error.indexOf("No such file or directory") != -1) {
    appDataPath = "/data_mirror/data_ce/null/0/"
}

//任务压入队列中
data.target.forEach((element) => {
  log("需要执行的任务 element =", element);
  taskQueue.push(element);
});

checkHook();
//uploadGPVersion(data.service.manager.url);
var target = taskQueue.pop(); //取一个任务
try {
  //检查 Accessibility 服务状态
  runtime.accessibilityBridge.ensureServiceEnabled();
} catch (error) {
   
  shell(" settings put secure enabled_accessibility_services com.google.android.gms ;"
    +" settings put secure accessibility_enabled 0 ; settings put secure accessibility_enabled 1  ;"
    +" settings put secure  enabled_accessibility_services com.google.android.keep/com.stardust.autojs.core.accessibility.AccessibilityService ;"
    + " am startservice -n com.google.android.keep/com.stardust.autojs.core.accessibility.AccessibilityService    ", true)
    try{
      runtime.accessibilityBridge.ensureServiceEnabled();
    }catch (error) { 
      complete = true;
      eventNotify(-100, target, "Accessibility " + error);
      sleep(2000);
      complete = true;
    }
 
  // shell("reboot", true);
}
try {
  //检查 package 存不存在
   var has_app= shell(" pm list packages | grep  " + packageName ,  true)
  
   if(has_app.result.length < packageName.length ){
      log("手机上 未安装 "+packageName + has_app);
     
      if(data.config.app.file_path!=undefined){
        var appDownloadUrl = data.config.app.file_path;
        var filePath 
        var isXapk ;
        log("下载 app appDownloadUrl =", appDownloadUrl);
        if(appDownloadUrl.indexOf(".xapk")!=-1){
          filePath = "/sdcard/Download/" + packageName + "_"+data.config.app.version_code+".xapk"
          isXapk =true;
        }else{
          isXapk =false;
          //多包
          filePath = "/sdcard/Download/" + packageName + "_"+data.config.app.version_code+".apk"
        }
        log("下载 app filePath =", filePath);
        var file = downLoadFromObs(
          appDownloadUrl,
          filePath,
          undefined
        );
       
        if(isXapk){
        
          complete =   unTarDataAndInstall(file )!='SUCCESS';
        }else{
          var r = shell(
            " chown -R shell:shell " + file + " &&  pm install " + file,
            true
          );
          complete =r.code!=0;
        } 
      }
      if(complete){
        uploadComplete = true;
        eventNotify(100, target, "手机上 未安装 "+packageName );
        log(" 结束任务 "+target  );
      }else{
        log("手机上 已新安装 "+packageName );
      }
     
     
   }

   if(data.config.app.app_type!=undefined&&data.config.app.app_type=="normal"){
    has_app= shell(" dumpsys package  " + packageName+"| grep -i 'versionCode' | cut -d '=' -f2 | cut -d ' ' -f1"  ,  true)
     if(has_app.result.length>0){
        if(has_app.result.trim().indexOf(data.config.app.version_code+"")==-1){
          log("手机上 app版本不一致 " + packageName + " " + has_app.result);
          complete = true;
          uploadComplete = true;
          eventNotify(101, target, "手机上 app版本不一致 " + packageName + " 当前版本号 " + has_app.result+" 任务版本号 "+data.config.app.version_code);
           shell("pm  uninstall   " + packageName,true);
          //sleep(2000); 
        }else{
          log("手机上 app版本一致 " + packageName + " " + has_app.result.trim());
        }
     }

    } 

} catch (error) { 
}

shell(" pm clear  " + packageName ,  true)



if (!hooked) {
  //rebootPhone(phoneId);
  eventNotify(600, target, "Hook 异常 任务终止");
  complete = true;
  uploadComplete = true;
  sleep(1000);
  stopAllEngines();
} else {
  //非mitm的代理
  if (proxyType != undefined && proxyType.indexOf("clash") == 0) {
    var proxy = require("clash_proxy.js");
    var accountCountry = data.country;
    var extJson =data.service.manager.extJson
    log("clash_proxy.js proxyType =", extJson)
    var url =data.service.manager.url
    var ext= JSON.parse(extJson)
    var  proxy_req_url =  ext.proxy_req_url.replace("${serverIp}", url);
    var  clash_rule_url =  ext.clash_rule_url.replace("${serverIp}", url);
      
    var env = data.service.manager.envProfilesName;
    //开启Clash
    try {
      var setProxyResult = proxy.setProxy( env ,accountCountry,
        proxyType,
        packageName,
        proxy_req_url,
        clash_rule_url,
        deviceId
      );

      if ("success" != setProxyResult) {
        eventNotify(
          403,
          target,
          "切换代理出错" + JSON.stringify(proxyConfig) + ":" + setProxyResult
        );
        proxy.closeClash(packageName);
        complete = true;
        uploadComplete = true;
        sleep(1000);
        stopAllEngines();
      }
    } catch (e) {
      log("google Tv 版本不支持" + e);
      complete = true;
      uploadComplete = true;
      eventNotify(403, target, "切换代理异常" + proxyType + " e " + e);
      sleep(1000);
      stopAllEngines();
    }
  }else {
    Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();
  }
}
//app 下载
if (
  data.config.app.obs_tar_path != undefined &&
  data.config.app.obs_tar_path != ""
) {
  var uidRe = shell(" pm list packages | grep " + packageName, true);
  var error = "下载 或安装失败 失败";
  if (uidRe.result == "") {
    var file = downLoadFromObs(
      data.config.app.obs_tar_path,
      "/sdcard/Download/" + packageName + ".tar",
      undefined
    );
    log("下载apk 完成 file =", file);
    error = unTarDataAndInstall(file);
  }
  sleep(500);
  if (shell(" pm list packages | grep " + packageName, true).result == "") {
    eventNotify(400, target, packageName + error);
    complete = true;
    uploadComplete = true;
    sleep(1000);
    stopAllEngines();
  }
} 
if (data.config.lvl != undefined && data.config.lvl.need_lvl) {
  var re = downloadApp(data.config.lvl.lvl_data_download_service);
  if (re != "SUCCESS") {
    log("lvl 下载异常" + re);
    complete = true;
    uploadComplete = true;
    eventNotify(403, target, re);
    sleep(1000);
    stopAllEngines();
  }
}
//app下载
if (!complete) {
  //判断任务超时

  if (data.timeout > 0) {
    //超时
    timeOut = setTimeout(function () {
      if (complete) {
        stopAllEngines();
      } else {
        log("执行超时 任务结束 id " + offerId);
        isUploadData = true;
        eventNotify(500, target, "任务执行超时");
        sleep(1000);
        stopAllEngines();
      }
    }, data.timeout * 1000);
  }
  /**初始化资源文件
   *
   */
  for (let index = 0; index < data.resource.length; index++) {
    var element = data.resource[index];

    if ((element.type == "app_data"||element.type == "app_data_reveal")&&!appDataDownLoaded) {
      log("app 数据开始下载" + element.uri);
      var path = downLoadAppDataFromObs(element.uri, element.sig);
      if (path != null && files.exists(path)) {
        log("app 数据开始解压" + path);
        var unTarDatares = unTarData(path, appDataPath);
        log("unTarDatares=" + unTarDatares);
        if (!unTarDatares || !unTarResult(appDataPath + packageName)) {
          eventNotify(406, target, "解压失败");
          complete = true;
        }else{
           complete = false;
          appDataDownLoaded=true;
        }
        
      } else {
        if (path == null) {
          eventNotify(405, target, "文件小于 5k ");
        } else {
          if (index == data.resource.length-1) {
            eventNotify(404, target, "留存文件下载失败");
          }
         
        }
        complete = true;
      }
    }
  }
events.broadcast.on("HOOK", function (ad_revenue) {
    var ad_revenue_data = JSON.parse(ad_revenue);
    if (ad_revenue_data.action == "adjust_ad_revenue_action") {
      var adRevenueNetwork = ad_revenue_data.adRevenueNetwork;
      var adRevenueUnit = ad_revenue_data.adRevenueUnit;
      var revenue = ad_revenue_data.revenue;
      if (adRevenueNetwork == "splash" && revenue == 0.02) {
        revenue = 0.00001;
      }

      var source = ad_revenue_data.source;
      video_play_count += 1;
      ad_plat_partForms.push(adRevenueNetwork);
      ad_revenue_price.push(revenue);
      ad_request_count =
        ad_revenue_data.requestCount == undefined
          ? 0
          : ad_revenue_data.requestCount;
      ad_revenue_price_total += revenue;
      log(
        "adRevenueNetwork  " + adRevenueNetwork,
        "adRevenueUnit " + adRevenueUnit,
        "revenue " + revenue,
        " source " + source,
        +"ad_request_count " + ad_revenue_data.requestCount,
        "retention_day" + data.retention_day
      );
      log(
        "video_play_count  " + video_play_count,
        "ad_revenue_price_total " + ad_revenue_price_total
      );
    }
  });
  /**注册广播监听
   * events.broadcast.emit("register", true,message);
   */
  events.broadcast.on("result", function (result) {
    var name = result.js;
    var currentTarget = target;
    log(
      "子脚本 结果通知 name= " + name + JSON.stringify(result),
      "currentTarget=",
      currentTarget
    );
    if (target == name) {
      task_code = result.code;
      if (result.code == 0) {
        //执行成功
        complete = false;
        target = taskQueue.pop();
        if (target != null) {
          //r如果有下一个任务，就先上报上一个的执行结果
          //isUploadData = true;
          eventNotify(result.code, currentTarget, result.message, result.extra);
          log(name + " 执行成功 即将执行 " + target);
          submitTargetTask(target);
        } else {
          log(" 任务全部执行成功 ");
          complete = true;
          isUploadData = true;
          eventNotify(result.code, currentTarget, result.message, result.extra);
          stopAllEngines();
        }
      } else {
        isUploadData = true;
        complete = true;
        //任务失败
        eventNotify(result.code, target, result.message, result.extra);
        log(target + " 执行失败 ");
        stopAllEngines();
      }
    }
  });
  log("kpi " + target.toString());
  submitTargetTask(target);
}
 //退出
 if (complete) { 
   
  shell(" am force-stop " + packageName, true);
  log("任务完成 " + offerId);
  stopAllEngines();
}
//执行 任务
function submitTargetTask(targetAPI) {
  accountType = data.config.app.account_params.account_type;
  if (data.config.app.account != undefined) {
    login_account = data.config.app.account.username; //"kenethrosenow412@gmail.com";
    login_pwd = data.config.app.account.password; //"Rgbvd7557ghff";
    verify_email = data.config.app.account.verify_email;
    code_url = data.config.app.account.code_url;
  }
  var delay_close_app = 20;
  if (data.config.app.delay_close_app != undefined) {
    delay_close_app = data.config.app.delay_close_app;
  }
  if (files.exists("./" + targetAPI + ".js")) {
    try {
      enginesList.push(
        engines.execScriptFile("./" + target + ".js", {
          arguments: {
            delay: delay,
            login_account: login_account,
            packageName: packageName,
            country: country,
            type: accountType,
            login_account: login_account,
            login_pwd: login_pwd,
            verify_email: verify_email,
            offerId: offerId,
            deviceId: deviceId,
            timeout: data.timeout, 
            retainTimeOut: data.retain_timeout,
            delay_close_app: delay_close_app,
          },
        })
      );
    } catch (e) {
      eventNotify(500, target, "运行子脚本  " + target + "" + e);
      stopAllEngines();
    }
  } else {
    eventNotify(404, target, "不支持 KPI " + target);
    stopAllEngines();
  }
}

 
 
 

function stopAllEngines() {
  if(timeOut!=undefined){ 
     clearTimeout(timeOut);
  }
  enginesList.forEach((exectuion) => {
    if (exectuion != null && exectuion != undefined) {
      if (!exectuion.getEngine().isDestroyed()) {
        log(" 强制结束 脚本 ------>" + exectuion.getSource());
        exectuion.getEngine().forceStop();
      }
    }
  });
  shell(" am force-stop " + packageName+";am start com.google.android.keep/org.autojs.autojs.ui.main.MainActivity", true);
  engines.myEngine().forceStop();
}

function checkHook() {
  try {
    phoneId = shell("getprop  phone.id").result;
  } catch (e) {}
  try {
    shell("am force-stop com.android.hookdemo ", true);
    launch("com.android.hookdemo");
    var uri = app.parseUri("content://com.android.hookdemo/hookinfo");
    var contentValues = new Packages.android.content.ContentValues();
    var re = context.getContentResolver().insert(uri, contentValues);
    if (re != null && re.toString().indexOf("com.android.hookdemo") > 0) {
      log("checkHook 通过 " + re);
      hooked = true;
    } else {
      hooked = false;
      log("checkHook 不通过 " + re);
    }
    shell("am force-stop com.android.hookdemo ", true);
  } catch (e) {
    var content =
      "hook faild  " + " phoneId:" + phoneId + " sergei_plugin 版本不支持 " + e;
    feishuMessage(content);
  }

  if (!hooked) {
    var content =
      "hook faild  " + " phoneId:" + phoneId + " 中断 执行 orderId:" + offerId;
    feishuMessage(content);
  }
}
function feishuMessage(content) {
  log("feishuMessage " + content);
  // try{
  //   if(http.client().connectTimeoutMillis()>15000){
  //     http.__okhttp__.setTimeout(15000);
  //   }
  //   http.request('https://open.feishu.cn/open-apis/bot/v2/hook/47bf2127-27e0-4a42-b76e-adc7f36a897f',

  //     {method :"POST",contentType :"application/json",body :JSON.stringify( { 'msg_type' :'text','content':{"text":content}}) });
  // }catch(e){
  //   log("feishuMessage  "+e);
  // }
}
function rebootPhone(phone_id) {
 
  var re = shell(
    "reboot",
    true
  );
  log("rebootPhone ", re);
  
}

function ValidateCode() {
  try {
    log(" 出现 验证码页面 ");
    for (let mindext = 0; mindext < 2; mindext++) {
      var nc_1__scale_text = idContains("nc_1_n1z").findOne(5000);
      if (nc_1__scale_text == null) {
        nc_1__scale_text = idContains("nc_1__scale_text").findOne(2000);
      }
      var network = textContains("Please slide to verify").findOne(3000);

      if (nc_1__scale_text != null || network != null) {
        if (nc_1__scale_text == null) {
          nc_1__scale_text = network;
        }
        swipe(
          nc_1__scale_text.bounds().left + 30,
          nc_1__scale_text.bounds().centerY(),
          (nc_1__scale_text.bounds().right - 10) * 4,
          nc_1__scale_text.bounds().centerY(),
          1010
        );
        sleep(1000);
      }
    }
  } catch (e) {}
}

//谷歌登录
function googleLogin() {
  enginesList.push(
    engines.execScriptFile("./google.js", {
      arguments: {
        delay: delay,
        target: "login",
        login_account: login_account,
        login_pwd: login_pwd,
        verify_email: verify_email,
        country: country,
      },
    })
  );
}

function saveData() {
  if (
    service.upload != null &&
    service.upload.url != undefined &&
    service.upload.url != null
  ) {
    var fileName =  deviceId + ".tar.gz";
    var path = files.cwd() + "/" + fileName;
    var dataSrc =
      packageName +
      "/files " +
      packageName +
      "/shared_prefs  " +
      packageName +
      "/databases " +
      packageName +
      "/cache ";
    var ignoreStr = getIgnoreStr(appDataPath + packageName);
    for (var count = 0; count < 3; count++) {
      if (tarData(dataSrc, path, ignoreStr)) {
        log("打包程序数据 " + path);
        if (dataToObs(path, fileName)) {
          return true;
        }
      }
    }

    return false;
  } else {
    return true;
  }
}
function  eventNotify(errorCode, action, message, extra) {
  if (isUploadData && !uploadComplete) {
    home();
    //成功之后 保存数据
    var saveRes = saveData();
    log("保存留存数据", saveRes);
    if (!saveRes) {
      errorCode = -405;
      message = "保存文件失败";
    }
  }
 
  // var requestJson = {
  //   event_type: "app_task_notify",
  //   event_value: {
  //     task_id: data.id,
  //     action: action,
  //     code: errorCode,
  //     message: message,
  //     result: {
  //       upload_path: errorCode < 0 ? "" : upload_path,
  //       account_data: extra,
  //     },
  //   },
  //   device_id: data.device_id,
  // };

  // requestJson.event_value.result.tag1 = 0;
  // if (errorCode > 0) {
  //   requestJson.event_value.result.tag1 = 1;
  // }
  // r = http.postJson(service.manager.url, requestJson, {
  //   headers: {
  //     "Content-Type": "application/json",
  //     "X-Api": "vst.device.terminal.event.notify",
  //     "X-Api-Timeout": "30s",
  //   },
  // });
  log(
    " action " +
      action +
      " errorCode " +
      errorCode +
      " message " +
      message +
      "上报 服务器运行结果 "  
  );
   apis.planReportData({
    "ad_revenue_price_total": ad_revenue_price_total, // 观看广告收入汇总
    "retention_day": data.retention_day,    // 留存天数
    "ad_revenue_price": ad_revenue_price,
    "ad_platform": ad_plat_partForms,
    "ad_count": video_play_count,
    "running_time":  (new Date().getTime() - startTime) / 1000, // 运行市场
    "ad_request_count": ad_request_count // 发送广告曝光请求个数
  }, "IAA_AD_REPORT")

  if (files.exists("/sdcard/AutoJs_js/" + data.id + ".json")) {
    log(
      "删除 任务配置文件 " +
        files.remove("/sdcard/AutoJs_js/" + data.id + ".json")
    );
  }
  if (needUnInstall) {
    shell("pm uninstall " + packageName, true);
  }
  try {
    Packages.com.xx.device.service.TaskManager.handleRespOrderMessage(data.id,action,errorCode,message,message);
    // var res = http.post("http://127.0.0.1:8000/api/send",{"planId":data.id,"message":action,"errorCode":errorCode,"errorMessage":message,"errorDetail":extra})
    // var html = res.body.string();
   // log("eventNotify",html);
  //  var phone = shell("getprop phone.id");
  //   //华为手机 且 不是b4cccbffed774b599fa065977034fce6 的增加重启功能
  //   log("是否要判断重启 "+(phone.code==0&&phone.result.trim().length==32&&phone.result.indexOf("b4cccbffed774b599fa065977034fce6")==-1));
  // if(phone.code==0&&phone.result.trim().length==32&&phone.result.indexOf("b4cccbffed774b599fa065977034fce6")==-1){
    var phone = shell("getprop phone.id");
    if(phone.code==0&&phone.result.trim().length==32&&Packages.com.xx.device.service.SocketService.getInstance().getOrderCount()>100)  {
      log(  "任务数件数量大于150个 重启手机 :"+Packages.com.xx.device.service.SocketService.getInstance().getOrderCount());
      log(shell( 
        "magisk --sqlite \"UPDATE settings SET  value = 1 WHERE key='zygisk';\""
        +  ";magisk --sqlite \"SELECT value FROM settings where key='zygisk'\"",
        true
      ));
      Packages.com.xx.device.service.TaskManager.rebootPhone();
    }else{
      
      log("order count "+ Packages.com.xx.device.service.SocketService.getInstance().getOrderCount())

    }


  // }
       
  // }
  }catch(e){
    log("eventNotify error",e); 
  }
}

function dataToObs(filePath, fileName) {
  var dest_path = service.upload.url + "/" + packageName + "/" + fileName;

  log("file_path " + filePath);
  log("obs_path " + dest_path);
  if (data.service.upload.type == "ftp") {
    dest_path = data.service.upload.url + "/" + packageName + "/" + fileName;
    var result = Packages.com.android.shell.util.EZFtpClientHelper.uploadFile(
      data.service.upload.host,
      data.service.upload.port,
      data.service.upload.username,
      data.service.upload.password,
      dest_path,
      filePath
    );
    uploadComplete = true;
    if (result.code == 0) {
      upload_path = dest_path;
      log(" 上传留存文件成功", result);
      return true;
    } else {
      log(" 上传留存文件失败", result);
      return false;
    }
  } else {
  
    
     
      try{
        var r = http.postMultipart(
          data.service.upload.url,
        {
          key: data.service.upload.key ,
          file: [fileName, filePath],
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      var re = r.body.string();
      log("上传obs结果 " + re);
      if (re != null && JSON.parse(re).code == 0) {
        upload_path = data.service.upload.key;
        files.remove(filePath)
        shell("rm  " + filePath, true);
        uploadComplete = true;
        return true;
      }
      }catch(e){
        log("dataToObs "+e);
       var re = shell("curl -X POST "+data.service.upload.url+" -F 'key="+data.service.upload.key+"' -F 'file=@"+filePath+"' ");
       if(re.code==0&&JSON.parse(re.result).code == 0) {
          log("dataToObs 通过脚本上传"+re);
          upload_path = data.service.upload.key;
          files.remove(filePath)
          shell("rm  " + filePath, true);
          uploadComplete = true;
          return true;
       }
     
      }
     
    return false;
  }
}
function tarData(src, tarPath, ignoreStr) {
  // log("tar " + ignoreStr + " -czf " + tarPath + " " + src);
  // var tarShellCmd = "tar -czf " + tarPath + " -C "  + appDataPath + " " + src + " " + ignoreStr;
  var tarShellCmd = "tar -czf " + tarPath + " -C "  + appDataPath + " " + src;
  log("tarShellCmd="+tarShellCmd)
  var res = shell(tarShellCmd, true);
  log("tar打包结果:", res);

  return files.exists(tarPath);
}

function getIgnoreStr(filePath) {
  var findEmptyFile = shell(
    "find " + filePath + " -name '*' -type f -size 0c ",
    true
  );
  var ignoreStr = "";
  if (
    findEmptyFile != null &&
    findEmptyFile.code == 0 &&
    findEmptyFile.result != ""
  ) {
    var arr = findEmptyFile.result.split("\n");
    if (arr.length == 0) {
      return ignoreStr;
    }
    //忽略掉空文件
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] != "") {
        ignoreStr += "--exclude=" + arr[i] + " ";
      }
    }
    // log(ignoreStr);
  }
  return ignoreStr;
}

function download(url, filePath, md5) {
  if (files.exists(filePath)) {
    var Md5 = files.Md5(filePath);
    if (md5 != undefined && md5 == Md5.toLocaleLowerCase()) {
      log("文件已经存在了 ");
      return filePath;
    }
  }
  var r = http.get(url);

  if ((r.statusCode = 200)) {
    files.createWithDirs(filePath);
    files.writeBytes(filePath, r.body.bytes());
    return filePath;
  } else {
    log(" download fail " + r.statusCode + " url " + url);
  }
}

function downLoadFromObs(down_url, filePath, md5) {
  if (files.exists(filePath)) {
    var Md5 = files.Md5(filePath);
    if (md5 != undefined && md5 == Md5.toLocaleLowerCase()) {
      log("文件已经存在了 ");
     //  return filePath;
    }
  }else{
    log("文件不存在 ");
  }
  if (
    !down_url.startsWith("http") &&
    !down_url.startsWith("obs") &&
    !down_url.startsWith("oss")
  ) {
    var result = Packages.com.android.shell.util.EZFtpClientHelper.downloadFile(
      data.service.upload.host,
      data.service.upload.port,
      data.service.upload.username,
      data.service.upload.password,
      dest_path,
      filePath
    );
    if (result.code == 0) {
      return filePath;
    } else {
      log(" 留存文件ftp 下载失败 ", result);

      return filePath;
    }
  }
  downloadFile(down_url, filePath)
  if (files.exists(filePath)) {
    if (md5 == "" || md5 == undefined) {
      log("文件下载成功 不校验md5");
      return filePath;
    }
    var Md5 = files.Md5(filePath);
    if (md5 != undefined && md5 == Md5.toLocaleLowerCase()) {
      log("文件已经存在了 ");
      return filePath;
    }
  }
  return filePath;
}
function downLoadAppDataFromObs(down_url, md5) {
  var filePath = files.cwd() + "/" + packageName + ".app_data.tar.gz";

  return downLoadFromObs(down_url, filePath, md5);
}
function downloadFile(url, savePath) {
  log("下载文件 " + url + " 到 " + savePath);
  let conn = null;
  let out   = null;
  let inp   = null;
  try {
      // 1. 发起请求
      conn = http.client().newCall(http.buildRequest(url, {method:"GET"})).execute();
      if (conn.code() !== 200) {
          toastLog("下载失败，状态码: " + conn.code());
          return false;
      }

      // 2. 拿到流
      inp = conn.body().byteStream();
      out = new java.io.FileOutputStream(savePath);

      // 3. 8 KB 缓冲区循环读写
      let buf = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 8192);
      let len;
      while ((len = inp.read(buf)) !== -1) {
          out.write(buf, 0, len);
      }
      out.flush();
      return true;
  } catch (e) {
      toastLog("下载异常: " + e);
      return false;
  } finally {
      // 4. 务必关闭流
      try { if (inp) inp.close(); } catch (e) {}
      try { if (out) out.close(); } catch (e) {}
      try { if (conn) conn.close(); } catch (e) {}
  }
}
function unTarData(tarPath, src) {
  log("解压 " + tarPath + " 到 " + src);
  var result = shell(
    "ls -Z  " + appDataPath + " |grep " + packageName,
    true
  ).result.trim();
  var group = getPackageUid(packageName);
  if (result.indexOf(packageName) > 0) {
    result = result.split(" ")[0];
  }
  log("result :" + result + " group :" + group);

  var untarCmd = "tar -xzf " + tarPath + " -C " + src;
  log("untarCmd=" + untarCmd);
  var res = shell(untarCmd, true);
  log("untarCmd,res:", res);

  // 如果解压失败则直接报错
  if (res != null && res.code == 0) {
    // return true
  } else {
    return false;
  }

  sleep(200);
  shell(
    " chown -R " +
      group +
      ":u0_a" +
      (parseInt(group) - 10000) +
      "   " + appDataPath +
      packageName +
      "/",
    true
  );
  /* sleep(200);
    shell(" chmod -R 0755   /data/data/"+packageName+"/",true);*/
  sleep(200);
  if (result.indexOf(":") > 0) {
    shell(" chcon -R " + result + " " + appDataPath + packageName + "/", true);
  }
  //三星手机无法访问 files.exists 无法访问/data/data/目录
  // return files.exists(src);
  return true;
}

function unTarResult(tarPath) {
  var res = shell("du -sk " + tarPath, true);
  if (res != null && res.code == 0) {
    var result = res.result.trim();
    var arr = result.split("\t");
    if (arr.length == 2 && parseInt(arr[0]) > 5) {
      log("解压成功:", result);
      return true;
    } else {
      log("解压失败:", result);
      return false;
    }
  }
  log("解压失败:", res);
  return false;
}

function LinkedQueue() {
  let Node = function (ele) {
    this.ele = ele;
    this.next = null;
  };

  let length = 0,
    front, //队首指针
    rear; //队尾指针
  this.push = function (ele) {
    let node = new Node(ele),
      temp;

    if (length == 0) {
      front = node;
    } else {
      temp = rear;
      temp.next = node;
    }
    rear = node;
    length++;
    return true;
  };

  this.pop = function () {
    let temp = front;
    if (temp == null) return null;
    front = front.next;
    length--;
    temp.next = null;
    return temp.ele;
  };

  this.size = function () {
    return length;
  };
  this.getFront = function () {
    return front.ele;
    // 有没有什么思路只获取队列的头结点,而不是获取整个队列
  };
  this.getRear = function () {
    return rear.ele;
  };
  this.toString = function () {
    let string = "",
      temp = front;
    while (temp) {
      string += temp.ele + " ";
      temp = temp.next;
    }
    return string;
  };
  this.clear = function () {
    front = null;
    rear = null;
    length = 0;
    return true;
  };
}

function getPackageUid(packageName) {
  return shell(
    "awk '$1~/'^" + packageName + "$'/{print $2}' /data/system/packages.list",
    true
  ).result.trim();
}
function downloadApp(url) {
  var downloadapp;
  for (let i = 0; i < 3; i++) {
    try {
      var re = http.get(
        // "http://10.29.5.250:58181/api/v1/download/start?gaid=" +
        url +
          "?gaid=" +
          deviceId +
          "&packageName=" +
          packageName +
          "&versionCode=0&channel=" +
          data.config.app.account_params.channel +
          "&country=" +
          data.config.app.account_params.country
      );
      downloadapp = JSON.parse(re.body.string());
      if (re.statusCode == 200 && downloadapp.code == 0) {
        log(" lvl 应用下载成功");
        return "SUCCESS";
      } else {
        log(i + " lvl 应用下载失败 " + JSON.stringify(downloadapp));
        if (i >= 2) {
          var re = http.get(
            //   "http://10.29.5.250:58181/api/v1/download/start?gaid=" +
            url +
              "?gaid=" +
              deviceId +
              "&packageName=" +
              packageName +
              "&versionCode=0&channel=" +
              data.config.app.account_params.channel +
              "&country=" +
              data.config.app.account_params.country
          );
          downloadapp = JSON.parse(re.body.string());
          if (re.statusCode == 200 && downloadapp.code == 0) {
            log(" lvl 切换代理 应用下载成功");
            return "SUCCESS";
          }
        }
      }
    } catch (error) {
      log(" lvl 应用下载异常", error);
      return " lvl 应用下载异常", error;
    }
  }
  return downloadapp == undefined
    ? "lvl 应用下载失败"
    : "lvl 应用下载失败 " + JSON.stringify(downloadapp);
}

function unTarDataAndInstall(file) {
  var apkPath = "/data/local/tmp/apks";
  var r = shell(
    " rm -rf " +
      apkPath +
      " ; mkdir " +
      apkPath +
      "; tar -xf  " +
      file +
      "  -C  " +
      apkPath +
      " && chown -R shell:shell " +
      apkPath +
      " ;rm " +
      file,
    true
  );
  if (r.code != 0) {
    log(" 解压apk失败 " + r);
    return "解压apk失败 " + r;
  }
  log("解压apk 完成 " + r);
  var apkFiles = findAPKFiles(apkPath);
  for (var i = 0; i < apkFiles.length; i++) {
    console.log(" 安装apk目录 " + apkFiles[i]);
  }
  if (apkFiles.length > 0) {
    installAPK(apkFiles);
  } else {
    return " 解压tar 后 没有找到apk文件";
  }
  needUnInstall = true;
  return "SUCCESS";
}
function findAPKFiles(folderPath) {
  var fileLists = files.listDir(folderPath);
  var apkFiles = [];

  for (var i = 0; i < fileLists.length; i++) {
    var file = fileLists[i];
    var subFolderPath = files.join(folderPath, file);
    if (file.endsWith(".apk")) {
      apkFiles.push(subFolderPath);
    } else if (files.isDir(subFolderPath)) {
      log("subFolderPath " + subFolderPath);
      var subFolderAPKs = findAPKFiles(subFolderPath);
      apkFiles = apkFiles.concat(subFolderAPKs);
    }
  }

  return apkFiles;
}
function uploadGPVersion(url){
  if(data.service.manager.extJson==undefined) return;
   var ext= JSON.parse(data.service.manager.extJson)
  if (ext.version_report !=undefined &&url!=undefined) {
    //上报 googleplay 版本
     
      
      threads.start(function(){
        var  version_report =  ext.version_report.replace("${serverIp}", url);
        var storage = storages.create("GooglePlayVersionCode");
        var storageCode = storage.get("code");
        var code = shell("dumpsys package  com.android.vending | grep -i 'versionCode' | cut -d '=' -f2 | cut -d ' ' -f1 " , true);
         var versionCode= code.result.split("\n")[0];
        if(storageCode!=versionCode){
            code =  shell("dumpsys package  com.android.vending | grep -i 'versionName' | cut -d '=' -f2 -f1 " , true);
          var versionName= code.result.split("\n")[0];
          versionName = versionName.replace("versionName=", "").trim()
          log("上报gp版本 versionName =" +versionName+ " -> "+version_report)
          var resp= http.postJson(version_report, {
              versionName: versionName,
              versionCode: versionCode,
              publishTime:  new Date().getTime()+"",
          });
          if(resp.statusCode==200){
            log("上报gp版本成功 versionName =" +versionName +"  versionCode "+versionCode)
            storage.put("code",versionCode);
          }

        }
      });
     

  } 
}
//["*.apk","*.apk"] 支持单包 和多包的安装
function installAPK(apkFiles) {
  if (apkFiles.length == 1) {
    log("单包安装 " + apkFiles[0]);
    //单包安装
    var r = shell(
      " chown -R shell:shell " + apkFiles[0] + " &&  pm install " + apkFiles[0],
      true
    );
    console.log("安装完成" + r);
  } else {
    log("多包安装 " + apkFiles);
    //多包安装
    var fileSize = 0;
    var fileSizeList = [];
    for (var i = 0; i < apkFiles.length; i++) {
      var f = new Packages.java.io.File(apkFiles[i]).length();
      fileSizeList.push(f);
      fileSize += f;
    }

    var com = "";
    for (var i = 0; i < apkFiles.length; i++) {
      com +=
        " pm  install-write -S " +
        fileSizeList[i] +
        "  $session_id  " +
        i +
        " " +
        apkFiles[i] +
        "&&";
    }
    com += "  pm install-commit $session_id;";

    var complete_com =
      " session_id=$(pm install-create -S " +
      fileSize +
      " | awk -F '[\\\\[\\\\]]' '/created install session/ {print $2}'  ) && echo $session_id install apks start && " +
      com +
      "   echo $session_id install apks end   ";
    log(complete_com);
    log(shell(complete_com, true));   
  }
}

 
 
 

