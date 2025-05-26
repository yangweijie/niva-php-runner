// JavaScript 文件开始加载
console.log('=== js/app.js 文件开始加载 ===');
console.log('时间戳:', new Date().toISOString());

// 配置常量
const CONFIG = {
    PHP_PORT: 3000,
    PHP_ENTRY: `http://localhost:3000`,
    PHP_DOWNLOAD_URLS: {
        "win": "https://drfs.ctcontents.com/file/21977009/1507909633/91c9e3/%E5%BC%80%E6%BA%90%E8%BD%AF%E4%BB%B6/php/win/php-8.3.zip",
        "linux": "https://drfs.ctcontents.com/file/21977009/1507909480/47744f/%E5%BC%80%E6%BA%90%E8%BD%AF%E4%BB%B6/php/linux/php-8.3.zip",
        "darwin": {
            "arm64": "https://drfs.ctcontents.com/file/21977009/1507909837/fc23ea/%E5%BC%80%E6%BA%90%E8%BD%AF%E4%BB%B6/php/mac/arm64/php-8.3.zip",
            "x64": "https://drfs.ctcontents.com/file/21977009/1507909756/c08bde/%E5%BC%80%E6%BA%90%E8%BD%AF%E4%BB%B6/php/mac/x64/php-8.3.zip"
        }
    },
    // Composer 镜像源配置
    COMPOSER_MIRRORS: [
        {
            name: 'Packagist 官方源',
            url: 'https://getcomposer.org/composer-stable.phar',
            testUrl: 'https://packagist.org',
            priority: 1
        },
        {
            name: '阿里云镜像',
            url: 'https://mirrors.aliyun.com/composer/composer.phar',
            testUrl: 'https://mirrors.aliyun.com/composer/',
            priority: 2
        },
        {
            name: '腾讯云镜像',
            url: 'https://mirrors.tencent.com/composer/composer.phar',
            testUrl: 'https://mirrors.tencent.com/composer/',
            priority: 3
        },
        {
            name: '华为云镜像',
            url: 'https://mirrors.huaweicloud.com/repository/php/composer.phar',
            testUrl: 'https://mirrors.huaweicloud.com/repository/php/',
            priority: 4
        }
    ],
    REQUEST_TIMEOUT: 3000, // 3秒
    MIRROR_TEST_TIMEOUT: 8000, // 镜像测速超时时间 8秒
    MAX_RETRIES: 3
};

// 全局变量
let processPid = null;
let osInfo = null;
let killed = false;
let retryCount = 0;
let isFullscreen = false;
let fullscreenTipElement = null;

// DOM 元素 - 将在 DOM 加载完成后初始化
let elements = {};

