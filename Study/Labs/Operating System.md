## 实验一
### task_1 编译新内核
1. 从 kernel.org 下载新内核
2. 安装乱七八糟的包
3. sudo make menuconfig 打开配置内核的图形界面，然后 Save Exit
4. 修改 .config：`CONFIG_SYSTEM_TRUSTED_KEYS=""`, `CONFIG_SYSTEM_REVOCATION_KEYS=""`
5. make -j16 编译
6. make modules_install 安装 modules
7. make install 安装内核

### task_2 添加新系统调用
- 旧内核版本：6.14.0.37-generic
- 新内核版本：6.17.12

修改三个文件：
- arch/x86/entry/syscalls/syscall_64.tbl
```tbl
548 common Max    sys_Max
549 common GetPID sys_GetPID
550 common GetCMD sys_GetCMD
```

- include/linux/syscalls.h
```h
asmlinkage long sys_Max(int a, int b, int c);
asmlinkage long sys_GetPID(void);
asmlinkage long sys_GetCMD(char __user *buf, int len);
#endif
```

- kernel/sys.c
```c
// 1. Max: 比较三个整数，返回最大值
SYSCALL_DEFINE3(Max, int, a, int, b, int, c)
{
    int max = a;
    if (b > max) max = b;
    if (c > max) max = c;

    printk(KERN_INFO "[MyCall] Max(%d, %d, %d) = %d\n", a, b, c, max);
    return max;
}

// 2. GetPID: 获得当前进程 ID
SYSCALL_DEFINE0(GetPID)
{
    printk(KERN_INFO "[MyCall] GetPID called. PID: %d\n", current->pid);
    return current->pid;
}

// 3. GetCMD: 获得当前进程名称
SYSCALL_DEFINE2(GetCMD, char __user *, buf, int, len)
{
    // 定义一个内核栈上的临时缓冲区
    // TASK_COMM_LEN 通常是 16，定义在 <linux/sched.h> 中
    char comm[TASK_COMM_LEN];
    int comm_len;

    get_task_comm(comm, current);

    // 2. 计算长度
    comm_len = strlen(comm) + 1;

    // 3. 检查用户缓冲区大小
    if (len < comm_len)
        return -EINVAL;

    // 4. 从“内核栈”拷贝到“用户空间”，这是被允许的
    if (copy_to_user(buf, comm, comm_len))
        return -EFAULT;

    return 0;
}
/* --- My Custom System Calls End --- */
```

### task_4 显示系统信息
sys_monitor.sh
```bash
#!/bin/bash

# 定义颜色变量，为了让输出好看一点
# 用 ANSI 转义码来实现彩色高亮
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color，用完颜色记得清除，不然会乱

echo -e "${BLUE}${BOLD}=== Linux系统监测脚本运行报告 ===${NC}"
echo "----------------------------------------"

# ================= 1. 系统基本信息部分 =================
echo -e "${GREEN}${BOLD}1. 系统基本信息部分${NC}"

# 1. 获取系统名称
# 有的系统没有 lsb_release，所以先读文件试试，不行再用 uname
if [ -f /etc/os-release ]; then
    # 读取配置文件里的变量
    source /etc/os-release
    echo "系统名称: $PRETTY_NAME"
else
    echo "系统名称: $(uname -s)"
fi

# 2. 内核版本
echo "内核版本: $(uname -r)"

# 3. 运行时间
# 使用 -p 参数让时间显示更人性化 (pretty format)
echo "运行时间: $(uptime -p)"

# 4. 当前用户
# id -u 可以查到用户的 UID，whoami 查名字
echo "当前用户: $(whoami) (UID: $(id -u))"

# 5. CPU信息
# 直接去 /proc/cpuinfo 里 grep 找型号，uniq 去重只显示一行
# xargs 用来去除多余的空格
CPU_MODEL=$(grep 'model name' /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
# 统计 processor 出现的次数就知道有几个核了
CPU_CORES=$(grep -c 'processor' /proc/cpuinfo)
echo "CPU信息 : $CPU_MODEL ($CPU_CORES 核心)"

# 6. 内存信息
# 注意：这里加了 LC_ALL=C，强制命令输出英文，
# 否则如果系统是中文环境，grep "Mem" 可能会失败，导致变量为空报错
MEM_TOTAL=$(LC_ALL=C free -h | grep Mem | awk '{print $2}')
MEM_USED=$(LC_ALL=C free -h | grep Mem | awk '{print $3}')
MEM_AVAIL=$(LC_ALL=C free -h | grep Mem | awk '{print $7}')
echo "内存信息: 总共 $MEM_TOTAL, 已用 $MEM_USED, 可用 $MEM_AVAIL"

echo ""

# ================= 2. 系统状态部分 =================
echo -e "${GREEN}${BOLD}2. 系统状态部分${NC}"

# 1. 系统负载
# 直接读取 /proc/loadavg 文件的系统平均负载数据
LOAD_AVG=$(awk '{print $1", "$2", "$3}' /proc/loadavg)
echo "系统负载: $LOAD_AVG (1, 5, 15分钟)"

# 2. 当前时间
echo "当前时间: $(date "+%Y年%m月%d日 %H点%M分%S秒")"

# 3. CPU使用率
# 用 top 抓取一次状态 (-bn1)，然后用 sed 提取 id (idle 空闲率)
# 只要算出空闲率，用 100 减去它就是使用率了
CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print $1}')
# 判断一下是否获取到了数值，防止计算报错
if [ -n "$CPU_IDLE" ]; then
    # 用 bc 或者简单的 shell 算术运算
    # 这里为了兼容性，用 awk 来做减法
    CPU_USAGE=$(awk "BEGIN {print 100 - $CPU_IDLE}")
    echo "CPU使用率: ${CPU_USAGE}%"
else
    echo "CPU使用率: 无法获取"
fi

# 4. 内存使用率
# 为了计算百分比，这里用 bytes 为单位取数值 (free 不带 -h)
# 同样加上 LC_ALL=C 防止出错
MEM_TOTAL_NUM=$(LC_ALL=C free | grep Mem | awk '{print $2}')
MEM_USED_NUM=$(LC_ALL=C free | grep Mem | awk '{print $3}')

# 这里的 awk 用来做浮点数除法运算，保留两位小数
# 加上判断防止分母为 0 的情况
if [ -n "$MEM_TOTAL_NUM" ] && [ "$MEM_TOTAL_NUM" -gt 0 ]; then
    MEM_PERCENT=$(awk "BEGIN {printf \"%.2f\", $MEM_USED_NUM / $MEM_TOTAL_NUM * 100}")
    echo "内存使用率: ${MEM_PERCENT}%"
else
    echo "内存使用率: 无法计算"
fi

echo ""

# ================= 3. 进程信息部分 =================
echo -e "${GREEN}${BOLD}3. 进程信息部分${NC}"

# 使用 ps 命令自定义输出格式：PID, 用户, CPU占用, 内存占用, 命令名
# --sort 参数用来排序，-pcpu 表示按 CPU 降序，-pmem 表示按内存降序

echo -e "${BOLD}CPU占用最高的5个进程:${NC}"
# head -n 6 是因为第一行是标题，所以取前6行就是 Top 5
ps -eo pid,user,pcpu,pmem,comm --sort=-pcpu | head -n 6 | awk '{printf "%-8s %-10s %-8s %-8s %s\n", $1, $2, $3"%", $4"%", $5}'

echo ""
echo -e "${BOLD}内存占用最高的5个进程:${NC}"
ps -eo pid,user,pcpu,pmem,comm --sort=-pmem | head -n 6 | awk '{printf "%-8s %-10s %-8s %-8s %s\n", $1, $2, $3"%", $4"%", $5}'

echo "----------------------------------------"
```

