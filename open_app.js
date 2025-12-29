var commonFunc = require('./commonFunc.js');
var data = engines.myEngine().execArgv;
var pkgName = data.packageName || 'com.braingames.tangramninja';
var timeout = data.timeout || 180;

// 调试信息：输出配置信息
log("=== 脚本配置信息 ===");
log("包名: " + pkgName);
log("超时时间: " + timeout + " 秒");

// 添加全局停止标志
var shouldStop = false;

var width = device.width;
var height = device.height;

// 首次进入标志，用于判断是否需要初始化tip提醒
var isFirstEnter = true;

// 初始化停止监听器
function initStopListener() {
  threads.start(function() {
    events.observeKey();
    // 音量下键停止
    events.onKeyDown("volume_down", function(event) {
      log("检测到音量下键，停止脚本");
      shouldStop = true;
    });
    // 音量上键暂停/继续
    var isPaused = false;
    events.onKeyDown("volume_up", function(event) {
      isPaused = !isPaused;
      if (isPaused) {
        toast("脚本已暂停");
        while (isPaused && !shouldStop) {
          sleep(1000);
        }
        toast("脚本继续运行");
      }
    });
  });
}

// 第一关的拼图操作步骤
var level1Steps = [
  {
    start: { x: 257, y: 866 },
    end: { x: 406, y: 755 },
    desc: '第一个方块：从(257,866)拖动到(406,755)'
  },
  {
    start: { x: 328, y: 864 },
    end: { x: 406, y: 631},
    desc: '第二个方块：从(315,828)拖动到(404,628)'
  },
  {
    start: { x: 388, y: 802 },
    end: { x: 217, y: 664 },
    desc: '第三个方块：从(397,826)拖动到(242,677)'
  },
  {
    start: { x: 482, y: 813 },
    end: { x: 308, y: 717 },
    desc: '第四个方块：从(488,837)拖动到(328,762)'
  }
];

// 第二关的拼图操作步骤
var level2Steps = [
  {
    start: { x: 175, y: 757 },
    end: { x: 515, y: 584 },
    desc: '第一个方块：从(175,757)拖动到(515,584)'
  },
  {
    start: { x: 260, y: 764 },
    end: { x: 206, y: 615 },
    desc: '第二个方块：从(260,764)拖动到(206,615)'
  },
  {
    start: { x: 353, y: 762 },
    end: { x: 262, y: 517 },
    desc: '第三个方块：从(353,762)拖动到(262,517)'
  },
  {
    start: { x: 442, y: 768 },
    end: { x: 248, y: 706 },
    desc: '第四个方块：从(442,768)拖动到(248,706)'
  },
  {
    start: { x: 546, y: 766 },
    end: { x: 446, y: 708 },
    desc: '第五个方块：从(546,766)拖动到(446,708)'
  },
  {
    start: { x: 177, y: 904 },
    end: { x: 277, y: 515 },
    desc: '第六个方块：从(177,904)拖动到(277,515)'
  },
  {
    start: { x: 271, y: 900 },
    end: { x: 331, y: 671 },
    desc: '第七个方块：从(271,900)拖动到(331,671)'
  },
  {
    start: { x: 364, y: 908 },
    end: { x: 457, y: 695 },
    desc: '第八个方块：从(364,908)拖动到(457,695)'
  }
];

// 第三关的拼图操作步骤
var level3Steps = [
  {
    start: { x: 180, y: 755 },
    end: { x: 513, y: 564 },
    desc: '第一个方块：从(180,755)拖动到(513,564)'
  },
  {
    start: { x: 271, y: 768 },
    end: { x: 491, y: 668 },
    desc: '第二个方块：从(271,768)拖动到(491,668)'
  },
  {
    start: { x: 357, y: 768 },
    end: { x: 357, y: 571 },
    desc: '第三个方块：从(357,768)拖动到(357,571)'
  },
  {
    start: { x: 444, y: 764 },
    end: { x: 244, y: 702 },
    desc: '第四个方块：从(444,764)拖动到(244,702)'
  },
  {
    start: { x: 540, y: 766 },
    end: { x: 428, y: 715 },
    desc: '第五个方块：从(540,766)拖动到(428,715)'
  },
  {
    start: { x: 177, y: 904 },
    end: { x: 357, y: 586 },
    desc: '第六个方块：从(177,904)拖动到(357,586)'
  },
  {
    start: { x: 262, y: 908 },
    end: { x: 222, y: 660 },
    desc: '第七个方块：从(262,908)拖动到(222,660)'
  }
];