// 工具函数
const utils = {
    // 检查 Niva API 是否可用
    isNivaApiAvailable: () => {
        return typeof Niva !== 'undefined' && Niva.api && typeof Niva.api === 'object';
    },

    // 生成唯一ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // 格式化时间
    formatTime: (date = new Date()) => {
        return date.toLocaleTimeString('zh-CN', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // 防抖函数
    debounce: (func, wait) => {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
};

// 全屏提示管理
const fullscreenTip = {
    // 创建提示元素
    create: () => {
        if (fullscreenTipElement) {
            fullscreenTip.remove();
        }

        fullscreenTipElement = document.createElement('div');
        fullscreenTipElement.className = 'fullscreen-tip hide';
        fullscreenTipElement.innerHTML = `
            <div class="fullscreen-tip-content"></div>
            <button class="fullscreen-tip-close" title="关闭提示">×</button>
        `;

        // 添加关闭按钮事件
        const closeBtn = fullscreenTipElement.querySelector('.fullscreen-tip-close');
        closeBtn.addEventListener('click', () => {
            fullscreenTip.hide();
        });

        document.body.appendChild(fullscreenTipElement);
        return fullscreenTipElement;
    },

    // 显示提示
    show: (message, autoHide = false) => {
        if (!fullscreenTipElement) {
            fullscreenTip.create();
        }

        const contentElement = fullscreenTipElement.querySelector('.fullscreen-tip-content');
        contentElement.textContent = message;

        fullscreenTipElement.classList.remove('hide');
        fullscreenTipElement.classList.add('show');

        // 自动隐藏
        if (autoHide) {
            setTimeout(() => {
                fullscreenTip.hide();
            }, 5000);
        }
    },

    // 隐藏提示
    hide: () => {
        if (fullscreenTipElement) {
            fullscreenTipElement.classList.remove('show');
            fullscreenTipElement.classList.add('hide');
        }
    },

    // 移除提示元素
    remove: () => {
        if (fullscreenTipElement && fullscreenTipElement.parentNode) {
            fullscreenTipElement.parentNode.removeChild(fullscreenTipElement);
            fullscreenTipElement = null;
        }
    },

    // 更新提示内容
    update: (message) => {
        if (fullscreenTipElement) {
            const contentElement = fullscreenTipElement.querySelector('.fullscreen-tip-content');
            contentElement.textContent = message;
        }
    }
};

// 状态管理
const state = {
    // 更新状态
    updateStatus: (message, status = 'pending') => {
        console.log(`[STATUS] ${status.toUpperCase()}: ${message}`);

        if (!elements.statusList) {
            console.warn('状态列表元素不存在，跳过更新');
            return;
        }

        const statusItem = document.createElement('div');
        statusItem.className = 'status-item';

        const icons = {
            success: '✅',
            error: '❌',
            pending: '⏳'
        };

        statusItem.innerHTML = `
            <span class="status-icon ${status}">${icons[status] || 'ℹ️'}</span>
            <span>${message}</span>
        `;

        elements.statusList.appendChild(statusItem);
        elements.statusList.scrollTop = elements.statusList.scrollHeight;
    },

    // 添加日志
    log: (message, type = 'info') => {
        const timestamp = utils.formatTime();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(`[LOG] ${type.toUpperCase()}: ${logMessage}`);

        if (!elements.logContainer) {
            console.warn('日志容器元素不存在，跳过日志输出');
            return;
        }

        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        logItem.textContent = logMessage;

        // 确保日志容器中的第一个元素是标题
        if (!elements.logContainer.querySelector('div:first-child')) {
            const logTitle = document.createElement('div');
            logTitle.textContent = '日志输出：';
            elements.logContainer.appendChild(logTitle);
        }

        elements.logContainer.appendChild(logItem);
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    },

    // 设置 iframe 加载状态
    setIframeLoading: (isLoading) => {
        if (!elements.iframeContainer) {
            console.warn('iframe 容器元素不存在，跳过加载状态设置');
            return;
        }

        if (isLoading) {
            elements.iframeContainer.classList.add('loading');
        } else {
            elements.iframeContainer.classList.remove('loading');
        }
    }
};

// 网络请求
const network = {
    // 带超时的 HTTP GET 请求
    httpGetWithTimeout: async (url, timeout = CONFIG.REQUEST_TIMEOUT) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            clearTimeout(timeoutId);
            return false;
        }
    },

    // 检查端口是否可用
    checkPort: async (port) => {
        const url = `http://localhost:${port}`;
        state.log(`检查端口 ${port} 是否可用...`);

        try {
            const isAvailable = await network.httpGetWithTimeout(url);
            if (isAvailable) {
                state.log(`端口 ${port} 已被占用`);
                return false;
            }
            return true;
        } catch (error) {
            state.log(`端口检查错误: ${error.message}`, 'error');
            return true;
        }
    },

    // 测试镜像源速度
    testMirrorSpeed: async (mirror) => {
        try {
            state.log(`测试镜像源速度: ${mirror.name}`);

            const startTime = Date.now();

            // 使用 curl 命令测试镜像源速度
            const result = await Niva.api.process.exec('curl', [
                '-qsL',
                '--ipv6',
                '-o', '/dev/null',
                '-w', '%{http_code} %{speed_download}',
                '-m', '8',
                '-A', 'chsrc/1.0',
                mirror.testUrl
            ], {
                timeout: CONFIG.MIRROR_TEST_TIMEOUT
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (result.status === 0 && result.stdout) {
                const output = result.stdout.trim();
                const parts = output.split(' ');

                if (parts.length >= 2) {
                    const httpCode = parseInt(parts[0]);
                    const speedDownload = parseFloat(parts[1]);

                    if (httpCode >= 200 && httpCode < 400) {
                        state.log(`${mirror.name} - HTTP: ${httpCode}, 速度: ${speedDownload.toFixed(2)} bytes/s, 响应时间: ${responseTime}ms`);
                        return {
                            success: true,
                            mirror: mirror,
                            httpCode: httpCode,
                            speed: speedDownload,
                            responseTime: responseTime,
                            score: network.calculateMirrorScore(speedDownload, responseTime, mirror.priority)
                        };
                    }
                }
            }

            state.log(`${mirror.name} - 测试失败或响应异常`, 'warning');
            return {
                success: false,
                mirror: mirror,
                httpCode: 0,
                speed: 0,
                responseTime: responseTime,
                score: 0
            };

        } catch (error) {
            state.log(`${mirror.name} - 测试出错: ${error.message}`, 'error');
            return {
                success: false,
                mirror: mirror,
                httpCode: 0,
                speed: 0,
                responseTime: CONFIG.MIRROR_TEST_TIMEOUT,
                score: 0
            };
        }
    },

    // 计算镜像源评分
    calculateMirrorScore: (speed, responseTime, priority) => {
        // 评分算法：速度权重 60%，响应时间权重 30%，优先级权重 10%
        const speedScore = Math.min(speed / 1000000, 100); // 速度分数，1MB/s = 100分
        const timeScore = Math.max(0, 100 - responseTime / 100); // 响应时间分数，越快越高
        const priorityScore = Math.max(0, 100 - priority * 10); // 优先级分数，优先级越高分数越高

        return (speedScore * 0.6 + timeScore * 0.3 + priorityScore * 0.1);
    },

    // 选择最快的 Composer 镜像源
    selectFastestComposerMirror: async () => {
        try {
            state.log('开始测试 Composer 镜像源速度...');
            state.updateStatus('正在测试镜像源速度...', 'pending');

            const testResults = [];

            // 并行测试所有镜像源
            const testPromises = CONFIG.COMPOSER_MIRRORS.map(mirror =>
                network.testMirrorSpeed(mirror)
            );

            const results = await Promise.all(testPromises);

            // 收集成功的测试结果
            for (const result of results) {
                if (result.success) {
                    testResults.push(result);
                }
            }

            if (testResults.length === 0) {
                state.log('所有镜像源测试失败，使用默认官方源', 'warning');
                return CONFIG.COMPOSER_MIRRORS[0]; // 返回官方源作为备选
            }

            // 按评分排序，选择最佳镜像源
            testResults.sort((a, b) => b.score - a.score);
            const bestMirror = testResults[0];

            state.log(`选择最佳镜像源: ${bestMirror.mirror.name} (评分: ${bestMirror.score.toFixed(2)})`);
            state.updateStatus(`选择镜像源: ${bestMirror.mirror.name}`, 'success');

            return bestMirror.mirror;

        } catch (error) {
            state.log(`镜像源测速失败: ${error.message}`, 'error');
            state.log('使用默认官方源', 'warning');
            return CONFIG.COMPOSER_MIRRORS[0]; // 返回官方源作为备选
        }
    }
};

// PHP 进程管理
const phpManager = {
    // 检测系统架构
    detectArchitecture: async () => {
        try {
            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');

            // 检测架构
            const archResult = await Niva.api.process.exec(
                isWin ? 'wmic' : 'uname',
                isWin ? ['os', 'get', 'osarchitecture'] : ['-m']
            );

            if (archResult.stdout) {
                const archOutput = archResult.stdout.toLowerCase();
                if (archOutput.includes('arm64') || archOutput.includes('aarch64')) {
                    return 'arm64';
                } else if (archOutput.includes('x64') || archOutput.includes('x86_64') || archOutput.includes('amd64')) {
                    return 'x64';
                }
            }
            return 'x64'; // 默认
        } catch (error) {
            state.log(`检测架构失败，使用默认值 x64: ${error.message}`, 'warning');
            return 'x64';
        }
    },

    // 下载并解压 PHP
    downloadAndExtractPhp: async () => {
        try {
            // 获取操作系统信息
            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');
            const isDarwin = osInfo.os.toLowerCase().includes('darwin') || osInfo.os.toLowerCase().includes('mac');
            const osKey = isWin ? 'win' : (isDarwin ? 'darwin' : 'linux');

            // 检测架构
            const architecture = await phpManager.detectArchitecture();
            state.log(`检测到系统: ${osKey}, 架构: ${architecture}`);

            // 选择下载链接
            let downloadUrl;
            if (osKey === 'darwin' && CONFIG.PHP_DOWNLOAD_URLS[osKey] && typeof CONFIG.PHP_DOWNLOAD_URLS[osKey] === 'object') {
                downloadUrl = CONFIG.PHP_DOWNLOAD_URLS[osKey][architecture] || CONFIG.PHP_DOWNLOAD_URLS[osKey]['x64'];
            } else if (CONFIG.PHP_DOWNLOAD_URLS[osKey]) {
                downloadUrl = CONFIG.PHP_DOWNLOAD_URLS[osKey];
            } else {
                throw new Error(`不支持的操作系统: ${osKey}`);
            }

            state.log(`选择的下载链接: ${downloadUrl}`);
            state.updateStatus(`准备下载 PHP: ${osKey} ${architecture}`, 'pending');

            // 获取用户目录
            const userDirs = await Niva.api.os.dirs();
            const baseDir = userDirs.temp || userDirs.data || userDirs.home;
            if (!baseDir) {
                throw new Error('无法找到可写入的目录');
            }

            // 创建临时目录和目标目录
            const tempDir = `${baseDir}/niva_php_temp`;
            const phpDir = `${baseDir}/niva_php_server`;

            // 确保目录存在
            await Niva.api.fs.createDirAll(tempDir);
            await Niva.api.fs.createDirAll(phpDir);

            // 检查是否已经下载过 PHP
            const phpExeName = isWin ? 'php.exe' : 'php';
            const existingPhpPath = `${phpDir}/${phpExeName}`;
            const phpAlreadyExists = await Niva.api.fs.exists(existingPhpPath);

            if (phpAlreadyExists) {
                // 测试已存在的 PHP 是否可用
                try {
                    const testResult = await Niva.api.process.exec(existingPhpPath, ['-v']);
                    if (testResult.status === 0) {
                        state.log(`使用已存在的 PHP: ${existingPhpPath}`);
                        state.updateStatus('使用已下载的 PHP', 'success');
                        return existingPhpPath;
                    }
                } catch (error) {
                    state.log(`已存在的 PHP 不可用，重新下载: ${error.message}`, 'warning');
                }
            }

            // 下载 PHP 压缩包
            const zipFileName = `php-${osKey}-${architecture}.zip`;
            const zipFilePath = `${tempDir}/${zipFileName}`;

            state.log('开始下载 PHP 压缩包...');
            state.updateStatus('正在下载 PHP 压缩包...', 'pending');

            const downloadResponse = await Niva.api.http.get(downloadUrl);
            if (downloadResponse.status !== 200) {
                throw new Error(`下载失败，HTTP 状态码: ${downloadResponse.status}`);
            }

            // 将下载的内容写入文件
            // Niva HTTP API 返回的是字符串，需要正确处理二进制数据
            try {
                // 尝试直接作为二进制数据写入（不指定编码）
                await Niva.api.fs.write(zipFilePath, downloadResponse.body);
            } catch (error) {
                // 如果失败，尝试作为 base64 处理
                state.log(`直接写入失败，尝试 base64 编码: ${error.message}`, 'warning');
                await Niva.api.fs.write(zipFilePath, downloadResponse.body, 'base64');
            }
            state.log(`PHP 压缩包下载成功: ${zipFilePath}`);
            state.updateStatus('PHP 压缩包下载成功', 'success');

            // 解压缩文件
            state.log('开始解压缩 PHP 文件...');
            state.updateStatus('正在解压缩 PHP 文件...', 'pending');

            let extractSuccess = false;

            if (isWin) {
                // Windows 使用 PowerShell 解压
                try {
                    const extractResult = await Niva.api.process.exec('powershell', [
                        '-Command',
                        `Expand-Archive -Path '${zipFilePath}' -DestinationPath '${phpDir}' -Force`
                    ]);
                    if (extractResult.status === 0) {
                        extractSuccess = true;
                        state.log('Windows PowerShell 解压缩成功');
                    }
                } catch (error) {
                    state.log(`PowerShell 解压缩失败: ${error.message}`, 'error');
                }
            } else {
                // macOS/Linux 使用 unzip
                try {
                    const extractResult = await Niva.api.process.exec('unzip', [
                        '-o', // 覆盖已存在的文件
                        zipFilePath,
                        '-d', phpDir
                    ]);
                    if (extractResult.status === 0) {
                        extractSuccess = true;
                        state.log('unzip 解压缩成功');
                    }
                } catch (error) {
                    state.log(`unzip 解压缩失败: ${error.message}`, 'error');
                }
            }

            if (!extractSuccess) {
                throw new Error('解压缩失败');
            }

            state.updateStatus('PHP 文件解压缩成功', 'success');

            // 查找 PHP 可执行文件
            let phpPath = `${phpDir}/${phpExeName}`;

            // 检查是否存在 PHP 可执行文件
            const phpExists = await Niva.api.fs.exists(phpPath);
            if (!phpExists) {
                // 尝试在子目录中查找
                try {
                    const files = await Niva.api.fs.readDirAll(phpDir);
                    const phpFile = files.find(file => file.endsWith(phpExeName));
                    if (phpFile) {
                        // 使用正确的路径分隔符
                        phpPath = phpFile.startsWith('/') || phpFile.includes(':') ? phpFile : `${phpDir}/${phpFile}`;
                        state.log(`在子目录中找到 PHP 文件: ${phpPath}`);
                    } else {
                        throw new Error('未找到 PHP 可执行文件');
                    }
                } catch (error) {
                    throw new Error(`查找 PHP 可执行文件失败: ${error.message}`);
                }
            }

            // 设置可执行权限（对于 macOS 和 Linux）
            if (!isWin) {
                try {
                    await Niva.api.process.exec('chmod', ['+x', phpPath]);
                    state.log('设置 PHP 可执行权限成功');
                } catch (error) {
                    state.log(`设置 PHP 可执行权限失败: ${error.message}`, 'warning');
                }
            }

            // 测试下载的 PHP 是否可用
            try {
                const testResult = await Niva.api.process.exec(phpPath, ['-v']);
                if (testResult.status === 0) {
                    state.log('下载的 PHP 可执行文件测试成功');
                    state.updateStatus('下载的 PHP 可执行文件测试成功', 'success');
                } else {
                    throw new Error('PHP 测试失败');
                }
            } catch (error) {
                throw new Error(`PHP 测试失败: ${error.message}`);
            }

            // 清理临时文件
            try {
                await Niva.api.fs.remove(zipFilePath);
                state.log('清理临时压缩包成功');
            } catch (error) {
                state.log(`清理临时压缩包失败: ${error.message}`, 'warning');
            }

            return phpPath;
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`下载或解压 PHP 失败: ${errorMsg}`, 'error');
            throw error;
        }
    },

    // 尝试使用系统 PHP
    trySystemPhp: async () => {
        const osInfo = await Niva.api.os.info();
        const isWin = osInfo.os.toLowerCase().includes('windows');

        const possiblePhpPaths = isWin ?
            ['php.exe', 'C:/php/php.exe', 'C:/xampp/php/php.exe'] :
            ['php', '/usr/bin/php', '/usr/local/bin/php', '/opt/homebrew/bin/php'];

        for (const phpPath of possiblePhpPaths) {
            try {
                const testResult = await Niva.api.process.exec(phpPath, ['-v']);
                if (testResult.stdout && testResult.stdout.includes('PHP')) {
                    state.log(`找到可用的系统 PHP: ${phpPath}`);
                    return phpPath;
                }
            } catch (error) {
                // 继续尝试下一个路径
            }
        }

        throw new Error('未找到可用的系统 PHP');
    },

    // 提取并设置PHP项目（当使用系统PHP时）
    extractPhpProject: async () => {
        try {
            state.log('开始设置PHP项目...');

            // 获取用户目录，避免使用只读的根目录
            const userDirs = await Niva.api.os.dirs();
            let workingDir;

            // 优先使用数据目录，其次是临时目录，最后是用户主目录
            if (userDirs.data) {
                workingDir = `${userDirs.data}/niva_php_workspace`;
            } else if (userDirs.temp) {
                workingDir = `${userDirs.temp}/niva_php_workspace`;
            } else if (userDirs.home) {
                workingDir = `${userDirs.home}/niva_php_workspace`;
            } else {
                throw new Error('无法找到可写入的用户目录');
            }

            // 处理路径中的空格和特殊字符，确保路径安全
            workingDir = workingDir.replace(/\s+/g, '_'); // 将空格替换为下划线
            state.log(`处理后的工作目录: ${workingDir}`);

            // 确保工作目录存在
            await Niva.api.fs.createDirAll(workingDir);
            state.log(`使用工作目录: ${workingDir}`);

            // 检查项目是否已存在
            const projectExists = await phpManager.checkProjectExists(workingDir);
            if (projectExists.exists) {
                state.log(`项目已存在，检测到框架: ${projectExists.framework}`);
                state.updateStatus('PHP项目已就绪', 'success');
                return {
                    success: true,
                    workingDir,
                    framework: projectExists.framework,
                    documentRoot: projectExists.documentRoot
                };
            }

            // 尝试从资源中提取www.zip
            try {
                state.log('尝试从资源中提取 www.zip...');
                state.updateStatus('正在提取PHP项目...', 'pending');

                const zipPath = `${workingDir}/www.zip`;

                // 尝试从 Niva 资源中提取www.zip
                await Niva.api.resource.extract('www.zip', zipPath);
                state.log('从资源中提取 www.zip 成功');

                // 解压www.zip到工作目录
                state.log('开始解压 www.zip...');
                await phpManager.extractZip(zipPath, workingDir);

                // 删除zip文件
                try {
                    await Niva.api.fs.remove(zipPath);
                    state.log('清理zip文件成功');
                } catch (cleanupError) {
                    state.log(`清理zip文件失败: ${cleanupError.message}`, 'warning');
                }

                // Composer 依赖将在 startServer 中处理

                // 检测项目框架
                const projectInfo = await phpManager.detectPhpFramework(workingDir);
                state.log(`检测到PHP框架: ${projectInfo.framework}`);
                state.log(`文档根目录: ${projectInfo.documentRoot}`);

                state.updateStatus('PHP项目提取成功', 'success');
                return {
                    success: true,
                    workingDir,
                    framework: projectInfo.framework,
                    documentRoot: projectInfo.documentRoot
                };
            } catch (resourceError) {
                // 如果资源中没有www.zip，创建一个默认的PHP项目
                const resourceErrorMsg = resourceError?.message || resourceError?.toString() || String(resourceError);
                state.log(`资源中没有 www.zip，创建默认项目... (资源错误: ${resourceErrorMsg})`);

                const projectInfo = await phpManager.createDefaultProject(workingDir);

                state.updateStatus('创建默认PHP项目成功', 'success');
                return {
                    success: true,
                    workingDir,
                    framework: projectInfo.framework,
                    documentRoot: projectInfo.documentRoot
                };
            }
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            const errorType = typeof error;
            state.log(`处理PHP项目失败: ${errorMsg} (错误类型: ${errorType})`, 'error');
            state.updateStatus('PHP项目处理失败', 'error');

            // 添加更详细的错误信息用于调试
            if (error && typeof error === 'object') {
                state.log(`错误对象详情: ${JSON.stringify(error, null, 2)}`, 'error');
            }

            return { success: false, workingDir: null, framework: 'unknown', documentRoot: null };
        }
    },

    // 检查项目是否已存在
    checkProjectExists: async (workingDir) => {
        try {
            // 检查是否有常见的项目文件
            const commonFiles = ['index.php', 'composer.json', 'artisan', 'public/index.php'];
            let hasProjectFiles = false;

            for (const file of commonFiles) {
                const filePath = `${workingDir}/${file}`;
                const exists = await Niva.api.fs.exists(filePath);
                if (exists) {
                    hasProjectFiles = true;
                    break;
                }
            }

            if (hasProjectFiles) {
                // Composer 依赖将在 startServer 中处理

                const projectInfo = await phpManager.detectPhpFramework(workingDir);
                return {
                    exists: true,
                    framework: projectInfo.framework,
                    documentRoot: projectInfo.documentRoot
                };
            }

            return { exists: false };
        } catch (error) {
            state.log(`检查项目存在性失败: ${error.message}`, 'warning');
            return { exists: false };
        }
    },

    // 解压ZIP文件
    extractZip: async (zipPath, targetDir) => {
        try {
            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');

            if (isWin) {
                // Windows 使用 PowerShell 解压
                const result = await Niva.api.process.exec('powershell', [
                    '-Command',
                    `Expand-Archive -Path '${zipPath}' -DestinationPath '${targetDir}' -Force`
                ]);
                if (result.status !== 0) {
                    throw new Error(`PowerShell解压失败: ${result.stderr}`);
                }
            } else {
                // macOS/Linux 使用 unzip
                const result = await Niva.api.process.exec('unzip', [
                    '-o', // 覆盖已存在的文件
                    zipPath,
                    '-d', targetDir
                ]);
                if (result.status !== 0) {
                    throw new Error(`unzip解压失败: ${result.stderr}`);
                }
            }

            state.log('ZIP文件解压成功');
        } catch (error) {
            throw new Error(`解压ZIP文件失败: ${error.message}`);
        }
    },

    // 处理 Composer 依赖
    handleComposerDependencies: async (workingDir, phpPath = null) => {
        try {
            state.log('检查 Composer 依赖...');

            const composerJsonPath = `${workingDir}/composer.json`;
            const vendorDirPath = `${workingDir}/vendor`;

            // 检查是否存在 composer.json
            const hasComposerJson = await Niva.api.fs.exists(composerJsonPath);
            if (!hasComposerJson) {
                state.log('未发现 composer.json，跳过依赖安装');
                return;
            }

            state.log('发现 composer.json 文件');

            // 检查是否存在 vendor 目录
            const hasVendorDir = await Niva.api.fs.exists(vendorDirPath);
            if (hasVendorDir) {
                state.log('vendor 目录已存在，跳过依赖安装');
                return;
            }

            state.log('vendor 目录不存在，需要安装 Composer 依赖');
            state.updateStatus('正在安装 Composer 依赖...', 'pending');

            // 检查 Composer 是否可用（优先检查本地 composer.phar）
            let composerPath = await phpManager.findComposer(workingDir);
            if (!composerPath) {
                state.log('未找到 Composer，尝试下载安装...', 'warning');
                state.updateStatus('正在下载 Composer...', 'pending');

                // 尝试下载并安装 composer.phar
                composerPath = await phpManager.downloadComposer(workingDir);
                if (!composerPath) {
                    state.log('下载 Composer 失败，跳过依赖安装', 'error');
                    state.updateStatus('Composer 安装失败，跳过依赖安装', 'warning');
                    return;
                }
            }

            state.log(`使用 Composer: ${composerPath}`);

            // 调试：检查工作目录内容
            try {
                const dirContents = await Niva.api.fs.readDir(workingDir);
                state.log(`工作目录内容: ${JSON.stringify(dirContents)}`);

                // 确认 composer.json 文件存在
                const composerJsonExists = await Niva.api.fs.exists(`${workingDir}/composer.json`);
                state.log(`composer.json 文件存在: ${composerJsonExists}`);

                if (composerJsonExists) {
                    // 读取 composer.json 内容（前100个字符）
                    try {
                        const composerContent = await Niva.api.fs.read(`${workingDir}/composer.json`);
                        state.log(`composer.json 内容预览: ${composerContent.substring(0, 100)}...`);
                    } catch (readError) {
                        state.log(`读取 composer.json 失败: ${readError.message}`, 'warning');
                    }
                }
            } catch (debugError) {
                state.log(`调试信息获取失败: ${debugError.message}`, 'warning');
            }

            // 执行 composer install
            try {
                // 使用传入的 PHP 路径，如果没有提供则尝试获取
                let currentPhpPath = phpPath;

                if (!currentPhpPath) {
                    // 首先尝试系统 PHP
                    try {
                        currentPhpPath = await phpManager.trySystemPhp();
                    } catch (systemPhpError) {
                        state.log('系统 PHP 不可用，将使用默认 php 命令', 'warning');
                    }
                }

                await phpManager.runComposerInstall(workingDir, composerPath, currentPhpPath);

                // 验证安装结果
                const vendorExists = await Niva.api.fs.exists(vendorDirPath);
                if (vendorExists) {
                    state.log('Composer 依赖安装成功');
                    state.updateStatus('Composer 依赖安装成功', 'success');
                } else {
                    state.log('Composer 依赖安装可能失败，vendor 目录未创建', 'warning');
                    state.updateStatus('Composer 依赖安装异常', 'warning');
                }
            } catch (installError) {
                const installErrorMsg = installError?.message || installError?.toString() || String(installError);
                state.log(`Composer install 执行失败: ${installErrorMsg}`, 'error');
                state.updateStatus('Composer 依赖安装失败', 'warning');

                // 如果是 composer.phar 的问题，尝试重新下载
                if (composerPath.endsWith('.phar') && (installErrorMsg.includes('phar') || installErrorMsg.includes('PharException') || installErrorMsg.includes('manifest'))) {
                    state.log('检测到 composer.phar 文件损坏，尝试重新下载...', 'warning');
                    try {
                        // 删除损坏的文件
                        await Niva.api.fs.remove(composerPath);
                        state.log('已删除损坏的 composer.phar 文件');

                        // 重新下载
                        const newComposerPath = await phpManager.downloadComposer(workingDir);
                        if (newComposerPath) {
                            state.log('重新下载成功，再次尝试安装依赖...');

                            // 重试时使用相同的 PHP 路径
                            await phpManager.runComposerInstall(workingDir, newComposerPath, currentPhpPath);

                            const vendorExists = await Niva.api.fs.exists(vendorDirPath);
                            if (vendorExists) {
                                state.log('重试后 Composer 依赖安装成功');
                                state.updateStatus('Composer 依赖安装成功', 'success');
                            }
                        }
                    } catch (retryError) {
                        state.log(`重试安装也失败: ${retryError.message}`, 'error');
                    }
                }
            }

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`处理 Composer 依赖时出错: ${errorMsg}`, 'error');
            state.updateStatus('Composer 依赖处理失败', 'warning');
            // 不抛出错误，让项目继续启动
        }
    },

    // 查找 Composer 可执行文件
    findComposer: async (workingDir = null) => {
        try {
            state.log('查找 Composer 可执行文件...');

            // 如果提供了工作目录，首先检查该目录中的 composer.phar
            if (workingDir) {
                const localComposerPath = `${workingDir}/composer.phar`;
                const localExists = await Niva.api.fs.exists(localComposerPath);
                if (localExists) {
                    state.log('发现本地 composer.phar，验证可用性...');
                    // 尝试获取 PHP 路径进行验证
                    let phpForValidation = 'php';
                    try {
                        phpForValidation = await phpManager.trySystemPhp();
                    } catch (e) {
                        // 使用默认的 php 命令
                    }

                    const isValid = await phpManager.validateComposerPhar(localComposerPath, phpForValidation);
                    if (isValid) {
                        state.log(`使用本地 Composer: ${localComposerPath}`);
                        return localComposerPath;
                    } else {
                        state.log('本地 composer.phar 无效，继续查找系统 Composer...');
                    }
                }
            }

            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');

            // 可能的 Composer 路径
            const composerPaths = isWin ? [
                'composer.bat',
                'composer',
                'C:\\ProgramData\\ComposerSetup\\bin\\composer.bat',
                'C:\\Users\\%USERNAME%\\AppData\\Roaming\\Composer\\vendor\\bin\\composer.bat'
            ] : [
                'composer',
                '/usr/local/bin/composer',
                '/usr/bin/composer',
                '/opt/homebrew/bin/composer'
            ];

            // 尝试每个路径
            for (const composerPath of composerPaths) {
                try {
                    const result = await Niva.api.process.exec(composerPath, ['--version'], {
                        timeout: 10000 // 10秒超时
                    });

                    if (result.status === 0) {
                        state.log(`找到 Composer: ${composerPath}`);
                        if (result.stdout) {
                            const version = result.stdout.split('\n')[0];
                            state.log(`Composer 版本: ${version}`);
                        }
                        return composerPath;
                    }
                } catch (pathError) {
                    // 继续尝试下一个路径
                    continue;
                }
            }

            // 如果都没找到，尝试使用 which/where 命令查找
            try {
                const findCommand = isWin ? 'where' : 'which';
                const result = await Niva.api.process.exec(findCommand, ['composer']);

                if (result.status === 0 && result.stdout) {
                    const foundPath = result.stdout.trim().split('\n')[0];
                    state.log(`通过 ${findCommand} 找到 Composer: ${foundPath}`);
                    return foundPath;
                }
            } catch (findError) {
                state.log(`使用 ${isWin ? 'where' : 'which'} 查找 Composer 失败: ${findError.message}`, 'warning');
            }

            state.log('未找到 Composer 可执行文件', 'warning');
            return null;

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`查找 Composer 时出错: ${errorMsg}`, 'error');
            return null;
        }
    },

    // 下载并安装 Composer
    downloadComposer: async (workingDir) => {
        try {
            state.log('开始下载 Composer...');

            const composerPharPath = `${workingDir}/composer.phar`;

            // 检查是否已经存在 composer.phar
            const pharExists = await Niva.api.fs.exists(composerPharPath);
            if (pharExists) {
                state.log('发现已存在的 composer.phar，验证可用性...');

                // 验证现有的 composer.phar 是否可用
                // 尝试获取 PHP 路径进行验证
                let phpForValidation = 'php';
                try {
                    phpForValidation = await phpManager.trySystemPhp();
                } catch (e) {
                    // 使用默认的 php 命令
                }

                const isValid = await phpManager.validateComposerPhar(composerPharPath, phpForValidation);
                if (isValid) {
                    state.log('现有 composer.phar 可用');
                    return composerPharPath;
                } else {
                    state.log('现有 composer.phar 无效，重新下载...');
                    try {
                        await Niva.api.fs.remove(composerPharPath);
                    } catch (removeError) {
                        state.log(`删除无效 composer.phar 失败: ${removeError.message}`, 'warning');
                    }
                }
            }

            // 选择最快的镜像源
            const bestMirror = await network.selectFastestComposerMirror();
            const downloadUrl = bestMirror.url;
            state.log(`选择镜像源: ${bestMirror.name}`);
            state.log(`从 ${downloadUrl} 下载 Composer...`);

            // 优先使用系统命令下载，因为 Niva HTTP API 可能不能正确处理二进制文件
            let downloadSuccess = false;
            let lastError = null;

            // 尝试使用选择的最佳镜像源下载
            try {
                state.log('尝试使用系统命令下载 Composer...');
                downloadSuccess = await phpManager.downloadComposerWithSystemCommand(workingDir, downloadUrl);
                if (downloadSuccess) {
                    state.log('系统命令下载成功');
                }
            } catch (systemError) {
                lastError = systemError;
                state.log(`系统命令下载失败: ${systemError.message}`, 'warning');
            }

            // 如果最佳镜像源失败，尝试其他镜像源
            if (!downloadSuccess) {
                state.log('最佳镜像源下载失败，尝试其他镜像源...', 'warning');

                for (const mirror of CONFIG.COMPOSER_MIRRORS) {
                    if (mirror.url === downloadUrl) continue; // 跳过已经尝试过的镜像源

                    try {
                        state.log(`尝试备用镜像源: ${mirror.name}`);
                        downloadSuccess = await phpManager.downloadComposerWithSystemCommand(workingDir, mirror.url);
                        if (downloadSuccess) {
                            state.log(`备用镜像源 ${mirror.name} 下载成功`);
                            break;
                        }
                    } catch (mirrorError) {
                        state.log(`备用镜像源 ${mirror.name} 下载失败: ${mirrorError.message}`, 'warning');
                        lastError = mirrorError;
                    }
                }
            }

            // 如果所有镜像源都失败，尝试使用 Niva HTTP API
            if (!downloadSuccess) {
                try {
                    state.log('尝试使用 Niva HTTP API 下载...');
                    // 使用最佳镜像源的 URL
                    const response = await Niva.api.http.get(downloadUrl);

                    if (response.status === 200 && response.body) {
                        // 将下载的内容写入文件，尝试作为二进制数据
                        await Niva.api.fs.write(composerPharPath, response.body, 'binary');
                        state.log('Niva HTTP API 下载完成');
                        downloadSuccess = true;
                    } else {
                        throw new Error(`下载失败，HTTP状态: ${response.status}`);
                    }
                } catch (httpError) {
                    state.log(`HTTP下载失败: ${httpError.message}`, 'error');
                    lastError = httpError;
                }
            }

            if (!downloadSuccess) {
                const errorMsg = lastError?.message || '所有下载方法都失败';
                throw new Error(errorMsg);
            }

            // 验证下载的文件
            // 尝试获取 PHP 路径进行验证
            let phpForValidation = 'php';
            try {
                phpForValidation = await phpManager.trySystemPhp();
            } catch (e) {
                // 使用默认的 php 命令
            }

            const isValid = await phpManager.validateComposerPhar(composerPharPath, phpForValidation);
            if (!isValid) {
                state.log('下载的 composer.phar 验证失败，删除并重新尝试...', 'warning');
                try {
                    await Niva.api.fs.remove(composerPharPath);
                } catch (removeError) {
                    state.log(`删除无效文件失败: ${removeError.message}`, 'warning');
                }
                throw new Error('下载的 composer.phar 文件无效');
            } else {
                state.log('Composer 下载并验证成功');
            }

            state.updateStatus('Composer 下载成功', 'success');
            return composerPharPath;

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`下载 Composer 失败: ${errorMsg}`, 'error');
            return null;
        }
    },

    // 使用系统命令下载 Composer（备用方案）
    downloadComposerWithSystemCommand: async (workingDir, downloadUrl) => {
        try {
            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');
            const composerPharPath = `${workingDir}/composer.phar`;

            if (isWin) {
                // Windows: 使用 PowerShell 下载
                const psCommand = `Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "${composerPharPath}"`;
                const result = await Niva.api.process.exec('powershell', ['-Command', psCommand], {
                    cwd: workingDir,
                    timeout: 60000 // 1分钟超时
                });

                if (result.status === 0) {
                    state.log('PowerShell 下载成功');
                    return true;
                } else {
                    state.log(`PowerShell 下载失败: ${result.stderr}`, 'warning');
                }
            } else {
                // macOS/Linux: 尝试 curl 或 wget
                const curlResult = await Niva.api.process.exec('curl', [
                    '-L', // 跟随重定向
                    '-o', composerPharPath,
                    downloadUrl
                ], {
                    cwd: workingDir,
                    timeout: 60000
                });

                if (curlResult.status === 0) {
                    state.log('curl 下载成功');
                    return true;
                } else {
                    state.log(`curl 下载失败，尝试 wget...`, 'warning');

                    // 尝试 wget
                    const wgetResult = await Niva.api.process.exec('wget', [
                        '-O', composerPharPath,
                        downloadUrl
                    ], {
                        cwd: workingDir,
                        timeout: 60000
                    });

                    if (wgetResult.status === 0) {
                        state.log('wget 下载成功');
                        return true;
                    } else {
                        state.log(`wget 下载也失败: ${wgetResult.stderr}`, 'warning');
                    }
                }
            }

            return false;
        } catch (error) {
            state.log(`系统命令下载失败: ${error.message}`, 'error');
            return false;
        }
    },

    // 验证 composer.phar 文件
    validateComposerPhar: async (composerPharPath, phpPath = 'php') => {
        try {
            // 检查文件是否存在
            const exists = await Niva.api.fs.exists(composerPharPath);
            if (!exists) {
                state.log('composer.phar 文件不存在', 'warning');
                return false;
            }

            // 检查文件大小（使用系统命令，避免读取二进制文件）
            try {
                const osInfo = await Niva.api.os.info();
                const isWin = osInfo.os.toLowerCase().includes('windows');

                let fileSize = 0;
                if (isWin) {
                    // Windows: 使用 dir 命令
                    const result = await Niva.api.process.exec('cmd', ['/c', `dir "${composerPharPath}" | findstr composer.phar`]);
                    if (result.status === 0 && result.stdout) {
                        const match = result.stdout.match(/(\d+)/);
                        if (match) {
                            fileSize = parseInt(match[1]);
                        }
                    }
                } else {
                    // macOS/Linux: 使用 stat 命令
                    const result = await Niva.api.process.exec('stat', ['-f', '%z', composerPharPath]);
                    if (result.status === 0 && result.stdout) {
                        fileSize = parseInt(result.stdout.trim());
                    }
                }

                if (fileSize === 0) {
                    // 备用方案：使用 ls -l
                    const result = await Niva.api.process.exec('ls', ['-l', composerPharPath]);
                    if (result.status === 0 && result.stdout) {
                        const parts = result.stdout.split(/\s+/);
                        if (parts.length >= 5) {
                            fileSize = parseInt(parts[4]);
                        }
                    }
                }

                if (fileSize < 1000000) { // 至少1MB
                    state.log(`composer.phar 文件太小 (${fileSize} 字节)，可能下载不完整`, 'warning');
                    return false;
                }

                if (fileSize > 50000000) { // 超过50MB可能有问题
                    state.log(`composer.phar 文件过大 (${fileSize} 字节)，可能下载错误`, 'warning');
                    return false;
                }

                state.log(`composer.phar 文件大小: ${fileSize} 字节，大小检查通过`);
            } catch (sizeError) {
                const sizeErrorMsg = sizeError?.message || sizeError?.toString() || String(sizeError);
                state.log(`检查文件大小失败: ${sizeErrorMsg}，跳过大小验证`, 'warning');
                // 不返回 false，继续其他验证
            }

            // 尝试执行 composer.phar --version 验证（这是最重要的验证）
            try {
                const result = await Niva.api.process.exec(phpPath, [composerPharPath, '--version'], {
                    timeout: 15000 // 增加超时时间
                });

                if (result && result.status === 0 && result.stdout && result.stdout.includes('Composer')) {
                    state.log('composer.phar 功能验证成功');
                    if (result.stdout) {
                        const version = result.stdout.split('\n')[0];
                        state.log(`Composer 版本: ${version}`);
                    }
                    return true;
                } else {
                    // 如果功能验证失败，说明文件确实有问题
                    const status = result ? result.status : '未知';
                    const stderr = result ? result.stderr : '无错误信息';
                    state.log(`composer.phar 功能验证失败，退出码: ${status}`, 'warning');
                    if (stderr) {
                        state.log(`验证错误信息: ${stderr}`, 'warning');
                    }
                    return false;
                }
            } catch (execError) {
                const execErrorMsg = execError?.message || execError?.toString() || String(execError);
                state.log(`执行 composer.phar 验证时出错: ${execErrorMsg}`, 'warning');

                // 如果是 PHAR 相关错误，返回 false
                if (execErrorMsg.includes('phar') || execErrorMsg.includes('Phar') || execErrorMsg.includes('manifest')) {
                    return false;
                }

                // 其他错误可能是临时的，返回 true 让后续流程尝试使用
                return true;
            }

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`验证 composer.phar 时出错: ${errorMsg}`, 'error');
            return false;
        }
    },

    // 执行 composer install
    runComposerInstall: async (workingDir, composerPath, phpPath = null) => {
        try {
            state.log('开始执行 composer install...');

            const startTime = Date.now();

            // 构建 composer install 命令参数
            const args = [
                'install',
                '--working-dir', workingDir, // 指定工作目录
                '--no-dev',           // 不安装开发依赖
                '--optimize-autoloader', // 优化自动加载器
                '--no-interaction',   // 非交互模式
                '--prefer-dist'       // 优先使用分发包
            ];

            // 判断是否为 .phar 文件，需要用 php 执行
            let executable, execArgs;
            if (composerPath.endsWith('.phar')) {
                // 如果提供了 phpPath，使用它；否则尝试系统 php
                executable = phpPath || 'php';
                execArgs = [composerPath, ...args];
                state.log(`执行命令: ${executable} ${composerPath} ${args.join(' ')}`);
            } else {
                executable = composerPath;
                execArgs = args;
                state.log(`执行命令: ${composerPath} ${args.join(' ')}`);
            }

            state.log(`工作目录: ${workingDir}`);

            // 执行 composer install，设置较长的超时时间
            const result = await Niva.api.process.exec(executable, execArgs, {
                cwd: workingDir,
                timeout: 300000 // 5分钟超时
            });

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            state.log(`composer install 执行完成，耗时: ${duration}秒`);

            // 检查执行结果
            if (result && result.status === 0) {
                state.log('composer install 执行成功');
                if (result.stdout) {
                    // 只显示重要的输出信息
                    const lines = result.stdout.split('\n');
                    const importantLines = lines.filter(line =>
                        line.includes('Installing') ||
                        line.includes('Generating') ||
                        line.includes('packages') ||
                        line.includes('autoload')
                    ).slice(0, 5); // 限制显示行数

                    if (importantLines.length > 0) {
                        state.log(`安装输出: ${importantLines.join(' | ')}`);
                    }
                }
            } else {
                const status = result ? result.status : '未知';
                const stderr = result ? result.stderr : '无错误信息';
                const stdout = result ? result.stdout : '无输出信息';

                state.log(`composer install 执行失败，退出码: ${status}`, 'error');

                if (stderr) {
                    state.log(`错误信息: ${stderr}`, 'error');
                }
                if (stdout) {
                    state.log(`输出信息: ${stdout}`, 'warning');
                }

                // 提供更具体的错误信息
                let errorMessage = `composer install 失败，退出码: ${status}`;
                if (stderr && stderr.includes('memory')) {
                    errorMessage += ' (可能是内存不足)';
                } else if (stderr && stderr.includes('network')) {
                    errorMessage += ' (可能是网络问题)';
                } else if (stderr && stderr.includes('permission')) {
                    errorMessage += ' (可能是权限问题)';
                }

                throw new Error(errorMessage);
            }

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`执行 composer install 时出错: ${errorMsg}`, 'error');
            throw error;
        }
    },

    // 检测PHP框架类型
    detectPhpFramework: async (workingDir) => {
        try {
            state.log('开始检测PHP框架...');

            // Laravel - 检查 artisan 文件和 app 目录
            if (await Niva.api.fs.exists(`${workingDir}/artisan`) &&
                await Niva.api.fs.exists(`${workingDir}/app`)) {
                return {
                    framework: 'laravel',
                    documentRoot: `${workingDir}/public`,
                    startCommand: 'artisan',
                    startArgs: ['serve', '--host=localhost', `--port=${CONFIG.PHP_PORT}`]
                };
            }

            // Symfony - 检查 bin/console 和 src 目录
            if (await Niva.api.fs.exists(`${workingDir}/bin/console`) &&
                await Niva.api.fs.exists(`${workingDir}/src`)) {
                return {
                    framework: 'symfony',
                    documentRoot: `${workingDir}/public`,
                    startCommand: 'bin/console',
                    startArgs: ['server:run', `localhost:${CONFIG.PHP_PORT}`]
                };
            }

            // CodeIgniter - 检查 system 目录和 index.php
            if (await Niva.api.fs.exists(`${workingDir}/system`) &&
                await Niva.api.fs.exists(`${workingDir}/index.php`)) {
                // CodeIgniter 4 有 public 目录
                if (await Niva.api.fs.exists(`${workingDir}/public`)) {
                    return {
                        framework: 'codeigniter4',
                        documentRoot: `${workingDir}/public`,
                        startCommand: 'spark',
                        startArgs: ['serve', '--host', 'localhost', '--port', CONFIG.PHP_PORT.toString()]
                    };
                } else {
                    // CodeIgniter 3
                    return {
                        framework: 'codeigniter3',
                        documentRoot: workingDir,
                        startCommand: null, // 使用内置服务器
                        startArgs: null
                    };
                }
            }

            // Yii - 检查 yii 文件或 protected 目录
            if (await Niva.api.fs.exists(`${workingDir}/yii`) ||
                await Niva.api.fs.exists(`${workingDir}/protected`)) {
                // Yii 2
                if (await Niva.api.fs.exists(`${workingDir}/yii`)) {
                    return {
                        framework: 'yii2',
                        documentRoot: `${workingDir}/web`,
                        startCommand: 'yii',
                        startArgs: ['serve', `localhost:${CONFIG.PHP_PORT}`]
                    };
                } else {
                    // Yii 1
                    return {
                        framework: 'yii1',
                        documentRoot: workingDir,
                        startCommand: null,
                        startArgs: null
                    };
                }
            }

            // ThinkPHP - 检查 think 文件或 ThinkPHP 目录
            if (await Niva.api.fs.exists(`${workingDir}/think`) ||
                await Niva.api.fs.exists(`${workingDir}/ThinkPHP`)) {
                // ThinkPHP 5/6
                if (await Niva.api.fs.exists(`${workingDir}/think`)) {
                    return {
                        framework: 'thinkphp',
                        documentRoot: `${workingDir}/public`,
                        startCommand: 'think',
                        startArgs: ['run', '-H', 'localhost', '-p', CONFIG.PHP_PORT.toString()]
                    };
                } else {
                    // ThinkPHP 3
                    return {
                        framework: 'thinkphp3',
                        documentRoot: workingDir,
                        startCommand: null,
                        startArgs: null
                    };
                }
            }

            // 普通PHP项目 - 检查是否有 public 目录
            if (await Niva.api.fs.exists(`${workingDir}/public/index.php`)) {
                return {
                    framework: 'plain-public',
                    documentRoot: `${workingDir}/public`,
                    startCommand: null,
                    startArgs: null
                };
            }

            // 最基本的PHP项目 - index.php 在根目录
            if (await Niva.api.fs.exists(`${workingDir}/index.php`)) {
                return {
                    framework: 'plain',
                    documentRoot: workingDir,
                    startCommand: null,
                    startArgs: null
                };
            }

            // 未知项目类型
            return {
                framework: 'unknown',
                documentRoot: workingDir,
                startCommand: null,
                startArgs: null
            };
        } catch (error) {
            state.log(`检测PHP框架失败: ${error.message}`, 'error');
            return {
                framework: 'unknown',
                documentRoot: workingDir,
                startCommand: null,
                startArgs: null
            };
        }
    },

    // 创建默认PHP项目
    createDefaultProject: async (workingDir) => {
        try {
            state.log('创建默认PHP项目...');

            const defaultIndexContent = `<?php
// Niva PHP Server 默认页面
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Niva PHP Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #4a6cf7; text-align: center; }
        .info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐘 Niva PHP Server</h1>
        <div class="info">
            <p><strong>PHP 版本:</strong> <?php echo PHP_VERSION; ?></p>
            <p><strong>服务器时间:</strong> <?php echo date('Y-m-d H:i:s'); ?></p>
            <p><strong>当前目录:</strong> <?php echo getcwd(); ?></p>
        </div>
        <p>PHP 服务器运行正常！您可以在当前目录中放置您的 PHP 文件。</p>
    </div>
</body>
</html>`;

            const indexPhpPath = `${workingDir}/index.php`;
            await Niva.api.fs.write(indexPhpPath, defaultIndexContent);
            state.log('创建默认 index.php 文件成功');

            return {
                framework: 'plain',
                documentRoot: workingDir
            };
        } catch (error) {
            throw new Error(`创建默认项目失败: ${error.message}`);
        }
    },

    // 构建服务器启动命令
    buildServerCommand: async (workingDir, framework, documentRoot, phpPath) => {
        try {
            state.log(`构建 ${framework} 框架的启动命令...`);

            // 重新检测框架信息以获取启动命令
            const projectInfo = await phpManager.detectPhpFramework(workingDir);

            switch (framework) {
                case 'laravel':
                    // Laravel: php artisan serve --host=localhost --port=3000
                    const artisanPath = `${workingDir}/artisan`;
                    if (await Niva.api.fs.exists(artisanPath)) {
                        return {
                            success: true,
                            executable: phpPath,
                            args: ['artisan', 'serve', '--host=localhost', `--port=${CONFIG.PHP_PORT}`],
                            cwd: workingDir
                        };
                    }
                    break;

                case 'symfony':
                    // Symfony: php bin/console server:run localhost:3000
                    const consolePath = `${workingDir}/bin/console`;
                    if (await Niva.api.fs.exists(consolePath)) {
                        return {
                            success: true,
                            executable: phpPath,
                            args: ['bin/console', 'server:run', `localhost:${CONFIG.PHP_PORT}`],
                            cwd: workingDir
                        };
                    }
                    break;

                case 'codeigniter4':
                    // CodeIgniter 4: php spark serve --host localhost --port 3000
                    const sparkPath = `${workingDir}/spark`;
                    if (await Niva.api.fs.exists(sparkPath)) {
                        return {
                            success: true,
                            executable: phpPath,
                            args: ['spark', 'serve', '--host', 'localhost', '--port', CONFIG.PHP_PORT.toString()],
                            cwd: workingDir
                        };
                    }
                    break;

                case 'yii2':
                    // Yii 2: php yii serve localhost:3000
                    const yiiPath = `${workingDir}/yii`;
                    if (await Niva.api.fs.exists(yiiPath)) {
                        return {
                            success: true,
                            executable: phpPath,
                            args: ['yii', 'serve', `localhost:${CONFIG.PHP_PORT}`],
                            cwd: workingDir
                        };
                    }
                    break;

                case 'thinkphp':
                    // ThinkPHP 5/6: 优先使用 think run 命令，如果失败则使用内置服务器
                    const thinkPath = `${workingDir}/think`;
                    const publicDir = `${workingDir}/public`;

                    if (await Niva.api.fs.exists(thinkPath)) {
                        // 方法1: 使用 think run 命令，指定文档根目录
                        return {
                            success: true,
                            executable: phpPath,
                            args: [thinkPath, 'run', '-H', 'localhost', '-p', CONFIG.PHP_PORT.toString()],
                            cwd: workingDir
                        };
                    } else if (await Niva.api.fs.exists(publicDir)) {
                        // 方法2: 如果 think 命令不存在，直接使用 PHP 内置服务器指向 public 目录
                        return {
                            success: true,
                            executable: phpPath,
                            args: ['-S', `localhost:${CONFIG.PHP_PORT}`, '-t', publicDir],
                            cwd: workingDir
                        };
                    }
                    break;

                default:
                    // 普通PHP项目或其他框架：使用内置服务器
                    const docRoot = documentRoot || workingDir;
                    return {
                        success: true,
                        executable: phpPath,
                        args: ['-S', `localhost:${CONFIG.PHP_PORT}`, '-t', docRoot],
                        cwd: workingDir
                    };
            }

            // 如果框架特定的启动方式失败，回退到内置服务器
            state.log(`${framework} 框架启动方式不可用，回退到内置服务器`);
            const docRoot = documentRoot || workingDir;
            return {
                success: true,
                executable: phpPath,
                args: ['-S', `localhost:${CONFIG.PHP_PORT}`, '-t', docRoot],
                cwd: workingDir
            };

        } catch (error) {
            return {
                success: false,
                error: `构建启动命令失败: ${error.message}`
            };
        }
    },

    // 启动 PHP 服务器
    startServer: async () => {
        console.log('开始 startServer 函数...');

        if (!utils.isNivaApiAvailable()) {
            console.error('Niva API 不可用');
            state.updateStatus('Niva API 不可用', 'error');
            state.log('错误: Niva API 不可用', 'error');
            return false;
        }

        console.log('Niva API 可用，继续启动流程...');

        try {
            // 检查端口是否可用
            console.log(`检查端口 ${CONFIG.PHP_PORT} 是否可用...`);
            state.log(`检查端口 ${CONFIG.PHP_PORT}`);

            const isPortAvailable = await network.checkPort(CONFIG.PHP_PORT);
            console.log('端口检查结果:', isPortAvailable);

            if (!isPortAvailable) {
                console.error(`端口 ${CONFIG.PHP_PORT} 已被占用`);
                state.log(`端口 ${CONFIG.PHP_PORT} 已被占用，尝试清理...`, 'warning');

                // 尝试清理占用端口的进程
                await phpManager.cleanupPortProcess(CONFIG.PHP_PORT);

                // 再次检查端口
                const isPortAvailableAfterCleanup = await network.checkPort(CONFIG.PHP_PORT);
                if (!isPortAvailableAfterCleanup) {
                    state.updateStatus(`端口 ${CONFIG.PHP_PORT} 仍被占用，无法启动`, 'error');
                    return false;
                } else {
                    state.log(`端口 ${CONFIG.PHP_PORT} 清理成功`);
                }
            }

            state.log('端口检查通过');

            // 尝试获取 PHP 可执行文件路径
            let phpPath;
            let useSystemPhp = false;
            let workingDir = null;
            let projectFramework = 'unknown';
            let documentRoot = null;

            console.log('开始获取 PHP 可执行文件...');

            // 首先尝试使用系统 PHP
            try {
                console.log('优先尝试使用系统 PHP...');
                state.updateStatus('检查系统 PHP...', 'pending');
                phpPath = await phpManager.trySystemPhp();
                console.log('系统 PHP 找到:', phpPath);
                state.updateStatus('使用系统 PHP', 'success');
                state.log(`使用系统 PHP: ${phpPath}`);
                useSystemPhp = true;

                // 使用系统PHP时，确保PHP项目存在并获取工作目录
                console.log('使用系统PHP，检查并提取PHP项目...');
                const extractResult = await phpManager.extractPhpProject();
                if (extractResult.success) {
                    workingDir = extractResult.workingDir;
                    projectFramework = extractResult.framework;
                    documentRoot = extractResult.documentRoot;
                    console.log('获取到工作目录:', workingDir);
                    console.log('检测到框架:', projectFramework);
                    console.log('文档根目录:', documentRoot);
                    state.log(`工作目录: ${workingDir}`);
                    state.log(`PHP框架: ${projectFramework}`);
                    state.log(`文档根目录: ${documentRoot}`);

                    // 使用系统 PHP 处理 Composer 依赖
                    await phpManager.handleComposerDependencies(workingDir, phpPath);
                } else {
                    throw new Error('无法创建PHP项目');
                }
            } catch (systemError) {
                console.log('系统 PHP 不可用，尝试下载 PHP...');
                const systemErrorMsg = systemError?.message || systemError?.toString() || String(systemError);
                state.log(`系统 PHP 不可用: ${systemErrorMsg}，尝试下载 PHP`, 'warning');

                try {
                    // 系统PHP不可用时才下载并解压 PHP
                    console.log('开始下载并解压 PHP...');
                    state.updateStatus('正在下载 PHP...', 'pending');

                    // 添加超时处理
                    const downloadPromise = phpManager.downloadAndExtractPhp();
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('下载 PHP 超时')), 60000); // 60秒超时
                    });

                    phpPath = await Promise.race([downloadPromise, timeoutPromise]);
                    console.log('下载 PHP 成功:', phpPath);
                    state.log(`使用下载的 PHP: ${phpPath}`);
                    useSystemPhp = false;

                    // 下载PHP时，使用默认的工作目录（下载的PHP包含了文件）
                    const userDirs = await Niva.api.os.dirs();
                    workingDir = userDirs.data || userDirs.temp || userDirs.home;
                    if (!workingDir) {
                        throw new Error('无法找到可写入的用户目录');
                    }
                    workingDir = `${workingDir}/niva_php_server`;
                    state.log(`使用下载PHP的工作目录: ${workingDir}`);

                    // 使用下载的 PHP 处理 Composer 依赖
                    await phpManager.handleComposerDependencies(workingDir, phpPath);
                } catch (downloadError) {
                    const downloadErrorMsg = downloadError?.message || downloadError?.toString() || String(downloadError);
                    console.error('下载 PHP 也失败:', downloadErrorMsg);
                    state.updateStatus('未找到可用的 PHP', 'error');
                    state.log(`下载 PHP 失败: ${downloadErrorMsg}`, 'error');
                    return false;
                }
            }

            // 确保有有效的工作目录
            if (!workingDir) {
                throw new Error('无法确定工作目录');
            }

            // 根据框架类型构建启动命令
            const serverConfig = await phpManager.buildServerCommand(workingDir, projectFramework, documentRoot, phpPath);
            state.log(`服务器配置: ${JSON.stringify(serverConfig)}`);

            if (!serverConfig.success) {
                throw new Error(serverConfig.error);
            }

            // 在启动PHP服务器前，验证项目文件
            const entryFile = documentRoot ? `${documentRoot}/index.php` : `${workingDir}/index.php`;
            const finalCheck = await Niva.api.fs.exists(entryFile);
            state.log(`启动前检查入口文件存在: ${entryFile} -> ${finalCheck}`);

            if (!finalCheck) {
                state.log('警告: 入口文件不存在，PHP服务器可能无法正常工作', 'warning');
            }

            // 启动 PHP 服务器
            state.log(`正在启动 ${projectFramework} 项目`);
            state.log(`启动命令: ${serverConfig.executable} ${serverConfig.args.join(' ')}`);
            state.log(`工作目录: ${serverConfig.cwd}`);

            // 使用spawn方式启动PHP服务器，以便更好地控制进程
            let process;
            let startMethod = 'unknown';

            // 先验证可执行文件和参数
            state.log(`验证可执行文件: ${serverConfig.executable}`);
            let executableExists = true;
            // 修正：如果是 Windows 且 executable 仅为 'php.exe' 或 'php'，跳过 exists 检查
            if (!(serverConfig.executable === 'php.exe' || serverConfig.executable === 'php')) {
                executableExists = await Niva.api.fs.exists(serverConfig.executable);
                state.log(`可执行文件存在: ${executableExists}`);
            } else {
                state.log('可执行文件为系统 PATH 下的 php.exe，跳过本地 exists 检查');
            }
            if (!executableExists) {
                // 如果是相对路径，尝试在工作目录中查找
                const relativePath = `${serverConfig.cwd}/${serverConfig.executable}`;
                const relativeExists = await Niva.api.fs.exists(relativePath);
                state.log(`尝试相对路径 ${relativePath}: ${relativeExists}`);

                if (!relativeExists) {
                    throw new Error(`可执行文件不存在: ${serverConfig.executable}`);
                }
            }

            let serverStarted = false;
            let fallbackAttempted = false;

            // 尝试启动服务器的函数
            const tryStartServer = async (config) => {
                try {
                    // 方法1: 尝试使用exec with detached（更稳定）
                    state.log('尝试使用 exec(detached) 启动...');
                    const result = await Niva.api.process.exec(config.executable, config.args, {
                        cwd: config.cwd,
                        detached: true
                    });
                    startMethod = 'exec-detached';
                    state.log(`PHP 服务器exec(detached)结果: ${JSON.stringify(result)}`);
                    return result;
                } catch (execError) {
                    state.log(`exec(detached)失败: ${execError.message}`, 'warning');

                    try {
                        // 方法2: 尝试使用spawn
                        state.log('尝试使用 spawn 启动...');
                        const result = await Niva.api.process.spawn(config.executable, config.args, {
                            cwd: config.cwd,
                            detached: false
                        });
                        startMethod = 'spawn';
                        state.log(`PHP 服务器spawn结果: ${JSON.stringify(result)}`);
                        return result;
                    } catch (spawnError) {
                        state.log(`spawn失败: ${spawnError.message}`, 'warning');

                        try {
                            // 方法3: 尝试使用exec without detached
                            state.log('尝试使用 exec(normal) 启动...');
                            const result = await Niva.api.process.exec(config.executable, config.args, {
                                cwd: config.cwd
                            });
                            startMethod = 'exec-normal';
                            state.log(`PHP 服务器exec(normal)结果: ${JSON.stringify(result)}`);
                            return result;
                        } catch (finalError) {
                            throw new Error(`所有启动方法都失败: exec-detached(${execError.message}), spawn(${spawnError.message}), exec-normal(${finalError.message})`);
                        }
                    }
                }
            };

            try {
                process = await tryStartServer(serverConfig);
                serverStarted = true;
            } catch (startError) {
                state.log(`框架特定启动方式失败: ${startError.message}`, 'warning');

                // 如果是 ThinkPHP 且启动失败，尝试使用内置服务器
                if (projectFramework === 'thinkphp' && !fallbackAttempted) {
                    state.log('ThinkPHP 启动失败，尝试使用 PHP 内置服务器...', 'warning');
                    fallbackAttempted = true;

                    const fallbackConfig = {
                        success: true,
                        executable: phpPath,
                        args: ['-S', `localhost:${CONFIG.PHP_PORT}`, '-t', `${workingDir}/public`],
                        cwd: workingDir
                    };

                    state.log(`回退启动命令: ${fallbackConfig.executable} ${fallbackConfig.args.join(' ')}`);

                    try {
                        process = await tryStartServer(fallbackConfig);
                        serverStarted = true;
                        state.log('使用 PHP 内置服务器启动成功');
                    } catch (fallbackError) {
                        throw new Error(`框架启动和回退方案都失败: ${startError.message}, 回退错误: ${fallbackError.message}`);
                    }
                } else {
                    throw startError;
                }
            }

            state.log(`PHP服务器启动方法: ${startMethod}`);

            // 处理进程 ID
            if (typeof process === 'number') {
                processPid = process;
            } else if (process && typeof process === 'object') {
                if (process.pid) {
                    processPid = process.pid;
                } else if (process.id) {
                    processPid = process.id;
                } else {
                    // 尝试从process对象中找到PID
                    const keys = Object.keys(process);
                    state.log(`进程对象键: ${JSON.stringify(keys)}`);
                    processPid = process[keys[0]]; // 尝试第一个数字值
                }
            } else {
                state.log('无法获取进程 PID', 'warning');
            }

            state.updateStatus(`PHP 服务器已启动 (PID: ${processPid || '未知'})`, 'success');
            state.log(`PHP 服务器进程已启动，PID: ${processPid || '未知'}`);

            // 等待一小段时间让PHP服务器完全启动
            await new Promise(r => setTimeout(r, 1000));

            // 验证PHP进程是否真的在运行
            if (processPid) {
                try {
                    const osInfo = await Niva.api.os.info();
                    const isWin = osInfo.os.toLowerCase().includes('windows');

                    let checkResult;
                    if (isWin) {
                        checkResult = await Niva.api.process.exec('tasklist', ['/FI', `PID eq ${processPid}`]);
                    } else {
                        checkResult = await Niva.api.process.exec('ps', ['-p', processPid.toString()]);
                    }

                    if (checkResult.status === 0 && checkResult.stdout && checkResult.stdout.includes(processPid.toString())) {
                        state.log(`确认PHP进程正在运行 (PID: ${processPid})`);
                    } else {
                        state.log(`警告: PHP进程可能没有启动成功 (PID: ${processPid})`, 'warning');
                        state.log(`进程检查结果: ${checkResult.stdout || checkResult.stderr}`, 'warning');
                    }
                } catch (checkError) {
                    state.log(`无法验证PHP进程状态: ${checkError.message}`, 'warning');
                }
            }

            // 等待服务器启动
            state.log('等待 PHP 服务器启动...');
            let serverReady = false;
            let has404Error = false;

            for (let i = 0; i < 20; i++) {
                await new Promise(r => setTimeout(r, 500));
                try {
                    // 首先尝试访问根路径
                    const rootResponse = await Niva.api.http.get(`http://localhost:${CONFIG.PHP_PORT}`);
                    state.log(`根路径响应状态: ${rootResponse.status}`);

                    let indexResponse;
                    if(projectFramework === 'unknown'){
                        // 然后尝试直接访问 index.php
                        indexResponse = await Niva.api.http.get(`http://localhost:${CONFIG.PHP_PORT}/index.php`);
                        state.log(`index.php 响应状态: ${indexResponse.status}`);
                    }else{
                        // 对于已知框架，如果根路径返回 200，假设 index.php 也正常
                        indexResponse = {
                            status: rootResponse.status
                        };
                    }

                    if (rootResponse.status === 200 || indexResponse.status === 200) {
                        state.log('PHP 服务器已就绪');
                        state.updateStatus('PHP 服务器已就绪', 'success');
                        serverReady = true;
                        break;
                    } else if (rootResponse.status === 404 && indexResponse.status === 404) {
                        has404Error = true;
                        state.log(`检测到 404 错误 - 根路径: ${rootResponse.status}, index.php: ${indexResponse.status}`, 'warning');

                        // 如果是 ThinkPHP 且连续多次 404，尝试重启为内置服务器
                        if (projectFramework === 'thinkphp' && i > 5 && !fallbackAttempted) {
                            state.log('ThinkPHP 持续返回 404，尝试重启为内置服务器...', 'warning');

                            // 停止当前服务器
                            if (processPid) {
                                try {
                                    await Niva.api.process.exec('kill', ['-TERM', processPid.toString()]);
                                    await new Promise(r => setTimeout(r, 1000));
                                } catch (killError) {
                                    state.log(`停止服务器失败: ${killError.message}`, 'warning');
                                }
                            }

                            // 使用内置服务器重启
                            const fallbackConfig = {
                                success: true,
                                executable: phpPath,
                                args: ['-S', `localhost:${CONFIG.PHP_PORT}`, '-t', `${workingDir}/public`],
                                cwd: workingDir
                            };

                            state.log(`重启为内置服务器: ${fallbackConfig.executable} ${fallbackConfig.args.join(' ')}`);

                            try {
                                process = await tryStartServer(fallbackConfig);
                                fallbackAttempted = true;
                                state.log('重启为内置服务器成功，继续等待...');

                                // 重置计数器，给新服务器时间启动
                                i = 0;
                                continue;
                            } catch (restartError) {
                                state.log(`重启失败: ${restartError.message}`, 'error');
                            }
                        }
                    } else {
                        state.log(`HTTP 响应状态 - 根路径: ${rootResponse.status}, index.php: ${indexResponse.status}`, 'warning');
                    }
                } catch (error) {
                    if (i === 19) { // 最后一次尝试时记录错误
                        const errorMsg = error?.message || error?.toString() || String(error);
                        state.log(`HTTP 请求失败: ${errorMsg}`, 'warning');

                        // 在最后一次尝试时，提供更多调试信息
                        try {
                            const stillExists = await Niva.api.fs.exists(entryFile);
                            state.log(`最终检查入口文件存在: ${stillExists}`);

                            if (stillExists) {
                                const dirContents = await Niva.api.fs.readDir(workingDir);
                                state.log(`工作目录最终内容: ${JSON.stringify(dirContents)}`);
                            }
                        } catch (debugError) {
                            state.log(`调试信息获取失败: ${debugError.message}`, 'error');
                        }
                    }
                    // 继续等待
                }
            }

            if (!serverReady && has404Error) {
                state.log('服务器启动但返回 404，可能是路由配置问题', 'warning');
                state.updateStatus('PHP 服务器已启动（可能需要检查路由）', 'warning');
            } else if (!serverReady) {
                state.log('PHP 服务器启动超时', 'warning');
                state.updateStatus('PHP 服务器启动超时', 'warning');
            }

            return true; // 仍然返回 true，让应用继续运行

        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.updateStatus('启动 PHP 服务器失败', 'error');
            state.log(`启动 PHP 服务器时出错: ${errorMsg}`, 'error');
            return false;
        }
    },

    // 停止 PHP 服务器
    stopServer: async () => {
        if (!processPid) {
            state.log('没有要停止的PHP服务器进程');
            return;
        }

        try {
            killed = true;
            state.log(`正在停止 PHP 服务器 (PID: ${processPid})...`);

            // 根据操作系统选择终止命令
            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');

            if (isWin) {
                // Windows: 只杀死特定PID的进程
                const result = await Niva.api.process.exec('TASKKILL', ['/PID', processPid.toString(), '/F']);
                if (result.status === 0) {
                    state.log(`成功停止 PHP 服务器 (PID: ${processPid})`, 'success');
                } else {
                    state.log(`停止 PHP 服务器失败: ${result.stderr || '未知错误'}`, 'warning');
                }
            } else {
                // macOS/Linux: 只杀死特定PID的进程
                try {
                    const result = await Niva.api.process.exec('kill', ['-TERM', processPid.toString()]);
                    if (result.status === 0) {
                        state.log(`发送终止信号到 PHP 服务器 (PID: ${processPid})`);

                        // 等待进程优雅退出
                        await new Promise(r => setTimeout(r, 2000));

                        // 检查进程是否还在运行
                        const checkResult = await Niva.api.process.exec('ps', ['-p', processPid.toString()]);
                        if (checkResult.status !== 0) {
                            state.log(`PHP 服务器已优雅停止 (PID: ${processPid})`, 'success');
                        } else {
                            // 如果还在运行，强制杀死
                            state.log(`进程仍在运行，强制停止 (PID: ${processPid})`);
                            await Niva.api.process.exec('kill', ['-9', processPid.toString()]);
                            state.log(`强制停止 PHP 服务器 (PID: ${processPid})`, 'success');
                        }
                    } else {
                        state.log(`发送终止信号失败: ${result.stderr || '未知错误'}`, 'warning');
                    }
                } catch (killError) {
                    state.log(`停止 PHP 服务器时出错: ${killError.message}`, 'error');
                }
            }
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`停止 PHP 服务器时出错: ${errorMsg}`, 'error');
        } finally {
            processPid = null;
            killed = false;
        }
    },

    // 清理进程
    cleanup: async () => {
        if (!utils.isNivaApiAvailable()) return;

        try {
            state.log('开始清理PHP服务器进程...');

            // 首先尝试停止我们启动的 PHP 服务器
            if (processPid) {
                state.log(`清理我们启动的PHP服务器 (PID: ${processPid})`);
                await phpManager.stopServer();
            } else {
                state.log('没有记录的PHP服务器PID，尝试通过端口清理...');
            }

            // 无论是否有PID，都尝试清理占用3000端口的进程（确保彻底清理）
            state.log('检查并清理占用3000端口的进程...');
            await phpManager.cleanupPortProcess(CONFIG.PHP_PORT);

            state.log('PHP服务器进程清理完成');
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`清理进程时出错: ${errorMsg}`, 'error');
        }
    },

    // 查找并清理占用特定端口的进程（更安全的清理方式）
    cleanupPortProcess: async (port) => {
        if (!utils.isNivaApiAvailable()) return;

        try {
            state.log(`查找占用端口 ${port} 的进程...`);

            const osInfo = await Niva.api.os.info();
            const isWin = osInfo.os.toLowerCase().includes('windows');

            if (isWin) {
                // Windows: 使用 netstat 查找占用端口的进程
                try {
                    const result = await Niva.api.process.exec('netstat', ['-ano']);
                    if (result.stdout) {
                        const lines = result.stdout.split('\n');
                        for (const line of lines) {
                            if (line.includes(`:${port} `) && line.includes('LISTENING')) {
                                const parts = line.trim().split(/\s+/);
                                const pid = parts[parts.length - 1];
                                if (pid && pid !== '0') {
                                    state.log(`发现占用端口 ${port} 的进程 PID: ${pid}`);
                                    await Niva.api.process.exec('TASKKILL', ['/PID', pid, '/F']);
                                    state.log(`已停止占用端口 ${port} 的进程 (PID: ${pid})`);
                                }
                                break;
                            }
                        }
                    }
                } catch (e) {
                    state.log(`Windows端口清理失败: ${e.message}`, 'warning');
                }
            } else {
                // macOS/Linux: 使用 lsof 查找占用端口的进程
                try {
                    const result = await Niva.api.process.exec('lsof', ['-ti', `:${port}`]);
                    if (result.stdout && result.stdout.trim()) {
                        const pids = result.stdout.trim().split('\n');
                        for (const pid of pids) {
                            if (pid && pid.trim()) {
                                const cleanPid = pid.trim();
                                state.log(`发现占用端口 ${port} 的进程 PID: ${cleanPid}`);

                                // 先尝试优雅终止
                                try {
                                    await Niva.api.process.exec('kill', ['-TERM', cleanPid]);
                                    state.log(`发送TERM信号到进程 ${cleanPid}`);

                                    // 等待2秒让进程优雅退出
                                    await new Promise(resolve => setTimeout(resolve, 2000));

                                    // 检查进程是否还在运行
                                    const checkResult = await Niva.api.process.exec('ps', ['-p', cleanPid]);
                                    if (checkResult.status === 0) {
                                        // 进程仍在运行，强制杀死
                                        state.log(`进程 ${cleanPid} 仍在运行，强制终止...`);
                                        await Niva.api.process.exec('kill', ['-9', cleanPid]);
                                        state.log(`已强制停止占用端口 ${port} 的进程 (PID: ${cleanPid})`);
                                    } else {
                                        state.log(`进程 ${cleanPid} 已优雅退出`);
                                    }
                                } catch (killError) {
                                    state.log(`终止进程 ${cleanPid} 时出错: ${killError.message}`, 'warning');
                                }
                            }
                        }
                    } else {
                        state.log(`没有发现占用端口 ${port} 的进程`);
                    }
                } catch (e) {
                    state.log(`Unix端口清理失败: ${e.message}`, 'warning');

                    // 备用方案：尝试使用netstat
                    try {
                        state.log('尝试使用netstat作为备用方案...');
                        const netstatResult = await Niva.api.process.exec('netstat', ['-anp']);
                        if (netstatResult.stdout) {
                            const lines = netstatResult.stdout.split('\n');
                            for (const line of lines) {
                                if (line.includes(`:${port} `) && line.includes('LISTEN')) {
                                    state.log(`netstat发现端口 ${port} 被占用: ${line.trim()}`);
                                    // 可以进一步解析PID，但这里先记录日志
                                }
                            }
                        }
                    } catch (netstatError) {
                        state.log(`netstat备用方案也失败: ${netstatError.message}`, 'warning');
                    }
                }
            }
        } catch (error) {
            const errorMsg = error?.message || error?.toString() || String(error);
            state.log(`端口清理时出错: ${errorMsg}`, 'error');
        }
    }
};

