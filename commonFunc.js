// module.exports = (function () {
  var commonFunc = {}

  var scriptDir = '.'

  // var screenImgPath = './images/screenImg.png'

  commonFunc.setStorage = function (name, key, value) {
    var storage = storages.create(name);
    storage.put(key, value)
  }

  commonFunc.runCommand = function (command, su) {
    var process = null, os = null, is = null, result = '', status = 1, line = null
    if (!su) {
      try {
        result = shell(command, true).result
        console.log(result)
      } catch (error) {
        status = 0
        console.log(command, '执行命令失败', error)
      }
      return { result: result ? result.trim(): '', status: status }
    }
    try {
      process = java.lang.Runtime.getRuntime().exec(su)
      os = new java.io.DataOutputStream(process.getOutputStream())
      is = new java.io.DataInputStream(process.getInputStream());
      os.writeBytes(command + "\n")
      os.writeBytes("exit\n")
      os.flush()
      while ((line = is.readLine()) != null) {
        result += line;
      }
      process.waitFor();
    } catch (error) {
      status = 0
      console.log(command, '执行命令失败', error);
    } finally {
      os && os.close();
      is && is.close();
      process && process.destroy();
    }
    return { result: result, status: status }
  }

   /**
 * 点击绝对位置
 * @param {*} x 
 * @param {*} y 
 * @param {string} desc 描述
 */
  commonFunc.clickAbsoluteLocation = function (x, y, desc) {
    try {
      click(x, y)
      desc && log(desc);
      sleep(300)
    } catch (error) {
      log('点击报错：' + error)
    }
  }

  /**
   * 以图找色
   * @param {*} screenImage 屏幕图片路径
   * @param {*} color 目标颜色
   * @param {*} options 具体参考官网
   * @returns 坐标
   */
  commonFunc.getFindColor = function (screenImage, color, options) {
    var point = null
    var screenImg = images.read(screenImage);
    options = options || { threshold: 0.9 }
    try {
      point = findColor(screenImg, color, options)
      point && commonFunc.setStorage('adConfig', 'isClickAction', 1)
      screenImg.recycle()
      return point
    } catch (error) {
      console.log('找色异常：' + error);
    } finally {
      screenImg && screenImg.recycle()//回收图片
      point && console.log('坐标：' + point)
    }
    return point
  }

  /**
   * 截图
   * @param {*} savePath 保持路径+后缀
   * @param {*} options regions 截图区域
   * 
   */
  commonFunc.screenshot = function(savePath, options) {
    // 默认全屏截图
    if (!options || !options.region) {
      var cmdStr = 'screencap ' +  savePath
      commonFunc.runCommand(cmdStr)  // `screencap ${savePath}`);
      return;
    }
  
    // 定义临时文件路径
    var tempPath = scriptDir + "/_temp_full_screen.png";
    
    // 1. 先截取全屏到临时文件
    commonFunc.runCommand('screencap ' + tempPath);  //screencap ${tempPath}
    
    // 2. 裁剪指定区域
    try {
      // 读取临时文件
      var fullImage = images.read(tempPath);
      if (!fullImage) throw new Error("读取截图失败");
  
      // 解析区域参数 (需包含 x, y, width, height)
      var { x, y, width, height } = options.region;
      
      // 边界检查（避免超出屏幕范围）
      var validX = Math.max(0, Math.min(x, fullImage.getWidth() - 1));
      var validY = Math.max(0, Math.min(y, fullImage.getHeight() - 1));
      var validWidth = Math.max(1, Math.min(width, fullImage.getWidth() - validX));
      var validHeight = Math.max(1, Math.min(height, fullImage.getHeight() - validY));
  
      // 裁剪并保存
      var clippedImage = images.clip(fullImage, validX, validY, validWidth, validHeight);
      images.save(clippedImage, savePath);
  
      // 释放内存
      fullImage.recycle();
      clippedImage.recycle();
    } catch (e) {
      console.error("区域截图失败:", e);
    } finally {
      // 3. 删除临时文件
      commonFunc.runCommand('rm ' + tempPath);  //`rm ${tempPath}`);
    }
  };

  /**
  * 打开app
  * @param {*} pkgName
  * @param {*} sleepTime
  */
  commonFunc.openApp = function (pkgName, sleepTime) {
    sleepTime = sleepTime || random(1000, 3000)
    launch(pkgName)
    if (!packageName(pkgName).findOnce()) {
      commonFunc.runCommand("pm enable " + pkgName)
    }
    sleep(sleepTime)
  }

   /**
   *  用图片兼容于base64以及图片路径找位置
   * @param {*} pkgName 包名
   * @param {*} targetImage 目标图片
   * @param {*} screenImage 屏幕图片的路径
   * @param {*} options 具体参数参考官网 http://doc.autoxjs.com/#/images?id=imagesfindimageimg-template-options
   * @returns 位置坐标
   */
  commonFunc.getPointInImage = function (pkgName, targetImage, screenImage, options) {
    var targetName = '', targetPath = targetImage, point = null
    var isBase64 = targetImage ? targetImage.indexOf('iVBORw') != -1 : false

    options = options || { threshold: 0.9 }
    if (targetImage && !isBase64 && pkgName) {
      var list = targetImage.split('/')
      targetName = list[list.length - 1]
      // var lastIndex = constant.scriptUrl.lastIndexOf('/');
      targetPath = targetImage
      
      // var pathWithoutLastPart =  constant.scriptUrl.slice(0, lastIndex);
      // if (taskInfo && taskInfo.deviceModel == 2) {
        // pathWithoutLastPart = `${constant.rootPath}`;
        // targetPath = pathWithoutLastPart + '/' + pkgName + '/' + targetName
      // } else {
        // pathWithoutLastPart =  constant.scriptUrl.slice(0, lastIndex);
        // targetPath = pathWithoutLastPart + '/' + targetName
      // }
      // var pathWithoutLastPart = constant.scriptUrl.slice(0, lastIndex);
      // targetPath = pathWithoutLastPart + '/' + targetName
    }
    var screenImg = images.read(screenImage);
    var tarImg = isBase64 ? images.fromBase64(targetImage) : images.read(targetPath);
    try {
      if (!screenImg || !tarImg) {
        console.log(targetPath + '路径下图片不可用，请检查图片')
        return point
      }
      point = findImage(screenImg, tarImg, options)
      point && commonFunc.setStorage('adConfig', 'isClickAction', 1)
      screenImg.recycle()
      tarImg.recycle()
      return point
    } catch (error) {
      console.log('找图错误：' + error)
    } finally {
      screenImg && screenImg.recycle()//回收图片
      tarImg && tarImg.recycle()//回收图片
      point && console.log('坐标：' + point)
    }
    return point
  }

   /**
   * 点击操作
   * @param {*} pkgName 包名
   * @param {*} imgPathOrWidget 图片路径或控件
   * @param {*} options 可选，1. isAd，desc,screenImgPath,sleepTime
   * @returns 
   */
  commonFunc.clickAction = function (pkgName, imgPathOrWidget, options) {
    var sleepTime = 1000, screenImgPath = '', isAd = false, desc = '', point, isImgPath = false
    if (options && options.isAd) isAd = options.isAd
    if (options && options.desc) desc = options.desc
    if (options && options.sleepTime) sleepTime = options.sleepTime
    if (options && options.screenImgPath) screenImgPath = options.screenImgPath
    if (typeof imgPathOrWidget === "string" && (imgPathOrWidget.indexOf('/') !== -1 || imgPathOrWidget.indexOf('\\') !== -1)) isImgPath = true
    if (!imgPathOrWidget) {
      console.error('imgPathOrWidget必传，不能为空')
      return
    }
    if (!isImgPath && !screenImgPath) {
      console.error('是以图找图必传{screenImgPath}');
      return
    }
    try {
      if (isImgPath) {
        point = commonFunc.getPointInImage(pkgName, imgPathOrWidget, screenImgPath)
      } else {
        point = commonFunc.clickIfWidgetExistsRandom(imgPathOrWidget)
      }
      if (point) {
        point && click(point.x, point.y)
        point && console.log(desc + '坐标：' + JSON.stringify(point))
        sleep(sleepTime)
      }
      // isAd && commonFunc.handleAdPage(pkgName)
      isImgPath && commonFunc.screenshot(screenImgPath)
      // point && click(point.x, point.y)
      // point && console.log(desc + '坐标：' + JSON.stringify(point))
      // point && sleep(sleepTime)
      // isAd && commonFunc.handleAdPage(pkgName)
      // isImgPath && commonFunc.screenshot(screenImgPath)
    } catch (error) {
      console.log('点击操作异常：' + error)
    }
    return point
  }

   /**
  * randomSleep(dur1,dur2)随机睡眠单位毫秒
  * @param {*} min 随机数1
  * @param {*} max 随机数2
  * @returns
  */
  commonFunc.randomSleep = function (min, max) {
    if (min && max) {
      return sleep(random(min, max))
    }
    if (min) {
      return sleep(random((min + 2) * 2, (min + 2) * 3))
    }
    return sleep(random(500, 1500))
  }


   /**
   * 滑动相对位置
   * @param {*} x  滑动的起始坐标的x值
   * @param {*} y 滑动的起始坐标的y值
   * @param {*} x2 滑动的结束坐标的x值
   * @param {*} y2 滑动的结束坐标的y值
   * @param {*} duration 滑动时长，单位毫秒
   * @param {*} desc 描述
   */
   commonFunc.swipeRelativeLocation = function (x, y, x2, y2, duration, desc) {
    duration = duration || 1000
    try {
      swipe(x, y, x2, y2, duration)
      desc && log(desc);
    } catch (error) {
      log('滑动报错：' + error)
    }
  }

  /**
   * newThread 开启一个阻塞线程
   * @param {Function} doBusiness 业务回调函数 如果要写死循环一定要用loopByTime方法 避免线程停止不了
   * @param {any} result 默认返回值
   * @param {Number=12000} timeout 线程超时时间（毫秒）
   * @param {Function} timeoutCall 线程超时回调
   */
  commonFunc.newThread = function (doBusiness, result, timeout, timeoutCall, endCCallBack) {
    timeout = timeout ? timeout : 120000    //  默认超时时间为 2 分钟
    doBusiness = typeof (doBusiness) == "function" ? doBusiness : () => { }
    timeoutCall = typeof (timeoutCall) == "function" ? timeoutCall : () => { }
    endCCallBack = typeof (endCCallBack) == "function" ? endCCallBack : function () {}
    var errMsg = null
    var isTimeout = true
    var thread = threads.start(function () {
      try { result = doBusiness(thread) } catch (error) { errMsg = error }
      isTimeout = false
    })
    thread.join(timeout)
    thread.interrupt()
    if (errMsg) { throw errMsg }
    try { isTimeout && timeoutCall() } catch (error) { throw error }
    try { endCCallBack() } catch(error) { throw error }
    return result
  }

  /**
   * 定时循环
   * @param {*} callback 回调函数
   * @param {*} timeout 超时时间
   */
  commonFunc.loopByTime = function (callback, timeout) {
    console.log('%c [ timeout ]-316', 'font-size:13px; background:#617a44; color:#a5be88;', timeout)
    var startTime = new Date().getTime();
    console.log('%c [ startTime ]-318', 'font-size:13px; background:#ef5b8f; color:#ff9fd3;', startTime)
    while (new Date().getTime() - startTime <= timeout) {
      if (callback()) return
    }
  }

  /**
  * 关闭app
  * @param {*} pkgName 包名
  * @param {*} sleepTime 睡眠时间
  */
  commonFunc.closeApp = function (pkgName, sleepTime) {
    sleepTime = sleepTime || random(1000, 3000)
    commonFunc.runCommand('am force-stop ' + pkgName)
    sleep(sleepTime)
  }

  /**
   * clickIfWidgetExistsRandom 坐标点击，点击事件坐标随机化处理
   * @param {*} widget 目标节点
   * @returns 返回点击结果
   */
  commonFunc.clickIfWidgetExistsRandom = function (widget) {
    if (!widget) return
    try {
      var point = { x: widget.bounds().centerX() + random(0, 3), y: widget.bounds().centerY() + random(0, 3) }
      widget.visibleToUser() && click(point.x, point.y)
      return point
    } catch (error) { console.log('点击结果错误原因：' + error) }
    return
  }

   /**
   * 应用通用操作
   * @param {*} pkgName 包名
   * @param {*} action 操作回调
   * @param {*} isCycle 是否循环
   * @param {*} isAd 是否广告业务
   * @param {*} options 可选 noAdsTimeToCloseApp 传时长 noAdsTimeout 传时长
   * @returns 
   */
   commonFunc.appCommonAction = function (pkgName, action, isCycle, isAd, options, taskTimeOut) {
    console.log('%c [ taskTimeOut ]-361', 'font-size:13px; background:#d390e3; color:#ffd4ff;', taskTimeOut)
    var saveAppTimes = 0 //记录保存应用次数
    var notInAppCount = 0 // 没有在应用内次数
    // commonFunc.setStorage('adConfig', 'startBusinessTime', new Date().getTime())


    commonFunc.loopByTime(() => {
      try {
        if (notInAppCount > 20) {
          return true
        }

        for (var i = 0; i < 5 && !packageName(pkgName).findOnce(); i++) {
          if (packageName('com.android.vending').findOnce()) {
            commonFunc.closeApp("com.android.vending")
            commonFunc.randomSleep(1000, 3000)
          }
          commonFunc.clickIfWidgetExistsRandom(id("com.google.android.gms:id/account_name").findOnce()) && commonFunc.randomSleep(5000, 10000)
          commonFunc.clickIfWidgetExistsRandom(id('android:id/aerr_close').findOnce()) && commonFunc.randomSleep(1000, 3000)
          commonFunc.clickIfWidgetExistsRandom(packageName('com.android.systemui').className('Button').findOnce()) && sleep(2000)
          commonFunc.clickIfWidgetExistsRandom(packageName('android').className('Button').findOnce()) && sleep(2000)
          commonFunc.clickIfWidgetExistsRandom(packageName('com.android.systemui').className('Button').findOnce(1)) && sleep(2000)
          while (commonFunc.clickIfWidgetExistsRandom(packageName('com.android.permissioncontroller').className('Button').findOnce())) {
            sleep(2000)
          }
          commonFunc.openApp(pkgName, random(10000, 20000))
          //兼容部分打开场景
          if (packageName("com.google.android.gms").findOnce()) {
            console.log("该游戏打开后自动跳转到了谷歌");
            for (var i = 0; i < 10; i++) {
              back()
              sleep(1000)

              if (!packageName("com.google.android.gms").findOnce()) break
            }
          }
          //防止打开系统弹窗
          if (!packageName(pkgName).findOnce()) {
            for (var i = 0; i < 3; i++) {
              back()
              sleep(1000)
            }
          }
          notInAppCount++
          !packageName(pkgName).findOnce() && commonFunc.closeApp(pkgName)
        }

        if (action && action()) {
          return true
        }

        // //install 第一次执行完action 保存应用数据
        // if(saveAppTimes == 0 && constant.taskType == 1 && constant.modifiedDeviceVersion == 2) {
        //   var md5 = org.autojs.autojs.tecdo.net.ScriptInteraction.backupApp()
        //   var firstInstallTimeRes = constant.runCommand(' dumpsys package ' + constant.pkgName  + ' | grep firstInstallTime').result
        //   var firstInstallTimes = firstInstallTimeRes.match(/firstInstallTime=(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
        //   var firstInstallTime = firstInstallTimes ? firstInstallTimes[1] : null
        //   apis.reportLog('install阶段保存应用数据成功')
        //   apis.reportAppInfo(md5,firstInstallTime)
        //   saveAppTimes = 1
        // }

        // isAd && commonFunc.handleAdPage(pkgName)

        if (!isCycle) return true
        if (packageName(pkgName).findOnce()) notInAppCount = 0
      } catch (error) {
        console.log('通用操作异常：' + error);
      }
    }, taskTimeOut * 1000 - 5 * 60 * 1000)
  }


// })()
module.exports = commonFunc;
