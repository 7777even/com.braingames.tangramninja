var clash_proxy = {};

 

clash_proxy.getProxyConfig = function (  country, proxyType, server_url, gaid) {
  // 使用示例
 var   proxyConfig = null;
  try {
    proxyConfig = postRequestWithRetry(
      server_url, 
      {
          category: proxyType,
          localProxyNetType: "OUTSIDE_LB",
          country: country,
          city: null,
          gaid: gaid,
          noCheck: true
      }
  );
  console.log("请求成功:", proxyConfig);
} catch (e) {
  console.error("最终请求失败:", e.message);
}
  return proxyConfig;
};

/**
 *
 * @param {*} env 服务器环境
 * @param {*} country 代理国家
 * @param {*} proxyType 代理类型 clash vpn
 * @param {*} packageName  应用包名
 * @param {*} server_url  代理服务地址
 * @param {*} rules_url  reles 服务地址
 * @returns
 */
clash_proxy.setProxy = function (
  env,
  country,
  proxyType,
  packageName,
  server_url,
  rules_url,
  gaid
) {
  log("设置代理");
  var proxyConfigID = proxyType + "_" + env + "_" + country;
  log("proxyConfigID=" + proxyConfigID);
  log("packageName=" + packageName);

 
    var config = this.getProxyConfig( country, proxyType, server_url, gaid);
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
     
    var processed =processResponse(JSON.parse(config));

    if (processed.localProxies.length === 0) {
      return("未找到localProxy数据");
    }
    if (processed.customProxies.length === 0) {
      return("未找到zone=custom的proxy数据");
    } 
    if(processed.zoomProxies.length === 0){
      processed.zoomProxies =processed.customProxies;
    }
    closeClash(); 
    //  AppsFlyer 是用的 mitmProxy
      var urlproxy =
        "proxies:\n- name: " +
        "mitmProxy" +
        "\n  type: http\n  server: " +
        processed.localProxies[0].ip+
        "\n  port: " +
        processed.localProxies[0].port +
        "\n  skip-cert-verify: true";
      log("urlproxy=" + urlproxy);
      shell(' echo  "' + urlproxy + '" > /data/clash/url_proxy.yml ', true);

 //  CDN_Proxy 是用的 CDNProxy
      var cdn_proxy =
      "proxies:\n- name: " +
      "CDNProxy" +
      "\n  type: socks5\n  server: " +
      processed.zoomProxies[0].ip+
      "\n  port: " +
      processed.zoomProxies[0].port +
      "\n  username: " +
      processed.zoomProxies[0].username +
      "\n  password: " +
      processed.zoomProxies[0].password +
      "\n  skip-cert-verify: true";

    log("cdn_proxy=" + cdn_proxy);
    shell(' echo  "' + cdn_proxy + '" > /data/clash/cdn_proxy.yml ', true);
    //UseProvider 使用的是 useProviderProxy
      var useProviderProxy =
      "proxies:\n- name: " +
      "useProviderProxy" +
      "\n  type: socks5\n  server: " +
        processed.customProxies[0].ip+
        "\n  port: " +
        processed.customProxies[0].port +
        "\n  username: " +
        processed.customProxies[0].username +
        "\n  password: " +
        processed.customProxies[0].password +
        "\n  skip-cert-verify: true";
    log("useProviderProxy=" + useProviderProxy);
    shell(' echo  "' + useProviderProxy + '" > /data/clash/custom_proxy.yml ', true);

    var rules ={code:1};
 
      try {
        rules = postRequestWithRetry(
          rules_url,
          {
              packageName: packageName,
              env: env
          }
        ) ; 
    } catch (e) {
      console.error(" rules 最终请求失败:", e.message);
    } 
      rules = JSON.parse(rules); 
      if(rules.code==0){
        shell(' echo  "' + rules.data.rules + '" > /data/clash/rules_tem.yaml ', true);
        var r= openClash(packageName, "UseProvider", "useProviderProxy");
        http.request("http://127.0.0.1:9090/proxies/" + "AppsFlyer", {
          method: "PUT",
          contentType: "application/json",
          body: JSON.stringify({ name: "mitmProxy" }),
        },function(res, err){ 
          if(res!=null&&res.statusCode==204){ 
            log("请求成功: mitmProxy ", res.body.string());
          }else{
            log("请求失败: mitmProxy ", res.body.string());
          }
         
        });
      
        http.request("http://127.0.0.1:9090/proxies/" + "CDNProxy", {
          method: "PUT",
          contentType: "application/json",
          body: JSON.stringify({ name: "CDNProxy" }),
        },function(res, err){
          if(res!=null&&res.statusCode==204){ 
            log("请求成功: CDNProxy ", res.body.string());
          }else{
            log("请求失败: CDNProxy ", res.body.string());
          }
             
        }); 
       
        return r;
      }else{
        return "请求rules失败";
      }


   
  }   
 
 
  