// 全屏状态处理函数
const handleExitFullscreen = async () => {
    try {
        state.log('用户请求退出全屏模式...');

        if (utils.isNivaApiAvailable() && Niva.api.window && typeof Niva.api.window.setFullscreen === 'function') {
            await Niva.api.window.setFullscreen(false);
            state.log('已通过Niva API退出全屏模式');
        } else if (document.exitFullscreen) {
            await document.exitFullscreen();
            state.log('已通过浏览器API退出全屏模式');
        }

        // 更新状态和提示
        isFullscreen = false;
        fullscreenTip.show('💡 已退出全屏模式，如需重新全屏请刷新页面', true); // 5秒后自动隐藏

    } catch (error) {
        state.log(`退出全屏时出错: ${error?.message || '未知错误'}`, 'error');
        // 即使出错也更新状态
        isFullscreen = false;
        fullscreenTip.show('⚠️ 退出全屏可能未完全成功，请手动调整窗口', true);
    }
};

// 监听浏览器全屏状态变化（备用监听）
document.addEventListener('fullscreenchange', () => {
    const isDocumentFullscreen = !!document.fullscreenElement;

    if (isDocumentFullscreen && !isFullscreen) {
        // 进入浏览器全屏
        isFullscreen = true;
        fullscreenTip.show('💡 已进入全屏模式，按 Esc 键退出全屏');
        state.log('检测到进入浏览器全屏模式');
    } else if (!isDocumentFullscreen && isFullscreen) {
        // 退出浏览器全屏
        isFullscreen = false;
        fullscreenTip.show('💡 已退出全屏模式，如需重新全屏请刷新页面', true);
        state.log('检测到退出浏览器全屏模式');
    }
});