*实验一截图*
![[Pasted image 20251223153920.png]]

## 实验二
### task_1 在 Linux 下创建两个线程 A 和 B, 循环输出数据或者字符串
task_1.cpp
```cpp
#include <pthread.h>
#include <iostream>
#include <unistd.h>

// 线程 A 的执行函数
void* ThreadAFunc(void* arg) {
    for (int i = 1; i <= 1000; ++i) {
        std::cout << "A:" << i << std::endl;
        usleep(200000); // 暂停 0.2 秒 (200,000 微秒)
    }
    return NULL;
}

// 线程 B 的执行函数
void* ThreadBFunc(void* arg) {
    for (int i = 1000; i >= 1; --i) {
        std::cout << "B:" << i << std::endl;
        usleep(200000); // 暂停 0.2 秒
    }
    return NULL;
}

int main() {
    pthread_t threadA, threadB;

    // 创建线程 A
    if (pthread_create(&threadA, NULL, ThreadAFunc, NULL) != 0) {
        std::cerr << "Error creating thread A" << std::endl;
        return 1;
    }

    // 创建线程 B
    if (pthread_create(&threadB, NULL, ThreadBFunc, NULL) != 0) {
        std::cerr << "Error creating thread B" << std::endl;
        return 1;
    }

    // 等待线程结束
    pthread_join(threadA, NULL);
    pthread_join(threadB, NULL);

    return 0;
}
```
g++ task_1.cpp -o task_1 -lpthread

1. 利用 `pthread` 库同时启动两个线程 A 和 B
2. 线程 A：从 1 累加到 1000
3. 线程 B：从 1000 递减到 1
4. 每个循环均使用 `usleep(200000)` 暂停 **0.2 秒**，使两个线程在控制台交替输出
5. `main` 函数使用 `pthread_join` 等待两个子线程全部执行完毕后才退出

*task_1 截图*
![[Pasted image 20251223154235.png]]

### task_2 在 Linux 下创建父子进程，实现 wait 同步函数，理解父子进程同步
task_2.cpp
```cpp
#include <iostream>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/types.h>
#include <cstdlib>

int main() {
    pid_t pid = fork();

    if (pid < 0) {
        // Fork 失败
        std::cerr << "Fork failed!" << std::endl;
        return 1;
    } else if (pid == 0) {
        // 子进程代码
        std::cout << "[Child] I am the child process (PID: " << getpid() << ")." << std::endl;
        std::cout << "[Child] Sleeping for 5 seconds..." << std::endl;
        sleep(5);
        std::cout << "[Child] Woke up. Exiting with status 42." << std::endl;
        exit(42); // 子进程返回 42
    } else {
        // 父进程代码
        std::cout << "[Parent] I am the parent process (PID: " << getpid() << ")." << std::endl;
        std::cout << "[Parent] Created child process with PID: " << pid << std::endl;

        int status;
        std::cout << "[Parent] Waiting for child to exit..." << std::endl;

        // 等待任意子进程结束
        pid_t child_pid = wait(&status);

        if (WIFEXITED(status)) {
            // 子进程正常退出
            int exit_status = WEXITSTATUS(status);
            std::cout << "[Parent] Child process " << child_pid << " exited normally." << std::endl;
            std::cout << "[Parent] The return status is: " << exit_status << std::endl;
        } else {
            std::cout << "[Parent] Child process exited abnormally." << std::endl;
        }
    }

    return 0;
}
```
g++ task_2.cpp -o task_2

1. 调用 `fork()` 创建一个与父进程几乎完全一样的子进程。此时程序通过返回值 pid 分流：pid == 0：当前处于子进程环境; pid > 0：当前处于父进程环境（返回值为子进程的 PID）
2. 子进程行为：打印自身 PID 后进入 5 秒休眠，随后通过 `exit(42)` 退出并返回状态码 42
3. **父进程行为**：调用 `wait(&status)` 进入**阻塞状态**，等待子进程结束
4. **状态捕获**：子进程退出后，父进程被唤醒，利用宏 `WIFEXITED` 确认子进程是正常退出的，并用 `WEXITSTATUS` 提取出子进程返回的数值 42

*task_2 截图*
![[Pasted image 20251223154345.png]]

