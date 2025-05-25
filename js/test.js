// 最小化测试文件
console.log('=== test.js 开始加载 ===');

// 测试基本功能
try {
    console.log('测试1: 基本日志输出');
    
    // 测试对象创建
    const testObj = {
        name: 'test',
        value: 123
    };
    console.log('测试2: 对象创建成功', testObj);
    
    // 测试函数定义
    function testFunction() {
        return 'Hello from test function';
    }
    console.log('测试3: 函数调用', testFunction());
    
    // 测试异步操作
    setTimeout(() => {
        console.log('测试4: 异步操作成功');
    }, 100);
    
    // 测试DOM操作
    document.addEventListener('DOMContentLoaded', () => {
        console.log('测试5: DOM事件监听成功');
    });
    
    // 导出到全局
    window.TestApp = {
        loaded: true,
        timestamp: new Date().toISOString()
    };
    
    console.log('=== test.js 加载完成 ===');
    
} catch (error) {
    console.error('test.js 执行错误:', error);
}