// 初始化应用
const initApp = async () => {
    console.log('开始初始化应用...');
    state.updateStatus('正在初始化...');
    state.log('应用初始化开始');

    // 检查 Niva API 是否可用
    console.log('检查 Niva API 可用性...');
    if (!utils.isNivaApiAvailable()) {
        console.error('Niva API 不可用');
        state.updateStatus('Niva API 不可用', 'error');
        state.log('错误: 当前环境不支持 Niva API', 'error');
        return;
    }

    console.log('Niva API 可用，继续初始化...');
    state.log('Niva API 检查通过');

    // 设置窗口关闭处理
    try {
        console.log('设置窗口关闭处理...');
        Niva.api.window.blockCloseRequested(true);
        Niva.addEventListener("window.closeRequested", async (eventName, payload) => {
            state.log('正在清理资源，请稍候...');
            await phpManager.cleanup();
            Niva.api.window.blockCloseRequested(false);
            Niva.api.window.close();
        });
        state.log('窗口事件监听器设置成功');
    } catch (error) {
        console.error('设置窗口事件监听器失败:', error);
        state.log(`初始化窗口事件监听器失败: ${error.message}`, 'error');
    }

    // 启动 PHP 服务器
    console.log('开始启动 PHP 服务器...');
    state.log('开始启动 PHP 服务器');

    let serverStarted = false;
    try {
        serverStarted = await phpManager.startServer();
        console.log('PHP 服务器启动结果:', serverStarted);

        if (serverStarted) {
            state.log('PHP 服务器启动成功，准备加载页面');
        } else {
            state.log('PHP 服务器启动失败', 'error');
        }
    } catch (error) {
        console.error('PHP 服务器启动异常:', error);
        state.log(`PHP 服务器启动异常: ${error.message}`, 'error');
        state.updateStatus('PHP 服务器启动失败', 'error');
        return;
    }

    if (serverStarted) {
        // PHP服务器启动成功后的处理
        state.log('PHP服务器启动成功，切换到服务器模式');

        // 隐藏非iframe容器并尝试全屏
        try {
            // 添加PHP服务器模式样式类
            document.body.classList.add('php-server-mode');
            state.log('已隐藏非iframe容器，切换到全屏模式');

            // 尝试使用Niva窗口全屏API（非阻塞方式）
            setTimeout(async () => {
                try {
                    if (utils.isNivaApiAvailable() && Niva.api.window && typeof Niva.api.window.setFullscreen === 'function') {
                        state.log('尝试使用Niva窗口全屏API...');
                        await Niva.api.window.setFullscreen(true);
                        state.log('已通过Niva API进入全屏模式');

                        // 更新全屏状态和提示
                        isFullscreen = true;
                        fullscreenTip.show('💡 已进入全屏模式，按 Esc 键退出全屏');
                    } else {
                        state.log('Niva窗口全屏API不可用，尝试浏览器全屏...', 'warning');

                        // 备用方案：使用浏览器全屏API
                        if (document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().then(() => {
                                state.log('已进入浏览器全屏模式');
                            }).catch(() => {
                                state.log('浏览器全屏模式需要用户手动触发，请按F11键全屏', 'warning');
                            });
                        } else {
                            state.log('浏览器不支持全屏API，请按F11键手动全屏', 'warning');
                        }
                    }
                } catch (fullscreenError) {
                    // 如果Niva API失败，尝试浏览器API作为备用
                    const errorMsg = fullscreenError?.message || fullscreenError?.toString() || '未知错误';
                    state.log(`Niva全屏API失败: ${errorMsg}，尝试浏览器全屏...`, 'warning');

                    try {
                        if (document.documentElement.requestFullscreen) {
                            document.documentElement.requestFullscreen().then(() => {
                                state.log('已进入浏览器全屏模式（备用方案）');
                            }).catch(() => {
                                state.log('所有全屏方法都失败，请按F11键手动全屏', 'warning');
                            });
                        } else {
                            state.log('所有全屏方法都不可用，请按F11键手动全屏', 'warning');
                        }
                    } catch (browserError) {
                        state.log('所有全屏功能都不可用，请按F11键手动全屏', 'warning');
                    }
                }
            }, 1000); // 延迟1秒执行，避免阻塞主流程

            // 添加键盘事件监听
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape' && isFullscreen) {
                    // 处理Esc键退出全屏
                    handleExitFullscreen();
                }
            });

        } catch (error) {
            state.log(`切换到服务器模式时出错: ${error?.message || '未知错误'}`, 'error');
        }

        // 加载 PHP 页面到 iframe
        state.setIframeLoading(true);
        elements.iframe.onload = () => {
            state.setIframeLoading(false);
            state.log('PHP 页面加载完成');
        };
        elements.iframe.onerror = () => {
            state.setIframeLoading(false);
            state.log('加载 PHP 页面失败', 'error');
        };
        elements.iframe.src = CONFIG.PHP_ENTRY;
    }
};

