var proxy = {};

var getUrl = "http://10.51.0.140:8918";
//百度：10.137.0.8  测试环境：10.51.0.140 线上环境  10.29.1.180

proxy.getProxyConfig = function (env, country, proxyType, server_url, gaid) {
  if (server_url == undefined) {
    server_url = getUrl;
  }
  var data;
  if (proxyType.indexOf("tunnel") == 0) {
    data = {
      country: country,
      env: env,
      proto: "mix",
      proxy_type: proxyType, // "tunnel"  "dynamic"  "dc" "clash"
      is_exact: false,
      gaid: gaid,
    };
  } else {
    data = {
      country: country,
      env: env,
      proto: "mix",
      proxy_type: proxyType,
    };
  }

  var header = {
    "Content-Type": "application/json",
    "X-Api": "vst.proxy_reader.proxy.get",
    "X-Api-Timeout": "30",
  };

  log("data=" + JSON.stringify(data));
  log("header=" + JSON.stringify(header));
  log("----获取代理配置");
  var proxyConfig = null;
  var result = http.postJson(server_url, data, {
    headers: header,
  });

  // log("----返回代理配置:" + JSON.stringify(result))
  // log("----返回代理配置:" + result.body.string())

  var resultString = result.body.string();
  log("----返回代理配置:" + resultString);
  if (resultString != null && JSON.parse(resultString).code == 0) {
    proxyConfig = JSON.parse(resultString);
  } else {
    log("----获取代理失败");
  }
  return proxyConfig;
};
/**
 *
 * @param {*} env 服务器环境
 * @param {*} country 代理国家
 * @param {*} proxyType 代理类型 clash vpn dg
 * @param {*} packageName  应用包名
 * @returns
 */
proxy.setProxy = function (env, country, proxyType, packageName) {
  return proxy.setProxy(env, country, proxyType, packageName, getUrl);
};
/**
 *
 * @param {*} env 服务器环境
 * @param {*} country 代理国家
 * @param {*} proxyType 代理类型 clash vpn
 * @param {*} packageName  应用包名
 * @param {*} server_url  代理服务地址
 *
 * @returns
 */
