# 🚀 Niva PHP Server 快速开始指南

## 📋 准备工作

### 系统要求
- ✅ Niva 框架环境
- ✅ 网络连接（用于下载 PHP 和 Composer）
- ✅ 可用端口 3000（或其他自定义端口）

### 项目文件准备
根据你的项目类型，准备相应的文件：

#### 方式 1: 使用 www.zip 文件
将你的 PHP 项目打包为 `www.zip` 文件，放在应用目录中。

#### 方式 2: 直接放置文件
将 PHP 项目文件直接放在应用的工作目录中。

## 🎯 5分钟快速启动

### 步骤 1: 启动应用
1. 在 Niva 环境中打开项目
2. 应用会自动开始初始化

### 步骤 2: 观察启动过程
应用会依次执行以下步骤：

```
✅ 检查 Niva API 可用性
✅ 检查端口 3000 可用性
✅ 检测系统 PHP 环境
✅ 提取/检测 PHP 项目
✅ 识别 PHP 框架类型
✅ 处理 Composer 依赖
✅ 启动 PHP 服务器
✅ 健康检查
```

### 步骤 3: 访问应用
启动成功后，你的 PHP 应用将在 `http://localhost:3000` 运行。

## 📊 支持的项目类型

### 🔥 Laravel 项目
```
项目结构:
├── app/
├── config/
├── public/
├── artisan
└── composer.json

启动方式: php artisan serve
```

### 🚀 ThinkPHP 5/6 项目
```
项目结构:
├── app/
├── public/
├── think
└── composer.json

启动方式: php think run (自动回退到内置服务器)
```

### 🎵 Symfony 项目
```
项目结构:
├── src/
├── public/
├── bin/console
└── composer.json

启动方式: bin/console server:run
```

### 🔧 CodeIgniter 4 项目
```
项目结构:
├── app/
├── public/
├── spark
└── composer.json

启动方式: php spark serve
```

### 🎨 Yii 2 项目
```
项目结构:
├── web/
├── yii
└── composer.json

启动方式: php yii serve
```

### 📄 普通 PHP 项目
```
项目结构:
├── index.php
└── 其他 PHP 文件

启动方式: PHP 内置服务器
```

## 🔍 常见场景处理

### 场景 1: 全新环境（无 PHP）
```
[自动处理] 检测到系统无 PHP
[自动处理] 下载适合当前系统的 PHP
[自动处理] 解压到用户目录
[自动处理] 使用下载的 PHP 启动项目
```

### 场景 2: 有系统 PHP
```
[自动处理] 检测到系统 PHP: /usr/bin/php
[自动处理] 验证 PHP 版本和功能
[自动处理] 使用系统 PHP 启动项目
```

### 场景 3: 需要 Composer 依赖
```
[自动处理] 检测到 composer.json
[自动处理] 查找或下载 Composer
[自动处理] 执行 composer install
[自动处理] 安装完成后启动服务器
```

### 场景 4: ThinkPHP 启动失败
```
[自动处理] 尝试 php think run 启动
[检测到404] 连续检测到 404 错误
[自动回退] 停止 think 服务器
[自动回退] 使用 php -S -t public 重启
[成功运行] 服务器正常响应
```

## 🛠️ 故障排除

### 问题 1: 端口被占用
```
错误信息: 端口 3000 已被占用
解决方案: 
1. 应用会自动尝试清理端口
2. 或修改 CONFIG.PHP_PORT 使用其他端口
```

### 问题 2: PHP 下载失败
```
错误信息: 下载 PHP 失败
解决方案:
1. 检查网络连接
2. 检查防火墙设置
3. 手动安装系统 PHP
```

### 问题 3: Composer 安装失败
```
错误信息: composer install 失败
解决方案:
1. 检查 composer.json 格式
2. 检查网络连接
3. 手动删除 vendor 目录重试
```

### 问题 4: 服务器启动失败
```
错误信息: PHP 服务器启动失败
解决方案:
1. 检查 PHP 文件语法
2. 检查文件权限
3. 查看详细错误日志
```

## 📝 日志解读

### 正常启动日志示例
```
[20:44:14] 应用初始化开始
[20:44:14] 检查端口 3000
[20:44:14] 端口检查通过
[20:44:14] 找到可用的系统 PHP: /opt/homebrew/bin/php
[20:44:14] 工作目录: /Users/user/project
[20:44:14] PHP框架: thinkphp5
[20:44:14] 发现 composer.json，检查依赖...
[20:44:14] 开始执行 composer install...
[20:44:20] composer install 执行成功
[20:44:20] 正在启动 thinkphp5 项目
[20:44:20] PHP 服务器已启动，PID: 12345
[20:44:21] 根路径响应状态: 200
[20:44:21] PHP 服务器已就绪
```

### 错误日志示例
```
[20:44:14] 系统 PHP 不可用: command not found
[20:44:14] 开始下载 PHP...
[20:44:30] PHP 下载完成
[20:44:31] 使用下载的 PHP: /path/to/downloaded/php
```

## 🎛️ 自定义配置

### 修改默认端口
在 `js/app.js` 中找到并修改：
```javascript
const CONFIG = {
    PHP_PORT: 8080  // 改为你想要的端口
};
```

### 修改超时设置
```javascript
const CONFIG = {
    PHP_PORT: 3000,
    DOWNLOAD_TIMEOUT: 120000,      // 下载超时 2 分钟
    SERVER_START_TIMEOUT: 30000    // 启动超时 30 秒
};
```

## 🔄 重启和清理

### 重启服务器
1. 关闭当前应用
2. 重新启动应用
3. 应用会自动检测并重用已有资源

### 清理缓存
如果遇到问题，可以手动清理：
1. 删除下载的 PHP 目录
2. 删除 composer.phar 文件
3. 删除 vendor 目录
4. 重新启动应用

## 📞 获取帮助

### 查看详细日志
应用界面底部的日志区域显示详细的执行过程，可以帮助诊断问题。

### 常用调试信息
- 系统信息：操作系统、架构
- PHP 信息：版本、路径、扩展
- 项目信息：框架类型、文件结构
- 网络信息：端口状态、连接测试

### 社区支持
- 查看 [GitHub Issues](https://github.com/your-repo/issues)
- 参考 [详细文档](README.md)
- 查看 [架构设计](ARCHITECTURE.md)

---

🎉 **恭喜！** 你已经掌握了 Niva PHP Server 的基本使用方法。现在可以开始开发你的 PHP 项目了！