### task_3 在 Windows 下，利用线程实现并发画圆画方
task_3.cpp
```cpp
#include <iostream>
#include <math.h>
#include <windows.h>

#define PI 3.14159265

// 全局变量，用于窗口句柄
HWND hGraphWindow = NULL;

// 窗口过程函数 (处理窗口消息)
LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam,
                            LPARAM lParam) {
    switch (uMsg) {
    case WM_DESTROY:
        PostQuitMessage(0);
        return 0;
    case WM_PAINT: {
        PAINTSTRUCT ps;
        HDC hdc = BeginPaint(hwnd, &ps);
        // 这里什么都不做，留给线程去画
        EndPaint(hwnd, &ps);
    }
        return 0;
    }
    return DefWindowProc(hwnd, uMsg, wParam, lParam);
}

// 专门用于创建和维护窗口的线程
DWORD WINAPI WindowThread(LPVOID lpParam) {
    const char CLASS_NAME[] = "Sample Window Class";
    WNDCLASS wc = {};
    wc.lpfnWndProc = WindowProc;
    wc.hInstance = GetModuleHandle(NULL);
    wc.lpszClassName = CLASS_NAME;
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1); // 白色背景

    RegisterClass(&wc);

    hGraphWindow = CreateWindowEx(0, CLASS_NAME, "Concurrent Drawing Lab",
                                  WS_OVERLAPPEDWINDOW | WS_VISIBLE, 100, 100,
                                  800, 600, // 窗口位置和大小
                                  NULL, NULL, GetModuleHandle(NULL), NULL);

    if (hGraphWindow == NULL)
        return 0;

    // 消息循环
    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
    return 0;
}

// 线程 A：画圆
DWORD WINAPI DrawCircle(LPVOID lpParam) {
    // 等待窗口创建完毕
    while (hGraphWindow == NULL)
        Sleep(10);

    HDC hdc = GetDC(hGraphWindow);
    int centerX = 300;
    int centerY = 300;
    int radius = 100;
    COLORREF color = RGB(255, 0, 0); // 红色

    for (int i = 0; i < 720; ++i) {
        double angle = (double)i * PI / 360.0;
        int x = centerX + (int)(radius * cos(angle));
        int y = centerY + (int)(radius * sin(angle));

        SetPixel(hdc, x, y, color);

        // 画大一点点，防止看不清
        SetPixel(hdc, x + 1, y, color);
        SetPixel(hdc, x, y + 1, color);
        SetPixel(hdc, x + 1, y + 1, color);

        Sleep(2); // 稍微快一点
    }
    ReleaseDC(hGraphWindow, hdc);
    return 0;
}

// 线程 B：画正方形
DWORD WINAPI DrawSquare(LPVOID lpParam) {
    // 等待窗口创建完毕
    while (hGraphWindow == NULL)
        Sleep(10);

    HDC hdc = GetDC(hGraphWindow);
    int centerX = 600;
    int centerY = 300;
    int sideLength = 200;
    int halfSide = sideLength / 2;
    COLORREF color = RGB(0, 0, 255); // 蓝色

    int steps = 180;

    // 定义四个顶点的逻辑
    // 上边
    for (int i = 0; i < steps; i++) {
        int x = (centerX - halfSide) + (int)((double)sideLength * i / steps);
        int y = centerY - halfSide;
        SetPixel(hdc, x, y, color);
        SetPixel(hdc, x + 1, y, color);
        SetPixel(hdc, x, y + 1, color);
        Sleep(2);
    }
    // 右边
    for (int i = 0; i < steps; i++) {
        int x = centerX + halfSide;
        int y = (centerY - halfSide) + (int)((double)sideLength * i / steps);
        SetPixel(hdc, x, y, color);
        SetPixel(hdc, x + 1, y, color);
        SetPixel(hdc, x, y + 1, color);
        Sleep(2);
    }
    // 下边
    for (int i = 0; i < steps; i++) {
        int x = (centerX + halfSide) - (int)((double)sideLength * i / steps);
        int y = centerY + halfSide;
        SetPixel(hdc, x, y, color);
        SetPixel(hdc, x + 1, y, color);
        SetPixel(hdc, x, y + 1, color);
        Sleep(2);
    }
    // 左边
    for (int i = 0; i < steps; i++) {
        int x = centerX - halfSide;
        int y = (centerY + halfSide) - (int)((double)sideLength * i / steps);
        SetPixel(hdc, x, y, color);
        SetPixel(hdc, x + 1, y, color);
        SetPixel(hdc, x, y + 1, color);
        Sleep(2);
    }

    ReleaseDC(hGraphWindow, hdc);
    return 0;
}

int main() {
    // 1. 启动窗口线程
    HANDLE hWinThread = CreateThread(NULL, 0, WindowThread, NULL, 0, NULL);

    std::cout << "Waiting for window..." << std::endl;
    while (hGraphWindow == NULL)
        Sleep(100);
    std::cout << "Window created! Drawing..." << std::endl;

    // 2. 启动画图线程
    HANDLE hThread1 = CreateThread(NULL, 0, DrawCircle, NULL, 0, NULL);
    HANDLE hThread2 = CreateThread(NULL, 0, DrawSquare, NULL, 0, NULL);

    // 等待画图完成
    WaitForSingleObject(hThread1, INFINITE);
    WaitForSingleObject(hThread2, INFINITE);

    std::cout << "Drawing finished. Close the window to exit." << std::endl;

    // 等待窗口关闭
    WaitForSingleObject(hWinThread, INFINITE);

    return 0;
}
```
g++ .\task_3.cpp -o task_3 -lgdi32

1. 通过 `CreateThread` 启动了一个专门的 `WindowThread` 线程，用于注册窗口类、创建 `HWND` 窗口并运行 `GetMessage` 消息循环
2. 确认窗口句柄 `hGraphWindow` 有效后，同时启动两个绘图线程：`DrawCircle` 线程：利用三角函数 `cos` 和 `sin` 计算坐标，在窗口左侧绘制一个红色圆形；`DrawSquare` 线程：通过四个顺序执行的 `for` 循环计算线性坐标，在窗口右侧绘制一个蓝色正方形
3. 调用 `GetDC` 获取窗口的设备上下文（HDC），并使用 `SetPixel` 逐点打点绘图。通过 `Sleep(2)` 控制绘制速度，展示两个图形同时生长的动画效果
4. `main` 函数利用 `WaitForSingleObject` 阻塞等待两个绘图线程执行完毕

*task_3 截图*
![[Pasted image 20251223154415.png]]