proxy.setProxy = function (
  env,
  country,
  proxyType,
  packageName,
  server_url,
  gaid,
  orderId,
  offerId,
  phone_name,
  target,
  version_name,
  proxy_meta
) {
  log("设置代理");
  var proxyConfigID = proxyType + "_" + env + "_" + country;
  log("proxyConfigID=" + proxyConfigID);
  log("packageName=" + packageName);

  if (proxyType.indexOf("bara") == 0) {
    var baraPath = Packages.com.android.shell.util.BaraClientHelper.BARA_PATH;
    closeClash();
    closeBara();

    var meta = {
      labeler: "default",
      transporter: "basic",
      env: env,
      gaid: gaid,
      country: country,
      package: packageName,
      orderId: orderId,
      offerId: offerId,
      target: target,
      phoneName: phone_name,
      proxyType: proxyType,
      versionName: version_name,
    };
    Object.assign(meta, proxy_meta);
    var shellString =
      " echo '" +
      JSON.stringify(meta) +
      "' > " +
      baraPath +
      "/config/meta.json";
    log("dg shell =" + shellString);
    var dg = shell(shellString, true);
    var channeRe = this.changeProxy(
      packageName,
      "bara",
      "UseProvider",
      proxyConfigID,
      proxy_ip,
      proxy_port
    );

    return channeRe;
  } else {
    var config = this.getProxyConfig(env, country, proxyType, server_url, gaid);
    if (config == null) {
      return (
        " setProxy getProxyConfig 出错 " +
        "country " +
        country +
        "proxyType " +
        proxyType +
        " server_url = " +
        server_url
      );
    }
    var proxy_ip = config.result.ip;
    var proxy_port = config.result.port;

    if (proxyType.indexOf("clash") == 0) {
      closeClash();
      closeBara();
      var urlproxy =
        "proxies:\n- name: " +
        proxyConfigID +
        "\n  type: socks5\n  server: " +
        proxy_ip +
        "\n  port: " +
        proxy_port +
        // "\n  username: " +
        // proxy_username +
        // "\n  password: " +
        // proxy_password +
        "\n  skip-cert-verify: true";
      log("urlproxy=" + urlproxy);
      shell(' echo  "' + urlproxy + '" > /data/clash/url_proxy.yml ', true);
      var channeRe = this.changeProxy(
        packageName,
        proxyType,
        "UseProvider",
        proxyConfigID,
        proxy_ip,
        proxy_port
      );

      return channeRe;
    } else if (proxyType.indexOf("tunnel") > -1) {
      closeClash();
      closeBara();
      //拿一个clash的端口 给转发AF请求用
      var clashConfig = this.getProxyConfig(
        env,
        country,
        proxyType.replace("tunnel", "clash"),
        server_url,
        gaid
      );
      log("clashConfig ", clashConfig);
      var urlproxy =
        "proxies:\n- name: " +
        proxyConfigID +
        "\n  type: socks5\n  server: " +
        proxy_ip +
        "\n  port: " +
        proxy_port +
        "\n  username: " +
        config.result.dynamic.user +
        "\n  password: " +
        config.result.dynamic.pwd +
        "\n  skip-cert-verify: true" +
        "\n- name: appsflyer_" +
        proxyConfigID +
        "\n  type: http\n  server: " +
        clashConfig.result.ip +
        "\n  port: " +
        clashConfig.result.port +
        "\n  skip-cert-verify: true";

      log("urlproxy=" + urlproxy);
      shell(' echo  "' + urlproxy + '" > /data/clash/url_proxy.yml ', true);
      var channeRe = this.changeProxy(
        packageName,
        "clash",
        "UseProvider",
        proxyConfigID,
        proxy_ip,
        proxy_port
      );

      http.request("http://127.0.0.1:9090/proxies/AppsFlyer", {
        method: "PUT",
        contentType: "application/json",
        body: JSON.stringify({ name: "appsflyer_" + proxyConfigID }),
      });
      http.request("http://127.0.0.1:9090/proxies/CDN_Proxy", {
        method: "PUT",
        contentType: "application/json",
        body: JSON.stringify({ name: "appsflyer_" + proxyConfigID }),
      });
      return channeRe;
    } else if (proxyType.indexOf("dg") > -1) {
      closeClash();
      closeBara();
      var shellString =
        "dg config -r proxy -a proxy.enabled=true -a proxy.protocol=socks5 -a proxy.host=" +
        proxy_ip +
        " -a proxy.port=" +
        proxy_port;
      log("dg shell =" + shellString);
      var dg = shell(shellString, true);
      if (dg.code == 0) {
        return "success";
      } else {
        return " dg error " + dg;
      }
    }
  }

  return " proxyType 不支持:" + proxyType;
};

proxy.closeProxy = function (proxyType) {
  if (proxyType == "clash") {
    closeClash();
  }
};

proxy.changeProxy = function (
  packageName,
  proxyType,
  proxyHead,
  proxyName,
  ip,
  prot
) {
  log(proxyType);
  if (proxyType.indexOf("vpn") > -1) {
    closeClash();
    return openVPN(ip, prot);
  } else if (proxyType.indexOf("clash") == 0) {
    closeVPN(packageName);
    closeBara(packageName);
    return openClash(packageName, proxyHead, proxyName);
  } else if (proxyType.indexOf("bara") == 0) {
    closeClash();
    closeVPN(packageName);
    return openBara(packageName, proxyType, proxyName);
  } else {
    return true;
  }
};
function openBara(packageName, proxyType, proxyName) {
  try {
    Packages.com.android.shell.util.BaraClientHelper.startBaraByShell();
    if (
      Packages.com.android.shell.util.BaraClientHelper.addBaraPackage(
        packageName
      )
    ) {
      return "success";
    } else {
      return " openBara error ";
    }
  } catch (e) {
    log("openBara error " + e);
    return " openBara error " + e;
  }
}
function closeBara() {
  try {
    //关闭bara
    Packages.com.android.shell.util.BaraClientHelper.stopBaraByShell();
    return Packages.com.android.shell.util.BaraClientHelper.isBaraRunning();
  } catch (e) {}
  return true;
}
function closeVPN() {
  //关闭vpn
  try {
    var count = 5;
    while (count > 0) {
      count--;
      Packages.com.android.shell.util.VPNClientHelper.stopVpn();
      sleep(2000);
      if (!Packages.com.android.shell.util.VPNClientHelper.isVPNRunning()) {
        return true;
      }
    }
  } catch (e) {
    log("google Tv 版本不支持" + e);
    return true;
  }
  return Packages.com.android.shell.util.VPNClientHelper.isVPNRunning();
}

