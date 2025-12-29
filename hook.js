var data = engines.myEngine().execArgv;
var packageName = data.packageName;
//var packageName = "com.kwai.video";
var sergeiStr = files.read(
  "/data/local/pmxped/sergei/" + packageName + ".json"
);

var sergei = JSON.parse(sergeiStr);

log(sergei.packages_info);

var packages_info = sergei.packages_info;
var CPUInfo = sergei.extra_info.user.CPUInfo;
var lastUpdateTime = sergei.packages_info[packageName].lastUpdateTime;
if (lastUpdateTime != undefined) {
  log(lastUpdateTime["value"]);
  var time = lastUpdateTime["value"];

  log("time", time);
  const date = new Date(parseInt(time));

  // 使用 Date 对象的方法获取 UTC 时间的各个部分
  const year = date.getUTCFullYear();
  const month = padStart(String(date.getUTCMonth() + 1));
  const day = padStart(String(date.getUTCDate()));
  const hours = padStart(String(date.getUTCHours()));
  const minutes = padStart(String(date.getUTCMinutes()));
  const seconds = padStart(String(date.getUTCSeconds()));
  const milliseconds = String(date.getUTCMilliseconds());
  const formattedUTC =
    year +
    "-" +
    month +
    "-" +
    day +
    "" +
    hours +
    ":" +
    minutes +
    ":" +
    seconds +
    "." +
    milliseconds;
  log("formattedUTC", formattedUTC);
  var apkPath = context
    .getPackageManager()
    .getApplicationInfo(packageName, 0).sourceDir;
  // var apkPath = app.getInstallApkPath(packageName);
  var parentPath = apkPath.substring(0, apkPath.lastIndexOf("/"));

  log(" TZ=UTC touch -amd " + formattedUTC + " " + parentPath + "/*");
  shell(
    " TZ=UTC touch -amd " + formattedUTC + " " + parentPath + "/lib/arm/*",
    true
  );
  shell(
    " TZ=UTC touch -amd " + formattedUTC + " " + parentPath + "/lib/*",
    true
  );
  shell(
    " TZ=UTC touch -amd " + formattedUTC + " " + parentPath + "/lib/arm64/*",
    true
  );
  var result = shell(
    " TZ=UTC touch -amd " + formattedUTC + " " + parentPath + "/*",
    true
  );
  log("  touch result " + result);
  if (CPUInfo != undefined) {
    result = shell(
      ' echo  "' + CPUInfo + '" > /data/local/config/cpuinfo ',
      true
    );
    log("  echo cpuinfo " + result);
  }
}
function padStart(str) {
  var padding = "";
  var padChar = 0;
  var targetLength = 2;
  var padLength = targetLength - str.length;

  while (padLength > 0) {
    padding += padChar;
    padLength--;
  }

  return padding + str;
}