// 测试基本功能
const testBasicFunctions = () => {
    console.log('测试基本功能...');

    // 测试日志功能
    try {
        state.log('测试日志功能');
        console.log('日志功能正常');
    } catch (error) {
        console.error('日志功能异常:', error);
    }

    // 测试状态更新功能
    try {
        state.updateStatus('测试状态更新', 'success');
        console.log('状态更新功能正常');
    } catch (error) {
        console.error('状态更新功能异常:', error);
    }

    // 测试 Niva API
    try {
        const nivaAvailable = utils.isNivaApiAvailable();
        console.log('Niva API 可用性:', nivaAvailable);
        state.log(`Niva API 可用性: ${nivaAvailable ? '可用' : '不可用'}`);

        // 如果可用，测试具体的API模块
        if (nivaAvailable) {
            const apiModules = ['os', 'process', 'fs', 'http', 'window'];
            apiModules.forEach(module => {
                try {
                    const moduleAvailable = Niva.api[module] && typeof Niva.api[module] === 'object';
                    console.log(`- Niva.api.${module}:`, moduleAvailable ? '可用' : '不可用');
                    state.log(`Niva.api.${module}: ${moduleAvailable ? '可用' : '不可用'}`);
                } catch (moduleError) {
                    console.error(`检查 Niva.api.${module} 时出错:`, moduleError);
                    state.log(`检查 Niva.api.${module} 时出错: ${moduleError.message}`, 'error');
                }
            });
        }
    } catch (error) {
        console.error('Niva API 检查异常:', error);
        state.log(`Niva API 检查异常: ${error.message}`, 'error');
    }
};

