<?php
// Niva PHP Server 演示页面
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Niva PHP Server - 运行成功</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: #4a6cf7;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }
        .content {
            padding: 30px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .info-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #4a6cf7;
        }
        .info-card h3 {
            margin: 0 0 10px 0;
            color: #4a6cf7;
            font-size: 1.2em;
        }
        .info-card p {
            margin: 5px 0;
            color: #666;
        }
        .success-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            margin: 10px 0;
        }
        .feature-list {
            list-style: none;
            padding: 0;
        }
        .feature-list li {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .feature-list li:before {
            content: "✅ ";
            margin-right: 8px;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            color: #666;
            border-top: 1px solid #eee;
        }
        .php-info-link {
            display: inline-block;
            background: #6c757d;
            color: white;
            padding: 10px 20px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        .php-info-link:hover {
            background: #5a6268;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐘 PHP 服务器运行成功！</h1>
            <p>Niva PHP Server 已成功启动并运行</p>
            <div class="success-badge">✅ 服务器状态：正常运行</div>
        </div>

        <div class="content">
            <div class="info-grid">
                <div class="info-card">
                    <h3>服务器信息</h3>
                    <p><strong>PHP 版本:</strong> <?php echo PHP_VERSION; ?></p>
                    <p><strong>服务器时间:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
                    <p><strong>运行模式:</strong> <?php echo php_sapi_name(); ?></p>
                    <p><strong>内存限制:</strong> <?php echo ini_get('memory_limit'); ?></p>
                </div>

                <div class="info-card">
                    <h3>系统信息</h3>
                    <p><strong>操作系统:</strong> <?php echo PHP_OS; ?></p>
                    <p><strong>架构:</strong> <?php echo php_uname('m'); ?></p>
                    <p><strong>主机名:</strong> <?php echo php_uname('n'); ?></p>
                    <p><strong>用户:</strong> <?php echo get_current_user(); ?></p>
                </div>

                <div class="info-card">
                    <h3>目录信息</h3>
                    <p><strong>当前目录:</strong> <?php echo getcwd(); ?></p>
                    <p><strong>脚本路径:</strong> <?php echo __FILE__; ?></p>
                    <p><strong>临时目录:</strong> <?php echo sys_get_temp_dir(); ?></p>
                </div>

                <div class="info-card">
                    <h3>已启用功能</h3>
                    <ul class="feature-list">
                        <li>HTTP 服务器</li>
                        <li>文件系统访问</li>
                        <li>JSON 支持</li>
                        <li>会话管理</li>
                        <?php if (extension_loaded('curl')): ?>
                        <li>cURL 支持</li>
                        <?php endif; ?>
                        <?php if (extension_loaded('gd')): ?>
                        <li>GD 图像处理</li>
                        <?php endif; ?>
                        <?php if (extension_loaded('pdo')): ?>
                        <li>PDO 数据库</li>
                        <?php endif; ?>
                    </ul>
                </div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="?phpinfo=1" class="php-info-link">查看完整 PHP 信息</a>
                <a href="?test=1" class="php-info-link">运行测试脚本</a>
            </div>

            <?php if (isset($_GET['phpinfo'])): ?>
            <div style="margin-top: 30px;">
                <h3>PHP 配置信息</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow: auto;">
                    <?php phpinfo(); ?>
                </div>
            </div>
            <?php endif; ?>

            <?php if (isset($_GET['test'])): ?>
            <div style="margin-top: 30px;">
                <h3>测试结果</h3>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                    <p><strong>✅ 文件读写测试:</strong>
                    <?php
                    $testFile = 'test_write.txt';
                    $testContent = 'Niva PHP Server 测试 - ' . date('Y-m-d H:i:s');
                    if (file_put_contents($testFile, $testContent) !== false) {
                        $readContent = file_get_contents($testFile);
                        unlink($testFile);
                        echo "成功 (写入并读取: " . strlen($testContent) . " 字节)";
                    } else {
                        echo "失败";
                    }
                    ?>
                    </p>

                    <p><strong>✅ JSON 处理测试:</strong>
                    <?php
                    $testArray = ['status' => 'success', 'message' => 'JSON 测试', 'timestamp' => time()];
                    $json = json_encode($testArray);
                    $decoded = json_decode($json, true);
                    echo ($decoded['status'] === 'success') ? '成功' : '失败';
                    ?>
                    </p>

                    <p><strong>✅ 数学计算测试:</strong>
                    <?php
                    $result = 0;
                    for ($i = 1; $i <= 1000; $i++) {
                        $result += $i;
                    }
                    echo "1-1000 求和结果: " . number_format($result);
                    ?>
                    </p>
                </div>
            </div>
            <?php endif; ?>
        </div>

        <div class="footer">
            <p>Niva PHP Server &copy; 2024 | PHP <?php echo PHP_VERSION; ?> |
            运行时间: <?php echo round(microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'], 4); ?>s</p>
        </div>
    </div>
</body>
</html>