// 关卡步骤映射表，可以根据需要添加更多关卡
var levelStepsMap = {
  1: level1Steps,
  2: level2Steps,
  3: level3Steps
};

// 每个关卡最多尝试的次数，避免死循环
var maxLevelAttempts = 5;

// 关卡检测截屏区域配置
// 只匹配数字部分，区域左上角坐标 (340, 57) 到右下角坐标 (377, 84)
var levelDetectRegion = {
  x: 340,
  y: 57,
  width: 377 - 340,  // 37
  height: 84 - 57    // 27
};

// 关卡检测截屏保存路径
var levelDetectImgPath = '/sdcard/AutoJs_js/com.braingames.tangramninja/images/level_detect.png';

// 关卡模板图片路径
var levelTemplatePaths = {
  1: './images/level1.png',
  2: './images/level2.png',
  3: './images/level3.png'
};


/**
 * 检测当前关卡号
 * 通过截取屏幕顶端中部区域 (268,4) - (444,95)，与关卡模板图片进行匹配
 * @returns {number|null} 如果检测到关卡返回关卡号 (1, 2, 或 3)，否则返回 null
 */
function detectCurrentLevel() {
  log("=== 开始检测当前关卡 ===");
  log("检测区域: (" + levelDetectRegion.x + ", " + levelDetectRegion.y + ") - (" + 
      (levelDetectRegion.x + levelDetectRegion.width) + ", " + 
      (levelDetectRegion.y + levelDetectRegion.height) + ")");
  
  try {
    // 步骤1: 截取指定区域
    log("步骤1: 截取屏幕指定区域...");
    
    // 确保目录存在
    var dirPath = '/sdcard/AutoJs_js/com.braingames.tangramninja/images';
    if (!files.exists(dirPath)) {
      files.ensureDir(dirPath);
      log("  创建目录: " + dirPath);
    }
    
    // 使用更可靠的方法：先截全屏到临时文件，然后读取并裁剪
    var tempFullScreenPath = '/sdcard/AutoJs_js/com.braingames.tangramninja/images/_temp_full_screen.png';
    var fullScreenImg = null;
    var clippedImg = null;
    
    try {
      // 步骤1: 截取全屏到临时文件
      log("  截取全屏到临时文件...");
      commonFunc.screenshot(tempFullScreenPath);
      
      // 等待文件写入完成
      sleep(500);
      
      // 检查临时文件是否存在
      if (!files.exists(tempFullScreenPath)) {
        log("  ✗ 全屏截图文件不存在: " + tempFullScreenPath);
        return null;
      }
      
      // 步骤2: 读取全屏图片
      log("  读取全屏图片...");
      fullScreenImg = images.read(tempFullScreenPath);
      
      if (!fullScreenImg) {
        log("  ✗ 读取全屏截图失败");
        return null;
      }
      
      log("  全屏截图成功，尺寸: " + fullScreenImg.getWidth() + "x" + fullScreenImg.getHeight());
      
      // 步骤3: 边界检查，确保裁剪区域不超出屏幕范围
      var validX = Math.max(0, Math.min(levelDetectRegion.x, fullScreenImg.getWidth() - 1));
      var validY = Math.max(0, Math.min(levelDetectRegion.y, fullScreenImg.getHeight() - 1));
      var validWidth = Math.max(1, Math.min(levelDetectRegion.width, fullScreenImg.getWidth() - validX));
      var validHeight = Math.max(1, Math.min(levelDetectRegion.height, fullScreenImg.getHeight() - validY));
      
      log("  裁剪区域: (" + validX + ", " + validY + ") 尺寸: " + validWidth + "x" + validHeight);
      
      // 步骤4: 裁剪指定区域
      clippedImg = images.clip(fullScreenImg, validX, validY, validWidth, validHeight);
      
      if (!clippedImg) {
        log("  ✗ 裁剪失败");
        fullScreenImg.recycle();
        return null;
      }
      
      // 步骤5: 保存裁剪后的图片
      images.save(clippedImg, levelDetectImgPath);
      log("  区域截图已保存到: " + levelDetectImgPath);
      
      // 释放内存
      fullScreenImg.recycle();
      clippedImg.recycle();
      
      // 删除临时文件
      try {
        if (files.exists(tempFullScreenPath)) {
          files.remove(tempFullScreenPath);
        }
      } catch (e) {
        // 忽略删除临时文件的错误
      }
      
    } catch (captureError) {
      log("  ✗ 截图过程发生错误: " + captureError);
      log("  错误详情: " + captureError.toString());
      if (fullScreenImg) fullScreenImg.recycle();
      if (clippedImg) clippedImg.recycle();
      // 尝试删除临时文件
      try {
        if (files.exists(tempFullScreenPath)) {
          files.remove(tempFullScreenPath);
        }
      } catch (e) {
        // 忽略删除临时文件的错误
      }
      return null;
    }
    
    // 检查截图文件是否存在
    if (!files.exists(levelDetectImgPath)) {
      log("✗ 区域截图文件不存在，检测失败");
      return null;
    }
    
    // 步骤2: 与各关卡模板图片进行匹配
    log("步骤2: 开始与关卡模板图片进行匹配...");
    // 提高阈值范围，从0.8开始，避免误识别
    var thresholds = [0.8, 0.85, 0.9, 0.92, 0.95];  // 尝试多个匹配阈值，最低0.8
    var minValidThreshold = 0.8;  // 最小有效匹配阈值，低于此值不认为是有效匹配
    
    // 用于存储所有匹配结果：{level: 关卡号, threshold: 匹配阈值}
    var allMatches = [];
    
    // 遍历所有关卡模板 (1, 2, 3)
    for (var level = 1; level <= 3; level++) {
      var templatePath = levelTemplatePaths[level];
      log("  检查第 " + level + " 关...");
      log("    模板图片路径: " + templatePath);
      
      // 处理相对路径，转换为绝对路径
      var actualTemplatePath = templatePath;
      if (templatePath && !templatePath.startsWith('/') && !templatePath.startsWith('sdcard')) {
        var currentDir = files.cwd();
        if (templatePath.startsWith('./')) {
          actualTemplatePath = files.join(currentDir, templatePath.substring(2));
        } else {
          actualTemplatePath = files.join(currentDir, templatePath);
        }
      }
      
      // 检查模板图片是否存在
      if (!files.exists(actualTemplatePath)) {
        log("    ✗ 模板图片不存在: " + actualTemplatePath);
        continue;  // 跳过这个关卡，继续检查下一个
      }
      
      // 尝试不同的阈值进行匹配，记录最高匹配阈值
      var bestMatchThreshold = null;
      var bestMatchPoint = null;
      
      for (var i = 0; i < thresholds.length; i++) {
        var threshold = thresholds[i];
        var screenImg = null;
        var templateImg = null;
        
        try {
          // 读取区域截图和模板图片
          screenImg = images.read(levelDetectImgPath);
          templateImg = images.read(actualTemplatePath);
          
          if (screenImg && templateImg) {
            // 检查图片尺寸并输出日志（只在第一次检查时输出）
            if (i === 0) {
              var screenWidth = screenImg.getWidth();
              var screenHeight = screenImg.getHeight();
              var templateWidth = templateImg.getWidth();
              var templateHeight = templateImg.getHeight();
              
              log("    区域截图尺寸: " + screenWidth + "x" + screenHeight);
              log("    模板图片尺寸: " + templateWidth + "x" + templateHeight);
            }
            
            var matchPoint = null;
            var resizedTemplate = null;  // 用于存储调整后的模板图片
            
            try {
              // 根据尺寸决定匹配方向
              // images.findImage(源图片, 模板图片) 要求源图片 >= 模板图片（两个维度都要满足）
              if (screenImg.getWidth() >= templateImg.getWidth() && screenImg.getHeight() >= templateImg.getHeight()) {
                // 正常情况：区域截图 >= 模板图片，在区域截图中找模板图片
                if (i === 0) {
                  log("    使用正常匹配：在区域截图中查找模板图片");
                }
                matchPoint = images.findImage(screenImg, templateImg, { 
                  threshold: threshold 
                });
              } else if (templateImg.getWidth() >= screenImg.getWidth() && templateImg.getHeight() >= screenImg.getHeight()) {
                // 反向情况：模板图片 >= 区域截图，在模板图片中找区域截图
                if (i === 0) {
                  log("    使用反向匹配：在模板图片中查找区域截图");
                }
                matchPoint = images.findImage(templateImg, screenImg, { 
                  threshold: threshold 
                });
              } else {
                // 尺寸互有大小的情况：需要调整模板图片尺寸以适配区域截图
                if (i === 0) {
                  log("    图片尺寸不完全匹配，尝试调整模板图片尺寸...");
                }
                
                // 计算需要缩放的比例（取较小的比例，确保模板图片不会超出区域截图）
                var scaleWidth = screenImg.getWidth() / templateImg.getWidth();
                var scaleHeight = screenImg.getHeight() / templateImg.getHeight();
                var scale = Math.min(scaleWidth, scaleHeight);
                
                // 计算调整后的模板图片尺寸
                var newTemplateWidth = Math.floor(templateImg.getWidth() * scale);
                var newTemplateHeight = Math.floor(templateImg.getHeight() * scale);
                
                if (i === 0) {
                  log("    缩放比例: " + scale.toFixed(2) + "，新尺寸: " + newTemplateWidth + "x" + newTemplateHeight);
                }
                
                // 缩放模板图片
                resizedTemplate = images.resize(templateImg, [newTemplateWidth, newTemplateHeight]);
                
                if (resizedTemplate) {
                  if (i === 0) {
                    log("    模板图片缩放成功，尝试匹配...");
                  }
                  matchPoint = images.findImage(screenImg, resizedTemplate, { 
                    threshold: threshold 
                  });
                } else {
                  if (i === 0) {
                    log("    ✗ 模板图片缩放失败");
                  }
                }
              }
            } finally {
              // 清理缩放后的模板图片
              if (resizedTemplate && resizedTemplate !== templateImg) {
                resizedTemplate.recycle();
              }
            }
            
            if (matchPoint) {
              // 记录最佳匹配（阈值越高越好）
              if (bestMatchThreshold === null || threshold > bestMatchThreshold) {
                bestMatchThreshold = threshold;
                bestMatchPoint = matchPoint;
              }
            }
            
            screenImg.recycle();
            templateImg.recycle();
          } else {
            if (!screenImg) log("    ✗ 读取区域截图失败");
            if (!templateImg) log("    ✗ 读取模板图片失败: " + actualTemplatePath);
            if (screenImg) screenImg.recycle();
            if (templateImg) templateImg.recycle();
          }
        } catch (matchError) {
          log("    ✗ 阈值 " + threshold + " 匹配时发生错误: " + matchError);
          if (screenImg) screenImg.recycle();
          if (templateImg) templateImg.recycle();
        }
      }
      
      // 如果找到匹配且达到最小有效阈值，记录到结果数组
      if (bestMatchThreshold !== null && bestMatchThreshold >= minValidThreshold) {
        log("    ✓ 第 " + level + " 关匹配成功（最高阈值: " + bestMatchThreshold + "）");
        log("      匹配坐标: " + JSON.stringify(bestMatchPoint));
        allMatches.push({
          level: level,
          threshold: bestMatchThreshold,
          point: bestMatchPoint
        });
      } else if (bestMatchThreshold !== null) {
        log("    ✗ 第 " + level + " 关匹配阈值太低（" + bestMatchThreshold + " < " + minValidThreshold + "），忽略");
      } else {
        log("    ✗ 第 " + level + " 关未匹配（已尝试所有阈值）");
      }
    }
    
    // 从所有匹配结果中选择最佳匹配（阈值最高的）
    if (allMatches.length > 0) {
      // 按阈值从高到低排序
      allMatches.sort(function(a, b) {
        return b.threshold - a.threshold;
      });
      
      var bestMatch = allMatches[0];
      log("=== 所有匹配结果 ===");
      for (var j = 0; j < allMatches.length; j++) {
        log("  第 " + allMatches[j].level + " 关: 阈值 " + allMatches[j].threshold);
      }
      
      // 如果有多于一个匹配结果，检查最佳匹配是否明显优于其他匹配
      if (allMatches.length > 1) {
        var secondBestThreshold = allMatches[1].threshold;
        var thresholdDiff = bestMatch.threshold - secondBestThreshold;
        log("  最佳匹配阈值: " + bestMatch.threshold + "，次佳匹配阈值: " + secondBestThreshold);
        log("  阈值差异: " + thresholdDiff.toFixed(3));
        
        // 如果最佳匹配和次佳匹配的阈值差异小于0.05，说明匹配不够明确，可能误识别
        if (thresholdDiff < 0.05) {
          log("  ⚠ 警告: 最佳匹配和次佳匹配的阈值差异太小（" + thresholdDiff.toFixed(3) + " < 0.05）");
          log("  可能存在误识别风险，但选择阈值最高的匹配");
        }
      }
      
      log("=== 关卡检测结果: 第 " + bestMatch.level + " 关（最佳匹配，阈值: " + bestMatch.threshold + "） ===");
      return bestMatch.level;
    }
    
    log("=== 关卡检测结果: 未检测到匹配的关卡 ===");
    log("  可能原因: 截图区域不正确、模板图片不匹配、图片质量差异");
    return null;
    
  } catch (e) {
    log("✗ 关卡检测时发生异常: " + e);
    log("  异常详情: " + e.toString());
    log("  堆栈信息: " + (e.stack || "无堆栈信息"));
    return null;
  }
}