### task_4 在 Linux 下利用线程实现“生产者-消费者”同步控制
task_4.cpp
```cpp
#include <pthread.h>
#include <semaphore.h>
#include <iostream>
#include <vector>
#include <unistd.h>
#include <cstdlib>

#define BUFFER_SIZE 10

// 缓冲区
int buffer[BUFFER_SIZE];
int in = 0;  // 写入位置
int out = 0; // 读取位置

// 信号量和互斥锁
sem_t empty_slots; // 空槽位数量
sem_t full_slots;  // 满槽位数量 (即产品数量)
pthread_mutex_t mutex; // 互斥锁，保护缓冲区

// 生产者线程函数
void* Producer(void* arg) {
    int id = *(int*)arg;
    int start_val = (id == 1) ? 1000 : 2000;
    int end_val = (id == 1) ? 1999 : 2999;

    for (int i = start_val; i <= end_val; ++i) {
        int data = i;

        // 随机睡眠 100ms - 1s
        usleep((rand() % 900000) + 100000);

        // 等待空槽位
        sem_wait(&empty_slots);
        // 获取互斥锁
        pthread_mutex_lock(&mutex);

        // 放入数据
        buffer[in] = data;
        std::cout << "[Producer " << id << "] Produced: " << data << " at index " << in << std::endl;
        in = (in + 1) % BUFFER_SIZE;

        // 释放互斥锁
        pthread_mutex_unlock(&mutex);
        // 增加满槽位信号量
        sem_post(&full_slots);
    }
    return NULL;
}

// 消费者线程函数
void* Consumer(void* arg) {
    int id = *(int*)arg;
    while (true) {
        // 随机睡眠 100ms - 1s
        usleep((rand() % 900000) + 100000);

        // 等待满槽位 (有产品)
        sem_wait(&full_slots);
        // 获取互斥锁
        pthread_mutex_lock(&mutex);

        // 取出数据
        int data = buffer[out];
        std::cout << "    [Consumer " << id << "] Consumed: " << data << " from index " << out << std::endl;
        out = (out + 1) % BUFFER_SIZE;

        // 释放互斥锁
        pthread_mutex_unlock(&mutex);
        // 增加空槽位信号量
        sem_post(&empty_slots);
    }
    return NULL;
}

int main() {
    // 初始化信号量和互斥锁
    sem_init(&empty_slots, 0, BUFFER_SIZE); // 初始空槽位为 10
    sem_init(&full_slots, 0, 0);            // 初始产品数为 0
    pthread_mutex_init(&mutex, NULL);

    pthread_t p1, p2;
    pthread_t c1, c2, c3;
    int id1 = 1, id2 = 2, id3 = 3; // 线程 ID

    // 创建消费者 (先创建消费者或者生产者都可以)
    pthread_create(&c1, NULL, Consumer, &id1);
    pthread_create(&c2, NULL, Consumer, &id2);
    pthread_create(&c3, NULL, Consumer, &id3);

    // 创建生产者
    pthread_create(&p1, NULL, Producer, &id1);
    pthread_create(&p2, NULL, Producer, &id2);

    // 等待生产者结束 (消费者是死循环，这里主线程只等生产者)
    pthread_join(p1, NULL);
    pthread_join(p2, NULL);

    // 清理资源
    sem_destroy(&empty_slots);
    sem_destroy(&full_slots);
    pthread_mutex_destroy(&mutex);

    return 0;
}
```
g++ task_4.cpp -o task_4 -lpthread

1. 利用 `sem_t` 类型的两个信号量 `empty_slots`（空位）和 `full_slots`（产品数）来协调生产与消费的节奏
2. 使用 `pthread_mutex_t` 互斥锁保护共享的循环缓冲区 `buffer` 以及索引变量 `in` 和 `out`。确保同一时刻只有一个线程可以操作缓冲区，避免竞态条件
3. 生产者：调用 `sem_wait` 确认有空位后，获取互斥锁并将数据写入 `buffer[in]`。完成写入后通过 `sem_post` 增加产品计数，通知消费者可以读取
4. 消费者：调用 `sem_wait` 确认有产品后，获取互斥锁从 `buffer[out]` 取出数据。处理完毕后通过 `sem_post` 增加空位计数，通知生产者缓冲区已有新空间
5. 通过 `(index + 1) % BUFFER_SIZE` 的取模运算，实现固定大小数组的循环利用，使 `in` 和 `out` 指针在缓冲区内首尾相连地循环移动

*task_4 截图*
![[Pasted image 20251223154452.png]]

