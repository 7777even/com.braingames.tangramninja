/**
 * 打开app 根据延迟时间关闭app
 */

var data = engines.myEngine().execArgv;
var packageName = data.packageName;
var delay_close_app = data.timeout * 1000 - 80 * 1000; //延迟关闭app
var complete = false;
//var packageName = "com.alibaba.aliexpresshd";
//var delay_close_app = 20000; //延迟其app

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
shell(" am broadcast -a " + packageName + "_iaa_hook_start", true);
threads.start(function () {
  //在新线程执行的代码
  while (!complete) {
    sleep(2000);
    if (currentActivity() != "com.unity3d.player.UnityPlayerActivity") {
      //  clickView(className("android.widget.Button").findOne(5000));
      log("广告页面");
      sleep(2000);
    } else {
      var cp = currentPackage();
      log("当前包名" + cp);
      if (cp != packageName) {
        launch(packageName);
        sleep(10000);
      }
    }
  }
  shell(" am force-stop " + packageName, true);
});