/**
 * 执行关卡的所有步骤
 * @param {Array} steps 关卡步骤数组
 */
function runLevelSteps(steps) {
  if (!steps || steps.length === 0) {
    log("警告: 步骤数组为空，无法执行");
    return;
  }
  
  log("=== 开始执行关卡步骤 ===");
  log("步骤总数: " + steps.length);
  
  for (var i = 0; i < steps.length; i++) {
    if (shouldStop) {
      log("检测到停止标志，退出步骤执行");
      return;
    }
    
    var step = steps[i];
    log("--- 步骤 " + (i + 1) + "/" + steps.length + " ---");
    log("  描述: " + step.desc);
    log("  起始坐标: (" + step.start.x + ", " + step.start.y + ")");
    log("  目标坐标: (" + step.end.x + ", " + step.end.y + ")");

    // 不传入固定时间，让 dragPiece 根据距离自动计算
    dragPiece(
      step.start.x,
      step.start.y,
      step.end.x,
      step.end.y,
      step.desc
    );

    // 步骤之间的等待时间，让界面稳定
    var waitTime = random(300, 500);
    log("  等待 " + waitTime + "ms 让界面稳定...");
    sleep(waitTime);
  }
  
  log("=== 所有步骤执行完成 ===");
}

// 执行拖拽操作