### task_6 在 Linux 下模拟哲学家就餐，提供死锁和非死锁解法
task_6_gui.c
```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <time.h>
#include <ncurses.h>
#include <signal.h>

#define PHILOSOPHER_NUM 5

// ============================================================================
// 开关配置：
// 0 = 【死锁演示模式】(拿到左筷子后强制停顿 1s)
// 1 = 【非死锁解法模式】(使用 trylock 策略)
#define ENABLE_NO_DEADLOCK_SOLUTION 1
// ============================================================================

typedef enum {
    STATE_THINKING,    // 思考 (Blue)
    STATE_HUNGRY,      // 饿了/等左筷子 (Yellow)
    STATE_GOT_LEFT,    // 拿到了左筷子/等右筷子 (Magenta)
    STATE_EATING,      // 吃饭 (Green)
    STATE_GIVE_UP      // 放弃并放下筷子 (Red blink)
} State;

pthread_mutex_t chopsticks[PHILOSOPHER_NUM];
pthread_mutex_t screen_lock;
State philo_states[PHILOSOPHER_NUM];

void random_sleep(int min_ms, int max_ms) {
    int sleep_micros = (rand() % (max_ms - min_ms + 1) + min_ms) * 1000;
    usleep(sleep_micros);
}

void draw_interface() {
    pthread_mutex_lock(&screen_lock);

    mvprintw(1, 2, "=== Philosopher's Dining (Ncurses GUI) ===");
    if (ENABLE_NO_DEADLOCK_SOLUTION)
        mvprintw(3, 2, "Mode: [NO DEADLOCK] (TryLock)");
    else
        mvprintw(3, 2, "Mode: [DEADLOCK DEMO] (Force Wait 1s)");

    mvprintw(5, 5, "ID   | Left Fork | Status            | Right Fork");
    mvprintw(6, 5, "-----|-----------|-------------------|-----------");

    for (int i = 0; i < PHILOSOPHER_NUM; i++) {
        int row = 8 + i * 2;
        mvprintw(row, 5, "[P%d]", i);
        mvprintw(row, 12, "%d", i);

        move(row, 24);
        switch (philo_states[i]) {
            case STATE_THINKING:
                attron(COLOR_PAIR(1)); printw(" Thinking...      "); attroff(COLOR_PAIR(1)); break;
            case STATE_HUNGRY:
                attron(COLOR_PAIR(2)); printw(" Waiting Left...  "); attroff(COLOR_PAIR(2)); break;
            case STATE_GOT_LEFT:
                attron(COLOR_PAIR(3)); printw(" HAS LEFT > WAIT  "); attroff(COLOR_PAIR(3)); break;
            case STATE_EATING:
                attron(COLOR_PAIR(4)); printw(" ** EATING **     "); attroff(COLOR_PAIR(4)); break;
            case STATE_GIVE_UP:
                attron(COLOR_PAIR(5)); printw(" !! GIVE UP !!    "); attroff(COLOR_PAIR(5)); break;
        }

        mvprintw(row, 44, "%d", (i + 1) % PHILOSOPHER_NUM);
    }

    mvprintw(20, 2, "Press Ctrl+C to exit.");
    refresh();
    pthread_mutex_unlock(&screen_lock);
}

void update_state(int id, State s) {
    philo_states[id] = s;
    draw_interface();
}

void* philosopher(void* arg) {
    int id = *(int*)arg;
    int left = id;
    int right = (id + 1) % PHILOSOPHER_NUM;

    while (1) {
#if ENABLE_NO_DEADLOCK_SOLUTION
        // ================= 【非死锁模式】 =================
        update_state(id, STATE_THINKING);
        random_sleep(100, 500); // 符合要求：100ms-500ms

        update_state(id, STATE_HUNGRY);
        // 尝试拿左边
        if (pthread_mutex_lock(&chopsticks[left]) == 0) {
            update_state(id, STATE_GOT_LEFT);
            random_sleep(100, 500); // 模拟拿起的动作

            // 尝试拿右边 (TryLock)
            if (pthread_mutex_trylock(&chopsticks[right]) == 0) {
                update_state(id, STATE_EATING);
                random_sleep(100, 500); // 符合要求：吃饭 100ms-500ms

                pthread_mutex_unlock(&chopsticks[right]);
                // 放下右筷子后，状态暂回左手持有（瞬间）
                update_state(id, STATE_GOT_LEFT);
            } else {
                // 拿不到，放弃
                update_state(id, STATE_GIVE_UP);
                random_sleep(100, 500); // 展示放弃状态
            }
            pthread_mutex_unlock(&chopsticks[left]);

            // 放弃后稍作等待
            random_sleep(100, 500);
        }
#else
        // ================= 【死锁模式】 =================
        update_state(id, STATE_THINKING);
        random_sleep(100, 500); // 符合要求：100ms-500ms

        update_state(id, STATE_HUNGRY);

        // 1. 拿左边
        pthread_mutex_lock(&chopsticks[left]);
        update_state(id, STATE_GOT_LEFT);

        // 【致命停顿】：拿到左筷子后，强制等1秒
        sleep(1);

        // 2. 拿右边 (死锁发生点)
        pthread_mutex_lock(&chopsticks[right]);

        update_state(id, STATE_EATING);
        random_sleep(100, 500); // 符合要求：吃饭 100ms-500ms

        pthread_mutex_unlock(&chopsticks[right]);
        pthread_mutex_unlock(&chopsticks[left]);
#endif
    }
    return NULL;
}

void finish(int sig) {
    endwin();
    exit(0);
}

int main() {
    signal(SIGINT, finish);

    initscr();
    cbreak();
    noecho();
    curs_set(0);
    start_color();

    init_pair(1, COLOR_BLUE, COLOR_BLACK);
    init_pair(2, COLOR_YELLOW, COLOR_BLACK);
    init_pair(3, COLOR_MAGENTA, COLOR_BLACK);
    init_pair(4, COLOR_GREEN, COLOR_BLACK);
    init_pair(5, COLOR_RED, COLOR_BLACK);

    srand(time(NULL));
    pthread_mutex_init(&screen_lock, NULL);

    pthread_t philo[PHILOSOPHER_NUM];
    int ids[PHILOSOPHER_NUM];

    for (int i = 0; i < PHILOSOPHER_NUM; i++) {
        pthread_mutex_init(&chopsticks[i], NULL);
    }

    draw_interface();

    for (int i = 0; i < PHILOSOPHER_NUM; i++) {
        ids[i] = i;
        if (pthread_create(&philo[i], NULL, philosopher, &ids[i]) != 0) {
            endwin();
            perror("Create thread failed");
            return 1;
        }
    }

    for (int i = 0; i < PHILOSOPHER_NUM; i++) {
        pthread_join(philo[i], NULL);
    }

    endwin();
    return 0;
}
```
gcc task_6_gui.c -o task_6_gui -lpthread -lncurses

利用 `ncurses` 库构建字符图形界面，实时显示每个哲学家的状态（思考、饥饿、持有左筷子、进食、放弃）。通过 `screen_lock` 确保多线程刷新界面时不会产生乱序

- 死锁
1. 哲学家先调用 `pthread_mutex_lock` 锁定左手筷子，随后强制执行 `sleep(1)`
2. 通过 `sleep(1)` 确保所有哲学家都已成功持有左手筷子，强制死锁（不加这个 `sleep(1)` 的话可能得等很久才会出现死锁）
3. 哲学家再次调用 `pthread_mutex_lock` 锁定右手筷子。由于右侧筷子已被邻座哲学家作为“左手筷子”持有且不释放，导致所有线程永久阻塞

- 非死锁
1. 哲学家锁定左手筷子后，改用 `pthread_mutex_trylock` 尝试获取右手筷子
2. 如果右手筷子已被占用，`trylock` 会立即返回失败，哲学家随后会通过 `pthread_mutex_unlock` 释放已持有的左手筷子

*task_6 截图*
死锁：
![[Pasted image 20251223154600.png]]

非死锁：
![[Pasted image 20251223154530.png]]