function openClash(packageName, head, name) {
  try {
    try {
      // var clash =  http.get("http://127.0.0.1:9090" ) ;
      // Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();
      var re =
        Packages.com.android.shell.util.ClashClientHelper.startClashByShell();
      if (
        !re &&
        !Packages.com.android.shell.util.ClashClientHelper.isClashRunning()
      ) {
        log(
          " openClash faild ",
          re,
          "isClashRunning " +
            Packages.com.android.shell.util.ClashClientHelper.isClashRunning()
        );
        return " openClash faild ";
      }
    } catch (e) {
      return " openClash faild " + e;
    }
    // var loadConfig = http.request("http://127.0.0.1:9090/configs?force=false", {
    //   method: "PUT",
    //   contentType: "application/json",
    //   body: JSON.stringify({ path: "/data/clash/config.yaml" }),
    // });
    // if (loadConfig.statusCode == 204) {
    //   log(" clash 重新加载配置文件 ");
    // } else {
    //   var body = loadConfig.body.string();
    //   log(" clash 重新加载配置文件失败 " + body);
    //   return " clash /configs " + body;
    // }
    sleep(1000);
    log("head=" + head);
    log("name=" + name);
    var select = http.request("http://127.0.0.1:9090/proxies/" + head, {
      method: "PUT",
      contentType: "application/json",
      body: JSON.stringify({ name: name }),
    });

    //  http.request('http://127.0.0.1:9090/proxies/alicdn',{method :"PUT",contentType :"application/json",body :JSON.stringify( { name :"alicdn98"}) });
    if (select.statusCode == 204) {
      var addClashPackage =
        Packages.com.android.shell.util.ClashClientHelper.addClashPackage(
          packageName
        );
      log(packageName + " iptable 拦截规则 添加 " + addClashPackage);
      return addClashPackage
        ? "success"
        : packageName + " iptable 拦截规则 添加 " + addClashPackage;
    } else {
      var body = select.body.string();
      log(" 请求 切换clash 代理失败 " + body);
      return " 切换 代理失败 " + body;
    }
  } catch (e) {
    log("google Tv 版本不支持" + e);
    return "google Tv 版本不支持";
  }
}
function closeClash() {
  Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();
}
proxy.closeClash = function (packageName) {
  Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();
  // var clash=undefined;
  // try {
  //   clash = http.get("http://127.0.0.1:9090");
  // } catch (e) {
  //   log("closeClash 请求127 失败 ", e);
  //   return true;
  // }

  // if (clash == undefined || clash.statusCode != 200) {
  //   log(" clash 没有启动 " + clash.statusCode);
  //   return true;
  // } else {
  //   try {
  //     var re =
  //       Packages.com.android.shell.util.ClashClientHelper.removeClashPackage(
  //         packageName
  //       );
  //     log("删除 clash FILTER_OUT_CLASH  " + packageName + " " + re);
  //     return re ? "success" : "faild";
  //   } catch (e) {
  //     log("google Tv 版本不支持" + e);
  //     return "google Tv 版本不支持" + e;
  //   }
  // }
};

module.exports = proxy;