function dragPiece(startX, startY, endX, endY, desc, duration) {
  // 计算拖拽距离（像素）
  var distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  // 根据距离动态计算拖拽时间
  // 基础时间：800ms，每100像素增加200ms，最小1000ms，最大3000ms
  if (!duration) {
    var baseDuration = 1000;  // 基础时间（毫秒）
    var durationPerPixel = 2;  // 每像素增加的时间（毫秒）
    var calculatedDuration = baseDuration + (distance * durationPerPixel);
    
    // 限制在合理范围内：最小1000ms，最大3000ms
    duration = Math.max(1000, Math.min(3000, calculatedDuration));
    
    // 添加一些随机性，避免过于规律
    duration = duration + random(-100, 100);
    duration = Math.max(1000, Math.min(3000, duration));
  }
  
  try {
    log(desc + ' - 起始坐标: (' + startX + ',' + startY + ') -> 目标坐标: (' + endX + ',' + endY + ')');
    log('  拖拽距离: ' + distance.toFixed(1) + ' 像素');
    log('  拖拽时间: ' + duration.toFixed(0) + ' 毫秒');
    swipe(startX, startY, endX, endY, duration);
    sleep(random(500, 800));
  } catch (error) {
    log('拖拽操作失败：' + error);
  }
}

/**
 * 执行指定关卡的游戏操作
 * @param {number} currentLevel 当前关卡号
 */