## 实验三
### task_1 Linux模拟实现 OPT, FIFO, LRU 等淘汰算法
task_1.cpp
```cpp
#include <iostream>
#include <vector>
#include <unordered_map>
#include <algorithm>
#include <cstdlib>
#include <ctime>
#include <climits>
#include <iomanip>
#include <queue> // 新增：用于FIFO算法的队列

using namespace std;

class LruAndOpt {
private:
    // 设置页面大小为10
    const int pageSize = 10;
    // 物理页框数量
    const int frameCount = 3;

public:
    int getPageNumber(int address) {
        return address / pageSize;
    }

    // ================= FIFO 算法 (新增) =================
    void Fifo(const vector<int>& A) {
        int count = 0; // 缺页计数
        int n = A.size();
        unordered_map<int, int> pageMap; // 逻辑页 -> 物理页框
        queue<int> q; // 记录进入内存的顺序

        for (int i = 0; i < n; i++) {
            int page = getPageNumber(A[i]);

            // 第一次访问特殊处理
            if (i == 0) {
                count++;
                pageMap[page] = 1;
                q.push(page);
            } else {
                // 如果页面不在内存中 (缺页)
                if (pageMap.find(page) == pageMap.end()) {
                    count++;

                    // 如果还有空闲物理页框
                    if (pageMap.size() < frameCount) {
                        int newFrameId = pageMap.size() + 1;
                        pageMap[page] = newFrameId;
                        q.push(page);
                    } else {
                        // 内存已满，需要置换
                        // FIFO 核心：淘汰最早进入队列的页面
                        int eliminate = q.front();
                        q.pop();

                        // 获取被淘汰页面的物理页框号，给新页面用
                        int phy = pageMap[eliminate];
                        pageMap.erase(eliminate);

                        // 装入新页
                        pageMap[page] = phy;
                        q.push(page);
                    }
                }
                // 如果页面已经在内存中 (Hit)，FIFO 不做任何操作，也不改变队列顺序
            }
        }

        cout << "访问次数:" << n << ",缺页次数:" << count << ",缺页率:";
        cout << fixed << setprecision(2) << ((double)count / n * 100) << "%" << endl;
    }

    // ================= OPT 算法 =================
    void Opt(const vector<int>& A) {
        int count = 0;
        int n = A.size();
        unordered_map<int, int> pageMap;

        for (int i = 0; i < n; i++) {
            int page = getPageNumber(A[i]);
            if (i == 0) {
                count++;
                pageMap[page] = 1;
            } else {
                if (pageMap.find(page) == pageMap.end()) {
                    count++;
                    if (pageMap.size() < frameCount) {
                        pageMap[page] = pageMap.size() + 1;
                    } else {
                        int eliminate = 0;
                        int latest = -1;

                        for (auto const& [k, v] : pageMap) {
                            bool found = false;
                            int time = 0;
                            for (int j = i + 1; j < n; j++) {
                                if (k == getPageNumber(A[j])) {
                                    found = true;
                                    time = j;
                                    break;
                                }
                            }

                            if (found) {
                                if (latest < time) {
                                    latest = time;
                                    eliminate = k;
                                }
                            } else {
                                eliminate = k;
                                break;
                            }
                        }

                        int phy = pageMap[eliminate];
                        pageMap.erase(eliminate);
                        pageMap[page] = phy;
                    }
                }
            }
        }

        cout << "访问次数:" << n << ",缺页次数:" << count << ",缺页率:";
        cout << fixed << setprecision(2) << ((double)count / n * 100) << "%" << endl;
    }

    // ================= LRU 算法 =================
    void Lru(const vector<int>& A) {
        int n = A.size();
        int count = 0;
        unordered_map<int, int> pageMap;

        for (int i = 0; i < n; i++) {
            int page = getPageNumber(A[i]);
            if (i == 0) {
                count++;
                pageMap[page] = 1;
            } else {
                if (pageMap.find(page) == pageMap.end()) {
                    count++;
                    if (pageMap.size() < frameCount) {
                        pageMap[page] = pageMap.size() + 1;
                    } else {
                        int eliminate = 0;
                        int latest = INT_MAX;
                        int k = 0;

                        for (int j = i - 1; j >= 0; j--) {
                            int pastPage = getPageNumber(A[j]);
                            if (pageMap.count(pastPage) && latest > j) {
                                latest = j;
                                k++;
                                eliminate = pastPage;
                                if (k == frameCount) {
                                    break;
                                }
                            }
                        }

                        int phy = pageMap[eliminate];
                        pageMap.erase(eliminate);
                        pageMap[page] = phy;
                    }
                }
            }
        }

        cout << "访问次数:" << n << ",缺页次数:" << count << ",缺页率:";
        cout << fixed << setprecision(2) << ((double)count / n * 100) << "%" << endl;
    }
};

int main() {
    srand((unsigned)time(NULL));

    LruAndOpt lao;
    cout << "页面大小为10,物理页框共3个" << endl;
    cout << "请输入访问序列的个数:";

    int n;
    if (!(cin >> n)) return 0;

    cout << "请输入随机数的限制:";
    int limit;
    cin >> limit;

    // 1. 随机序列
    vector<int> A1(n);
    for (int i = 0; i < n; i++) {
        A1[i] = rand() % limit;
    }

    // 2. 顺序序列 (0, 1, 2, 3...)
    vector<int> A2(n);
    for (int i = 0; i < n; i++) {
        A2[i] = i;
    }

    // 3. 循环序列 (模拟局部性，如 0, 1, 2...99, 0, 1...)
    vector<int> A3(n);
    for (int i = 0; i < n; i++) {
        A3[i] = i % 100; // 假设循环范围
    }

    cout << "=================OPT算法=================" << endl;
    cout << "-----------------随机序列-----------------" << endl;
    lao.Opt(A1);
    cout << "-----------------顺序序列-----------------" << endl;
    lao.Opt(A2);
    cout << "-----------------循环序列-----------------" << endl;
    lao.Opt(A3);

    cout << endl << "=================FIFO算法=================" << endl;
    cout << "-----------------随机序列-----------------" << endl;
    lao.Fifo(A1);
    cout << "-----------------顺序序列-----------------" << endl;
    lao.Fifo(A2);
    cout << "-----------------循环序列-----------------" << endl;
    lao.Fifo(A3);

    cout << endl << "=================LRU算法=================" << endl;
    cout << "-----------------随机序列-----------------" << endl;
    lao.Lru(A1);
    cout << "-----------------顺序序列-----------------" << endl;
    lao.Lru(A2);
    cout << "-----------------循环序列-----------------" << endl;
    lao.Lru(A3);

    return 0;
}
```

- FIFO (先进先出)
    - 原理：总是淘汰最早进入内存的页面。
    - 实现：使用 `std::queue<int> q`。新页进来排在队尾，需要置换时直接弹出队首（`q.front()`）
- OPT (最佳置换算法)
    - 原理：淘汰以后永不使用，或者在最长时间内不再被访问的页面
    - 实现：代码会向后遍历数组 A（`for (int j = i + 1; j < n; j++)`），寻找内存中哪个页面在未来最晚才被用到。
- LRU (最近最久未使用)
    - 原理：淘汰最近一段时间内最久没有被使用的页面
    - 实现：代码通过向后回溯（`for (int j = i - 1; j >= 0; j--)`）来观察哪些页面最近刚用过，挑出那个最远没用的

*task_1 截图*
![[Pasted image 20251229193709.png]]