function openClash(packageName, head, name) {
  try {
    try {
  
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
  
    sleep(1000);
    log("head=" + head);
    log("name=" + name);
    var select = http.request("http://127.0.0.1:9090/proxies/" + head, {
      method: "PUT",
      contentType: "application/json",
      body: JSON.stringify({ name: name }),
    });
   
    //  http.request('http://127.0.0.1:9090/proxies/alicdn',{method :"PUT",contentType :"application/json",body :JSON.stringify( { name :"alicdn98"}) });
    if (select!=null&&select.statusCode == 204) {
      var body = select.body.string();
      log("请求结果 " + body);
      var addClashPackage =
        Packages.com.android.shell.util.ClashClientHelper.addClashPackage(
          packageName
        );
      log(packageName + " iptable 拦截规则 添加 " + addClashPackage);
      return addClashPackage
        ? "success"
        : packageName + " iptable 拦截规则 添加 " + addClashPackage;
    } else {

      log(" 请求 切换clash 代理失败 " + body);
      return " 切换 代理失败 " + body;
    }
  } catch (e) {
    log("google KEEP 版本不支持" + e);
    return "google KEEP 版本不支持";
  }
}
function closeClash() {
  Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();
  shell('kill -9 $(pgrep -f "clash -d") ',true);
}
clash_proxy.closeClash = function (packageName) {
  Packages.com.android.shell.util.ClashClientHelper.stopClashByShell();

};

function postRequestWithRetry(url, params) {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < maxRetries) {
      try {
          // 创建HTTP请求对象
          let response = http.postJson(url,  params    );

          // 检查HTTP状态码
          if (response.statusCode === 200) {
              try {
                  // 尝试解析JSON响应
                  return response.body.string();
              } catch (e) {
                  throw new Error('响应解析失败: ' + e.message);
              }
          } else {
              throw new Error('HTTP请求失败 状态码: '+ response.statusCode +" url ="+url);
          }
      } catch (e) {
          lastError = e;
          retryCount++;
          console.warn( '请求失败 (第'+ retryCount+'次重试):'  +e.message );
          
          // 最后一次重试前不等待
          if (retryCount < maxRetries) {
              sleep(1000); // 等待1秒后重试
          }
      }
  }
  
  throw new Error('所有重试均失败，最后错误:  '+lastError ? lastError.message : '未知错误');
}

function processResponse(responseData) {
  if (responseData.code !== 0) {
      throw new Error('响应code非0: '+responseData.code );
  }

  const result = {
      localProxies: [],
      customProxies: []
  };

  // 处理localProxy数据
  if (Array.isArray(responseData.data.localProxy)) {
      result.localProxies = responseData.data.localProxy.map(proxy => ({
          ip: proxy.ip,
          port: proxy.port
      }));
  }

  // 处理proxy数据
  if (Array.isArray(responseData.data.proxy)) {
      result.customProxies = responseData.data.proxy
          .filter(p => p.zone === 'custom')
          .map(proxy => ({
              ip: proxy.ip,
              port: proxy.port,
              username: proxy.user,
              // 如果name字段实际不存在，可以用user代替
              password: proxy.password 
          }));
      result.zoomProxies = responseData.data.proxy
          .filter(p => p.zone === 'static')
          .map(proxy => ({
              ip: proxy.ip,
              port: proxy.port,
              username: proxy.user,
              // 如果name字段实际不存在，可以用user代替
              password: proxy.password 
          }));
  }

  // 检查必要数据是否存在
  if (result.localProxies.length === 0) {
      log("未找到localProxy数据");
  }
  if (result.customProxies.length === 0) {
      log("未找到zone=custom的proxy数据");
  }

  return result;
}


module.exports = clash_proxy;