// 初始化 DOM 元素
const initElements = () => {
    console.log('初始化 DOM 元素...');
    elements = {
        statusList: document.getElementById('status-list'),
        logContainer: document.getElementById('log-container'),
        iframe: document.getElementById('php-server-iframe'),
        iframeContainer: document.querySelector('.iframe-container')
    };

    // 检查关键元素是否存在
    const missingElements = [];
    Object.entries(elements).forEach(([key, element]) => {
        if (!element) {
            missingElements.push(key);
            console.error(`缺少 DOM 元素: ${key}`);
        } else {
            console.log(`找到 DOM 元素: ${key}`);
        }
    });

    if (missingElements.length > 0) {
        console.error('缺少 DOM 元素:', missingElements);
        return false;
    }

    console.log('DOM 元素初始化成功');
    return true;
};

// 启动应用函数
function startApp() {
    console.log('DOM 加载完成，开始初始化...');

    // 初始化 DOM 元素
    if (!initElements()) {
        console.error('初始化 DOM 元素失败，无法继续');
        alert('初始化失败：缺少必要的 DOM 元素');
        return;
    }

    // 测试基本功能
    try {
        testBasicFunctions();
    } catch (error) {
        console.error('基本功能测试失败:', error);
    }

    // 初始化应用
    console.log('开始初始化应用...');
    initApp().catch(error => {
        console.error('应用初始化失败:', error);
        state.updateStatus('应用初始化失败', 'error');
        state.log(`初始化错误: ${error.message}`, 'error');

        // 显示错误堆栈
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
            state.log(`错误堆栈: ${error.stack}`, 'error');
        }
    });

    // 添加窗口大小调整处理
    const handleResize = utils.debounce(() => {
        // 可以在这里添加响应式布局的调整
    }, 250);

    window.addEventListener('resize', handleResize);

    // 添加页面卸载时的清理处理
    window.addEventListener('beforeunload', async (event) => {
        try {
            state.log('页面即将卸载，执行清理...');
            await phpManager.cleanup();
        } catch (error) {
            console.error('页面卸载清理失败:', error);
        }
    });

    // 添加页面隐藏时的清理处理（适用于移动设备或标签页切换）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 页面被隐藏时不立即清理，但可以记录状态
            console.log('页面被隐藏');
        }
    });
}

// 检查DOM状态并启动应用
if (document.readyState === 'loading') {
    // DOM 还在加载中
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    // DOM 已经加载完成
    startApp();
}

// 导出到全局作用域
window.App = {
    phpManager,
    state,
    utils,
    network,
    startApp, // 手动启动函数
    initElements,
    testBasicFunctions,
    initApp
};

// JavaScript 文件加载完成
console.log('=== js/app.js 文件加载完成 ===');
console.log('时间戳:', new Date().toISOString());
console.log('全局对象已导出到 window.App');