### task_2 Linux 下利用 /proc/pid/pagemap 技术计算某个变量或函数虚拟地址对应的物理地址等信息
task_2.cpp
```cpp
#include <stdio.h>
#include <unistd.h>
#include <stdint.h>
#include <stdlib.h>
#include <inttypes.h>
#include <string.h>

//获取物理地址 //va为虚拟内存地址
void VA2PA(unsigned long va) {
    //页面大小
    size_t pageSize = getpagesize();
    //页号
    unsigned long pageIndex = va / pageSize;
    //页内偏移
    unsigned long offset = va % pageSize;
    FILE* fp;

    // 定义用于接收读取结果的变量 (修复错误 A)
    uint64_t it;

    printf("Virtual Address: 0x%lx\n", va);
    printf("Page Index: 0x%lx\nPage Offset: 0x%lx\n", pageIndex, offset);

    if((fp = fopen("/proc/self/pagemap", "rb")) == NULL) {
        printf("Error: Cannot open pagemap. Are you root?\n");
        return;
    }

    unsigned long fileOffset = pageIndex * sizeof(uint64_t);
    if(fseek(fp, fileOffset, SEEK_SET) != 0) {
        printf("Error: fseek failed!\n");
        fclose(fp);
        return;
    }

    if(fread(&it, sizeof(uint64_t), 1, fp) != 1) {
        printf("Error: fread failed!\n");
        fclose(fp);
        return;
    }
    fclose(fp);

    // 第63位记录当前页面位置：1为在物理内存中，0表示不在物理内存中
    // 修复错误 C: 增加括号修正优先级
    if(((it >> 63) & 1) == 0) {
        printf("Page Present is 0.\nNot in the Physical Memory.\n");
        return;
    }

    // 0-54位为物理页号
    uint64_t pPageIndex = (((uint64_t)1 << 55) - 1) & it;
    printf("Physical Page Index: 0x%" PRIx64 "\n", pPageIndex);

    // 物理地址 = 物理页号*页大小+页内偏移
    unsigned long pa = pPageIndex * pageSize + offset;
    printf("Physical Address: 0x%lx\n\n", pa);
}

int a = 1000;

int max(int a, int b) {
    return a >= b ? a : b;
}

int main() {
    printf("pid = %d\n", getpid());

    printf("Global variable a:\n");
    VA2PA((unsigned long)&a);

    printf("Function max:\n");
    VA2PA((unsigned long)(void*)&max); 

    return 0;
}
```

- main 函数
    - 打印当前进程 ID
    - 计算变量 a 虚拟地址对应的物理地址
    - 打印函数 max 虚拟地址对应的物理地址
- VA2PA 函数
    - 使用 `getpagesize()` 获取系统页大小（通常为 4KB），计算输入地址对应的虚拟页号 (VPN) 和页内偏移 (Offset)
    - 打开 `/proc/self/pagemap`（内核提供的页表映射接口），利用 `fseek` 定位到对应页号的条目位置。计算公式为：`文件偏移量 = 虚拟页号 * 8字节`
    - 读取 8字节（64位）的页表条目数据 (`uint64_t`)
    - 检查读取数据的**第63位**（Present Bit：为 1 表明页面在内存中
    - 利用位掩码 (`0-54位`) 从条目中提取物理页框号 (PFN)
    - 通过公式 `物理地址 = 物理页框号 * 页大小 + 页内偏移` 得出最终物理地址并打印。

*task_2 截图*
![[Pasted image 20251229195404.png]]

## 实验四
### task_1 编写一个 Linux 内核模块，并完成模块的安装/卸载等操作
- Makefile
```makefile
# 动态获取当前运行的内核版本
KVER := $(shell uname -r)

# 自动指向对应的内核构建目录
KDIR := /lib/modules/$(KVER)/build

PWD := $(shell pwd)

# 指定目标文件
obj-m := ycg.o

# 默认编译动作
all:
        make -C $(KDIR) M=$(PWD) modules

# 清理编译生成的文件
clean:
        make -C $(KDIR) M=$(PWD) clean
```
- ycg.c
```C
#include <linux/init.h>
#include <linux/module.h>
#include <linux/moduleparam.h>

static char *name = "changganyin";
static int times = 1;

// 接收命令行参数
module_param(times, int, 0644);
module_param(name, charp, 0644);

static int hello_init(void)
{
    int i;
    for(i = 0 ; i < times; i++)
        printk(KERN_ALERT "(%d) hello, %s!\n", i, name);
    return 0;
}

static void hello_exit(void)
{
    printk(KERN_ALERT "Goodbye, %s!\n", name);
}

MODULE_LICENSE("Dual BSD/GPL");
module_init(hello_init);
module_exit(hello_exit);
```
代码逻辑：
- 定义两个全局变量 `name` 和 `times`，并用`module_param` 宏将这两个变量声明为模块参数
- 循环体内，调用内核日志函数 `printk`（级别为 `KERN_ALERT`），多次打印带有 `name` 变量的问候语


模块的安装和卸载
```bash
make # 编译
sudo insmod ycg.ko name="ycg" times=7 # 安装模块

sudo rmmod ycg # 卸载模块
```

*task_1 截图*
![[Pasted image 20251230144542.png]]
![[Pasted image 20251230144918.png]]

