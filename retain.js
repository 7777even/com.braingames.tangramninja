/**
 * 打开app 根据延迟时间关闭app
 */
var commonFunc = require('./commonFunc.js')

var data = engines.myEngine().execArgv;
var packageName = data.packageName;
var pkgName = data.packageName;
var delay_close_app = data.timeout * 1000 - 80 * 1000; //延迟关闭app
var complete = false;
var retention_day = data.retention_day;
//var packageName = "com.alibaba.aliexpresshd";
//var delay_close_app = 20000; //延迟其app
if (retention_day > 5) {
  delay_close_app = 240 * 1000;
}


var screenImgPath = '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/screenImg.png'

var IMG = {
  continue: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/continue.png',
  hand: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/hand.png',
  close: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/close.png',
  right: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/right.png',
  accept: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/accept.png',
  continue1: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/continue1.png',
  accept1: '/sdcard/AutoJs_js/com.mnogogames.triviascapes/images/accept1.png',
}


function clickColor(color, desc, options, sleepTime) {
  sleepTime = sleepTime || random(5000, 7000);
  var point = commonFunc.getFindColor(screenImgPath, color, options);
  if (point) {
    commonFunc.clickAbsoluteLocation(point.x, point.y, desc);
    sleep(sleepTime);
    return point;
  }
  return;
}

function checkAndClick (img,desc) {
  return commonFunc.getPointInImage(pkgName, img, screenImgPath) && commonFunc.clickAction(pkgName, img, { isAd: true, desc: desc, screenImgPath: screenImgPath })
}

function answer () {
  if(commonFunc.getPointInImage(pkgName, IMG.right, screenImgPath)) {
    var points = [[163,750], [149,869], [174,983], [183,1101]]
    var point = points[random(0, 3)]
    commonFunc.clickAbsoluteLocation(point[0],point[1], '随机选择答案')
  }
}

function sendADBroadCast() {
  shell(" am broadcast -a " + packageName + "_iaa_hook_start", true);
}

function gameAction() { 
  console.log('gameaAction')
  commonFunc.screenshot(screenImgPath)
  checkAndClick(IMG.accept, '点击accept')
  clickColor('#27C72E', '点击accept', {
    region: [230, 900, 20, 20],
    threshold: 4
  })
  clickColor('#01810E', '点击accept1', {
    region: [230, 950, 20, 20],
    threshold: 4
  })
  clickColor('#01810E', '点击accept1', {
    region: [210, 880, 20, 20],
    threshold: 4
  })
  clickColor('#27CF2E', '点击continue', {
    region: [130, 980, 20, 20],
    threshold: 4
  })

  clickColor('#24C02B', '点击continue', {
    region: [210, 870, 20, 20],
    threshold: 4
  })

  clickColor('#2AC731', '点击continue', {
    region: [240, 1100, 20, 20],
    threshold: 4
  })
  
  checkAndClick(IMG.continue, '点击 continue')
  checkAndClick(IMG.continue1, '点击 continue1')

  // checkAndClick(IMG.continue, '点击continue')
  if (commonFunc.getPointInImage(pkgName, IMG.hand, screenImgPath)) {
     commonFunc.swipeRelativeLocation(222,776, 318,777, 1500, '滑动年龄') 
  }
  clickColor('#26C92D', '点击continue1', {
    region: [190, 1070, 20, 20],
    threshold: 4
  })
  clickColor('#25C62C', '点击 play', {
    region: [210, 1020, 20, 20],
    threshold: 4
  })
  answer();
  checkAndClick(IMG.close, '点击 close')
  sendADBroadCast();
}





//先强制关闭
shell(" am force-stop " + packageName, true);
log("packageName" + packageName);
sleep(2000);

//启动应用
launch(packageName);
log("启动应用" + currentActivity());
sleep(5000);
//延迟关闭
log("delay_close_app", delay_close_app);
setTimeout(function () {
  doReturn(0, "success");

  complete = true;
  shell(" am force-stop " + packageName, true);
  home();
}, delay_close_app);
gameAction()
threads.start(function () {
  //在新线程执行的代码
  while (!complete) {
    sleep(2000);
    if (currentActivity() != "com.unity3d.player.UnityPlayerActivity") {
      //clickView(className("android.widget.Button").findOne(5000));
      log("广告页面");
      sleep(10000);
    } else {
      gameAction()
    }
    if (currentPackage() != packageName) {
      launch(packageName);
      sleep(10000);
    }
  }
  shell(" am force-stop " + packageName, true);
});