function playLevel(currentLevel) {
  // 如果没有传入关卡号，默认使用第1关
  currentLevel = currentLevel || 1;
  
  log("=== 开始执行关卡 ===");
  log("关卡号: " + currentLevel);
  
  // 从映射表中获取当前关卡的步骤
  var steps = levelStepsMap[currentLevel];
  if (!steps) {
    log('✗ 未找到第 ' + currentLevel + ' 关的步骤配置');
    log('  可用关卡: ' + Object.keys(levelStepsMap).join(', '));
    return;
  }
  
  log('✓ 找到第 ' + currentLevel + ' 关的步骤配置');
  log('  步骤总数: ' + steps.length);
  log('开始执行第 ' + currentLevel + ' 关拼图操作');
  sleep(1500);

  var levelStartTime = new Date().getTime();
  
  // 执行关卡步骤
  runLevelSteps(steps);
  
  var levelElapsed = new Date().getTime() - levelStartTime;
  log('=== 第 ' + currentLevel + ' 关步骤执行完成 ===');
  log('  总耗时: ' + levelElapsed + ' 毫秒 (' + (levelElapsed / 1000).toFixed(2) + ' 秒)');
}

function gameAction(currentLevel) {
  if (shouldStop) {
    log("检测到停止标志，退出游戏操作");
    return;
  }
  
  log('执行游戏操作');

  // 检查是否在游戏内
  var currentPkg = currentPackage();
  log('当前应用包名: ' + currentPkg);
  
  if (currentPkg !== pkgName) {
    log('不在游戏内，正在启动目标应用...');
    if (!launch(pkgName)) {
      log('启动应用失败: ' + pkgName);
      return;
    }
    sleep(3000);
  }
  
  playLevel(currentLevel);
}