### task_2 在 Linux 平台编写一个字符设备的驱动程序和测试用的应用程序
- ycgDrive.c
```C
#include <linux/module.h>
#include <linux/kernel.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/string.h>
#include <linux/uaccess.h>
#include <linux/types.h>

static struct cdev drv;
static dev_t ndev;
static char ycg[32]; 

static int drv_open(struct inode *nd, struct file *fp) 
{
    int major = MAJOR(nd->i_rdev);
    int minor = MINOR(nd->i_rdev);
    printk(KERN_EMERG "ycgDrive: open, major = %d, minor = %d\n", major, minor);
    return 0;
}

static ssize_t drv_read(struct file* fp, char __user* u, size_t sz, loff_t* loff)
{
    char res[32];
    int i = 0;
    int num1 = 0;
    int num2 = 0;
    bool flag = true; // true为加法, false为减法
    
    printk(KERN_EMERG "ycgDrive: read operation.\n");
    
    // 解析字符串逻辑 (例如 "10+20")，读取 ycg 缓冲区
    while (ycg[i] != '+' && ycg[i] != '-' && ycg[i] != '\0')
    {
        if(ycg[i] >= '0' && ycg[i] <= '9')
            num1 = 10 * num1 + (ycg[i] - '0');
        i++;
    }
    
    if (ycg[i] == '-') flag = false;
    if (ycg[i] == '+' || ycg[i] == '-') i++; // 跳过符号位
    
    while (ycg[i] != '\0') 
    {
        if(ycg[i] >= '0' && ycg[i] <= '9')
            num2 = 10 * num2 + (ycg[i] - '0');
        i++;
    }

    if (flag == true) 
    {
        printk(KERN_EMERG "%d + %d = %d\n", num1, num2, num1 + num2);
        sprintf(res, "%d + %d = %d\n", num1, num2, num1 + num2);
    }
    else
    {
        printk(KERN_EMERG "%d - %d = %d\n", num1, num2, num1 - num2);
        sprintf(res, "%d - %d = %d\n", num1, num2, num1 - num2);
    }
    
    // 将结果复制回用户空间
    if (copy_to_user(u, res, strlen(res)))
        return -EFAULT;
        
    return 0;
}

static ssize_t drv_write(struct file* fp, const char __user * u, size_t sz, loff_t* loff){
    printk(KERN_EMERG "ycgDrive: write operation.\n");
    // 从用户空间复制数据到内核缓冲区 ycg
    if (copy_from_user(ycg, u, sz))
        return -EFAULT;
    ycg[sz] = '\0'; // 确保字符串结束符
    return 0;
}

// 绑定操作函数
static struct file_operations drv_ops = 
{
    .owner  =   THIS_MODULE,
    .open   =   drv_open,    
    .read   =   drv_read, 
    .write  =   drv_write,
};

static int changganyinDrv_init(void)
{
    int ret;
    cdev_init(&drv, &drv_ops);
    // 动态申请设备号，设备名为 "ycgDrive"
    ret = alloc_chrdev_region(&ndev, 0, 1, "ycgDrive");
    if (ret < 0)
    {
        printk(KERN_EMERG "ycgDrive: alloc_chrdev_region error.\n");
        return ret;
    }
    // 打印申请到的主设备号
    printk(KERN_EMERG "ycgDrive: major = %d, minor = %d\n", MAJOR(ndev), MINOR(ndev));
    
    ret = cdev_add(&drv, ndev, 1);
    if (ret < 0)
    {
        printk(KERN_EMERG "ycgDrive: cdev_add error.\n");
        return ret;
    }
    return 0;
}

static void changganyinDrv_exit(void)
{
    printk("ycgDrive: exit process!\n");
    cdev_del(&drv);
    unregister_chrdev_region(ndev, 1);
}

module_init(changganyinDrv_init);
module_exit(changganyinDrv_exit);

MODULE_LICENSE("GPL");
MODULE_AUTHOR("YCG");
```
代码逻辑：
- 使用全局内核缓冲区 `ycg[32]` 在 `write` 和 `read` 操作之间传递数据，实现对字符串算式的解析与计算
- drv_write: 使用 `copy_from_user` 函数，将用户空间传入的算式字符串（如 `"10+20"`）安全地复制到内核空间的全局数组 `ycg` 中，并手动添加字符串结束符 `\0`，为后续读取时的解析做准备
- drv_read: 通过 `while` 循环遍历 `ycg` 缓冲区中的字符串，把两个数字分别赋值个 `num1` 和 `num2`，使用 `sprintf` 将结果格式化为字符串（如 `"10 + 20 = 30\n"`），最后通过 `copy_to_user` 将计算结果返回给用户空间
- changganyinDrv_init: 动态分配设备号

- task_2.c
```C
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <string.h>
#include <errno.h>

#define CHAR_DEV_NAME "/dev/ycgDrive"

char calc[32];
char res[32];

int main()
{
    int fd;
    
    // 打开设备文件
    fd = open(CHAR_DEV_NAME, O_RDWR);
    if(fd < 0)
    {
        printf("open failed! path: %s\n", CHAR_DEV_NAME);
        perror("reason");
        return -1;
    }
    
    printf("Please input calculation (e.g. 1+1 or 10-5): ");
    scanf("%s", calc);
    
    // 1. 写数据给驱动
    write(fd, calc, strlen(calc));
    
    // 2. 从驱动读结果
    read(fd, res, 32);
    
    printf("Result from kernel: %s\n", res);
    
    close(fd);
    return 0;
}
```
- Makefile
```makefile
# 动态获取当前内核版本
KVER := $(shell uname -r)
KDIR := /lib/modules/$(KVER)/build
PWD  := $(shell pwd)

obj-m := ycgDrive.o

all:
	# 编译内核模块
	make -C $(KDIR) M=$(PWD) modules
	# 编译测试应用程序
	gcc -o task_2 task_2.c

clean:
	make -C $(KDIR) M=$(PWD) clean
	rm -rf task_2
```

安装和卸载驱动程序
```bash
make # 编译
sudo insmod ycgDrive.ko # 安装驱动程序
sudo dmesg | tail -5
sudo mknod /dev/ycgDrive c 240 0 # 根据上一步的结果

sudo rm -rf /dev/ycgDrive
sudo rmmod ycgDrive
sudo dmesg | tail -7
```

*taask_2 截图*
![[Pasted image 20251230145821.png]]
![[Pasted image 20251230150249.png]]
![[Pasted image 20251230150451.png]]

### task_3 实现 proc 接口，将应用程序和驱动程序的部分交互信息写入proc文件系统，并在应用程序快结束时读出相关文件信息并显示出来
- ycgDrive2.c
```C
#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>
#include <fcntl.h>

char src[256];
char dest[256];

int main() {
    int length, count;
    // 打开设备，注意名字改成了 ycgDrive2
    int fp = open("/dev/ycgDrive2", O_RDWR);
    if(fp < 0) {
        printf("Open ycgDrive2 fail. Did you run mknod?\n");
        return 0;
    }

    printf("Please write strings (Press Ctrl+D to stop writing):\n");
    // 循环写入
    while(scanf("%s", src) != EOF) {
        length = strlen(src);
        count = write(fp, src, length);
        printf("Write to ycgDrive2 %dB\n", count);
    }
    
    // 清除 EOF 状态，为了后面的 scanf 能继续工作 (这是一个小技巧，否则后面的 scanf 会直接跳过)
    clearerr(stdin); 

    // 重置文件指针到开头
    printf("\nReset file pointer to beginning...\n");
    printf("position: %ld\n", lseek(fp, 0, SEEK_SET));

    printf("Please input the bytes to read (Press Ctrl+D to exit):\n");
    // 循环读取
    while(scanf("%d", &length) != EOF) {
        // 读取指定长度
        count = read(fp, dest, length);
        if (count > 0) {
            dest[count] = 0; // 添加字符串结束符
            printf("Read from ycgDrive2 %dB: %s\n", count, dest);
        } else {
            printf("Read 0 bytes (End of Buffer)\n");
        }
    }
    
    close(fp);
    return 0;
}
```
代码逻辑：
- ycgDrive2_llseek: 根据 `whence` 参数（`SEEK_SET` 头、`SEEK_CUR` 当前、`SEEK_END` 尾），计算新的文件指针位置 `newpos`; 修改文件结构体中的 `fp->f_pos`，从而改变下一次读写操作的位置
- read/write: 将数据从用户空间复制到内核缓冲区。关键在于它会根据当前的**文件指针偏移量 (`*pos`)** 进行写入，并更新文件大小 (`ycgDrive2_size`)；根据当前的**文件指针偏移量**，从内核缓冲区的对应位置读取数据返回给用户