function main() {
  // 初始化停止监听
  initStopListener();

  log("脚本开始运行");
  log("按音量下键停止脚本，按音量上键暂停/继续");

  // 记录开始时间
  var startTime = new Date().getTime();
  var totalTimeoutMs = timeout * 1000;
  
  log("脚本总运行时间: " + timeout + " 秒");

  // 启动应用
  if (!launch(pkgName)) {
    log('启动应用失败: ' + pkgName);
    exit();
  }
  sleep(3000);

  // 主循环：持续检测关卡号，当关卡号变化时执行对应攻略
  var lastDetectedLevel = null;
  var completedLevels = 0;
  
  while (!shouldStop) {
    // 检查是否超时
    if (new Date().getTime() - startTime > totalTimeoutMs) {
      log("脚本运行时间超时，准备退出");
      break;
    }
    
    // 等待界面稳定，确保游戏界面已加载
    log("等待界面稳定...");
    sleep(2000);
    
    // 通过截屏检测当前关卡号（只检测数字部分）
    log("=== 开始检测当前关卡（数字部分） ===");
    var detectedLevel = detectCurrentLevel();
    
    if (detectedLevel === null || detectedLevel === undefined) {
      log("✗ 未能检测到当前关卡，等待后重试...");
      sleep(3000);
      continue;  // 跳过本次循环，重新尝试检测
    }
    
    var currentLevel = detectedLevel;
    log("✓ 检测到当前关卡: 第 " + currentLevel + " 关");
    
    // 如果关卡号发生变化，或者首次检测到关卡
    if (lastDetectedLevel !== currentLevel) {
      if (lastDetectedLevel !== null) {
        completedLevels++;
        log("=== 关卡切换检测 ===");
        log("从第 " + lastDetectedLevel + " 关切换到第 " + currentLevel + " 关");
        log("当前已完成关卡数: " + completedLevels);
      }
      
      lastDetectedLevel = currentLevel;
    }
    
    // 无论关卡号是否变化，都执行当前关卡的攻略
    // 如果关卡号未变化，说明攻略还没完成，需要重复执行直到通关
    log("=== 开始执行第 " + currentLevel + " 关攻略 ===");
    gameAction(currentLevel);
    
    log("=== 第 " + currentLevel + " 关攻略执行完成 ===");
    log("等待后继续检测关卡号...");
    
    // 短暂等待后继续检测
    sleep(2000);
  }

  log("脚本执行完毕，共完成 " + completedLevels + " 关");
  log("准备退出脚本");
  
  home();
  sleep(1000);
  exit();
}

// 运行主函数
main();